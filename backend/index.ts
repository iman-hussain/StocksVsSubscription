import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimiter } from 'hono-rate-limiter'
import YahooFinance from 'yahoo-finance2'
import { cache as stockCache } from './lib/cache.js'
import { resolveTicker } from './lib/resolve.js'
import { SUBSCRIPTION_TICKERS, PRODUCT_DATABASE, HABIT_PRESETS } from './data/presets.js'
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

const app = new Hono()

// Global Error Boundary - The Last Line of Defense
app.onError((err, c) => {
	console.error(`[Global Error] ${err.name}: ${err.message}`, err.stack)
	const requestId = crypto.randomUUID()
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

// Global Security Headers
app.use('*', secureHeaders())

// Global rate limit config
const createLimiter = (limit: number, windowMs: number = 60 * 1000) => rateLimiter({
	windowMs,
	limit,
	keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
	handler: (c) => c.json({ error: 'Too Many Requests', details: 'Slow down to save CPU resources.' }, 429),
})

// Configure CORS for cross-origin requests from frontend
const corsOrigins = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
	: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use('/*', cors({
	origin: corsOrigins,
	allowMethods: ['GET', 'POST', 'OPTIONS'],
	allowHeaders: ['Content-Type'],
	maxAge: 86400,
}))

app.get('/', (c) => {
	return c.text('StocksVsSubscription API is running!')
})

const CACHE_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days
const RESOLVE_CACHE_SECONDS = 60 * 60 * 24 * 30; // 30 days for name->ticker resolution

/**
 * Reusable helper to fetch stock/currency data with Layer 1 Cache.
 * Shared across all users.
 */
async function getStockHistory(symbol: string, startDate?: string) {
	const cacheKey = `stock:${symbol.toUpperCase()}:${startDate || 'default'}`

	const cached = await stockCache.get(cacheKey)
	if (cached) return cached

	try {
		console.log(`[L1 Cache Miss] Fetching ${symbol} from Yahoo...`)
		const period1 = startDate || '1970-01-01'

		// Add timeout and retry logic for safety on low-resource server
		const fetchWithRetry = async (retries = 2): Promise<any> => {
			try {
				const chart = await yahooFinance.chart(symbol, { period1, interval: '1d' })
				const quote = await yahooFinance.quote(symbol)
				return { chart, quote }
			} catch (err) {
				if (retries > 0) {
					console.warn(`Retry fetching ${symbol} (${retries} left)`)
					return fetchWithRetry(retries - 1)
				}
				throw err
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

		await stockCache.set(cacheKey, data, CACHE_DURATION_SECONDS)
		return data
	} catch (err) {
		console.error(`Error fetching ${symbol}:`, err instanceof Error ? err.message : err)
		throw err
	}
}

app.get('/api/stock', async (c) => {
	const symbol = c.req.query('symbol')
	const startDate = c.req.query('startDate')

	if (!symbol) return c.json({ error: 'Missing symbol' }, 400)

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

// Unified Simulation Endpoint (Layer 2 Cache) - Strictly limited (10/min)
app.post('/api/simulate', createLimiter(10), zValidator('json', simulateSchema, (result, c) => {
	if (!result.success) {
		return c.json({ error: 'Bad Request', details: 'Invalid simulation input', issues: result.error.issues }, 400)
	}
}), async (c) => {
	const body = c.req.valid('json')
	const { basket, userCurrency } = body

	if (!basket || !basket.length) return c.json({ error: 'Empty basket' }, 400)

	// Layer 2: Hash input for result caching
	const bodyStr = JSON.stringify({ basket, userCurrency })
	const hash = crypto.createHash('md5').update(bodyStr).digest('hex')
	const cacheKey = `simulate:${hash}`

	const cached = await stockCache.get(cacheKey)
	if (cached) {
		console.log('[L2 Cache Hit] Returning cached simulation result')
		return c.json(cached)
	}

	try {
		const uniqueTickers = [...new Set(basket.map(item => item.ticker))]
		const userBaseCurrency = userCurrency || 'GBP'

		// Calculate earliest date
		const earliestDate = basket.reduce((min, item) =>
			item.startDate < min ? item.startDate : min,
			new Date().toISOString().split('T')[0]
		)

		// Fetch all required histories (hitting L1 cache)
		const stockDataPromises = uniqueTickers.map(ticker => getStockHistory(ticker, earliestDate))
		const stockDataResults = await Promise.all(stockDataPromises)

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

		const currencyPromises = Array.from(currencyPairs).map(pair => getStockHistory(pair, earliestDate))
		const currencyResults = await Promise.all(currencyPromises)

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
		console.error('Simulation failed:', err)
		return c.json({ error: 'Simulation failed', details: err instanceof Error ? err.message : 'Unknown error' }, 500)
	}
})

// Resolve a free-form query (company/brand/product) to ticker candidates - (30/min)
app.get('/api/resolve', createLimiter(30), async (c) => {
	const query = c.req.query('q')?.trim()
	if (!query) return c.json({ error: 'Missing query' }, 400)

	const preferred = c.req.query('preferred')?.split(',').map(s => s.trim()).filter(Boolean) ?? []
	const currency = c.req.query('currency')?.trim()
	const limit = Math.max(1, Math.min(10, parseInt(c.req.query('limit') ?? '5', 10)))

	const cacheKey = `resolve:${query.toLowerCase()}:${preferred.join('|')}:${currency ?? ''}:${limit}`
	const cached = await stockCache.get(cacheKey)
	if (cached) return c.json(cached)

	try {
		const result = await resolveTicker(yahooFinance, query, { preferredExchanges: preferred, currency, limit })
		await stockCache.set(cacheKey, result, RESOLVE_CACHE_SECONDS)
		return c.json(result)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		console.error(`Error resolving ticker for '${query}':`, message)
		return c.json({ error: 'Resolve failed', details: message }, 500)
	}
})

// Resolve a purchase description (e.g. "Honeywell deskfan in 1990 for £10") to a ticker - (30/min)
app.get('/api/resolve/purchase', createLimiter(30), async (c) => {
	const description = c.req.query('q')?.trim()
	if (!description) return c.json({ error: 'Missing query' }, 400)

	const preferred = c.req.query('preferred')?.split(',').map(s => s.trim()).filter(Boolean) ?? []
	const currency = c.req.query('currency')?.trim()
	const limit = Math.max(1, Math.min(10, parseInt(c.req.query('limit') ?? '5', 10)))

	// Basic sanitisation
	const cleaned = description
		.replace(/([£$€])\s?\d+(?:[.,]\d+)?/g, ' ')
		.replace(/\b(19\d{2}|20\d{2})\b/g, ' ')
		.replace(/\b(bought|purchase|purchased|for|in|at|the|a|an|on|from)\b/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	const cacheKey = `resolvePurchase:${cleaned.toLowerCase()}:${preferred.join('|')}:${currency ?? ''}:${limit}`
	const cached = await stockCache.get(cacheKey)
	if (cached) return c.json(cached)

	try {
		const result = await resolveTicker(yahooFinance, cleaned || description, { preferredExchanges: preferred, currency, limit })
		await stockCache.set(cacheKey, result, RESOLVE_CACHE_SECONDS)
		return c.json(result)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		console.error(`Error resolving ticker for purchase '${description}':`, message)
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
		console.error(`Error searching ${query}: `, message)
		return c.json({ error: 'Search failed' }, 500)
	}
})

// Get preset data for the frontend (subscriptions, products, habits) - (60/min)
app.get('/api/presets', createLimiter(60), (c) => {
	// Set aggressive browser caching - presets rarely change
	c.header('Cache-Control', 'public, max-age=86400'); // 24h browser cache
	return c.json({
		subscriptions: SUBSCRIPTION_TICKERS.filter((t) => t.ticker !== 'SPY'),
		products: PRODUCT_DATABASE,
		habits: HABIT_PRESETS,
	});
})

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

console.log(`Server starting on port ${port}...`)
console.log(`CORS origins: ${corsOrigins.join(', ')}`)

serve({
	fetch: app.fetch,
	port
})
