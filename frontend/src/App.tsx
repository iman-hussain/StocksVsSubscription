import { useState } from 'react';
import { IntroSlide } from './components/IntroSlide';
import { BuilderSlide } from './components/BuilderSlide';
import { RevealSlide } from './components/RevealSlide';
import { Footer } from './components/Footer';

function App() {
	const [step, setStep] = useState(0);

	const next = () => setStep(s => s + 1);
	const back = () => setStep(s => Math.max(0, s - 1));

	return (
		<div className="w-full min-h-screen font-sans text-white selection:bg-brand-neon selection:text-black flex flex-col">
			<div className="flex-1">
				{step === 0 && <IntroSlide onNext={next} />}
				{step === 1 && <BuilderSlide onNext={next} onBack={back} />}
				{step === 2 && <RevealSlide onBack={back} />}
			</div>
			<Footer />
		</div>
	);
}

export default App;

