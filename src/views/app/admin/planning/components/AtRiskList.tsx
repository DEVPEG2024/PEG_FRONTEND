import { ScheduledProject, riskScore } from '@/utils/planning/scheduler';
import { RISK_COLOR, rgba } from '../theme';

type Props = {
  items: ScheduledProject[];
  onClick?: (documentId: string) => void;
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function scoreColor(score: number): string {
  if (score < 40) return RISK_COLOR.late;
  if (score < 70) return RISK_COLOR.tight;
  return RISK_COLOR.ok;
}

const AtRiskList = ({ items, onClick }: Props) => {
  // les plus à risque (score le plus bas) d'abord
  const ranked = items
    .map((sp) => ({ sp, score: riskScore(sp) }))
    .sort((a, b) => a.score - b.score)
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
            onClick={() => onClick?.(sp.project.documentId)}
            style={{ display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '11px', padding: '10px 12px' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.project.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>
                {sp.project.producer?.name ?? 'Non assigné'} · Échéance : {formatDate(sp.project.endDate)}
              </div>
            </div>
            <span style={{ flexShrink: 0, border: `1px solid ${rgba(color, 0.4)}`, background: rgba(color, 0.12), borderRadius: '100px', padding: '3px 10px', color, fontSize: '12px', fontWeight: 800 }}>
              {score}/100
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default AtRiskList;
