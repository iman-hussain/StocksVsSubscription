import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { calculateMultiStockComparison, calculateIndividualComparison, type SimulationResult, type SpendItem } from '../lib/financials';
import type { StockDataPoint } from '../lib/financials';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Share2, Download, Twitter, Linkedin, Facebook } from 'lucide-react';
import { useCountUp } from '../lib/useCountUp';
import CurrencyRain from './CurrencyRain';
import { CurrencySwitcher } from './CurrencySwitcher';
import { ShareCard } from './ShareCard';
import html2canvas from 'html2canvas';

interface Props {
	onBack: () => void;
}

const TooltipWrapper = ({ count, names }: { count: number; names: string[] }) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<span
			className="relative inline-block cursor-help z-50"
			onMouseEnter={() => setIsOpen(true)}
			onMouseLeave={() => setIsOpen(false)}
			onClick={(e) => {
				e.stopPropagation();
				setIsOpen(!isOpen);
			}}
		>
			<span className="underline decoration-dotted underline-offset-4">
				{count} others
			</span>
			{/* Dropdown */}
			<AnimatePresence>
				{isOpen && (
					<motion.span
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						transition={{ duration: 0.2 }}
						className="absolute left-0 top-full mt-2 bg-black/95 border border-white/20 rounded-lg p-3 min-w-48 shadow-xl z-50"
					>
						<span className="text-xs text-gray-400 block mb-2">Also includes:</span>
						{names.map((name, idx) => (
							<span key={idx} className="block text-sm text-white py-0.5">
								{name}
							</span>
						))}
					</motion.span>
				)}
			</AnimatePresence>
		</span>
	);
};

const ItemChart = ({ item, result }: { item: SpendItem; result: SimulationResult }) => {
	const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: result!.currency });

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.8, ease: "easeInOut" }}
			className="h-[300px]"
		>
			<div className="glass-panel p-4 rounded-2xl h-full flex flex-col">
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
			</div>
		</motion.div>
	);
};

export const RevealSlide = ({ onBack }: Props) => {
	const { basket, currency } = useStore();
	const [result, setResult] = useState<SimulationResult | null>(null);
	const [itemResults, setItemResults] = useState<Record<string, SimulationResult>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const animatedGrowth = useCountUp(result?.growthPercentage ?? 0, 2000);
	const animatedSpent = useCountUp(result?.totalSpent ?? 0, 2000);
	const animatedInvestment = useCountUp(result?.investmentValue ?? 0, 2000);
	const tickers = [...new Set(basket.map((item) => item.ticker))];
	const tickersLabel = tickers.join(' + ');

	// Format item names for the verdict text
	// Returns parts for rendering: prefix items + optionally "X others" with hover list
	const getItemNamesParts = () => {
		const names = basket.map(item => item.name);
		if (names.length === 0) return { prefix: '', hasOthers: false, othersCount: 0, otherNames: [] };
		if (names.length === 1) return { prefix: names[0], hasOthers: false, othersCount: 0, otherNames: [] };
		if (names.length === 2) return { prefix: `${names[0]} & ${names[1]}`, hasOthers: false, othersCount: 0, otherNames: [] };
		if (names.length === 3) return { prefix: `${names[0]}, ${names[1]} & ${names[2]}`, hasOthers: false, othersCount: 0, otherNames: [] };
		// More than 3 items: show first 2 and "X others" with dropdown
		const othersCount = names.length - 2;
		const otherNames = names.slice(2);
		return {
			prefix: `${names[0]}, ${names[1]} & `,
			hasOthers: true,
			othersCount,
			otherNames
		};
	};
	const itemNamesParts = getItemNamesParts();

	const getItemNamesString = () => {
		const names = basket.map(item => item.name);
		if (names.length === 0) return '';
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} & ${names[1]}`;
		if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
		return `${names[0]}, ${names[1]} & ${names.length - 2} others`;
	};

	const handleShare = async (platform?: 'twitter' | 'linkedin' | 'facebook' | 'download') => {
		const card = document.getElementById('share-card');
		if (!card) {
			console.error('Share card element not found via ID');
			return;
		}

		console.log('Starting share capture...', { platform, cardWidth: card.offsetWidth, cardHeight: card.offsetHeight });

		try {
			const canvas = await html2canvas(card, {
				scale: 2,
				backgroundColor: '#000000',
				useCORS: true,
				logging: true, // Enable html2canvas internal logs
			});

			console.log('Canvas captured successfully');

			const image = canvas.toDataURL('image/png');
			const blob = await (await fetch(image)).blob();
			const file = new File([blob], 'verdict.png', { type: 'image/png' });

			console.log('Image blob created', blob.size);

			const shareUrl = "https://svs.imanhussain.com";
			const itemNames = getItemNamesString();
			const shareText = `I spent ${formatter.format(result!.totalSpent)} on ${itemNames}. If I invested it, I'd have ${formatter.format(result!.investmentValue)}! Check your stack:`;

			// Mobile native share (when no platform specified)
			if (!platform && typeof navigator !== 'undefined' && (navigator as any).share && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
				console.log('Triggering native share');
				await (navigator as any).share({
					title: 'Stocks vs Subscription',
					text: shareText,
					url: shareUrl,
					files: [file]
				});
				return;
			}

			// Desktop Download
			// Helper function to trigger download
			const triggerDownload = () => {
				const link = document.createElement('a');
				link.download = 'stocks-vs-subscription-verdict.png';
				link.href = image;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			};

			if (platform === 'download') {
				console.log('Triggering download');
				triggerDownload();
				return;
			}

			// Socials - For desktop, we download the image first so user can attach it, then open the intent
			if (platform) {
				console.log('Triggering download + social intent');
				triggerDownload(); // Download image for manual attachment

				let intentUrl = '';
				switch (platform) {
					case 'twitter':
						intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
						break;
					case 'linkedin':
						intentUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`; // LinkedIn summary/title params are often ignored, but URL works
						break;
					case 'facebook':
						intentUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
						break;
				}
				if (intentUrl) {
					console.log('Opening social intent:', intentUrl);
					// Small delay to ensure download starts first
					setTimeout(() => window.open(intentUrl, '_blank'), 100);
				}
			}

		} catch (err) {
			console.error('Share failed', err);
		}
	};

	// Dynamic grammar helpers for verdict text
	const tickerCount = tickers.length;

	// Singular/plural for stock(s)
	const stockWord = tickerCount === 1 ? tickers[0] : 'these stocks';

	// "that" always refers to the "total amount of money" (singular)
	const thatWord = 'that';

	// Conditional coloring: did stocks outperform spending?
	const stocksWon = (result?.investmentValue ?? 0) > (result?.totalSpent ?? 0);
	// Colors flip based on outcome
	const spentColorClass = stocksWon ? 'text-red-400' : 'text-brand-neon';
	const investmentColorClass = stocksWon ? 'text-brand-neon' : 'text-red-400';

	useEffect(() => {
		const fetchAndCalculate = async () => {
			setLoading(true);
			setError('');

			try {
				const uniqueTickers = [...new Set(basket.map(item => item.ticker))];
				const userBaseCurrency = currency || 'GBP';

				// Identify required currency pairs (e.g. GBPUSD=X if user is GBP and item is USD)
				const requiredPairs = [...new Set(
					basket
						.filter(item => item.currency !== userBaseCurrency)
						.map(item => `${userBaseCurrency}${item.currency}=X`)
				)];

				// Calculate the earliest start date from the basket
				const earliestDate = basket.reduce((min, item) => {
					return item.startDate < min ? item.startDate : min;
				}, new Date().toISOString().split('T')[0]);

				const apiUrl = import.meta.env.VITE_API_URL || '';

				// Fetch stock data
				const stockDataPromises = uniqueTickers.map(async (ticker) => {
					const res = await fetch(`${apiUrl}/api/stock?symbol=${ticker}&startDate=${earliestDate}`);
					const data = await res.json();
					if (data.error) throw new Error(`Failed to fetch ${ticker}: ${data.error}`);

					// IMPORTANT: We no longer convert history here using static convertBetween!
					// We use the raw prices and let the simulation handle historical conversion
					// the simulation logic handles the item cost.
					// However, we still might need to know the native currency of the stock if we were
					// converting its price to userBaseCurrency.
					// The user's prompt says: "The simulation graph reflects historical exchange rate fluctuations"
					// This implies we should convert the stock price day-by-day too.

					const stockCurrency: string = data.currency || 'USD';

					return { ticker, history: data.history || [], nativeCurrency: stockCurrency };
				});

				// Fetch currency data
				const currencyPairsExtra = new Set<string>();
				// We also need to convert stock prices if they're not in userBaseCurrency
				// So we need pairs for stockNativeCurrency -> userBaseCurrency
				// The prompt says: "Fetch the relevant currency ticker (e.g. GBPUSD=X if User is GBP and Item is USD)"
				// Wait, Yahoo Finance rates are often BASEQUOTE=X.
				// If user is GBP and item is USD, GBPUSD=X tells us how many USD per GBP.
				// My financials.ts logic: costInUserCurrency = item.cost / rate(User->Item)
				// So if item.cost is $10 USD and rate(GBPUSD=X) is 1.25, then cost = 10 / 1.25 = £8. Correct.

				const stockDataArray = await Promise.all(stockDataPromises);

				for (const item of stockDataArray) {
					if (item.nativeCurrency !== userBaseCurrency) {
						currencyPairsExtra.add(`${userBaseCurrency}${item.nativeCurrency}=X`);
					}
				}

				const allPairs = [...new Set([...requiredPairs, ...Array.from(currencyPairsExtra)])];
				const currencyDataPromises = allPairs.map(async (pair) => {
					const res = await fetch(`${apiUrl}/api/stock?symbol=${pair}&startDate=${earliestDate}`);
					const data = await res.json();
					return { pair, history: data.history || [] };
				});

				const currencyDataArray = await Promise.all(currencyDataPromises);
				const currencyDataMap: Record<string, StockDataPoint[]> = {};
				for (const { pair, history } of currencyDataArray) {
					currencyDataMap[pair] = history;
				}

				const stockDataMap: Record<string, StockDataPoint[]> = {};
				for (const { ticker, history, nativeCurrency } of stockDataArray) {
					// Convert stock history prices to userBaseCurrency using historical rates
					if (nativeCurrency === userBaseCurrency) {
						stockDataMap[ticker] = history;
					} else {
						const pair = `${userBaseCurrency}${nativeCurrency}=X`;
						const rates = currencyDataMap[pair] || [];
						// Day-by-day conversion for the stock price history itself
						// This ensures the stock value on the graph is in User Currency
						// We can do this here or inside financials.ts.
						// financials.ts calculateMultiStockComparison currently assumes prices in stockDataMap are "ready".
						// So let's convert them here.

						const rateIndices: Record<string, number> = { [pair]: 0 };
						stockDataMap[ticker] = history.map((p: any) => {
							const dateStr = p.date;
							const rateHistory = rates;
							while (rateIndices[pair] < rateHistory.length - 1 && rateHistory[rateIndices[pair] + 1].date <= dateStr) {
								rateIndices[pair]++;
							}
							const rate = rateHistory.length > 0 && rateHistory[rateIndices[pair]].date <= dateStr
								? rateHistory[rateIndices[pair]].adjClose
								: 1;
							return {
								date: p.date,
								adjClose: rate > 0 ? p.adjClose / rate : p.adjClose
							};
						});
					}
				}

				const computation = calculateMultiStockComparison(basket, stockDataMap, userBaseCurrency, currencyDataMap);
				setResult(computation);

				const itemComputations: Record<string, SimulationResult> = {};
				for (const item of basket) {
					const pair = `${userBaseCurrency}${item.currency}=X`;
					const itemComputation = calculateIndividualComparison(
						item,
						stockDataMap[item.ticker] || [],
						userBaseCurrency,
						currencyDataMap[pair] || []
					);
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
	}, [basket, currency]);

	// Only show full loading screen if we have no result yet (initial load)
	if (loading && !result) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="h-dvh flex flex-col items-center justify-center gap-4 relative overflow-hidden"
			>
				{/* FIX: Explicit z-0 and pointer-events-none on the WRAPPER */}
				<div className="absolute inset-0 z-0 pointer-events-none">
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

	const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: result!.currency });

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1, ease: "easeInOut" }}
			className="min-h-dvh w-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto pt-16 md:pt-24 pb-8 md:pb-32 relative"
		>
			<div className="fixed top-4 inset-x-0 z-10 pointer-events-none">
				<div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
					<motion.button
						whileHover={{ x: -4 }}
						onClick={onBack}
						className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-400 hover:text-white transition-all duration-300 pointer-events-auto shadow-lg backdrop-blur-md"
					>
						<ChevronLeft size={16} className="text-brand-neon" />
						<span className="font-bold">Back</span>
					</motion.button>

					<div className="pointer-events-auto">
						<CurrencySwitcher />
					</div>
				</div>
			</div>

			{/* Verdict Section - Animated */}
			<div className="flex flex-col md:flex-row justify-between items-end mb-4 md:mb-12 gap-4 md:gap-6">
				<div>
					<motion.h2
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
						className="text-gray-400 uppercase tracking-widest text-[10px] md:text-sm font-bold mb-1 md:mb-2"
					>
						The Verdict
					</motion.h2>
					<h1 className="font-bold leading-tight" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
							className="inline-block"
						>
							You spent {' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
							className={`${spentColorClass} inline-block ms-1`}
						>
							{formatter.format(animatedSpent)}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
							className="inline-block ms-1"
						>
							{' '} on {' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
							className="text-white inline-block"
						>
							{itemNamesParts.prefix}
							{itemNamesParts.hasOthers && (
								<TooltipWrapper
									count={itemNamesParts.othersCount}
									names={itemNamesParts.otherNames}
								/>
							)}
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
							If you'd invested {thatWord} in {stockWord} instead, you'd have {' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
							className={`${investmentColorClass} inline-block ms-1`}
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
					<div className="text-[10px] md:text-sm text-gray-400">Total Return</div>
					<div className={`font-black tracking-tighter ${result!.growthPercentage >= 0 ? 'text-brand-neon' : 'text-red-500'}`} style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)' }}>
						{result!.growthPercentage > 0 ? '+' : ''}{animatedGrowth.toFixed(0)}%
					</div>
				</motion.div>
			</div>

			{/* Main Portfolio Graph */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
				className="w-full h-[220px] md:h-[350px] relative mb-6 md:mb-12"
			>
				<div className="glass-panel p-4 rounded-3xl w-full h-full flex flex-col">
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
							<AreaChart data={result!.graphData}>
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
				</div>
			</motion.div>

			{/* Share Section - Below Main Graph */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1, delay: 0.3 }}
				className="w-full mb-12"
			>
				<h3 className="text-sm font-semibold text-gray-300 mb-4">Share Verdict</h3>
				<div className="flex flex-wrap gap-4">
					{/* Primary Share / Download Button */}
					<button
						onClick={() => handleShare(window.innerWidth < 768 ? undefined : 'download')}
						className="bg-brand-neon hover:bg-white text-brand-dark px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors min-w-[200px] justify-center"
					>
						{typeof navigator !== 'undefined' && (navigator as any).share && window.innerWidth < 768 ? (
							<>
								<Share2 size={18} /> Share Verdict
							</>
						) : (
							<>
								<Download size={18} /> Download Screenshot
							</>
						)}
					</button>

					{/* Desktop Social Buttons */}
					<div className="flex gap-2">
						<button
							onClick={() => handleShare('twitter')}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on X"
						>
							<Twitter size={20} />
						</button>
						<button
							onClick={() => handleShare('linkedin')}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on LinkedIn"
						>
							<Linkedin size={20} />
						</button>
						<button
							onClick={() => handleShare('facebook')}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on Facebook"
						>
							<Facebook size={20} />
						</button>
					</div>
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


			{/* Hidden Share Card for Screenshot Generation */}
			<div className="fixed top-0 left-[-9999px] pointer-events-none">
				{result && (
					<ShareCard
						result={result}
						itemNames={getItemNamesString()}
						spent={result.totalSpent}
						investmentValue={result.investmentValue}
						formattedSpent={formatter.format(result.totalSpent)}
						formattedInvestment={formatter.format(result.investmentValue)}
						tickers={tickers}
					/>
				)}
			</div>
		</motion.div>
	);
};