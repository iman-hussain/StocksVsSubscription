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

	// Explicit colors to avoid oklab() which html2canvas doesn't support
	const neonHex = '#00f4a2';
	const redHex = '#f87171';
	const grayHex = '#9ca3af';
	const whiteHex = '#ffffff';
	const darkBg = '#0a0a0a';
	const panelBg = 'rgba(20, 20, 20, 0.5)';
	const borderColor = 'rgba(255, 255, 255, 0.1)';
	const neonGlow = 'rgba(0, 244, 162, 0.05)';
	const purpleGlow = 'rgba(123, 44, 191, 0.05)';

	return (
		<div
			id="share-card"
			style={{
				display: 'flex',
				flexDirection: 'column',
				padding: '24px 40px 40px 40px',
				position: 'relative',
				overflow: 'hidden',
				width: '1080px',
				height: '1080px',
				backgroundColor: darkBg,
				fontFamily: 'Inter, sans-serif',
				color: whiteHex,
			}}
		>
			{/* Background Gradient Elements */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					right: 0,
					width: '800px',
					height: '800px',
					borderRadius: '50%',
					filter: 'blur(150px)',
					backgroundColor: neonGlow,
					transform: 'translate(40%, -40%)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					width: '600px',
					height: '600px',
					borderRadius: '50%',
					filter: 'blur(120px)',
					backgroundColor: purpleGlow,
					transform: 'translate(-30%, 30%)',
				}}
			/>

			{/* ===== TOP HALF (50%): Verdict + Returns ===== */}
			<div
				style={{
					height: '50%',
					display: 'flex',
					flexDirection: 'row',
					position: 'relative',
					zIndex: 10,
				}}
			>
				{/* Left 2/3: Verdict Text */}
				<div style={{ width: '66%', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '24px' }}>
					<h1 style={{ fontWeight: 'bold', lineHeight: '1.15', color: whiteHex, fontSize: '2.75rem', margin: 0 }}>
						I spent <span style={{ color: stocksWon ? redHex : neonHex }}>{formattedSpent}</span> on {itemNames}.
						<br /><br />
						If I'd invested in {stockWord}, I'd have <span style={{ color: stocksWon ? neonHex : redHex }}>{formattedInvestment}</span>.
					</h1>
				</div>

				{/* Right 1/3: Total Return (right aligned) */}
				<div style={{ width: '34%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
					<div style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 500, color: grayHex, textAlign: 'right' }}>Total Return</div>
					<div
						style={{
							fontWeight: 900,
							letterSpacing: '-0.05em',
							color: stocksWon ? neonHex : redHex,
							fontSize: '6rem',
							lineHeight: '1',
							textAlign: 'right',
						}}
					>
						{result.growthPercentage > 0 ? '+' : ''}{result.growthPercentage.toFixed(0)}%
					</div>
				</div>
			</div>

			{/* ===== MIDDLE: Call to action ===== */}
			<div style={{ position: 'relative', zIndex: 20, paddingBottom: '16px' }}>
				<div style={{ fontWeight: 600, letterSpacing: '0.02em', color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.1rem', textAlign: 'left' }}>
					Find out what you could have made @ <span style={{ color: '#00f4a2', fontWeight: 700 }}>svs.imanhussain.com</span>
				</div>
			</div>

			{/* ===== BOTTOM HALF (50%): Graph ===== */}
			<div
				style={{
					flex: 1,
					width: '100%',
					position: 'relative',
					zIndex: 10,
					borderRadius: '20px',
					padding: '24px',
					paddingBottom: '40px',
					border: `1px solid ${borderColor}`,
					backgroundColor: panelBg,
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/* Graph Title and Legend */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
					<div style={{ fontSize: '1.1rem', fontWeight: 600, color: grayHex }}>Portfolio Growth ({tickers.join(', ') || 'SPY'})</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: neonHex }} />
							<span style={{ fontSize: '0.9rem', color: grayHex }}>Portfolio Value</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f87171' }} />
							<span style={{ fontSize: '0.9rem', color: grayHex }}>Total Spent</span>
						</div>
					</div>
				</div>
				<AreaChart
					width={980}
					height={420}
					data={result.graphData}
					margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
				>
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
						tick={{ fill: '#9ca3af', fontSize: 14, fontFamily: 'Inter' }}
						dy={10}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tick={{ fill: '#9ca3af', fontSize: 14, fontFamily: 'Inter' }}
						tickFormatter={(val) => `£${val}`}
						width={70}
					/>
					<Area
						type="monotone"
						dataKey="value"
						stroke="#00f4a2"
						strokeWidth={5}
						fillOpacity={1}
						fill="url(#shareColorValue)"
						isAnimationActive={false}
					/>
					<Area
						type="monotone"
						dataKey="spent"
						stroke="#ef4444"
						strokeWidth={3}
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
