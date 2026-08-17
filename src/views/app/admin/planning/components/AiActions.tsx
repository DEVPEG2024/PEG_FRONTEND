import { TbArrowsExchange, TbClockShare, TbCircleCheck, TbUserPlus, TbScissors, TbWand, TbExternalLink } from 'react-icons/tb';
import { RecommendedAction, SimChange } from '@/utils/planning/scheduler';
import { RISK_COLOR, rgba } from '../theme';

type Props = {
  actions: RecommendedAction[];
  /** Ouvre la simulation « et si… » pré-remplie avec le changement proposé. */
  onSimulate?: (change: SimChange) => void;
  onOpenProject?: (documentId: string) => void;
};

const ICONS = {
  reassign: TbArrowsExchange,
  shift: TbClockShare,
  accept: TbCircleCheck,
  assign: TbUserPlus,
  split: TbScissors,
};

const miniBtn = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  background: rgba(color, 0.14), border: `1px solid ${rgba(color, 0.32)}`,
  borderRadius: '8px', padding: '4px 9px',
  color, fontSize: '11px', fontWeight: 700,
  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
});

const AiActions = ({ actions, onSimulate, onOpenProject }: Props) => {
  if (actions.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '14px 0' }}>Aucune action recommandée — la charge est équilibrée. 👍</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {actions.map((a, i) => {
        const color = RISK_COLOR[a.tone];
        const Icon = ICONS[a.icon];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${color}`, borderRadius: '11px', padding: '10px 12px' }}>
            <div style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '9px', background: rgba(color, 0.14), border: `1px solid ${rgba(color, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
              <Icon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1, color: '#fff', fontSize: '12.5px', fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
                <span style={{ flexShrink: 0, background: rgba(color, 0.14), border: `1px solid ${rgba(color, 0.3)}`, borderRadius: '100px', padding: '3px 9px', color, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {a.badge}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '3px' }}>{a.detail}</div>

              {/* Une recommandation qu'on ne peut pas appliquer ne sert à rien. */}
              {(a.sim || a.projectDocumentId) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {a.sim && onSimulate && (
                    <button onClick={() => onSimulate(a.sim as SimChange)} style={miniBtn(color)}>
                      <TbWand size={12} /> Simuler l'impact
                    </button>
                  )}
                  {a.projectDocumentId && onOpenProject && (
                    <button onClick={() => onOpenProject(a.projectDocumentId as string)} style={{ ...miniBtn('#94a3b8'), color: 'rgba(255,255,255,0.65)' }}>
                      <TbExternalLink size={12} /> Ouvrir le projet
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AiActions;
