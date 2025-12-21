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
	KRW: 1700,
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
	const from = fromCurrency.toUpperCase();
	const to = toCurrency.toUpperCase();
	if (from === to) return 1.0;
	const fromRate = EXCHANGE_RATES[from];
	const toRate = EXCHANGE_RATES[to];
	if (!fromRate || !toRate) return 1.0;
	// Rates are expressed as: 1 GBP = EXCHANGE_RATES[currency]
	// Convert from 'from' to 'to': amount_in_to = amount_in_from * (toRate / fromRate)
	return toRate / fromRate;
}

/**
 * Converts an amount between arbitrary currencies using GBP-anchored rates.
 * @param amount - Source amount
 * @param fromCurrency - Source ISO code
 * @param toCurrency - Target ISO code
 */
export function convertBetween(amount: number, fromCurrency: string, toCurrency: string): number {
	const rate = getExchangeRate(fromCurrency, toCurrency);
	return Math.round(amount * rate * 100) / 100;
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
		KRW: '₩',
	};
	return symbols[currencyCode] ?? currencyCode;
}

/**
 * Formats a currency value with smart decimal handling.
 * Shows 2 decimal places if value has meaningful cents (e.g., £4.70).
 * Hides decimals if they are .00 (e.g., £5 instead of £5.00).
 * Uses getCurrencySymbol for proper symbols ($ not US$).
 * @param value - The numeric value to format
 * @param currencyCode - Currency code (e.g., 'GBP', 'USD', 'EUR')
 * @returns Formatted currency string (e.g., '£4.70' or '$5')
 */
export function formatCurrency(value: number, currencyCode: string): string {
	const symbol = getCurrencySymbol(currencyCode);

	// Round to 2 decimal places first to handle floating point issues
	const rounded = Math.round(value * 100) / 100;

	// Check if the value is a whole number (no meaningful cents)
	const isWholeNumber = rounded === Math.floor(rounded);

	if (isWholeNumber) {
		// No decimals needed
		return `${symbol}${Math.round(rounded).toLocaleString('en-GB')}`;
	} else {
		// Always show exactly 2 decimal places
		const [intPart, decPart] = rounded.toFixed(2).split('.');
		const formattedInt = parseInt(intPart).toLocaleString('en-GB');
		return `${symbol}${formattedInt}.${decPart}`;
	}
}
