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

// Helper to reduce graph points for rendering performance
function downsample(data: any[], targetCount: number = 500) {
	if (data.length <= targetCount) return data;
	const step = Math.ceil(data.length / targetCount);
	return data.filter((_, i) => i % step === 0 || i === data.length - 1);
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

export function calculateComparison(
	items: SpendItem[],
	stockHistory: StockDataPoint[],
	userCurrency: string,
	currencyDataMap: Record<string, StockDataPoint[]> = {}
): SimulationResult {
	if (!items.length || !stockHistory.length) {
		return { totalSpent: 0, investmentValue: 0, currency: userCurrency, growthPercentage: 0, graphData: [] };
	}

	stockHistory.sort((a, b) => a.date.localeCompare(b.date));

	const earliestSpendDate = items.reduce((min, item) => item.startDate < min ? item.startDate : min, items[0].startDate);
	const lastDate = stockHistory[stockHistory.length - 1].date;
	const startDate = earliestSpendDate;

	let totalSpent = 0;
	let sharesOwned = 0;
	let cashHeld = 0;
	const graphData: Array<{ date: string; spent: number; value: number }> = [];

	const startParam = new Date(startDate);
	const endParam = new Date(lastDate);
	const oneDay = 24 * 60 * 60 * 1000;

	let historyIndex = 0;
	const currencyIndices: Record<string, number> = {};
	const currentRates: Record<string, number> = {};
	for (const pair of Object.keys(currencyDataMap)) {
		currencyIndices[pair] = 0;
		currentRates[pair] = 1;
	}

	for (let d = startParam.getTime(); d <= endParam.getTime(); d += oneDay) {
		const currentDate = new Date(d);
		const dateStr = currentDate.toISOString().split('T')[0];

		while (historyIndex < stockHistory.length - 1 && stockHistory[historyIndex + 1].date <= dateStr) {
			historyIndex++;
		}
		const currentPrice = stockHistory[historyIndex].date <= dateStr ? stockHistory[historyIndex].adjClose : 0;

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
					const pair = `${userCurrency}${item.currency}=X`;
					const rate = currentRates[pair];
					if (rate && rate > 0) {
						costInUserCurrency = item.cost / rate;
					}
				}

				totalSpent += costInUserCurrency;
				if (currentPrice > 0) {
					if (cashHeld > 0) {
						sharesOwned += cashHeld / currentPrice;
						cashHeld = 0;
					}
					sharesOwned += costInUserCurrency / currentPrice;
				} else {
					cashHeld += costInUserCurrency;
				}
			}
		}

		let currentValue = cashHeld + (currentPrice > 0 ? sharesOwned * currentPrice : 0);
		graphData.push({ date: dateStr, spent: totalSpent, value: currentValue });
	}

	return {
		totalSpent,
		investmentValue: graphData[graphData.length - 1]?.value || 0,
		currency: userCurrency,
		growthPercentage: totalSpent > 0 ? ((graphData[graphData.length - 1].value - totalSpent) / totalSpent) * 100 : 0,
		graphData: downsample(graphData)
	};
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
					const pair = `${userCurrency}${item.currency}=X`;
					const rate = currentRates[pair];
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