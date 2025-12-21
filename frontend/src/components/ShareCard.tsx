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

	return (
		<div
			id="share-card"
			className="flex flex-col p-8 relative overflow-hidden"
			style={{
				width: '1080px',
				height: '1080px',
				backgroundColor: '#0a0a0a', // Explicit bg
				fontFamily: 'Inter, sans-serif'
			}}
		>
			{/* Background Gradient Elements - Explicit RGBA */}
			<div
				className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px]"
				style={{
					backgroundColor: neonRgba,
					transform: 'translate(50%, -50%)'
				}}
			/>
			<div
				className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px]"
				style={{
					backgroundColor: purpleRgba,
					transform: 'translate(-33%, 33%)'
				}}
			/>

			{/* Header / Logo */}
			<div className="flex justify-end items-start mb-4 relative z-10">
				<div className="text-right">
					<div className="font-bold" style={{ color: '#ffffff', fontSize: '1.5rem', lineHeight: '2rem' }}>Stocks vs Subscription</div>
					<div className="text-sm" style={{ color: '#6b7280' }}>Wealth Visualization Tool</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col gap-8 relative z-10">
				{/* The Sentence */}
				<h1 className="font-bold leading-tight max-w-4xl" style={{ color: '#ffffff', fontSize: '3.5rem', lineHeight: '1.1' }}>
					I spent <span style={{ color: stocksWon ? '#f87171' : '#00f4a2' }}>{formattedSpent}</span> on {itemNames}.
					<br />
					If I'd invested that in {stockWord} instead, I'd have <span style={{ color: stocksWon ? '#00f4a2' : '#f87171' }}>{formattedInvestment}</span>.
				</h1>

				{/* Big Stat */}
				<div>
					<div className="text-lg mb-1" style={{ color: '#9ca3af' }}>Total Return</div>
					<div
						className="font-black tracking-tighter"
						style={{ color: stocksWon ? '#00f4a2' : '#f87171', fontSize: '9rem', lineHeight: '1' }}
					>
						{result.growthPercentage > 0 ? '+' : ''}{result.growthPercentage.toFixed(0)}%
					</div>
				</div>

				{/* Chart - Fixed Size for html2canvas safety via padding calculation: 1080px - 64px padding = 1016px width */}
				<div
					className="flex-1 w-full min-h-0 mt-4 rounded-3xl p-6"
					style={{
						backgroundColor: 'rgba(255, 255, 255, 0.05)',
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: '1px',
						borderStyle: 'solid'
					}}
				>
					{/* ResponsiveContainer fails in hidden/detached nodes, using explicit size */}
					{/* Height adjusted to fill space: approx 400px available */}
					<AreaChart width={960} height={400} data={result.graphData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
						<CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
						<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
						<YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
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
				</div>
			</div>

			{/* Footer */}
			<div className="mt-8 font-medium tracking-wide text-center" style={{ color: '#6b7280', fontSize: '1.25rem' }}>
				svs.imanhussain.com
			</div>
		</div>
	);
};
