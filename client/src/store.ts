import { create } from 'zustand';
import type { SpendItem } from './lib/financials';

interface AppState {
	country: string;
	currency: string;
	mode: 'recurring' | 'one-off' | null; // 'recurring' maps to subscriptions
	basket: SpendItem[];
	comparisonStock: string; // Ticker symbol

	// Actions
	setCountry: (country: string, currency: string) => void;
	setMode: (mode: 'recurring' | 'one-off') => void;
	addToBasket: (item: Omit<SpendItem, 'id' | 'type'>) => void;
	removeFromBasket: (id: string) => void;
	setComparisonStock: (symbol: string) => void;
	resetBasket: () => void;
}

export const useStore = create<AppState>((set) => ({
	country: 'UK',
	currency: 'GBP',
	mode: null,
	basket: [],
	comparisonStock: 'SPY', // Default to S&P 500 equivalent if not specified

	setCountry: (country, currency) => set({ country, currency }),
	setMode: (mode) => set({ mode }),

	addToBasket: (item) => set((state) => {
		const newItem: SpendItem = {
			...item,
			id: crypto.randomUUID(),
			type: state.mode === 'recurring' ? 'subscription' : 'one-off'
		};
		return { basket: [...state.basket, newItem] };
	}),

	removeFromBasket: (id) => set((state) => ({
		basket: state.basket.filter(i => i.id !== id)
	})),

	setComparisonStock: (symbol) => set({ comparisonStock: symbol }),

	resetBasket: () => set({ basket: [] })
}));
