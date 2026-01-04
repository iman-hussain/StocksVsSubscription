import type { SpendItem, SimulationResult } from './financials';

export interface ResolveCandidate {
	symbol: string;
	shortName?: string;
	longName?: string;
	exchange?: string;
	currency?: string;
	quoteType?: string;
	score: number;
}

export interface ResolveResponse {
	query: string;
	best: ResolveCandidate | null;
	candidates: ResolveCandidate[];
}

interface ResolveOptions {
	preferred?: string[];
	currency?: string;
	limit?: number;
	purchase?: boolean;
}

export async function resolveQuery(q: string, opts: ResolveOptions = {}): Promise<ResolveResponse> {
	const apiBase = (import.meta as any).env?.VITE_API_URL || '';
	const params = new URLSearchParams();
	params.set('q', q);
	if (opts.preferred && opts.preferred.length) params.set('preferred', opts.preferred.join(','));
	if (opts.currency) params.set('currency', opts.currency);
	if (opts.limit) params.set('limit', String(opts.limit));

	const path = opts.purchase ? '/api/resolve/purchase' : '/api/resolve';
	const res = await fetch(`${apiBase}${path}?${params.toString()}`);
	if (!res.ok) {
		throw new Error(`Resolve request failed (${res.status})`);
	}
	const data = await res.json();
	if (data?.error) {
		throw new Error(data.error);
	}
	return data as ResolveResponse;
}

export interface SimulationAPIResponse {
	result: SimulationResult;
	itemResults: Record<string, SimulationResult>;
}

export async function simulateBasket(
	basket: SpendItem[],
	userCurrency: string,
	signal?: AbortSignal
): Promise<SimulationAPIResponse> {
	const apiBase = (import.meta as any).env?.VITE_API_URL || '';
	const res = await fetch(`${apiBase}/api/simulate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ basket, userCurrency }),
		signal,
	});

	if (!res.ok) {
		let errorMessage = `Simulation failed (${res.status})`;

		// Handle specific HTTP status codes with user-friendly messages
		if (res.status === 429) {
			errorMessage = 'Too many requests. Please wait a moment and try again.';
		} else if (res.status === 400) {
			errorMessage = 'Invalid request data. Please check your items and try again.';
		} else if (res.status >= 500) {
			errorMessage = 'Server error. Our data provider may be temporarily unavailable.';
		}

		// Try to get more details from the response body
		try {
			const errorData = await res.json();
			if (errorData.error) {
				errorMessage = errorData.error;
			}
			if (errorData.details) {
				errorMessage += ` (${errorData.details})`;
			}
		} catch {
			// Response body wasn't JSON, use the default message
		}

		throw new Error(errorMessage);
	}

	return res.json();
}
