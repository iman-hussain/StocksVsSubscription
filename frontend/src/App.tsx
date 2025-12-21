import { useStore } from './store';
import { IntroSlide } from './components/IntroSlide';
import { BuilderSlide } from './components/BuilderSlide';
import { RevealSlide } from './components/RevealSlide';
import { Footer } from './components/Footer';

function App() {
	const { currentStep, setStep } = useStore();

	const next = () => setStep(currentStep + 1);
	const back = () => setStep(Math.max(0, currentStep - 1));

	return (
		<div className="w-full min-h-screen font-sans text-white selection:bg-brand-neon selection:text-black flex flex-col">
			<div className="flex-1">
				{currentStep === 0 && <IntroSlide onNext={next} />}
				{currentStep === 1 && <BuilderSlide onNext={next} onBack={back} />}
				{currentStep === 2 && <RevealSlide onBack={back} />}
			</div>
			<Footer />
		</div>
	);
}

export default App;

