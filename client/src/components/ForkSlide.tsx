import { motion } from 'framer-motion';
import { useStore } from '../store';
import { Repeat, ShoppingBag } from 'lucide-react';

interface Props {
	onNext: () => void;
}

export const ForkSlide = ({ onNext }: Props) => {
	const { setMode } = useStore();

	const handleSelect = (mode: 'recurring' | 'one-off') => {
		setMode(mode);
		onNext();
	};

	return (
		<div className="h-dvh w-full flex flex-col items-center justify-center p-6 gap-8">
			<motion.h2
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="text-3xl font-bold text-center"
			>
				What's your vice?
			</motion.h2>

			<div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl">
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => handleSelect('recurring')}
					className="flex-1 glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 hover:border-brand-neon transition-colors group"
				>
					<div className="p-4 rounded-full bg-brand-neon/10 text-brand-neon group-hover:bg-brand-neon group-hover:text-brand-dark transition-colors">
						<Repeat size={40} />
					</div>
					<h3 className="text-xl font-bold">Subscriptions</h3>
					<p className="text-gray-400 text-center">Monthly recurring costs like Netflix, Spotify, or Gym.</p>
				</motion.button>

				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => handleSelect('one-off')}
					className="flex-1 glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 hover:border-brand-purple transition-colors group"
				>
					<div className="p-4 rounded-full bg-brand-purple/10 text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-colors">
						<ShoppingBag size={40} />
					</div>
					<h3 className="text-xl font-bold">One-Off Purchase</h3>
					<p className="text-gray-400 text-center">Big ticket items like a GPU, Phone, or Designer Bag.</p>
				</motion.button>
			</div>
		</div>
	);
};
