// Tiny inline SVG chart (line, area or bars). No library, no client JS.
// Colour comes from the parent's text colour via currentColor.
export default function MiniChart({
  values, variant = 'area', className = '',
}: {
  values: number[];
  variant?: 'line' | 'area' | 'bars';
  className?: string;
}) {
  if (values.length === 0) return null;
  const w = 200, h = 48, pad = 3;
  const max = Math.max(...values, 1);

  if (variant === 'bars') {
    const gap = 3;
    const bw = (w - gap * (values.length - 1)) / values.length;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Trend" className={`h-12 w-full ${className}`}>
        {values.map((v, i) => {
          const bh = Math.max((v / max) * (h - pad), 2);
          return (
            <rect
              key={i}
              x={i * (bw + gap)}
              y={h - bh}
              width={bw}
              height={bh}
              rx={1.5}
              fill="currentColor"
              opacity={i === values.length - 1 ? 1 : 0.35}
            />
          );
        })}
      </svg>
    );
  }

  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${(pad + i * step).toFixed(1)},${(h - pad - (v / max) * (h - pad * 2)).toFixed(1)}`);
  const area = `${pad},${h - pad} ${pts.join(' ')} ${(pad + (values.length - 1) * step).toFixed(1)},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Trend" className={`h-12 w-full ${className}`}>
      {variant === 'area' && <polygon points={area} fill="currentColor" opacity="0.15" />}
      <polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}