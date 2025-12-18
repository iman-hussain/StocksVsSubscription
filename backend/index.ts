import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import YahooFinance from 'yahoo-finance2'
import { cache as stockCache } from './lib/cache.js'
import { resolveTicker } from './lib/resolve.js'

// Instantiate yahoo-finance2 v3 client
const yahooFinance = new YahooFinance();

const app = new Hono()

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

const CACHE_DURATION_SECONDS = 60 * 60 * 24 * 7; // 1 week
const RESOLVE_CACHE_SECONDS = 60 * 60 * 24 * 30; // 30 days for name->ticker resolution

app.get('/api/stock', async (c) => {
	const symbol = c.req.query('symbol')
	if (!symbol) return c.json({ error: 'Missing symbol' }, 400)

	const cacheKey = `stock:${symbol.toUpperCase()} `

	// Try Cache
	const cachedData = await stockCache.get(cacheKey)
	if (cachedData) {
		console.log(`Serving ${symbol} from Redis / Cache`)
		return c.json(cachedData)
	}

	try {
		console.log(`Fetching ${symbol} from Yahoo Finance...`)

		const queryOptions = { period1: '2000-01-01', interval: '1d' as const };

		// Fetch chart and quote data
		const chartResult = await yahooFinance.chart(symbol, queryOptions);
		const quoteResult = await yahooFinance.quote(symbol);

		if (!quoteResult) {
			throw new Error('Quote not found')
		}

		// Type definitions for chart quotes
		interface ChartQuote {
			date: Date;
			close?: number;
			adjclose?: number;
		}

		// Extract quotes from chart result (v3 API returns data in quotes array)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const quotes = ((chartResult as any)?.quotes ?? []) as ChartQuote[];
		const history = quotes.map((q) => ({
			date: (q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date)),
			adjClose: q.adjclose ?? q.close ?? 0
		}));

		// Type assertion for quote result as the library types may not be complete
		const quote = quoteResult as {
			currency?: string;
			regularMarketPrice?: number;
			shortName?: string;
			longName?: string
		};

		const data = {
			symbol: symbol.toUpperCase(),
			currency: quote.currency,
			regularMarketPrice: quote.regularMarketPrice,
			shortName: quote.shortName ?? quote.longName ?? symbol,
			history
		};

		await stockCache.set(cacheKey, data, CACHE_DURATION_SECONDS)
		console.log(`Cached ${symbol}`)
		return c.json(data)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`Error fetching ${symbol}: `, message)

		// Basic error handling logic
		if (message.includes('Not Found') || message.includes('404')) {
			return c.json({ error: 'Company not found or delisted' }, 404)
		}

		return c.json({ error: 'Failed to fetch stock data', details: message }, 500)
	}
})

// Resolve a free-form query (company/brand/product) to ticker candidates
app.get('/api/resolve', async (c) => {
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

// Resolve a purchase description (e.g. "Honeywell deskfan in 1990 for £10") to a ticker
app.get('/api/resolve/purchase', async (c) => {
	const description = c.req.query('q')?.trim()
	if (!description) return c.json({ error: 'Missing query' }, 400)

	const preferred = c.req.query('preferred')?.split(',').map(s => s.trim()).filter(Boolean) ?? []
	const currency = c.req.query('currency')?.trim()
	const limit = Math.max(1, Math.min(10, parseInt(c.req.query('limit') ?? '5', 10)))

	// Basic sanitisation: drop prices, years, and filler words
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

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

console.log(`Server starting on port ${port}...`)
console.log(`CORS origins: ${corsOrigins.join(', ')}`)

serve({
	fetch: app.fetch,
	port
})

