export interface StockDataPoint {
	date: string; // YYYY-MM-DD
	adjClose: number;
}

export interface SpendItem {
	id: string;
	name: string;
	cost: number;
	currency: string;
	type: 'subscription' | 'one-off';
	startDate: string; // YYYY-MM-DD
	ticker: string; // Stock ticker to compare against
	// For subscriptions: cost is in the selected period (monthly or yearly)
	pricingPeriod?: 'monthly' | 'yearly'; // For subscriptions; defaults to 'monthly'
}

export interface SimulationResult {
	totalSpent: number;
	investmentValue: number;
	currency: string;
	growthPercentage: number;
	graphData: Array<{
		date: string;
		spent: number;
		value: number;
	}>;
}

// Helper to find closest price (backward lookup / fill-forward)
function getPriceOnDate(dateStr: string, history: StockDataPoint[]): number | null {
	// Assuming history is sorted ascending by date
	// Find index of date
	// optimize: history is usually 5000+ items.
	// Linear search from end might be slow if random access, but here we iterate forward usually.
	// For random access:

	// Simple approach: find exact match, or use closest previous.
	// history is sorted by date? Yahoo returns sorted. We should ensure it.

	const targetDate = new Date(dateStr).getTime();

	// Iterate backwards?
	for (let i = history.length - 1; i >= 0; i--) {
		const hDate = new Date(history[i].date).getTime();
		if (hDate <= targetDate) {
			return history[i].adjClose;
		}
	}
	return null; // Date is before history starts
}

export function calculateComparison(
	items: SpendItem[],
	stockHistory: StockDataPoint[]
): SimulationResult {
	if (!items.length || !stockHistory.length) {
		return {
			totalSpent: 0,
			investmentValue: 0,
			currency: items[0]?.currency || 'GBP',
			growthPercentage: 0,
			graphData: []
		};
	}

	// Ensure history is sorted asc
	stockHistory.sort((a, b) => a.date.localeCompare(b.date));

	// Determine simulation start date (earliest spend or start of history)
	// We start from the earliest spend item.
	// If spend item is before history, we hold cash until history starts.

	const earliestSpendDate = items.reduce((min, item) => {
		return item.startDate < min ? item.startDate : min;
	}, items[0].startDate);

	// We simulation should run from earliestSpendDate to Today (or last history date).
	const lastDate = stockHistory[stockHistory.length - 1].date;
	const startDate = earliestSpendDate;

	let totalSpent = 0;
	let sharesOwned = 0;
	let cashHeld = 0; // Pre-IPO cash

	const graphData: Array<{ date: string; spent: number; value: number }> = [];

	// Create a timeline of events?
	// Or iterate days? Iterating days is cleaner for "burning" animation data.

	const startParam = new Date(startDate);
	const endParam = new Date(lastDate);
	const oneDay = 24 * 60 * 60 * 1000;

	// We can step daily.
	// Optimization: If many years, daily loop is ~365*10 = 3650 iterations. Trivial for JS.

	let currentPrice = 0;

	// Find IPO Date (first history date)


	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		// Update Current Price (Fill Forward)
		// We can maintain an index in history to avoid repeatedly searching
		// But getPriceOnDate usage effectively fill-forwards if proper.
		// Optimization: track history index
		const price = getPriceOnDate(dateStr, stockHistory);
		// Note: getPriceOnDate as implemented scans.
		// Let's rely on the fact that we move forward.

		if (price) currentPrice = price;

		// Process Spending
		for (const item of items) {
			// Check if today is a payment day
			let isPaymentDay = false;

			if (item.type === 'one-off') {
				isPaymentDay = (item.startDate === dateStr);
			} else {
				// Monthly subscription
				// Check if day of month matches
				// Be careful with days > 28
				const itemStart = new Date(item.startDate);
				if (currentDate.getTime() >= itemStart.getTime()) {
					// Check if day of month matches
					// AND it's not the same day as start if we want to include start
					// Simple logic: If (CurrentMonth != LastPaidMonth) and Day >= StartDay...
					// Better: Iterate months from start.
					// Current approach: Check if (Current Day - Start Day) % AverageMonth == 0? No.

					// Strict date matching:
					// 1. Current Date >= Item Start Date
					// 2. currentDate.getDate() === itemStart.getDate() ?
					// Problem: Feb 28 vs 30.

					// Let's assume 28-day cycle or actual calendar months?
					// "Recurring Subscriptions" usually charge same day each month.
					if (currentDate.getDate() === itemStart.getDate()) {
						isPaymentDay = true;
					}
					// Edge case: itemStart is 31st, current month has 30 days -> payment on 30th?
					// Ignored for MVP complexity.
				}
			}

			if (isPaymentDay) {
				totalSpent += item.cost;
				// Invest
				if (currentPrice > 0) {
					// Buy stock
					// Use cashHeld if any and buy bulk
					if (cashHeld > 0) {
						sharesOwned += cashHeld / currentPrice;
						cashHeld = 0;
					}
					sharesOwned += item.cost / currentPrice;
				} else {
					// Pre-IPO or Missing Data
					cashHeld += item.cost;
				}
			}
		}

		// Calculate Portfolio Value
		// If we have price, value = shares * price + cash.
		// If no price (pre-IPO), value = cash.

		let currentValue = cashHeld;
		if (currentPrice > 0) {
			currentValue += sharesOwned * currentPrice;
		}

		// Only push data points periodically or all?
		// Push all for smooth graph.
		graphData.push({
			date: dateStr,
			spent: totalSpent,
			value: currentValue
		});
	}

	return {
		totalSpent,
		investmentValue: graphData[graphData.length - 1].value,
		currency: items[0]?.currency || 'GBP',
		growthPercentage: totalSpent > 0 ? ((graphData[graphData.length - 1].value - totalSpent) / totalSpent) * 100 : 0,
		graphData
	};
}

/**
 * Calculate comparison across multiple stocks.
 * Each item in the basket is compared against its own ticker.
 */
export function calculateMultiStockComparison(
	items: SpendItem[],
	stockDataMap: Record<string, StockDataPoint[]>
): SimulationResult {
	if (!items.length) {
		return {
			totalSpent: 0,
			investmentValue: 0,
			currency: 'GBP',
			growthPercentage: 0,
			graphData: []
		};
	}

	// Sort all histories
	for (const ticker of Object.keys(stockDataMap)) {
		stockDataMap[ticker].sort((a, b) => a.date.localeCompare(b.date));
	}

	// Find date range across all histories and items
	const earliestSpendDate = items.reduce((min, item) => {
		return item.startDate < min ? item.startDate : min;
	}, items[0].startDate);

	let latestHistoryDate = earliestSpendDate;
	for (const history of Object.values(stockDataMap)) {
		if (history.length > 0) {
			const lastDate = history[history.length - 1].date;
			if (lastDate > latestHistoryDate) {
				latestHistoryDate = lastDate;
			}
		}
	}

	// Track shares owned per ticker
	const sharesPerTicker: Record<string, number> = {};
	const cashPerTicker: Record<string, number> = {}; // Pre-IPO cash waiting
	const currentPricePerTicker: Record<string, number> = {};

	// Initialise
	for (const item of items) {
		if (!sharesPerTicker[item.ticker]) {
			sharesPerTicker[item.ticker] = 0;
			cashPerTicker[item.ticker] = 0;
			currentPricePerTicker[item.ticker] = 0;
		}
	}

	let totalSpent = 0;
	const graphData: Array<{ date: string; spent: number; value: number }> = [];

	const startParam = new Date(earliestSpendDate);
	const endParam = new Date(latestHistoryDate);
	const oneDay = 24 * 60 * 60 * 1000;

	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		// Update prices for all tickers
		for (const ticker of Object.keys(stockDataMap)) {
			const price = getPriceOnDate(dateStr, stockDataMap[ticker]);
			if (price) {
				currentPricePerTicker[ticker] = price;

				// Convert any waiting cash to shares
				if (cashPerTicker[ticker] > 0) {
					sharesPerTicker[ticker] += cashPerTicker[ticker] / price;
					cashPerTicker[ticker] = 0;
				}
			}
		}

		// Process spending for each item
		for (const item of items) {
			let isPaymentDay = false;

			if (item.type === 'one-off') {
				isPaymentDay = (item.startDate === dateStr);
			} else {
				const itemStart = new Date(item.startDate);
				if (currentDate.getTime() >= itemStart.getTime()) {
					if (currentDate.getDate() === itemStart.getDate()) {
						isPaymentDay = true;
					}
				}
			}

			if (isPaymentDay) {
				// Convert yearly to monthly if needed
				const costForPeriod = item.pricingPeriod === 'yearly' ? item.cost / 12 : item.cost;
				totalSpent += costForPeriod;
				const ticker = item.ticker;
				const price = currentPricePerTicker[ticker];

				if (price > 0) {
					sharesPerTicker[ticker] += costForPeriod / price;
				} else {
					cashPerTicker[ticker] += costForPeriod;
				}
			}
		}

		// Calculate total portfolio value
		let totalValue = 0;
		for (const ticker of Object.keys(sharesPerTicker)) {
			const shares = sharesPerTicker[ticker];
			const cash = cashPerTicker[ticker];
			const price = currentPricePerTicker[ticker] || 0;
			totalValue += (shares * price) + cash;
		}

		graphData.push({
			date: dateStr,
			spent: totalSpent,
			value: totalValue
		});
	}

	const finalValue = graphData.length > 0 ? graphData[graphData.length - 1].value : 0;

	return {
		totalSpent,
		investmentValue: finalValue,
		currency: items[0]?.currency || 'GBP',
		growthPercentage: totalSpent > 0 ? ((finalValue - totalSpent) / totalSpent) * 100 : 0,
		graphData
	};
}

/**
 * Calculate individual item comparison (one item vs its ticker).
 */
export function calculateIndividualComparison(
	item: SpendItem,
	stockHistory: StockDataPoint[]
): SimulationResult {
	if (!stockHistory.length) {
		return {
			totalSpent: 0,
			investmentValue: 0,
			currency: item.currency,
			growthPercentage: 0,
			graphData: []
		};
	}

	stockHistory.sort((a, b) => a.date.localeCompare(b.date));

	const startDate = item.startDate;
	const lastDate = stockHistory[stockHistory.length - 1].date;

	let totalSpent = 0;
	let sharesOwned = 0;
	let cashHeld = 0;
	const graphData: Array<{ date: string; spent: number; value: number }> = [];

	const startParam = new Date(startDate);
	const endParam = new Date(lastDate);
	const oneDay = 24 * 60 * 60 * 1000;

	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		const currentPrice = getPriceOnDate(dateStr, stockHistory) || 0;

		// Convert cash to shares if price available
		if (currentPrice > 0 && cashHeld > 0) {
			sharesOwned += cashHeld / currentPrice;
			cashHeld = 0;
		}

		// Check if payment day for this item
		let isPaymentDay = false;
		if (item.type === 'one-off') {
			isPaymentDay = (item.startDate === dateStr);
		} else {
			const itemStart = new Date(item.startDate);
			if (currentDate.getTime() >= itemStart.getTime() && currentDate.getDate() === itemStart.getDate()) {
				isPaymentDay = true;
			}
		}

		if (isPaymentDay) {
			const costForPeriod = item.pricingPeriod === 'yearly' ? item.cost / 12 : item.cost;
			totalSpent += costForPeriod;

			if (currentPrice > 0) {
				sharesOwned += costForPeriod / currentPrice;
			} else {
				cashHeld += costForPeriod;
			}
		}

		let currentValue = cashHeld;
		if (currentPrice > 0) {
			currentValue += sharesOwned * currentPrice;
		}

		graphData.push({
			date: dateStr,
			spent: totalSpent,
			value: currentValue
		});
	}

	const finalValue = graphData.length > 0 ? graphData[graphData.length - 1].value : 0;

	return {
		totalSpent,
		investmentValue: finalValue,
		currency: item.currency,
		growthPercentage: totalSpent > 0 ? ((finalValue - totalSpent) / totalSpent) * 100 : 0,
		graphData
	};
}
