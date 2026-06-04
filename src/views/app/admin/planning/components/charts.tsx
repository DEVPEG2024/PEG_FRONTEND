import { rgba } from '../theme';

/** Sparkline SVG légère (sans dépendance). */
export const Sparkline = ({ data, color, width = 110, height = 34 }: { data: number[]; color: string; width?: number; height?: number }) => {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `spark-${color.replace('#', '')}-${width}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba(color, 0.35)} />
          <stop offset="100%" stopColor={rgba(color, 0)} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** Donut de progression (pourcentage). */
export const Donut = ({ pct, color, size = 52, label }: { pct: number; color: string; size?: number; label?: string }) => {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * c} ${c}`}
      />
      {label !== undefined && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="11" fontWeight="700" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
          {label}
        </text>
      )}
    </svg>
  );
};
