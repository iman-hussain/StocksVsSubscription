import type { SpendFrequency } from './financials';

/**
 * Maps common subscription/service names to their stock tickers.
 * Used to auto-resolve what stock the user "could have bought" instead.
 */

export interface TickerMapping {
	name: string;
	ticker: string;
	defaultCost: number; // Default monthly cost in GBP
	aliases?: string[]; // Optional alternative names for matching
}

export interface ProductMapping {
	name: string;
	ticker: string;
	rtp: number; // Recommended retail price in GBP
	releaseDate: string; // YYYY-MM-DD format
	aliases: string[]; // Alternative names (e.g. "iPhone 15 Pro Max", "iPhone 15 PM")
}

export interface HabitMapping {
	name: string;
	ticker: string;
	defaultCost: number;
	defaultFrequency: SpendFrequency;
}

export const SUBSCRIPTION_TICKERS: TickerMapping[] = [
	// --- Streaming & Entertainment ---
	{ name: 'Netflix', ticker: 'NFLX', defaultCost: 10.99, aliases: ['netflix', 'net flix', 'netflix premium', 'netflix standard'] },
	{ name: 'Spotify', ticker: 'SPOT', defaultCost: 10.99, aliases: ['spotify', 'spotify premium', 'spotify duo', 'spotify family'] },
	{ name: 'Disney+', ticker: 'DIS', defaultCost: 7.99, aliases: ['disney+', 'disney plus', 'disney', 'disney channel'] },
	{ name: 'Hulu', ticker: 'DIS', defaultCost: 7.99, aliases: ['hulu', 'hulu+', 'hulu plus', 'hulu no ads'] },
	{ name: 'ESPN+', ticker: 'DIS', defaultCost: 10.99, aliases: ['espn+', 'espn plus', 'espn'] },
	{ name: 'Amazon Prime', ticker: 'AMZN', defaultCost: 8.99, aliases: ['amazon prime', 'prime', 'prime membership', 'prime delivery', 'prime subscription'] },
	{ name: 'Prime Video', ticker: 'AMZN', defaultCost: 8.99, aliases: ['prime video', 'amazon video', 'amazon prime video'] },
	{ name: 'Max', ticker: 'WBD', defaultCost: 9.99, aliases: ['max', 'hbo max', 'hbo', 'warner bros discovery'] },
	{ name: 'Discovery+', ticker: 'WBD', defaultCost: 4.99, aliases: ['discovery+', 'discovery plus', 'discovery channel'] },
	{ name: 'YouTube Premium', ticker: 'GOOGL', defaultCost: 12.99, aliases: ['youtube premium', 'yt premium', 'youtube red', 'youtube no ads'] },
	{ name: 'YouTube Music', ticker: 'GOOGL', defaultCost: 10.99, aliases: ['youtube music', 'yt music', 'google music'] },
	{ name: 'Apple Music', ticker: 'AAPL', defaultCost: 10.99, aliases: ['apple music', 'itunes music'] },
	{ name: 'Apple TV+', ticker: 'AAPL', defaultCost: 8.99, aliases: ['apple tv+', 'apple tv plus', 'appletv', 'apple tv'] },
	{ name: 'Paramount+', ticker: 'PARA', defaultCost: 5.99, aliases: ['paramount+', 'paramount plus', 'paramount'] },
	{ name: 'Peacock', ticker: 'CMCSA', defaultCost: 5.99, aliases: ['peacock', 'peacock tv', 'nbc peacock'] },
	{ name: 'Now TV', ticker: 'CMCSA', defaultCost: 9.99, aliases: ['now tv', 'nowtv', 'sky now'] },
	{ name: 'SiriusXM', ticker: 'SIRI', defaultCost: 13.99, aliases: ['siriusxm', 'sirius xm', 'satellite radio', 'sirius'] },
	{ name: 'Pandora', ticker: 'SIRI', defaultCost: 4.99, aliases: ['pandora', 'pandora plus', 'pandora premium'] },
	{ name: 'Audible', ticker: 'AMZN', defaultCost: 7.99, aliases: ['audible', 'amazon audible', 'audiobooks'] },
	{ name: 'Twitch', ticker: 'AMZN', defaultCost: 3.99, aliases: ['twitch', 'twitch turbo', 'twitch sub', 'twitch prime'] },
	{ name: 'Roku Channel', ticker: 'ROKU', defaultCost: 0.00, aliases: ['roku', 'roku channel', 'roku premium'] },

	// --- Gaming ---
	{ name: 'Xbox Game Pass', ticker: 'MSFT', defaultCost: 10.99, aliases: ['xbox game pass', 'game pass', 'gamepass', 'xgp', 'xbox live gold'] },
	{ name: 'PC Game Pass', ticker: 'MSFT', defaultCost: 9.99, aliases: ['pc game pass', 'pc gamepass'] },
	{ name: 'PlayStation Plus', ticker: 'SONY', defaultCost: 10.99, aliases: ['playstation plus', 'ps plus', 'ps+', 'ps now', 'playstation now'] },
	{ name: 'Nintendo Switch Online', ticker: 'NTDOY', defaultCost: 3.49, aliases: ['nintendo switch online', 'switch online', 'nso', 'nintendo online'] },
	{ name: 'EA Play', ticker: 'EA', defaultCost: 4.99, aliases: ['ea play', 'ea access', 'origin access'] },
	{ name: 'Ubisoft+', ticker: 'UBI', defaultCost: 14.99, aliases: ['ubisoft+', 'ubisoft plus', 'uplay+'] },
	{ name: 'GTA+', ticker: 'TTWO', defaultCost: 5.99, aliases: ['gta+', 'gta plus', 'rockstar social club'] },
	{ name: 'Roblox Premium', ticker: 'RBLX', defaultCost: 4.99, aliases: ['roblox premium', 'roblox builders club', 'roblox'] },

	// --- Cloud, Productivity & Tech ---
	{ name: 'Microsoft 365', ticker: 'MSFT', defaultCost: 5.99, aliases: ['microsoft 365', 'office 365', 'm365', 'ms office', 'word', 'excel'] },
	{ name: 'Copilot Pro', ticker: 'MSFT', defaultCost: 20.00, aliases: ['copilot pro', 'microsoft copilot', 'copilot'] },
	{ name: 'Google One', ticker: 'GOOGL', defaultCost: 1.99, aliases: ['google one', 'google storage', 'google drive', 'gdrive'] },
	{ name: 'Gemini Advanced', ticker: 'GOOGL', defaultCost: 18.99, aliases: ['gemini advanced', 'google gemini', 'bard advanced'] },
	{ name: 'iCloud+', ticker: 'AAPL', defaultCost: 0.99, aliases: ['icloud+', 'icloud plus', 'icloud', 'apple storage'] },
	{ name: 'Apple One', ticker: 'AAPL', defaultCost: 19.95, aliases: ['apple one', 'apple bundle'] },
	{ name: 'Dropbox', ticker: 'DBX', defaultCost: 9.99, aliases: ['dropbox', 'dropbox plus'] },
	{ name: 'Adobe Creative Cloud', ticker: 'ADBE', defaultCost: 59.99, aliases: ['adobe creative cloud', 'adobe cc', 'creative cloud'] },
	{ name: 'Adobe Photoshop', ticker: 'ADBE', defaultCost: 19.99, aliases: ['photoshop', 'adobe photoshop'] },
	{ name: 'Zoom', ticker: 'ZM', defaultCost: 12.99, aliases: ['zoom', 'zoom pro', 'zoom meeting'] },
	{ name: 'Slack', ticker: 'CRM', defaultCost: 8.75, aliases: ['slack', 'slack pro', 'slack premium'] },
	{ name: 'ChatGPT Plus', ticker: 'MSFT', defaultCost: 20.00, aliases: ['chatgpt plus', 'chatgpt', 'openai', 'gpt-4', 'gpt4'] },
	{ name: 'DocuSign', ticker: 'DOCU', defaultCost: 10.00, aliases: ['docusign', 'electronic signature'] },
	{ name: 'Shopify', ticker: 'SHOP', defaultCost: 29.00, aliases: ['shopify', 'shopify basic'] },
	{ name: 'Wix', ticker: 'WIX', defaultCost: 16.00, aliases: ['wix', 'wix premium', 'wix website'] },
	{ name: 'GoDaddy', ticker: 'GDDY', defaultCost: 9.99, aliases: ['godaddy', 'domain renewal', 'web hosting'] },

	// --- Lifestyle, Food & Shopping ---
	{ name: 'Walmart+', ticker: 'WMT', defaultCost: 12.95, aliases: ['walmart+', 'walmart plus', 'walmart delivery'] },
	{ name: 'Uber One', ticker: 'UBER', defaultCost: 9.99, aliases: ['uber one', 'uber pass', 'uber eats pass', 'eats pass'] },
	{ name: 'DashPass', ticker: 'DASH', defaultCost: 9.99, aliases: ['dashpass', 'dash pass', 'doordash'] },
	{ name: 'Deliveroo Plus', ticker: 'ROO', defaultCost: 3.49, aliases: ['deliveroo plus', 'deliveroo gold', 'deliveroo'] },
	{ name: 'Instacart+', ticker: 'CART', defaultCost: 9.99, aliases: ['instacart+', 'instacart plus', 'instacart express'] },
	{ name: 'Grubhub+', ticker: 'JET', defaultCost: 9.99, aliases: ['grubhub+', 'grubhub plus', 'seamless+'] },
	{ name: 'HelloFresh', ticker: 'HFG', defaultCost: 50.00, aliases: ['hellofresh', 'hello fresh', 'meal kit'] },
	{ name: 'BarkBox', ticker: 'BARK', defaultCost: 35.00, aliases: ['barkbox', 'bark box', 'dog box'] },

	// --- Dating & Social ---
	{ name: 'Tinder', ticker: 'MTCH', defaultCost: 17.99, aliases: ['tinder', 'tinder gold', 'tinder plus', 'tinder platinum'] },
	{ name: 'Hinge', ticker: 'MTCH', defaultCost: 29.99, aliases: ['hinge', 'hinge preferred', 'hinge+'] },
	{ name: 'Bumble', ticker: 'BMBL', defaultCost: 29.99, aliases: ['bumble', 'bumble boost', 'bumble premium'] },
	{ name: 'Grindr', ticker: 'GRND', defaultCost: 19.99, aliases: ['grindr', 'grindr xtra', 'grindr unlimited'] },
	{ name: 'Match.com', ticker: 'MTCH', defaultCost: 34.99, aliases: ['match.com', 'match', 'match subscription'] },
	{ name: 'LinkedIn Premium', ticker: 'MSFT', defaultCost: 39.99, aliases: ['linkedin premium', 'linkedin learning', 'linkedin sales navigator'] },
	{ name: 'X Premium', ticker: 'TSLA', defaultCost: 8.00, aliases: ['x premium', 'twitter blue', 'twitter premium', 'x basic'] },

	// --- Health & Fitness ---
	{ name: 'Peloton App', ticker: 'PTON', defaultCost: 12.99, aliases: ['peloton app', 'peloton digital', 'peloton membership'] },
	{ name: 'Planet Fitness', ticker: 'PLNT', defaultCost: 24.99, aliases: ['planet fitness', 'pf black card', 'gym membership'] },
	{ name: 'Fitbit Premium', ticker: 'GOOGL', defaultCost: 9.99, aliases: ['fitbit premium', 'fitbit'] },
	{ name: 'Gym', ticker: 'SPY', defaultCost: 45.00, aliases: ['gym', 'gym membership', 'fitness center', 'health club', 'leisure centre'] },
	{ name: 'WeightWatchers', ticker: 'WW', defaultCost: 23.00, aliases: ['weightwatchers', 'weight watchers', 'ww'] },

	// --- News & Learning ---
	{ name: 'The New York Times', ticker: 'NYT', defaultCost: 17.00, aliases: ['nyt', 'new york times', 'ny times', 'nyt all access'] },
	{ name: 'Wall Street Journal', ticker: 'NWSA', defaultCost: 38.99, aliases: ['wsj', 'wall street journal', 'dow jones'] },
	{ name: 'Duolingo Super', ticker: 'DUOL', defaultCost: 6.99, aliases: ['duolingo super', 'duolingo plus', 'duolingo'] },
	{ name: 'Coursera Plus', ticker: 'COUR', defaultCost: 59.00, aliases: ['coursera plus', 'coursera'] },
	{ name: 'Udemy Personal', ticker: 'UDMY', defaultCost: 29.99, aliases: ['udemy personal', 'udemy'] },
	{ name: 'Chegg Study', ticker: 'CHGG', defaultCost: 15.95, aliases: ['chegg study', 'chegg'] },

	// --- Home Security & Utilities ---
	{ name: 'Ring Protect', ticker: 'AMZN', defaultCost: 4.99, aliases: ['ring protect', 'ring plan', 'ring doorbell subscription'] },
	{ name: 'ADT Control', ticker: 'ADT', defaultCost: 28.99, aliases: ['adt control', 'adt', 'adt security'] },
	{ name: 'Arlo Secure', ticker: 'ARLO', defaultCost: 12.99, aliases: ['arlo secure', 'arlo', 'arlo subscription'] },
	{ name: 'Nest Aware', ticker: 'GOOGL', defaultCost: 8.00, aliases: ['nest aware', 'nest subscription', 'google nest'] },
];

/**
 * One-off product database with RTPs and company tickers.
 * Allows users to compare product purchases against investing in the company's stock.
 */
export const PRODUCT_DATABASE: ProductMapping[] = [
	// --- Samsung Tablets (New) ---
	// Galaxy Tab S9 Series
	{ name: 'Samsung Galaxy Tab S9 Ultra', ticker: '005930.KS', rtp: 1199, releaseDate: '2023-08-11', aliases: ['tab s9 ultra', 's9 ultra', 'galaxy tab s9 ultra'] },
	{ name: 'Samsung Galaxy Tab S9+', ticker: '005930.KS', rtp: 999, releaseDate: '2023-08-11', aliases: ['tab s9+', 'tab s9 plus', 's9+', 's9 plus'] },
	{ name: 'Samsung Galaxy Tab S9', ticker: '005930.KS', rtp: 799, releaseDate: '2023-08-11', aliases: ['tab s9', 'galaxy tab s9'] },
	{ name: 'Samsung Galaxy Tab S9 FE+', ticker: '005930.KS', rtp: 599, releaseDate: '2023-10-16', aliases: ['tab s9 fe+', 's9 fe plus', 'fan edition'] },
	{ name: 'Samsung Galaxy Tab S9 FE', ticker: '005930.KS', rtp: 449, releaseDate: '2023-10-16', aliases: ['tab s9 fe', 's9 fe'] },

	// Galaxy Tab S8 Series
	{ name: 'Samsung Galaxy Tab S8 Ultra', ticker: '005930.KS', rtp: 1099, releaseDate: '2022-04-30', aliases: ['tab s8 ultra', 's8 ultra'] },
	{ name: 'Samsung Galaxy Tab S8+', ticker: '005930.KS', rtp: 899, releaseDate: '2022-04-30', aliases: ['tab s8+', 's8 plus'] },
	{ name: 'Samsung Galaxy Tab S8', ticker: '005930.KS', rtp: 699, releaseDate: '2022-04-30', aliases: ['tab s8', 'galaxy tab s8'] },

	// Galaxy Tab S7 Series
	{ name: 'Samsung Galaxy Tab S7+', ticker: '005930.KS', rtp: 849, releaseDate: '2020-08-21', aliases: ['tab s7+', 's7 plus'] },
	{ name: 'Samsung Galaxy Tab S7', ticker: '005930.KS', rtp: 649, releaseDate: '2020-08-21', aliases: ['tab s7', 'galaxy tab s7'] },
	{ name: 'Samsung Galaxy Tab S7 FE', ticker: '005930.KS', rtp: 529, releaseDate: '2021-05-27', aliases: ['tab s7 fe', 's7 fan edition'] },

	// Galaxy Tab A & Lite Series
	{ name: 'Samsung Galaxy Tab A9+', ticker: '005930.KS', rtp: 219, releaseDate: '2023-10-23', aliases: ['tab a9+', 'a9 plus', 'galaxy tab a9+'] },
	{ name: 'Samsung Galaxy Tab A8', ticker: '005930.KS', rtp: 229, releaseDate: '2022-01-17', aliases: ['tab a8', 'galaxy tab a8'] },
	{ name: 'Samsung Galaxy Tab S6 Lite (2024)', ticker: '005930.KS', rtp: 329, releaseDate: '2024-03-28', aliases: ['tab s6 lite 2024', 's6 lite refresh'] },
	{ name: 'Samsung Galaxy Tab S6 Lite (2022)', ticker: '005930.KS', rtp: 349, releaseDate: '2022-05-23', aliases: ['tab s6 lite 2022', 's6 lite'] },

	// --- Amazon Fire Tablets (New) ---
	{ name: 'Amazon Fire Max 11', ticker: 'AMZN', rtp: 229, releaseDate: '2023-06-14', aliases: ['fire max 11', 'fire max'] },
	{ name: 'Amazon Fire HD 10 (2023)', ticker: 'AMZN', rtp: 139, releaseDate: '2023-10-18', aliases: ['fire hd 10', 'fire hd 10 13th gen'] },
	{ name: 'Amazon Fire HD 8 (2022)', ticker: 'AMZN', rtp: 99, releaseDate: '2022-10-19', aliases: ['fire hd 8', 'fire hd 8 12th gen'] },
	{ name: 'Amazon Fire 7 (2022)', ticker: 'AMZN', rtp: 59, releaseDate: '2022-06-29', aliases: ['fire 7', 'fire 7 12th gen'] },
	{ name: 'Amazon Fire HD 10 Kids Pro', ticker: 'AMZN', rtp: 189, releaseDate: '2023-10-18', aliases: ['fire hd 10 kids', 'fire kids tablet'] },

	// --- VR & AR Headsets ---
	{ name: 'Apple Vision Pro', ticker: 'AAPL', rtp: 3499, releaseDate: '2024-02-02', aliases: ['vision pro', 'apple vr', 'apple headset'] },
	{ name: 'Meta Quest 3', ticker: 'META', rtp: 499, releaseDate: '2023-10-10', aliases: ['quest 3', 'quest3', 'meta quest', 'oculus quest 3'] },
	{ name: 'Meta Quest 2', ticker: 'META', rtp: 299, releaseDate: '2020-10-13', aliases: ['quest 2', 'quest2', 'oculus quest 2'] },
	{ name: 'Oculus Rift S', ticker: 'META', rtp: 399, releaseDate: '2019-05-21', aliases: ['rift s', 'oculus rift s'] },
	{ name: 'Oculus Rift', ticker: 'META', rtp: 599, releaseDate: '2016-03-28', aliases: ['rift', 'oculus rift', 'cv1', 'original rift'] },

	// --- Apple Products ---
	// --- iPhone Series ---
	{ name: 'iPhone 5 16GB', ticker: 'AAPL', rtp: 649, releaseDate: '2012-09-21', aliases: ['iphone 5', 'iphone5', 'iphone 5 16gb'] },
	{ name: 'iPhone 5 32GB', ticker: 'AAPL', rtp: 749, releaseDate: '2012-09-21', aliases: ['iphone 5 32gb'] },
	{ name: 'iPhone 5s 16GB', ticker: 'AAPL', rtp: 649, releaseDate: '2013-09-20', aliases: ['iphone 5s', 'iphone5s', 'iphone 5s 16gb'] },
	{ name: 'iPhone 5s 32GB', ticker: 'AAPL', rtp: 749, releaseDate: '2013-09-20', aliases: ['iphone 5s 32gb'] },
	{ name: 'iPhone 6 16GB', ticker: 'AAPL', rtp: 649, releaseDate: '2014-09-19', aliases: ['iphone 6', 'iphone6', 'iphone 6 16gb'] },
	{ name: 'iPhone 6 64GB', ticker: 'AAPL', rtp: 749, releaseDate: '2014-09-19', aliases: ['iphone 6 64gb'] },
	{ name: 'iPhone 6s 16GB', ticker: 'AAPL', rtp: 649, releaseDate: '2015-09-25', aliases: ['iphone 6s', 'iphone6s', 'iphone 6s 16gb'] },
	{ name: 'iPhone 6s 64GB', ticker: 'AAPL', rtp: 749, releaseDate: '2015-09-25', aliases: ['iphone 6s 64gb'] },
	{ name: 'iPhone 7 32GB', ticker: 'AAPL', rtp: 649, releaseDate: '2016-09-16', aliases: ['iphone 7', 'iphone7', 'iphone 7 32gb'] },
	{ name: 'iPhone 7 128GB', ticker: 'AAPL', rtp: 749, releaseDate: '2016-09-16', aliases: ['iphone 7 128gb'] },
	{ name: 'iPhone 8 64GB', ticker: 'AAPL', rtp: 699, releaseDate: '2017-09-22', aliases: ['iphone 8', 'iphone8', 'iphone 8 64gb'] },
	{ name: 'iPhone 8 256GB', ticker: 'AAPL', rtp: 849, releaseDate: '2017-09-22', aliases: ['iphone 8 256gb'] },
	{ name: 'iPhone X 64GB', ticker: 'AAPL', rtp: 999, releaseDate: '2017-11-03', aliases: ['iphone x', 'iphonex', 'iphone x 64gb'] },
	{ name: 'iPhone X 256GB', ticker: 'AAPL', rtp: 1149, releaseDate: '2017-11-03', aliases: ['iphone x 256gb'] },
	{ name: 'iPhone XS 64GB', ticker: 'AAPL', rtp: 999, releaseDate: '2018-09-21', aliases: ['iphone xs', 'iphonexs', 'iphone xs 64gb'] },
	{ name: 'iPhone XS 256GB', ticker: 'AAPL', rtp: 1149, releaseDate: '2018-09-21', aliases: ['iphone xs 256gb'] },
	{ name: 'iPhone XS Max 64GB', ticker: 'AAPL', rtp: 1099, releaseDate: '2018-09-21', aliases: ['iphone xs max', 'iphonexsmax', 'iphone xs max 64gb'] },
	{ name: 'iPhone XS Max 256GB', ticker: 'AAPL', rtp: 1249, releaseDate: '2018-09-21', aliases: ['iphone xs max 256gb'] },
	{ name: 'iPhone 11 64GB', ticker: 'AAPL', rtp: 699, releaseDate: '2019-09-20', aliases: ['iphone 11', 'iphone11', 'iphone 11 64gb'] },
	{ name: 'iPhone 11 128GB', ticker: 'AAPL', rtp: 749, releaseDate: '2019-09-20', aliases: ['iphone 11 128gb'] },
	{ name: 'iPhone 11 Pro Max 64GB', ticker: 'AAPL', rtp: 1099, releaseDate: '2019-09-20', aliases: ['iphone 11 pro max', 'iphone11promax', 'iphone 11 pro max 64gb'] },
	{ name: 'iPhone 11 Pro Max 256GB', ticker: 'AAPL', rtp: 1249, releaseDate: '2019-09-20', aliases: ['iphone 11 pro max 256gb'] },
	{ name: 'iPhone 12 Mini 64GB', ticker: 'AAPL', rtp: 699, releaseDate: '2020-11-13', aliases: ['iphone 12 mini', 'iphone12mini', 'iphone 12 mini 64gb'] },
	{ name: 'iPhone 12 Mini 128GB', ticker: 'AAPL', rtp: 749, releaseDate: '2020-11-13', aliases: ['iphone 12 mini 128gb'] },
	{ name: 'iPhone 12 64GB', ticker: 'AAPL', rtp: 799, releaseDate: '2020-10-23', aliases: ['iphone 12', 'iphone12', 'iphone 12 64gb'] },
	{ name: 'iPhone 12 128GB', ticker: 'AAPL', rtp: 849, releaseDate: '2020-10-23', aliases: ['iphone 12 128gb'] },
	{ name: 'iPhone 12 Pro Max 128GB', ticker: 'AAPL', rtp: 1099, releaseDate: '2020-11-13', aliases: ['iphone 12 pro max', 'iphone12promax', 'iphone 12 pro max 128gb'] },
	{ name: 'iPhone 12 Pro Max 256GB', ticker: 'AAPL', rtp: 1199, releaseDate: '2020-11-13', aliases: ['iphone 12 pro max 256gb'] },
	{ name: 'iPhone 13 Mini 128GB', ticker: 'AAPL', rtp: 699, releaseDate: '2021-09-24', aliases: ['iphone 13 mini', 'iphone13mini', 'iphone 13 mini 128gb'] },
	{ name: 'iPhone 13 Mini 256GB', ticker: 'AAPL', rtp: 799, releaseDate: '2021-09-24', aliases: ['iphone 13 mini 256gb'] },
	{ name: 'iPhone 13 128GB', ticker: 'AAPL', rtp: 779, releaseDate: '2021-09-24', aliases: ['iphone 13', 'iphone13', 'iphone 13 128gb'] },
	{ name: 'iPhone 13 256GB', ticker: 'AAPL', rtp: 899, releaseDate: '2021-09-24', aliases: ['iphone 13 256gb'] },
	{ name: 'iPhone 13 Pro Max 128GB', ticker: 'AAPL', rtp: 1099, releaseDate: '2021-09-24', aliases: ['iphone 13 pro max', 'iphone13promax', 'iphone 13 pro max 128gb'] },
	{ name: 'iPhone 13 Pro Max 256GB', ticker: 'AAPL', rtp: 1199, releaseDate: '2021-09-24', aliases: ['iphone 13 pro max 256gb'] },
	{ name: 'iPhone 14 128GB', ticker: 'AAPL', rtp: 849, releaseDate: '2022-09-16', aliases: ['iphone 14', 'iphone14', 'iphone 14 128gb'] },
	{ name: 'iPhone 14 256GB', ticker: 'AAPL', rtp: 899, releaseDate: '2022-09-16', aliases: ['iphone 14 256gb'] },
	{ name: 'iPhone 14 Pro Max 128GB', ticker: 'AAPL', rtp: 1099, releaseDate: '2022-09-16', aliases: ['iphone 14 pro max', 'iphone14promax', 'iphone 14 pro max 128gb'] },
	{ name: 'iPhone 14 Pro Max 256GB', ticker: 'AAPL', rtp: 1199, releaseDate: '2022-09-16', aliases: ['iphone 14 pro max 256gb'] },
	{ name: 'iPhone 15 128GB', ticker: 'AAPL', rtp: 799, releaseDate: '2023-09-22', aliases: ['iphone 15', 'iphone15', 'iphone 15 128gb'] },
	{ name: 'iPhone 15 256GB', ticker: 'AAPL', rtp: 899, releaseDate: '2023-09-22', aliases: ['iphone 15 256gb'] },
	{ name: 'iPhone 15 Pro Max 256GB', ticker: 'AAPL', rtp: 1199, releaseDate: '2023-09-22', aliases: ['iphone 15 pro max', 'iphone15promax', 'iphone 15 pro max 256gb'] },
	{ name: 'iPhone 15 Pro Max 512GB', ticker: 'AAPL', rtp: 1399, releaseDate: '2023-09-22', aliases: ['iphone 15 pro max 512gb'] },
	{ name: 'iPhone 16 128GB', ticker: 'AAPL', rtp: 799, releaseDate: '2024-09-20', aliases: ['iphone 16', 'iphone16', 'iphone 16 128gb'] },
	{ name: 'iPhone 16 256GB', ticker: 'AAPL', rtp: 899, releaseDate: '2024-09-20', aliases: ['iphone 16 256gb'] },
	{ name: 'iPhone 16 Pro 128GB', ticker: 'AAPL', rtp: 999, releaseDate: '2024-09-20', aliases: ['iphone 16 pro', 'iphone16pro', 'iphone 16 pro 128gb'] },
	{ name: 'iPhone 16 Pro 256GB', ticker: 'AAPL', rtp: 1099, releaseDate: '2024-09-20', aliases: ['iphone 16 pro 256gb'] },
	{ name: 'iPhone 16 Pro Max 256GB', ticker: 'AAPL', rtp: 1199, releaseDate: '2024-09-20', aliases: ['iphone 16 pro max', 'iphone16promax', 'iphone 16 pro max 256gb'] },
	{ name: 'iPhone 16 Pro Max 512GB', ticker: 'AAPL', rtp: 1399, releaseDate: '2024-09-20', aliases: ['iphone 16 pro max 512gb'] },

	// --- iPad Series ---
	{ name: 'iPad (9th Gen) 64GB', ticker: 'AAPL', rtp: 329, releaseDate: '2021-09-24', aliases: ['ipad 9', 'ipad 2021', 'ipad 9th gen'] },
	{ name: 'iPad (9th Gen) 256GB', ticker: 'AAPL', rtp: 479, releaseDate: '2021-09-24', aliases: ['ipad 9 256gb'] },
	{ name: 'iPad (10th Gen) 64GB', ticker: 'AAPL', rtp: 349, releaseDate: '2022-10-26', aliases: ['ipad 10', 'ipad 2022', 'ipad 10th gen'] },
	{ name: 'iPad (10th Gen) 256GB', ticker: 'AAPL', rtp: 499, releaseDate: '2022-10-26', aliases: ['ipad 10 256gb'] },
	{ name: 'iPad mini (6th Gen) 64GB', ticker: 'AAPL', rtp: 499, releaseDate: '2021-09-24', aliases: ['ipad mini 6', 'ipad mini 2021'] },
	{ name: 'iPad mini (6th Gen) 256GB', ticker: 'AAPL', rtp: 649, releaseDate: '2021-09-24', aliases: ['ipad mini 6 256gb'] },
	{ name: 'iPad mini (A17 Pro) 128GB', ticker: 'AAPL', rtp: 499, releaseDate: '2024-10-23', aliases: ['ipad mini 7', 'ipad mini a17 pro', 'ipad mini 2024'] },
	{ name: 'iPad mini (A17 Pro) 256GB', ticker: 'AAPL', rtp: 599, releaseDate: '2024-10-23', aliases: ['ipad mini 7 256gb'] },
	{ name: 'iPad Air 11" (M2) 128GB', ticker: 'AAPL', rtp: 599, releaseDate: '2024-05-15', aliases: ['ipad air m2', 'ipad air 6', 'ipad air 11'] },
	{ name: 'iPad Air 13" (M2) 128GB', ticker: 'AAPL', rtp: 799, releaseDate: '2024-05-15', aliases: ['ipad air 13', 'ipad air 13 m2'] },
	{ name: 'iPad Pro 11" (M4) 256GB', ticker: 'AAPL', rtp: 999, releaseDate: '2024-05-15', aliases: ['ipad pro m4', 'ipad pro 11 m4'] },
	{ name: 'iPad Pro 13" (M4) 256GB', ticker: 'AAPL', rtp: 1299, releaseDate: '2024-05-15', aliases: ['ipad pro 13 m4', 'ipad pro 13'] },

	// --- MacBook Series ---
	{ name: 'MacBook Air 13" (Mid 2012)', ticker: 'AAPL', rtp: 1199, releaseDate: '2012-06-11', aliases: ['macbook air 2012', 'mba 2012'] },
	{ name: 'MacBook Air 13" (Mid 2013)', ticker: 'AAPL', rtp: 1099, releaseDate: '2013-06-10', aliases: ['macbook air 2013', 'mba 2013'] },
	{ name: 'MacBook Air 13" (Early 2014)', ticker: 'AAPL', rtp: 999, releaseDate: '2014-04-29', aliases: ['macbook air 2014', 'mba 2014'] },
	{ name: 'MacBook Air 13" (Early 2015)', ticker: 'AAPL', rtp: 999, releaseDate: '2015-03-09', aliases: ['macbook air 2015', 'mba 2015'] },
	{ name: 'MacBook Air 13" (2017)', ticker: 'AAPL', rtp: 999, releaseDate: '2017-06-05', aliases: ['macbook air 2017', 'mba 2017'] },
	{ name: 'MacBook Air 13" Retina (2018)', ticker: 'AAPL', rtp: 1199, releaseDate: '2018-10-30', aliases: ['macbook air 2018', 'mba 2018'] },
	{ name: 'MacBook Air 13" Retina (2019)', ticker: 'AAPL', rtp: 1099, releaseDate: '2019-07-09', aliases: ['macbook air 2019', 'mba 2019'] },
	{ name: 'MacBook Air 13" (Early 2020)', ticker: 'AAPL', rtp: 999, releaseDate: '2020-03-18', aliases: ['macbook air 2020', 'mba 2020 intel'] },
	{ name: 'MacBook Air 13" M1 (Late 2020)', ticker: 'AAPL', rtp: 999, releaseDate: '2020-11-17', aliases: ['macbook air m1', 'mba m1', 'macbook air 2020 m1'] },
	{ name: 'MacBook Air 13" M2 (2022)', ticker: 'AAPL', rtp: 1199, releaseDate: '2022-07-15', aliases: ['macbook air m2', 'mba m2', 'macbook air 2022'] },
	{ name: 'MacBook Air 15" M2 (2023)', ticker: 'AAPL', rtp: 1299, releaseDate: '2023-06-13', aliases: ['macbook air 15', 'mba 15 m2'] },
	{ name: 'MacBook Air 13" M3 (2024)', ticker: 'AAPL', rtp: 1099, releaseDate: '2024-03-08', aliases: ['macbook air m3', 'mba m3'] },
	{ name: 'MacBook Pro 13" Retina (Late 2012)', ticker: 'AAPL', rtp: 1699, releaseDate: '2012-10-23', aliases: ['macbook pro 2012', 'mbp 2012'] },
	{ name: 'MacBook Pro 13" Retina (Early 2013)', ticker: 'AAPL', rtp: 1499, releaseDate: '2013-02-13', aliases: ['macbook pro early 2013', 'mbp early 2013'] },
	{ name: 'MacBook Pro 13" Retina (Late 2013)', ticker: 'AAPL', rtp: 1299, releaseDate: '2013-10-22', aliases: ['macbook pro late 2013', 'mbp late 2013'] },
	{ name: 'MacBook Pro 13" Retina (Mid 2014)', ticker: 'AAPL', rtp: 1299, releaseDate: '2014-07-29', aliases: ['macbook pro 2014', 'mbp 2014'] },
	{ name: 'MacBook Pro 13" Retina (Early 2015)', ticker: 'AAPL', rtp: 1299, releaseDate: '2015-03-09', aliases: ['macbook pro 2015', 'mbp 2015'] },
	{ name: 'MacBook Pro 13" (Late 2016)', ticker: 'AAPL', rtp: 1499, releaseDate: '2016-10-27', aliases: ['macbook pro 2016', 'mbp 2016'] },
	{ name: 'MacBook Pro 13" (Mid 2017)', ticker: 'AAPL', rtp: 1299, releaseDate: '2017-06-05', aliases: ['macbook pro 2017', 'mbp 2017'] },
	{ name: 'MacBook Pro 13" (Mid 2018)', ticker: 'AAPL', rtp: 1799, releaseDate: '2018-07-12', aliases: ['macbook pro 2018', 'mbp 2018'] },
	{ name: 'MacBook Pro 13" (Mid 2019)', ticker: 'AAPL', rtp: 1299, releaseDate: '2019-05-21', aliases: ['macbook pro 2019', 'mbp 2019'] },
	{ name: 'MacBook Pro 16" (Late 2019)', ticker: 'AAPL', rtp: 2399, releaseDate: '2019-11-13', aliases: ['macbook pro 16', 'mbp 16 2019'] },
	{ name: 'MacBook Pro 13" (Early 2020)', ticker: 'AAPL', rtp: 1299, releaseDate: '2020-05-04', aliases: ['macbook pro 2020', 'mbp 2020 intel'] },
	{ name: 'MacBook Pro 13" M1 (Late 2020)', ticker: 'AAPL', rtp: 1299, releaseDate: '2020-11-17', aliases: ['macbook pro m1', 'mbp m1'] },
	{ name: 'MacBook Pro 14" M1 Pro (2021)', ticker: 'AAPL', rtp: 1999, releaseDate: '2021-10-26', aliases: ['macbook pro 14 m1', 'mbp 14 2021'] },
	{ name: 'MacBook Pro 13" M2 (2022)', ticker: 'AAPL', rtp: 1299, releaseDate: '2022-06-24', aliases: ['macbook pro m2 13', 'mbp 13 m2'] },
	{ name: 'MacBook Pro 14" M2 Pro (2023)', ticker: 'AAPL', rtp: 1999, releaseDate: '2023-01-24', aliases: ['macbook pro 14 m2', 'mbp 14 2023'] },
	{ name: 'MacBook Pro 14" M3 (2023)', ticker: 'AAPL', rtp: 1599, releaseDate: '2023-11-07', aliases: ['macbook pro 14 m3', 'mbp 14 m3'] },
	{ name: 'MacBook Pro 14" M3 Pro (2023)', ticker: 'AAPL', rtp: 1999, releaseDate: '2023-11-07', aliases: ['macbook pro 14 m3 pro'] },

	// --- Apple Accessories ---
	{ name: 'Apple Watch Series 10', ticker: 'AAPL', rtp: 399, releaseDate: '2024-09-20', aliases: ['apple watch series 10', 'series 10', 'iwatch 10'] },
	{ name: 'Apple Watch Ultra 2', ticker: 'AAPL', rtp: 799, releaseDate: '2023-09-22', aliases: ['apple watch ultra', 'apple watch ultra 2', 'ultra 2'] },
	{ name: 'Apple Watch SE (2nd Gen)', ticker: 'AAPL', rtp: 249, releaseDate: '2022-09-16', aliases: ['apple watch se', 'watch se', 'se'] },
	{ name: 'AirPods (2nd Gen)', ticker: 'AAPL', rtp: 129, releaseDate: '2019-03-20', aliases: ['airpods 2'] },
	{ name: 'AirPods (3rd Gen)', ticker: 'AAPL', rtp: 179, releaseDate: '2021-10-26', aliases: ['airpods 3'] },
	{ name: 'AirPods 4', ticker: 'AAPL', rtp: 129, releaseDate: '2024-09-20', aliases: ['airpods 4', 'airpods 4 standard'] },
	{ name: 'AirPods 4 (ANC)', ticker: 'AAPL', rtp: 179, releaseDate: '2024-09-20', aliases: ['airpods 4 anc', 'airpods 4 noise cancelling'] },
	{ name: 'AirPods Pro (2nd Gen)', ticker: 'AAPL', rtp: 249, releaseDate: '2022-09-23', aliases: ['airpods pro', 'airpodspro', 'airpods pro 2'] },
	{ name: 'AirPods Max', ticker: 'AAPL', rtp: 549, releaseDate: '2020-12-15', aliases: ['airpods max', 'apple headphones'] },

	// --- Samsung Smartphones: Foldables (Z Fold Series) ---
	{ name: 'Samsung Galaxy Z Fold 6', ticker: '005930.KS', rtp: 1899, releaseDate: '2024-07-24', aliases: ['z fold 6', 'fold 6', 'z fold6', 'galaxy fold 6'] },
	{ name: 'Samsung Galaxy Z Fold 5', ticker: '005930.KS', rtp: 1799, releaseDate: '2023-08-11', aliases: ['z fold 5', 'fold 5', 'z fold5', 'galaxy fold 5'] },
	{ name: 'Samsung Galaxy Z Fold 4', ticker: '005930.KS', rtp: 1799, releaseDate: '2022-08-25', aliases: ['z fold 4', 'fold 4', 'z fold4', 'galaxy fold 4'] },
	{ name: 'Samsung Galaxy Z Fold 3', ticker: '005930.KS', rtp: 1799, releaseDate: '2021-08-27', aliases: ['z fold 3', 'fold 3', 'z fold3', 'galaxy fold 3'] },
	{ name: 'Samsung Galaxy Z Fold 2', ticker: '005930.KS', rtp: 1999, releaseDate: '2020-09-18', aliases: ['z fold 2', 'fold 2', 'z fold2', 'galaxy fold 2'] },

	// --- Samsung Smartphones: Standard (Galaxy S-Series) ---
	{ name: 'Samsung Galaxy S24 Ultra', ticker: '005930.KS', rtp: 1299, releaseDate: '2024-01-31', aliases: ['s24 ultra', 's24u'] },
	{ name: 'Samsung Galaxy S24', ticker: '005930.KS', rtp: 849, releaseDate: '2024-01-25', aliases: ['galaxy s24', 's24'] },
	{ name: 'Samsung Galaxy S23 Ultra', ticker: '005930.KS', rtp: 1199, releaseDate: '2023-02-17', aliases: ['s23 ultra', 's23u'] },
	{ name: 'Samsung Galaxy S23', ticker: '005930.KS', rtp: 799, releaseDate: '2023-02-17', aliases: ['s23', 'galaxy s23'] },
	{ name: 'Samsung Galaxy S22 Ultra', ticker: '005930.KS', rtp: 1199, releaseDate: '2022-02-25', aliases: ['s22 ultra', 's22u'] },
	{ name: 'Samsung Galaxy S22', ticker: '005930.KS', rtp: 799, releaseDate: '2022-02-25', aliases: ['s22', 'galaxy s22'] },
	{ name: 'Samsung Galaxy S21 Ultra', ticker: '005930.KS', rtp: 1199, releaseDate: '2021-01-29', aliases: ['s21 ultra', 's21u'] },
	{ name: 'Samsung Galaxy S21', ticker: '005930.KS', rtp: 799, releaseDate: '2021-01-29', aliases: ['s21', 'galaxy s21'] },
	{ name: 'Samsung Galaxy S20', ticker: '005930.KS', rtp: 999, releaseDate: '2020-03-06', aliases: ['s20', 'galaxy s20'] },
	{ name: 'Samsung Galaxy S10', ticker: '005930.KS', rtp: 899, releaseDate: '2019-03-08', aliases: ['s10', 'galaxy s10'] },

	// --- Google Smartphones (Pixel Series) ---
	{ name: 'Pixel Phone', ticker: 'GOOGL', rtp: 799, releaseDate: '2024-10-03', aliases: ['pixel 9', 'pixel9', 'pixel phone'] },
	{ name: 'Google Pixel 8 Pro', ticker: 'GOOGL', rtp: 999, releaseDate: '2023-10-12', aliases: ['pixel 8 pro', 'pixel8pro'] },
	{ name: 'Google Pixel 8', ticker: 'GOOGL', rtp: 699, releaseDate: '2023-10-12', aliases: ['pixel 8', 'pixel8'] },
	{ name: 'Google Pixel 7 Pro', ticker: 'GOOGL', rtp: 899, releaseDate: '2022-10-13', aliases: ['pixel 7 pro', 'pixel7pro'] },
	{ name: 'Google Pixel 7', ticker: 'GOOGL', rtp: 599, releaseDate: '2022-10-13', aliases: ['pixel 7', 'pixel7'] },
	{ name: 'Google Pixel 6 Pro', ticker: 'GOOGL', rtp: 899, releaseDate: '2021-10-28', aliases: ['pixel 6 pro', 'pixel6pro'] },
	{ name: 'Google Pixel 6', ticker: 'GOOGL', rtp: 599, releaseDate: '2021-10-28', aliases: ['pixel 6', 'pixel6'] },
	{ name: 'Google Pixel 5', ticker: 'GOOGL', rtp: 699, releaseDate: '2020-10-29', aliases: ['pixel 5', 'pixel5'] },
	{ name: 'Google Pixel 4', ticker: 'GOOGL', rtp: 799, releaseDate: '2019-10-24', aliases: ['pixel 4', 'pixel4'] },
	{ name: 'Google Pixel 3', ticker: 'GOOGL', rtp: 799, releaseDate: '2018-10-18', aliases: ['pixel 3', 'pixel3'] },
	{ name: 'Google Pixel 1', ticker: 'GOOGL', rtp: 649, releaseDate: '2016-10-20', aliases: ['pixel 1', 'original pixel'] },

	// --- Gaming Consoles: Modern ---
	{ name: 'Xbox Series X', ticker: 'MSFT', rtp: 449, releaseDate: '2020-11-10', aliases: ['xbox series x', 'xboxxs', 'xbox x', 'seriesx'] },
	{ name: 'Xbox Series S', ticker: 'MSFT', rtp: 299, releaseDate: '2020-11-10', aliases: ['xbox series s', 'xboxss', 'xbox s', 'seriess'] },
	{ name: 'PlayStation 5 Pro', ticker: 'SONY', rtp: 699, releaseDate: '2024-11-07', aliases: ['ps5 pro', 'playstation 5 pro', 'ps5pro', 'sony ps5 pro'] },
	{ name: 'PlayStation 5', ticker: 'SONY', rtp: 449, releaseDate: '2020-11-19', aliases: ['ps5', 'playstation 5', 'playstation5', 'playstation'] },
	{ name: 'Nintendo Switch', ticker: 'NTDOY', rtp: 279, releaseDate: '2017-03-03', aliases: ['switch', 'nintendo switch', 'nintendoswitch'] },

	// --- Gaming Consoles: Classic/Legacy ---
	{ name: 'PlayStation 4', ticker: 'SONY', rtp: 299, releaseDate: '2013-11-15', aliases: ['ps4', 'playstation 4', 'playstation4'] },
	{ name: 'PlayStation 3', ticker: 'SONY', rtp: 499, releaseDate: '2006-11-17', aliases: ['ps3', 'playstation 3', 'playstation3'] },
	{ name: 'PlayStation 2', ticker: 'SONY', rtp: 299, releaseDate: '2000-10-26', aliases: ['ps2', 'playstation 2', 'playstation2'] },
	{ name: 'PlayStation Portable', ticker: 'SONY', rtp: 249, releaseDate: '2005-03-24', aliases: ['psp', 'playstation portable'] },
	{ name: 'Xbox 360', ticker: 'MSFT', rtp: 299, releaseDate: '2005-11-22', aliases: ['xbox 360', '360'] },
	{ name: 'Xbox (Original)', ticker: 'MSFT', rtp: 299, releaseDate: '2001-11-15', aliases: ['original xbox', 'xbox 1', 'xbox classic'] },

	// --- Microsoft Products (Surface) ---
	{ name: 'Surface Laptop', ticker: 'MSFT', rtp: 999, releaseDate: '2024-06-18', aliases: ['surface laptop', 'surfacelaptop', 'surface'] },
	{ name: 'Surface Pro', ticker: 'MSFT', rtp: 799, releaseDate: '2024-05-20', aliases: ['surface pro', 'surfacepro'] },

	// --- Sony Products (Audio & Cameras) ---
	{ name: 'Sony WH-1000XM5', ticker: 'SONY', rtp: 349, releaseDate: '2022-05-20', aliases: ['sony headphones', 'xm5', 'wh1000xm5', 'noise cancelling headphones'] },
	// Full Frame
	{ name: 'Sony A7R V', ticker: 'SONY', rtp: 3898, releaseDate: '2022-12-06', aliases: ['a7rv', 'a7r5', 'alpha 7r v'] },
	{ name: 'Sony A7 IV', ticker: 'SONY', rtp: 2498, releaseDate: '2021-12-23', aliases: ['a7iv', 'a7m4', 'alpha 7 iv'] },
	{ name: 'Sony A7 III', ticker: 'SONY', rtp: 1998, releaseDate: '2018-04-10', aliases: ['a7iii', 'a7m3', 'alpha 7 iii'] },
	{ name: 'Sony A7 II', ticker: 'SONY', rtp: 1698, releaseDate: '2014-12-09', aliases: ['a7ii', 'a7m2', 'alpha 7 ii'] },
	{ name: 'Sony A7 (Original)', ticker: 'SONY', rtp: 1698, releaseDate: '2013-10-16', aliases: ['a7', 'alpha 7', 'sony a7'] },
	// APS-C
	{ name: 'Sony a6700', ticker: 'SONY', rtp: 1398, releaseDate: '2023-08-03', aliases: ['a6700', 'alpha 6700'] },
	{ name: 'Sony a6600', ticker: 'SONY', rtp: 1398, releaseDate: '2019-10-01', aliases: ['a6600', 'alpha 6600'] },
	{ name: 'Sony a6400', ticker: 'SONY', rtp: 898, releaseDate: '2019-02-28', aliases: ['a6400', 'alpha 6400'] },
	{ name: 'Sony a6000', ticker: 'SONY', rtp: 598, releaseDate: '2014-04-20', aliases: ['a6000', 'alpha 6000', 'ilce-6000'] },

	// --- PC Components: Graphics Cards (NVIDIA) ---
	// Modern
	{ name: 'NVIDIA RTX 4090', ticker: 'NVDA', rtp: 1599, releaseDate: '2022-10-12', aliases: ['rtx 4090', 'rtx4090', '4090', 'geforce rtx 4090'] },
	{ name: 'NVIDIA RTX 4080', ticker: 'NVDA', rtp: 1199, releaseDate: '2022-11-16', aliases: ['rtx 4080', 'rtx4080', '4080', 'geforce rtx 4080'] },
	{ name: 'NVIDIA RTX 4070', ticker: 'NVDA', rtp: 649, releaseDate: '2023-01-05', aliases: ['rtx 4070', 'rtx4070', '4070', 'geforce rtx 4070'] },
	{ name: 'NVIDIA RTX 4060', ticker: 'NVDA', rtp: 299, releaseDate: '2023-06-29', aliases: ['rtx 4060', '4060'] },
	// RTX 30 Series
	{ name: 'NVIDIA RTX 3090 Ti', ticker: 'NVDA', rtp: 1999, releaseDate: '2022-03-29', aliases: ['rtx 3090 ti', '3090ti'] },
	{ name: 'NVIDIA RTX 3090', ticker: 'NVDA', rtp: 1499, releaseDate: '2020-09-24', aliases: ['rtx 3090', '3090'] },
	{ name: 'NVIDIA RTX 3080', ticker: 'NVDA', rtp: 699, releaseDate: '2020-09-17', aliases: ['rtx 3080', '3080'] },
	{ name: 'NVIDIA RTX 3070', ticker: 'NVDA', rtp: 499, releaseDate: '2020-10-29', aliases: ['rtx 3070', '3070'] },
	{ name: 'NVIDIA RTX 3060', ticker: 'NVDA', rtp: 329, releaseDate: '2021-02-25', aliases: ['rtx 3060', '3060'] },
	// RTX 20 Series
	{ name: 'NVIDIA RTX 2080 Ti', ticker: 'NVDA', rtp: 999, releaseDate: '2018-09-27', aliases: ['rtx 2080 ti', '2080ti'] },
	{ name: 'NVIDIA RTX 2080', ticker: 'NVDA', rtp: 699, releaseDate: '2018-09-20', aliases: ['rtx 2080', '2080'] },
	{ name: 'NVIDIA RTX 2070', ticker: 'NVDA', rtp: 499, releaseDate: '2018-10-17', aliases: ['rtx 2070', '2070'] },
	{ name: 'NVIDIA RTX 2060', ticker: 'NVDA', rtp: 349, releaseDate: '2019-01-15', aliases: ['rtx 2060', '2060'] },
	// GTX 10 Series
	{ name: 'NVIDIA GTX 1080 Ti', ticker: 'NVDA', rtp: 699, releaseDate: '2017-03-10', aliases: ['gtx 1080 ti', '1080ti'] },
	{ name: 'NVIDIA GTX 1080', ticker: 'NVDA', rtp: 599, releaseDate: '2016-05-27', aliases: ['gtx 1080', '1080'] },
	{ name: 'NVIDIA GTX 1070', ticker: 'NVDA', rtp: 379, releaseDate: '2016-06-10', aliases: ['gtx 1070', '1070'] },
	{ name: 'NVIDIA GTX 1060', ticker: 'NVDA', rtp: 299, releaseDate: '2016-07-19', aliases: ['gtx 1060', '1060 6gb'] },
	// GTX 900 Series
	{ name: 'NVIDIA GTX 980 Ti', ticker: 'NVDA', rtp: 649, releaseDate: '2015-06-02', aliases: ['gtx 980 ti', '980ti'] },
	{ name: 'NVIDIA GTX 980', ticker: 'NVDA', rtp: 549, releaseDate: '2014-09-18', aliases: ['gtx 980', '980'] },
	{ name: 'NVIDIA GTX 970', ticker: 'NVDA', rtp: 329, releaseDate: '2014-09-18', aliases: ['gtx 970', '970'] },

	// --- PC Components: Graphics Cards (AMD) ---
	{ name: 'AMD Radeon RX 7900 XTX', ticker: 'AMD', rtp: 999, releaseDate: '2022-12-13', aliases: ['rx 7900 xtx', '7900xtx'] },
	{ name: 'AMD Radeon RX 6800 XT', ticker: 'AMD', rtp: 649, releaseDate: '2020-11-18', aliases: ['rx 6800 xt', '6800xt'] },
	{ name: 'AMD Radeon RX 580', ticker: 'AMD', rtp: 229, releaseDate: '2017-04-18', aliases: ['rx 580', 'rx580'] },

	// --- PC Components: Processors (CPUs) ---
	// Intel
	{ name: 'Intel Core i9-14900K', ticker: 'INTC', rtp: 589, releaseDate: '2023-10-17', aliases: ['i9 14900k', '14900k'] },
	{ name: 'Intel Core i9-13900K', ticker: 'INTC', rtp: 589, releaseDate: '2022-10-20', aliases: ['i9 13900k', '13900k'] },
	{ name: 'Intel Core i9-12900K', ticker: 'INTC', rtp: 589, releaseDate: '2021-11-04', aliases: ['i9 12900k', '12900k'] },
	{ name: 'Intel Core i9-10900K', ticker: 'INTC', rtp: 488, releaseDate: '2020-04-30', aliases: ['i9 10900k', '10900k'] },
	{ name: 'Intel Core i9-9900K', ticker: 'INTC', rtp: 488, releaseDate: '2018-10-19', aliases: ['i9 9900k', '9900k'] },
	{ name: 'Intel Core i7-8700K', ticker: 'INTC', rtp: 359, releaseDate: '2017-10-05', aliases: ['i7 8700k', '8700k'] },
	{ name: 'Intel Core i7-6700K', ticker: 'INTC', rtp: 339, releaseDate: '2015-08-05', aliases: ['i7 6700k', '6700k'] },
	// AMD Ryzen
	{ name: 'AMD Ryzen 9 7950X', ticker: 'AMD', rtp: 699, releaseDate: '2022-09-27', aliases: ['7950x', 'ryzen 7950x'] },
	{ name: 'AMD Ryzen 9 5950X', ticker: 'AMD', rtp: 799, releaseDate: '2020-11-05', aliases: ['5950x', 'ryzen 5950x'] },
	{ name: 'AMD Ryzen 9 3900X', ticker: 'AMD', rtp: 499, releaseDate: '2019-07-07', aliases: ['3900x', 'ryzen 3900x'] },
	{ name: 'AMD Ryzen 7 2700X', ticker: 'AMD', rtp: 329, releaseDate: '2018-04-19', aliases: ['2700x', 'ryzen 2700x'] },
	{ name: 'AMD Ryzen 7 1800X', ticker: 'AMD', rtp: 499, releaseDate: '2017-03-02', aliases: ['1800x', 'ryzen 1800x'] },

	// --- PC Components: Memory (RAM) ---
	// DDR5
	{ name: 'DDR5 RAM 64GB', ticker: 'MU', rtp: 229, releaseDate: '2022-01-01', aliases: ['ddr5 64gb', '64gb ram'] },
	{ name: 'DDR5 RAM 32GB', ticker: 'MU', rtp: 129, releaseDate: '2022-01-01', aliases: ['ddr5 32gb', '32gb ram'] },
	{ name: 'DDR5 RAM 16GB', ticker: 'MU', rtp: 89, releaseDate: '2022-01-01', aliases: ['ddr5 16gb', '16gb ram'] },
	// DDR4
	{ name: 'DDR4 RAM 64GB', ticker: 'MU', rtp: 199, releaseDate: '2016-01-01', aliases: ['ddr4 64gb'] },
	{ name: 'DDR4 RAM 32GB', ticker: 'MU', rtp: 110, releaseDate: '2016-01-01', aliases: ['ddr4 32gb'] },
	{ name: 'DDR4 RAM 16GB', ticker: 'MU', rtp: 65, releaseDate: '2015-01-01', aliases: ['ddr4 16gb'] },
	{ name: 'DDR4 RAM 8GB', ticker: 'MU', rtp: 35, releaseDate: '2015-01-01', aliases: ['ddr4 8gb'] },
	// DDR3
	{ name: 'DDR3 RAM 32GB', ticker: 'MU', rtp: 140, releaseDate: '2012-01-01', aliases: ['ddr3 32gb'] },
	{ name: 'DDR3 RAM 16GB', ticker: 'MU', rtp: 75, releaseDate: '2011-01-01', aliases: ['ddr3 16gb'] },
	{ name: 'DDR3 RAM 8GB', ticker: 'MU', rtp: 45, releaseDate: '2010-01-01', aliases: ['ddr3 8gb'] },

	// --- PC Components: Other ---
	{ name: 'Mid-Tower Case', ticker: 'CRSR', rtp: 99, releaseDate: '2023-01-01', aliases: ['pc case', 'atx case', 'computer case', 'gaming case'] },
	{ name: 'Samsung 990 Pro 2TB', ticker: '005930.KS', rtp: 179, releaseDate: '2022-10-01', aliases: ['990 pro', 'samsung ssd', 'nvme ssd'] },
	{ name: 'Seagate Barracuda 4TB', ticker: 'STX', rtp: 89, releaseDate: '2017-01-01', aliases: ['hdd', 'hard drive'] },

	// --- Smart Home & IoT ---
	{ name: 'Nest Hub', ticker: 'GOOGL', rtp: 89, releaseDate: '2021-03-30', aliases: ['nest', 'google home', 'smart display'] },
	{ name: 'Fitbit Charge', ticker: 'GOOGL', rtp: 139, releaseDate: '2023-09-28', aliases: ['fitbit', 'activity tracker'] },
	{ name: 'Amazon Echo', ticker: 'AMZN', rtp: 89, releaseDate: '2020-10-22', aliases: ['alexa', 'echo', 'smart speaker'] },
	{ name: 'Kindle Paperwhite', ticker: 'AMZN', rtp: 149, releaseDate: '2021-10-27', aliases: ['kindle', 'ereader', 'ebook reader'] },
	{ name: 'Ring Doorbell', ticker: 'AMZN', rtp: 99, releaseDate: '2020-04-01', aliases: ['ring', 'video doorbell', 'smart doorbell'] },
	{ name: 'Philips Hue Starter Kit', ticker: 'PHG', rtp: 169, releaseDate: '2021-06-15', aliases: ['hue', 'smart lights', 'philips hue'] },
	{ name: 'iRobot Roomba', ticker: 'IRBT', rtp: 399, releaseDate: '2022-09-01', aliases: ['roomba', 'robot vacuum'] },

	// --- Audio & Wearables ---
	{ name: 'Sonos Arc', ticker: 'SONO', rtp: 899, releaseDate: '2020-06-10', aliases: ['sonos', 'soundbar', 'arc'] },
	{ name: 'Garmin Fenix', ticker: 'GRMN', rtp: 799, releaseDate: '2023-05-31', aliases: ['garmin', 'fenix', 'smartwatch', 'sportswatch'] },
	{ name: 'GoPro Hero 12', ticker: 'GPRO', rtp: 399, releaseDate: '2023-09-13', aliases: ['gopro', 'action cam', 'hero12'] },

	// --- Popular Tech/Misc ---
	{ name: 'Peloton Bike', ticker: 'PTON', rtp: 1445, releaseDate: '2020-09-09', aliases: ['peloton', 'exercise bike'] },

	// --- Monitors & Peripherals (Generic) ---
	{ name: '4K Monitor', ticker: 'DELL', rtp: 399, releaseDate: '2023-01-01', aliases: ['monitor', '4k monitor', '4kmonitor'] },
	{ name: 'Gaming Keyboard', ticker: 'LOGI', rtp: 149, releaseDate: '2023-01-01', aliases: ['keyboard', 'gaming keyboard', 'mechanical keyboard'] },
	{ name: 'Gaming Mouse', ticker: 'LOGI', rtp: 79, releaseDate: '2023-01-01', aliases: ['mouse', 'gaming mouse', 'wireless mouse'] },
	{ name: 'Streaming Stick', ticker: 'ROKU', rtp: 49, releaseDate: '2021-09-20', aliases: ['roku', 'firestick', 'streaming dongle'] },

	// --- Vehicles ---
	// Hyundai
	{ name: 'Hyundai i40 Estate', ticker: 'HYMLF', rtp: 28000, releaseDate: '2011-09-01', aliases: ['hyundai i40', 'i40 estate', 'i40 tourer', 'i40'] },

	// Honda
	{ name: 'Honda Civic 2014', ticker: 'HMC', rtp: 18390, releaseDate: '2014-01-08', aliases: ['civic 2014', '2014 civic', 'honda civic'] },

	// Toyota
	{ name: 'Toyota Camry', ticker: 'TM', rtp: 26420, releaseDate: '2023-11-01', aliases: ['camry', 'toyota camry'] },

	// Tesla (S3XY + Cybertruck)
	{ name: 'Tesla Model S', ticker: 'TSLA', rtp: 74990, releaseDate: '2012-06-22', aliases: ['model s', 'tesla model s'] },
	{ name: 'Tesla Model 3', ticker: 'TSLA', rtp: 38900, releaseDate: '2019-06-01', aliases: ['model 3', 'tesla model 3'] },
	{ name: 'Tesla Model X', ticker: 'TSLA', rtp: 79990, releaseDate: '2015-09-29', aliases: ['model x', 'tesla model x'] },
	{ name: 'Tesla Model Y', ticker: 'TSLA', rtp: 43990, releaseDate: '2020-03-13', aliases: ['model y', 'tesla model y'] },
	{ name: 'Tesla Cybertruck', ticker: 'TSLA', rtp: 79990, releaseDate: '2023-11-30', aliases: ['cybertruck', 'tesla cybertruck', 'cyber truck'] },

	// Ford
	{ name: 'Ford F-150', ticker: 'F', rtp: 36570, releaseDate: '2023-09-12', aliases: ['f150', 'ford f150', 'f-150'] },

	// --- Fallback/Generic ---
	{ name: 'Laptop', ticker: 'DELL', rtp: 999, releaseDate: '2023-01-01', aliases: ['laptop', 'computer', 'pc'] },
	{ name: 'Desktop PC', ticker: 'DELL', rtp: 1499, releaseDate: '2023-01-01', aliases: ['desktop', 'pc', 'desktop pc', 'gaming pc'] },
	{ name: 'Phone', ticker: 'AAPL', rtp: 799, releaseDate: '2024-09-20', aliases: ['phone', 'smartphone'] },

	// --- Audio: JBL Speakers ---
	{ name: 'JBL PartyBox Ultimate', ticker: '005930.KS', rtp: 999, releaseDate: '2023-08-31', aliases: ['partybox ultimate', 'jbl partybox', 'partybox', 'massive jbl speaker'] },
	{ name: 'JBL Flip 6', ticker: '005930.KS', rtp: 129, releaseDate: '2021-11-01', aliases: ['flip 6', 'jbl flip', 'small jbl speaker', 'flip6'] },

	// --- Kitchen Appliances ---
	// SharkNinja (SN) listed in 2023. Simulation will hold cash before then.
	{ name: 'Ninja Foodi Dual Zone Air Fryer', ticker: 'SN', rtp: 199, releaseDate: '2020-10-01', aliases: ['ninja air fryer', 'air fryer', 'dual zone air fryer', 'af300uk'] },
	// Alternative: Philips Air Fryer (Ticker PHG has much longer history)
	{ name: 'Philips Airfryer XXL', ticker: 'PHG', rtp: 299, releaseDate: '2017-11-01', aliases: ['philips air fryer', 'airfryer xxl'] },
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

	// Exact alias match
	const exactAlias = SUBSCRIPTION_TICKERS.find(
		(t) => t.aliases?.some(alias => alias.toLowerCase() === normalised)
	);
	if (exactAlias) return exactAlias.ticker;

	// Partial match (name contains or is contained)
	const partialMatch = SUBSCRIPTION_TICKERS.find(
		(t) =>
			t.name.toLowerCase().includes(normalised) ||
			normalised.includes(t.name.toLowerCase()) ||
			t.aliases?.some(alias => alias.toLowerCase().includes(normalised) || normalised.includes(alias.toLowerCase()))
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
	// Return all preset items in the database
	return PRODUCT_DATABASE;
}

export const HABIT_PRESETS: HabitMapping[] = [
	{ name: "Morning Coffee", ticker: "SBUX", defaultFrequency: "daily", defaultCost: 3.50 },
	{ name: "Big Mac Meal", ticker: "MCD", defaultFrequency: "weekly", defaultCost: 5.99 },
	{ name: "Food Delivery Orders", ticker: "UBER", defaultFrequency: "weekly", defaultCost: 25.00 },
	{ name: "Pack of Cigarettes", ticker: "BTI", defaultFrequency: "daily", defaultCost: 14.00 },
	{ name: "Vape / Nicotine Pods", ticker: "PM", defaultFrequency: "weekly", defaultCost: 10.00 },
	{ name: "Zyn's", ticker: "PM", defaultFrequency: "daily", defaultCost: 5.00 },
	{ name: "Pint of Beer", ticker: "BUD", defaultFrequency: "weekly", defaultCost: 6.00 },
	{ name: "Bottle of Wine", ticker: "DEO", defaultFrequency: "weekly", defaultCost: 12.00 },
	{ name: "Cannabis / CBD", ticker: "MO", defaultFrequency: "weekly", defaultCost: 40.00 },
	{ name: "Monster Energy", ticker: "MNST", defaultFrequency: "daily", defaultCost: 2.50 },
];

/**
 * Gets the preset habit data for the BuilderSlide.
 */
export function getHabitPresets(): HabitMapping[] {
	return HABIT_PRESETS;
}
