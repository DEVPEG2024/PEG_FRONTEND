import { useNavigate } from 'react-router-dom';
import { TbChevronRight, TbClock, TbUser, TbPencil } from 'react-icons/tb';
import { ScheduledProject } from '@/utils/planning/scheduler';
import { priorityTextData } from '@/views/app/common/projects/lists/constants';
import { RISK_COLOR, RISK_LABEL, rgba, formatEuro } from '../theme';

type Props = {
  items: ScheduledProject[];
  /** si fourni, affiche un crayon pour éditer la durée estimée du projet */
  onEdit?: (item: ScheduledProject) => void;
};

function remainingLabel(daysRemaining: number): string {
  if (daysRemaining < 0) return `Deadline +${Math.abs(daysRemaining)} j`;
  if (daysRemaining === 0) return "Deadline aujourd'hui";
  return `J-${daysRemaining} ouvrés`;
}

const PriorityList = ({ items, onEdit }: Props) => {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '24px', textAlign: 'center' }}>
        Aucun projet en cours à planifier.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((sp) => {
        const color = RISK_COLOR[sp.risk];
        return (
          <div
            key={sp.project.documentId}
            onClick={() => navigate(`/common/projects/details/${sp.project.documentId}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left',
              width: '100%',
              cursor: 'pointer',
              boxSizing: 'border-box',
              fontFamily: 'Inter, sans-serif',
              background: 'linear-gradient(160deg, rgba(22,28,43,0.9), rgba(13,16,24,0.9))',
              border: `1px solid ${rgba(color, 0.28)}`,
              borderLeft: `3px solid ${color}`,
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                background: rgba(color, 0.14),
                border: `1px solid ${rgba(color, 0.3)}`,
                borderRadius: '100px',
                padding: '3px 9px',
                color,
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {RISK_LABEL[sp.risk]}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sp.project.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '3px', color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color }}>
                  <TbClock size={12} /> {remainingLabel(sp.daysRemaining)}
                </span>
                <span title={sp.workload.label}>~{sp.workload.days} j de travail</span>
                {sp.project.priority && <span>Priorité {priorityTextData[sp.project.priority as keyof typeof priorityTextData] ?? sp.project.priority}</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <TbUser size={12} /> {sp.project.producer?.name ?? 'Non assigné'}
                </span>
              </div>
            </div>

            {sp.project.price > 0 && (
              <span style={{ flexShrink: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 700 }}>
                {formatEuro(sp.project.price)}
              </span>
            )}
            {onEdit && (
              <button
                title="Éditer la durée estimée"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(sp);
                }}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: sp.workload.source === 'manual' ? rgba('#6366f1', 0.18) : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${sp.workload.source === 'manual' ? rgba('#6366f1', 0.4) : 'rgba(255,255,255,0.12)'}`,
                  color: sp.workload.source === 'manual' ? '#c7d2fe' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
              >
                <TbPencil size={14} />
              </button>
            )}
            <TbChevronRight size={16} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
};

export default PriorityList;
