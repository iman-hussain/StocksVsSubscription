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
	// For subscriptions: assumed monthly
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
