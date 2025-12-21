/**
 * Type definitions for ticker mappings.
 * Data is now fetched from the backend /api/presets endpoint.
 */

import type { SpendFrequency } from './financials';

export interface TickerMapping {
	name: string;
	ticker: string;
	defaultCost: number; // Default monthly cost in GBP
	aliases?: string[]; // Optional alternative names for matching
	category?: string; // Optional category for grouping
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

/**
 * API response type for the /api/presets endpoint.
 */
export interface PresetsResponse {
	subscriptions: TickerMapping[];
	products: ProductMapping[];
	habits: HabitMapping[];
}

/**
 * Fetches preset data from the backend API.
 * Includes browser-level caching for efficiency.
 */
export async function fetchPresets(): Promise<PresetsResponse> {
	const apiUrl = import.meta.env.VITE_API_URL || '';
	const res = await fetch(`${apiUrl}/api/presets`);
	if (!res.ok) {
		throw new Error(`Failed to fetch presets: ${res.status}`);
	}
	return res.json();
}

/**
 * Legacy helper functions - now delegate to API data or provide fallback.
 * These are kept for backward compatibility during transition.
 */

// Default fallback ticker for items not found
const DEFAULT_FALLBACK_TICKER = 'SPY';

/**
 * Attempts to resolve a ticker from a name using provided preset data.
 * Falls back to 'SPY' if no match found.
 */
export function resolveTicker(name: string, subscriptions: TickerMapping[] = []): string {
	const normalised = name.toLowerCase().trim();

	// Exact match first
	const exactMatch = subscriptions.find(
		(t) => t.name.toLowerCase() === normalised
	);
	if (exactMatch) return exactMatch.ticker;

	// Exact alias match
	const exactAlias = subscriptions.find(
		(t) => t.aliases?.some(alias => alias.toLowerCase() === normalised)
	);
	if (exactAlias) return exactAlias.ticker;

	// Partial match (name contains or is contained)
	const partialMatch = subscriptions.find(
		(t) =>
			t.name.toLowerCase().includes(normalised) ||
			normalised.includes(t.name.toLowerCase()) ||
			t.aliases?.some(alias => alias.toLowerCase().includes(normalised) || normalised.includes(alias.toLowerCase()))
	);
	if (partialMatch) return partialMatch.ticker;

	// Default fallback to S&P 500 ETF
	return DEFAULT_FALLBACK_TICKER;
}

/**
 * Resolves a product name to its database entry with ticker and RTP.
 * Uses fuzzy matching to find the best match.
 */
export function resolveProduct(name: string, products: ProductMapping[] = []): ProductMapping | null {
	const normalised = name.toLowerCase().trim();

	// Exact match first
	const exactMatch = products.find(
		(p) => p.name.toLowerCase() === normalised
	);
	if (exactMatch) return exactMatch;

	// Check aliases
	for (const product of products) {
		if (product.aliases.some(alias => alias === normalised)) {
			return product;
		}
	}

	// Fuzzy match: check if any product name/alias is contained in input or vice versa
	for (const product of products) {
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
