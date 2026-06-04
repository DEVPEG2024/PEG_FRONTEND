import { TbArrowsExchange, TbClockShare, TbCircleCheck } from 'react-icons/tb';
import { RecommendedAction } from '@/utils/planning/scheduler';
import { RISK_COLOR, rgba } from '../theme';

type Props = { actions: RecommendedAction[] };

const ICONS = {
  reassign: TbArrowsExchange,
  shift: TbClockShare,
  accept: TbCircleCheck,
};

const AiActions = ({ actions }: Props) => {
  if (actions.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '14px 0' }}>Aucune action recommandée — la charge est équilibrée. 👍</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {actions.map((a, i) => {
        const color = RISK_COLOR[a.tone];
        const Icon = ICONS[a.icon];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '11px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${color}`, borderRadius: '11px', padding: '10px 12px' }}>
            <div style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '9px', background: rgba(color, 0.14), border: `1px solid ${rgba(color, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
              <Icon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '12.5px', fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '2px' }}>{a.detail}</div>
            </div>
            <span style={{ flexShrink: 0, background: rgba(color, 0.14), border: `1px solid ${rgba(color, 0.3)}`, borderRadius: '100px', padding: '3px 9px', color, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {a.badge}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default AiActions;
