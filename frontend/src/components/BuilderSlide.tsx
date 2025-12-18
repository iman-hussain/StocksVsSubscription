import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowRight, ChevronLeft, X } from 'lucide-react';
import { getSubscriptionPresets, getOneOffPresets, resolveTicker, resolveProduct, SUBSCRIPTION_TICKERS, PRODUCT_DATABASE } from '../lib/tickerMap';
import { resolveQuery, type ResolveResponse } from '../lib/api';
import { convertPrice, getCurrencySymbol } from '../lib/currency';

interface Props {
	onNext: () => void;
	onBack: () => void;
}

interface PresetModalData {
	name: string;
	defaultCost: number;
	defaultDate?: string;
}

export const BuilderSlide = ({ onNext, onBack }: Props) => {
	const { mode, basket, addToBasket, removeFromBasket, currency } = useStore();

	// New Item State
	const [name, setName] = useState('');
	const [cost, setCost] = useState('');
	const [date, setDate] = useState('2020-01-01');
	const [detectedProduct, setDetectedProduct] = useState<{ name: string; cost: number; ticker: string; releaseDate: string } | null>(null);

	// Preset Modal State
	const [presetModal, setPresetModal] = useState<PresetModalData | null>(null);
	const [presetCost, setPresetCost] = useState('');
	const [presetDate, setPresetDate] = useState('2020-01-01');
	const [presetPricingPeriod, setPresetPricingPeriod] = useState<'monthly' | 'yearly'>('monthly');
	const [customPricingPeriod, setCustomPricingPeriod] = useState<'monthly' | 'yearly'>('monthly');
	 const [suggestions, setSuggestions] = useState<Array<{ label: string; ticker: string; price?: number; date?: string; score?: number }>>([]);
	 const [resolved, setResolved] = useState<ResolveResponse | null>(null);
	 const debounceTimer = useRef<number | null>(null);

	// Get presets from ticker map
	const subscriptionPresets = getSubscriptionPresets();
	const oneOffPresets = getOneOffPresets();

	const presets = mode === 'recurring' ? subscriptionPresets : oneOffPresets;

	const openPresetModal = (preset: { name: string; defaultCost?: number; rtp?: number; releaseDate?: string; cost?: number }) => {
		const defaultCost = preset.defaultCost ?? preset.rtp ?? preset.cost ?? 0;
		const defaultDate = preset.releaseDate ?? '2020-01-01';
		setPresetModal({ name: preset.name, defaultCost, defaultDate });
		const convertedCost = mode === 'one-off' ? convertPrice(defaultCost, currency) : defaultCost;
		setPresetCost(convertedCost.toString());
		setPresetDate(defaultDate);
	};

	const confirmPreset = () => {
		if (!presetModal || !presetCost || !presetDate) return;
		addToBasket({
			name: presetModal.name,
			cost: parseFloat(presetCost),
			currency: currency,
			startDate: presetDate,
			ticker: resolveTicker(presetModal.name),
			pricingPeriod: mode === 'recurring' ? presetPricingPeriod : undefined,
		});
		setPresetModal(null);
		setPresetPricingPeriod('monthly');
	};

	 const handleNameChange = (value: string) => {
		setName(value);

		// Build autocomplete suggestions
		const query = value.toLowerCase().trim();
		if (!query) {
			setSuggestions([]);
	 			setResolved(null);
		} else if (mode === 'recurring') {
			const filtered = SUBSCRIPTION_TICKERS
				.filter((s) => s.name.toLowerCase().includes(query) || s.aliases?.some(a => a.toLowerCase().includes(query)))
				.map((s) => ({ label: s.name, ticker: s.ticker, price: convertPrice(s.defaultCost, currency) }));
			setSuggestions(filtered);
		} else {
			const filtered = PRODUCT_DATABASE
				.filter((p) => p.name.toLowerCase().includes(query) || p.aliases.some((a) => a.includes(query)))
					.map((p) => ({ label: p.name, ticker: p.ticker, price: convertPrice(p.rtp, currency), date: p.releaseDate }));
				setSuggestions(filtered);
		}

		// Auto-detect one-off products when in one-off mode
		if (mode === 'one-off' && value.trim()) {
			const product = resolveProduct(value);
			if (product) {
				const convertedPrice = convertPrice(product.rtp, currency);
				setDetectedProduct({
					name: product.name,
					cost: convertedPrice,
					ticker: product.ticker,
					releaseDate: product.releaseDate,
				});
				setCost(convertedPrice.toString());
				setDate(product.releaseDate);
			} else {
				setDetectedProduct(null);
			}
		}

		// Fire off async backend resolve (debounced via effect)
	};

	// Debounced remote resolve for suggestions and best ticker
	useEffect(() => {
		if (debounceTimer.current) {
			window.clearTimeout(debounceTimer.current);
		}

		if (!name.trim() || name.trim().length < 2) {
			setResolved(null);
			return;
		}

		debounceTimer.current = window.setTimeout(async () => {
			try {
				const res = await resolveQuery(name.trim(), {
					purchase: mode === 'one-off',
					limit: 5,
					currency: currency,
				});
				setResolved(res);

				// Merge backend candidates into current suggestions by distinct ticker
				setSuggestions(prev => {
					const seen = new Set(prev.map(p => p.ticker));
					const remote = (res.candidates || []).map(c => ({
						label: (c.shortName || c.longName || c.symbol || '').toString(),
						ticker: c.symbol,
						score: c.score,
					})).filter(r => !seen.has(r.ticker));
					const merged = [...prev, ...remote];
					return merged.slice(0, 8);
				});
			} catch {
				// ignore resolve errors for UX; keep local suggestions
				setResolved(null);
			}
		}, 300);

		return () => {
			if (debounceTimer.current) {
				window.clearTimeout(debounceTimer.current);
				debounceTimer.current = null;
			}
		};
	}, [name, mode, currency]);


	const handleSuggestionPick = (item: { label: string; ticker: string; price?: number; date?: string }) => {
		setName(item.label);
			if (typeof item.price === 'number') setCost(item.price.toString());
			if (item.date) setDate(item.date);
		if (mode === 'one-off') {
				if (typeof item.price === 'number') {
					setDetectedProduct({ name: item.label, cost: item.price, ticker: item.ticker, releaseDate: item.date ?? date });
				} else {
					setDetectedProduct(null);
				}
		} else {
			setDetectedProduct(null);
		}
		setSuggestions([]);
	};

	const handleAdd = () => {
		if (!name || !cost) return;
			const chosenTicker = (detectedProduct?.ticker) || (resolved?.best?.symbol) || resolveTicker(name);
		addToBasket({
			name,
			cost: parseFloat(cost),
			currency: currency,
			startDate: date,
				ticker: chosenTicker,
			pricingPeriod: mode === 'recurring' ? customPricingPeriod : undefined,
		});
		setName('');
		setCost('');
		setDetectedProduct(null);
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="min-h-dvh w-full flex flex-col p-6 pb-24 gap-6 max-w-2xl mx-auto relative z-10"
		>
			{/* Header with title and back button */}
<div className="fixed top-4 left-4 z-50">
			<button
				onClick={onBack}
				className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
			>
				<ChevronLeft size={20} /> Back
			</button>
			</div>

			{/* Preset Modal */}
			<AnimatePresence>
				{presetModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
						onClick={() => setPresetModal(null)}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="w-full max-w-sm"
							onClick={e => e.stopPropagation()}
						>
							<div className="glass-panel glass-panel-opaque p-6 rounded-2xl w-full">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-xl font-bold">Add {presetModal.name}</h3>
								<button onClick={() => setPresetModal(null)} className="text-gray-400 hover:text-white">
									<X size={20} />
								</button>
							</div>

							<div className="flex flex-col gap-4">
								{mode === 'recurring' && (
									<div>
										<label className="text-sm text-gray-400 mb-2 block">Billing Period</label>
										<div className="flex gap-2">
											<button
												onClick={() => setPresetPricingPeriod('monthly')}
												className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
													presetPricingPeriod === 'monthly'
														? 'bg-brand-neon text-brand-dark'
														: 'bg-white/10 text-gray-400 hover:bg-white/20'
												}`}
											>
												Monthly
											</button>
											<button
												onClick={() => setPresetPricingPeriod('yearly')}
												className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
													presetPricingPeriod === 'yearly'
														? 'bg-brand-neon text-brand-dark'
														: 'bg-white/10 text-gray-400 hover:bg-white/20'
												}`}
											>
												Yearly
											</button>
										</div>
									</div>
								)}

								<div>
									<label className="text-sm text-gray-400 mb-1 block">
									{mode === 'recurring' ? `${presetPricingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Cost` : 'Price'}
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{getCurrencySymbol(currency)}</span>
									<input
										type="text"
										inputMode="decimal"
										value={presetCost}
										onChange={e => setPresetCost(e.target.value)}
										className="w-full bg-black/40 border border-white/20 rounded-lg p-3 pl-8 outline-none focus:border-brand-neon"
									/>
								</div>
								</div>
								<div>
									<label className="text-sm text-gray-400 mb-1 block">Start Date</label>
									<input
										type="date"
										value={presetDate}
										onChange={e => setPresetDate(e.target.value)}
										className="w-full bg-black/40 border border-white/20 rounded-lg p-3 outline-none focus:border-brand-neon text-white"
									/>
								</div>

								<button
									onClick={confirmPreset}
									disabled={!presetCost || !presetDate}
									className="bg-brand-neon disabled:opacity-50 text-brand-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors mt-2"
								>
									<Plus size={18} /> Add to Stack
								</button>
							</div>
						</div>
					</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Builder */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="w-full flex flex-col gap-6"
			>
				<h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent text-center">
					Build your {mode === 'recurring' ? 'Subscription Stack' : 'Shopping Cart'}
				</h2>

				{/* Presets - click to open modal (page handles scroll) */}
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 justify-center max-h-40 overflow-y-auto pr-1">
					{presets.map((p, idx) => (
						<motion.button
							key={p.name}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.05 * idx, duration: 0.4 }}
							whileHover={{ scale: 1.05, y: -2 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => openPresetModal(p)}
							className="glass-panel px-4 py-2 rounded-full whitespace-nowrap hover:bg-brand-neon/20 hover:border-brand-neon transition-colors text-sm"
						>
							+ {p.name}
						</motion.button>
					))}
				</div>

				{/* Custom Input Form */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2, duration: 0.5 }}
					className=""
				>
					<div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
					<p className="text-sm text-gray-400 text-center">Or add a custom item:</p>
					<input
						type="text"
						placeholder={mode === 'one-off' ? "Item Name (e.g. iPhone, PS5, MacBook Pro)" : "Item Name (e.g. Audible)"}
						value={name}
						onChange={e => handleNameChange(e.target.value)}
						className="bg-transparent border-b border-white/20 p-2 outline-none focus:border-brand-neon placeholder-gray-600"
					/>
					{suggestions.length > 0 && (
						<div className="mt-2 bg-black/60 border border-white/10 rounded-xl p-3 grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
							{suggestions.map((s, idx) => (
								<button
									key={`${s.label}-${idx}`}
									onClick={() => handleSuggestionPick(s)}
									className="text-left text-xs bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
								>
									<div className="font-semibold truncate">{s.label} ({s.ticker})</div>
									{typeof s.price === 'number' && (
									  <div className="text-gray-400">{getCurrencySymbol(currency)}{s.price.toFixed(2)}</div>
									)}
								</button>
							))}
						</div>
					)}
					<AnimatePresence>
						{detectedProduct && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								className="text-xs text-brand-neon bg-brand-neon/10 p-2 rounded flex items-center justify-between"
							>
								<span>Detected: {detectedProduct.name} • {detectedProduct.ticker}</span>
								<span className="font-bold">{getCurrencySymbol(currency)}{detectedProduct.cost}</span>
							</motion.div>
						)}
					</AnimatePresence>
					{mode === 'recurring' && (
						<div className="flex gap-2 text-xs">
							<button
								onClick={() => setCustomPricingPeriod('monthly')}
								className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${customPricingPeriod === 'monthly' ? 'bg-brand-neon text-brand-dark' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
							>
								Monthly
							</button>
							<button
								onClick={() => setCustomPricingPeriod('yearly')}
								className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${customPricingPeriod === 'yearly' ? 'bg-brand-neon text-brand-dark' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
							>
								Yearly
							</button>
						</div>
					)}
					<div className="flex flex-col sm:flex-row gap-4">
						<input
							type="text"
							inputMode="decimal"
							placeholder={mode === 'recurring' ? `${customPricingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Cost` : "One-off Cost"}
							value={cost}
							onChange={e => setCost(e.target.value)}
							className="flex-1 bg-transparent border-b border-white/20 p-2 outline-none focus:border-brand-neon placeholder-gray-600"
						/>
						<input
							type="date"
							value={date}
							onChange={e => setDate(e.target.value)}
							className="flex-1 bg-transparent border-b border-white/20 p-2 outline-none focus:border-brand-neon text-white/50"
						/>
					</div>
						<motion.button
						whileHover={{ scale: 1.02, y: -2 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleAdd}
						disabled={!name || !cost}
						className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
					>
						<Plus size={18} /> Add Custom Item
					</motion.button>
					</div>
				</motion.div>

				{/* Basket List */}
				<AnimatePresence>
					{basket.length > 0 && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className="flex flex-col gap-2"
						>
							<div className="text-sm text-gray-400 text-center mb-2">
								{mode === 'recurring' ? (
									<>
										<p className="font-semibold">Your Subscription Stack ({basket.length} items)</p>
										<p className="text-xs text-gray-500 mt-1">
											Monthly recurring costs analysed over time
										</p>
									</>
								) : (
									<>
										<p className="font-semibold">Your Shopping Cart ({basket.length} items)</p>
										<p className="text-xs text-brand-purple/80 mt-1 font-medium">
											One-off purchases tracked separately from subscriptions
										</p>
									</>
								)}
							</div>
							<AnimatePresence>
								{basket.map((item, idx) => (
									<motion.div
										key={item.id}
										initial={{ opacity: 0, x: -20, scale: 0.95 }}
										animate={{ opacity: 1, x: 0, scale: 1 }}
										exit={{ opacity: 0, height: 0, x: -20 }}
										transition={{ delay: 0.05 * idx, duration: 0.3 }}
										whileHover={{ x: 4 }}
										className=""
									>
										<div className="glass-panel p-4 rounded-xl flex justify-between items-center group">
											<div>
											<div className="font-bold">{item.name}</div>
											<div className="text-xs text-gray-400">
												{mode === 'recurring' ? 'Since' : 'Purchase date'} {item.startDate} • {item.ticker}
											</div>
										</div>
										<div className="flex items-center gap-4">
										<span className="font-mono text-brand-neon">{getCurrencySymbol(currency)}{item.cost}</span>
											<motion.button
												whileHover={{ scale: 1.2, rotate: 90 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => removeFromBasket(item.id)}
												className="text-red-400 hover:text-red-300"
											>
												<Trash2 size={16} />
											</motion.button>
										</div>
										</div>
									</motion.div>
								))}
							</AnimatePresence>
						</motion.div>
					)}
				</AnimatePresence>

				<motion.button
					whileHover={{ scale: 1.02, y: -2 }}
					whileTap={{ scale: 0.98 }}
					onClick={onNext}
					disabled={basket.length === 0}
					className="bg-brand-neon disabled:opacity-50 disabled:cursor-not-allowed text-brand-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors"
				>
					Reveal Results <ArrowRight size={20} />
				</motion.button>
			</motion.div>
		</motion.div>
	);
};
