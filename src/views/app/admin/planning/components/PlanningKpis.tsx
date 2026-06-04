import { RiskCounts } from '@/utils/planning/scheduler';
import { RISK_COLOR, rgba } from '../theme';

type Props = { counts: RiskCounts };

const cards = [
  { key: 'late' as const, color: RISK_COLOR.late, label: 'En retard', hint: 'deadline dépassée au rythme estimé' },
  { key: 'tight' as const, color: RISK_COLOR.tight, label: 'Serrés', hint: 'marge < 2 jours ouvrés' },
  { key: 'ok' as const, color: RISK_COLOR.ok, label: 'Sous contrôle', hint: 'marge confortable' },
];

const PlanningKpis = ({ counts }: Props) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '14px',
      marginBottom: '24px',
    }}
  >
    {cards.map((c) => (
      <div
        key={c.key}
        style={{
          background: 'linear-gradient(160deg, rgba(22,28,43,0.9), rgba(13,16,24,0.9))',
          border: `1px solid ${rgba(c.color, 0.3)}`,
          borderRadius: '14px',
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {c.label}
          </span>
        </div>
        <div style={{ color: c.color, fontSize: '32px', fontWeight: 800, marginTop: '6px', lineHeight: 1 }}>
          {counts[c.key]}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '6px' }}>{c.hint}</div>
      </div>
    ))}
  </div>
);

export default PlanningKpis;
