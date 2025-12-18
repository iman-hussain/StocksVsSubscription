/**
 * Maps common subscription/service names to their stock tickers.
 * Used to auto-resolve what stock the user "could have bought" instead.
 */

export interface TickerMapping {
	name: string;
	ticker: string;
	defaultCost: number; // Default monthly cost in GBP
}

export interface ProductMapping {
	name: string;
	ticker: string;
	rtp: number; // Recommended retail price in GBP
	releaseDate: string; // YYYY-MM-DD format
	aliases: string[]; // Alternative names (e.g. "iPhone 15 Pro Max", "iPhone 15 PM")
}

export const SUBSCRIPTION_TICKERS: TickerMapping[] = [
    // Existing Subscriptions
    { name: 'Netflix', ticker: 'NFLX', defaultCost: 10.99 },
    { name: 'Spotify', ticker: 'SPOT', defaultCost: 10.99 },
    { name: 'Disney+', ticker: 'DIS', defaultCost: 7.99 },
    { name: 'Amazon Prime', ticker: 'AMZN', defaultCost: 8.99 },
    { name: 'Max', ticker: 'WBD', defaultCost: 9.99 },
    { name: 'YouTube Premium', ticker: 'GOOGL', defaultCost: 12.99 },
    { name: 'Apple Music', ticker: 'AAPL', defaultCost: 10.99 },
    { name: 'Google One', ticker: 'GOOGL', defaultCost: 7.99 },
    { name: 'Microsoft 365', ticker: 'MSFT', defaultCost: 5.99 },
    { name: 'Xbox Game Pass', ticker: 'MSFT', defaultCost: 10.99 },
    { name: 'PlayStation Plus', ticker: 'SONY', defaultCost: 10.99 },
    { name: 'iCloud+', ticker: 'AAPL', defaultCost: 2.99 },
    { name: 'Dropbox', ticker: 'DBX', defaultCost: 9.99 },
    { name: 'Adobe Creative Cloud', ticker: 'ADBE', defaultCost: 54.99 },
    { name: 'Gym', ticker: 'SPY', defaultCost: 45.00 }, // Fallback to S&P 500

    // Common Western Additions (Streaming & Entertainment)
    { name: 'Paramount+', ticker: 'PARA', defaultCost: 6.99 },
    { name: 'Apple TV+', ticker: 'AAPL', defaultCost: 8.99 },
    { name: 'Hulu', ticker: 'DIS', defaultCost: 7.99 }, // US Pricing (common in West)
    { name: 'Peacock', ticker: 'CMCSA', defaultCost: 7.99 }, // US Pricing (Comcast)
    { name: 'Audible', ticker: 'AMZN', defaultCost: 7.99 },
    { name: 'Twitch', ticker: 'AMZN', defaultCost: 3.99 },
    { name: 'Nintendo Switch Online', ticker: 'NTDOY', defaultCost: 3.49 },

    // Lifestyle & Utilities
    { name: 'Uber One', ticker: 'UBER', defaultCost: 5.99 },
    { name: 'Deliveroo Plus', ticker: 'ROO', defaultCost: 3.49 }, // London Stock Exchange (ROO.L)
    { name: 'Peloton App', ticker: 'PTON', defaultCost: 12.99 },
    { name: 'Planet Fitness', ticker: 'PLNT', defaultCost: 24.99 },
    { name: 'Walmart+', ticker: 'WMT', defaultCost: 12.95 }, // US Pricing

    // Productivity & Tech
    { name: 'Zoom', ticker: 'ZM', defaultCost: 12.99 },
    { name: 'Slack', ticker: 'CRM', defaultCost: 8.75 }, // Salesforce
    { name: 'ChatGPT Plus', ticker: 'MSFT', defaultCost: 16.00 }, // Fallback to Microsoft (OpenAI partner)
];

/**
 * One-off product database with RTPs and company tickers.
 * Allows users to compare product purchases against investing in the company's stock.
 */
export const PRODUCT_DATABASE: ProductMapping[] = [
	// Apple Products
	{ name: 'iPhone', ticker: 'AAPL', rtp: 799, releaseDate: '2024-09-20', aliases: ['iphone 15', 'iphone15', 'iphone 15 standard'] },
	{ name: 'iPhone Pro', ticker: 'AAPL', rtp: 999, releaseDate: '2024-09-20', aliases: ['iphone 15 pro', 'iphone15pro', 'iphone pro', 'iphone pro max', 'iphone 15 pro max', 'iphone15promax'] },
	{ name: 'MacBook Air', ticker: 'AAPL', rtp: 1199, releaseDate: '2024-03-04', aliases: ['macbook air', 'macbookair', 'mba'] },
	{ name: 'MacBook Pro', ticker: 'AAPL', rtp: 1999, releaseDate: '2024-01-30', aliases: ['macbook pro', 'macbookpro', 'mbp'] },
	{ name: 'iPad', ticker: 'AAPL', rtp: 349, releaseDate: '2024-05-15', aliases: ['ipad'] },
	{ name: 'Apple Watch', ticker: 'AAPL', rtp: 399, releaseDate: '2024-09-16', aliases: ['apple watch', 'applewatch', 'watch'] },
	{ name: 'AirPods Pro', ticker: 'AAPL', rtp: 249, releaseDate: '2024-09-09', aliases: ['airpods pro', 'airpodspro', 'airpods'] },

	// Microsoft Products
	{ name: 'Xbox Series X', ticker: 'MSFT', rtp: 479, releaseDate: '2020-11-10', aliases: ['xbox series x', 'xboxxs', 'xbox x', 'seriesx'] },
	{ name: 'Xbox Series S', ticker: 'MSFT', rtp: 299, releaseDate: '2020-11-10', aliases: ['xbox series s', 'xboxss', 'xbox s', 'seriess'] },
	{ name: 'Surface Laptop', ticker: 'MSFT', rtp: 999, releaseDate: '2024-06-18', aliases: ['surface laptop', 'surfacelaptop', 'surface'] },
	{ name: 'Surface Pro', ticker: 'MSFT', rtp: 799, releaseDate: '2024-05-20', aliases: ['surface pro', 'surfacepro'] },

	// Sony Products
	{ name: 'PlayStation 5', ticker: 'SONY', rtp: 479, releaseDate: '2020-11-12', aliases: ['ps5', 'playstation 5', 'playstation5', 'playstation'] },
	{ name: 'PlayStation 4', ticker: 'SONY', rtp: 299, releaseDate: '2013-11-15', aliases: ['ps4', 'playstation 4', 'playstation4'] },

	// NVIDIA Products
	{ name: 'RTX 4090', ticker: 'NVDA', rtp: 1599, releaseDate: '2022-10-12', aliases: ['rtx 4090', 'rtx4090', '4090', 'geforce rtx 4090'] },
	{ name: 'RTX 4080', ticker: 'NVDA', rtp: 1199, releaseDate: '2022-11-16', aliases: ['rtx 4080', 'rtx4080', '4080', 'geforce rtx 4080'] },
	{ name: 'RTX 4070', ticker: 'NVDA', rtp: 649, releaseDate: '2023-01-05', aliases: ['rtx 4070', 'rtx4070', '4070', 'geforce rtx 4070'] },

	// Samsung Products
	{ name: 'Samsung Galaxy S24', ticker: 'SSNLF', rtp: 849, releaseDate: '2024-01-25', aliases: ['galaxy s24', 'galaxys24', 's24', 'samsung s24'] },
	{ name: 'Samsung Galaxy Tab', ticker: 'SSNLF', rtp: 349, releaseDate: '2024-02-01', aliases: ['galaxy tab', 'galaxytab', 'samsung tablet'] },

	// Google Products
	{ name: 'Pixel Phone', ticker: 'GOOGL', rtp: 799, releaseDate: '2024-10-03', aliases: ['pixel 9', 'pixel9', 'pixel phone', 'google pixel', 'googlepixel'] },

	// Popular Gaming/Tech
	{ name: 'Nintendo Switch', ticker: 'NTDOY', rtp: 299, releaseDate: '2017-03-03', aliases: ['switch', 'nintendo switch', 'nintendoswitch'] },
	{ name: 'Steam Deck', ticker: 'VAL', rtp: 449, releaseDate: '2022-02-25', aliases: ['steamdeck', 'steam deck'] },
	{ name: 'Meta Quest 3', ticker: 'META', rtp: 499, releaseDate: '2023-10-10', aliases: ['quest 3', 'quest3', 'meta quest', 'oculus'] },

	// Monitors & Peripherals (generic)
	{ name: '4K Monitor', ticker: 'DELL', rtp: 399, releaseDate: '2023-01-01', aliases: ['monitor', '4k monitor', '4kmonitor'] },
	{ name: 'Gaming Keyboard', ticker: 'LOGI', rtp: 149, releaseDate: '2023-01-01', aliases: ['keyboard', 'gaming keyboard', 'mechanical keyboard'] },
	{ name: 'Gaming Mouse', ticker: 'LOGI', rtp: 79, releaseDate: '2023-01-01', aliases: ['mouse', 'gaming mouse', 'wireless mouse'] },

	// Fallback/Generic
	{ name: 'Laptop', ticker: 'DELL', rtp: 999, releaseDate: '2023-01-01', aliases: ['laptop', 'computer', 'pc'] },
	{ name: 'Desktop PC', ticker: 'DELL', rtp: 1499, releaseDate: '2023-01-01', aliases: ['desktop', 'pc', 'desktop pc', 'gaming pc'] },
	{ name: 'Phone', ticker: 'AAPL', rtp: 799, releaseDate: '2024-09-20', aliases: ['phone', 'smartphone'] },
];

/**
 * Resolves a product name to its database entry with ticker and RTP.
 * Uses fuzzy matching to find the best match.
 */
export function resolveProduct(name: string): ProductMapping | null {
	const normalised = name.toLowerCase().trim();

	// Exact match first
	const exactMatch = PRODUCT_DATABASE.find(
		(p) => p.name.toLowerCase() === normalised
	);
	if (exactMatch) return exactMatch;

	// Check aliases
	for (const product of PRODUCT_DATABASE) {
		if (product.aliases.some(alias => alias === normalised)) {
			return product;
		}
	}

	// Fuzzy match: check if any product name/alias is contained in input or vice versa
	for (const product of PRODUCT_DATABASE) {
		if (
			product.name.toLowerCase().includes(normalised) ||
			normalised.includes(product.name.toLowerCase()) ||
			product.aliases.some(alias =>
				alias.includes(normalised) || normalised.includes(alias)
			)
		) {
			return product;
		}
	}

	return null;
}

/**
 * Attempts to resolve a stock ticker from a subscription name.
 * Uses fuzzy matching to find the best match.
 */
export function resolveTicker(name: string): string {
	const normalised = name.toLowerCase().trim();

	// Exact match first
	const exactMatch = SUBSCRIPTION_TICKERS.find(
		(t) => t.name.toLowerCase() === normalised
	);
	if (exactMatch) return exactMatch.ticker;

	// Partial match (name contains or is contained)
	const partialMatch = SUBSCRIPTION_TICKERS.find(
		(t) =>
			t.name.toLowerCase().includes(normalised) ||
			normalised.includes(t.name.toLowerCase())
	);
	if (partialMatch) return partialMatch.ticker;

	// Keyword matching for common variations
	const keywordMap: Record<string, string> = {
		'prime': 'AMZN',
		'amazon': 'AMZN',
		'hbo': 'WBD',
		'youtube': 'GOOGL',
		'google': 'GOOGL',
		'apple': 'AAPL',
		'microsoft': 'MSFT',
		'xbox': 'MSFT',
		'gamepass': 'MSFT',
		'playstation': 'SONY',
		'sony': 'SONY',
		'disney': 'DIS',
		'hulu': 'DIS',
		'espn': 'DIS',
		'adobe': 'ADBE',
		'photoshop': 'ADBE',
		'illustrator': 'ADBE',
	};

	for (const [keyword, ticker] of Object.entries(keywordMap)) {
		if (normalised.includes(keyword)) {
			return ticker;
		}
	}

	// Default fallback to S&P 500 ETF
	return 'SPY';
}

/**
 * Gets the preset subscription data for the BuilderSlide.
 */
export function getSubscriptionPresets(): TickerMapping[] {
	return SUBSCRIPTION_TICKERS.filter((t) => t.ticker !== 'SPY');
}

/**
 * Gets the preset one-off product data for the BuilderSlide.
 */
export function getOneOffPresets(): ProductMapping[] {
	// Return popular products
	return [
		PRODUCT_DATABASE.find(p => p.name === 'iPhone')!,
		PRODUCT_DATABASE.find(p => p.name === 'MacBook Pro')!,
		PRODUCT_DATABASE.find(p => p.name === 'PlayStation 5')!,
		PRODUCT_DATABASE.find(p => p.name === 'Xbox Series X')!,
		PRODUCT_DATABASE.find(p => p.name === 'iPad')!,
		PRODUCT_DATABASE.find(p => p.name === 'RTX 4090')!,
	].filter(Boolean);
}
