import { Github } from 'lucide-react';

export const Footer = () => {
	return (
		<footer className="border-t border-white/10 py-6 px-6 sm:px-12">
			{/* Top Links Section - Constrained */}
			<div className="max-w-7xl mx-auto w-full mb-8">
				<div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 sm:gap-8">
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
					Data via Yahoo Finance & Alpha Vantage
					</p>
				</div>
			</div>

			<div className="w-full">
				{/* Technical Logic & Assumptions */}
				<div className="space-y-4 text-[10px] leading-relaxed text-gray-500 w-full border-t border-white/5 pt-6">
					<p className="text-center">
						<strong>Simulation Logic & Assumptions:</strong> This tool uses an index-tracked simulation engine. If a purchase or subscription start date precedes a stock's public listing (IPO), the simulation <strong>holds cash</strong> (no growth) until the ticker becomes tradable. If the data provider is rate-limited or a specific ticker cannot be resolved, the simulation offers market index fallbacks including <strong>S&P 500 (SPY), NASDAQ Composite (^IXIC), and FTSE Global All-Cap</strong> as proxies.
						<br></br><strong>Financial Caveats:</strong> Calculations assume immediate investment of costs, ignore <strong>platform fees, trading commissions, spreads, and taxes</strong>. Data is based on dividend-adjusted historical close prices but <strong>does not model manual dividend reinvestment</strong> or complex tax implications like Capital Gains Tax (CGT).
						<br></br><span className="italic"><strong>Legal Disclaimer:</strong> This application is for <strong>entertainment and informational purposes only</strong> and does not constitute financial, investment, legal, or tax advice. You should not make any financial decisions based on the data presented here without consulting a <strong>qualified professional</strong>. The creator and contributors assume no responsibility or liability for any errors, omissions, or actions taken based on this content. <strong>Past performance is not indicative of future results.</strong></span>
					</p>
				</div>
			</div>
		</footer >
	);
};
