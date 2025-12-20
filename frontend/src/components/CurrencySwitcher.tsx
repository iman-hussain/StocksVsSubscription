import { useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

export const CurrencySwitcher = () => {
	const { currency, country, setCountry } = useStore();
	const [isOpen, setIsOpen] = useState(false);

	const currencies = [
		{ id: 'GBP', symbol: '£', label: 'GBP' },
		{ id: 'USD', symbol: '$', label: 'USD' },
		{ id: 'EUR', symbol: '€', label: 'EUR' },
		{ id: 'JPY', symbol: '¥', label: 'JPY' }
	];

	const activeSymbol = currencies.find(c => c.id === currency)?.symbol ?? currency;

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-400 hover:text-white transition-all duration-300"
			>
				<span className="text-brand-neon font-bold text-base leading-none">{activeSymbol}</span>
				<span className="font-mono font-bold">{currency}</span>
			</button>

			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop for closing */}
						<div
							className="fixed inset-0 z-40 bg-transparent"
							onClick={() => setIsOpen(false)}
						/>

						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: -10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: -10 }}
							className="absolute top-full right-0 mt-2 z-50 min-w-[140px] bg-black/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl"
						>
							<div className="p-1">
								{currencies.map((curr) => (
									<button
										key={curr.id}
										onClick={() => {
											setCountry(country, curr.id);
											setIsOpen(false);
										}}
										className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors ${currency === curr.id
											? 'bg-brand-neon/10 text-brand-neon font-bold'
											: 'text-gray-400 hover:bg-white/10 hover:text-white'
											}`}
									>
										<span>{curr.label}</span>
										<span className="opacity-50">{curr.symbol}</span>
									</button>
								))}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
};
