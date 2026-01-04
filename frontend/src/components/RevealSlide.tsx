import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { type SimulationResult, type SpendItem } from '../lib/financials';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Share2, Download, Twitter, Facebook, Linkedin } from 'lucide-react';
import { useCountUp } from '../lib/useCountUp';
import CurrencyRain from './CurrencyRain';
import { CurrencySwitcher } from './CurrencySwitcher';
import { ShareCard } from './ShareCard';
import { formatCurrency } from '../lib/currency';
import { simulateBasket } from '../lib/api';
import html2canvas from 'html2canvas';

interface Props {
	onBack: () => void;
	isDesktopSplit?: boolean;
}

const TooltipWrapper = ({ count, names }: { count: number; names: string[] }) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<span
			className="inline-flex items-center gap-1 cursor-help group relative"
			onMouseEnter={() => setIsOpen(true)}
			onMouseLeave={() => setIsOpen(false)}
			onClick={() => setIsOpen(!isOpen)}
		>
			<span className="text-brand-neon underline decoration-brand-neon/30 decoration-2 underline-offset-4 hover:decoration-brand-neon/100 transition-all">
				{count} others
			</span>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: -10 }}
						className="absolute top-full left-1/2 -translate-x-1/2 mt-4 p-4 glass-panel rounded-2xl border border-white/10 shadow-2xl z-50 min-w-[240px]"
					>
						<div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 border-b border-white/5 pb-2">Full Basket</div>
						<div className="flex flex-col gap-2.5">
							{names.map((n, i) => (
								<div key={i} className="flex items-center gap-2">
									<div className="w-1.5 h-1.5 rounded-full bg-brand-neon/50" />
									<span className="text-sm text-gray-200 font-medium">{n}</span>
								</div>
							))}
						</div>
						<div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand-dark border-l border-t border-white/10 rotate-45" />
					</motion.div>
				)}
			</AnimatePresence>
		</span>
	);
};

const ItemChart = ({ item, result }: { item: SpendItem, result: SimulationResult }) => {
	const stocksWon = result.investmentValue > result.totalSpent;
	const color = stocksWon ? '#00f4a2' : '#ef4444';

	return (
		<div className="glass-panel p-5 rounded-3xl border border-white/5 h-full flex flex-col group hover:border-white/10 transition-all duration-500">
			<div className="flex justify-between items-start mb-6">
				<div>
					<h4 className="text-white font-bold text-lg group-hover:text-brand-neon transition-colors">{item.name}</h4>
					<p className="text-xs text-gray-500 uppercase tracking-widest font-medium mt-1">invested in {item.ticker}</p>
				</div>
				<div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${result.growthPercentage >= 0 ? 'bg-brand-neon/10 text-brand-neon' : 'bg-red-500/10 text-red-400'}`}>
					{result.growthPercentage > 0 ? '+' : ''}{result.growthPercentage.toFixed(0)}%
				</div>
			</div>

			<div className="h-28 w-full mb-6">
				<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
					<AreaChart data={result.graphData}>
						<defs>
							<linearGradient id={`colorValue-${item.id}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={color} stopOpacity={0.2} />
								<stop offset="95%" stopColor={color} stopOpacity={0} />
							</linearGradient>
							<linearGradient id={`colorSpent-${item.id}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
								<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
							</linearGradient>
						</defs>
						<XAxis
							dataKey="date"
							tick={{ fill: '#666', fontSize: 8 }}
							tickLine={false}
							axisLine={{ stroke: '#333' }}
						/>
						<YAxis
							tick={{ fill: '#666', fontSize: 8 }}
							tickLine={false}
							axisLine={{ stroke: '#333' }}
							tickFormatter={(v) => formatCurrency(v, result.currency)}
							width={40}
						/>
						<Tooltip
							contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
							formatter={(value: number | string | undefined) =>
								typeof value === 'number' ? formatCurrency(value, result.currency) : ''}
						/>
						<Area
							type="monotone"
							dataKey="spent"
							stroke="#ef4444"
							strokeWidth={1.5}
							strokeDasharray="4 4"
							fillOpacity={1}
							fill={`url(#colorSpent-${item.id})`}
							isAnimationActive={true}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke={color}
							strokeWidth={2.5}
							fillOpacity={1}
							fill={`url(#colorValue-${item.id})`}
							isAnimationActive={true}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			<div className="grid grid-cols-2 gap-4 mt-auto border-t border-white/5 pt-5">
				<div>
					<div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Spent</div>
					<div className="text-lg font-black text-red-400">{formatCurrency(result.totalSpent, result.currency)}</div>
				</div>
				<div className="text-right">
					<div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Value</div>
					<div className={`text-lg font-black ${stocksWon ? 'text-brand-neon' : 'text-red-400'}`}>{formatCurrency(result.investmentValue, result.currency)}</div>
				</div>
			</div>
		</div>
	);
};

export const RevealSlide = ({ onBack, isDesktopSplit = false }: Props) => {
	const { basket, currency } = useStore();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState<SimulationResult | null>(null);
	const [itemResults, setItemResults] = useState<Record<string, SimulationResult>>({});
	const [fallbackIndex, setFallbackIndex] = useState<'SPY' | '^IXIC' | '^FTSE' | null>(null);
	const [lastRequestTime, setLastRequestTime] = useState(0);
	const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
	const [showFallbackOption, setShowFallbackOption] = useState(false);

	// Cooldown period to prevent hammering (5 seconds between requests)
	const REQUEST_COOLDOWN_MS = 5000;

	// Animation numbers
	const animatedSpent = useCountUp(result?.totalSpent || 0, 2000);
	const animatedInvestment = useCountUp(result?.investmentValue || 0, 2000);
	const animatedGrowth = useCountUp(result?.growthPercentage || 0, 2000);

	const tickers = [...new Set(basket.map(item => item.ticker))];
	const tickersLabel = tickers.join(', ');

	const getItemNamesParts = () => {
		const n = basket.length;
		if (n === 0) return { prefix: '', hasOthers: false, othersCount: 0, otherNames: [] };
		if (n === 1) return { prefix: basket[0].name, hasOthers: false, othersCount: 0, otherNames: [] };
		if (n === 2) return { prefix: `${basket[0].name} and ${basket[1].name}`, hasOthers: false, othersCount: 0, otherNames: [] };
		if (n === 3) return { prefix: `${basket[0].name}, ${basket[1].name} and ${basket[2].name}`, hasOthers: false, othersCount: 0, otherNames: [] };

		return {
			prefix: `${basket[0].name}, ${basket[1].name} and `,
			hasOthers: true,
			othersCount: n - 2,
			otherNames: basket.map(b => b.name)
		};
	};

	const itemNamesParts = getItemNamesParts();

	const getItemNamesString = () => {
		const n = basket.length;
		if (n === 0) return '';
		if (n === 1) return basket[0].name;
		if (n === 2) return `${basket[0].name} and ${basket[1].name}`;
		if (n === 3) return `${basket[0].name}, ${basket[1].name} and ${basket[2].name}`;
		return `${basket[0].name}, ${basket[1].name} and ${n - 2} others`;
	};

	const [isSharing, setIsSharing] = useState(false);
	const spentColorClass = 'text-red-400';
	const investmentColorClass = 'text-brand-neon';

	const getShareFilename = () => {
		const now = new Date();
		const yy = String(now.getFullYear()).slice(-2);
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		const hh = String(now.getHours()).padStart(2, '0');
		const min = String(now.getMinutes()).padStart(2, '0');
		return `svs.imanhussain.com_${yy}${mm}${dd}_${hh}${min}.png`;
	};

	const handleShare = async (platform?: string) => {
		if (isSharing) return;
		setIsSharing(true);

		try {
			const shareUrl = 'https://svs.imanhussain.com';
			const shareText = `I spent ${formatCurrency(result!.totalSpent, result!.currency)} on ${getItemNamesString()}. That money, invested, would now be ${formatCurrency(result!.investmentValue, result!.currency)}! 💸💎\n\nCheck yours at ${shareUrl}`;

			// 1. Always generate the image if it's a social share OR binary download
			const card = document.getElementById('share-card-container');
			console.log('[Share] Card element found:', !!card);
			let blob: Blob | null = null;
			if (card) {
				const canvas = await html2canvas(card, {
					backgroundColor: '#000',
					scale: 2,
					logging: false,
					useCORS: true,
					allowTaint: true
				});
				blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
				console.log('[Share] Blob generated:', !!blob, blob?.size);
			}

			// 2. Platform-specific logic
			if (!platform) {
				// Native Web Share API (Primary for Mobile)
				if (navigator.share) {
					const shareData: ShareData = {
						title: 'Stocks vs Subscription',
						text: shareText,
						url: shareUrl,
					};

					// Attempt to include the file if supported
					const filename = getShareFilename();
					if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
						shareData.files = [new File([blob], filename, { type: 'image/png' })];
					}

					await navigator.share(shareData);
				} else {
					// Fallback for Desktop: Copy text + Download image
					await navigator.clipboard.writeText(shareText);
					if (blob) {
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = getShareFilename();
						a.click();
						URL.revokeObjectURL(url);
					}
					alert('Share text copied to clipboard! Image downloaded.');
				}
			} else if (platform === 'download') {
				if (blob) {
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = getShareFilename();
					a.click();
					URL.revokeObjectURL(url);
				}
			} else {
				// Social Intent Logic
				let intentUrl = '';
				switch (platform) {
					case 'twitter':
						intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
						break;
					case 'whatsapp':
						intentUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
						break;
					case 'linkedin':
						intentUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`; // LinkedIn summary/title params are often ignored, but URL works
						break;
					case 'facebook':
						intentUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
						break;
					case 'reddit':
						intentUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
						break;
					default:
						break;
				}
				if (intentUrl) {
					window.open(intentUrl, '_blank');
				}
			}
		} catch (err: any) {
			if (err.name !== 'AbortError' && err.name !== 'InvalidStateError') {
				console.error('Share failed', err);
			}
		} finally {
			setIsSharing(false);
		}
	};

	useEffect(() => {
		// AbortController to cancel pending requests on cleanup or re-render
		const abortController = new AbortController();
		let isCancelled = false;

		const fetchAndCalculate = async () => {
			// Cooldown check - prevent hammering if user keeps retrying
			const now = Date.now();
			if (now - lastRequestTime < REQUEST_COOLDOWN_MS) {
				return; // Skip if within cooldown period
			}
			setLastRequestTime(now);

			setLoading(true);
			setError('');
			setLoadingStartTime(Date.now());
			setShowFallbackOption(false);

			try {
// If fallback index is chosen, override all tickers to that index
			const effectiveBasket = fallbackIndex
				? basket.map(item => ({ ...item, ticker: fallbackIndex }))
					: basket;

				const { result, itemResults } = await simulateBasket(effectiveBasket, currency || 'GBP', abortController.signal);

				// Prevent setting state if the effect was cleaned up
				if (!isCancelled) {
					setResult(result);
					setItemResults(itemResults);
				}
			} catch (err: unknown) {
				// Ignore abort errors - they're expected during cleanup
				if (err instanceof Error && err.name === 'AbortError') {
					return;
				}
				if (!isCancelled) {
					setError(err instanceof Error ? err.message : 'Simulation failed');
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
					setLoadingStartTime(null);
					setShowFallbackOption(false);
				}
			}
		};

		if (basket.length > 0) {
			fetchAndCalculate();
		} else {
			setResult(null);
			setItemResults({});
			setLoading(false);
		}

		// Cleanup: Cancel pending request and mark as cancelled
		return () => {
			isCancelled = true;
			abortController.abort();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [basket, currency, fallbackIndex]);

	// Reset fallback index when basket changes (user edited items)
	useEffect(() => {
		if (fallbackIndex) {
			setFallbackIndex(null);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [basket]);

	// Show fallback option after 10 seconds of loading
	useEffect(() => {
		if (!loading || !loadingStartTime || fallbackIndex) return;

		const timer = setTimeout(() => {
			setShowFallbackOption(true);
		}, 10000); // 10 seconds

		return () => clearTimeout(timer);
	}, [loading, loadingStartTime, fallbackIndex]);

	// Handler for fallback index - resets error and triggers re-fetch
	const handleUseFallbackIndex = (index: 'SPY' | '^IXIC' | '^FTSE') => {
		setError('');
		setFallbackIndex(index);
		setLastRequestTime(0); // Reset cooldown to allow immediate request
	};

	// Error State - Displayed FIRST to prevent masking errors with empty state
	if (error) {
		const isRateLimit = error.toLowerCase().includes('too many') || error.toLowerCase().includes('429') || error.toLowerCase().includes('rate');
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className={`${isDesktopSplit ? 'h-full' : 'h-dvh'} flex flex-col items-center justify-center p-8 text-center gap-6`}
			>
				<div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
					<span className="text-4xl">{isRateLimit ? '⏳' : '⚠️'}</span>
				</div>
				<div className="max-w-md">
					<h3 className="text-xl font-bold text-white mb-2">
						{isRateLimit ? 'Data Provider Busy' : 'Something Went Wrong'}
					</h3>
					<p className="text-gray-400 text-sm leading-relaxed mb-4">
						{isRateLimit
							? 'Our stock data provider is temporarily rate-limiting requests. This usually resolves within 1-2 hours.'
							: 'We couldn\'t crunch your numbers. This could be a temporary issue with our data provider.'
						}
					</p>
					{!isRateLimit && (
						<p className="text-red-400/80 text-xs font-mono bg-red-500/5 rounded-lg px-3 py-2 mb-4">
							{error}
						</p>
					)}
				</div>
				<div className="flex flex-col sm:flex-row gap-3">
					<button
						onClick={onBack}
						className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-400 hover:text-white transition-all duration-300"
					>
						<ChevronLeft size={16} className="text-brand-neon" />
						<span className="font-bold">Go Back</span>
					</button>
					{isRateLimit && !fallbackIndex && (
						<div className="flex flex-col gap-3">
							<p className="text-gray-400 text-sm text-center">Use index fund instead?</p>
							<div className="flex flex-col gap-2">
								<button
									onClick={() => handleUseFallbackIndex('SPY')}
									className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 hover:bg-brand-neon/20 border border-brand-neon/30 text-sm text-brand-neon hover:text-white transition-all duration-300"
								>
									<span className="font-bold">S&P 500 (SPY)</span>
								</button>
								<button
									onClick={() => handleUseFallbackIndex('^IXIC')}
									className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 hover:bg-brand-neon/20 border border-brand-neon/30 text-sm text-brand-neon hover:text-white transition-all duration-300"
								>
									<span className="font-bold">NASDAQ Composite (^IXIC)</span>
								</button>
								<button
								onClick={() => handleUseFallbackIndex('^FTSE')}
								className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 hover:bg-brand-neon/20 border border-brand-neon/30 text-sm text-brand-neon hover:text-white transition-all duration-300"
							>
								<span className="font-bold">FTSE 100 (^FTSE)</span>
								</button>
							</div>
						</div>
					)}
				</div>
				{isRateLimit && !fallbackIndex && (
					<p className="text-gray-500 text-xs mt-2 max-w-sm text-center">
						Index funds are usually cached and available instantly
					</p>
				)}
			</motion.div>
		);
	}

	// Loading State
	if (loading) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className={`${isDesktopSplit ? 'h-full' : 'h-dvh'} flex flex-col items-center justify-center gap-4 relative overflow-hidden`}
			>
				<div className="absolute inset-0 z-0 pointer-events-none">
					<CurrencyRain density={40} />
				</div>
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
					className="w-12 h-12 border-4 border-brand-neon border-t-transparent rounded-full z-10"
				/>
				<p className="text-brand-neon font-semibold z-10">Crunching Numbers...</p>

				{/* Show fallback option after 10 seconds */}
				<AnimatePresence>
					{showFallbackOption && !fallbackIndex && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="z-10 flex flex-col items-center gap-3 mt-4"
						>
							<p className="text-gray-400 text-sm text-center max-w-xs">
								Taking longer than expected?
							</p>
							<p className="text-gray-400 text-sm text-center">Use index fund instead?</p>
							<div className="flex flex-col gap-2">
								<button
									onClick={() => handleUseFallbackIndex('SPY')}
									className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 hover:bg-brand-neon/20 border border-brand-neon/30 text-sm text-brand-neon hover:text-white transition-all duration-300"
								>
									<span className="font-bold">S&P 500 (SPY)</span>
								</button>
								<button
									onClick={() => handleUseFallbackIndex('^IXIC')}
									className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 hover:bg-brand-neon/20 border border-brand-neon/30 text-sm text-brand-neon hover:text-white transition-all duration-300"
								>
									<span className="font-bold">NASDAQ Composite (^IXIC)</span>
								</button>
								<button
									onClick={() => handleUseFallbackIndex('^FTSE')}
									className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 hover:bg-brand-neon/20 border border-brand-neon/30 text-sm text-brand-neon hover:text-white transition-all duration-300"
								>
									<span className="font-bold">FTSE 100 (^FTSE)</span>
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		);
	}

	// Empty State (No items in basket) - Only show when basket is truly empty AND no error
	if (!result) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className={`${isDesktopSplit ? 'h-full' : 'h-dvh'} flex flex-col items-center justify-center p-8 text-center gap-6`}
			>
				<div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
					<div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 animate-[spin_10s_linear_infinite]" />
				</div>
				<div className="max-w-md">
					<h3 className="text-xl font-bold text-white mb-2">Potential Unlocked</h3>
					<p className="text-gray-500 text-sm leading-relaxed">
						Add subscriptions, habits, or products to build your stack and see how much your spending could have grown in the market.
					</p>
				</div>
				{!isDesktopSplit && (
					<button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2 mt-4 text-xs font-bold uppercase tracking-widest transition-colors font-black">
						<ChevronLeft size={16} className="text-brand-neon" /> Build Stack
					</button>
				)}
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1, ease: "easeInOut" }}
			className={`w-full flex flex-col p-4 md:p-6 relative ${isDesktopSplit ? 'min-h-0 pt-0 pb-12' : 'min-h-dvh max-w-7xl mx-auto pt-16 md:pt-24 pb-8 md:pb-32'}`}
		>
			{!isDesktopSplit && (
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
			)}

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
							className="inline"
						>
							You spent{' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
							className={`${spentColorClass} inline`}
						>
							{formatCurrency(animatedSpent, result!.currency)}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
							className="inline"
						>
							{' '}on{' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
							className="text-white inline"
						>
							{itemNamesParts.prefix}
							{itemNamesParts.hasOthers && (
								<TooltipWrapper
									count={itemNamesParts.othersCount}
									names={itemNamesParts.otherNames}
								/>
							)}.
						</motion.span>
						<br />
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 0.5, y: 0 }}
							transition={{ duration: 0.6, delay: 0.9, ease: "easeOut" }}
							className="inline mt-1"
						>
							That money, invested, would now be{' '}
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
							className={`${investmentColorClass} inline`}
							style={{ whiteSpace: 'nowrap' }}
						>
							{formatCurrency(animatedInvestment, result!.currency)}.
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
				className="w-full h-[320px] md:h-[350px] relative mb-8 md:mb-12"
			>
				<div className="glass-panel p-4 rounded-3xl w-full h-full flex flex-col overflow-hidden border border-white/5">
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
					<div className="flex-1 min-h-0 relative">
						<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
								<YAxis tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#333' }} tickFormatter={(v) => formatCurrency(v, result!.currency)} width={80} />
								<Tooltip
									contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
									formatter={(value: number | string | undefined) =>
										typeof value === 'number' ? formatCurrency(value, result!.currency) : ''}
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
					{/* Primary Share Button (Native API) */}
					<button
						onClick={() => handleShare()}
						disabled={isSharing}
						className="bg-brand-neon hover:bg-white disabled:opacity-70 disabled:cursor-wait text-brand-dark px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors min-w-[200px] justify-center"
					>
						{isSharing ? (
							<>Processing...</>
						) : (
							<>
								<Share2 size={18} /> Share Verdict
							</>
						)}
					</button>

					{/* Download Button (Direct) */}
					<button
						onClick={() => handleShare('download')}
						disabled={isSharing}
						className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-wait text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors justify-center"
					>
						<Download size={18} /> Download
					</button>

					{/* Desktop Social Buttons */}
					<div className="hidden md:flex gap-2">
						<button
							onClick={() => handleShare('twitter')}
							disabled={isSharing}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-wait text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on X"
						>
							<Twitter size={20} />
						</button>
						<button
							onClick={() => handleShare('linkedin')}
							disabled={isSharing}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-wait text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on LinkedIn"
						>
							<Linkedin size={20} />
						</button>
						<button
							onClick={() => handleShare('facebook')}
							disabled={isSharing}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-wait text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on Facebook"
						>
							<Facebook size={20} />
						</button>
						<button
							onClick={() => handleShare('reddit')}
							disabled={isSharing}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-wait text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on Reddit"
						>
							<svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
								<path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
							</svg>
						</button>
						<button
							onClick={() => handleShare('whatsapp')}
							disabled={isSharing}
							className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-wait text-gray-400 hover:text-white border border-white/10 transition-all"
							title="Share on WhatsApp"
						>
							<svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
								<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.248-.57-.397m-5.475 7.613h-.004c-1.93 0-3.816-.502-5.466-1.47l-.39-.231-4.053 1.063 1.082-3.951-.253-.404a10.013 10.013 0 0 1-1.378-5.325c0-5.592 4.542-10.133 10.137-10.133 2.707 0 5.253 1.055 7.167 2.969 1.915 1.915 2.968 4.462 2.968 7.17 0 5.592-4.544 10.132-10.135 10.132m0-18.373c-4.542 0-8.238 3.696-8.238 8.24 0 1.802.584 3.483 1.583 4.881l-1.685 6.152 6.293-1.65a8.204 8.204 0 0 0 3.792.518h.001c4.54 0 8.24-3.696 8.24-8.24 0-4.545-3.695-8.24-8.24-8.24" />
							</svg>
						</button>
					</div>
				</div>
			</motion.div>

			{/* Individual Item Charts Grid */}
			{
				basket.length > 1 && (
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
				)
			}


			{/* Hidden Share Card for Screenshot Generation */}
			<div id="share-card-container" className="fixed top-0 left-[200vw] pointer-events-none w-[1080px] h-[1080px]">
				{result && (
					<ShareCard
						result={result}
						itemNames={getItemNamesString()}
						spent={result.totalSpent}
						investmentValue={result.investmentValue}
						formattedSpent={formatCurrency(result.totalSpent, result.currency)}
						formattedInvestment={formatCurrency(result.investmentValue, result.currency)}
						tickers={tickers}
					/>
				)}
			</div>
		</motion.div >
	);
};