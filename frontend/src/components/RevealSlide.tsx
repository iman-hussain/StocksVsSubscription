import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { calculateMultiStockComparison, calculateIndividualComparison } from '../lib/financials';
import type { SimulationResult, SpendItem, StockDataPoint } from '../lib/financials';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useCountUp } from '../lib/useCountUp';
import CurrencyRain from './CurrencyRain';
import { convertBetween } from '../lib/currency';

interface Props {
	onBack: () => void;
}

const ItemChart = ({ item, result }: { item: SpendItem; result: SimulationResult }) => {
	const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: result.currency });

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.8, ease: "easeInOut" }}
			className="glass-panel p-4 rounded-2xl h-[300px] flex flex-col"
		>
			<h3 className="text-sm font-semibold text-gray-300 mb-2 truncate">{item.name} ({item.ticker})</h3>
			<div className="flex-1 min-h-0">
				<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
					<AreaChart data={result.graphData}>
						<defs>
							<linearGradient id={`color-${item.id}-value`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#00f4a2" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#00f4a2" stopOpacity={0} />
							</linearGradient>
							<linearGradient id={`color-${item.id}-spent`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
						<XAxis
							dataKey="date"
							tick={{ fill: '#888', fontSize: 10 }}
							tickLine={false}
							axisLine={{ stroke: '#333' }}
						/>
						<YAxis tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#333' }} tickFormatter={(v) => formatter.format(v)} width={70} />
						<Tooltip
							contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
							formatter={(value: number | string | undefined) =>
								typeof value === 'number' ? formatter.format(value) : ''}
							labelStyle={{ color: '#888' }}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke="#00f4a2"
							strokeWidth={2}
							fillOpacity={1}
							fill={`url(#color-${item.id}-value)`}
						/>
						<Area
							type="monotone"
							dataKey="spent"
							stroke="#ef4444"
							strokeWidth={2}
							strokeDasharray="5 5"
							fillOpacity={1}
							fill={`url(#color-${item.id}-spent)`}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};

export const RevealSlide = ({ onBack }: Props) => {
	const { basket } = useStore();
	const [result, setResult] = useState<SimulationResult | null>(null);
	const [itemResults, setItemResults] = useState<Record<string, SimulationResult>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const animatedGrowth = useCountUp(result?.growthPercentage ?? 0, 2000);
	const animatedSpent = useCountUp(result?.totalSpent ?? 0, 2000);
	const animatedInvestment = useCountUp(result?.investmentValue ?? 0, 2000);
	const tickers = [...new Set(basket.map((item) => item.ticker))];
	const tickersLabel = tickers.join(' + ');

	// Format item names for the verdict text (e.g., "Netflix, Spotify & Gym" or "Netflix, Spotify & 3 others")
	const formatItemNames = () => {
		const names = basket.map(item => item.name);
		if (names.length === 0) return '';
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} & ${names[1]}`;
		if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
		// More than 3 items: show first 2 and "X others"
		const othersCount = names.length - 2;
		return `${names[0]}, ${names[1]} & ${othersCount} others`;
	};
	const itemNamesLabel = formatItemNames();

	useEffect(() => {
		const fetchAndCalculate = async () => {
			setLoading(true);
			setError('');

			try {
				const uniqueTickers = [...new Set(basket.map(item => item.ticker))];

				// Use VITE_API_URL if set, otherwise use relative path (same-origin deployment)
				const apiUrl = import.meta.env.VITE_API_URL || '';
				const stockDataPromises = uniqueTickers.map(async (ticker) => {
					const res = await fetch(`${apiUrl}/api/stock?symbol=${ticker}`);
					const data = await res.json();
					if (data.error) throw new Error(`Failed to fetch ${ticker}: ${data.error}`);
					const stockCurrency: string | undefined = data.currency;
					const targetCurrency = basket[0]?.currency ?? 'GBP';
					const convertedHistory = Array.isArray(data.history)
						? data.history.map((p: { date: string; adjClose: number }) => ({
							date: p.date,
							adjClose: stockCurrency ? convertBetween(p.adjClose, stockCurrency, targetCurrency) : p.adjClose,
						  }))
						: [];
					return { ticker, history: convertedHistory };
				});

				const stockDataArray = await Promise.all(stockDataPromises);

				const stockDataMap: Record<string, StockDataPoint[]> = {};
				for (const { ticker, history } of stockDataArray) {
					stockDataMap[ticker] = history;
				}

				const computation = calculateMultiStockComparison(basket, stockDataMap);
				setResult(computation);

				const itemComputations: Record<string, SimulationResult> = {};
				for (const item of basket) {
					const itemComputation = calculateIndividualComparison(item, stockDataMap[item.ticker] || []);
					itemComputations[item.id] = itemComputation;
				}
				setItemResults(itemComputations);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
			} finally {
				setLoading(false);
			}
		};

		if (basket.length > 0) {
			fetchAndCalculate();
		}
	}, [basket]);

	if (loading) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="h-dvh flex flex-col items-center justify-center gap-4 relative overflow-hidden"
			>
				<div className="absolute inset-0 pointer-events-none">
					<CurrencyRain density={40} />
				</div>
				{/* Kept the spinner here as it is necessary for loading context,
				    but it will disappear completely before results are shown. */}
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
					className="w-12 h-12 border-4 border-brand-neon border-t-transparent rounded-full z-10"
				/>
				<p className="text-brand-neon font-semibold z-10">Crunching Numbers...</p>
			</motion.div>
		);
	}

	if (error) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="h-dvh flex flex-col items-center justify-center text-red-500 gap-4"
			>
				<div>Error: {error}</div>
				<button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2">
					<ChevronLeft size={20} /> Go Back
				</button>
			</motion.div>
		);
	}

	if (!result) return null;

	const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: result.currency });

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1, ease: "easeInOut" }}
			className="min-h-dvh w-full flex flex-col p-6 max-w-7xl mx-auto pt-12 pb-32 relative"
		>
			<div className="fixed top-4 left-4 z-10">
				<motion.button
					whileHover={{ x: -4 }}
					onClick={onBack}
					className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
				>
					<ChevronLeft size={20} /> Back
				</motion.button>
			</div>

			{/* Verdict Section - Animated */}
			<div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
				<div>
					<motion.h2
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
						className="text-gray-400 uppercase tracking-widest text-sm font-bold mb-2"
					>
						The Verdict
					</motion.h2>
					<h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
							className="inline-block"
						>
							You spent{' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
							className="text-red-400 inline-block ms-1"
						>
							{formatter.format(animatedSpent)}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
							className="inline-block ms-1"
						>
							{' '}on{' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
							className="text-white inline-block"
						>
							{itemNamesLabel}
						</motion.span>
						<motion.span
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4, delay: 0.7 }}
							className="inline-block"
						>
							.
						</motion.span>
						<br />
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 0.5, y: 0 }}
							transition={{ duration: 0.6, delay: 0.9, ease: "easeOut" }}
							className="inline-block mt-1"
						>
							If you invested that in those stocks instead, you'd have{' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
							className="text-brand-neon inline-block ms-1"
						>
							{formatter.format(animatedInvestment)}
						</motion.span>
						<motion.span
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4, delay: 1.1 }}
							className="inline-block"
						>
							.
						</motion.span>
					</h1>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
				>
					<div className="text-sm text-gray-400">Total Return</div>
					<div className={`text-6xl font-black tracking-tighter ${result.growthPercentage >= 0 ? 'text-brand-neon' : 'text-red-500'}`}>
						{result.growthPercentage > 0 ? '+' : ''}{animatedGrowth.toFixed(0)}%
					</div>
				</motion.div>
			</div>

			{/* Main Portfolio Graph */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
				className="w-full h-[350px] glass-panel p-4 rounded-3xl relative mb-12 flex flex-col"
			>
				<div className="flex items-center gap-4 mb-4 flex-wrap text-xs text-gray-300">
					<h3 className="text-sm font-semibold text-gray-300">Portfolio Growth ({tickersLabel || 'SPY'})</h3>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 rounded-full bg-brand-neon" />
							<span>Portfolio Value</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 rounded-full bg-red-400" />
							<span>Total Spent</span>
						</div>
					</div>
				</div>
				<div className="flex-1 min-h-0 relative" style={{ minHeight: 250 }}>
					<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
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
							<XAxis
								dataKey="date"
								tick={{ fill: '#888', fontSize: 10 }}
								tickLine={false}
								axisLine={{ stroke: '#333' }}
							/>
							<YAxis tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#333' }} tickFormatter={(v) => formatter.format(v)} width={80} />
							<Tooltip
								contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
								formatter={(value: number | string | undefined) =>
									typeof value === 'number' ? formatter.format(value) : ''}
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
			</motion.div>

			{/* Individual Item Charts Grid */}
			{basket.length > 1 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 1, delay: 0.4 }}
				>
					<h3 className="text-sm font-semibold text-gray-300 mb-6">Individual Item Performance</h3>
					<div className={`grid gap-6 ${basket.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
						basket.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
							basket.length <= 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' :
								'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
						}`}>
						{basket.map((item, idx) => (
							<motion.div
								key={item.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.8, delay: 0.1 * idx, ease: "easeOut" }}
							>
								{itemResults[item.id] && <ItemChart item={item} result={itemResults[item.id]} />}
							</motion.div>
						))}
					</div>
				</motion.div>
			)}
		</motion.div>
	);
};