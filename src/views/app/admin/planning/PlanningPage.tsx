import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { TbCalendarStats, TbRefresh, TbListCheck, TbCalendarTime, TbUsers } from 'react-icons/tb';
import { useAppSelector } from '@/store';
import { apiGetProjects } from '@/services/ProjectServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Project } from '@/@types/project';
import {
  analyzeProjects,
  buildWeekPlan,
  computeProducerLoads,
  countRisks,
  ScheduledProject,
} from '@/utils/planning/scheduler';
import { buildSnapshot } from '@/services/PlanningAIService';
import { loadManualOverrides } from '@/services/PlanningService';
import { PLANNING_ACCENT, rgba } from './theme';
import PlanningKpis from './components/PlanningKpis';
import AiSummary from './components/AiSummary';
import PriorityList from './components/PriorityList';
import WeekSchedule from './components/WeekSchedule';
import ProducerLoadList from './components/ProducerLoadList';
import EstimateEditorModal from './components/EstimateEditorModal';

const HORIZON_WEEKS = 2;

const sectionTitle = (icon: JSX.Element, label: string, hint?: string) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
    {icon}
    <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>{label}</h3>
    {hint && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>· {hint}</span>}
  </div>
);

const panel: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(18,22,34,0.6), rgba(11,14,21,0.6))',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
  padding: '18px',
  marginBottom: '20px',
};

const PlanningPage = () => {
  const userId = useAppSelector((state) => state.auth.user.user?.documentId || '');
  const [projects, setProjects] = useState<Project[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScheduledProject | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Projets (Strapi, source de vérité) + overrides manuels (backend Planning, tolérant)
      const [res, manualOverrides] = await Promise.all([
        unwrapData(apiGetProjects({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
        loadManualOverrides(),
      ]);
      setProjects(res.projects_connection.nodes || []);
      setOverrides(manualOverrides);
    } catch {
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const refreshOverrides = async () => setOverrides(await loadManualOverrides());

  useEffect(() => {
    load();
  }, []);

  const { scheduled, counts, weekPlan, producerLoads, snapshot } = useMemo(() => {
    const scheduled = analyzeProjects(projects, new Date(), overrides);
    const counts = countRisks(scheduled);
    const weekPlan = buildWeekPlan(scheduled, HORIZON_WEEKS);
    const producerLoads = computeProducerLoads(scheduled, HORIZON_WEEKS);
    const snapshot = buildSnapshot(scheduled, producerLoads, counts);
    return { scheduled, counts, weekPlan, producerLoads, snapshot };
  }, [projects, overrides]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '1080px', margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: rgba(PLANNING_ACCENT, 0.16),
              border: `1px solid ${rgba(PLANNING_ACCENT, 0.35)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TbCalendarStats size={22} color={PLANNING_ACCENT} />
          </div>
          <div>
            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Planificateur de charge
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '2px 0 0' }}>
              {counts.total} projet(s) en cours · planning suggéré sur {HORIZON_WEEKS} semaines
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <TbRefresh size={14} /> Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '60px' }}>
          Analyse des commandes en cours…
        </div>
      ) : counts.total === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '60px' }}>
          Aucun projet en cours à planifier pour le moment.
        </div>
      ) : (
        <>
          <PlanningKpis counts={counts} />
          <AiSummary snapshot={snapshot} />

          <div style={panel}>
            {sectionTitle(<TbCalendarTime size={16} color={PLANNING_ACCENT} />, 'Planning suggéré', `${HORIZON_WEEKS} semaines · jours ouvrés`)}
            <WeekSchedule plan={weekPlan} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            <div style={panel}>
              {sectionTitle(<TbListCheck size={16} color={PLANNING_ACCENT} />, 'File de priorité', 'tri par urgence')}
              <PriorityList items={scheduled} onEdit={setEditing} />
            </div>
            <div style={panel}>
              {sectionTitle(<TbUsers size={16} color={PLANNING_ACCENT} />, 'Charge par producteur', `sur ${HORIZON_WEEKS} sem.`)}
              <ProducerLoadList loads={producerLoads} />
            </div>
          </div>
        </>
      )}

      {editing && (
        <EstimateEditorModal
          item={editing}
          updatedBy={userId}
          onClose={() => setEditing(null)}
          onSaved={refreshOverrides}
        />
      )}
    </div>
  );
};

export default PlanningPage;
