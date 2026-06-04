import { useMemo, useState } from 'react';
import { TbX, TbPlus, TbTrash, TbArrowRight, TbWand } from 'react-icons/tb';
import { Project } from '@/@types/project';
import {
  analyzeProjects,
  applySimChanges,
  countRisks,
  SimChange,
  RiskLevel,
} from '@/utils/planning/scheduler';
import { CapacityConfig } from '@/services/PlanningService';
import { RISK_COLOR, RISK_LABEL, PLANNING_ACCENT, rgba } from '../theme';

type Props = {
  projects: Project[];
  overrides: Record<string, number>;
  onClose: () => void;
};

const KpiPill = ({ counts }: { counts: { late: number; tight: number; ok: number } }) => (
  <span style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
    {(['late', 'tight', 'ok'] as RiskLevel[]).map((r) => (
      <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: RISK_COLOR[r], fontWeight: 700, fontSize: '13px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: RISK_COLOR[r] }} />
        {counts[r]}
      </span>
    ))}
  </span>
);

const SimulationDrawer = ({ projects, overrides, onClose }: Props) => {
  const [changes, setChanges] = useState<SimChange[]>([]);
  const [selProject, setSelProject] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newDays, setNewDays] = useState('');

  // Baseline (état actuel)
  const before = useMemo(() => {
    const scheduled = analyzeProjects(projects, new Date(), overrides);
    return { scheduled, counts: countRisks(scheduled) };
  }, [projects, overrides]);

  // Projets actifs (sélectionnables)
  const activeProjects = before.scheduled;

  // Simulation (état après changements)
  const after = useMemo(() => {
    const { projects: simProjects, overrides: simOv } = applySimChanges(projects, changes);
    const scheduled = analyzeProjects(simProjects, new Date(), { ...overrides, ...simOv });
    return { scheduled, counts: countRisks(scheduled) };
  }, [projects, overrides, changes]);

  // Transitions de risque par projet impacté
  const transitions = useMemo(() => {
    if (changes.length === 0) return [];
    const beforeMap = new Map(before.scheduled.map((s) => [s.project.documentId, s.risk]));
    const out: { name: string; from: RiskLevel; to: RiskLevel }[] = [];
    for (const sp of after.scheduled) {
      const prev = beforeMap.get(sp.project.documentId);
      if (prev && prev !== sp.risk) out.push({ name: sp.project.name, from: prev, to: sp.risk });
    }
    return out;
  }, [before, after, changes]);

  const addChange = () => {
    if (!selProject) return;
    if (!newEndDate && !newDays) return;
    setChanges((prev) => [
      ...prev.filter((c) => c.projectDocumentId !== selProject),
      {
        projectDocumentId: selProject,
        newEndDate: newEndDate || undefined,
        newDays: newDays ? parseFloat(newDays) : undefined,
      },
    ]);
    setSelProject('');
    setNewEndDate('');
    setNewDays('');
  };

  const nameOf = (id: string) => activeProjects.find((s) => s.project.documentId === id)?.project.name ?? id;

  const field: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '9px 11px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '520px',
          maxWidth: 'calc(100vw - 24px)',
          height: '100%',
          overflowY: 'auto',
          background: 'linear-gradient(160deg, rgba(18,22,34,0.99), rgba(11,14,21,0.99))',
          borderLeft: `1px solid ${rgba(PLANNING_ACCENT, 0.3)}`,
          padding: '22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <TbWand size={20} color={PLANNING_ACCENT} /> Simulation « et si… »
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
            <TbX size={20} />
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 18px' }}>
          Décale des deadlines ou ajuste des durées et observe l'impact, sans rien modifier réellement.
        </p>

        {/* Formulaire d'ajout de changement */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Projet</label>
          <select value={selProject} onChange={(e) => setSelProject(e.target.value)} style={{ ...field, width: '100%', marginTop: '6px', marginBottom: '10px' }}>
            <option value="">— Choisir un projet —</option>
            {activeProjects.map((s) => (
              <option key={s.project.documentId} value={s.project.documentId}>
                {s.project.name} ({RISK_LABEL[s.risk]})
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Nouvelle deadline</label>
              <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} style={{ ...field, width: '100%', marginTop: '6px' }} />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Durée (j)</label>
              <input type="number" min="0" step="0.5" value={newDays} onChange={(e) => setNewDays(e.target.value)} placeholder="auto" style={{ ...field, width: '100%', marginTop: '6px' }} />
            </div>
          </div>

          <button
            onClick={addChange}
            disabled={!selProject || (!newEndDate && !newDays)}
            style={{
              marginTop: '12px',
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: rgba(PLANNING_ACCENT, 0.16),
              border: `1px solid ${rgba(PLANNING_ACCENT, 0.4)}`,
              borderRadius: '10px',
              padding: '9px',
              color: '#c7d2fe',
              fontSize: '13px',
              fontWeight: 700,
              cursor: !selProject || (!newEndDate && !newDays) ? 'default' : 'pointer',
              opacity: !selProject || (!newEndDate && !newDays) ? 0.5 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <TbPlus size={15} /> Ajouter le changement
          </button>
        </div>

        {/* Liste des changements */}
        {changes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
            {changes.map((c) => (
              <div key={c.projectDocumentId} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ flex: 1, color: '#fff', fontSize: '12px' }}>
                  <strong>{nameOf(c.projectDocumentId)}</strong>
                  {c.newEndDate && <> · deadline → {c.newEndDate}</>}
                  {c.newDays != null && <> · durée → {c.newDays} j</>}
                </span>
                <button onClick={() => setChanges((prev) => prev.filter((x) => x.projectDocumentId !== c.projectDocumentId))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                  <TbTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Résultat avant/après */}
        <div style={{ background: `linear-gradient(160deg, ${rgba(PLANNING_ACCENT, 0.1)}, rgba(13,16,24,0.9))`, border: `1px solid ${rgba(PLANNING_ACCENT, 0.25)}`, borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Impact</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Avant</span>
            <KpiPill counts={before.counts} />
            <TbArrowRight size={16} color="rgba(255,255,255,0.4)" />
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Après</span>
            <KpiPill counts={after.counts} />
          </div>

          {changes.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '10px' }}>Ajoute un changement pour voir l'impact.</div>
          ) : transitions.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '10px' }}>Aucun changement de niveau de risque sur les projets.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '12px' }}>
              {transitions.map((t) => {
                const improved = (t.from === 'late' && t.to !== 'late') || (t.from === 'tight' && t.to === 'ok');
                return (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff' }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    <span style={{ color: RISK_COLOR[t.from], fontWeight: 700 }}>{RISK_LABEL[t.from]}</span>
                    <TbArrowRight size={12} color="rgba(255,255,255,0.4)" />
                    <span style={{ color: RISK_COLOR[t.to], fontWeight: 700 }}>{RISK_LABEL[t.to]}</span>
                    <span style={{ fontSize: '13px' }}>{improved ? '✅' : '⚠️'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '14px' }}>
          💡 Simulation locale uniquement — aucune deadline n'est modifiée. Pour appliquer, ajuste les projets réels.
        </p>
      </div>
    </div>
  );
};

export default SimulationDrawer;
