import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowRight, ChevronLeft, X, Repeat, ShoppingBag, Coffee, Flame } from 'lucide-react';
import { fetchPresets, resolveTicker, resolveProduct, type PresetsResponse } from '../lib/tickerMap';
import { resolveQuery, type ResolveResponse } from '../lib/api';
import { convertPrice, formatCurrency, getCurrencySymbol } from '../lib/currency';
import { CurrencySwitcher } from './CurrencySwitcher';
import type { SpendFrequency } from '../lib/financials';

interface Props {
	onNext: () => void;
	onBack: () => void;
	isDesktopSplit?: boolean;
}


interface PresetModalData {
	name: string;
	defaultCost: number;
	defaultDate?: string;
	ticker?: string;
	defaultFrequency: SpendFrequency;
}

// Frequency options for the dropdown
const FREQUENCY_OPTIONS: { value: SpendFrequency; label: string }[] = [
	{ value: 'one-off', label: 'One-off' },
	{ value: 'daily', label: 'Daily' },
	{ value: 'workdays', label: 'Workdays (Mon-Fri)' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'yearly', label: 'Yearly' },
];

// Frequency badge display helper
const getFrequencyBadge = (frequency: SpendFrequency): { label: string; color: string } => {
	switch (frequency) {
		case 'one-off': return { label: 'Once', color: 'bg-purple-500/20 text-purple-300' };
		case 'daily': return { label: 'Daily', color: 'bg-red-500/20 text-red-300' };
		case 'workdays': return { label: 'Workdays', color: 'bg-orange-500/20 text-orange-300' };
		case 'weekly': return { label: 'Weekly', color: 'bg-blue-500/20 text-blue-300' };
		case 'monthly': return { label: 'Monthly', color: 'bg-green-500/20 text-green-300' };
		case 'yearly': return { label: 'Yearly', color: 'bg-teal-500/20 text-teal-300' };
		default: return { label: frequency, color: 'bg-gray-500/20 text-gray-300' };
	}
};

// Ticker to company name mapping for grouping
const TICKER_COMPANY_NAMES: Record<string, string> = {
	'AAPL': 'Apple',
	'MSFT': 'Microsoft',
	'GOOGL': 'Google',
	'AMZN': 'Amazon',
	'META': 'Meta',
	'SONY': 'Sony',
	'NTDOY': 'Nintendo',
	'NVDA': 'NVIDIA',
	'AMD': 'AMD',
	'INTC': 'Intel',
	'005930.KS': 'Samsung',
	'TSLA': 'Tesla',
	'MU': 'Micron Technology',
	'DELL': 'Dell',
	'LOGI': 'Logitech',
	'F': 'Ford',
	'HMC': 'Honda',
	'TM': 'Toyota',
	'HYMLF': 'Hyundai',
	'SN': 'SharkNinja',
	'CRSR': 'Corsair',
	'STX': 'Seagate',
	'PHG': 'Philips',
	'IRBT': 'iRobot',
	'SONO': 'Sonos',
	'GRMN': 'Garmin',
	'GPRO': 'GoPro',
	'PTON': 'Peloton',
	'ROKU': 'Roku',
	'ADT': 'ADT',
	'ARLO': 'Arlo',
};

export const BuilderSlide = ({ onNext, onBack, isDesktopSplit = false }: Props) => {
	const { basket, addToBasket, updateInBasket, removeFromBasket, currency } = useStore();

	// Preset tab state
	const [activeTab, setActiveTab] = useState<'subscriptions' | 'habits' | 'one-off'>('subscriptions');

	// New Item State
	const [name, setName] = useState('');
	const [cost, setCost] = useState('');
	const [date, setDate] = useState('2020-01-01');
	const [frequency, setFrequency] = useState<SpendFrequency>('monthly');
	const [detectedProduct, setDetectedProduct] = useState<{ name: string; cost: number; ticker: string; releaseDate: string } | null>(null);

	// Preset Modal State
	const [presetModal, setPresetModal] = useState<PresetModalData | null>(null);
	const [presetCost, setPresetCost] = useState('');
	const [presetDate, setPresetDate] = useState('2020-01-01');
	const [presetFrequency, setPresetFrequency] = useState<SpendFrequency>('monthly');
	const [suggestions, setSuggestions] = useState<Array<{ label: string; ticker: string; price?: number; date?: string; score?: number }>>([]);
	const [resolved, setResolved] = useState<ResolveResponse | null>(null);

	// Edit Modal State
	const [editModal, setEditModal] = useState<{ id: string; name: string; cost: string; date: string; frequency: SpendFrequency; ticker: string } | null>(null);

	const debounceTimer = useRef<number | null>(null);

	// Presets loaded from API
	const [presetsData, setPresetsData] = useState<PresetsResponse | null>(null);
	const [, setPresetsLoading] = useState(true);

	// Fetch presets on mount
	useEffect(() => {
		let cancelled = false;
		fetchPresets()
			.then((data) => {
				if (!cancelled) {
					setPresetsData(data);
					setPresetsLoading(false);
				}
			})
			.catch((err) => {
				console.error('Failed to fetch presets:', err);
				if (!cancelled) setPresetsLoading(false);
			});
		return () => { cancelled = true; };
	}, []);

	// Derive presets from API data
	const subscriptionPresets = presetsData?.subscriptions ?? [];
	const oneOffPresets = presetsData?.products ?? [];
	const habitPresets = presetsData?.habits ?? [];

	const openPresetModal = (preset: { name: string; defaultCost?: number; rtp?: number; releaseDate?: string; cost?: number; ticker?: string; defaultFrequency?: SpendFrequency }) => {
		const isSubscription = activeTab === 'subscriptions';
		const isHabit = activeTab === 'habits';
		const defaultCost = preset.defaultCost ?? preset.rtp ?? preset.cost ?? 0;
		const defaultDate = preset.releaseDate ?? '2020-01-01';

		let defaultFreq: SpendFrequency = 'monthly';
		if (isSubscription) defaultFreq = 'monthly';
		else if (isHabit) defaultFreq = preset.defaultFrequency ?? 'daily';
		else defaultFreq = 'one-off';

		setPresetModal({ name: preset.name, defaultCost, defaultDate, ticker: preset.ticker, defaultFrequency: defaultFreq });
		const convertedCost = (!isSubscription && !isHabit) ? convertPrice(defaultCost, currency) : defaultCost;
		setPresetCost(convertedCost.toString());
		setPresetDate(defaultDate);
		setPresetFrequency(defaultFreq);
	};

	const confirmPreset = () => {
		if (!presetModal || !presetCost || !presetDate) return;
		addToBasket({
			name: presetModal.name,
			cost: parseFloat(presetCost),
			currency: currency,
			startDate: presetDate,
			ticker: presetModal.ticker ?? resolveTicker(presetModal.name, subscriptionPresets),
			frequency: presetFrequency,
		});
		setPresetModal(null);
		setPresetFrequency('monthly');
	};

	const openEditModal = (item: { id: string; name: string; cost: number; startDate: string; frequency: SpendFrequency; ticker: string }) => {
		setEditModal({
			id: item.id,
			name: item.name,
			cost: item.cost.toString(),
			date: item.startDate,
			frequency: item.frequency,
			ticker: item.ticker,
		});
	};

	const saveEdit = () => {
		if (!editModal || !editModal.cost || !editModal.date) return;
		updateInBasket(editModal.id, {
			name: editModal.name,
			cost: parseFloat(editModal.cost),
			startDate: editModal.date,
			frequency: editModal.frequency,
			ticker: editModal.ticker, // Allow updating if implemented, for now preserves existing or edits
		});
		setEditModal(null);
	};

	const handleNameChange = (value: string) => {
		setName(value);

		// Build autocomplete suggestions - search both databases
		const query = value.toLowerCase().trim();
		if (!query) {
			setSuggestions([]);
			setResolved(null);
			setDetectedProduct(null);
		} else {
			// Search subscriptions
			const subFiltered = subscriptionPresets
				.filter((s) => s.name.toLowerCase().includes(query) || s.aliases?.some(a => a.toLowerCase().includes(query)))
				.map((s) => ({ label: s.name, ticker: s.ticker, price: convertPrice(s.defaultCost, currency) }));

			// Search products
			const prodFiltered = oneOffPresets
				.filter((p) => p.name.toLowerCase().includes(query) || p.aliases.some((a) => a.includes(query)))
				.map((p) => ({ label: p.name, ticker: p.ticker, price: convertPrice(p.rtp, currency), date: p.releaseDate }));

			// Combine and limit
			setSuggestions([...subFiltered, ...prodFiltered].slice(0, 8));

			// Try to detect a product for auto-fill
			const product = resolveProduct(value, oneOffPresets);
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
				setFrequency('one-off'); // Products default to one-off
			} else {
				setDetectedProduct(null);
			}
		}
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
					purchase: frequency === 'one-off',
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
	}, [name, frequency, currency]);


	const handleSuggestionPick = (item: { label: string; ticker: string; price?: number; date?: string }) => {
		setName(item.label);
		if (typeof item.price === 'number') setCost(item.price.toString());
		if (item.date) {
			setDate(item.date);
			setFrequency('one-off'); // If has a date, likely a product
		}
		if (typeof item.price === 'number' && item.date) {
			setDetectedProduct({ name: item.label, cost: item.price, ticker: item.ticker, releaseDate: item.date });
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
			frequency: frequency,
		});
		setName('');
		setCost('');
		setDetectedProduct(null);
		setFrequency('monthly');
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className={`w-full flex flex-col gap-6 relative z-10 ${isDesktopSplit ? 'min-h-0 p-6' : 'min-h-dvh p-6 pt-24 pb-24 max-w-2xl mx-auto'}`}
		>
			{/* Header with title and back button */}
			<div className={isDesktopSplit
				? "sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md -mx-6 px-6 py-4 mb-2 border-b border-white/5 flex justify-between items-center"
				: "fixed top-4 inset-x-0 z-50 pointer-events-none"
			}>
				<div className={isDesktopSplit ? "w-full flex justify-between items-center" : "max-w-7xl mx-auto px-6 flex justify-between items-center w-full"}>
					<button
						onClick={onBack}
						className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-400 hover:text-white transition-all duration-300 pointer-events-auto"
					>
						<ChevronLeft size={16} className="text-brand-neon" />
						<span className="font-bold">Back</span>
					</button>

					<div className="pointer-events-auto">
						<CurrencySwitcher />
					</div>
				</div>
			</div>

			{/* Edit Modal */}
			<AnimatePresence>
				{editModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
						onClick={() => setEditModal(null)}
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
									<h3 className="text-xl font-bold">Edit Item</h3>
									<button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-white">
										<X size={20} />
									</button>
								</div>

								<div className="flex flex-col gap-4">
									{/* Name Editor */}
									<div>
										<label className="text-sm text-gray-400 mb-1 block">Name</label>
										<input
											type="text"
											value={editModal.name}
											onChange={e => setEditModal({ ...editModal, name: e.target.value })}
											className="w-full bg-black/40 border border-white/20 rounded-lg p-3 outline-none focus:border-brand-neon text-white"
										/>
									</div>

									{/* Frequency Selector */}
									<div>
										<label className="text-sm text-gray-400 mb-2 block">Frequency</label>
										<select
											value={editModal.frequency}
											onChange={e => setEditModal({ ...editModal, frequency: e.target.value as SpendFrequency })}
											className="w-full bg-black/40 border border-white/20 rounded-lg p-3 outline-none focus:border-brand-neon text-white"
										>
											{FREQUENCY_OPTIONS.map(opt => (
												<option key={opt.value} value={opt.value}>{opt.label}</option>
											))}
										</select>
									</div>

									<div>
										<label className="text-sm text-gray-400 mb-1 block">Cost</label>
										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{getCurrencySymbol(currency)}</span>
											<input
												type="text"
												inputMode="decimal"
												value={editModal.cost}
												onChange={e => setEditModal({ ...editModal, cost: e.target.value })}
												className="w-full bg-black/40 border border-white/20 rounded-lg p-3 pl-8 outline-none focus:border-brand-neon"
											/>
										</div>
									</div>
									<div>
										<label className="text-sm text-gray-400 mb-1 block">
											{editModal.frequency === 'one-off' ? 'Purchase Date' : 'Start Date'}
										</label>
										<input
											type="date"
											value={editModal.date}
											onChange={e => setEditModal({ ...editModal, date: e.target.value })}
											className="w-full bg-black/40 border border-white/20 rounded-lg p-3 outline-none focus:border-brand-neon text-white"
										/>
									</div>

									<button
										onClick={saveEdit}
										disabled={!editModal.name || !editModal.cost || !editModal.date}
										className="bg-brand-neon disabled:opacity-50 text-brand-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors mt-2"
									>
										Save Changes
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

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
									{/* Frequency Selector */}
									<div>
										<label className="text-sm text-gray-400 mb-2 block">Frequency</label>
										<select
											value={presetFrequency}
											onChange={e => setPresetFrequency(e.target.value as SpendFrequency)}
											className="w-full bg-black/40 border border-white/20 rounded-lg p-3 outline-none focus:border-brand-neon text-white"
										>
											{FREQUENCY_OPTIONS.map(opt => (
												<option key={opt.value} value={opt.value}>{opt.label}</option>
											))}
										</select>
									</div>

									<div>
										<label className="text-sm text-gray-400 mb-1 block">Cost</label>
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
										<label className="text-sm text-gray-400 mb-1 block">
											{presetFrequency === 'one-off' ? 'Purchase Date' : 'Start Date'}
										</label>
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
					Build your Expense Stack
				</h2>

				{/* Preset Tabs - Tab-like styling */}
				<div className="border-b border-white/10">
					<div className="flex justify-center gap-0">
						<button
							onClick={() => setActiveTab('subscriptions')}
							className={`relative flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'subscriptions'
								? 'text-brand-neon'
								: 'text-gray-400 hover:text-gray-200'
								}`}
						>
							<Repeat size={16} /> Subscriptions
							{activeTab === 'subscriptions' && (
								<motion.div
									layoutId="activeTab"
									className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-neon"
								/>
							)}
						</button>
						<button
							onClick={() => setActiveTab('habits')}
							className={`relative flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'habits'
								? 'text-brand-neon'
								: 'text-gray-400 hover:text-gray-200'
								}`}
						>
							<Coffee size={16} /> Habits
							{activeTab === 'habits' && (
								<motion.div
									layoutId="activeTab"
									className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-neon"
								/>
							)}
						</button>
						<button
							onClick={() => setActiveTab('one-off')}
							className={`relative flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'one-off'
								? 'text-brand-neon'
								: 'text-gray-400 hover:text-gray-200'
								}`}
						>
							<ShoppingBag size={16} /> Purchases
							{activeTab === 'one-off' && (
								<motion.div
									layoutId="activeTab"
									className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-neon"
								/>
							)}
						</button>
					</div>
				</div>

				{/* Presets - Subscriptions: simple grid, One-off: grouped by ticker */}
				<div className="max-h-48 overflow-y-auto pr-1">
					{activeTab === 'habits' ? (
						<div className="flex flex-col gap-6">
							{/* Popular Habits */}
							<div>
								<div className="text-xs text-brand-neon font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
									<Flame size={12} fill="currentColor" /> Popular
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{habitPresets.slice(0, 3).map((p, idx) => (
										<motion.button
											key={p.name}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.02 * idx, duration: 0.3 }}
											whileHover={{ scale: 1.03, y: -1 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => openPresetModal(p)}
											className="glass-panel px-3 py-2 rounded-lg hover:bg-brand-neon/20 hover:border-brand-neon transition-colors text-sm text-left h-full break-words leading-tight bg-brand-neon/5 border-brand-neon/20"
											title={p.name}
										>
											<div className="font-semibold">{p.name}</div>
											<div className="text-xs text-gray-400 mt-1">
												{getFrequencyBadge(p.defaultFrequency).label} • <span className="text-gray-500 font-mono">{p.ticker}</span>
											</div>
										</motion.button>
									))}
								</div>
							</div>

							{/* All Habits */}
							<div className="flex flex-col gap-4">
								<div className="text-xs text-gray-500 font-bold uppercase tracking-wider border-t border-white/10 pt-4">
									More Habits
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{habitPresets.slice(3).map((p, idx) => (
										<motion.button
											key={p.name}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.02 * (idx + 3), duration: 0.3 }}
											whileHover={{ scale: 1.03, y: -1 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => openPresetModal(p)}
											className="glass-panel px-3 py-2 rounded-lg whitespace-nowrap hover:bg-brand-neon/20 hover:border-brand-neon transition-colors text-sm text-left"
										>
											<div className="font-semibold text-xs sm:text-sm truncate" title={p.name}>{p.name}</div>
											<div className="text-[10px] text-gray-400 flex justify-between items-center mt-0.5">
												<span>{getFrequencyBadge(p.defaultFrequency).label}</span>
												<span className="text-gray-500 font-mono opacity-50">{p.ticker}</span>
											</div>
										</motion.button>
									))}
								</div>
							</div>
						</div>
					) : activeTab === 'subscriptions' ? (
						<div className="flex flex-col gap-6">
							{/* Popular Subscriptions */}
							<div>
								<div className="text-xs text-brand-neon font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
									<Flame size={12} fill="currentColor" /> Popular
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{subscriptionPresets.slice(0, 3).map((p, idx) => (
										<motion.button
											key={p.name}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.02 * idx, duration: 0.3 }}
											whileHover={{ scale: 1.03, y: -1 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => openPresetModal(p)}
											className="glass-panel px-3 py-2 rounded-lg hover:bg-brand-neon/20 hover:border-brand-neon transition-colors text-sm text-left h-full break-words leading-tight bg-brand-neon/5 border-brand-neon/20"
											title={p.name}
										>
											<div className="font-semibold">{p.name}</div>
											<div className="text-xs text-gray-400 mt-1">
												£{p.defaultCost} • <span className="text-gray-500 font-mono">{p.ticker}</span>
											</div>
										</motion.button>
									))}
								</div>
							</div>

							{/* All Subscriptions by Category */}
							<div className="flex flex-col gap-4">
								<div className="text-xs text-gray-500 font-bold uppercase tracking-wider border-t border-white/10 pt-4">
									All Subscriptions
								</div>
								{Object.entries(
									subscriptionPresets.reduce((acc, p) => {
										const category = p.category || 'Other';
										if (!acc[category]) acc[category] = [];
										acc[category].push(p);
										return acc;
									}, {} as Record<string, typeof subscriptionPresets>)
								).sort().map(([category, items]) => (
									<div key={category}>
										<div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
											{category}
										</div>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
											{items.map((p, idx) => (
												<motion.button
													key={p.name}
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: 0.02 * idx, duration: 0.3 }}
													whileHover={{ scale: 1.03, y: -1 }}
													whileTap={{ scale: 0.98 }}
													onClick={() => openPresetModal(p)}
													className="glass-panel px-3 py-2 rounded-lg whitespace-nowrap hover:bg-brand-neon/20 hover:border-brand-neon transition-colors text-sm text-left"
												>
													<div className="font-semibold text-xs truncate" title={p.name}>{p.name}</div>
													<div className="text-[10px] text-gray-500 font-mono opacity-50">{p.ticker}</div>
												</motion.button>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						/* One-off presets grouped by ticker/company */
						<div className="flex flex-col gap-6">
							{/* Popular Section */}
							<div>
								<div className="text-xs text-brand-neon font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
									<Flame size={12} fill="currentColor" /> Popular
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{[
										{ name: 'Tesla Model 3', defaultCost: 38900, ticker: 'TSLA', releaseDate: '2019-06-01' },
										{ name: 'iPhone 11 64GB', defaultCost: 699, ticker: 'AAPL', releaseDate: '2019-09-20' },
										{ name: 'MacBook Air 13" M1 (Late 2020)', defaultCost: 999, ticker: 'AAPL', releaseDate: '2020-11-17' },
									].map((p, idx) => (
										<motion.button
											key={p.name}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.02 * idx, duration: 0.3 }}
											whileHover={{ scale: 1.03, y: -1 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => openPresetModal(p)}
											className="glass-panel px-3 py-2 rounded-lg hover:bg-brand-neon/20 hover:border-brand-neon transition-colors text-sm text-left h-full break-words leading-tight bg-brand-neon/5 border-brand-neon/20"
											title={p.name}
										>
											<div className="font-semibold">{p.name}</div>
											<div className="text-xs text-gray-400 mt-1">
												£{p.defaultCost} • <span className="text-gray-500 font-mono">{p.ticker}</span>
											</div>
										</motion.button>
									))}
								</div>
							</div>

							{/* All Brands List */}
							<div className="flex flex-col gap-4">
								<div className="text-xs text-gray-500 font-bold uppercase tracking-wider border-t border-white/10 pt-4">
									All Brands
								</div>
								{Object.entries(
									oneOffPresets.reduce((acc, p) => {
										const key = p.ticker;
										if (!acc[key]) acc[key] = [];
										acc[key].push(p);
										return acc;
									}, {} as Record<string, typeof oneOffPresets>)
								).map(([ticker, items]) => (
									<div key={ticker}>
										<div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
											{TICKER_COMPANY_NAMES[ticker] || ticker}
										</div>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
											{items.map((p, idx) => (
												<motion.button
													key={p.name}
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: 0.02 * idx, duration: 0.3 }}
													whileHover={{ scale: 1.03, y: -1 }}
													whileTap={{ scale: 0.98 }}
													onClick={() => openPresetModal(p)}
													className="glass-panel px-3 py-2 rounded-lg hover:bg-brand-neon/20 hover:border-brand-neon transition-colors text-sm text-left h-full break-words leading-tight"
													title={p.name}
												>
													+ {p.name}
												</motion.button>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Custom Input Form */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2, duration: 0.5 }}
				>
					<div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
						<p className="text-sm text-gray-400 text-center">Or add a custom item:</p>
						<input
							type="text"
							placeholder="Item Name (e.g. Netflix, iPhone, Coffee)"
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
											<div className="text-gray-400">{formatCurrency(s.price, currency)}</div>
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
									<span className="font-bold">{formatCurrency(detectedProduct.cost, currency)}</span>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Frequency Selector for Custom Items */}
						<div>
							<label className="text-sm text-gray-400 mb-1 block">Frequency</label>
							<select
								value={frequency}
								onChange={e => setFrequency(e.target.value as SpendFrequency)}
								className="w-full bg-black/40 border border-white/20 rounded-lg p-2 outline-none focus:border-brand-neon text-white text-sm"
							>
								{FREQUENCY_OPTIONS.map(opt => (
									<option key={opt.value} value={opt.value}>{opt.label}</option>
								))}
							</select>
						</div>

						<div className="flex flex-col sm:flex-row gap-4">
							<div className="flex-1 min-w-0">
								<input
									type="text"
									inputMode="decimal"
									placeholder="Cost"
									value={cost}
									onChange={e => setCost(e.target.value)}
									className="w-full bg-transparent border-b border-white/20 p-2 outline-none focus:border-brand-neon placeholder-gray-600"
								/>
							</div>
							<div className="flex-1 min-w-0">
								<input
									type="date"
									value={date}
									onChange={e => setDate(e.target.value)}
									className="w-full bg-transparent border-b border-white/20 p-2 outline-none focus:border-brand-neon text-white/50"
								/>
							</div>
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
								<p className="font-semibold">Your Expense Stack ({basket.length} items)</p>
								<p className="text-xs text-gray-500 mt-1">
									Mixed subscriptions and purchases analysed together
								</p>
							</div>
							<AnimatePresence>
								{basket.map((item, idx) => {
									const badge = getFrequencyBadge(item.frequency);
									return (
										<motion.div
											key={item.id}
											role="button"
											tabIndex={0}
											aria-label={`Edit ${item.name}`}
											initial={{ opacity: 0, x: -20, scale: 0.95 }}
											animate={{ opacity: 1, x: 0, scale: 1 }}
											exit={{ opacity: 0, height: 0, x: -20 }}
											transition={{ delay: 0.05 * idx, duration: 0.3 }}
											whileHover={{ x: 4 }}
											onClick={() => openEditModal(item)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													openEditModal(item);
												}
											}}
											className="w-full text-left focus:outline-none focus:ring-2 focus:ring-brand-neon/50 rounded-xl cursor-pointer"
										>
											<div className="glass-panel p-4 rounded-xl flex justify-between items-center group">
												<div>
													<div className="font-bold flex items-center gap-2">
														{item.name}
														<span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
															{badge.label}
														</span>
													</div>
													<div className="text-xs text-gray-400">
														{item.frequency === 'one-off' ? 'Purchase' : 'Since'} {item.startDate} • {item.ticker}
													</div>
												</div>
												<div className="flex items-center gap-4">
													<span className="font-mono text-brand-neon">{formatCurrency(item.cost, currency)}</span>
													<motion.button
														type="button"
														aria-label={`Remove ${item.name}`}
														whileHover={{ scale: 1.2, rotate: 90 }}
														whileTap={{ scale: 0.9 }}
														onClick={(e) => {
															e.stopPropagation();
															removeFromBasket(item.id);
														}}
														className="text-red-400 hover:text-red-300"
													>
														<Trash2 size={16} />
													</motion.button>
												</div>
											</div>
										</motion.div>
									);
								})}
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
