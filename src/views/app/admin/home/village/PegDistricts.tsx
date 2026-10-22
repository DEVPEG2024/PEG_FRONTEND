// Accueil admin « PEG DISTRICTS » (ordinateur, ≥ 1024 px), d'après la maquette
// du 22/10/2026 : la ville est un rendu 3D (une image) ; posés dessus, les six
// quartiers (carte aux vrais chiffres, rubriques au clic), les trois sites de
// production numérotés et la ligne de production lumineuse ; à droite « Ma
// journée » et les indicateurs clés. Vue liste et tableau de bord classique
// (« Statistiques ») à un clic ; le plein écran ouvre l'écran mural.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
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
  HiOutlineUsers,
} from 'react-icons/hi2';
import navigationIcon from '@/configs/navigation-icon.config';
import { useAppSelector } from '@/store';
import VillageList from './VillageList';
import { useElementWidth } from './useElementWidth';
import useVillageData from './useVillageData';
import { buildJournee, newsKey, type JourneeRow } from './villageJournee';
import { SECTION_INFO } from './villageSections';
import {
  DISTRICTS,
  MENU_ORDER,
  membersOf,
  type DistrictId,
  type SectionId,
} from './villageScene';
import { emptySection, type SectionData, type Trend } from './villageModel';
import {
  CITY_IMAGE,
  CONVEYOR,
  CONVEYOR_SHORT,
  DISTRICT_SPOTS,
  DISTRICT_ZOOM_MAX,
  PRODUCTION_SITES,
  cityCamera,
  districtLine,
  focusOfCamera,
  keepInside,
  readCount as num,
  statOf,
  toFrame,
  toImage,
} from './districtsScene';

const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#eceef4';
const VIOLET = '#6d5dfc';
const PANEL_W = 340;
const GAP = 24;
/** Marge intérieure de la page claire posée sur le fond sombre de l'application. */
const PAD = 28;
const CARD_W = 238;
const CARD_H = 60;
const ZOOMS = [1, 1.4, 1.8, DISTRICT_ZOOM_MAX];
const EASE = 'transform .45s cubic-bezier(.2,.8,.2,1)';

const CSS = `
.pd-card,.pd-kpi,.pd-row{transition:transform .18s ease,box-shadow .18s ease}
.pd-card:hover,.pd-kpi:hover,.pd-row:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(30,27,75,.14)}
.pd-pin:hover .pd-pin-label{background:rgba(17,24,39,.92)}
.pd-btn:focus-visible,.pd-card:focus-visible,.pd-pin:focus-visible,.pd-kpi:focus-visible,.pd-row:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
.pd-flow{animation:pd-flow 2.4s linear infinite}
@keyframes pd-flow{to{stroke-dashoffset:-160}}
.pd-glow{transition:opacity .25s ease}
@media (prefers-reduced-motion: reduce){.pd-card,.pd-kpi,.pd-row,.pd-glow{transition:none}.pd-flow{animation:none}}
`;

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
  const { data, loading } = useVillageData();
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

  const section = (id: SectionId): SectionData =>
    data?.sections[id] ??
    emptySection(loading ? 'Chargement…' : 'Données indisponibles');
  const go = (id: SectionId) => navigate(SECTION_INFO[id].to);

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
            onClick={() => (id === 'stats' ? onClassic() : setView(id))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              padding: '0 16px',
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
            {label}
          </button>
        );
      })}
    </div>
  );

  const roundButton = (
    label: string,
    glyph: ReactNode,
    onClick: () => void,
    disabled = false
  ) => (
    <button
      type="button"
      className="pd-btn"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 44,
        height: 44,
        borderRadius: 14,
        border: 0,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 10px 30px rgba(30,27,75,0.12)',
        color: disabled ? '#c4c7d0' : '#374151',
        fontSize: 19,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {glyph}
    </button>
  );

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
        <svg
          width={CITY_IMAGE.w}
          height={CITY_IMAGE.h}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {[CONVEYOR, CONVEYOR_SHORT].map((pts, i) => {
            const d = `M${pts.map((p) => p.join(' ')).join(' L')}`;
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="#c4b5fd"
                  strokeOpacity={0.55}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'blur(4px)' }}
                />
                <path
                  className="pd-flow"
                  d={d}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="12 68"
                  style={{ filter: 'drop-shadow(0 0 5px #a78bfa)' }}
                />
              </g>
            );
          })}
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

      {/* Les trois sites de production */}
      {PRODUCTION_SITES.map((s) => {
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
      {DISTRICT_SPOTS.map((s) => {
        const d = DISTRICTS.find((x) => x.id === s.id);
        if (!d) return null;
        const [cx, cy] = keepInside(
          toFrame(cam, s.card),
          CARD_W,
          CARD_H,
          frameW,
          frameH
        );
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
              width: CARD_W,
              transform: `translate(${cx - CARD_W / 2}px, ${cy - CARD_H / 2}px)`,
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
                gap: 12,
                width: CARD_W,
                height: CARD_H,
                padding: '0 12px 0 10px',
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
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                  color: '#ffffff',
                  fontSize: 21,
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
                    fontSize: 15,
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
                    fontSize: 12.5,
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
                  width: CARD_W + 40,
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
              <span style={{ color: VIOLET }}>{DISTRICTS.length} —</span> PEG
              DISTRICTS
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
