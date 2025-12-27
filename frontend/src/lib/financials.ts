/**
 * Type definitions for financial simulation.
 * All calculations are performed server-side via /api/simulate endpoint.
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