import { useState } from 'react';
import { IntroSlide } from './components/IntroSlide';
import { ForkSlide } from './components/ForkSlide';
import { BuilderSlide } from './components/BuilderSlide';
import { RevealSlide } from './components/RevealSlide';

function App() {
	const [step, setStep] = useState(0);

	const next = () => setStep(s => s + 1);

	return (
		<div className="w-full min-h-screen font-sans text-white selection:bg-brand-neon selection:text-black">
			{step === 0 && <IntroSlide onNext={next} />}
			{step === 1 && <ForkSlide onNext={next} />}
			{step === 2 && <BuilderSlide onNext={next} />}
			{step === 3 && <RevealSlide />}
		</div>
	);
}

export default App;
