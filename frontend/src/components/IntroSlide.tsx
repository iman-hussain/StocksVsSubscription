import { motion } from 'framer-motion';
import { useStore } from '../store';
import { ChevronRight } from 'lucide-react';
import CurrencyRain from './CurrencyRain';

interface Props {
	onNext: () => void;
}

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15,
			delayChildren: 0.2,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6 },
	},
};

export const IntroSlide = ({ onNext }: Props) => {
	const { country, currency, setCountry } = useStore();

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="h-dvh w-full flex flex-col items-center justify-center relative overflow-hidden p-6 text-center"
		>
			<div className="absolute inset-0">
				<CurrencyRain density={40} />
			</div>

			<motion.div
				variants={containerVariants}
				initial="hidden"
				animate="visible"
				className="z-10 flex flex-col items-center gap-8 max-w-md w-full pointer-events-auto"
			>
				<motion.h1
					variants={itemVariants}
					className="text-5xl md:text-6xl font-bold"
				>
					Stocks vs Subscriptions
				</motion.h1>
				<motion.h2
					variants={itemVariants}
					className="text-2xl md:text-3xl font-bold tracking-tight text-white"
				>
				See what your spending could have become.
				</motion.h2>

				<motion.p variants={itemVariants} className="text-gray-400 text-lg">
					Pick your currency and start.
				</motion.p>

				<motion.div
					variants={itemVariants}
					className="glass-panel p-6 rounded-2xl w-full flex flex-col gap-4"
				>
					<div className="flex flex-col text-left gap-2">
						<label className="text-sm text-gray-400">Currency</label>
						<motion.select
							whileFocus={{ borderColor: '#00f4a2' }}
							value={currency}
							onChange={(e) => setCountry(country, e.target.value)}
						className="bg-black/20 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-brand-neon transition-colors pointer-events-auto"
						>
							<option value="GBP">GBP (£)</option>
							<option value="USD">USD ($)</option>
							<option value="EUR">EUR (€)</option>
							<option value="JPY">JPY (¥)</option>
						</motion.select>
					</div>

					<motion.button
						whileHover={{ scale: 1.02, y: -2 }}
						whileTap={{ scale: 0.98 }}
						onClick={onNext}
						className="mt-4 bg-brand-neon text-brand-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors pointer-events-auto"
					>
						Start <ChevronRight size={20} />
					</motion.button>
				</motion.div>
			</motion.div>
		</motion.div>
	);
};
