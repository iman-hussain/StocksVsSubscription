import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, ArrowRight } from 'lucide-react';

interface Props {
	onNext: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);
	useEffect(() => {
		const handler = setTimeout(() => setDebouncedValue(value), delay);
		return () => clearTimeout(handler);
	}, [value, delay]);
	return debouncedValue;
}

export const BuilderSlide = ({ onNext }: Props) => {
	const { mode, basket, addToBasket, removeFromBasket, comparisonStock, setComparisonStock, currency } = useStore();

	// New Item State
	const [name, setName] = useState('');
	const [cost, setCost] = useState('');
	const [date, setDate] = useState('2020-01-01');

	// Search State
	const [searchTerm, setSearchTerm] = useState('');
	const debouncedSearch = useDebounce(searchTerm, 500);
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Effect for Search
	useEffect(() => {
		if (debouncedSearch.length > 1) {
			setIsSearching(true);
			fetch(`http://localhost:3000/api/search?q=${debouncedSearch}`)
				.then(res => res.json())
				.then(data => {
					if (data.quotes) setSearchResults(data.quotes);
					setIsSearching(false);
				})
				.catch(() => setIsSearching(false));
		} else {
			setSearchResults([]);
		}
	}, [debouncedSearch]);

	const handleAdd = () => {
		if (!name || !cost) return;
		addToBasket({
			name,
			cost: parseFloat(cost),
			currency: currency,
			startDate: date, // YYYY-MM-DD
			// type is handled by store based on mode
		});
		setName('');
		setCost('');
	};

	const presets = mode === 'recurring' ? [
		{ name: 'Netflix', cost: 15.99 },
		{ name: 'Spotify', cost: 10.99 },
		{ name: 'Gym', cost: 45.00 },
	] : [
		{ name: 'iPhone', cost: 999 },
		{ name: 'Laptop', cost: 1500 },
	];

	return (
		<div className="h-dvh w-full flex flex-col md:flex-row p-6 gap-6 max-w-6xl mx-auto items-center md:items-start pt-20">

			{/* Left Col: Builder */}
			<div className="flex-1 w-full flex flex-col gap-6">
				<h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
					Build your {mode === 'recurring' ? 'Subscription Stack' : 'Shopping Cart'}
				</h2>

				{/* Presets */}
				<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
					{presets.map(p => (
						<button
							key={p.name}
							onClick={() => { setName(p.name); setCost(p.cost.toString()); }}
							className="glass-panel px-4 py-2 rounded-full whitespace-nowrap hover:bg-white/10 transition-colors text-sm"
						>
							+ {p.name}
						</button>
					))}
				</div>

				{/* Input Form */}
				<div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
					<input
						type="text"
						placeholder="Item Name (e.g. Netflix)"
						value={name}
						onChange={e => setName(e.target.value)}
						className="bg-transparent border-b border-white/20 p-2 outline-none focus:border-brand-neon placeholder-gray-600"
					/>
					<div className="flex gap-4">
						<input
							type="text"
							inputMode="decimal"
							placeholder="Cost"
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
					<button
						onClick={handleAdd}
						disabled={!name || !cost}
						className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
					>
						<Plus size={18} /> Add Item
					</button>
				</div>

				{/* Basket List */}
				<div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
					<AnimatePresence>
						{basket.map(item => (
							<motion.div
								key={item.id}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, height: 0 }}
								className="glass-panel p-4 rounded-xl flex justify-between items-center"
							>
								<div>
									<div className="font-bold">{item.name}</div>
									<div className="text-xs text-gray-400">Since {item.startDate}</div>
								</div>
								<div className="flex items-center gap-4">
									<span className="font-mono text-brand-neon">{currency} {item.cost}</span>
									<button onClick={() => removeFromBasket(item.id)} className="text-red-400 hover:text-red-300">
										<Trash2 size={16} />
									</button>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</div>

			{/* Right Col: Comparison Settings */}
			<div className="w-full md:w-1/3 flex flex-col gap-6">
				<div className="glass-panel p-6 rounded-2xl">
					<h3 className="text-xl font-bold mb-4">Compare against?</h3>
					<p className="text-sm text-gray-400 mb-4">Select the stock you "could have bought" instead.</p>

					<div className="relative">
						<Search className="absolute left-3 top-3 text-gray-500" size={18} />
						<input
							type="text"
							placeholder="Search Ticker (e.g. NVDA)"
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-neon transition-colors"
						/>
						{isSearching && (
							<div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-brand-neon border-t-transparent rounded-full animate-spin"></div>
						)}
						{/* Search Results Dropdown */}
						{searchResults.length > 0 && (
							<div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
								{searchResults.map((result: any) => (
									<button
										key={result.symbol}
										onClick={() => {
											setComparisonStock(result.symbol);
											setSearchTerm('');
											setSearchResults([]);
										}}
										className="w-full text-left px-4 py-2 hover:bg-white/10 flex justify-between items-center"
									>
										<span>{result.shortname || result.longname || result.symbol}</span>
										<span className="font-mono text-xs text-gray-400">{result.symbol}</span>
									</button>
								))}
							</div>
						)}
					</div>

					<div className="mt-6">
						<div className="text-sm text-gray-400">Current Base:</div>
						<div className="text-4xl font-bold text-brand-purple tracking-tighter">{comparisonStock}</div>
					</div>
				</div>

				<button
					onClick={onNext}
					disabled={basket.length === 0}
					className="mt-auto bg-brand-neon disabled:opacity-50 disabled:cursor-not-allowed text-brand-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors"
				>
					Reveal Results <ArrowRight size={20} />
				</button>
			</div>
		</div>
	);
};
