/**
 * Currency conversion utilities for product pricing.
 * Converts GBP (base currency) to other currencies.
 */

// Approximate exchange rates (as of Dec 2024)
// In a production app, these would be fetched from an API
const EXCHANGE_RATES: Record<string, number> = {
	GBP: 1.0,
	USD: 1.27,
	EUR: 0.92,
	CAD: 1.77,
	AUD: 1.95,
	JPY: 189.5,
};

/**
 * Converts a price from GBP to the specified currency.
 * @param priceGBP - Price in GBP
 * @param targetCurrency - Target currency code (e.g., 'USD', 'EUR')
 * @returns Price converted to target currency, rounded to 2 decimals
 */
export function convertPrice(priceGBP: number, targetCurrency: string): number {
	const rate = EXCHANGE_RATES[targetCurrency] ?? 1.0;
	return Math.round(priceGBP * rate * 100) / 100;
}

/**
 * Gets an exchange rate for a currency pair.
 * @param fromCurrency - Source currency (assumed GBP if not listed)
 * @param toCurrency - Target currency
 * @returns Exchange rate
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
	if (fromCurrency === toCurrency) return 1.0;
	if (fromCurrency !== 'GBP') return 1.0; // Only GBP conversions supported for now
	return EXCHANGE_RATES[toCurrency] ?? 1.0;
}

/**
 * Gets the currency symbol for a given currency code.
 * @param currencyCode - Currency code (e.g., 'GBP', 'USD', 'EUR')
 * @returns Currency symbol (e.g., '£', '$', '€')
 */
export function getCurrencySymbol(currencyCode: string): string {
	const symbols: Record<string, string> = {
		GBP: '£',
		USD: '$',
		EUR: '€',
		CAD: 'CA$',
		AUD: 'A$',
		JPY: '¥',
	};
	return symbols[currencyCode] ?? currencyCode;
}
