import { AreaChart, Area, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { type SimulationResult } from '../lib/financials';

interface ShareCardProps {
	result: SimulationResult;
	itemNames: string;
	spent: number;
	investmentValue: number;
	formattedSpent: string;
	formattedInvestment: string;
	tickers: string[];
}

export const ShareCard = ({ result, itemNames, formattedSpent, formattedInvestment, tickers }: ShareCardProps) => {
	const stocksWon = result.investmentValue > result.totalSpent;

	const growthTextColor = stocksWon ? 'text-brand-neon' : 'text-red-400';

	// Grammar
	const tickerCount = tickers.length;
	const stockWord = tickerCount === 1 ? tickers[0] : 'these stocks';

	return (
		<div
			id="share-card"
			className="bg-[#0a0a0a] flex flex-col p-12 relative overflow-hidden"
			style={{ width: '1200px', height: '900px' }}
		>
			{/* Background Gradient Elements */}
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-neon/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
			<div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-purple/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

			{/* Header / Logo */}
			<div className="flex justify-between items-start mb-16 relative z-10">
				<div>
					<h3 className="text-gray-500 font-bold tracking-widest uppercase mb-1">The Verdict</h3>
					<div className="h-1 w-12 bg-brand-neon rounded-full" />
				</div>
				<div className="text-right">
					<div className="text-2xl font-bold text-white">Stocks vs Subscription</div>
					<div className="text-gray-500 text-sm">Wealth Visualization Tool</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col gap-10 relative z-10">
				{/* The Sentence */}
				<h1 className="text-5xl font-bold leading-tight text-white max-w-4xl">
					I spent <span className={stocksWon ? 'text-red-400' : 'text-brand-neon'}>{formattedSpent}</span> on {itemNames}.
					<br />
					If I'd invested that in {stockWord} instead, I'd have <span className={growthTextColor}>{formattedInvestment}</span>.
				</h1>

				{/* Big Stat */}
				<div>
					<div className="text-gray-400 text-lg mb-1">Total Return</div>
					<div className={`text-9xl font-black tracking-tighter ${growthTextColor}`}>
						{result.growthPercentage > 0 ? '+' : ''}{result.growthPercentage.toFixed(0)}%
					</div>
				</div>

				{/* Chart - Simplified for static view */}
				<div className="flex-1 w-full min-h-0 mt-4 rounded-3xl bg-white/5 border border-white/10 p-6">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={result.graphData}>
							<defs>
								<linearGradient id="shareColorValue" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#00f4a2" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#00f4a2" stopOpacity={0} />
								</linearGradient>
								<linearGradient id="shareColorSpent" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
							<XAxis dataKey="date" hide />
							<YAxis hide domain={['auto', 'auto']} />
							<Area
								type="monotone"
								dataKey="value"
								stroke="#00f4a2"
								strokeWidth={4}
								fillOpacity={1}
								fill="url(#shareColorValue)"
								isAnimationActive={false}
							/>
							<Area
								type="monotone"
								dataKey="spent"
								stroke="#ef4444"
								strokeWidth={3}
								strokeDasharray="5 5"
								fillOpacity={1}
								fill="url(#shareColorSpent)"
								isAnimationActive={false}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Footer */}
			<div className="mt-8 text-center text-gray-500 text-xl font-medium tracking-wide">
				svs.imanhussain.com
			</div>
		</div>
	);
};
