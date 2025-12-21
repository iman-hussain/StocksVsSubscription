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
			{/* Intro Slide (Always full screen if active) */}
			{currentStep === 0 ? (
				<IntroSlide onNext={next} />
			) : (
				<>
					{/* Mobile/Tablet View (< 1024px) */}
					<div className="lg:hidden flex-1 flex flex-col w-full">
						{currentStep === 1 && <BuilderSlide onNext={next} onBack={back} />}
						{currentStep === 2 && <RevealSlide onBack={back} />}
					</div>

					{/* Desktop Split View (>= 1024px) */}
					{/* Uses min-h-screen style so the PAGE scrolls, not the panels */}
					<div className="hidden lg:flex w-full flex-1 relative">
						{/* Left: Builder (Fixed 1/3 width) */}
						<div
							className="w-1/3 min-w-[350px] relative z-20 border-r border-white/10"
						>
							<BuilderSlide
								onNext={next}
								onBack={() => setStep(0)}
								isDesktopSplit={true}
							/>
						</div>

						{/* Right: Verdict (Remaining 2/3) */}
						<div className="flex-1 relative z-10 bg-black/50">
							<RevealSlide
								onBack={back} /* Hidden in split view anyway */
								isDesktopSplit={true}
							/>
						</div>
					</div>
				</>
			)}

			{/* Footer: Visible on Mobile AND Desktop now */}
			{/* Ensure it is part of the flow */}
			<div>
				<Footer />
			</div>
		</div>
	);
}

export default App;
