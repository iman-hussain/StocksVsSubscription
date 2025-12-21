import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
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

	// Grammar
	const tickerCount = tickers.length;
	const stockWord = tickerCount === 1 ? tickers[0] : 'these stocks';

	// Hex to RGBA helpers for safety
	const neonRgba = 'rgba(0, 244, 162, 0.05)';
	const purpleRgba = 'rgba(123, 44, 191, 0.05)';
	const neonHex = '#00f4a2';
	const redHex = '#f87171';

	return (
		<div
			id="share-card"
			className="flex flex-col p-12 relative overflow-hidden"
			style={{
				width: '1080px',
				height: '1080px',
				backgroundColor: '#0a0a0a',
				fontFamily: 'Inter, sans-serif'
			}}
		>
			{/* Background Gradient Elements */}
			<div
				className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[150px]"
				style={{
					backgroundColor: neonRgba,
					transform: 'translate(40%, -40%)'
				}}
			/>
			<div
				className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px]"
				style={{
					backgroundColor: purpleRgba,
					transform: 'translate(-30%, 30%)'
				}}
			/>

			{/* Header Logo (Watermark) */}
			<div className="absolute top-12 right-12 z-20 opacity-50">
				<div className="text-right">
					<div className="font-bold text-white text-2xl tracking-wide">Stocks vs Subscription</div>
				</div>
			</div>

			{/* Top Section: Verdict (2/3) + Return (1/3) */}
			<div className="flex-1 flex flex-row items-end gap-12 relative z-10 pb-8">
				{/* Left: Verdict (2/3) */}
				<div className="w-[66%] h-full flex flex-col justify-center">
					<h1 className="font-bold leading-tight" style={{ color: '#ffffff', fontSize: '5rem', lineHeight: '1.1' }}>
						I spent <span style={{ color: stocksWon ? redHex : neonHex }}>{formattedSpent}</span> on {itemNames}.
						<br /><br />
						If I'd invested in {stockWord}, I'd have <span style={{ color: stocksWon ? neonHex : redHex }}>{formattedInvestment}</span>.
					</h1>
				</div>

				{/* Right: Return (1/3) - Aligned to bottom of text section */}
				<div className="w-[34%] flex flex-col items-end justify-end h-full pb-4">
					<div className="text-3xl mb-2 font-medium" style={{ color: '#9ca3af' }}>Total Return</div>
					<div
						className="font-black tracking-tighter"
						style={{ color: stocksWon ? neonHex : redHex, fontSize: '9rem', lineHeight: '0.9' }}
					>
						{result.growthPercentage > 0 ? '+' : ''}{result.growthPercentage.toFixed(0)}%
					</div>
				</div>
			</div>

			{/* Middle: URL */}
			<div className="shrink-0 text-center relative z-20 pb-6">
				<div className="font-bold tracking-widest text-white/40 uppercase text-xl">
					svs.imanhussain.com
				</div>
			</div>

			{/* Bottom: Graph (50% of card) */}
			<div
				className="w-full relative z-10 rounded-3xl p-8 border border-white/10"
				style={{
					height: '45%', // Approx bottom half
					backgroundColor: 'rgba(20, 20, 20, 0.4)',
				}}
			>
				<AreaChart width={960} height={400} data={result.graphData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
					<defs>
						<linearGradient id="shareColorValue" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#00f4a2" stopOpacity={0.4} />
							<stop offset="95%" stopColor="#00f4a2" stopOpacity={0} />
						</linearGradient>
						<linearGradient id="shareColorSpent" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
							<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						tick={{ fill: '#9ca3af', fontSize: 16, fontFamily: 'Inter' }}
						dy={10}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tick={{ fill: '#9ca3af', fontSize: 16, fontFamily: 'Inter' }}
						tickFormatter={(val) => `£${val}`}
						width={60}
					/>
					<Area
						type="monotone"
						dataKey="value"
						stroke="#00f4a2"
						strokeWidth={6}
						fillOpacity={1}
						fill="url(#shareColorValue)"
						isAnimationActive={false}
					/>
					<Area
						type="monotone"
						dataKey="spent"
						stroke="#ef4444"
						strokeWidth={4}
						strokeDasharray="8 8"
						fillOpacity={1}
						fill="url(#shareColorSpent)"
						isAnimationActive={false}
					/>
				</AreaChart>
			</div>
		</div>
	);
};
