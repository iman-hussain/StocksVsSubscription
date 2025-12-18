import { motion, type Variants } from 'framer-motion';
import { useStore } from '../store';
import { Repeat, ShoppingBag, ChevronLeft } from 'lucide-react';
import CurrencyRain from './CurrencyRain';

interface Props {
	onNext: () => void;
	onBack: () => void;
}

const cardVariants: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: (custom: number) => ({
		opacity: 1,
		y: 0,
		transition: {
			delay: 0.2 + custom * 0.15,
			duration: 0.6,
			ease: [0.16, 1, 0.3, 1]
		}
	}),
	hover: {
		y: -8,
		transition: { duration: 0.3 }
	}
};

export const ForkSlide = ({ onNext, onBack }: Props) => {
	const { setMode, resetBasket } = useStore();

	const handleSelect = (mode: 'recurring' | 'one-off') => {
		resetBasket(); // Clear basket when switching modes
		setMode(mode);
		onNext();
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="h-dvh w-full flex flex-col items-center justify-center p-6 gap-8 relative overflow-hidden"
		>
			<div className="absolute inset-0">
				<CurrencyRain density={40} />
			</div>
			{/* Header with title and back button */}
<div className="absolute top-4 left-4 z-10 pointer-events-auto">
			<motion.button
				whileHover={{ x: -4 }}
				whileTap={{ scale: 0.95 }}
				onClick={onBack}
				className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
			>
				<ChevronLeft size={20} /> Back
			</motion.button>
			</div>

			<motion.h2
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: "easeOut" }}
				className="text-3xl font-bold text-center"
			>
				What's your vice?
			</motion.h2>

			<div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl pointer-events-auto">
				<motion.button
					custom={0}
					variants={cardVariants}
					initial="hidden"
					animate="visible"
					whileHover="hover"
					whileTap={{ scale: 0.96 }}
					onClick={() => handleSelect('recurring')}
					className="flex-1 rounded-2xl transition-colors group pointer-events-auto"
				>
					<div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 group-hover:border-brand-neon">
					<motion.div
						whileHover={{ rotate: 10, scale: 1.1 }}
						className="p-4 rounded-full bg-brand-neon/10 text-brand-neon group-hover:bg-brand-neon group-hover:text-brand-dark transition-colors"
					>
						<Repeat size={40} />
					</motion.div>
					<h3 className="text-xl font-bold">Subscriptions</h3>
					<p className="text-gray-400 text-center">Monthly recurring costs like Netflix, Spotify, or Gym.</p>
					</div>
				</motion.button>

				<motion.button
					custom={1}
					variants={cardVariants}
					initial="hidden"
					animate="visible"
					whileHover="hover"
					whileTap={{ scale: 0.96 }}
					onClick={() => handleSelect('one-off')}
					className="flex-1 rounded-2xl transition-colors group pointer-events-auto"
				>
					<div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 group-hover:border-brand-purple">
					<motion.div
						whileHover={{ rotate: -10, scale: 1.1 }}
						className="p-4 rounded-full bg-brand-purple/10 text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-colors"
					>
						<ShoppingBag size={40} />
					</motion.div>
					<h3 className="text-xl font-bold">One-Off Purchase</h3>
					<p className="text-gray-400 text-center">Big ticket items like a GPU, Phone, or Designer Bag.</p>
					</div>
				</motion.button>
			</div>
		</motion.div>
	);
};
