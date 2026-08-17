import { ForecastPoint, formatBlocks } from '@/utils/planning/scheduler';
import { PLANNING_ACCENT, RISK_COLOR, rgba } from '../theme';

type Props = { points: ForecastPoint[] };

const W = 460;
const H = 160;
const PAD_L = 34;
const PAD_R = 14; // sans ça, le dernier libellé de semaine était rogné
const PAD_B = 26;
const PAD_T = 10;

const ForecastChart = ({ points }: Props) => {
  if (points.length < 2) return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '20px' }}>Pas assez de données.</div>;

  const maxVal = Math.max(120, ...points.map((p) => p.loadPct));
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_B - PAD_T;
  const stepX = plotW / (points.length - 1);
  const y = (v: number) => PAD_T + plotH - (v / maxVal) * plotH;
  const x = (i: number) => PAD_L + i * stepX;

  const loadPts = points.map((p, i) => [x(i), y(p.loadPct)] as const);
  const line = loadPts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;
  const capY = y(100); // ligne capacité = 100 %

  const overloadWeeks = points.filter((p) => p.loadPct > 100).map((p) => p.label.replace('Sem. ', ''));
  const hasCapacity = points.some((p) => p.capacityBlocks > 0);

  const tooltip = (p: ForecastPoint) =>
    p.capacityBlocks > 0
      ? `${p.label} — ${p.loadPct}% : ${formatBlocks(p.usedBlocks)} planifiées sur ${formatBlocks(p.capacityBlocks)} de capacité`
      : `${p.label} — aucune capacité producteur sur cette semaine`;

  return (
    <div>
      {overloadWeeks.length > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: rgba(RISK_COLOR.late, 0.12), border: `1px solid ${rgba(RISK_COLOR.late, 0.3)}`, borderRadius: '8px', padding: '4px 9px', color: '#fca5a5', fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>
          ⚠️ Capacité dépassée en semaine {overloadWeeks.join(' & ')}
        </div>
      )}
      {!hasCapacity && (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '8px' }}>
          Aucune capacité producteur sur la période — le taux de charge n'est pas calculable.
        </div>
      )}

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', minHeight: '140px' }} role="img" aria-label="Charge prévisionnelle par semaine">
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rgba(PLANNING_ACCENT, 0.4)} />
            <stop offset="100%" stopColor={rgba(PLANNING_ACCENT, 0)} />
          </linearGradient>
        </defs>

        {/* grille horizontale */}
        {[0, 50, 100, 150].filter((g) => g <= maxVal).map((g) => (
          <g key={g}>
            <line x1={PAD_L} y1={y(g)} x2={W - PAD_R} y2={y(g)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(g) + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9.5">{g}%</text>
          </g>
        ))}

        {/* capacité (dashed) */}
        <line x1={PAD_L} y1={capY} x2={W - PAD_R} y2={capY} stroke="rgba(255,255,255,0.45)" strokeWidth={1.3} strokeDasharray="4 3" />

        {/* charge (aire + ligne) */}
        <path d={area} fill="url(#forecastFill)" />
        <path d={line} fill="none" stroke={PLANNING_ACCENT} strokeWidth={2} strokeLinejoin="round" />

        {points.map((p, i) => {
          const [px, py] = loadPts[i];
          const over = p.loadPct > 100;
          return (
            <g key={i}>
              {/* zone de survol large : un point de 3 px est intouchable */}
              <rect x={px - stepX / 2} y={PAD_T} width={stepX} height={plotH} fill="transparent">
                <title>{tooltip(p)}</title>
              </rect>
              <circle cx={px} cy={py} r={over ? 3.5 : 2.5} fill={over ? RISK_COLOR.late : PLANNING_ACCENT} pointerEvents="none" />
              <text
                x={px} y={py - 8} textAnchor="middle"
                fill={over ? '#fca5a5' : 'rgba(255,255,255,0.55)'}
                fontSize="9.5" fontWeight="700" pointerEvents="none"
              >
                {p.loadPct}%
              </text>
            </g>
          );
        })}

        {/* libellés de semaine — ancrage adapté aux extrémités pour ne rien rogner */}
        {points.map((p, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            fill="rgba(255,255,255,0.4)"
            fontSize="9.5"
          >
            {p.label}
          </text>
        ))}
      </svg>

      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '2px', background: PLANNING_ACCENT }} /> Charge planifiée</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '0', borderTop: '2px dashed rgba(255,255,255,0.45)' }} /> Capacité (100 %)</span>
      </div>
    </div>
  );
};

export default ForecastChart;
