import { Github } from 'lucide-react';

export const Footer = () => {
	return (
		<footer className="border-t border-white/10 py-6 px-6">
			<div className="max-w-7xl mx-auto">
				{/* Main footer content - responsive flex */}
				<div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 sm:gap-8 mb-4">
					{/* Left: Made by Iman */}
					<a
						href="https://www.imanhussain.com"
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-gray-400 hover:text-brand-neon transition-colors whitespace-nowrap"
					>
						Made by Iman Hussain
					</a>

					{/* Center: GitHub Repo */}
					<a
						href="https://github.com/iman-hussain/StocksVsSubscription"
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-gray-400 hover:text-brand-neon transition-colors flex items-center gap-2 whitespace-nowrap"
					>
						<Github size={14} /> GitHub Repository
					</a>

					{/* Right: Data source */}
					<p className="text-sm text-gray-400 whitespace-nowrap">
						Data via Yahoo Finance API
					</p>
				</div>

				{/* Disclaimers */}
				<div className="space-y-2 text-xs text-gray-500">
					<p className="text-center leading-relaxed">
						<strong>Estimates only:</strong> Calculations assume consistent stock growth, ignore trading costs, taxes, and dividends. Not financial advice.
					</p>
					<p className="text-center leading-relaxed">
						Analysis based on adjusted close prices. Past performance is not indicative of future results.
					</p>
				</div>
			</div>
		</footer>
	);
};
