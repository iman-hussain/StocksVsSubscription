import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to animate a number from 0 to a target value.
 * Useful for counters, percentages, etc.
 */
export function useCountUp(targetValue: number, duration: number = 2000) {
	const [displayValue, setDisplayValue] = useState(0);
	const prevTargetRef = useRef(targetValue);

	useEffect(() => {
		// If target hasn't changed and we already animated, skip
		if (targetValue === prevTargetRef.current && displayValue === targetValue) {
			return;
		}
		prevTargetRef.current = targetValue;

		const startTime = Date.now();
		let animationFrameId: number;

		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Easing function for smooth animation
			const easeOut = 1 - Math.pow(1 - progress, 3);
			const currentValue = targetValue * easeOut;

			setDisplayValue(currentValue);

			if (progress < 1) {
				animationFrameId = requestAnimationFrame(animate);
			}
		};

		animationFrameId = requestAnimationFrame(animate);

		return () => cancelAnimationFrame(animationFrameId);
		// displayValue is intentionally not in dependencies to avoid re-triggering animation
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [targetValue, duration]);

	return displayValue;
}
