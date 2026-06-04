import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  TbCalendarStats, TbRefresh, TbWand, TbHistory, TbCalendarPlus, TbBolt,
  TbAlertTriangle, TbShieldCheck, TbActivity, TbGauge, TbClockExclamation, TbSparkles,
} from 'react-icons/tb';
import { useAppSelector } from '@/store';
import { apiGetProjects } from '@/services/ProjectServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Project } from '@/@types/project';
import {
  analyzeProjects, buildWeekPlan, computeProducerLoads, countRisks,
  buildTimeline, buildForecast, recommendActions, currentWeekDays, isoWeekNumber,
  nextBusinessDays, formatBlocks, HOURS_PER_DAY,
  ScheduledProject, TimelineRow,
} from '@/utils/planning/scheduler';
import { buildSnapshot } from '@/services/PlanningAIService';
import { loadManualOverrides, loadProducerCapacities, CapacityConfig } from '@/services/PlanningService';
import { downloadPlanningIcs } from '@/utils/planning/exportIcs';
import { PLANNING_ACCENT, RISK_COLOR, rgba } from './theme';
import KpiCard from './components/KpiCard';
import ResourceBoard from './components/ResourceBoard';
import ForecastChart from './components/ForecastChart';
import AiActions from './components/AiActions';
import AtRiskList from './components/AtRiskList';
import CapacityEditorModal from './components/CapacityEditorModal';
import SimulationDrawer from './components/SimulationDrawer';
import RunHistoryDrawer from './components/RunHistoryDrawer';
import DayDetailDrawer from './components/DayDetailDrawer';

const HORIZON_WEEKS = 2;

const panel: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(18,22,34,0.6), rgba(11,14,21,0.6))',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
  padding: '18px',
};

const headerBtn = (disabled: boolean, accent = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: accent ? rgba(PLANNING_ACCENT, 0.16) : 'rgba(255,255,255,0.05)',
  border: `1px solid ${accent ? rgba(PLANNING_ACCENT, 0.4) : 'rgba(255,255,255,0.12)'}`,
  borderRadius: '10px', padding: '8px 13px',
  color: accent ? '#c7d2fe' : 'rgba(255,255,255,0.7)',
  fontSize: '12px', fontWeight: 600,
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  fontFamily: 'Inter, sans-serif',
});

const sectionTitle = (icon: JSX.Element, label: string, right?: JSX.Element) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
      {icon} {label}
    </span>
    {right}
  </div>
);

const PlanningPage = () => {
  const navigate = useNavigate();
  const userId = useAppSelector((state) => state.auth.user.user?.documentId || '');
  const [projects, setProjects] = useState<Project[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [capacities, setCapacities] = useState<Record<string, CapacityConfig>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'month' | 'deadline'>('deadline');
  const [flash, setFlash] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<{ producerId: string; producerName: string } | null>(null);
  const [showSim, setShowSim] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, manualOverrides, caps] = await Promise.all([
        unwrapData(apiGetProjects({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
        loadManualOverrides(),
        loadProducerCapacities(),
      ]);
      setProjects(res.projects_connection.nodes || []);
      setOverrides(manualOverrides);
      setCapacities(caps);
    } catch {
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const refreshCapacities = async () => setCapacities(await loadProducerCapacities());

  useEffect(() => { load(); }, []);

  const data = useMemo(() => {
    const scheduled = analyzeProjects(projects, new Date(), overrides);
    const counts = countRisks(scheduled);
    const producerLoads = computeProducerLoads(scheduled, HORIZON_WEEKS, capacities);
    const snapshot = buildSnapshot(scheduled, producerLoads, counts);

    // Horizon du board : Semaine (7j), Mois (~5 sem), ou jusqu'à la dernière deadline
    const weekStart = currentWeekDays()[0];
    const addD = (n: number) => { const x = new Date(weekStart); x.setDate(x.getDate() + n); return x; };
    let span = 7;
    if (view === 'month') span = 35;
    else if (view === 'deadline') {
      let maxEnd = weekStart;
      for (const sp of scheduled) {
        const e = new Date(sp.project.endDate);
        if (!isNaN(e.getTime()) && e > maxEnd) maxEnd = e;
      }
      const diff = Math.ceil((maxEnd.getTime() - weekStart.getTime()) / 86400000) + 3;
      span = Math.min(120, Math.max(7, diff));
    }
    const days = Array.from({ length: span }, (_, i) => addD(i));

    // Étalement temporel (blocs de 30 min) — source du board. Flash = compaction 16h/j.
    const timeline = buildTimeline(scheduled, capacities, new Date(), { flash });

    // KPIs charge/capacité sur l'horizon (en blocs de 30 min), hors "Non assigné"
    const horizon = nextBusinessDays(HORIZON_WEEKS * 5);
    const key = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
    const realTl = timeline.filter((r) => r.producerId !== '__unassigned__');
    let totUsed = 0, totCap = 0;
    const ratios: number[] = [];
    for (const r of realTl) {
      let u = 0, c = 0;
      for (const d of horizon) { u += r.byDay[key(d)]?.blocks ?? 0; c += r.dailyCapacityBlocks; }
      totUsed += u; totCap += c;
      ratios.push(c ? u / c : 0);
    }
    const chargeMoyenne = ratios.length ? Math.round((ratios.reduce((s, x) => s + x, 0) / ratios.length) * 100) : 0;
    const freeBlocks = Math.max(0, totCap - totUsed);
    const freeLabel = formatBlocks(freeBlocks);
    const freePct = totCap ? Math.round(((totCap - totUsed) / totCap) * 100) : 0;

    const realRows = producerLoads.filter((p) => p.producerId !== '__unassigned__');
    const forecast = buildForecast(scheduled, realRows.length || 1, 6);
    const actions = recommendActions(scheduled, producerLoads);

    // séries sparkline (réelles) : risque par jour sur l'horizon
    const plan = buildWeekPlan(scheduled, HORIZON_WEEKS);
    const series = {
      late: plan.map((d) => d.items.filter((i) => i.risk === 'late').length),
      tight: plan.map((d) => d.items.filter((i) => i.risk === 'tight').length),
      ok: plan.map((d) => d.items.filter((i) => i.risk === 'ok').length),
      load: forecast.map((f) => f.loadPct),
    };

    const projectsById = Object.fromEntries(projects.map((p) => [p.documentId, p]));

    return { scheduled, counts, snapshot, days, timeline, chargeMoyenne, freeLabel, freePct, forecast, actions, series, projectsById };
  }, [projects, overrides, capacities, view, flash]);

  const weekDays = data.days;
  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    if (view === 'week') return `Semaine ${isoWeekNumber(first)} (${fmt(first)} – ${fmt(last)} ${first.getFullYear()})`;
    if (view === 'deadline') return `${fmt(first)} → ${fmt(last)} · jusqu'aux échéances`;
    return `${fmt(first)} → ${fmt(last)} ${first.getFullYear()}`;
  }, [weekDays, view]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '1240px', margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* ---- En-tête ---- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: rgba(PLANNING_ACCENT, 0.16), border: `1px solid ${rgba(PLANNING_ACCENT, 0.35)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TbCalendarStats size={23} color={PLANNING_ACCENT} />
          </div>
          <div>
            <h2 style={{ color: '#fff', fontSize: '23px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Planificateur de charge</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '2px 0 0' }}>Vue planning • {weekLabel}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Toggle Semaine / Mois */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '3px' }}>
            {(['week', 'month', 'deadline'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                border: 'none', borderRadius: '8px', padding: '6px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: view === v ? PLANNING_ACCENT : 'transparent',
                color: view === v ? '#fff' : 'rgba(255,255,255,0.55)',
              }}>{v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Échéances'}</button>
            ))}
          </div>
          <button
            onClick={() => setFlash((f) => !f)}
            disabled={loading || data.counts.total === 0}
            title="Flash : compacte le travail au plus tôt en journées de 16h"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: flash ? 'linear-gradient(90deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${flash ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px', padding: '8px 13px',
              color: flash ? '#1a1505' : 'rgba(255,255,255,0.7)',
              fontSize: '12px', fontWeight: 700,
              cursor: loading || data.counts.total === 0 ? 'default' : 'pointer',
              opacity: loading || data.counts.total === 0 ? 0.5 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <TbBolt size={14} /> Flash
          </button>
          <button onClick={() => downloadPlanningIcs(data.scheduled)} disabled={loading || data.counts.total === 0} title="Exporter (.ics) — Google Calendar / Apple / Outlook" style={headerBtn(loading || data.counts.total === 0)}><TbCalendarPlus size={14} /> Export</button>
          <button onClick={() => setShowSim(true)} disabled={loading || data.counts.total === 0} style={headerBtn(loading || data.counts.total === 0, true)}><TbWand size={14} /> Simuler</button>
          <button onClick={() => setShowHistory(true)} disabled={loading} style={headerBtn(loading)}><TbHistory size={14} /> Historique</button>
          <button onClick={load} disabled={loading} style={headerBtn(loading)}><TbRefresh size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '60px' }}>Analyse des commandes en cours…</div>
      ) : data.counts.total === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '60px' }}>Aucun projet en cours à planifier pour le moment.</div>
      ) : (
        <>
          {/* ---- KPIs ---- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <KpiCard icon={<TbClockExclamation size={16} />} label="🔴 En retard" value={String(data.counts.late)} color={RISK_COLOR.late} caption="deadline déjà dépassée 😬" series={data.series.late} />
            <KpiCard icon={<TbAlertTriangle size={16} />} label="🟠 Ça passe juste" value={String(data.counts.tight)} color={RISK_COLOR.tight} caption="peu de marge, à surveiller" series={data.series.tight} />
            <KpiCard icon={<TbShieldCheck size={16} />} label="🟢 Tranquille" value={String(data.counts.ok)} color={RISK_COLOR.ok} caption="large, dans les temps 😎" series={data.series.ok} />
            <KpiCard icon={<TbActivity size={16} />} label="Charge moyenne" value={`${data.chargeMoyenne}%`} color={PLANNING_ACCENT} caption="capacité producteurs utilisée" series={data.series.load} />
            <KpiCard icon={<TbGauge size={16} />} label="Capacité disponible" value={data.freeLabel} color="#22d3ee" caption={`libre sur ${HORIZON_WEEKS} sem. (${HOURS_PER_DAY}h/j)`} donutPct={data.freePct} />
          </div>

          {/* ---- Board producteurs × jours (étalement 30 min jusqu'à la deadline) ---- */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', marginBottom: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>🧩 Chaque carré = <strong style={{ color: '#fff' }}>30 min</strong> :</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '13px', height: '13px', borderRadius: '3px', background: '#6366f1' }} /> occupé (1 couleur = 1 projet)</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '13px', height: '13px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }} /> libre</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '13px', height: '13px', borderRadius: '3px', background: '#6366f1', boxShadow: `0 0 0 1.5px ${RISK_COLOR.late}` }} /> au-delà de la capacité ({HOURS_PER_DAY}h/j)</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>· 🌱 libre · 😌 tranquille · ⚡ chargé · 🔥 surchargé</span>
            <span style={{ color: '#c7d2fe', fontWeight: 600 }}>👉 clique un jour pour voir les tâches à faire</span>
          </div>
          {flash && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: rgba('#f59e0b', 0.12), border: `1px solid ${rgba('#f59e0b', 0.35)}`, borderRadius: '10px', padding: '8px 12px', marginBottom: '10px', color: '#fcd34d', fontSize: '12.5px', fontWeight: 600 }}>
              ⚡ Mode Flash actif — travail compacté au plus tôt en journées de 16h (au lieu de l'étalement à 4h/jour jusqu'à la deadline).
            </div>
          )}
          <ResourceBoard
            rows={data.timeline}
            days={weekDays}
            onEditCapacity={(row) => setEditingCapacity({ producerId: row.producerId, producerName: row.producerName })}
            onDayClick={(d) => setSelectedDay(d)}
          />

          {/* ---- Bas : prévisionnel | actions IA | à risque ---- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.3fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
            <div style={panel}>
              {sectionTitle(<TbActivity size={16} color={PLANNING_ACCENT} />, 'Charge prévisionnelle')}
              <ForecastChart points={data.forecast} />
            </div>
            <div style={panel}>
              {sectionTitle(<TbSparkles size={16} color={PLANNING_ACCENT} />, "Actions recommandées par l'IA")}
              <AiActions actions={data.actions} />
            </div>
            <div style={panel}>
              {sectionTitle(<TbAlertTriangle size={16} color={RISK_COLOR.tight} />, 'Projets à risque', <button onClick={() => navigate('/common/projects')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7d2fe', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Voir tout ›</button>)}
              <AtRiskList items={data.scheduled} onClick={(id) => navigate(`/common/projects/details/${id}`)} />
            </div>
          </div>
        </>
      )}

      {editingCapacity && (
        <CapacityEditorModal
          producerId={editingCapacity.producerId}
          producerName={editingCapacity.producerName}
          current={capacities[editingCapacity.producerId]}
          onClose={() => setEditingCapacity(null)}
          onSaved={refreshCapacities}
        />
      )}
      {showSim && <SimulationDrawer projects={projects} overrides={overrides} onClose={() => setShowSim(false)} />}
      {showHistory && <RunHistoryDrawer counts={data.counts} snapshot={data.snapshot} horizonWeeks={HORIZON_WEEKS} generatedBy={userId} onClose={() => setShowHistory(false)} />}
      {selectedDay && (
        <DayDetailDrawer
          date={selectedDay}
          rows={data.timeline}
          projectsById={data.projectsById}
          onClose={() => setSelectedDay(null)}
          onProjectClick={(id) => navigate(`/common/projects/details/${id}`)}
        />
      )}
    </div>
  );
};

export default PlanningPage;
