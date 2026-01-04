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

/**
 * Reusable helper to fetch stock/currency data with Layer 1 Cache.
 * Includes Circuit Breaker: fallback to stale data if Yahoo fails.
 */
async function getStockHistory(symbol: string, startDate?: string) {
	const cacheKey = `stock:${symbol.toUpperCase()}:${startDate || 'default'}`

	// 1. Check Cache
	const cached = await stockCache.get(cacheKey)

	// Fresh Hit
	if (cached && !cached.stale) {
		return cached.data
	}

	// Stale or Miss - Try Fetching
	try {
		logger.info({ symbol, status: cached ? 'stale' : 'miss' }, 'Fetching stock data from Yahoo')
		const period1 = startDate || '1970-01-01'

		// Retry with exponential backoff to avoid hammering Yahoo when rate-limited
		const fetchWithRetry = async (retries = 2, baseDelay = 1000): Promise<any> => {
			try {
				const chart = await yahooFinance.chart(symbol, { period1, interval: '1d' })
				const quote = await yahooFinance.quote(symbol)
				return { chart, quote }
			} catch (err: any) {
				// Detect Yahoo rate limiting (429) - don't retry, propagate immediately
				const isRateLimit = err?.code === 429 || err?.message?.includes('Too Many Requests');
				if (isRateLimit) {
					logger.warn({ symbol }, 'Yahoo rate limit hit, not retrying');
					throw new YahooRateLimitError('Yahoo Finance rate limit exceeded. Please try again in a few minutes.');
				}

				if (retries > 0) {
					const waitTime = baseDelay * (3 - retries); // 1s, 2s exponential-ish backoff
					logger.warn({ symbol, retriesLeft: retries, waitTime }, 'Retry fetching stock after delay');
					await delay(waitTime);
					return fetchWithRetry(retries - 1, baseDelay);
				}
				throw err;
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

		// 2. Circuit Breaker Fallback
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

		// Calculate earliest date
		const earliestDate = basket.reduce((min, item) =>
			item.startDate < min ? item.startDate : min,
			new Date().toISOString().split('T')[0]
		)

		// Fetch stock histories sequentially to avoid bursting Yahoo's rate limit on cache misses
		// L1 cache hits return instantly, so this only adds latency for uncached tickers
		const stockDataResults = [];
		for (const ticker of uniqueTickers) {
			const data = await getStockHistory(ticker, earliestDate);
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

			// Wait 2 seconds between fetches to be gentle on Yahoo
			await delay(2000);
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

serve({
	fetch: app.fetch,
	port
})
