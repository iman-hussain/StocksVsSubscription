import { serve } from '@hono/node-server'
import { Hono, type Context, type Next } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'
import YahooFinance from 'yahoo-finance2'
import { config } from './lib/config.js'
import { cache as stockCache } from './lib/cache.js'
import { resolveTicker } from './lib/resolve.js'
import { SUBSCRIPTION_TICKERS, PRODUCT_DATABASE, HABIT_PRESETS } from './data/presets.js'
import { getStaticSPYData } from './data/spy-fallback.js'
import { logger } from './lib/logger.js'
import {
	calculateMultiStockComparison,
	calculateIndividualComparison,
	getExchangeTicker,
	type SpendItem,
	type StockDataPoint,
	type SimulationResult
} from './lib/financials.js'
import crypto from 'crypto'

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

// Instantiate yahoo-finance2 v3 client
const yahooFinance = new YahooFinance();

// Interface for stock data returned by getStockHistory and Alpha Vantage fallback
interface CachedStockData {
	symbol: string;
	currency?: string;
	regularMarketPrice?: number;
	shortName?: string;
	name?: string;
	currentPrice?: number;
	history: Array<{ date: string; adjClose: number }>;
}

// Top 30 tickers by usage in presets + market popularity + SPY index
// These are pre-warmed on server startup and can be refreshed via /api/warmup
const TOP_TICKERS = [
	// Index fund (most important for fallback)
	'SPY',
	// Tech Giants (most common in presets)
	'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'NVDA', 'ADBE', 'CRM',
	// Gaming & Entertainment
	'SONY', 'EA', 'NTDOY', 'TTWO', 'DIS', 'WBD', 'SPOT', 'RBLX',
	// E-commerce & Services
	'SHOP', 'UBER', 'DASH', 'ZM', 'DBX', 'DOCU',
	// Hardware & Automotive
	'TSLA', 'DELL', 'INTC', 'AMD',
	// Consumer staples (habits)
	'SBUX', 'MCD'
];

const app = new Hono()

// Global Error Boundary - The Last Line of Defense
app.onError((err, c) => {
	const requestId = crypto.randomUUID()
	logger.error({ err, requestId }, 'Global Error caught')
	return c.json({
		error: 'Internal Server Error',
		requestId
	}, 500)
})

// Validation Schema for Simulation - The API Shield
const simulateSchema = z.object({
	basket: z.array(z.object({
		id: z.string(),
		name: z.string(),
		cost: z.number().positive(),
		currency: z.string().length(3),
		startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		ticker: z.string().min(1),
		frequency: z.enum(['one-off', 'daily', 'workdays', 'weekly', 'monthly', 'yearly'])
	})).min(1),
	userCurrency: z.string().length(3).optional()
})

// Validation Schema for Stock Query
const stockQuerySchema = z.object({
	symbol: z.string().regex(/^[a-zA-Z0-9^.-]{1,10}$/, "Symbol must be alphanumeric, max 10 chars"),
	startDate: z.string().optional()
})

// Validation Schema for Resolve Query
const resolveQuerySchema = z.object({
	q: z.string().min(1).max(100),
	currency: z.string().optional(),
	limit: z.string().optional(),
	preferred: z.string().optional()
})

// Global Security Headers
app.use('*', secureHeaders())

// Global rate limit config
const createLimiter = (limit: number, windowMs: number = 60 * 1000, keyPrefix: string = 'common') => {
	const duration = Math.ceil(windowMs / 1000);

	let limiter: RateLimiterRedis | RateLimiterMemory;

	if (stockCache.client) {
		// Redis available: use it with memory insurance
		limiter = new RateLimiterRedis({
			storeClient: stockCache.client,
			points: limit,
			duration: duration,
			keyPrefix: `rate_limit:${keyPrefix}`,
			insuranceLimiter: new RateLimiterMemory({ points: limit, duration }),
		});
	} else {
		// Fallback to memory
		limiter = new RateLimiterMemory({ points: limit, duration });
	}

	return async (c: Context, next: Next) => {
		const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';
		try {
			await limiter.consume(ip);
			await next();
		} catch (rej) {
			return c.json({ error: 'Too Many Requests', details: 'Slow down to save CPU resources.' }, 429);
		}
	}
}

// Configure CORS for cross-origin requests from frontend
const corsOrigins = config.CORS_ORIGIN.split(',').map(s => s.trim());

app.use('/*', cors({
	origin: corsOrigins,
	allowMethods: ['GET', 'POST', 'OPTIONS'],
	allowHeaders: ['Content-Type'],
	maxAge: 86400,
}))

app.get('/', (c) => {
	return c.text('StocksVsSubscription API is running!')
})

const CACHE_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days freshness (as requested)
// Hard limit managed by cache.ts defaults (60 days) or override
const RESOLVE_CACHE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Custom error class to propagate Yahoo rate limits to the client
class YahooRateLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'YahooRateLimitError';
	}
}

// Helper to add delay for exponential backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Distributed lock for warmup - prevents multiple workers from running simultaneously
const WARMUP_LOCK_KEY = 'stock-app:warmup-lock';
const WARMUP_LOCK_TTL = 60 * 60; // 1 hour max lock duration

async function acquireWarmupLock(): Promise<boolean> {
	const redis = stockCache.client;
	if (!redis || redis.status !== 'ready') {
		// No Redis = single instance, always allow
		return true;
	}
	try {
		// SET NX = only set if not exists, EX = expire after TTL
		const result = await redis.set(WARMUP_LOCK_KEY, Date.now().toString(), 'EX', WARMUP_LOCK_TTL, 'NX');
		return result === 'OK';
	} catch {
		return false;
	}
}

async function releaseWarmupLock(): Promise<void> {
	const redis = stockCache.client;
	if (redis?.status === 'ready') {
		try {
			await redis.del(WARMUP_LOCK_KEY);
		} catch {
			// Ignore - lock will expire anyway
		}
	}
}

/**
 * Fetch SPY data from Alpha Vantage as fallback when Yahoo is rate limited.
 * Free tier: 25 requests/day, but we only need this for SPY.
 */
async function fetchSPYFromAlphaVantage(startDate: string): Promise<CachedStockData | null> {
	if (!config.ALPHA_VANTAGE_KEY) {
		logger.debug('No ALPHA_VANTAGE_KEY configured, skipping fallback');
		return null;
	}

	try {
		logger.info({ keyConfigured: !!config.ALPHA_VANTAGE_KEY, keyLength: config.ALPHA_VANTAGE_KEY?.length }, 'Attempting SPY fetch from Alpha Vantage fallback');

		// TIME_SERIES_DAILY_ADJUSTED gives us adjusted close prices
		const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=SPY&outputsize=full&apikey=${config.ALPHA_VANTAGE_KEY}`;
		const response = await fetch(url);
		const data = await response.json() as any;

		if (data['Error Message'] || data['Note']) {
			// API error or rate limit (Note = rate limit message)
			logger.warn({ error: data['Error Message'] || data['Note'], info: data['Information'] }, 'Alpha Vantage error or rate limit');
			return null;
		}

		// Check for Information key (usually means invalid API key)
		if (data['Information']) {
			logger.warn({ info: data['Information'] }, 'Alpha Vantage API key issue');
			return null;
		}

		const timeSeries = data['Time Series (Daily)'];
		if (!timeSeries) {
			// Log the full response for debugging (truncate if huge)
			const responsePreview = JSON.stringify(data).slice(0, 500);
			logger.warn({ responseKeys: Object.keys(data), responsePreview }, 'No time series data from Alpha Vantage');
			return null;
		}

		// Convert to our format and filter by start date
		const history = Object.entries(timeSeries)
			.map(([date, values]: [string, any]) => ({
				date,
				adjClose: parseFloat(values['5. adjusted close']) || 0
			}))
			.filter(h => h.date >= startDate && h.adjClose > 0)
			.sort((a, b) => a.date.localeCompare(b.date)); // Oldest first

		if (history.length === 0) {
			logger.warn('No valid history from Alpha Vantage');
			return null;
		}

		const stockData: CachedStockData = {
			symbol: 'SPY',
			shortName: 'SPDR S&P 500 ETF Trust',
			regularMarketPrice: history[history.length - 1].adjClose,
			currency: 'USD',
			history
		};

		logger.info({ historyLength: history.length }, 'SPY fetched from Alpha Vantage');
		return stockData;
	} catch (err: any) {
		logger.warn({ err: err.message }, 'Alpha Vantage fetch failed');
		return null;
	}
}

/**
 * Reusable helper to fetch stock/currency data with Layer 1 Cache.
 * Includes Circuit Breaker: fallback to stale data if Yahoo fails.
 *
 * @param maxRetries - Limit retries for user-facing requests (default: 3 = ~35s wait max).
 *                     Set higher for background warmup tasks.
 * @param skipYahoo - If true, skip Yahoo entirely (for SPY fallback mode - cache/Alpha Vantage only).
 */
async function getStockHistory(symbol: string, startDate?: string, maxRetries: number = 3, skipYahoo: boolean = false) {
	const cacheKey = `stock:${symbol.toUpperCase()}:${startDate || 'default'}`

	// 1. Check Cache
	const cached = await stockCache.get(cacheKey)

	// Fresh Hit
	if (cached && !cached.stale) {
		return cached.data
	}

	// For SPY: Try Alpha Vantage first if Yahoo is likely rate-limited (stale cache or miss)
	if (symbol.toUpperCase() === 'SPY' && config.ALPHA_VANTAGE_KEY) {
		const alphaData = await fetchSPYFromAlphaVantage(startDate || '2015-01-01');
		if (alphaData) {
			await stockCache.set(cacheKey, alphaData, CACHE_DURATION_SECONDS);
			return alphaData;
		}
	}

	// If skipYahoo is true (SPY fallback mode), don't try Yahoo at all
	// Priority: stale cache -> static data -> fail
	if (skipYahoo) {
		if (cached) {
			logger.info({ symbol }, 'SPY fallback mode: serving stale cache');
			return cached.data;
		}
		// For SPY specifically, use static fallback data as last resort
		if (symbol.toUpperCase() === 'SPY') {
			logger.info('SPY fallback mode: using static historical data');
			const staticData = getStaticSPYData(startDate || '2015-01-01');
			// Cache the static data so subsequent requests are faster
			await stockCache.set(cacheKey, staticData, CACHE_DURATION_SECONDS);
			return staticData;
		}
		logger.warn({ symbol }, 'SPY fallback mode: no cache available for non-SPY ticker');
		throw new YahooRateLimitError('Stock data temporarily unavailable. Please try again later.');
	}

	// Stale or Miss - Try Fetching
	try {
		logger.info({ symbol, status: cached ? 'stale' : 'miss' }, 'Fetching stock data from Yahoo')
		const period1 = startDate || '1970-01-01'

		// Exponential backoff delays - user-facing requests limited by maxRetries param
		const RETRY_DELAYS_MS = [
			5_000,       // 5 seconds
			30_000,      // 30 seconds
			60_000,      // 1 minute
			180_000,     // 3 minutes
			300_000,     // 5 minutes
			600_000,     // 10 minutes
			1_800_000,   // 30 minutes
			3_600_000,   // 1 hour
			7_200_000,   // 2 hours
			14_400_000,  // 4 hours
			21_600_000,  // 6 hours
			43_200_000,  // 12 hours
		];

		const effectiveMaxRetries = Math.min(maxRetries, RETRY_DELAYS_MS.length);

		const fetchWithRetry = async (attempt = 0): Promise<any> => {
			try {
				const chart = await yahooFinance.chart(symbol, { period1, interval: '1d' })
				const quote = await yahooFinance.quote(symbol)
				return { chart, quote }
			} catch (err: any) {
				// Detect Yahoo rate limiting (429)
				const isRateLimit = err?.code === 429 || err?.message?.includes('Too Many Requests');

				// If we've hit max retries, fail fast with appropriate error
				if (attempt >= effectiveMaxRetries) {
					if (isRateLimit) {
						logger.warn({ symbol, attempts: attempt }, 'Max retries reached (rate limited), failing fast');
						throw new YahooRateLimitError('Yahoo Finance rate limit exceeded. Please try again later.');
					}
					logger.error({ symbol, attempts: attempt }, 'All retries exhausted');
					throw err;
				}

				const waitTime = RETRY_DELAYS_MS[attempt];
				const waitLabel = waitTime >= 60_000 ? `${waitTime / 60_000}m` : `${waitTime / 1000}s`;

				if (isRateLimit) {
					logger.warn({ symbol, attempt: attempt + 1, waitLabel }, 'Yahoo rate limit hit, backing off');
				} else {
					logger.warn({ symbol, attempt: attempt + 1, waitLabel, err: err.message }, 'Fetch failed, retrying');
				}

				await delay(waitTime);
				return fetchWithRetry(attempt + 1);
			}
		}

		const { chart, quote } = await fetchWithRetry()

		const quotes = ((chart as any)?.quotes ?? [])
		const history = quotes.map((q: any) => ({
			date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
			adjClose: q.adjclose ?? q.close ?? q.open ?? 0
		})).filter((h: any) => h.adjClose > 0)

		if (!history.length) throw new Error('No valid history found')

		const data = {
			symbol: symbol.toUpperCase(),
			currency: quote.currency,
			regularMarketPrice: quote.regularMarketPrice,
			shortName: quote.shortName ?? quote.longName ?? symbol,
			history
		}

		// Update Cache (reset freshness)
		await stockCache.set(cacheKey, data, CACHE_DURATION_SECONDS)
		return data
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';

		// Circuit Breaker Fallback - serve stale data if available
		if (cached) {
			logger.warn({ symbol, err: message }, 'Circuit Breaker: Yahoo failed, serving STALE data')
			return cached.data;
		}

		logger.error({ symbol, err: message }, 'Error fetching stock data')
		throw err
	}
}

// Secured Stock Endpoint: Rate Limited (40/min) + Input Validation
app.get('/api/stock', createLimiter(40, 60 * 1000, 'stock'), zValidator('query', stockQuerySchema, (result, c) => {
	if (!result.success) {
		return c.json({ error: 'Bad Request', details: 'Invalid inputs', issues: result.error.issues }, 400);
	}
}), async (c) => {
	const { symbol, startDate } = c.req.valid('query');

	// Note: We don't need manual check 'if (!symbol)' because zod handles it (required by default).
	// Zod regex also handles alphanumeric/length checks.

	try {
		const data = await getStockHistory(symbol, startDate)
		return c.json(data)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		if (message.includes('Not Found') || message.includes('404')) {
			return c.json({ error: 'Company not found or delisted' }, 404)
		}
		return c.json({ error: 'Failed to fetch stock data', details: message }, 500)
	}
})

// Unified Simulation Endpoint (Layer 2 Cache) - Strictly limited (20/min)
app.post('/api/simulate', createLimiter(20, 60 * 1000, 'simulate'), zValidator('json', simulateSchema, (result, c) => {
	if (!result.success) {
		return c.json({ error: 'Bad Request', details: 'Invalid simulation input', issues: result.error.issues }, 400)
	}
}), async (c) => {
	const body = c.req.valid('json')
	const { basket, userCurrency } = body

	if (!basket || !basket.length) return c.json({ error: 'Empty basket' }, 400)

	// Layer 2: Hash input for result caching
	// Upgrade: Use SHA256 for better security/collision resistance compared to MD5
	const bodyStr = JSON.stringify({ basket, userCurrency })
	const hash = crypto.createHash('sha256').update(bodyStr).digest('hex')
	const cacheKey = `simulate:${hash}`

	const cached = await stockCache.get(cacheKey)
	if (cached) {
		logger.info({ hash }, 'L2 Cache Hit: Returning cached simulation')
		// Return cached result even if "stale" (it's expensive to recompute)
		return c.json(cached.data)
	}

	try {
		const uniqueTickers = [...new Set(basket.map(item => item.ticker))]
		const userBaseCurrency = userCurrency || 'GBP'

		// Detect SPY-only fallback mode (all items have SPY ticker)
		const isSPYFallbackMode = uniqueTickers.length === 1 && uniqueTickers[0].toUpperCase() === 'SPY';

		// Calculate earliest date
		const earliestDate = basket.reduce((min, item) =>
			item.startDate < min ? item.startDate : min,
			new Date().toISOString().split('T')[0]
		)

		// Fetch stock histories sequentially to avoid bursting Yahoo's rate limit on cache misses
		// L1 cache hits return instantly, so this only adds latency for uncached tickers
		// In SPY fallback mode, skip Yahoo entirely (cache/Alpha Vantage only)
		const stockDataResults = [];
		for (const ticker of uniqueTickers) {
			const data = await getStockHistory(ticker, earliestDate, 3, isSPYFallbackMode);
			stockDataResults.push(data);
		}

		const currencyPairs = new Set<string>()
		for (const item of basket) {
			if (item.currency !== userBaseCurrency) {
				const pair = getExchangeTicker(userBaseCurrency, item.currency)
				if (pair) currencyPairs.add(pair)
			}
		}
		for (const stock of stockDataResults) {
			if (stock.currency && stock.currency !== userBaseCurrency) {
				const pair = getExchangeTicker(userBaseCurrency, stock.currency)
				if (pair) currencyPairs.add(pair)
			}
		}

		// Fetch currency pairs sequentially to avoid rate limits
		const currencyResults = [];
		for (const pair of Array.from(currencyPairs)) {
			const data = await getStockHistory(pair, earliestDate);
			currencyResults.push(data);
		}

		const currencyDataMap: Record<string, StockDataPoint[]> = {}
		for (const res of currencyResults) {
			currencyDataMap[res.symbol] = res.history
		}

		const stockDataMap: Record<string, StockDataPoint[]> = {}
		for (const stock of stockDataResults) {
			const ticker = stock.symbol
			const nativeCurrency = stock.currency
			const history = stock.history

			if (nativeCurrency === userBaseCurrency) {
				stockDataMap[ticker] = history
			} else {
				const pair = getExchangeTicker(userBaseCurrency, nativeCurrency)
				if (!pair || !currencyDataMap[pair]) {
					stockDataMap[ticker] = history
					continue
				}

				const rates = currencyDataMap[pair]
				let rateIdx = 0
				stockDataMap[ticker] = history.map((p: any) => {
					while (rateIdx < rates.length - 1 && rates[rateIdx + 1].date <= p.date) rateIdx++
					const rate = rates[rateIdx].date <= p.date ? rates[rateIdx].adjClose : 1
					return { date: p.date, adjClose: rate > 0 ? p.adjClose / rate : p.adjClose }
				})
			}
		}

		// Perform Simulation
		const result = calculateMultiStockComparison(basket, stockDataMap, userBaseCurrency, currencyDataMap)

		// Individual Item Results
		const itemResults: Record<string, SimulationResult> = {}
		for (const item of basket) {
			const pair = getExchangeTicker(userBaseCurrency, item.currency)
			itemResults[item.id] = calculateIndividualComparison(
				item,
				stockDataMap[item.ticker] || [],
				userBaseCurrency,
				pair ? currencyDataMap[pair] || [] : []
			)
		}

		const finalData = { result, itemResults }

		// Cache L2 Result
		await stockCache.set(cacheKey, finalData, CACHE_DURATION_SECONDS)
		return c.json(finalData)
	} catch (err: unknown) {
		logger.error({ err }, 'Simulation failed')

		// Propagate Yahoo rate limit as 429 to the client
		if (err instanceof YahooRateLimitError) {
			return c.json({ error: 'Rate Limited', details: err.message }, 429);
		}

		return c.json({ error: 'Simulation failed', details: err instanceof Error ? err.message : 'Unknown error' }, 500)
	}
})

// Resolve a free-form query (company/brand/product) to ticker candidates - (60/min)
app.get('/api/resolve', createLimiter(60, 60 * 1000, 'resolve'), zValidator('query', resolveQuerySchema, (result, c) => {
	if (!result.success) {
		return c.json({ error: 'Bad Request', details: 'Invalid resolve input', issues: result.error.issues }, 400);
	}
}), async (c) => {
	const { q: query, preferred: preferredStr, currency, limit: limitStr } = c.req.valid('query');

	const preferred = preferredStr?.split(',').map(s => s.trim()).filter(Boolean) ?? []
	const limit = Math.max(1, Math.min(10, parseInt(limitStr ?? '5', 10)))

	const cacheKey = `resolve:${query.toLowerCase()}:${preferred.join('|')}:${currency ?? ''}:${limit}`
	const cached = await stockCache.get(cacheKey)
	if (cached) return c.json(cached.data)

	try {
		const result = await resolveTicker(yahooFinance, query, { preferredExchanges: preferred, currency, limit })
		await stockCache.set(cacheKey, result, RESOLVE_CACHE_SECONDS)
		return c.json(result)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		logger.error({ query, err: message }, 'Error resolving ticker')
		return c.json({ error: 'Resolve failed', details: message }, 500)
	}
})

// Resolve a purchase description (e.g. "Honeywell deskfan in 1990 for £10") to a ticker - (60/min)
// Note: We use the same schema as /api/resolve for 'q' validation (max 100 chars)
app.get('/api/resolve/purchase', createLimiter(60, 60 * 1000, 'purchase'), zValidator('query', resolveQuerySchema, (result, c) => {
	if (!result.success) {
		return c.json({ error: 'Bad Request', details: 'Invalid resolve input', issues: result.error.issues }, 400);
	}
}), async (c) => {
	const { q: description, preferred: preferredStr, currency, limit: limitStr } = c.req.valid('query');

	const preferred = preferredStr?.split(',').map(s => s.trim()).filter(Boolean) ?? []
	const limit = Math.max(1, Math.min(10, parseInt(limitStr ?? '5', 10)))

	// Basic sanitisation
	const cleaned = description
		.replace(/([£$€])\s?\d+(?:[.,]\d+)?/g, ' ')
		.replace(/\b(19\d{2}|20\d{2})\b/g, ' ')
		.replace(/\b(bought|purchase|purchased|for|in|at|the|a|an|on|from)\b/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	const cacheKey = `resolvePurchase:${cleaned.toLowerCase()}:${preferred.join('|')}:${currency ?? ''}:${limit}`
	const cached = await stockCache.get(cacheKey)
	if (cached) return c.json(cached.data)

	try {
		const result = await resolveTicker(yahooFinance, cleaned || description, { preferredExchanges: preferred, currency, limit })
		await stockCache.set(cacheKey, result, RESOLVE_CACHE_SECONDS)
		return c.json(result)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		logger.error({ description, err: message }, 'Error resolving ticker for purchase')
		return c.json({ error: 'Resolve failed', details: message }, 500)
	}
})

app.get('/api/search', async (c) => {
	const query = c.req.query('q')
	if (!query) return c.json({ error: 'Missing query' }, 400)

	try {
		const results = await yahooFinance.search(query)
		return c.json(results)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		logger.error({ query, err: message }, 'Error searching')
		return c.json({ error: 'Search failed' }, 500)
	}
})

// Get preset data for the frontend (subscriptions, products, habits) - (120/min)
app.get('/api/presets', createLimiter(120, 60 * 1000, 'presets'), (c) => {
	// Set aggressive browser caching - presets rarely change
	c.header('Cache-Control', 'public, max-age=86400'); // 24h browser cache
	return c.json({
		subscriptions: SUBSCRIPTION_TICKERS.filter((t) => t.ticker !== 'SPY'),
		products: PRODUCT_DATABASE,
		habits: HABIT_PRESETS,
	});
})

// Cache warmup endpoint - fetches top tickers sequentially with delays
// Protected by very low rate limit (1/min) to prevent abuse
app.post('/api/warmup', createLimiter(1, 60 * 1000, 'warmup'), async (c) => {
	const results: { ticker: string; status: 'cached' | 'fetched' | 'failed'; error?: string }[] = [];
	const startDate = '2015-01-01'; // Common historical start date

	logger.info({ tickerCount: TOP_TICKERS.length }, 'Starting cache warmup');

	for (const ticker of TOP_TICKERS) {
		try {
			const cacheKey = `stock:${ticker}:${startDate}`;
			const cached = await stockCache.get(cacheKey);

			if (cached && !cached.stale) {
				results.push({ ticker, status: 'cached' });
				continue;
			}

			// Fetch with delay to avoid rate limits
			await getStockHistory(ticker, startDate);
			results.push({ ticker, status: 'fetched' });

			// Wait 5 seconds between fetches to be very gentle on Yahoo
			await delay(5000);
		} catch (err: any) {
			logger.warn({ ticker, err: err.message }, 'Warmup failed for ticker');
			results.push({ ticker, status: 'failed', error: err.message });

			// If rate limited, stop warmup early
			if (err instanceof YahooRateLimitError) {
				logger.warn('Rate limit hit during warmup, stopping early');
				break;
			}
		}
	}

	const summary = {
		total: TOP_TICKERS.length,
		cached: results.filter(r => r.status === 'cached').length,
		fetched: results.filter(r => r.status === 'fetched').length,
		failed: results.filter(r => r.status === 'failed').length,
	};

	logger.info(summary, 'Cache warmup complete');
	return c.json({ summary, results });
});

// Check cache status for SPY (used by frontend to determine if fallback is available)
app.get('/api/cache-status/spy', createLimiter(60, 60 * 1000, 'cache-status'), async (c) => {
	const cacheKey = 'stock:SPY:2015-01-01';
	const cached = await stockCache.get(cacheKey);
	return c.json({
		available: !!cached,
		stale: cached?.stale ?? true,
	});
});

const port = config.PORT

logger.info({ port, corsOrigins }, 'Server starting')

// Automatic cache warmup - runs on startup and every 30 days
const WARMUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const WARMUP_START_DATE = '2015-01-01';
const WARMUP_TICKER_GAP_MS = 60_000; // 1 minute between tickers

// Same backoff schedule as regular fetches for rate limit handling during warmup
const WARMUP_RETRY_DELAYS_MS = [
	5_000,       // 5 seconds
	30_000,      // 30 seconds
	60_000,      // 1 minute
	180_000,     // 3 minutes
	300_000,     // 5 minutes
	600_000,     // 10 minutes
	1_800_000,   // 30 minutes
	3_600_000,   // 1 hour
	7_200_000,   // 2 hours
	14_400_000,  // 4 hours
	21_600_000,  // 6 hours
	43_200_000,  // 12 hours
];

function formatDuration(ms: number): string {
	if (ms >= 3_600_000) return `${ms / 3_600_000}h`;
	if (ms >= 60_000) return `${ms / 60_000}m`;
	return `${ms / 1000}s`;
}

interface TickerWithAge {
	ticker: string;
	cacheAge: number | null; // null = not cached, higher = older
}

async function runAutoWarmup() {
	// Acquire distributed lock to prevent multiple workers from running warmup
	const hasLock = await acquireWarmupLock();
	if (!hasLock) {
		logger.info('Another worker is running warmup, skipping');
		return;
	}

	logger.info({ tickerCount: TOP_TICKERS.length }, 'Starting automatic cache warmup');

	try {

	// Build list with cache ages and sort by oldest first (nulls = not cached = highest priority)
	const tickersWithAge: TickerWithAge[] = await Promise.all(
		TOP_TICKERS.map(async (ticker) => {
			const cacheKey = `stock:${ticker}:${WARMUP_START_DATE}`;
			const cacheAge = await stockCache.getCacheAge(cacheKey);
			return { ticker, cacheAge };
		})
	);

	// Sort: null (not cached) first, then by age descending (oldest first)
	// Negative cacheAge means still fresh - put those last
	tickersWithAge.sort((a, b) => {
		if (a.cacheAge === null && b.cacheAge === null) return 0;
		if (a.cacheAge === null) return -1; // a first (not cached)
		if (b.cacheAge === null) return 1;  // b first (not cached)
		return b.cacheAge - a.cacheAge;     // Higher age (older) first
	});

	logger.info(
		{ order: tickersWithAge.slice(0, 5).map(t => `${t.ticker}:${t.cacheAge === null ? 'none' : formatDuration(t.cacheAge)}`) },
		'Warmup priority order (top 5)'
	);

	let fetched = 0, failed = 0;
	let retryAttempt = 0; // Tracks backoff level for rate limiting

	for (const { ticker } of tickersWithAge) {
		try {
			// Use high maxRetries for warmup - we're patient and want to eventually succeed
			await getStockHistory(ticker, WARMUP_START_DATE, 12);
			fetched++;
			retryAttempt = 0; // Reset backoff on success

			// 1 minute gap between successful fetches
			logger.debug({ ticker, nextIn: '1m' }, 'Warmup fetched, waiting before next');
			await delay(WARMUP_TICKER_GAP_MS);

		} catch (err: any) {
			const isRateLimit = err?.code === 429 ||
				err?.message?.includes('Too Many Requests') ||
				err instanceof YahooRateLimitError;

			if (isRateLimit && retryAttempt < WARMUP_RETRY_DELAYS_MS.length) {
				// Rate limited - back off and retry this ticker
				const waitTime = WARMUP_RETRY_DELAYS_MS[retryAttempt];
				logger.warn(
					{ ticker, attempt: retryAttempt + 1, waitLabel: formatDuration(waitTime) },
					'Rate limit during warmup, backing off'
				);
				retryAttempt++;
				await delay(waitTime);

				// Re-add this ticker to try again (push to front of remaining)
				// We'll retry on next loop iteration by not incrementing
				continue;
			}

			if (isRateLimit) {
				// Exhausted all retries
				logger.error({ ticker }, 'Warmup rate limit retries exhausted, stopping warmup');
				failed++;
				break;
			}

			// Non-rate-limit error - log and continue to next ticker
			failed++;
			logger.warn({ ticker, err: err.message }, 'Warmup failed for ticker (non-rate-limit)');
			await delay(WARMUP_TICKER_GAP_MS); // Still wait before next
		}
	}

	logger.info({ fetched, failed }, 'Automatic cache warmup complete');
	} finally {
		await releaseWarmupLock();
	}
}

// Schedule warmup with random initial delay to prevent all workers/deploys hitting Yahoo simultaneously
// Random delay between 3-10 days, then every 30 days after that
const MIN_INITIAL_DELAY_MS = 3 * 24 * 60 * 60 * 1000;  // 3 days
const MAX_INITIAL_DELAY_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
const randomInitialDelay = MIN_INITIAL_DELAY_MS + Math.random() * (MAX_INITIAL_DELAY_MS - MIN_INITIAL_DELAY_MS);
const initialDelayDays = (randomInitialDelay / (24 * 60 * 60 * 1000)).toFixed(2);

logger.info({ initialDelayDays: `${initialDelayDays} days` }, 'Scheduling first cache warmup');

setTimeout(() => {
	runAutoWarmup();
	setInterval(runAutoWarmup, WARMUP_INTERVAL_MS);
}, randomInitialDelay);

serve({
	fetch: app.fetch,
	port
})
