import { ForecastPoint } from '@/utils/planning/scheduler';
import { PLANNING_ACCENT, rgba } from '../theme';

type Props = { points: ForecastPoint[] };

const W = 460;
const H = 150;
const PAD_L = 34;
const PAD_B = 22;
const PAD_T = 10;

const ForecastChart = ({ points }: Props) => {
  if (points.length < 2) return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '20px' }}>Pas assez de données.</div>;

  const maxVal = Math.max(120, ...points.map((p) => p.loadPct));
  const plotW = W - PAD_L;
  const plotH = H - PAD_B - PAD_T;
  const stepX = plotW / (points.length - 1);
  const y = (v: number) => PAD_T + plotH - (v / maxVal) * plotH;
  const x = (i: number) => PAD_L + i * stepX;

  const loadPts = points.map((p, i) => [x(i), y(p.loadPct)] as const);
  const line = loadPts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;
  const capY = y(100); // ligne capacité = 100 %

  // semaines en surcharge (>100%)
  const overloadWeeks = points.filter((p) => p.loadPct > 100).map((p) => p.label.replace('Sem. ', ''));

  return (
    <div>
      {overloadWeeks.length > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: rgba('#ef4444', 0.12), border: `1px solid ${rgba('#ef4444', 0.3)}`, borderRadius: '8px', padding: '4px 9px', color: '#fca5a5', fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>
          ⚠️ Risque élevé Sem. {overloadWeeks.join(' & ')}
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rgba(PLANNING_ACCENT, 0.4)} />
            <stop offset="100%" stopColor={rgba(PLANNING_ACCENT, 0)} />
          </linearGradient>
        </defs>

        {/* grille horizontale */}
        {[0, 50, 100, 150].filter((g) => g <= maxVal).map((g) => (
          <g key={g}>
            <line x1={PAD_L} y1={y(g)} x2={W} y2={y(g)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(g) + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9">{g}%</text>
          </g>
        ))}

        {/* capacité (dashed) */}
        <line x1={PAD_L} y1={capY} x2={W} y2={capY} stroke="rgba(255,255,255,0.45)" strokeWidth={1.3} strokeDasharray="4 3" />

        {/* charge (area + line) */}
        <path d={area} fill="url(#forecastFill)" />
        <path d={line} fill="none" stroke={PLANNING_ACCENT} strokeWidth={2} strokeLinejoin="round" />
        {loadPts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={points[i].loadPct > 100 ? 3.5 : 2.5} fill={points[i].loadPct > 100 ? '#ef4444' : PLANNING_ACCENT} />
        ))}

        {/* labels semaines */}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">{p.label}</text>
        ))}
      </svg>

      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '2px', background: PLANNING_ACCENT }} /> Charge</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '0', borderTop: '2px dashed rgba(255,255,255,0.45)' }} /> Capacité</span>
      </div>
    </div>
  );
};

export default ForecastChart;
