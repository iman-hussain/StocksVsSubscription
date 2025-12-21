/**
 * Centralized currency exchange ticker logic.
 *
 * This module encapsulates all currency pair symbol construction,
 * making the codebase provider-agnostic. If we switch from Yahoo Finance
 * to another data provider, only this file needs to change.
 */

/**
 * Gets the exchange ticker symbol for a currency pair.
 * Uses Yahoo Finance format: BASEQUOTE=X (e.g., GBPUSD=X)
 *
 * @param base - Base currency code (e.g., 'GBP')
 * @param target - Target currency code (e.g., 'USD')
 * @returns Exchange ticker string, or null if base === target (no conversion needed)
 *
 * @example
 * getExchangeTicker('GBP', 'USD') // Returns 'GBPUSD=X'
 * getExchangeTicker('USD', 'USD') // Returns null (same currency)
 * getExchangeTicker('EUR', 'GBP') // Returns 'EURGBP=X'
 */
export function getExchangeTicker(base: string, target: string): string | null {
	if (base === target) {
		return null;
	}
	return `${base}${target}=X`;
}

/**
 * Extracts unique currency pairs from a list of items that need conversion.
 *
 * @param items - Array of objects with a 'currency' property
 * @param userCurrency - The user's base currency
 * @returns Set of exchange ticker strings for items needing conversion
 *
 * @example
 * const items = [{ currency: 'USD' }, { currency: 'GBP' }, { currency: 'USD' }];
 * getRequiredCurrencyPairs(items, 'GBP') // Returns Set(['GBPUSD=X'])
 */
export function getRequiredCurrencyPairs(
	items: Array<{ currency: string }>,
	userCurrency: string
): Set<string> {
	const pairs = new Set<string>();
	for (const item of items) {
		const ticker = getExchangeTicker(userCurrency, item.currency);
		if (ticker) {
			pairs.add(ticker);
		}
	}
	return pairs;
}
