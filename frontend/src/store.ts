import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpendItem } from './lib/financials';
import { convertBetween } from './lib/currency';

interface AppState {
	country: string;
	currency: string;
	basket: SpendItem[];

	// Actions
	setCountry: (country: string, currency: string) => void;
	addToBasket: (item: Omit<SpendItem, 'id'>) => void;
	updateInBasket: (id: string, updates: Partial<SpendItem>) => void;
	removeFromBasket: (id: string) => void;
	resetBasket: () => void;
}

export const useStore = create<AppState>()(
	persist(
		(set) => ({
			country: 'UK',
			currency: 'GBP',
			basket: [],

			setCountry: (country, currency) => set((state) => {
				// Convert existing basket items to new currency
				const newBasket = state.basket.map(item => ({
					...item,
					currency: currency,
					cost: convertBetween(item.cost, item.currency, currency)
				}));
				return { country, currency, basket: newBasket };
			}),

			addToBasket: (item) => set((state) => {
				const newItem: SpendItem = {
					...item,
					id: crypto.randomUUID(),
				};
				return { basket: [...state.basket, newItem] };
			}),

			updateInBasket: (id, updates) => set((state) => ({
				basket: state.basket.map(item => item.id === id ? { ...item, ...updates } : item)
			})),

			removeFromBasket: (id) => set((state) => ({
				basket: state.basket.filter(i => i.id !== id)
			})),

			resetBasket: () => set({ basket: [] })
		}),
		{
			name: 'svs-storage-v1',
		}
	)
);
