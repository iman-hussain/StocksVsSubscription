import { motion } from 'framer-motion';
import { useStore } from '../store';
import { ChevronRight } from 'lucide-react';

interface Props {
	onNext: () => void;
}

export const IntroSlide = ({ onNext }: Props) => {
	const { country, currency, setCountry } = useStore();

	return (
		<div className="h-dvh w-full flex flex-col items-center justify-center relative overflow-hidden p-6 text-center">
			{/* Background Orbs */}
			<div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-neon opacity-20 blur-[100px] rounded-full animate-pulse" />
			<div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-purple opacity-20 blur-[120px] rounded-full" />

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
				className="z-10 flex flex-col items-center gap-8 max-w-md w-full"
			>
				<h1 className="font-bold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
					Stocks Vs<br />Subscriptions
				</h1>

				<p className="text-gray-400 text-lg">
					See what your spending could have become.
				</p>

				<div className="glass-panel p-6 rounded-2xl w-full flex flex-col gap-4">
					<div className="flex flex-col text-left gap-2">
						<label className="text-sm text-gray-400">Currency</label>
						<select
							value={currency}
							onChange={(e) => setCountry(country, e.target.value)}
							className="bg-black/20 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-brand-neon transition-colors"
						>
							<option value="GBP">GBP (£)</option>
							<option value="USD">USD ($)</option>
							<option value="EUR">EUR (€)</option>
							<option value="JPY">JPY (¥)</option>
						</select>
					</div>

					<button
						onClick={onNext}
						className="mt-4 bg-brand-neon text-brand-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors"
					>
						Start <ChevronRight size={20} />
					</button>
				</div>
			</motion.div>
		</div>
	);
};
