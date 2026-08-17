import { TbPencil, TbChevronRight } from 'react-icons/tb';
import { ScheduledProject, riskScore } from '@/utils/planning/scheduler';
import { RISK_COLOR, rgba } from '../theme';

type Props = {
  items: ScheduledProject[];
  onClick?: (documentId: string) => void;
  /** Corriger la durée estimée — principal levier de justesse du planning. */
  onEditEstimate?: (item: ScheduledProject) => void;
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function scoreColor(score: number): string {
  if (score < 40) return RISK_COLOR.late;
  if (score < 70) return RISK_COLOR.tight;
  return RISK_COLOR.ok;
}

/** Le score seul est opaque (« 2/100 » pour deux projets très différents). */
function marginLabel(sp: ScheduledProject): string {
  if (sp.margin < 0) return `${Math.abs(sp.margin)} j de retard`;
  if (sp.margin === 0) return 'aucune marge';
  return `${sp.margin} j de marge`;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: 'durée saisie',
  producer: 'délai producteur',
  tasks: 'd’après les tâches',
  default: 'estimation par défaut',
};

const AtRiskList = ({ items, onClick, onEditEstimate }: Props) => {
  // Les plus à risque d'abord : marge croissante, puis urgence décroissante.
  const ranked = items
    .map((sp) => ({ sp, score: riskScore(sp) }))
    .sort((a, b) => a.sp.margin - b.sp.margin || b.sp.urgency - a.sp.urgency)
    .slice(0, 5);

  if (ranked.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '14px 0' }}>Aucun projet à risque.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ranked.map(({ sp, score }) => {
        const color = scoreColor(score);
        return (
          <div
            key={sp.project.documentId}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '11px', padding: '10px 12px' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div
              onClick={() => onClick?.(sp.project.documentId)}
              style={{ flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}
            >
              <div style={{ color: '#fff', fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.project.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sp.project.producer?.name ?? '⚠️ Non assigné'} · échéance {formatDate(sp.project.endDate)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '10.5px' }}>
                <span style={{ color, fontWeight: 700 }}>{marginLabel(sp)}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                  · ~{sp.workload.days} j estimés ({SOURCE_LABEL[sp.workload.source] ?? sp.workload.source})
                </span>
              </div>
            </div>
            <span title="Score de santé : 100 = très confortable" style={{ flexShrink: 0, border: `1px solid ${rgba(color, 0.4)}`, background: rgba(color, 0.12), borderRadius: '100px', padding: '3px 10px', color, fontSize: '12px', fontWeight: 800 }}>
              {score}/100
            </span>
            {onEditEstimate && (
              <button
                onClick={() => onEditEstimate(sp)}
                aria-label={`Corriger la durée estimée de ${sp.project.name}`}
                title="Corriger la durée estimée"
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'inline-flex' }}
              >
                <TbPencil size={14} />
              </button>
            )}
            {onClick && <TbChevronRight size={14} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>
  );
};

export default AtRiskList;
