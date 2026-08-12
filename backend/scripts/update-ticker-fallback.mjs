/**
 * Regenerates ticker-fallback.ts with fresh Yahoo Finance data up to present day.
 * Usage: node scripts/update-ticker-fallback.mjs
 *
 * Strategy:
 *   1. Parse existing ticker-fallback.ts to extract current data (avoids re-fetching years of history)
 *   2. For each ticker, only fetch data from the day after its last known date to today
 *   3. Merge new data with existing and write the updated file
 *
 * Uses direct fetch with browser User-Agent to avoid yahoo-finance2 rate-limiting.
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ────────────────────────────────────────────────────────────────

const OUTPUT_PATH = join(__dirname, '../data/ticker-fallback.ts');
const DELAY_BETWEEN_TICKERS_MS = 3000;   // 3s between tickers
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000, 120000]; // 5s, 15s, 30s, 1m, 2m

// All tickers from the existing fallback file
const TICKERS = [
	'005930.KS', 'AAPL', 'ADBE', 'ADT', 'AMC', 'AMZN', 'ARLO', 'BARK',
	'BMBL', 'BTI', 'BUD', 'CART', 'CHGG', 'CMCSA', 'CMG', 'COUR', 'CRM',
	'CRSR', 'DASH', 'DBX', 'DELL', 'DEO', 'DIS', 'DNUT', 'DOCU', 'DPZ',
	'DUOL', 'EA', 'EL', 'F', 'FLTR.L', 'GDDY', 'GOOGL', 'GPRO', 'GRMN',
	'GRND', 'HFG', 'HMC', 'HYMLF', 'INTC', 'IRBT', 'JET', 'KO', 'LOGI',
	'LULU', 'LYV', 'MCD', 'META', 'MNST', 'MO', 'MSFT', 'MTCH', 'MU',
	'NFLX', 'NTDOY', 'NVDA', 'NWSA', 'NYT', 'PHG', 'PLNT', 'PM', 'PTON',
	'RBLX', 'ROKU', 'SAM', 'SHOP', 'SIRI', 'SN', 'SONO', 'SONY', 'SPOT',
	'SPY', 'STX', 'TM', 'TSCO.L', 'TSLA', 'TTWO', 'UBER', 'UDMY', 'WBD',
	'WIX', 'WMT', 'WW', 'ZM', 'QQQ', '^FTSE', '^GSPC', '^IXIC',
];

// Browser-like headers to avoid Yahoo Finance rate limiting
const FETCH_HEADERS = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'en-US,en;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	'Cache-Control': 'no-cache',
	'Pragma': 'no-cache',
	'Origin': 'https://finance.yahoo.com',
	'Referer': 'https://finance.yahoo.com/',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function dateToInt(dateStr) {
	return parseInt(dateStr.replace(/-/g, ''), 10);
}

function intToDate(n) {
	const s = n.toString();
	return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function today() {
	return new Date().toISOString().split('T')[0];
}

function dateToUnix(dateStr) {
	return Math.floor(new Date(dateStr).getTime() / 1000);
}

// ─── Parse Existing Fallback File ─────────────────────────────────────────

/**
 * Parses ticker-fallback.ts using line-by-line processing.
 * Each ticker block has:
 *   {
 *     symbol: 'XXX',
 *     name: 'Name',
 *     currency: 'USD',
 *     dates: [20000101, 20000102, ...   (multi-line)
 *     	20000103, ...],
 *     closes: [10000, 10100, ...        (multi-line)
 *     	10200, ...]
 *   }
 */
function parseExistingFallback() {
	const src = readFileSync(OUTPUT_PATH, 'utf8');
	const result = {};

	// Find the _buildTickerData function body
	const funcStart = src.indexOf('function _buildTickerData()');
	if (funcStart === -1) return result;

	// Find "return [" after the function declaration
	const returnStart = src.indexOf('return [', funcStart);
	if (returnStart === -1) return result;

	// Extract everything from "return [" to "];" — find the last "];" in the function
	const bodyStart = returnStart + 'return ['.length;
	// Find closing ]; — could be "\n];" or "\n\t];" depending on format
	const funcEndPatterns = ['\n\t];\n}', '\n];\n}', '\n\t];', '\n];'];
	let funcEnd = -1;
	for (const pat of funcEndPatterns) {
		const idx = src.indexOf(pat, bodyStart);
		if (idx !== -1 && (funcEnd === -1 || idx < funcEnd)) {
			funcEnd = idx;
		}
	}
	if (funcEnd === -1) return result;

	const body = src.slice(bodyStart, funcEnd);

	// Split into ticker blocks: each block starts with \n\t{\n and ends with \n\t}
	// We find each block by looking for the pattern symbol: '...'
	const symbolMatches = [...body.matchAll(/symbol:\s*'([^']+)'/g)];
	// Name may contain escaped apostrophes like Domino\'s - match up to unescaped quote
	const nameMatches = [...body.matchAll(/name:\s*'((?:[^'\\]|\\.)*)'/g)];
	const currencyMatches = [...body.matchAll(/currency:\s*'([^']*)'/g)];

	// For each ticker, find its dates and closes arrays by position
	for (let i = 0; i < symbolMatches.length; i++) {
		const symbol = symbolMatches[i][1];
		const name = nameMatches[i]?.[1] ?? symbol;
		const currency = currencyMatches[i]?.[1] ?? 'USD';

		const symPos = symbolMatches[i].index;
		const nextSymPos = i + 1 < symbolMatches.length ? symbolMatches[i + 1].index : body.length;
		const block = body.slice(symPos, nextSymPos);

		// Extract dates array content
		const datesMatch = block.match(/dates:\s*\[([^\]]+)\]/s);
		const closesMatch = block.match(/closes:\s*\[([^\]]+)\]/s);

		if (!datesMatch || !closesMatch) continue;

		const dates = datesMatch[1].split(/[\s,]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
		const closes = closesMatch[1].split(/[\s,]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);

		if (dates.length > 0 && closes.length > 0) {
			result[symbol] = { symbol, name, currency, dates, closes };
		}
	}

	return result;
}

// ─── Yahoo Finance Direct Fetch ────────────────────────────────────────────

/**
 * Fetch chart data directly from Yahoo Finance v8 API.
 * Uses browser User-Agent to avoid rate limiting.
 */
async function fetchYahooChart(symbol, fromDateStr, attempt = 0) {
	const period1 = dateToUnix(fromDateStr);
	const period2 = Math.floor(Date.now() / 1000) + 86400; // +1 day buffer
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}&events=div%7Csplit%7Cearn`;

	try {
		const res = await fetch(url, { headers: FETCH_HEADERS });

		if (res.status === 429 || res.status === 403) {
			throw new Error(`Rate limited (${res.status})`);
		}

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}

		const data = await res.json();
		const chartResult = data?.chart?.result?.[0];

		if (!chartResult) {
			const error = data?.chart?.error;
			throw new Error(error?.description || 'No chart result');
		}

		const timestamps = chartResult.timestamp ?? [];
		const adjCloseArr = chartResult.indicators?.adjclose?.[0]?.adjclose ?? [];
		const closeArr = chartResult.indicators?.quote?.[0]?.close ?? [];

		const points = timestamps.map((ts, i) => {
			const date = new Date(ts * 1000).toISOString().split('T')[0];
			const closeVal = adjCloseArr[i] ?? closeArr[i] ?? 0;
			return { date, close: Math.round(closeVal * 100) };
		}).filter(p => p.close > 0 && p.date > fromDateStr);

		return { points, meta: chartResult.meta };
	} catch (err) {
		const isRateLimit = err.message.includes('Rate limited') ||
			err.message.includes('429') ||
			err.message.includes('403');

		if (isRateLimit && attempt < RETRY_DELAYS_MS.length) {
			const wait = RETRY_DELAYS_MS[attempt];
			console.log(`  ⏳  Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})...`);
			await delay(wait);
			return fetchYahooChart(symbol, fromDateStr, attempt + 1);
		}

		throw err;
	}
}

// ─── Static Index Builder ──────────────────────────────────────────────────

function buildStaticObject(data, varName) {
	if (!data) {
		return `export const ${varName} = { symbol: '', shortName: '', regularMarketPrice: 0, currency: 'USD', history: [] };`;
	}

	const historyLines = data.dates
		.map((d, i) => {
			const close = data.closes[i];
			if (close == null || close === 0) return null;
			const date = intToDate(d);
			return `\t\t{ date: '${date}', adjClose: ${(close / 100).toFixed(4)} }`;
		})
		.filter(Boolean);

	const safeName = data.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
	return `export const ${varName} = {
\tsymbol: '${data.symbol}',
\tshortName: '${safeName}',
\tregularMarketPrice: ${(data.closes[data.closes.length - 1] / 100).toFixed(2)},
\tcurrency: '${data.currency}',
\thistory: [\n${historyLines.join(',\n')}\n\t]
};`;
}

// ─── Code Generator ────────────────────────────────────────────────────────

function generateTs(tickerDataList, fetchedAt) {
	const spyData = tickerDataList.find((t) => t.symbol === 'SPY');
	const nasdaqData = tickerDataList.find((t) => t.symbol === '^IXIC');
	const ftseData = tickerDataList.find((t) => t.symbol === '^FTSE');

	const spyStatic = buildStaticObject(spyData, 'SPY_STATIC_DATA');
	const nasdaqStatic = buildStaticObject(nasdaqData, 'NASDAQ_STATIC_DATA');
	const ftseStatic = buildStaticObject(ftseData, 'FTSE100_STATIC_DATA');

		const rows = tickerDataList.map((t) => {
		const datesStr = t.dates.join(', ');
		const closesStr = t.closes.join(', ');
		const safeName = t.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		return `\t{\n\t\tsymbol: '${t.symbol}',\n\t\tname: '${safeName}',\n\t\tcurrency: '${t.currency}',\n\t\tdates: [${datesStr}] as number[],\n\t\tcloses: [${closesStr}] as number[]\n\t}`;
	});

	const allSymbols = tickerDataList.map((t) => `'${t.symbol}'`).join(', ');

	return `/**
 * Unified Ticker Fallback System
 *
 * Auto-generated by update-ticker-fallback.mjs on ${fetchedAt}
 * Contains historical daily close prices for ${tickerDataList.length} tickers.
 *
 * Format: Columnar (highly compressible) with integer encoding
 * - Dates as YYYYMMDD integers (e.g., 20260105 = January 5, 2026)
 * - Closes as integers ×100 (e.g., 15099 = $150.99)
 */

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface StockDataPoint {
\tdate: string; // ISO format: YYYY-MM-DD
\tadjClose: number; // Adjusted close price
}

export interface CachedStockData {
\tsymbol: string;
\tshortName: string;
\tregularMarketPrice: number;
\tcurrency: string;
\thistory: StockDataPoint[];
}

export interface Top100TickerData {
\tsymbol: string;
\tname: string;
\tcurrency: string;
\tdates: number[]; // YYYYMMDD format (e.g., 20260105)
\tcloses: number[]; // Close price × 100 (e.g., 15099 = $150.99)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract a single ticker's data from the columnar format
 */
export function getTop100TickerData(symbol: string): Top100TickerData | null {
\tconst tickers = getAllTickersData();
\tconst ticker = tickers.find((t: Top100TickerData) => t.symbol === symbol.toUpperCase());
\tif (!ticker) return null;

\treturn {
\t\tsymbol: ticker.symbol,
\t\tname: ticker.name,
\t\tcurrency: ticker.currency,
\t\tdates: ticker.dates,
\t\tcloses: ticker.closes
\t};
}

/**
 * Convert columnar data to StockDataPoint array for compatibility
 */
export function convertTop100ToHistory(data: Top100TickerData): StockDataPoint[] {
\treturn data.dates.map((dateNum, idx) => {
\t\tconst dateStr = dateNum.toString();
\t\tconst year = dateStr.slice(0, 4);
\t\tconst month = dateStr.slice(4, 6);
\t\tconst day = dateStr.slice(6, 8);
\t\tconst date = \`\${year}-\${month}-\${day}\`;
\t\tconst adjClose = data.closes[idx] / 100; // Convert from integer back to decimal
\t\treturn { date, adjClose };
\t});
}

/**
 * Get the most recent price for a ticker
 */
export function getLatestPrice(symbol: string): number | null {
\tconst data = getTop100TickerData(symbol);
\tif (!data || data.closes.length === 0) return null;
\treturn data.closes[data.closes.length - 1] / 100;
}

/**
 * Get ALL tickers available in the fallback
 */
export const ALL_TOP_100_TICKERS: string[] = [${allSymbols}];

/**
 * Get fallback data for a ticker symbol (returns null if not found)
 */
export function getStaticFallbackData(symbol: string): CachedStockData | null {
\tconst data = getTop100TickerData(symbol);
\tif (!data) return null;
\treturn {
\t\tsymbol: data.symbol,
\t\tshortName: data.name,
\t\tregularMarketPrice: data.closes[data.closes.length - 1] / 100,
\t\tcurrency: data.currency,
\t\thistory: convertTop100ToHistory(data)
\t};
}

// ============================================================================
// STATIC INDEX DATA (SPY / NASDAQ / FTSE)
// ============================================================================

${spyStatic}

${nasdaqStatic}

${ftseStatic}

// ============================================================================
// ALL TICKERS DATA (Lazy-Loaded)
// ============================================================================

let _cachedTickers: Top100TickerData[] | null = null;

/**
 * Lazy-loaded ticker data - only loads array on first access
 * Subsequent calls return cached reference
 */
function getAllTickersData(): Top100TickerData[] {
\tif (_cachedTickers === null) {
\t\t_cachedTickers = _buildTickerData();
\t}
\treturn _cachedTickers;
}

/**
 * Build the full ticker data array
 * Called once on first access, then cached
 */
function _buildTickerData(): Top100TickerData[] {
\treturn [
${rows.join(',\n')}
\t];
}
`;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
	const fetchedAt = new Date().toISOString().replace('T', ' ').split('.')[0];
	const todayStr = today();

	console.log('\nParsing existing ticker-fallback.ts...');
	const existing = parseExistingFallback();
	console.log(`Found ${Object.keys(existing).length} existing tickers.\n`);

	const updatedTickers = [];
	let skipped = 0;
	let updated = 0;
	let failed = 0;

	for (let i = 0; i < TICKERS.length; i++) {
		const symbol = TICKERS[i];
		const existingData = existing[symbol];

		if (!existingData) {
			console.log(`[${i + 1}/${TICKERS.length}] ${symbol}: Not in existing data — skipping`);
			skipped++;
			continue;
		}

		const lastDateInt = existingData.dates[existingData.dates.length - 1];
		const lastDateStr = intToDate(lastDateInt);

		// Skip if already current (within 5 days, accounting for weekends/holidays)
		const daysSinceLast = Math.floor((new Date(todayStr) - new Date(lastDateStr)) / (1000 * 60 * 60 * 24));
		if (daysSinceLast <= 3) {
			console.log(`[${i + 1}/${TICKERS.length}] ${symbol}: Already current (${lastDateStr}, ${daysSinceLast}d ago)`);
			updatedTickers.push(existingData);
			skipped++;
			continue;
		}

		console.log(`[${i + 1}/${TICKERS.length}] ${symbol}: Fetching ${lastDateStr} → ${todayStr} (${daysSinceLast}d gap)...`);

		try {
			const { points, meta } = await fetchYahooChart(symbol, lastDateStr);

			const currency = meta?.currency ?? existingData.currency;
			const name = existingData.name; // Keep existing name

			if (points.length === 0) {
				console.log(`  → No new data (market closed or already current)`);
				updatedTickers.push(existingData);
				updated++;
			} else {
				// Deduplicate: remove any existing points that overlap with new data
				const newDateInts = new Set(points.map((p) => dateToInt(p.date)));
				const filteredDates = [];
				const filteredCloses = [];
				for (let j = 0; j < existingData.dates.length; j++) {
					if (!newDateInts.has(existingData.dates[j])) {
						filteredDates.push(existingData.dates[j]);
						filteredCloses.push(existingData.closes[j]);
					}
				}

				const mergedDates = [...filteredDates, ...points.map((p) => dateToInt(p.date))];
				const mergedCloses = [...filteredCloses, ...points.map((p) => p.close)];

				const newLastDate = intToDate(mergedDates[mergedDates.length - 1]);
				console.log(`  ✓  +${points.length} points → last: ${newLastDate}`);

				updatedTickers.push({ symbol, name, currency, dates: mergedDates, closes: mergedCloses });
				updated++;
			}
		} catch (err) {
			console.error(`  ✗  ${symbol}: ${err.message} — keeping existing data`);
			updatedTickers.push(existingData);
			failed++;
		}

		if (i < TICKERS.length - 1) {
			await delay(DELAY_BETWEEN_TICKERS_MS);
		}
	}

	console.log('\n─────────────────────────────────');
	console.log(`Updated: ${updated}  |  Already current: ${skipped}  |  Failed: ${failed}`);
	console.log('Generating TypeScript...\n');

	const ts = generateTs(updatedTickers, fetchedAt);
	writeFileSync(OUTPUT_PATH, ts, 'utf8');

	console.log(`✓ Written to ${OUTPUT_PATH}`);
	console.log(`  File size: ${(ts.length / 1024 / 1024).toFixed(1)} MB`);
	console.log(`  Tickers: ${updatedTickers.length}`);

	const keyTickers = ['SPY', 'AAPL', 'MSFT', 'NFLX', '^FTSE', '^IXIC'];
	console.log('\nKey ticker last dates:');
	for (const sym of keyTickers) {
		const t = updatedTickers.find((x) => x.symbol === sym);
		if (t) {
			const last = intToDate(t.dates[t.dates.length - 1]);
			console.log(`  ${sym}: ${last}`);
		}
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
