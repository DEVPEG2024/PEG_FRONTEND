import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  TbCalendarStats, TbRefresh, TbWand, TbHistory, TbCalendarPlus, TbBolt,
  TbAlertTriangle, TbShieldCheck, TbActivity, TbGauge, TbClockExclamation, TbSparkles,
  TbFilterOff,
} from 'react-icons/tb';
import { useAppSelector } from '@/store';
import { apiGetProjects } from '@/services/ProjectServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Project } from '@/@types/project';
import {
  analyzeProjects, computeProducerLoads, countRisks,
  buildTimeline, buildForecastFromTimeline, recommendActions, currentWeekDays, isoWeekNumber,
  timelineStats, dailyLoadSeries, deadlineSeries, unplannableProjects,
  nextBusinessDays, formatBlocks, HOURS_PER_DAY, FLASH_HOURS_PER_DAY,
  RiskLevel, ScheduledProject, SimChange,
} from '@/utils/planning/scheduler';
import { buildSnapshot } from '@/services/PlanningAIService';
import { loadManualOverrides, loadProducerCapacities, CapacityConfig } from '@/services/PlanningService';
import { downloadPlanningIcs } from '@/utils/planning/exportIcs';
import { PLANNING_ACCENT, RISK_COLOR, rgba } from './theme';
import KpiCard from './components/KpiCard';
import ResourceBoard from './components/ResourceBoard';
import ForecastChart from './components/ForecastChart';
import AiActions from './components/AiActions';
import AiSummary from './components/AiSummary';
import AtRiskList from './components/AtRiskList';
import BoardLegend from './components/BoardLegend';
import CapacityEditorModal from './components/CapacityEditorModal';
import EstimateEditorModal from './components/EstimateEditorModal';
import SimulationDrawer from './components/SimulationDrawer';
import RunHistoryDrawer from './components/RunHistoryDrawer';
import DayDetailDrawer from './components/DayDetailDrawer';

/** Fenêtre de référence des KPI — fixe et explicitée dans les libellés. */
const KPI_HORIZON_WEEKS = 2;
const FORECAST_WEEKS = 6;

type ViewMode = 'week' | 'month' | 'deadline';

/** Préférences d'affichage mémorisées entre deux visites. */
const PREFS_KEY = 'peg_planning_prefs';
type Prefs = { view: ViewMode; flash: boolean };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        view: p.view === 'week' || p.view === 'month' || p.view === 'deadline' ? p.view : 'deadline',
        flash: !!p.flash,
      };
    }
  } catch {
    // préférences illisibles → valeurs par défaut
  }
  return { view: 'deadline', flash: false };
}

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
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
      {icon} {label}
    </span>
    {right}
  </div>
);

/** Bandeau d'information / alerte au-dessus du board. */
const Banner = ({ color, children, onClear }: { color: string; children: React.ReactNode; onClear?: () => void }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    background: rgba(color, 0.12), border: `1px solid ${rgba(color, 0.35)}`,
    borderRadius: '10px', padding: '9px 12px', marginBottom: '10px',
    color, fontSize: '12.5px', fontWeight: 600,
  }}>
    <span style={{ flex: 1 }}>{children}</span>
    {onClear && (
      <button onClick={onClear} aria-label="Retirer le filtre" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 9px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        <TbFilterOff size={13} /> Tout afficher
      </button>
    )}
  </div>
);

const PlanningPage = () => {
  const navigate = useNavigate();
  const userId = useAppSelector((state) => state.auth.user.user?.documentId || '');
  const [projects, setProjects] = useState<Project[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [capacities, setCapacities] = useState<Record<string, CapacityConfig>>({});
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const [{ view, flash }, setPrefs] = useState<Prefs>(loadPrefs);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | null>(null);

  const [editingCapacity, setEditingCapacity] = useState<{ producerId: string; producerName: string } | null>(null);
  const [editingEstimate, setEditingEstimate] = useState<ScheduledProject | null>(null);
  const [sim, setSim] = useState<{ open: boolean; prefill?: SimChange }>({ open: false });
  const [showHistory, setShowHistory] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const setView = (v: ViewMode) => setPrefs((p) => ({ ...p, view: v }));
  const toggleFlash = () => setPrefs((p) => ({ ...p, flash: !p.flash }));

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ view, flash }));
    } catch {
      // stockage indisponible (mode privé) → simple perte de la préférence
    }
  }, [view, flash]);

  const load = useCallback(async () => {
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
      setLoadedAt(new Date());
    } catch {
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCapacities = async () => setCapacities(await loadProducerCapacities());
  const refreshOverrides = async () => setOverrides(await loadManualOverrides());

  useEffect(() => { load(); }, [load]);

  const data = useMemo(() => {
    const now = new Date();
    const scheduled = analyzeProjects(projects, now, overrides);
    const counts = countRisks(scheduled);
    const unplannable = unplannableProjects(projects);
    const producerLoads = computeProducerLoads(scheduled, KPI_HORIZON_WEEKS, capacities);
    const snapshot = buildSnapshot(scheduled, producerLoads, counts);

    // Horizon du board : Semaine (7 j), Mois (~5 sem.) ou jusqu'à la dernière échéance.
    const weekStart = currentWeekDays(now)[0];
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

    // Deux étalements : le complet alimente les KPI (chiffres jamais faussés par
    // un filtre), le filtré alimente le board et le détail du jour.
    const timelineAll = buildTimeline(scheduled, capacities, now, { flash });
    const visible = riskFilter ? scheduled.filter((sp) => sp.risk === riskFilter) : scheduled;
    const timelineView = riskFilter ? buildTimeline(visible, capacities, now, { flash }) : timelineAll;

    // KPI charge/capacité : fenêtre FIXE de 2 semaines, explicitée dans le libellé.
    const kpiDays = nextBusinessDays(KPI_HORIZON_WEEKS * 5, now);
    const stats = timelineStats(timelineAll, kpiDays);

    const forecast = buildForecastFromTimeline(timelineAll, FORECAST_WEEKS, now);
    const actions = recommendActions(scheduled, producerLoads, now);

    const series = {
      late: deadlineSeries(scheduled, 'late', FORECAST_WEEKS, now),
      tight: deadlineSeries(scheduled, 'tight', FORECAST_WEEKS, now),
      ok: deadlineSeries(scheduled, 'ok', FORECAST_WEEKS, now),
      load: dailyLoadSeries(timelineAll, kpiDays),
    };

    const projectsById = Object.fromEntries(projects.map((p) => [p.documentId, p]));
    const scheduledById = new Map(scheduled.map((sp) => [sp.project.documentId, sp]));

    return {
      scheduled, visible, counts, unplannable, snapshot, days,
      timelineAll, timelineView, stats, forecast, actions, series,
      projectsById, scheduledById,
    };
  }, [projects, overrides, capacities, view, flash, riskFilter]);

  const weekDays = data.days;
  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    if (view === 'week') return `Semaine ${isoWeekNumber(first)} (${fmt(first)} – ${fmt(last)} ${first.getFullYear()})`;
    if (view === 'deadline') return `${fmt(first)} → ${fmt(last)} · jusqu'aux échéances`;
    return `${fmt(first)} → ${fmt(last)} ${first.getFullYear()}`;
  }, [weekDays, view]);

  const empty = data.counts.total === 0;
  const dayHours = flash ? FLASH_HOURS_PER_DAY : HOURS_PER_DAY;
  const RISK_TEXT: Record<RiskLevel, string> = {
    late: 'en retard',
    tight: 'à marge serrée',
    ok: 'dans les temps',
  };

  /** Clic sur une carte KPI de risque → filtre le board sur ce niveau. */
  const toggleRisk = (r: RiskLevel, count: number) => {
    if (count === 0) return;
    setRiskFilter((cur) => (cur === r ? null : r));
  };

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
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '2px 0 0' }}>
              Vue planning • {weekLabel}
              {loadedAt && <> • actualisé à {loadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle Semaine / Mois / Échéances */}
          <div role="group" aria-label="Période affichée" style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '3px' }}>
            {(['week', 'month', 'deadline'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} style={{
                border: 'none', borderRadius: '8px', padding: '6px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: view === v ? PLANNING_ACCENT : 'transparent',
                color: view === v ? '#fff' : 'rgba(255,255,255,0.55)',
              }}>{v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Échéances'}</button>
            ))}
          </div>
          <button
            onClick={toggleFlash}
            disabled={loading || empty}
            aria-pressed={flash}
            title={`Flash : compacte le travail au plus tôt en journées de ${FLASH_HOURS_PER_DAY} h`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: flash ? 'linear-gradient(90deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${flash ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px', padding: '8px 13px',
              color: flash ? '#1a1505' : 'rgba(255,255,255,0.7)',
              fontSize: '12px', fontWeight: 700,
              cursor: loading || empty ? 'default' : 'pointer',
              opacity: loading || empty ? 0.5 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <TbBolt size={14} /> Flash
          </button>
          <button onClick={() => setShowAi((s) => !s)} disabled={loading || empty} aria-pressed={showAi} title="Résumé de la situation en langage naturel" style={headerBtn(loading || empty, showAi)}><TbSparkles size={14} /> Analyse</button>
          <button onClick={() => downloadPlanningIcs(data.scheduled)} disabled={loading || empty} title="Exporter (.ics) — Google Calendar / Apple / Outlook" style={headerBtn(loading || empty)}><TbCalendarPlus size={14} /> Export</button>
          <button onClick={() => setSim({ open: true })} disabled={loading || empty} style={headerBtn(loading || empty, true)}><TbWand size={14} /> Simuler</button>
          <button onClick={() => setShowHistory(true)} disabled={loading} style={headerBtn(loading)}><TbHistory size={14} /> Historique</button>
          <button onClick={load} disabled={loading} aria-label="Actualiser les données" title="Actualiser" style={headerBtn(loading)}><TbRefresh size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '60px' }}>Analyse des commandes en cours…</div>
      ) : empty ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '60px' }}>
          Aucun projet en cours à planifier pour le moment.
          {data.unplannable.length > 0 && (
            <div style={{ marginTop: '10px', color: RISK_COLOR.tight, fontSize: '13px' }}>
              ⚠️ {data.unplannable.length} projet(s) actif(s) sans date d'échéance ne peuvent pas être planifiés.
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ---- KPIs (les 3 cartes de risque filtrent le board) ---- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <KpiCard
              icon={<TbClockExclamation size={16} />} label="🔴 En retard" value={String(data.counts.late)}
              color={RISK_COLOR.late} caption="deadline déjà dépassée 😬" series={data.series.late}
              seriesLabel="échéances par semaine"
              onClick={() => toggleRisk('late', data.counts.late)} active={riskFilter === 'late'}
            />
            <KpiCard
              icon={<TbAlertTriangle size={16} />} label="🟠 Ça passe juste" value={String(data.counts.tight)}
              color={RISK_COLOR.tight} caption="peu de marge, à surveiller" series={data.series.tight}
              seriesLabel="échéances par semaine"
              onClick={() => toggleRisk('tight', data.counts.tight)} active={riskFilter === 'tight'}
            />
            <KpiCard
              icon={<TbShieldCheck size={16} />} label="🟢 Tranquille" value={String(data.counts.ok)}
              color={RISK_COLOR.ok} caption="large, dans les temps 😎" series={data.series.ok}
              seriesLabel="échéances par semaine"
              onClick={() => toggleRisk('ok', data.counts.ok)} active={riskFilter === 'ok'}
            />
            <KpiCard
              icon={<TbActivity size={16} />} label="Charge moyenne" value={`${data.stats.pct}%`}
              color={PLANNING_ACCENT} caption={`capacité utilisée sur ${KPI_HORIZON_WEEKS} sem. (${dayHours}h/j)`}
              series={data.series.load} seriesLabel="charge par jour ouvré"
            />
            <KpiCard
              icon={<TbGauge size={16} />} label="Capacité disponible" value={formatBlocks(data.stats.freeBlocks)}
              color="#22d3ee"
              caption={`libre sur ${KPI_HORIZON_WEEKS} sem. · ${data.stats.producerCount} producteur(s) à ${dayHours}h/j`}
              donutPct={data.stats.capacityBlocks ? Math.round((data.stats.freeBlocks / data.stats.capacityBlocks) * 100) : 0}
            />
          </div>

          {/* ---- Analyse IA (repliable) ---- */}
          {showAi && (
            <div style={{ marginBottom: '4px' }}>
              <AiSummary snapshot={data.snapshot} />
            </div>
          )}

          {/* ---- Bandeaux d'état ---- */}
          {data.unplannable.length > 0 && (
            <Banner color={RISK_COLOR.tight}>
              ⚠️ {data.unplannable.length} projet(s) actif(s) sans date d'échéance sont exclus du planning — renseigne leur échéance pour qu'ils soient pris en compte.
            </Banner>
          )}
          {flash && (
            <Banner color="#f59e0b">
              ⚡ Mode Flash actif — travail compacté au plus tôt en journées de {FLASH_HOURS_PER_DAY} h (au lieu de l'étalement à {HOURS_PER_DAY} h/jour jusqu'à l'échéance).
            </Banner>
          )}
          {riskFilter && (
            <Banner color={RISK_COLOR[riskFilter]} onClear={() => setRiskFilter(null)}>
              Filtre actif : seuls les {data.visible.length} projet(s) {RISK_TEXT[riskFilter]} sont affichés dans le board. Les KPI ci-dessus restent calculés sur l'ensemble.
            </Banner>
          )}

          {/* ---- Board producteurs × jours ---- */}
          <BoardLegend
            dayHours={dayHours}
            open={showHelp}
            onToggle={() => setShowHelp((s) => !s)}
          />
          <ResourceBoard
            rows={data.timelineView}
            days={weekDays}
            onEditCapacity={(row) => setEditingCapacity({ producerId: row.producerId, producerName: row.producerName })}
            onDayClick={(d) => setSelectedDay(d)}
            onAddProducer={() => navigate('/admin/producers/add')}
          />

          {/* ---- Bas : prévisionnel | actions | à risque ---- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '16px', alignItems: 'start' }}>
            <div style={panel}>
              {sectionTitle(
                <TbActivity size={16} color={PLANNING_ACCENT} />,
                'Charge prévisionnelle',
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{FORECAST_WEEKS} semaines</span>
              )}
              <ForecastChart points={data.forecast} />
            </div>
            <div style={panel}>
              {sectionTitle(<TbSparkles size={16} color={PLANNING_ACCENT} />, 'Actions recommandées')}
              <AiActions
                actions={data.actions}
                onSimulate={(change) => setSim({ open: true, prefill: change })}
                onOpenProject={(id) => navigate(`/common/projects/details/${id}`)}
              />
            </div>
            <div style={panel}>
              {sectionTitle(
                <TbAlertTriangle size={16} color={RISK_COLOR.tight} />,
                'Projets à risque',
                <button onClick={() => navigate('/common/projects')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7d2fe', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Voir tout ›</button>
              )}
              <AtRiskList
                items={data.scheduled}
                onClick={(id) => navigate(`/common/projects/details/${id}`)}
                onEditEstimate={(sp) => setEditingEstimate(sp)}
              />
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
      {editingEstimate && (
        <EstimateEditorModal
          item={editingEstimate}
          updatedBy={userId}
          onClose={() => setEditingEstimate(null)}
          onSaved={refreshOverrides}
        />
      )}
      {sim.open && (
        <SimulationDrawer
          projects={projects}
          overrides={overrides}
          initialChange={sim.prefill}
          onClose={() => setSim({ open: false })}
        />
      )}
      {showHistory && <RunHistoryDrawer counts={data.counts} snapshot={data.snapshot} horizonWeeks={KPI_HORIZON_WEEKS} generatedBy={userId} onClose={() => setShowHistory(false)} />}
      {selectedDay && (
        <DayDetailDrawer
          date={selectedDay}
          rows={data.timelineView}
          projectsById={data.projectsById}
          onClose={() => setSelectedDay(null)}
          onProjectClick={(id) => navigate(`/common/projects/details/${id}`)}
          onEditEstimate={(id) => {
            const sp = data.scheduledById.get(id);
            if (sp) { setSelectedDay(null); setEditingEstimate(sp); }
          }}
        />
      )}
    </div>
  );
};

export default PlanningPage;
