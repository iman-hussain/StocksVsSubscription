import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import YahooFinance from 'yahoo-finance2'
import { cache as stockCache } from './lib/cache'

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

const CACHE_DURATION_SECONDS = 60 * 60 * 12; // 12 hours

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

