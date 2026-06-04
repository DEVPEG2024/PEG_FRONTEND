import { TbX, TbChevronRight, TbCircle, TbCircleCheck } from 'react-icons/tb';
import { Project } from '@/@types/project';
import { TimelineRow, formatBlocks } from '@/utils/planning/scheduler';
import { RISK_COLOR, RISK_LABEL, PLANNING_ACCENT, rgba, projectColor } from '../theme';

type Props = {
  date: Date;
  rows: TimelineRow[];
  projectsById: Record<string, Project>;
  onClose: () => void;
  onProjectClick: (documentId: string) => void;
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

const DayDetailDrawer = ({ date, rows, projectsById, onClose, onProjectClick }: Props) => {
  const key = dateKey(date);
  const title = date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });

  // Producteurs ayant du travail ce jour
  const working = rows
    .map((r) => ({ row: r, load: r.byDay[key] }))
    .filter((x) => x.load && x.load.details.length > 0);

  const totalBlocks = working.reduce((s, x) => s + (x.load?.blocks ?? 0), 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '500px', maxWidth: 'calc(100vw - 24px)', height: '100%', overflowY: 'auto', background: 'linear-gradient(160deg, rgba(18,22,34,0.99), rgba(11,14,21,0.99))', borderLeft: `1px solid ${rgba(PLANNING_ACCENT, 0.3)}`, padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0, textTransform: 'capitalize' }}>📋 {title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
            <TbX size={20} />
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 18px' }}>
          {working.length === 0 ? 'Aucun travail planifié.' : `${formatBlocks(totalBlocks)} de travail réparties sur ${working.length} producteur(s)`}
        </p>

        {working.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>Rien de prévu ce jour 🎉</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {working.map(({ row, load }) => (
              <div key={row.producerId}>
                {/* Producteur */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>👷 {row.producerName}</span>
                  <span style={{ color: (load?.blocks ?? 0) > row.dailyCapacityBlocks ? RISK_COLOR.late : 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 700 }}>
                    {formatBlocks(load?.blocks ?? 0)} / {formatBlocks(row.dailyCapacityBlocks)}
                  </span>
                </div>

                {/* Projets du jour */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(load?.details ?? []).slice().sort((a, b) => b.blocks - a.blocks).map((d) => {
                    const proj = projectsById[d.documentId];
                    const pending = (proj?.tasks ?? []).filter((t) => t.state !== 'fulfilled');
                    const done = (proj?.tasks ?? []).filter((t) => t.state === 'fulfilled');
                    const color = projectColor(d.documentId);
                    return (
                      <div key={d.documentId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${color}`, borderRadius: '11px', padding: '11px 13px' }}>
                        <div onClick={() => onProjectClick(d.documentId)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <span style={{ width: '11px', height: '11px', borderRadius: '3px', background: color, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                          <span style={{ flexShrink: 0, color: RISK_COLOR[d.risk], background: rgba(RISK_COLOR[d.risk], 0.14), border: `1px solid ${rgba(RISK_COLOR[d.risk], 0.3)}`, borderRadius: '100px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}>{RISK_LABEL[d.risk]}</span>
                          <span style={{ flexShrink: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700 }}>{formatBlocks(d.blocks)}</span>
                          <TbChevronRight size={15} color="rgba(255,255,255,0.3)" />
                        </div>

                        {/* Tâches à faire */}
                        {proj && (proj.tasks?.length ?? 0) > 0 ? (
                          <div style={{ marginTop: '9px', paddingTop: '9px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {pending.map((t) => (
                              <div key={t.documentId} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                <TbCircle size={13} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                              </div>
                            ))}
                            {done.map((t) => (
                              <div key={t.documentId} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.35)', fontSize: '12px', textDecoration: 'line-through' }}>
                                <TbCircleCheck size={13} color={RISK_COLOR.ok} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ marginTop: '7px', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>Pas de sous-tâches définies</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayDetailDrawer;
