/**
 * Ported from frontend/src/lib/financials.ts
 * Handled by the backend for Two-Layer Caching strategy.
 */

export interface StockDataPoint {
	date: string; // YYYY-MM-DD
	adjClose: number;
}

export type SpendFrequency = 'one-off' | 'daily' | 'workdays' | 'weekly' | 'monthly' | 'yearly';

export interface SpendItem {
	id: string;
	name: string;
	cost: number;
	currency: string;
	frequency: SpendFrequency;
	startDate: string; // YYYY-MM-DD
	ticker: string; // Stock ticker to compare against
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

/**
 * Re-implementation of getExchangeTicker for backend.
 * Pattern: BASEQUOTE=X (e.g. GBPUSD=X)
 */
export function getExchangeTicker(base: string, target: string): string | null {
	if (base === target) return null;
	return `${base}${target}=X`.toUpperCase();
}

/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm
 * Preserves visual peaks and troughs better than simple decimation.
 */
function largestTriangleThreeBuckets(data: any[], threshold: number): any[] {
	const dataLength = data.length;
	if (threshold >= dataLength || threshold === 0) {
		return data;
	}

	const sampled: any[] = [];
	let sampledIndex = 0;

	// Bucket size. Leave room for start and end data points
	const every = (dataLength - 2) / (threshold - 2);

	let a = 0;
	let maxAreaPoint: any;
	let nextA = 0;

	sampled[sampledIndex++] = data[a]; // Always add the first point

	for (let i = 0; i < threshold - 2; i++) {
		// Calculate point average for next bucket (containing c)
		let avgX = 0;
		let avgY = 0;
		let avgRangeStart = Math.floor((i + 1) * every) + 1;
		let avgRangeEnd = Math.floor((i + 2) * every) + 1;
		avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

		const avgRangeLength = avgRangeEnd - avgRangeStart;

		for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
			avgX += avgRangeStart; // Using index as X for simplicity as dates are monotonic
			avgY += data[avgRangeStart].value;
		}
		avgX /= avgRangeLength;
		avgY /= avgRangeLength;

		// Get the range for this bucket
		let rangeOffs = Math.floor((i + 0) * every) + 1;
		const rangeTo = Math.floor((i + 1) * every) + 1;

		// Point a
		const pointAX = a; // Index as X
		const pointAY = data[a].value;

		let maxArea = -1;

		for (; rangeOffs < rangeTo; rangeOffs++) {
			// Calculate triangle area over three buckets
			const area = Math.abs(
				(pointAX - avgX) * (data[rangeOffs].value - pointAY) -
				(pointAX - rangeOffs) * (avgY - pointAY)
			) * 0.5;

			if (area > maxArea) {
				maxArea = area;
				maxAreaPoint = data[rangeOffs];
				nextA = rangeOffs;
			}
		}

		sampled[sampledIndex++] = maxAreaPoint;
		a = nextA;
	}

	sampled[sampledIndex++] = data[dataLength - 1]; // Always add the last point

	return sampled;
}

/**
 * Helper to reduce graph points for rendering performance
 * Uses LTTB for better visual preservation.
 */
export function downsample(data: any[], targetCount: number = 500) {
	return largestTriangleThreeBuckets(data, targetCount);
}

function isPaymentDay(item: SpendItem, currentDate: Date, dateStr: string): boolean {
	const itemStart = new Date(item.startDate);

	if (currentDate.getTime() < itemStart.getTime()) {
		return false;
	}

	const curYear = currentDate.getFullYear();
	const curMonth = currentDate.getMonth();
	const curDay = currentDate.getDate();

	const startMonth = itemStart.getMonth();
	const startDay = itemStart.getDate();

	switch (item.frequency) {
		case 'one-off':
			return item.startDate === dateStr;
		case 'daily':
			return true;
		case 'workdays': {
			const dayOfWeek = currentDate.getDay();
			return dayOfWeek >= 1 && dayOfWeek <= 5;
		}
		case 'weekly':
			return currentDate.getDay() === itemStart.getDay();
		case 'monthly': {
			const lastDayOfMonth = new Date(curYear, curMonth + 1, 0).getDate();
			const targetDay = Math.min(startDay, lastDayOfMonth);
			return curDay === targetDay;
		}
		case 'yearly': {
			if (startMonth === 1 && startDay === 29) {
				const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
				if (!isLeapYear(curYear)) {
					return curMonth === 1 && curDay === 28;
				}
			}
			return curMonth === startMonth && curDay === startDay;
		}
		default:
			return false;
	}
}

export function calculateMultiStockComparison(
	items: SpendItem[],
	stockDataMap: Record<string, StockDataPoint[]>,
	userCurrency: string,
	currencyDataMap: Record<string, StockDataPoint[]> = {}
): SimulationResult {
	if (!items.length) {
		return { totalSpent: 0, investmentValue: 0, currency: userCurrency, growthPercentage: 0, graphData: [] };
	}

	for (const ticker of Object.keys(stockDataMap)) {
		stockDataMap[ticker].sort((a, b) => a.date.localeCompare(b.date));
	}

	const earliestSpendDate = items.reduce((min, item) => item.startDate < min ? item.startDate : min, items[0].startDate);
	let latestHistoryDate = earliestSpendDate;
	for (const history of Object.values(stockDataMap)) {
		if (history.length > 0) {
			const lastDate = history[history.length - 1].date;
			if (lastDate > latestHistoryDate) latestHistoryDate = lastDate;
		}
	}

	const sharesPerTicker: Record<string, number> = {};
	const cashPerTicker: Record<string, number> = {};
	const currentPricePerTicker: Record<string, number> = {};
	const historyIndices: Record<string, number> = {};
	const currencyIndices: Record<string, number> = {};
	const currentRates: Record<string, number> = {};

	for (const item of items) {
		if (!sharesPerTicker[item.ticker]) {
			sharesPerTicker[item.ticker] = 0;
			cashPerTicker[item.ticker] = 0;
			currentPricePerTicker[item.ticker] = 0;
			historyIndices[item.ticker] = 0;
		}
	}
	for (const pair of Object.keys(currencyDataMap)) {
		currencyIndices[pair] = 0;
		currentRates[pair] = 1;
	}

	let totalSpent = 0;
	const graphData: Array<{ date: string; spent: number; value: number }> = [];
	const startParam = new Date(earliestSpendDate);
	const endParam = new Date(latestHistoryDate);
	const oneDay = 24 * 60 * 60 * 1000;

	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		for (const ticker of Object.keys(stockDataMap)) {
			const history = stockDataMap[ticker];
			if (!history.length) continue;
			while (historyIndices[ticker] < history.length - 1 && history[historyIndices[ticker] + 1].date <= dateStr) {
				historyIndices[ticker]++;
			}
			if (history[historyIndices[ticker]].date <= dateStr) {
				const price = history[historyIndices[ticker]].adjClose;
				currentPricePerTicker[ticker] = price;
				if (cashPerTicker[ticker] > 0) {
					sharesPerTicker[ticker] += cashPerTicker[ticker] / price;
					cashPerTicker[ticker] = 0;
				}
			}
		}

		for (const pair of Object.keys(currencyDataMap)) {
			const history = currencyDataMap[pair];
			while (currencyIndices[pair] < history.length - 1 && history[currencyIndices[pair] + 1].date <= dateStr) {
				currencyIndices[pair]++;
			}
			if (history[currencyIndices[pair]].date <= dateStr) {
				currentRates[pair] = history[currencyIndices[pair]].adjClose;
			}
		}

		for (const item of items) {
			if (isPaymentDay(item, currentDate, dateStr)) {
				let costInUserCurrency = item.cost;
				if (item.currency !== userCurrency) {
					const pair = getExchangeTicker(userCurrency, item.currency);
					const rate = pair ? currentRates[pair] : 1;
					if (rate && rate > 0) {
						costInUserCurrency = item.cost / rate;
					}
				}
				totalSpent += costInUserCurrency;
				const ticker = item.ticker;
				const price = currentPricePerTicker[ticker];
				if (price > 0) {
					sharesPerTicker[ticker] += costInUserCurrency / price;
				} else {
					cashPerTicker[ticker] += costInUserCurrency;
				}
			}
		}

		let totalValue = 0;
		for (const ticker of Object.keys(sharesPerTicker)) {
			totalValue += (sharesPerTicker[ticker] * (currentPricePerTicker[ticker] || 0)) + cashPerTicker[ticker];
		}

		graphData.push({ date: dateStr, spent: totalSpent, value: totalValue });
	}

	const finalValue = graphData.length > 0 ? graphData[graphData.length - 1].value : 0;
	return {
		totalSpent,
		investmentValue: finalValue,
		currency: userCurrency,
		growthPercentage: totalSpent > 0 ? ((finalValue - totalSpent) / totalSpent) * 100 : 0,
		graphData: downsample(graphData)
	};
}

export function calculateIndividualComparison(
	item: SpendItem,
	stockHistory: StockDataPoint[],
	userCurrency: string,
	currencyHistory: StockDataPoint[] = []
): SimulationResult {
	if (!stockHistory.length) {
		return { totalSpent: 0, investmentValue: 0, currency: userCurrency, growthPercentage: 0, graphData: [] };
	}

	stockHistory.sort((a, b) => a.date.localeCompare(b.date));
	const lastDate = stockHistory[stockHistory.length - 1].date;
	let totalSpent = 0;
	let sharesOwned = 0;
	let cashHeld = 0;
	const graphData: Array<{ date: string; spent: number; value: number }> = [];

	const startParam = new Date(item.startDate);
	const endParam = new Date(lastDate);
	const oneDay = 24 * 60 * 60 * 1000;

	let historyIndex = 0;
	let currencyIndex = 0;
	let currentRate = 1;

	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		while (historyIndex < stockHistory.length - 1 && stockHistory[historyIndex + 1].date <= dateStr) {
			historyIndex++;
		}
		const currentPrice = stockHistory[historyIndex].date <= dateStr ? stockHistory[historyIndex].adjClose : 0;

		if (item.currency !== userCurrency && currencyHistory.length > 0) {
			while (currencyIndex < currencyHistory.length - 1 && currencyHistory[currencyIndex + 1].date <= dateStr) {
				currencyIndex++;
			}
			if (currencyHistory[currencyIndex].date <= dateStr) {
				currentRate = currencyHistory[currencyIndex].adjClose;
			}
		}

		if (currentPrice > 0 && cashHeld > 0) {
			sharesOwned += cashHeld / currentPrice;
			cashHeld = 0;
		}

		if (isPaymentDay(item, currentDate, dateStr)) {
			let costInUserCurrency = item.cost;
			if (item.currency !== userCurrency && currentRate > 0) {
				costInUserCurrency = item.cost / currentRate;
			}
			totalSpent += costInUserCurrency;
			if (currentPrice > 0) {
				sharesOwned += costInUserCurrency / currentPrice;
			} else {
				cashHeld += costInUserCurrency;
			}
		}

		let currentValue = cashHeld + (currentPrice > 0 ? sharesOwned * currentPrice : 0);
		graphData.push({ date: dateStr, spent: totalSpent, value: currentValue });
	}

	const finalValue = graphData.length > 0 ? graphData[graphData.length - 1].value : 0;
	return {
		totalSpent,
		investmentValue: finalValue,
		currency: userCurrency,
		growthPercentage: totalSpent > 0 ? ((finalValue - totalSpent) / totalSpent) * 100 : 0,
		graphData: downsample(graphData)
	};
}
