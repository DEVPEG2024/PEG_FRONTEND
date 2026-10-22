// Accueil admin « PEG DISTRICTS » (ordinateur, ≥ 1024 px), d'après la maquette
// du 22/10/2026 : la ville est un rendu 3D (une image) ; posés dessus, les six
// quartiers (carte aux vrais chiffres, rubriques au clic), les trois sites de
// production numérotés et la ligne de production lumineuse, et la vie de la
// ville : le réseau des échanges (un pôle sur chaque toit, des arcs où file le
// courant et circulent les jetons, au rythme des vrais chiffres), la route des
// livraisons et ses camions, la circulation sur quatre routes, des bateaux,
// des ondes. À droite « Ma journée », les indicateurs clés et la légende des
// échanges. Vue liste et tableau de bord classique (« Statistiques ») à un
// clic ; le plein écran ouvre l'écran mural.
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiArrowRight,
  HiArrowTrendingDown,
  HiArrowTrendingUp,
  HiChevronDown,
  HiChevronRight,
  HiOutlineArrowsPointingOut,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineCog6Tooth,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineFlag,
  HiOutlineLifebuoy,
  HiOutlineListBullet,
  HiOutlineMap,
  HiOutlineMinus,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
  HiOutlineRectangleStack,
  HiOutlineSparkles,
  HiOutlineUsers,
} from 'react-icons/hi2';
import navigationIcon from '@/configs/navigation-icon.config';
import { markNotificationAsRead } from '@/services/NotificationService';
import { useAppDispatch, useAppSelector } from '@/store';
import { markAsRead } from '@/store/slices/base/notificationSlice';
import VillageList from './VillageList';
import { useElementWidth } from './useElementWidth';
import useVillageData from './useVillageData';
import { buildJournee, newsKey, type JourneeRow } from './villageJournee';
import { SECTION_INFO } from './villageSections';
import {
  DISTRICTS,
  MENU_ORDER,
  districtOf,
  membersOf,
  type DistrictId,
  type SectionId,
} from './villageScene';
import { emptySection, type SectionData, type Trend } from './villageModel';
import { flowDots, readAnimationsOn, writeAnimationsOn } from './villageFlows';
import { NETWORK, linkCount } from './districtsNetwork';
import {
  BEACONS,
  BIRD_PATHS,
  CARD_H,
  CITY_IMAGE,
  CONVEYOR,
  CONVEYOR_SHORT,
  DELIVERY_ROUTE,
  DISTRICT_SPOTS,
  DISTRICT_ZOOM_MAX,
  DRONE_LOOPS,
  FOUNTAINS,
  GLASS,
  PRODUCTION_SITES,
  ROADS,
  ROOFS,
  TOWER_NEON,
  WATER_GLINTS,
  WATERWAYS,
  BUBBLE_H,
  arcPath,
  bounds,
  bubbleWidth,
  cardWidth,
  cityCamera,
  compactFrame,
  districtLine,
  focusOfCamera,
  placeBubbles,
  placeDistrictCards,
  pointsLength,
  polygonPath,
  readCount as num,
  sectionAnchor,
  siteBoxes,
  smoothLoop,
  smoothPath,
  statOf,
  toFrame,
  toImage,
} from './districtsScene';
import useActivityTicker, { TICK_MS } from './useActivityTicker';
import useVillageActivity from './useVillageActivity';
import { agoLabel, type VillageActivity } from './villageActivity';

const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#eceef4';
const VIOLET = '#6d5dfc';
const PANEL_W = 340;
const GAP = 24;
/** Marge intérieure de la page claire posée sur le fond sombre de l'application. */
const PAD = 28;
const ZOOMS = [1, 1.4, 1.8, DISTRICT_ZOOM_MAX];
const EASE = 'transform .45s cubic-bezier(.2,.8,.2,1)';

const CSS = `
.pd-card,.pd-kpi,.pd-row{transition:transform .18s ease,box-shadow .18s ease}
.pd-card:hover,.pd-kpi:hover,.pd-row:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(30,27,75,.14)}
.pd-pin:hover .pd-pin-label{background:rgba(17,24,39,.92)}
.pd-btn:focus-visible,.pd-card:focus-visible,.pd-pin:focus-visible,.pd-kpi:focus-visible,.pd-row:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
.pd-flow{animation:pd-flow 2.4s linear infinite}
@keyframes pd-flow{to{stroke-dashoffset:-160}}
.pd-current{animation:pd-current 1.3s linear infinite}
@keyframes pd-current{to{stroke-dashoffset:-120}}
.pd-glow,.pd-arc,.pd-lane,.pd-layer{transition:opacity .25s ease}
.pd-pulse{transform-box:fill-box;transform-origin:center;animation:pd-pulse 2.8s ease-out infinite}
@keyframes pd-pulse{0%{transform:scale(.3);opacity:.95}100%{transform:scale(1.7);opacity:0}}
.pd-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:pd-draw 1.4s cubic-bezier(.3,.7,.2,1) forwards}
@keyframes pd-draw{to{stroke-dashoffset:0}}
.pd-blink{animation:pd-blink 1.6s steps(1,end) infinite}
@keyframes pd-blink{0%,55%{opacity:1}56%,100%{opacity:.15}}
.pd-breathe{animation:pd-breathe 3.2s ease-in-out infinite}
@keyframes pd-breathe{0%,100%{opacity:.2}50%{opacity:.8}}
.pd-scan{animation:pd-scan 2.6s linear infinite}
@keyframes pd-scan{from{transform:translateY(0)}to{transform:translateY(var(--pd-scan))}}
.pd-shine{transform-box:fill-box;animation:pd-shine 9s ease-in-out infinite}
@keyframes pd-shine{0%{transform:translateX(-120%)}16%,100%{transform:translateX(220%)}}
.pd-drop{animation:pd-drop 1.5s ease-in-out infinite}
@keyframes pd-drop{0%{transform:translate(0,0);opacity:0}15%{opacity:1}50%{transform:translate(calc(var(--dx) * .5),var(--h))}100%{transform:translate(var(--dx),0);opacity:0}}
.pd-glint{opacity:0;animation:pd-glint 2.6s ease-in-out infinite}
@keyframes pd-glint{0%,100%{opacity:0}50%{opacity:.95}}
.pd-rise{animation:pd-rise 2.2s ease-out infinite}
@keyframes pd-rise{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-30px);opacity:0}}
.pd-wing{transform-box:fill-box;transform-origin:center;animation:pd-wing .45s ease-in-out infinite alternate}
@keyframes pd-wing{to{transform:scaleY(-.5)}}
.pd-bubble{animation:pd-bubble var(--pd-life,5s) ease forwards}
@keyframes pd-bubble{0%{opacity:0;transform:translateY(10px) scale(.92)}10%,84%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-14px)}}
.pd-bubble:hover{animation-play-state:paused}
@media (prefers-reduced-motion: reduce){.pd-card,.pd-kpi,.pd-row,.pd-glow,.pd-arc,.pd-lane,.pd-layer{transition:none}.pd-flow,.pd-current,.pd-pulse,.pd-draw,.pd-blink,.pd-breathe,.pd-scan,.pd-shine,.pd-drop,.pd-glint,.pd-rise,.pd-wing,.pd-bubble{animation:none}.pd-draw{stroke-dashoffset:0}}
`;

const CARDS_KEY = 'peg:districtsCards';

/** Cartes des quartiers affichées sur cet appareil (oui par défaut). */
const readCardsOn = (): boolean => {
  try {
    return localStorage.getItem(CARDS_KEY) !== 'off';
  } catch {
    return true;
  }
};

const writeCardsOn = (on: boolean) => {
  try {
    localStorage.setItem(CARDS_KEY, on ? 'on' : 'off');
  } catch {
    // stockage indisponible : le choix vaut pour la session
  }
};

/** Carrosseries de la circulation (les feux et la traînée sont communs). */
const CAR_COLORS = [
  '#ffffff',
  '#e5e7eb',
  '#93c5fd',
  '#fca5a5',
  '#c4b5fd',
  '#334155',
];

/** Apparition et disparition en fondu aux deux bouts d'un trajet. */
const fadeEnds = (dur: number, begin: number, until = 1) => (
  <animate
    attributeName="opacity"
    values="0;1;1;0;0"
    keyTimes={`0;${(0.06 * until).toFixed(3)};${(0.92 * until).toFixed(3)};${until};1`}
    dur={`${dur.toFixed(1)}s`}
    begin={`${begin.toFixed(1)}s`}
    repeatCount="indefinite"
  />
);

/** Tracés lissés des routes, des voies d'eau et de la route des livraisons. */
const ROAD_PATHS = ROADS.map((r) => ({
  ...r,
  d: smoothPath(r.pts),
  length: pointsLength(r.pts),
}));
const WATER_PATHS = WATERWAYS.map((w) => ({
  ...w,
  d: smoothPath(w.pts),
  length: pointsLength(w.pts),
}));
const DELIVERY = {
  d: smoothPath(DELIVERY_ROUTE),
  length: pointsLength(DELIVERY_ROUTE),
};
const DRONE_PATHS = DRONE_LOOPS.map((pts) => ({
  d: smoothLoop(pts),
  length: pointsLength([...pts, pts[0]]),
}));
const BIRD_TRACKS = BIRD_PATHS.map((pts) => ({
  d: smoothPath(pts),
  length: pointsLength(pts),
  /** 1 : vers la droite, -1 : vers la gauche (le V suit). */
  dir: pts[pts.length - 1][0] > pts[0][0] ? 1 : -1,
}));
/** Un vol en V : le meneur devant, les autres en retrait. */
const FLOCK: [number, number][] = [
  [0, 0],
  [-11, -6],
  [-11, 6],
  [-22, -11],
  [-22, 11],
];

/** La couleur des livraisons : leur lien, leur route au sol et les camions. */
const DELIVERY_COLOR =
  NETWORK.find((l) => l.id === 'livraisons')?.color ?? '#0ea5e9';

const DISTRICT_ICON: Record<DistrictId, ReactNode> = {
  clients: <HiOutlineUsers />,
  projets: <HiOutlineDocumentText />,
  boutique: <HiOutlineCube />,
  production: <HiOutlineCog6Tooth />,
  finance: <HiOutlineChartPie />,
  assistance: <HiOutlineLifebuoy />,
};

const TITLES = Object.fromEntries(
  MENU_ORDER.map((id) => [id, SECTION_INFO[id].title])
) as Record<SectionId, string>;

const sectionIcon = (id: SectionId): ReactNode =>
  navigationIcon[SECTION_INFO[id].icon];

const TREND_INK: Record<Trend['tone'], string> = {
  good: '#15803d',
  bad: '#b91c1c',
  neutral: MUTED,
};

interface Props {
  /** Le tableau de bord classique (« Statistiques »). */
  onClassic: () => void;
  /** L'écran mural, en plein écran. */
  onWall: () => void;
}

const PegDistricts = ({ onClassic, onWall }: Props) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data, loading, refresh } = useVillageData();
  const firstName = useAppSelector(
    (s) => s.auth.user.user?.firstName?.trim() || null
  );
  const news = useAppSelector((s) =>
    newsKey(
      s.base.notification?.notifications ?? [],
      Date.now(),
      !!s.base.notification?.hasMore
    )
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const journee = useMemo(
    () => (data ? buildJournee(data, TITLES, news, firstName, now) : null),
    [data, news, firstName, now]
  );

  // Place disponible : la ville et le panneau côte à côte sur grand écran,
  // le panneau sous la ville sinon. La ville garde le format de l'image.
  const [rootRef, rootW] = useElementWidth<HTMLDivElement>(1200);
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const innerW = Math.max(320, rootW - 2 * PAD);
  const side = innerW >= 1180;
  const frameW = Math.max(320, side ? innerW - PANEL_W - GAP : innerW);
  const frameH = Math.round(
    Math.min(Math.max(frameW * 0.56, 440), Math.max(440, vh - 230))
  );

  const [view, setView] = useState<'ville' | 'liste'>('ville');
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<[number, number] | undefined>();
  const [moving, setMoving] = useState(false);
  const [open, setOpen] = useState<DistrictId | null>(null);
  const [hot, setHot] = useState<DistrictId | null>(null);
  const [allDay, setAllDay] = useState(false);
  const cam = cityCamera(frameW, frameH, zoom, focus);
  // Cadre étroit : cartes resserrées et commandes en icônes. Une carte hors
  // champ revient au bord du cadre, sans recouvrir sa voisine ni un site.
  const compact = compactFrame(frameW);
  const cardW = cardWidth(frameW);
  const cardAt = placeDistrictCards(cam, frameW, frameH);
  // La ville bouge (échanges, circulation, camions, ondes) sauf si on coupe
  // les animations — choix partagé avec l'écran mural — ou si le système en
  // demande moins.
  const [animOn, setAnimOn] = useState(readAnimationsOn);
  const [reduced] = useState(
    () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  // Ville sortie de l'écran (page défilée) : rien ne bouge, rien ne coûte.
  const [inView, setInView] = useState(true);
  const motion = animOn && !reduced && inView;
  const [hotFlow, setHotFlow] = useState<string | null>(null);
  const uid = useId().replace(/:/g, '');

  /**
   * Les échanges entre bâtiments, au rythme des vrais chiffres (deux fois la
   * densité de l'écran mural, toujours proportionnelle) : sans volume, ou
   * chiffre illisible, l'arc reste tracé, pâle et immobile.
   */
  const arcs = NETWORK.flatMap((l) => {
    const a = ROOFS[l.from];
    const b = ROOFS[l.to];
    if (!a || !b) return [];
    const count = linkCount(l, data);
    const doc = l.token === 'doc';
    return [
      {
        id: l.id,
        a,
        b,
        color: l.color,
        d: arcPath(a, b, l.bend),
        dots: Math.min(doc ? 6 : 12, flowDots(count, l.token) * 2),
        doc,
        dur: Math.max(4, (Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.1) / 90),
        districts: [districtOf(l.from), districtOf(l.to)],
      },
    ];
  });
  /** Un échange ressort quand on le survole dans la légende, ou son quartier sur la carte. */
  const arcLit = (x: { id: string; districts: DistrictId[] }) =>
    hotFlow ? x.id === hotFlow : hot ? x.districts.includes(hot) : true;
  /**
   * Les pôles : un par toit relié, allumé si l'un de ses échanges l'est,
   * actif (des particules montent) si l'un d'eux a du volume.
   */
  const hubs = [
    ...new Map(arcs.flatMap((x) => [x.a, x.b]).map((p) => [p.join(), p])),
  ].map(([key, at]) => {
    const mine = arcs.filter((x) => x.a.join() === key || x.b.join() === key);
    return {
      key,
      at,
      lit: mine.some(arcLit),
      active: mine.some((x) => x.dots > 0),
    };
  });
  // Les cartes des quartiers (et les noms des sites) : on peut les retirer
  // pour voir la ville seule ; le choix est gardé sur l'appareil.
  const [cardsOn, setCardsOn] = useState(readCardsOn);
  const toggleCards = () => {
    writeCardsOn(!cardsOn);
    setCardsOn(!cardsOn);
    setOpen(null);
    setHot(null);
  };
  // L'activité : une notification qui arrive s'affiche au-dessus de son
  // bâtiment ; le reste du temps, le fil des 48 dernières heures défile.
  const liveBubbles = useVillageActivity(refresh);
  const ticker = useActivityTicker(motion && liveBubbles.length === 0);
  // Les livraisons roulent : une route tracée des quais au pont, et un camion
  // par livraison du jour — ou, faute de livraison aujourd'hui, au rythme de
  // celles de la semaine (le chiffre de la légende).
  const laneLit = hotFlow
    ? hotFlow === 'livraisons'
    : hot
      ? hot === 'production' || hot === 'clients'
      : true;
  const vans = Math.min(
    3,
    Math.max(
      data?.life.vans ?? 0,
      flowDots(data?.flowCounts.livraisons ?? null, 'doc')
    )
  );
  const pulses: { at: [number, number]; color: string }[] = [
    ...new Map(
      arcs
        .filter((x) => x.dots > 0)
        .map((x) => [x.b.join(), { at: x.b, color: x.color }])
    ).values(),
  ];

  const section = (id: SectionId): SectionData =>
    data?.sections[id] ??
    emptySection(loading ? 'Chargement…' : 'Données indisponibles');
  const go = (id: SectionId) => navigate(SECTION_INFO[id].to);
  /**
   * Bulle d'activité : la page de la notification, comme dans la cloche, et
   * la notification passe en « lue » ; sans lien utilisable, la page de la
   * rubrique.
   */
  const openActivity = (a: VillageActivity) => {
    // Le store garde l'identifiant tel que le serveur l'envoie (un nombre) :
    // markAsRead le compare strictement.
    dispatch(markAsRead(a.rawId as string));
    markNotificationAsRead(String(a.rawId)).catch(() => undefined);
    if (a.link) navigate(a.link);
    else go(a.id);
  };
  /** Les bulles du moment : celles qui arrivent, sinon une du fil des 48 h. */
  const bubbles: {
    a: VillageActivity;
    key: string;
    label: string;
    fresh: boolean;
  }[] = liveBubbles.length
    ? liveBubbles.map((a) => ({
        a,
        key: `live-${a.key}`,
        label: 'Nouveau',
        fresh: true,
      }))
    : ticker
      ? [
          {
            a: ticker.item,
            key: `fil-${ticker.turn}`,
            label: agoLabel(ticker.item.at, Date.now()),
            fresh: false,
          },
        ]
      : [];
  // Chaque bulle au-dessus de son bâtiment, sans recouvrir une carte, un
  // site ni une autre bulle ; bâtiment hors du cadre (au zoom) : pas de bulle.
  const shownBubbles = bubbles.flatMap((b) => {
    const anchor = toFrame(cam, sectionAnchor(b.a.id));
    const inside =
      anchor[0] >= 0 &&
      anchor[0] <= frameW &&
      anchor[1] >= 0 &&
      anchor[1] <= frameH;
    const sub = `${b.label} · ${SECTION_INFO[b.a.id].title}`;
    return inside ? [{ ...b, anchor, sub, w: bubbleWidth(b.a.text, sub) }] : [];
  });
  const bubbleSpots = placeBubbles(
    shownBubbles,
    frameW,
    frameH,
    cardsOn
      ? [
          ...cardAt.map((at) => ({ at, w: cardW, h: CARD_H, gap: 6 })),
          ...siteBoxes(cam),
        ]
      : []
  );

  // ── Zoom à la molette (le point sous la souris reste en place), glisser ──
  const frameRef = useRef<HTMLDivElement>(null);
  const live = useRef({ cam, zoom, frameW, frameH });
  live.current = { cam, zoom, frameW, frameH };
  const idle = useRef<number | undefined>();
  const settle = () => {
    setMoving(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setMoving(false), 180);
  };
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      const { cam: c, zoom: z, frameW: w, frameH: h } = live.current;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const next = Math.min(
        DISTRICT_ZOOM_MAX,
        Math.max(1, z * Math.exp(-delta * 0.0016))
      );
      // Aux bornes, la molette fait défiler la page comme d'habitude.
      if (Math.abs(next - z) < 1e-4) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const p: [number, number] = [e.clientX - r.left, e.clientY - r.top];
      const at = toImage(c, p);
      const k = (c.k / z) * next;
      setZoom(next);
      setFocus(
        focusOfCamera({ k, tx: p[0] - at[0] * k, ty: p[1] - at[1] * k }, w, h)
      );
      settle();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(idle.current);
    };
  }, [view]);
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [view]);

  const drag = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    id: number;
    moved: boolean;
  } | null>(null);
  const swallowClick = useRef(false);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || zoom <= 1.001) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      tx: cam.tx,
      ty: cam.ty,
      id: e.pointerId,
      moved: false,
    };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setFocus(
      focusOfCamera({ k: cam.k, tx: d.tx + dx, ty: d.ty + dy }, frameW, frameH)
    );
    settle();
  };
  const endDrag = () => {
    if (drag.current?.moved) swallowClick.current = true;
    drag.current = null;
  };

  const zoomBy = (dir: 1 | -1) => {
    const next =
      dir > 0
        ? (ZOOMS.find((z) => z > zoom + 0.01) ?? DISTRICT_ZOOM_MAX)
        : ([...ZOOMS].reverse().find((z) => z < zoom - 0.01) ?? 1);
    setZoom(next);
    if (next <= 1.001) setFocus(undefined);
  };
  const recenter = () => {
    setZoom(1);
    setFocus(undefined);
    setOpen(null);
  };

  // ── « Ma journée » : urgences, rendez-vous et livraisons, choses à traiter ──
  const rows: { row: JourneeRow; kind: 'urgent' | 'today' | 'todo' }[] = journee
    ? [
        ...journee.urgent.map((row) => ({ row, kind: 'urgent' as const })),
        ...journee.today.map((row) => ({ row, kind: 'today' as const })),
        ...journee.todo.map((row) => ({ row, kind: 'todo' as const })),
      ]
    : [];
  const openRow = (row: JourneeRow) => {
    if (row.to) navigate(row.to);
    else if (row.projectId)
      navigate(`/common/projects/details/${row.projectId}`);
    else if (row.section) go(row.section);
  };

  // ── Indicateurs clés ──
  const kpis: {
    key: string;
    label: string;
    icon: ReactNode;
    value: number | null;
    trend?: Trend;
    to: string;
  }[] = [
    {
      key: 'clients',
      label: 'Clients',
      icon: <HiOutlineUsers />,
      value: num(statOf(data, 'clients', 'Clients')?.value),
      trend: statOf(data, 'clients', 'Clients')?.trend,
      to: SECTION_INFO.clients.to,
    },
    {
      key: 'projets',
      label: 'Projets en cours',
      icon: <HiOutlineDocumentText />,
      value: num(data?.kpis.projectsInProgress),
      trend: data?.kpis.trends.projectsInProgress,
      to: SECTION_INFO.projets.to,
    },
    {
      key: 'produits',
      label: 'Produits actifs',
      icon: <HiOutlineCube />,
      value: num(statOf(data, 'boutique', 'Produits actifs')?.value),
      trend: statOf(data, 'boutique', 'Produits actifs')?.trend,
      to: SECTION_INFO.boutique.to,
    },
    {
      key: 'producteurs',
      label: 'Producteurs',
      icon: <HiOutlineCog6Tooth />,
      value: num(statOf(data, 'producteurs', 'Producteurs')?.value),
      to: SECTION_INFO.producteurs.to,
    },
  ];

  const viewSwitch = (
    <div
      role="group"
      aria-label="Affichage"
      style={{
        display: 'flex',
        gap: 4,
        padding: 5,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 10px 30px rgba(30,27,75,0.12)',
      }}
    >
      {(
        [
          ['ville', 'Vue ville', <HiOutlineMap key="v" />],
          ['liste', 'Liste', <HiOutlineListBullet key="l" />],
          ['stats', 'Statistiques', <HiOutlineChartBar key="s" />],
        ] as const
      ).map(([id, label, glyph]) => {
        const on = id === view;
        return (
          <button
            key={id}
            type="button"
            className="pd-btn"
            aria-pressed={on}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            onClick={() => (id === 'stats' ? onClassic() : setView(id))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              padding: compact ? '0 12px' : '0 16px',
              borderRadius: 12,
              border: 0,
              background: on ? '#efecfe' : 'transparent',
              color: on ? '#4f3fd1' : '#374151',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true" style={{ display: 'flex', fontSize: 18 }}>
              {glyph}
            </span>
            {!compact && label}
          </button>
        );
      })}
    </div>
  );

  const roundButton = (
    label: string,
    glyph: ReactNode,
    onClick: () => void,
    pressed?: boolean
  ) => (
    <button
      type="button"
      className="pd-btn"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 44,
        height: 44,
        borderRadius: 14,
        border: 0,
        background: pressed ? '#efecfe' : 'rgba(255,255,255,0.95)',
        boxShadow: '0 10px 30px rgba(30,27,75,0.12)',
        color: pressed ? '#4f3fd1' : '#374151',
        fontSize: 19,
        cursor: 'pointer',
      }}
    >
      {glyph}
    </button>
  );
  const toggleAnimations = () => {
    writeAnimationsOn(!animOn);
    setAnimOn(!animOn);
  };

  const city = (
    <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: 'relative',
        width: frameW,
        height: frameH,
        borderRadius: 28,
        overflow: 'hidden',
        background: '#eef1f4',
        cursor: zoom > 1.001 ? (moving ? 'grabbing' : 'grab') : 'default',
        touchAction: zoom > 1.001 ? 'none' : 'auto',
      }}
    >
      {/* La ville, les halos et la ligne de production : en pixels de l'image */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: CITY_IMAGE.w,
          height: CITY_IMAGE.h,
          transformOrigin: '0 0',
          transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.k})`,
          transition: moving ? 'none' : EASE,
        }}
      >
        <img
          src={CITY_IMAGE.src}
          alt="La ville PEG : la tour des clients, le campus des projets, le grand bâtiment de la boutique, les trois entrepôts de la production reliés par la ligne de production, l'immeuble de la finance et le pavillon de l'assistance, au bord de la rivière"
          width={CITY_IMAGE.w}
          height={CITY_IMAGE.h}
          draggable={false}
          style={{ display: 'block', userSelect: 'none' }}
        />
        {DISTRICT_SPOTS.map((s) => (
          <div
            key={s.id}
            aria-hidden="true"
            className="pd-glow"
            style={{
              position: 'absolute',
              left: s.glow[0] - s.radius,
              top: s.glow[1] - s.radius * 0.62,
              width: s.radius * 2,
              height: s.radius * 1.24,
              borderRadius: '50%',
              background:
                'radial-gradient(closest-side, rgba(124,58,237,0.34), rgba(124,58,237,0.12) 60%, rgba(124,58,237,0))',
              opacity: hot === s.id || open === s.id ? 1 : 0,
              pointerEvents: 'none',
            }}
          />
        ))}
        {/* Ce qui ne bouge pas : la route des livraisons, les arcs, les pôles */}
        <svg
          width={CITY_IMAGE.w}
          height={CITY_IMAGE.h}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <defs>
            <linearGradient id={`${uid}trail`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#a78bfa" stopOpacity="0" />
              <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient
              id={`${uid}shine`}
              x1="0"
              x2="1"
              y1="0"
              y2="0"
              gradientTransform="rotate(18)"
            >
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${uid}neon`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#c4b5fd" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id={`${uid}scan`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            {GLASS.map((g, i) => (
              <clipPath key={i} id={`${uid}glass-${i}`}>
                <path d={polygonPath(g)} />
              </clipPath>
            ))}
            {arcs.map((a) => (
              <path key={a.id} id={`${uid}arc-${a.id}`} d={a.d} />
            ))}
            {ROAD_PATHS.map((r) => (
              <path key={r.id} id={`${uid}road-${r.id}`} d={r.d} />
            ))}
            {WATER_PATHS.map((w) => (
              <path key={w.id} id={`${uid}water-${w.id}`} d={w.d} />
            ))}
            {DRONE_PATHS.map((d, i) => (
              <path key={i} id={`${uid}drone-${i}`} d={d.d} />
            ))}
            {BIRD_TRACKS.map((b, i) => (
              <path key={i} id={`${uid}birds-${i}`} d={b.d} />
            ))}
            <path id={`${uid}delivery`} d={DELIVERY.d} />
          </defs>

          {/* La route des livraisons : des quais de l'entrepôt au pont */}
          <g className="pd-lane" style={{ opacity: laneLit ? 1 : 0.2 }}>
            <path
              d={DELIVERY.d}
              fill="none"
              stroke={DELIVERY_COLOR}
              strokeOpacity={0.16}
              strokeWidth={10}
              strokeLinecap="round"
            />
            <path
              d={DELIVERY.d}
              fill="none"
              stroke={DELIVERY_COLOR}
              strokeOpacity={0.8}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="0.1 10"
            />
          </g>

          {/* Le réseau des échanges : il se trace à l'arrivée, puis reste */}
          {arcs.map((a, i) => {
            const color = a.color;
            const draw = motion
              ? {
                  className: 'pd-draw',
                  pathLength: 1,
                  style: { animationDelay: `${0.25 + i * 0.18}s` },
                }
              : {};
            return (
              <g
                key={a.id}
                className="pd-arc"
                style={{
                  opacity: arcLit(a) ? (a.dots > 0 ? 1 : 0.5) : 0.12,
                }}
              >
                <path
                  {...draw}
                  d={a.d}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.14}
                  strokeWidth={14}
                  strokeLinecap="round"
                />
                <path
                  {...draw}
                  d={a.d}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.24}
                  strokeWidth={7}
                  strokeLinecap="round"
                />
                <path
                  {...draw}
                  d={a.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <path
                  {...draw}
                  d={a.d}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity={0.9}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Les pôles, posés sur les toits */}
          {hubs.map((h) => (
            <g
              key={h.key}
              className="pd-arc"
              style={{ opacity: h.lit ? 1 : 0.35 }}
            >
              <ellipse
                cx={h.at[0]}
                cy={h.at[1]}
                rx={15}
                ry={7.5}
                fill={VIOLET}
                fillOpacity={0.22}
                stroke="#ffffff"
                strokeOpacity={0.95}
                strokeWidth={1.6}
              />
              <circle
                cx={h.at[0]}
                cy={h.at[1]}
                r={4.6}
                fill="#ffffff"
                stroke={VIOLET}
                strokeWidth={2.4}
              />
            </g>
          ))}

          {[CONVEYOR, CONVEYOR_SHORT].map((pts, i) => (
            <path
              key={i}
              d={`M${pts.map((p) => p.join(' ')).join(' L')}`}
              fill="none"
              stroke="#c4b5fd"
              strokeOpacity={0.55}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'blur(4px)' }}
            />
          ))}
        </svg>

        {/* Ce qui bouge, sur son propre calque : le navigateur ne repeint que lui */}
        <svg
          width={CITY_IMAGE.w}
          height={CITY_IMAGE.h}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        >
          {/* La lumière qui court sur la ligne de production */}
          {[CONVEYOR, CONVEYOR_SHORT].map((pts, i) => (
            <path
              key={i}
              className={motion ? 'pd-flow' : undefined}
              d={`M${pts.map((p) => p.join(' ')).join(' L')}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="12 68"
              style={{ filter: 'drop-shadow(0 0 5px #a78bfa)' }}
            />
          ))}

          {motion && (
            <>
              {/* L'eau scintille */}
              {WATER_GLINTS.map(([x, y], i) => (
                <ellipse
                  key={`glint-${i}`}
                  className="pd-glint"
                  cx={x}
                  cy={y}
                  rx={3.4}
                  ry={1.2}
                  fill="#ffffff"
                  style={{ animationDelay: `${-((i * 0.53) % 2.6)}s` }}
                />
              ))}

              {/* Les bateaux glissent sur le canal et le fleuve */}
              {WATER_PATHS.map((w, i) => {
                const dur = w.length / 11 / 0.72;
                const begin = -i * dur * 0.45;
                return (
                  <g key={w.id}>
                    <g opacity={0}>
                      <path
                        d="M-7 0 L-26 -6 M-7 0 L-26 6"
                        fill="none"
                        stroke="#ffffff"
                        strokeOpacity={0.8}
                        strokeWidth={1.3}
                        strokeLinecap="round"
                      />
                      <path
                        d="M-8 -3.2 H4 Q10 0 4 3.2 H-8 Z"
                        fill="#ffffff"
                        stroke="#94a3b8"
                        strokeWidth={0.6}
                      />
                      <rect
                        x={-5}
                        y={-1.7}
                        width={6}
                        height={3.4}
                        rx={0.9}
                        fill={VIOLET}
                      />
                      {fadeEnds(dur, begin, 0.72)}
                    </g>
                    <animateMotion
                      dur={`${dur.toFixed(1)}s`}
                      begin={`${begin.toFixed(1)}s`}
                      repeatCount="indefinite"
                      rotate="auto"
                      keyPoints="0;1;1"
                      keyTimes="0;0.72;1"
                      calcMode="linear"
                    >
                      <mpath href={`#${uid}water-${w.id}`} />
                    </animateMotion>
                  </g>
                );
              })}

              {/* La circulation dans les deux sens, chacun sur sa voie, avec sa traînée de lumière */}
              {ROAD_PATHS.flatMap((r, ri) =>
                Array.from({ length: r.cars * 2 }, (_, i) => {
                  const back = i % 2 === 1;
                  const k = Math.floor(i / 2);
                  const dur = (r.length / 34) * (0.88 + (k % 3) * 0.1);
                  const begin = -((k + (back ? 0.5 : 0)) * dur) / r.cars;
                  return (
                    <g key={`${r.id}-${i}`}>
                      <g opacity={0}>
                        <g transform="translate(0 3.8)">
                          <rect
                            x={-30}
                            y={-1.7}
                            width={24}
                            height={3.4}
                            rx={1.7}
                            fill={`url(#${uid}trail)`}
                          />
                          <rect
                            x={-6.5}
                            y={-3}
                            width={13}
                            height={6}
                            rx={2.2}
                            fill={CAR_COLORS[(ri * 3 + i) % CAR_COLORS.length]}
                            stroke="rgba(15,23,42,0.3)"
                            strokeWidth={0.6}
                          />
                          <rect
                            x={-2.6}
                            y={-2.2}
                            width={5.4}
                            height={4.4}
                            rx={1.3}
                            fill="rgba(15,23,42,0.32)"
                          />
                          <circle cx={6} cy={-1.8} r={1} fill="#fef9c3" />
                          <circle cx={6} cy={1.8} r={1} fill="#fef9c3" />
                        </g>
                        {fadeEnds(dur, begin)}
                      </g>
                      <animateMotion
                        dur={`${dur.toFixed(1)}s`}
                        begin={`${begin.toFixed(1)}s`}
                        repeatCount="indefinite"
                        rotate={back ? 'auto-reverse' : 'auto'}
                        keyPoints={back ? '1;0' : '0;1'}
                        keyTimes="0;1"
                        calcMode="linear"
                      >
                        <mpath href={`#${uid}road-${r.id}`} />
                      </animateMotion>
                    </g>
                  );
                })
              )}

              {/* Les camions de livraison quittent la ville par le pont */}
              {Array.from({ length: vans }, (_, i) => {
                const dur = DELIVERY.length / 26;
                const begin = -(i * dur) / vans;
                return (
                  <g key={`van-${i}`}>
                    <g opacity={0}>
                      <rect
                        x={-11}
                        y={-4}
                        width={14}
                        height={8}
                        rx={1.2}
                        fill="#ffffff"
                        stroke="#94a3b8"
                        strokeWidth={0.6}
                      />
                      <rect
                        x={3.8}
                        y={-3.5}
                        width={6}
                        height={7}
                        rx={1.8}
                        fill={DELIVERY_COLOR}
                      />
                      <circle cx={10.2} cy={-2.1} r={1.1} fill="#fef9c3" />
                      <circle cx={10.2} cy={2.1} r={1.1} fill="#fef9c3" />
                      {fadeEnds(dur, begin)}
                    </g>
                    <animateMotion
                      dur={`${dur.toFixed(1)}s`}
                      begin={`${begin.toFixed(1)}s`}
                      repeatCount="indefinite"
                      rotate="auto"
                    >
                      <mpath href={`#${uid}delivery`} />
                    </animateMotion>
                  </g>
                );
              })}

              {/* Les fontaines jaillissent */}
              {FOUNTAINS.flatMap((f, fi) =>
                [-1, -0.5, 0, 0.5, 1].map((s, k) => (
                  <circle
                    key={`drop-${fi}-${k}`}
                    className="pd-drop"
                    cx={f.at[0]}
                    cy={f.at[1] - 2}
                    r={f.h > 15 ? 1.6 : 1.1}
                    fill="#ffffff"
                    style={
                      {
                        '--dx': `${(s * f.h) / 3.2}px`,
                        '--h': `${-f.h * (k % 2 ? 0.8 : 1)}px`,
                        animationDelay: `${-k * 0.31 - fi * 0.2}s`,
                      } as CSSProperties
                    }
                  />
                ))
              )}

              {/* Les reflets passent sur les façades vitrées */}
              {GLASS.map((g, i) => {
                const [x, y, w, h] = bounds(g);
                return (
                  <g key={`shine-${i}`} clipPath={`url(#${uid}glass-${i})`}>
                    <rect
                      className="pd-shine"
                      x={x}
                      y={y}
                      width={w * 0.5}
                      height={h}
                      fill={`url(#${uid}shine)`}
                      style={{ animationDelay: `${-i * 2.3}s` }}
                    />
                  </g>
                );
              })}

              {/* Le néon de la tour respire, une lumière y monte */}
              <rect
                className="pd-breathe"
                x={TOWER_NEON.x - TOWER_NEON.w / 2}
                y={TOWER_NEON.top}
                width={TOWER_NEON.w}
                height={TOWER_NEON.bottom - TOWER_NEON.top}
                rx={2}
                fill={`url(#${uid}neon)`}
              />
              <rect
                className="pd-scan"
                x={TOWER_NEON.x - TOWER_NEON.w / 2}
                y={TOWER_NEON.bottom - 16}
                width={TOWER_NEON.w}
                height={16}
                fill={`url(#${uid}scan)`}
                style={
                  {
                    '--pd-scan': `${-(TOWER_NEON.bottom - TOWER_NEON.top - 16)}px`,
                  } as CSSProperties
                }
              />

              {/* Le feu de l'antenne clignote */}
              {BEACONS.map(([x, y], i) => (
                <g key={`beacon-${i}`} className="pd-blink">
                  <circle cx={x} cy={y} r={7} fill="#ef4444" opacity={0.25} />
                  <circle cx={x} cy={y} r={2.6} fill="#ef4444" />
                </g>
              ))}

              {/* Ondes : chaque pôle respire, plus fort là où il se passe quelque chose */}
              {hubs.map((h, i) => (
                <ellipse
                  key={`hub-pulse-${h.key}`}
                  className="pd-pulse"
                  cx={h.at[0]}
                  cy={h.at[1]}
                  rx={22}
                  ry={11}
                  fill="none"
                  stroke={VIOLET}
                  strokeOpacity={0.55}
                  strokeWidth={1.6}
                  style={{ animationDelay: `${-i * 0.7}s` }}
                />
              ))}
              {pulses.flatMap((p, i) =>
                [0, 1].map((k) => (
                  <ellipse
                    key={`${i}-${k}`}
                    className="pd-pulse"
                    cx={p.at[0]}
                    cy={p.at[1]}
                    rx={30}
                    ry={15}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={2.4}
                    style={{ animationDelay: `${-(k * 1.4 + i * 0.45)}s` }}
                  />
                ))
              )}

              {/* Le courant file sur les arcs, les jetons circulent */}
              {arcs.map((a) => {
                const color = a.color;
                if (!a.dots) return null;
                return (
                  <g
                    key={`flow-${a.id}`}
                    className="pd-arc"
                    style={{ opacity: arcLit(a) ? 1 : 0.12 }}
                  >
                    <path
                      className="pd-current"
                      d={a.d}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeDasharray="12 48"
                    />
                    {Array.from({ length: a.dots }, (_, i) => (
                      <g key={i}>
                        {a.doc ? (
                          <g>
                            <rect
                              x={-5.5}
                              y={-6.5}
                              width={11}
                              height={13}
                              rx={2}
                              fill="#ffffff"
                              stroke={color}
                              strokeWidth={1.8}
                            />
                            <path
                              d="M-2.6 -2.2 H2.6 M-2.6 1 H2.6"
                              stroke={color}
                              strokeWidth={1.3}
                              strokeLinecap="round"
                            />
                          </g>
                        ) : (
                          <g>
                            <circle r={8} fill={color} opacity={0.25} />
                            <circle
                              r={4}
                              fill="#ffffff"
                              stroke={color}
                              strokeWidth={2.2}
                            />
                          </g>
                        )}
                        <animateMotion
                          dur={`${a.dur.toFixed(1)}s`}
                          begin={`${(-(i * a.dur) / a.dots).toFixed(1)}s`}
                          repeatCount="indefinite"
                        >
                          <mpath href={`#${uid}arc-${a.id}`} />
                        </animateMotion>
                      </g>
                    ))}
                  </g>
                );
              })}

              {/* Des particules montent des pôles actifs */}
              {hubs
                .filter((h) => h.active)
                .flatMap((h, hi) =>
                  [0, 1, 2].map((k) => (
                    <circle
                      key={`rise-${h.key}-${k}`}
                      className="pd-rise"
                      cx={h.at[0] + (k - 1) * 5}
                      cy={h.at[1] - 4}
                      r={1.8}
                      fill="#ffffff"
                      stroke={VIOLET}
                      strokeWidth={1}
                      style={{ animationDelay: `${-(k * 0.73 + hi * 0.4)}s` }}
                    />
                  ))
                )}

              {/* Les drones font leur tournée au-dessus des toits, leur ombre au sol */}
              {DRONE_PATHS.map((d, i) => (
                <g key={`drone-${i}`}>
                  <ellipse cy={34} rx={9} ry={3.4} fill="rgba(15,23,42,0.16)" />
                  <path
                    d="M-7 -4 L7 4 M-7 4 L7 -4"
                    stroke="#334155"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                  {(
                    [
                      [-7, -4],
                      [7, -4],
                      [-7, 4],
                      [7, 4],
                    ] as const
                  ).map(([x, y]) => (
                    <ellipse
                      key={`${x}${y}`}
                      cx={x}
                      cy={y}
                      rx={3.6}
                      ry={1.5}
                      fill="#cbd5e1"
                      opacity={0.9}
                    />
                  ))}
                  <rect
                    x={-3}
                    y={-2}
                    width={6}
                    height={4}
                    rx={1.5}
                    fill="#1f2937"
                  />
                  <rect
                    x={-2.6}
                    y={3}
                    width={5.2}
                    height={4.6}
                    rx={0.8}
                    fill="#f59e0b"
                  />
                  <circle
                    className="pd-blink"
                    cx={0}
                    cy={-2.4}
                    r={1.1}
                    fill={i % 2 ? '#22c55e' : '#ef4444'}
                  />
                  <animateMotion
                    dur={`${(d.length / 46).toFixed(1)}s`}
                    begin={`${(-i * 7).toFixed(1)}s`}
                    repeatCount="indefinite"
                  >
                    <mpath href={`#${uid}drone-${i}`} />
                  </animateMotion>
                </g>
              ))}

              {/* Des oiseaux traversent le ciel */}
              {BIRD_TRACKS.map((b, i) => (
                <g key={`birds-${i}`}>
                  {FLOCK.map(([dx, dy], k) => {
                    const x = dx * b.dir;
                    return (
                      <path
                        key={k}
                        className="pd-wing"
                        d={`M${x - 5} ${dy} Q${x - 2.5} ${dy - 3.2} ${x} ${dy} Q${x + 2.5} ${dy - 3.2} ${x + 5} ${dy}`}
                        fill="none"
                        stroke="#475569"
                        strokeWidth={1.3}
                        strokeLinecap="round"
                        style={{ animationDelay: `${-k * 0.13}s` }}
                      />
                    );
                  })}
                  <animateMotion
                    dur={`${(b.length / 28).toFixed(1)}s`}
                    begin={`${(-i * 31).toFixed(1)}s`}
                    repeatCount="indefinite"
                  >
                    <mpath href={`#${uid}birds-${i}`} />
                  </animateMotion>
                </g>
              ))}
            </>
          )}
        </svg>
      </div>

      {/* Fondu du haut : la ville se perd dans la brume, comme la maquette */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 54,
          background:
            'linear-gradient(rgba(248,249,251,0.9), rgba(248,249,251,0))',
          pointerEvents: 'none',
        }}
      />

      {/* L'activité : une bulle au-dessus du bâtiment concerné */}
      {shownBubbles.map(({ a, key, sub, fresh, w }, i) => {
        const { at, moved } = bubbleSpots[i];
        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: w,
              display: 'flex',
              justifyContent: 'center',
              transform: `translate(${at[0] - w / 2}px, ${at[1] - BUBBLE_H / 2}px)`,
              transition: moving ? 'none' : EASE,
              zIndex: 2,
            }}
          >
            <button
              type="button"
              className="pd-bubble pd-btn"
              onClick={() => openActivity(a)}
              title={a.text}
              style={
                {
                  '--pd-life': `${fresh ? 9 : TICK_MS / 1000}s`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: w,
                  height: BUBBLE_H,
                  boxSizing: 'border-box',
                  padding: '0 12px 0 7px',
                  border: `1px solid ${fresh ? '#c4b5fd' : 'rgba(255,255,255,0.9)'}`,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.96)',
                  boxShadow: fresh
                    ? '0 0 0 4px rgba(109,93,252,0.18), 0 12px 28px rgba(30,27,75,0.2)'
                    : '0 10px 26px rgba(30,27,75,0.16)',
                  cursor: 'pointer',
                  textAlign: 'left',
                } as CSSProperties
              }
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                  color: '#ffffff',
                  fontSize: 15,
                }}
              >
                {sectionIcon(a.id)}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: INK,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.text}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: fresh ? 700 : 500,
                    lineHeight: 1.25,
                    color: fresh ? '#4f3fd1' : MUTED,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {sub}
                </span>
              </span>
            </button>
            {!moved && (
              <span
                aria-hidden="true"
                className="pd-bubble"
                style={
                  {
                    '--pd-life': `${fresh ? 9 : TICK_MS / 1000}s`,
                    position: 'absolute',
                    left: '50%',
                    top: BUBBLE_H,
                    width: 2,
                    height: 16,
                    marginLeft: -1,
                    borderRadius: 1,
                    background:
                      'linear-gradient(rgba(109,93,252,0.7), rgba(109,93,252,0))',
                  } as CSSProperties
                }
              />
            )}
          </div>
        );
      })}

      {/* Les trois sites de production */}
      {cardsOn &&
        PRODUCTION_SITES.map((s) => {
          const [x, y] = toFrame(cam, s.at);
          const badge = section(s.id).badge;
          return (
            <button
              key={s.id}
              type="button"
              className="pd-pin"
              onClick={() => go(s.id)}
              title={`Ouvrir ${SECTION_INFO[s.id].title}`}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${x - 14}px, ${y - 14}px)`,
                transition: moving ? 'none' : EASE,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 0,
                border: 0,
                background: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 700,
                  boxShadow:
                    '0 0 0 3px rgba(255,255,255,0.9), 0 6px 16px rgba(76,29,149,0.4)',
                }}
              >
                {s.n}
              </span>
              <span
                className="pd-pin-label"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 26,
                  padding: '0 10px',
                  borderRadius: 9,
                  background: 'rgba(17,24,39,0.78)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'background .2s ease',
                }}
              >
                {SECTION_INFO[s.id].title}
                {badge && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 5px',
                      borderRadius: 9,
                      background: '#f97316',
                      fontSize: 11,
                      lineHeight: '18px',
                      textAlign: 'center',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}

      {/* Les six quartiers */}
      {cardsOn &&
        DISTRICT_SPOTS.map((s, i) => {
          const d = DISTRICTS.find((x) => x.id === s.id);
          if (!d) return null;
          const [cx, cy] = cardAt[i];
          const isOpen = open === s.id;
          const members = membersOf(s.id);
          const alert = members.some((id) => section(id).alert);
          // La liste s'ouvre vers le bas, ou vers le haut près du bas du cadre.
          const listH = members.length * 50 + 12;
          const up = cy + CARD_H / 2 + 8 + listH > frameH - 70;
          return (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: cardW,
                transform: `translate(${cx - cardW / 2}px, ${cy - CARD_H / 2}px)`,
                transition: moving ? 'none' : EASE,
                zIndex: isOpen ? 3 : hot === s.id ? 2 : 1,
              }}
              onPointerEnter={() => setHot(s.id)}
              onPointerLeave={() => setHot((h) => (h === s.id ? null : h))}
            >
              <button
                type="button"
                className="pd-card"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: compact ? 10 : 12,
                  width: cardW,
                  height: CARD_H,
                  padding: compact ? '0 10px 0 8px' : '0 12px 0 10px',
                  boxSizing: 'border-box',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.8)',
                  background: 'rgba(255,255,255,0.93)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 28px rgba(30,27,75,0.13)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                    width: compact ? 34 : 40,
                    height: compact ? 34 : 40,
                    flexShrink: 0,
                    borderRadius: compact ? 10 : 12,
                    background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                    color: '#ffffff',
                    fontSize: compact ? 18 : 21,
                  }}
                >
                  {DISTRICT_ICON[s.id]}
                  {alert && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: '2px solid #ffffff',
                      }}
                    />
                  )}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: compact ? 14 : 15,
                      fontWeight: 700,
                      color: INK,
                      lineHeight: 1.25,
                    }}
                  >
                    {d.name}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: compact ? 12 : 12.5,
                      color: MUTED,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {districtLine(s.id, data, loading)}
                  </span>
                </span>
                <HiChevronDown
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    color: MUTED,
                    fontSize: 16,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform .2s ease',
                  }}
                />
              </button>
              {isOpen && (
                <ul
                  aria-label={`Rubriques du quartier ${d.name}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    [up ? 'bottom' : 'top']: CARD_H + 8,
                    width: cardW + 40,
                    margin: 0,
                    padding: 6,
                    listStyle: 'none',
                    borderRadius: 16,
                    background: '#ffffff',
                    boxShadow: '0 18px 40px rgba(30,27,75,0.18)',
                  }}
                >
                  {members.map((id) => {
                    const sd = section(id);
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className="pd-btn"
                          onClick={() => go(id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            height: 46,
                            padding: '0 10px',
                            border: 0,
                            borderRadius: 11,
                            background: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: 30,
                              height: 30,
                              borderRadius: 9,
                              background: '#f1efff',
                              color: VIOLET,
                              fontSize: 16,
                              flexShrink: 0,
                            }}
                          >
                            {sectionIcon(id)}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: 'block',
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: INK,
                              }}
                            >
                              {SECTION_INFO[id].title}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                fontSize: 12,
                                color: sd.alert ? '#b91c1c' : MUTED,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {sd.alert ?? sd.chip}
                            </span>
                          </span>
                          {sd.badge && (
                            <span
                              style={{
                                minWidth: 20,
                                height: 20,
                                padding: '0 6px',
                                borderRadius: 10,
                                background: '#efecfe',
                                color: '#4f3fd1',
                                fontSize: 11.5,
                                fontWeight: 700,
                                lineHeight: '20px',
                                textAlign: 'center',
                              }}
                            >
                              {sd.badge}
                            </span>
                          )}
                          <HiChevronRight
                            aria-hidden="true"
                            style={{ color: '#9ca3af', flexShrink: 0 }}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

      {/* Commandes */}
      <div style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 4 }}>
        {viewSwitch}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {roundButton(
          cardsOn
            ? 'Retirer les cartes des quartiers'
            : 'Afficher les cartes des quartiers',
          <HiOutlineRectangleStack />,
          toggleCards,
          cardsOn
        )}
        {!reduced &&
          roundButton(
            animOn
              ? 'Couper les animations (échanges, circulation)'
              : 'Animer la ville (échanges, circulation)',
            <HiOutlineSparkles />,
            toggleAnimations,
            animOn
          )}
        {roundButton(
          'Recentrer la ville',
          <HiOutlinePaperAirplane />,
          recenter
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 44,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 10px 30px rgba(30,27,75,0.12)',
          }}
        >
          <button
            type="button"
            className="pd-btn"
            aria-label="Dézoomer"
            disabled={zoom <= 1.001}
            onClick={() => zoomBy(-1)}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 40,
              height: 44,
              border: 0,
              background: 'none',
              color: zoom <= 1.001 ? '#c4c7d0' : '#374151',
              fontSize: 17,
              cursor: zoom <= 1.001 ? 'default' : 'pointer',
            }}
          >
            <HiOutlineMinus />
          </button>
          <span
            aria-live="polite"
            style={{
              minWidth: 50,
              textAlign: 'center',
              fontSize: 13.5,
              fontWeight: 600,
              color: '#374151',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(zoom * 100)} %
          </span>
          <button
            type="button"
            className="pd-btn"
            aria-label="Zoomer"
            disabled={zoom >= DISTRICT_ZOOM_MAX - 0.01}
            onClick={() => zoomBy(1)}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 40,
              height: 44,
              border: 0,
              background: 'none',
              color: zoom >= DISTRICT_ZOOM_MAX - 0.01 ? '#c4c7d0' : '#374151',
              fontSize: 17,
              cursor: zoom >= DISTRICT_ZOOM_MAX - 0.01 ? 'default' : 'pointer',
            }}
          >
            <HiOutlinePlus />
          </button>
        </div>
        {roundButton(
          'Écran mural (plein écran)',
          <HiOutlineArrowsPointingOut />,
          onWall
        )}
      </div>
    </div>
  );

  const list = (
    <div
      style={{
        position: 'relative',
        width: frameW,
        height: frameH,
        borderRadius: 28,
        overflow: 'auto',
        background: '#ffffff',
        border: `1px solid ${LINE}`,
        boxSizing: 'border-box',
        padding: '8px 12px 84px',
      }}
    >
      <VillageList
        top={8}
        sections={
          Object.fromEntries(
            MENU_ORDER.map((id) => [
              id,
              {
                title: SECTION_INFO[id].title,
                icon: sectionIcon(id),
                data: section(id),
              },
            ])
          ) as Record<
            SectionId,
            { title: string; icon: ReactNode; data: SectionData }
          >
        }
        selected={null}
        district={null}
        dimmed={() => false}
        onSelect={go}
        onDistrict={() => undefined}
      />
      <div
        style={{ position: 'sticky', left: 4, bottom: 0, width: 'max-content' }}
      >
        {viewSwitch}
      </div>
    </div>
  );

  const shownRows = allDay ? rows : rows.slice(0, 3);
  const panel = (
    <aside
      aria-label="Ma journée et indicateurs clés"
      style={{
        width: side ? PANEL_W : '100%',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: 22,
        borderRadius: 24,
        background: '#ffffff',
        border: `1px solid ${LINE}`,
        display: 'grid',
        gridTemplateColumns:
          side || innerW < 860 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        gap: side ? 26 : 28,
        alignSelf: 'start',
      }}
    >
      <section aria-labelledby="pd-day">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2
            id="pd-day"
            style={{ margin: 0, fontSize: 22, fontWeight: 700, color: INK }}
          >
            Ma journée
          </h2>
          {rows.length > 3 && (
            <button
              type="button"
              className="pd-btn"
              onClick={() => setAllDay(!allDay)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: 0,
                background: 'none',
                color: VIOLET,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {allDay ? 'Réduire' : 'Voir tout'}
              <HiArrowRight
                aria-hidden="true"
                style={{ transform: allDay ? 'rotate(-90deg)' : 'none' }}
              />
            </button>
          )}
        </div>
        <p style={{ margin: '4px 0 14px', fontSize: 14, color: MUTED }}>
          {journee?.dateLabel ?? (loading ? 'Chargement…' : '')}
        </p>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gap: 10,
          }}
        >
          {shownRows.map(({ row, kind }) => {
            const tile =
              kind === 'urgent'
                ? { bg: '#fef2f2', fg: '#dc2626', glyph: <HiOutlineFlag /> }
                : kind === 'today'
                  ? {
                      bg: VIOLET,
                      fg: '#ffffff',
                      glyph: <HiOutlineCalendarDays />,
                    }
                  : {
                      bg: '#f3f4f6',
                      fg: '#4b5563',
                      glyph: row.section ? (
                        sectionIcon(row.section)
                      ) : (
                        <HiOutlineDocumentText />
                      ),
                    };
            return (
              <li key={row.key}>
                <button
                  type="button"
                  className="pd-row"
                  onClick={() => openRow(row)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: 12,
                    boxSizing: 'border-box',
                    borderRadius: 16,
                    border: `1px solid ${LINE}`,
                    background: '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: 12,
                      background: tile.bg,
                      color: tile.fg,
                      fontSize: 19,
                    }}
                  >
                    {tile.glyph}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: 14,
                        fontWeight: 600,
                        color: kind === 'urgent' ? '#991b1b' : INK,
                        lineHeight: 1.35,
                      }}
                    >
                      {row.text}
                    </span>
                    {row.sub && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 2,
                          fontSize: 12.5,
                          color: MUTED,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.sub}
                      </span>
                    )}
                  </span>
                  <HiChevronRight
                    aria-hidden="true"
                    style={{ flexShrink: 0, color: '#9ca3af', fontSize: 16 }}
                  />
                </button>
              </li>
            );
          })}
          {journee && rows.length === 0 && (
            <li
              style={{
                padding: 14,
                borderRadius: 16,
                border: `1px dashed ${LINE}`,
                fontSize: 14,
                color: MUTED,
              }}
            >
              {journee.lead}
            </li>
          )}
        </ul>
      </section>

      <section aria-labelledby="pd-kpi">
        <h2
          id="pd-kpi"
          style={{
            margin: '0 0 14px',
            fontSize: 20,
            fontWeight: 700,
            color: INK,
          }}
        >
          Indicateurs clés
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {kpis.map((k) => (
            <button
              key={k.key}
              type="button"
              className="pd-kpi"
              onClick={() => navigate(k.to)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                padding: 14,
                minHeight: 140,
                boxSizing: 'border-box',
                borderRadius: 16,
                border: `1px solid ${LINE}`,
                background: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 40,
                  height: 40,
                  marginBottom: 10,
                  borderRadius: 12,
                  background: '#f1efff',
                  color: VIOLET,
                  fontSize: 21,
                }}
              >
                {k.icon}
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {k.value === null ? '—' : k.value.toLocaleString('fr-FR')}
              </span>
              <span style={{ fontSize: 13, color: MUTED }}>{k.label}</span>
              {k.trend && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: TREND_INK[k.trend.tone],
                  }}
                >
                  {k.trend.delta > 0 ? (
                    <HiArrowTrendingUp aria-hidden="true" />
                  ) : k.trend.delta < 0 ? (
                    <HiArrowTrendingDown aria-hidden="true" />
                  ) : null}
                  {k.trend.delta === 0
                    ? `Stable ${k.trend.since}`
                    : `${k.trend.text} ${k.trend.since}`}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="pd-flows">
        <h2
          id="pd-flows"
          style={{
            margin: '0 0 12px',
            fontSize: 20,
            fontWeight: 700,
            color: INK,
          }}
        >
          Échanges en direct
        </h2>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gap: 6,
          }}
        >
          {NETWORK.map((f) => {
            const count = linkCount(f, data);
            const on = hotFlow === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className="pd-btn"
                  aria-pressed={on}
                  onClick={() => setHotFlow(on ? null : f.id)}
                  onPointerEnter={() => setHotFlow(f.id)}
                  onPointerLeave={() =>
                    setHotFlow((h) => (h === f.id ? null : h))
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: `1px solid ${on ? f.color : 'transparent'}`,
                    background: on ? '#faf9ff' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 26,
                      height: 4,
                      flexShrink: 0,
                      borderRadius: 2,
                      background: f.color,
                      boxShadow: `0 0 8px ${f.color}`,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: INK,
                      }}
                    >
                      {f.label}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: MUTED,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.route}
                    </span>
                  </span>
                  <span
                    title={f.detail}
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: INK,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {count === null ? '—' : count.toLocaleString('fr-FR')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );

  return (
    // Une page claire, comme la maquette, posée sur le fond sombre de l'application.
    <div
      ref={rootRef}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: PAD,
        borderRadius: 28,
        background: '#f5f6fa',
      }}
    >
      <style>{CSS}</style>
      <div
        style={{
          display: 'flex',
          flexDirection: side ? 'row' : 'column',
          alignItems: 'flex-start',
          gap: GAP,
        }}
      >
        <div style={{ width: frameW, flexShrink: 0 }}>
          <header style={{ margin: '4px 0 18px' }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              Vue d’ensemble
            </p>
            <h1
              style={{
                margin: '6px 0 6px',
                fontSize: 'clamp(34px, 3.2vw, 50px)',
                lineHeight: 1.05,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: INK,
              }}
            >
              PEG DISTRICTS
            </h1>
            <p style={{ margin: 0, fontSize: 16, color: MUTED }}>
              Un écosystème connecté pour aller plus loin, ensemble.
            </p>
          </header>
          {view === 'ville' ? city : list}
        </div>
        {panel}
      </div>
    </div>
  );
};

export default PegDistricts;
