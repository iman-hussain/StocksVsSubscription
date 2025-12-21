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

export async function simulateBasket(basket: SpendItem[], userCurrency: string): Promise<SimulationAPIResponse> {
	const apiBase = (import.meta as any).env?.VITE_API_URL || '';
	const res = await fetch(`${apiBase}/api/simulate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ basket, userCurrency }),
	});

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new Error(errorData.error || `Simulation failed (${res.status})`);
	}

	return res.json();
}
