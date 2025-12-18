import { useEffect, useRef, useCallback } from 'react';

type Drop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  symbol: string;
  rotate: number;
  spin: number;
  opacity: number;
  hue: number;
  trail: { x: number; y: number }[];
};

const symbols = ['£', '$', '€', '¥'];

// Size categories for visual variety
const SizeCategory = {
  TINY: { min: 20, max: 50, chance: 0.3 },
  SMALL: { min: 50, max: 100, chance: 0.35 },
  MEDIUM: { min: 100, max: 150, chance: 0.2 },
  LARGE: { min: 150, max: 200, chance: 0.1 },
  GIANT: { min: 200, max: 250, chance: 0.05 },
} as const;

function pickSize(): number {
  const roll = Math.random();
  let cumulative = 0;
  for (const cat of Object.values(SizeCategory)) {
    cumulative += cat.chance;
    if (roll < cumulative) {
      return cat.min + Math.random() * (cat.max - cat.min);
    }
  }
  return SizeCategory.SMALL.min;
}

export default function CurrencyRain({ density = 40 }: { density?: number }) {
  const speedFactor = 0.25; // Slow overall motion to 1/4 speed
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropsRef = useRef<Drop[]>([]);
  const pointerRef = useRef<{ x: number; y: number; down: boolean; active: boolean }>({
    x: -9999,
    y: -9999,
    down: false,
    active: false,
  });
  const rafRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const computeTargetCount = useCallback((width: number, height: number) => {
    const baseArea = 1280 * 720; // Reference desktop-ish viewport
    const scale = Math.min(1, (width * height) / baseArea);
    return Math.max(14, Math.round(density * scale));
  }, [density]);

  const createDrop = useCallback((canvas: HTMLCanvasElement, startAtTop = false): Drop => {
    const size = pickSize();
    const isLarge = size > 50;
    const isRed = Math.random() < 0.1; // 10% chance to be red
    return {
      x: Math.random() * canvas.width,
      y: startAtTop ? -size * 2 : -Math.random() * canvas.height * 1.5,
      vx: ((Math.random() - 0.5) * (isLarge ? 0.1 : 0.3)) * speedFactor,
      vy: (0.3 + Math.random() * (isLarge ? 0.4 : 0.7)) * speedFactor,
      size,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      rotate: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * (isLarge ? 0.005 : 0.02),
      opacity: 0.4 + Math.random() * 0.5,
      hue: isRed ? 0 : 155 + (Math.random() - 0.5) * 20, // Red or slight green variation
      trail: [],
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const syncDrops = (target: number) => {
      if (dropsRef.current.length > target) {
        dropsRef.current = dropsRef.current.slice(0, target);
      }
      while (dropsRef.current.length < target) {
        dropsRef.current.push(createDrop(canvas, false));
      }
    };

    const resize = () => {
      const { clientWidth, clientHeight } = canvas.parentElement || document.body;
      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);

      const targetCount = computeTargetCount(clientWidth, clientHeight);
      syncDrops(targetCount);
    };
    resize();

    const draw = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sort by size for proper layering (smaller in back)
      const sorted = [...dropsRef.current].sort((a, b) => a.size - b.size);

      for (const d of sorted) {
        // Variable gravity based on size (larger = heavier = faster fall)
        const gravityMultiplier = (0.0005 + (d.size / 200) * 0.001) * speedFactor;
        d.vy += gravityMultiplier * d.size;

        // Gentle horizontal drift (wind effect)
        d.vx += Math.sin(timeRef.current + d.x * 0.001) * 0.0003 * speedFactor;

        // Damping to prevent runaway velocities
        d.vx *= 0.995;
        d.vy = Math.min(d.vy, 4 * speedFactor); // Terminal velocity

        d.x += d.vx * dpr;
        d.y += d.vy * dpr;
        d.rotate += d.spin;

        // Store trail positions for large drops
        if (d.size > 50) {
          d.trail.push({ x: d.x, y: d.y });
          if (d.trail.length > 5) d.trail.shift();
        }

        // Enhanced pointer interaction
        if (pointerRef.current.active) {
          const dx = d.x - pointerRef.current.x * dpr;
          const dy = d.y - pointerRef.current.y * dpr;
          const dist2 = dx * dx + dy * dy;
          const baseRadius = pointerRef.current.down ? 180 : 120;
          const radius = baseRadius * dpr;

          if (dist2 < radius * radius && dist2 > 0) {
            const dist = Math.sqrt(dist2);
            const normX = dx / dist;
            const normY = dy / dist;

            // Stronger force when pressed, with smooth falloff
            const strength = pointerRef.current.down ? 2.5 : 1.2;
            const falloff = 1 - dist / radius;
            const force = strength * falloff * falloff;

            d.vx += normX * force;
            d.vy += normY * force;

            // Add extra spin when touched
            d.spin += (Math.random() - 0.5) * 0.02 * falloff;
          }
        }

        // Recycle when off screen
        if (d.y - d.size * 2 > canvas.height || d.x < -d.size * 2 || d.x > canvas.width + d.size * 2) {
          Object.assign(d, createDrop(canvas, true));
        }

        // Draw trail for large drops
        if (d.trail.length > 1 && d.size > 50) {
          ctx.beginPath();
          ctx.moveTo(d.trail[0].x, d.trail[0].y);
          for (let i = 1; i < d.trail.length; i++) {
            ctx.lineTo(d.trail[i].x, d.trail[i].y);
          }
          ctx.strokeStyle = `hsla(${d.hue}, 100%, 50%, ${d.opacity * 0.2})`;
          ctx.lineWidth = d.size * 0.3;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw the symbol
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotate);

        // Slight scale pulse for visual interest
        const scalePulse = 1 + Math.sin(timeRef.current * 3 + d.x * 0.01) * 0.03;
        ctx.scale(scalePulse, scalePulse);

        const fontSize = d.size * dpr * 0.5;
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = `hsla(${d.hue}, 100%, 55%, ${d.opacity})`;
        ctx.fillText(d.symbol, 0, 0);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    // Pointer/touch event handlers
    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = clientX - rect.left;
      pointerRef.current.y = clientY - rect.top;
      pointerRef.current.active = true;
    };

    const onPointerMove = (e: PointerEvent) => updatePointer(e.clientX, e.clientY);
    const onPointerDown = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY);
      pointerRef.current.down = true;
    };
    const onPointerUp = () => {
      pointerRef.current.down = false;
    };
    const onPointerLeave = () => {
      pointerRef.current.down = false;
      pointerRef.current.active = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        pointerRef.current.down = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      pointerRef.current.down = false;
      pointerRef.current.active = false;
    };

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [density, createDrop, computeTargetCount]);

  return (
    <div className="absolute inset-0 -z-10 pointer-events-none select-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
