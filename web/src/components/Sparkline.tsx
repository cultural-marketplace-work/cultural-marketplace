export default function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const w = 300, h = 60, pad = 4;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${(pad + i * step).toFixed(1)},${(h - pad - (v / max) * (h - pad * 2)).toFixed(1)}`);
  const area = `${pad},${h - pad} ${pts.join(' ')} ${(pad + (values.length - 1) * step).toFixed(1)},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Revenue trend" className={`h-16 w-full ${className}`}>
      <polygon points={area} fill="currentColor" opacity="0.12" />
      <polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}