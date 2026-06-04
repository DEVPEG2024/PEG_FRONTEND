import { DayPlan } from '@/utils/planning/scheduler';
import { RISK_COLOR, rgba, formatDayShort, isToday } from '../theme';

type Props = { plan: DayPlan[] };

const WeekSchedule = ({ plan }: Props) => {
  const maxItems = Math.max(1, ...plan.map((d) => d.items.length));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${plan.length}, minmax(86px, 1fr))`,
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '6px',
      }}
    >
      {plan.map((day, i) => {
        const { dow, dom } = formatDayShort(day.date);
        const today = isToday(day.date);
        return (
          <div
            key={i}
            style={{
              background: today
                ? 'linear-gradient(160deg, rgba(99,102,241,0.16), rgba(13,16,24,0.9))'
                : 'linear-gradient(160deg, rgba(22,28,43,0.9), rgba(13,16,24,0.9))',
              border: `1px solid ${today ? rgba('#6366f1', 0.4) : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '12px',
              padding: '10px 8px',
              minHeight: `${70 + maxItems * 26}px`,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ color: today ? '#a5b4fc' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>
                {dow}
              </div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{dom}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {day.items.map((sp, k) => {
                const color = RISK_COLOR[sp.risk];
                return (
                  <div
                    key={`${sp.project.documentId}-${k}`}
                    title={`${sp.project.name} — ${sp.project.producer?.name ?? 'Non assigné'}`}
                    style={{
                      background: rgba(color, 0.14),
                      borderLeft: `3px solid ${color}`,
                      borderRadius: '5px',
                      padding: '3px 6px',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sp.project.name}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeekSchedule;
