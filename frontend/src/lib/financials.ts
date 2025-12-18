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
	pricingPeriod?: 'monthly' | 'yearly';
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

// Helper to reduce graph points for rendering performance
// Recharts crashes if we try to render 20k+ points (e.g. 1963-2024)
function downsample(data: any[], targetCount: number = 500) {
	if (data.length <= targetCount) return data;
	const step = Math.ceil(data.length / targetCount);
	return data.filter((_, i) => i % step === 0 || i === data.length - 1);
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

	const earliestSpendDate = items.reduce((min, item) => {
		return item.startDate < min ? item.startDate : min;
	}, items[0].startDate);

	const lastDate = stockHistory[stockHistory.length - 1].date;
	const startDate = earliestSpendDate;

	let totalSpent = 0;
	let sharesOwned = 0;
	let cashHeld = 0;

	const graphData: Array<{ date: string; spent: number; value: number }> = [];

	const startParam = new Date(startDate);
	const endParam = new Date(lastDate);
	const oneDay = 24 * 60 * 60 * 1000;

	let currentPrice = 0;

	// OPTIMIZATION: Track index to avoid O(N^2) lookups
	let historyIndex = 0;

	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		// Forward-march the history index
		// We want the latest price where stockDate <= currentDate
		while(
			historyIndex < stockHistory.length - 1 &&
			stockHistory[historyIndex + 1].date <= dateStr
		) {
			historyIndex++;
		}

		// Check if we actually have a valid price for this date
		// (i.e. we are past the IPO date)
		if (stockHistory[historyIndex].date <= dateStr) {
			currentPrice = stockHistory[historyIndex].adjClose;
		}

		// Process Spending
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
				totalSpent += item.cost;
				if (currentPrice > 0) {
					if (cashHeld > 0) {
						sharesOwned += cashHeld / currentPrice;
						cashHeld = 0;
					}
					sharesOwned += item.cost / currentPrice;
				} else {
					cashHeld += item.cost;
				}
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

	return {
		totalSpent,
		investmentValue: graphData[graphData.length - 1]?.value || 0,
		currency: items[0]?.currency || 'GBP',
		growthPercentage: totalSpent > 0 ? ((graphData[graphData.length - 1].value - totalSpent) / totalSpent) * 100 : 0,
		graphData: downsample(graphData) // OPTIMIZATION: Reduce points
	};
}

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

	const sharesPerTicker: Record<string, number> = {};
	const cashPerTicker: Record<string, number> = {};
	const currentPricePerTicker: Record<string, number> = {};

	// OPTIMIZATION: Track index per ticker
	const historyIndices: Record<string, number> = {};

	for (const item of items) {
		if (!sharesPerTicker[item.ticker]) {
			sharesPerTicker[item.ticker] = 0;
			cashPerTicker[item.ticker] = 0;
			currentPricePerTicker[item.ticker] = 0;
			historyIndices[item.ticker] = 0;
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

		// Update prices for all tickers using optimized index
		for (const ticker of Object.keys(stockDataMap)) {
			const history = stockDataMap[ticker];
			if (!history || history.length === 0) continue;

			// Advance index
			while(
				historyIndices[ticker] < history.length - 1 &&
				history[historyIndices[ticker] + 1].date <= dateStr
			) {
				historyIndices[ticker]++;
			}

			// Get price if valid
			const currentIndex = historyIndices[ticker];
			if (history[currentIndex].date <= dateStr) {
				const price = history[currentIndex].adjClose;
				currentPricePerTicker[ticker] = price;

				if (cashPerTicker[ticker] > 0) {
					sharesPerTicker[ticker] += cashPerTicker[ticker] / price;
					cashPerTicker[ticker] = 0;
				}
			}
		}

		// Process spending
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
		graphData: downsample(graphData) // OPTIMIZATION: Reduce points
	};
}

export function calculateIndividualComparison(
	item: SpendItem,
	stockHistory: StockDataPoint[]
): SimulationResult {
	// Re-use logic or simplify?
	// For simplicity and optimization consistency, we can just wrap the single logic
	// But let's copy the optimized logic for single item to ensure it's fast too.

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

	let historyIndex = 0;

	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		// Optimized price lookup
		while(
			historyIndex < stockHistory.length - 1 &&
			stockHistory[historyIndex + 1].date <= dateStr
		) {
			historyIndex++;
		}

		let currentPrice = 0;
		if (stockHistory[historyIndex].date <= dateStr) {
			currentPrice = stockHistory[historyIndex].adjClose;
		}

		if (currentPrice > 0 && cashHeld > 0) {
			sharesOwned += cashHeld / currentPrice;
			cashHeld = 0;
		}

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
		graphData: downsample(graphData) // OPTIMIZATION: Reduce points
	};
}