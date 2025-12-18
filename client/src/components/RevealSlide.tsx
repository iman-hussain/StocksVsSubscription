// @ts-nocheck
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { calculateComparison, SimulationResult } from '../lib/financials';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export const RevealSlide = () => {
	const { basket, comparisonStock, currency } = useStore();
	const [result, setResult] = useState<SimulationResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [viewMode, setViewMode] = useState<'value' | 'profit'>('value'); // 'value' = total value, 'profit' = gain

	useEffect(() => {
		setLoading(true);
		// Fetch stock data
		fetch(`http://localhost:3000/api/stock?symbol=${comparisonStock}`)
			.then(res => res.json())
			.then(data => {
				if (data.error) throw new Error(data.error);

				// Construct items for calculation
				const computation = calculateComparison(basket, data.history);
				setResult(computation);
				setLoading(false);
			})
			.catch(err => {
				setError(err.message);
				setLoading(false);
			});
	}, [basket, comparisonStock]);

	if (loading) return <div className="h-dvh flex items-center justify-center text-brand-neon animate-pulse">Crunching Numbers...</div>;
	if (error) return <div className="h-dvh flex items-center justify-center text-red-500">Error: {error}</div>;
	if (!result) return null;

	const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: result.currency });

	return (
		<div className="h-dvh w-full flex flex-col p-6 max-w-7xl mx-auto pt-12 overflow-hidden">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6"
			>
				<div>
					<h2 className="text-gray-400 uppercase tracking-widest text-sm font-bold mb-2">The Verdict</h2>
					<h1 className="text-3xl md:text-5xl font-bold leading-tight">
						You spent <span className="text-red-400">{formatter.format(result.totalSpent)}</span>.
						<br />
						<span className="opacity-50">If you invested in {comparisonStock}, you'd have </span>
						<span className="text-brand-neon">{formatter.format(result.investmentValue)}</span>.
					</h1>
				</div>

				<div className="text-right">
					<div className="text-sm text-gray-400">Total Return</div>
					<div className={`text-6xl font-black tracking-tighter ${result.growthPercentage >= 0 ? 'text-brand-neon' : 'text-red-500'}`}>
						{result.growthPercentage > 0 ? '+' : ''}{result.growthPercentage.toFixed(0)}%
					</div>
				</div>
			</motion.div>

			{/* Render Graph */}
			<div className="flex-1 w-full min-h-[300px] glass-panel p-4 rounded-3xl relative">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={result.graphData}>
						<defs>
							<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#00f4a2" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#00f4a2" stopOpacity={0} />
							</linearGradient>
							<linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
						<XAxis dataKey="date" hide />
						<YAxis hide />
						<Tooltip
							contentStyle={{ backgroundColor: '#000', border: '1px solid #333' } as any}
							formatter={(value: number) => formatter.format(value)}
							labelStyle={{ color: '#888' }}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke="#00f4a2"
							strokeWidth={3}
							fillOpacity={1}
							fill="url(#colorValue)"
							name="Portfolio Value"
						/>
						<Area
							type="monotone"
							dataKey="spent"
							stroke="#ef4444"
							strokeWidth={2}
							strokeDasharray="5 5"
							fillOpacity={1}
							fill="url(#colorSpent)"
							name="Cash Burned"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1 }}
				className="mt-6 text-center text-gray-500 text-sm"
			>
				Analysis based on adjusted close prices. Past performance is not indicative of future results.
				<br /> {comparisonStock} vs Your Wallet.
			</motion.div>
		</div>
	);
};
