// Accueil admin « Village PEG » (ordinateur, ≥ 1024 px) — maquette validée le
// 21/10/2026 : chiffres clés, village isométrique (un bâtiment par rubrique du
// menu, 5 quartiers), fiche à droite, vue liste par quartier. Le tableau de
// bord classique (bannière, pense-bête, widgets) reste à un clic.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiChevronLeft,
  HiChevronRight,
  HiOutlineMap,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineViewGrid,
  HiX,
} from 'react-icons/hi';
import {
  HiOutlineClipboardDocumentCheck,
  HiOutlineQueueList,
  HiOutlineTv,
} from 'react-icons/hi2';
import navigationIcon from '@/configs/navigation-icon.config';
import { useAppDispatch, useAppSelector } from '@/store';
import { markAsRead } from '@/store/slices/base/notificationSlice';
import { markNotificationAsRead } from '@/services/NotificationService';
import VillageMap, { type MapSection, type VillageFilter } from './VillageMap';
import VillagePanel, { type PanelSection } from './VillagePanel';
import VillageList from './VillageList';
import VillageSparkline from './VillageSparkline';
import VillageWall, { type WallKpi, type WallMapView } from './VillageWall';
import { useElementWidth } from './useElementWidth';
import useVillageActivity from './useVillageActivity';
import useVillageData from './useVillageData';
import type { VillageActivity } from './villageActivity';
import { buildJournee, newsKey } from './villageJournee';
import { SECTION_INFO } from './villageSections';
import {
  DISTRICTS,
  LAYOUT,
  MAP_H,
  MAP_W,
  MENU_ORDER,
  ZOOM_MAX,
  ZOOM_STEPS,
  districtById,
  districtCenter,
  districtOf,
  membersOf,
  stepZoom,
  toMap,
  type DistrictId,
  type SectionId,
} from './villageScene';
import {
  TONE,
  emptySection,
  matchesFilter,
  trendText,
  type SectionData,
  type SeriesPoint,
  type Trend,
} from './villageModel';
import { markSeen, readSeen, resumeIndex, tourSteps } from './villageTour';
import {
  NEUTRAL,
  ambianceAt,
  readAmbianceOn,
  seasonParticles,
  writeAmbianceOn,
} from './villageAmbiance';

const FILTERS: { id: VillageFilter; label: string; dot: string }[] = [
  { id: 'tout', label: 'Tout', dot: TONE.violet },
  { id: 'urgent', label: 'Urgent', dot: TONE.red },
  { id: 'traiter', label: 'À traiter', dot: TONE.violet },
  { id: 'production', label: 'En production', dot: TONE.orange },
  { id: 'livrer', label: 'À livrer', dot: TONE.green },
];

const CSS = `
.vgx-card{transition:transform .2s ease,box-shadow .2s ease}
.vgx-card:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(40,36,80,.10)}
.vgx-btn:focus-visible,.vgx-card:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
@media (prefers-reduced-motion: reduce){.vgx-card{transition:none}}
`;

const icon = (id: SectionId): ReactNode =>
  navigationIcon[SECTION_INFO[id].icon];

/** Couleurs d'une évolution : verte si favorable, rouge sinon, grise si neutre. */
export const TREND_COLORS: Record<Trend['tone'], { bg: string; fg: string }> = {
  good: { bg: '#e8f7ee', fg: '#15803d' },
  bad: { bg: '#fde8e8', fg: '#b91c1c' },
  neutral: { bg: '#f1f2f6', fg: '#4b5563' },
};

/** Pastille d'un chiffre clé : jamais plus large que sa carte. */
const CHIP_FIT = {
  maxWidth: '100%',
  boxSizing: 'border-box',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const ARRIVED_KEY = 'peg:villageArrived';
const HINT_KEY = 'peg:villageHint';

const TITLES = Object.fromEntries(
  MENU_ORDER.map((id) => [id, SECTION_INFO[id].title])
) as Record<SectionId, string>;

interface Props {
  onClassic: () => void;
}

const AdminVillage = ({ onClassic }: Props) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // Écran mural (télévision) : « ?mural=1 » dans l'adresse — un écran peut
  // l'ouvrir directement et le retrouve après un rechargement.
  const [params, setParams] = useSearchParams();
  const wall = params.get('mural') === '1';
  const { data, loading, refresh } = useVillageData();
  const activity = useVillageActivity(refresh);
  const firstName = useAppSelector(
    (s) => s.auth.user.user?.firstName?.trim() || null
  );
  // Nouveautés des dernières 24 h, lues dans la cloche (chaîne stable : pas de
  // nouveau rendu à chaque passage du polling).
  const news = useAppSelector((s) =>
    newsKey(
      s.base.notification?.notifications ?? [],
      Date.now(),
      !!s.base.notification?.hasMore
    )
  );
  const [rootRef, rootW] = useElementWidth<HTMLDivElement>(1100);
  const [mapRef, mapW] = useElementWidth<HTMLDivElement>(760);
  // Carte et fiche côte à côte dès que la place le permet (la carte se met à
  // l'échelle, les étiquettes rapetissent un peu) ; sinon la fiche passe dessous.
  const sideBySide = rootW >= 1000;
  const panelW = Math.round(Math.min(380, Math.max(320, (rootW - 48) * 0.3)));

  const [view, setView] = useState<'village' | 'liste'>('village');
  const [filter, setFilter] = useState<VillageFilter>('tout');
  // Arrivée sur l'Accueil : la fiche « Ma journée ».
  const [selected, setSelected] = useState<SectionId>('accueil');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [backTo, setBackTo] = useState<SectionId>('accueil');
  const [district, setDistrict] = useState<DistrictId | null>(null);
  /** Zoom continu (1 = tout le village) et point visé à la souris (null = cible choisie). */
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [tourIdx, setTourIdx] = useState<number | null>(null);
  const [tourDone, setTourDone] = useState(false);
  /** Étapes figées au départ : une relecture des données ne décale pas la tournée. */
  const [tourList, setTourList] = useState<SectionId[]>([]);
  const [seen, setSeen] = useState(readSeen);
  const [ambianceOn, setAmbianceOn] = useState(readAmbianceOn);
  const [now, setNow] = useState(() => new Date());
  // Première visite de la session : le village se construit sous les yeux.
  const [arrival] = useState(() => {
    try {
      return !sessionStorage.getItem(ARRIVED_KEY);
    } catch {
      return false;
    }
  });
  // Astuce de prise en main, une seule fois par appareil.
  const [hint, setHint] = useState(() => {
    try {
      return !localStorage.getItem(HINT_KEY);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!arrival) return;
    try {
      sessionStorage.setItem(ARRIVED_KEY, '1');
    } catch {
      // stockage indisponible : l'arrivée se rejouera, rien d'autre
    }
  }, [arrival]);
  useEffect(() => {
    if (!hint || wall) return undefined;
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      // stockage indisponible : l'astuce reviendra
    }
    const t = window.setTimeout(() => setHint(false), 9000);
    return () => window.clearTimeout(t);
  }, [hint, wall]);

  // L'heure avance : l'ambiance (aube, jour, crépuscule, nuit) suit.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const ambiance = ambianceOn ? ambianceAt(now) : NEUTRAL;
  const particles = useMemo(
    () => (ambianceOn ? seasonParticles(ambiance.season) : []),
    [ambianceOn, ambiance.season]
  );

  const journee = useMemo(
    () => (data ? buildJournee(data, TITLES, news, firstName, now) : null),
    [data, news, firstName, now]
  );

  const sectionData = (id: SectionId): SectionData =>
    data?.sections[id] ??
    emptySection(loading ? 'Chargement…' : 'Données indisponibles');

  const mapSections = Object.fromEntries(
    MENU_ORDER.map((id) => {
      const d = sectionData(id);
      const info = SECTION_INFO[id];
      const s: MapSection = {
        title: info.title,
        icon: icon(id),
        badge: d.badge,
        tone: d.tone,
        tags: d.tags,
        aria: [
          info.title,
          d.badge ? d.chip : '',
          d.alert ?? '',
          d.activity && d.activity.level >= 2
            ? `activité ${d.activity.label.toLowerCase()}`
            : '',
        ]
          .filter(Boolean)
          .join(' — '),
        alert: d.alert,
        level: d.activity?.level ?? 0,
        preview: {
          chip: d.chip,
          stats: d.stats.slice(0, 3),
          activity:
            d.activity && d.activity.level >= 2
              ? `Activité du mois · ${d.activity.label}`
              : null,
        },
      };
      return [id, s];
    })
  ) as Record<SectionId, MapSection>;

  const selectSection = (id: SectionId) => {
    setSelected(id);
    setProjectId(null);
    setDistrict(null);
    setFocus(null);
  };
  const selectDistrict = (id: DistrictId) => {
    setFocus(null);
    if (district === id) {
      setDistrict(null);
      setZoom(1);
      return;
    }
    setDistrict(id);
    setProjectId(null);
    setZoom((z) => (z <= 1.001 ? ZOOM_STEPS[1] : z));
  };
  /** Fiche d'un projet ; `from` = la fiche où ramène le retour (« Ma journée » par défaut). */
  const openProject = (documentId: string, from: SectionId = 'accueil') => {
    setSelected('projets');
    setDistrict(null);
    setFocus(null);
    setProjectId(documentId);
    setBackTo(from);
  };
  /** Tout le village, sans quartier ni zoom. */
  const resetView = () => {
    setDistrict(null);
    setFocus(null);
    setZoom(1);
  };
  /**
   * Bulle d'activité : la page de la notification, comme dans la cloche, et
   * la notification passe en « lue » ; sans lien utilisable, la fiche du
   * bâtiment.
   */
  const openActivity = (a: VillageActivity) => {
    // Le store garde l'identifiant tel que le serveur l'envoie (un nombre) :
    // markAsRead le compare strictement.
    dispatch(markAsRead(a.rawId as string));
    markNotificationAsRead(String(a.rawId)).catch(() => undefined);
    if (a.link) navigate(a.link);
    else selectSection(a.id);
  };
  const setWall = (on: boolean) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (on) next.set('mural', '1');
        else next.delete('mural');
        return next;
      },
      { replace: true }
    );
  /** Plein écran demandé au clic même (le navigateur l'exige). */
  const enterWall = () => {
    document.documentElement.requestFullscreen?.()?.catch(() => undefined);
    setWall(true);
  };
  const exitWall = () => {
    if (document.fullscreenElement)
      document.exitFullscreen?.()?.catch(() => undefined);
    setWall(false);
  };

  // « Ma tournée du jour » : les rubriques qui demandent une action, urgences d'abord.
  const steps = data ? tourSteps(data.sections) : [];
  const goToStep = (i: number, list = tourList) => {
    const id = list[i];
    if (!id) return;
    setTourIdx(i);
    selectSection(id);
    setView('village');
    setZoom(ZOOM_STEPS[1]);
    setSeen(markSeen(id));
  };
  const startTour = () => {
    setTourDone(false);
    setTourList(steps);
    goToStep(resumeIndex(steps, seen), steps);
  };
  const endTour = (finished: boolean) => {
    setTourIdx(null);
    setZoom(1);
    setFocus(null);
    if (finished) {
      setTourDone(true);
      window.setTimeout(() => setTourDone(false), 4500);
    }
  };

  // Raccourcis : 1 à 5 = quartiers, Échap = tout le village, + et − = zoom,
  // flèches = se déplacer quand on a zoomé. Jamais pendant une saisie.
  const viewFocus = (): [number, number] => {
    if (focus) return focus;
    if (district) return districtCenter(district);
    const cell =
      LAYOUT.find((c) => c.id === selected) ??
      LAYOUT.find((c) => c.id === 'projets')!;
    return toMap(cell.u, cell.v);
  };
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyHandler.current = (e: KeyboardEvent) => {
    if (wall || view !== 'village' || e.ctrlKey || e.metaKey || e.altKey)
      return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    )
      return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= DISTRICTS.length) {
      e.preventDefault();
      selectDistrict(DISTRICTS[n - 1].id);
    } else if (e.key === 'Escape') {
      if (tourIdx !== null) endTour(false);
      else resetView();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setZoom((z) => stepZoom(z, 1));
    } else if (e.key === '-') {
      e.preventDefault();
      const next = stepZoom(zoom, -1);
      setZoom(next);
      if (next <= 1.001) setFocus(null);
    } else if (zoom > 1.001 && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = 90 / zoom;
      const [fx, fy] = viewFocus();
      setFocus([
        fx +
          (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0),
        fy + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0),
      ]);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const panelSection = (id: SectionId): PanelSection => ({
    id,
    title: SECTION_INFO[id].title,
    sub: SECTION_INFO[id].sub,
    icon: icon(id),
    cta: SECTION_INFO[id].cta,
    data: sectionData(id),
    district: districtById(districtOf(id)),
  });
  const project = projectId
    ? (data?.projects.find((p) => p.documentId === projectId) ?? null)
    : null;

  const dimmed = (id: SectionId) =>
    !matchesFilter(sectionData(id), filter) ||
    (!!district && districtOf(id) !== district);

  const kpis = data?.kpis;
  // Petite courbe de chaque chiffre : 7 derniers jours (ligne), ou 7 prochains
  // jours pour les livraisons (barres).
  const kpiCards: {
    label: string;
    value: string | number | null | undefined;
    trend: Trend | undefined;
    sub?: string | null;
    series: SeriesPoint[] | undefined;
    kind: 'past' | 'next';
    unit?: [string, string];
    icon: ReactNode;
    soft: string;
    ink: string;
    go: () => void;
  }[] = [
    {
      label: 'Projets en cours',
      value: kpis?.projectsInProgress,
      trend: kpis?.trends.projectsInProgress,
      series: kpis?.series.projectsInProgress,
      kind: 'past',
      icon: navigationIcon.projects,
      soft: '#efedff',
      ink: TONE.violet,
      go: () => selectSection('projets'),
    },
    {
      label: 'BAT à valider',
      value: kpis?.batToValidate,
      trend: kpis?.trends.batToValidate,
      series: kpis?.series.batToValidate,
      kind: 'past',
      icon: navigationIcon.quotes,
      soft: '#eaf1ff',
      ink: '#2563eb',
      go: () => {
        setFilter('traiter');
        const bat = data?.projects.find((p) => p.chipTone === 'bat');
        if (bat) openProject(bat.documentId);
        else selectSection('projets');
      },
    },
    {
      label: 'Prochaine livraison',
      value: kpis?.nextDelivery,
      trend: undefined,
      sub: kpis?.nextDeliveryIn ?? null,
      series: kpis?.series.deliveries,
      kind: 'next',
      unit: ['livraison', 'livraisons'],
      icon: navigationIcon.calendar,
      soft: '#e8f7ee',
      ink: TONE.green,
      go: () => {
        setFilter('livrer');
        selectSection('calendrier');
      },
    },
    {
      label: 'Factures en retard',
      value: kpis?.overdueInvoices,
      trend: kpis?.trends.overdueInvoices,
      series: kpis?.series.overdueInvoices,
      kind: 'past',
      icon: navigationIcon.invoices,
      soft: '#fff1e6',
      ink: TONE.orange,
      go: () => selectSection('finance'),
    },
  ];

  const fit = mapW / MAP_W;
  const ui = Math.min(1, Math.max(0.8, fit));
  const mapHeight = Math.round(MAP_H * fit);
  /** Guirlandes lumineuses : décembre et jusqu'à l'Épiphanie (avec l'ambiance). */
  const festive =
    ambianceOn &&
    (now.getMonth() === 11 || (now.getMonth() === 0 && now.getDate() <= 6));
  // Carte étroite : titre et choix de la vue passent dans un en-tête au-dessus
  // de la carte (posés dessus, ils couvriraient les étiquettes du haut).
  const compact = fit < 0.9;
  /** Quatre chiffres clés sur une ligne s'ils y tiennent (courbe comprise), sinon deux. */
  const kpiCols = rootW >= 1056 ? 4 : 2;
  /** Chiffres clés resserrés quand quatre cartes tiennent à peine sur la ligne. */
  const kc = kpiCols === 4 && rootW < 1150;
  const labelScale = Math.min(1, Math.max(0.82, fit / 0.85));

  const home = !district && !project && selected === 'accueil';
  const left = steps.filter((id) => !seen.includes(id)).length;
  const panel = (
    <VillagePanel
      loading={loading}
      journee={home ? { day: journee } : null}
      tour={
        steps.length
          ? {
              label: left ? 'Commencer ma tournée' : 'Refaire ma tournée',
              count: left || steps.length,
            }
          : null
      }
      district={
        district
          ? {
              d: districtById(district),
              members: membersOf(district).map(panelSection),
            }
          : null
      }
      project={district ? null : project}
      projectBack={
        backTo === 'accueil' ? 'Ma journée' : SECTION_INFO[backTo].title
      }
      section={district || project || home ? null : panelSection(selected)}
      onSelect={selectSection}
      onOpenProject={(id) => openProject(id, selected)}
      onProjectPage={(id) => navigate(`/common/projects/details/${id}`)}
      onDistrict={selectDistrict}
      onShowAll={resetView}
      onBack={() => selectSection(backTo)}
      onHome={() => selectSection('accueil')}
      onStartTour={startTour}
      onCta={(id) =>
        id === 'accueil' ? onClassic() : navigate(SECTION_INFO[id].to)
      }
      onNavigate={(to) => navigate(to)}
    />
  );

  const segment = (on: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 40 * ui,
    padding: `0 ${16 * ui}px`,
    border: 0,
    borderRadius: 999,
    background: on ? TONE.violet : 'transparent',
    color: on ? '#ffffff' : '#111827',
    fontSize: 14 * ui,
    fontWeight: 700,
    cursor: 'pointer',
  });

  const tourButton = (
    <button
      type="button"
      className="vgx-btn"
      onClick={startTour}
      disabled={!steps.length}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 38 * ui,
        marginTop: 10 * ui,
        padding: `0 ${8 * ui}px 0 ${14 * ui}px`,
        border: 0,
        borderRadius: 999,
        background: steps.length ? TONE.violet : '#e5e7eb',
        color: steps.length ? '#ffffff' : '#6b7280',
        fontSize: 14 * ui,
        fontWeight: 800,
        cursor: steps.length ? 'pointer' : 'default',
        boxShadow: steps.length ? '0 8px 18px rgba(109,93,252,0.35)' : 'none',
        pointerEvents: 'auto',
      }}
    >
      <HiOutlineClipboardDocumentCheck aria-hidden="true" />
      {!steps.length
        ? 'Rien à traiter aujourd’hui'
        : left
          ? 'Ma tournée du jour'
          : 'Tournée faite · la refaire'}
      {!!steps.length && (
        <span
          style={{
            minWidth: 24 * ui,
            height: 24 * ui,
            padding: '0 7px',
            boxSizing: 'border-box',
            borderRadius: 999,
            background: '#ffffff',
            color: TONE.violet,
            fontSize: 12.5 * ui,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {left || steps.length}
        </span>
      )}
    </button>
  );

  const title = (
    <div>
      <h1
        style={{
          margin: 0,
          fontSize: 34 * ui,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: ambiance.ink,
          lineHeight: 1.1,
        }}
      >
        Votre village PEG
      </h1>
      <p
        style={{
          margin: `${6 * ui}px 0 0`,
          fontSize: 15.5 * ui,
          color: ambiance.muted,
        }}
      >
        Un bâtiment pour chaque partie de PEG.
      </p>
      {tourButton}
    </div>
  );
  const toggle = (
    <div
      role="group"
      aria-label="Affichage"
      style={{
        display: 'flex',
        gap: 4,
        padding: 5,
        borderRadius: 999,
        background: '#ffffff',
        boxShadow: '0 6px 18px rgba(40,36,80,0.08)',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        className="vgx-btn"
        aria-pressed={view === 'village'}
        onClick={() => setView('village')}
        style={segment(view === 'village')}
      >
        <HiOutlineMap aria-hidden="true" /> Vue village
      </button>
      <button
        type="button"
        className="vgx-btn"
        aria-pressed={view === 'liste'}
        onClick={() => setView('liste')}
        style={segment(view === 'liste')}
      >
        <HiOutlineQueueList aria-hidden="true" /> Vue liste
      </button>
      <button
        type="button"
        className="vgx-btn"
        onClick={onClassic}
        title="Bannière, pense-bête et widgets"
        style={segment(false)}
      >
        <HiOutlineViewGrid aria-hidden="true" /> Vue classique
      </button>
      <button
        type="button"
        className="vgx-btn"
        onClick={enterWall}
        title="Plein écran pour une télévision : le village fait seul son tour"
        style={segment(false)}
      >
        <HiOutlineTv aria-hidden="true" /> Écran mural
      </button>
    </div>
  );

  const overlays = (
    <>
      {!compact && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 26 * ui - 10,
              top: 22 * ui - 8,
              padding: '8px 10px',
              borderRadius: 16,
              background:
                zoom > 1.001
                  ? ambiance.phase === 'night'
                    ? 'rgba(20,26,56,0.82)'
                    : 'rgba(246,243,237,0.9)'
                  : 'transparent',
              transition: 'background .3s ease',
              pointerEvents: 'none',
              zIndex: 2100,
            }}
          >
            {title}
          </div>
          <div
            style={{
              position: 'absolute',
              right: 20 * ui,
              top: 20 * ui,
              zIndex: 2100,
            }}
          >
            {toggle}
          </div>
        </>
      )}
      {tourIdx !== null && tourList[tourIdx] ? (
        <div
          role="region"
          aria-label="Ma tournée du jour"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: 20 * ui,
            bottom: 18 * ui,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: `calc(100% - ${110 * ui}px)`,
            padding: '6px 6px 6px 16px',
            borderRadius: 999,
            background: '#ffffff',
            boxShadow: '0 10px 26px rgba(40,36,80,0.18)',
            zIndex: 2150,
          }}
        >
          <span
            style={{
              fontSize: 12.5 * ui,
              fontWeight: 800,
              color: TONE.violet,
              whiteSpace: 'nowrap',
            }}
          >
            Tournée · {tourIdx + 1}/{tourList.length}
          </span>
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 14 * ui,
              fontWeight: 700,
              color: sectionData(tourList[tourIdx]).alert
                ? '#b91c1c'
                : '#111827',
            }}
          >
            {SECTION_INFO[tourList[tourIdx]].title} —{' '}
            {sectionData(tourList[tourIdx]).alert ??
              sectionData(tourList[tourIdx]).chip}
          </span>
          <button
            type="button"
            className="vgx-btn"
            aria-label="Étape précédente"
            disabled={tourIdx === 0}
            onClick={() => goToStep(tourIdx - 1)}
            style={{
              ...segment(false),
              padding: `0 ${10 * ui}px`,
              opacity: tourIdx === 0 ? 0.35 : 1,
            }}
          >
            <HiChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="vgx-btn"
            onClick={() =>
              tourIdx + 1 < tourList.length
                ? goToStep(tourIdx + 1)
                : endTour(true)
            }
            style={segment(true)}
          >
            {tourIdx + 1 < tourList.length ? 'Suivant' : 'Terminer'}
            <HiChevronRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className="vgx-btn"
            aria-label="Arrêter la tournée"
            onClick={() => endTour(false)}
            style={{ ...segment(false), padding: `0 ${10 * ui}px` }}
          >
            <HiX aria-hidden="true" />
          </button>
        </div>
      ) : tourDone ? (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: 20 * ui,
            bottom: 18 * ui,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 50 * ui,
            padding: `0 ${18 * ui}px`,
            borderRadius: 999,
            background: '#ffffff',
            color: '#15803d',
            fontSize: 14.5 * ui,
            fontWeight: 800,
            boxShadow: '0 10px 26px rgba(40,36,80,0.18)',
            zIndex: 2150,
          }}
        >
          Tournée terminée : {tourList.length} rubrique
          {tourList.length > 1 ? 's' : ''} passée
          {tourList.length > 1 ? 's' : ''} en revue.
        </div>
      ) : (
        <div
          role="group"
          aria-label="Filtrer le village"
          style={{
            position: 'absolute',
            left: 20 * ui,
            bottom: 18 * ui,
            display: 'flex',
            gap: 4,
            padding: 5,
            borderRadius: 999,
            background: '#ffffff',
            boxShadow: '0 6px 18px rgba(40,36,80,0.08)',
            zIndex: 2100,
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="vgx-btn"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              style={segment(filter === f.id)}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: filter === f.id ? '#ffffff' : f.dot,
                }}
              />
              {f.label}
            </button>
          ))}
        </div>
      )}
      {view === 'village' && hint && (
        <div
          role="note"
          style={{
            position: 'absolute',
            left: '50%',
            // En bas, au-dessus des filtres : en haut, elle couvrait le bouton
            // de la tournée sur les grands écrans.
            bottom: 74 * ui,
            transform: 'translateX(-50%)',
            maxWidth: '86%',
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(17,24,39,0.86)',
            color: '#ffffff',
            fontSize: 12.5 * ui,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 2160,
            pointerEvents: 'none',
          }}
        >
          Astuce : glissez la carte pour vous déplacer · molette pour zoomer ·
          touches 1 à 5 pour les quartiers · Échap pour tout revoir
        </div>
      )}
      {view === 'village' && (
        <div
          role="group"
          aria-label="Zoom"
          style={{
            position: 'absolute',
            right: 20 * ui,
            bottom: 18 * ui,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            background: '#ffffff',
            boxShadow: '0 6px 18px rgba(40,36,80,0.08)',
            overflow: 'hidden',
            zIndex: 2100,
          }}
        >
          <button
            type="button"
            className="vgx-btn"
            aria-pressed={ambianceOn}
            aria-label={
              ambianceOn
                ? 'Ambiance réelle (heure et saison) : activée'
                : 'Ambiance réelle (heure et saison) : coupée'
            }
            title={ambianceOn ? 'Couper l’ambiance' : 'Heure et saison réelles'}
            onClick={() => {
              writeAmbianceOn(!ambianceOn);
              setAmbianceOn(!ambianceOn);
            }}
            style={{
              width: 46 * ui,
              height: 46 * ui,
              border: 0,
              background: 'transparent',
              color: ambianceOn ? TONE.violet : '#9ca3af',
              fontSize: 20 * ui,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {ambiance.phase === 'night' || ambiance.phase === 'dusk' ? (
              <HiOutlineMoon aria-hidden="true" />
            ) : (
              <HiOutlineSun aria-hidden="true" />
            )}
          </button>
          <span
            style={{ height: 1, background: '#ece8e1', margin: '0 10px' }}
          />
          <button
            type="button"
            className="vgx-btn"
            aria-label="Zoomer"
            title="Zoomer (molette, touche +)"
            disabled={zoom >= ZOOM_MAX - 0.01}
            onClick={() => setZoom((z) => stepZoom(z, 1))}
            style={{
              width: 46 * ui,
              height: 46 * ui,
              border: 0,
              background: 'transparent',
              color: zoom < ZOOM_MAX - 0.01 ? '#111827' : '#c4c4cc',
              fontSize: 24 * ui,
              cursor: zoom < ZOOM_MAX - 0.01 ? 'pointer' : 'default',
            }}
          >
            +
          </button>
          <span
            style={{ height: 1, background: '#ece8e1', margin: '0 10px' }}
          />
          <button
            type="button"
            className="vgx-btn"
            aria-label="Dézoomer"
            title="Dézoomer (molette, touche −)"
            disabled={zoom <= 1.001}
            onClick={() => {
              const next = stepZoom(zoom, -1);
              setZoom(next);
              if (next <= 1.001) setFocus(null);
            }}
            style={{
              width: 46 * ui,
              height: 46 * ui,
              border: 0,
              background: 'transparent',
              color: zoom > 1.001 ? '#111827' : '#c4c4cc',
              fontSize: 24 * ui,
              cursor: zoom > 1.001 ? 'pointer' : 'default',
            }}
          >
            −
          </button>
        </div>
      )}
    </>
  );

  const wallKpis: WallKpi[] = kpiCards.map(
    ({ label, value, sub, trend, series, kind, unit, icon: kpiIcon, ink }) => ({
      label,
      value,
      sub,
      trend,
      series,
      kind,
      unit,
      icon: kpiIcon,
      ink,
    })
  );
  const renderWallMap = (v: WallMapView) => (
    <VillageMap
      width={v.width}
      sections={mapSections}
      selected={null}
      district={v.district}
      filter="tout"
      zoom={v.zoom}
      focus={v.focus}
      onSelect={() => undefined}
      onSelectDistrict={() => undefined}
      labelScale={v.labelScale}
      ambiance={ambianceOn ? ambiance : null}
      particles={particles}
      activity={activity}
      chantier={data?.chantier ?? []}
      life={data?.life ?? null}
      festive={festive}
      cameraMs={v.cameraMs}
    />
  );

  return (
    <div
      ref={rootRef}
      style={{
        minHeight: '100%',
        background: '#f3f1ec',
        color: '#111827',
        padding: '20px 24px 28px',
        boxSizing: 'border-box',
        // Écran mural : la page reste montée (tailles, état) mais masquée —
        // sa carte ne s'anime pas pour rien sous l'écran mural.
        display: wall ? 'none' : undefined,
      }}
    >
      <style>{CSS}</style>
      {wall && (
        <VillageWall
          data={data}
          kpis={wallKpis}
          journee={journee}
          activity={activity}
          ambiance={ambiance}
          renderMap={renderWallMap}
          onRefresh={refresh}
          onExit={exitWall}
        />
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${kpiCols}, minmax(0, 1fr))`,
          gap: 16,
        }}
      >
        {kpiCards.map((k) => (
          <button
            key={k.label}
            type="button"
            className="vgx-card"
            onClick={k.go}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: kc ? 10 : 14,
              minHeight: 78,
              padding: kc ? '0 12px' : '0 16px',
              borderRadius: 18,
              border: '1px solid #ece8e1',
              background: '#ffffff',
              color: '#111827',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(40,36,80,0.05)',
            }}
          >
            <span
              style={{
                width: kc ? 40 : 48,
                height: kc ? 40 : 48,
                flexShrink: 0,
                borderRadius: 14,
                background: k.soft,
                color: k.ink,
                fontSize: kc ? 20 : 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {k.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: kc ? 13 : 14,
                  color: '#374151',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {k.label}
              </span>
              {/* Le chiffre partage sa ligne avec la petite courbe : le
                  libellé et l'évolution gardent toute la largeur. */}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: kc ? 21 : 24,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {k.value === undefined
                    ? '…'
                    : k.value === null
                      ? '—'
                      : k.value}
                </span>
                {k.series && (
                  <VillageSparkline
                    points={k.series}
                    accent={k.ink}
                    kind={k.kind}
                    unit={k.unit}
                    width={kc ? 58 : 76}
                    height={kc ? 26 : 30}
                  />
                )}
              </span>
              {!k.trend && 'sub' in k && k.sub && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 3,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: TREND_COLORS.neutral.bg,
                    color: TREND_COLORS.neutral.fg,
                    fontSize: kc ? 11 : 11.5,
                    fontWeight: 700,
                    ...CHIP_FIT,
                  }}
                >
                  {k.sub}
                </span>
              )}
              {k.trend && (
                <span
                  title={`Évolution ${k.trend.since}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 3,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: TREND_COLORS[k.trend.tone].bg,
                    color: TREND_COLORS[k.trend.tone].fg,
                    fontSize: kc ? 11 : 11.5,
                    fontWeight: 700,
                    ...CHIP_FIT,
                  }}
                >
                  {trendText(k.trend)}
                </span>
              )}
            </span>
            {!k.series && (
              <HiChevronRight
                aria-hidden="true"
                style={{ fontSize: 20, color: '#111827' }}
              />
            )}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: sideBySide
            ? `minmax(0, 1fr) ${panelW}px`
            : 'minmax(0, 1fr)',
          gap: 16,
          marginTop: 16,
          alignItems: 'start',
        }}
      >
        <section
          ref={mapRef}
          aria-label="Votre village PEG"
          style={{
            position: 'relative',
            borderRadius: 24,
            background: ambiance.sky,
            transition: 'background 1s ease',
            border: '1px solid #ebe5db',
            overflow: 'hidden',
            minHeight: mapHeight,
          }}
        >
          {view === 'village' && ambiance.veil && (
            // Voile de l'heure (nuit, aube, crépuscule) : sur le ciel et l'îlot,
            // sous les étiquettes, les lumières et les commandes.
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                background: ambiance.veil.color,
                opacity: ambiance.veil.opacity,
                mixBlendMode: 'multiply',
                pointerEvents: 'none',
                transition: 'opacity 1s ease, background 1s ease',
              }}
            />
          )}
          {compact && (
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                padding: '16px 18px 6px 20px',
              }}
            >
              {title}
              {toggle}
            </div>
          )}
          {view === 'village' ? (
            <VillageMap
              width={mapW}
              sections={mapSections}
              selected={district || projectId ? null : selected}
              district={district}
              filter={filter}
              zoom={zoom}
              focus={focus}
              onCamera={(c) => {
                setZoom(c.zoom);
                setFocus(c.zoom > 1.001 ? c.focus : null);
                setHint(false);
              }}
              onSelect={selectSection}
              onSelectDistrict={selectDistrict}
              labelScale={labelScale}
              ambiance={ambianceOn ? ambiance : null}
              particles={particles}
              activity={activity}
              onOpenActivity={openActivity}
              chantier={data?.chantier ?? []}
              onOpenProject={(id) =>
                data?.projects.some((p) => p.documentId === id)
                  ? openProject(id)
                  : navigate(`/common/projects/details/${id}`)
              }
              life={data?.life ?? null}
              festive={festive}
              arrival={arrival}
            >
              {overlays}
            </VillageMap>
          ) : (
            <div style={{ position: 'relative', minHeight: mapHeight }}>
              <VillageList
                top={compact ? 12 : 104}
                sections={
                  Object.fromEntries(
                    MENU_ORDER.map((id) => [
                      id,
                      {
                        title: SECTION_INFO[id].title,
                        icon: icon(id),
                        data: sectionData(id),
                      },
                    ])
                  ) as Record<
                    SectionId,
                    { title: string; icon: ReactNode; data: SectionData }
                  >
                }
                selected={district || projectId ? null : selected}
                district={district}
                dimmed={dimmed}
                onSelect={selectSection}
                onDistrict={selectDistrict}
              />
              {overlays}
            </div>
          )}
        </section>

        <aside
          aria-label="Fiche"
          style={{
            position: sideBySide ? 'sticky' : 'relative',
            top: 84,
            boxSizing: 'border-box',
            minHeight: sideBySide ? mapHeight : 0,
            padding: '24px 24px 22px',
            borderRadius: 24,
            background: '#ffffff',
            border: '1px solid #ece8e1',
            boxShadow: '0 6px 20px rgba(40,36,80,0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {panel}
        </aside>
      </div>
    </div>
  );
};

export default AdminVillage;
