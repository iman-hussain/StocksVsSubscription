import { motion } from 'framer-motion';
import { useStore } from '../store';
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
			className="h-dvh w-full flex flex-col items-center justify-center relative isolate overflow-hidden p-6 text-center"
		>
			{/* Rain handles its own Z-index (-1) and pointer-events (none) */}
			<div className="absolute inset-0">
				<CurrencyRain density={40} />
			</div>

			<motion.div
				variants={containerVariants}
				initial="hidden"
				animate="visible"
				className="relative z-10 flex flex-col items-center gap-8 max-w-5xl w-full pointer-events-auto"
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
					className="w-full max-w-2xl"
				>
					<div className="glass-panel p-8 rounded-3xl w-full flex flex-col gap-6">
						<div className="flex flex-col text-center gap-4">
							<label className="text-sm text-gray-400 uppercase tracking-widest font-semibold text-brand-neon">Choose your base currency</label>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								{[
									{ id: 'GBP', symbol: '£', label: 'British Pound' },
									{ id: 'USD', symbol: '$', label: 'US Dollar' },
									{ id: 'EUR', symbol: '€', label: 'Euro' },
									{ id: 'JPY', symbol: '¥', label: 'Japanese Yen' }
								].map((curr) => (
									<motion.button
										key={curr.id}
										whileHover={{ scale: 1.05, y: -2 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => {
											setCountry(country, curr.id);
											onNext();
										}}
										className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 ${currency === curr.id
											? 'bg-brand-neon/20 border-brand-neon text-white shadow-[0_0_20px_rgba(0,244,162,0.2)]'
											: 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/30'
											}`}
									>
										<span className="text-4xl font-bold mb-2">{curr.symbol}</span>
										<span className="text-xs font-bold uppercase tracking-tighter opacity-70">{curr.id}</span>
									</motion.button>
								))}
							</div>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</motion.div>
	);
};