// Écran mural (télévision de l'atelier, du bureau) : le village en plein
// écran. La caméra fait seule le tour — vue d'ensemble, puis chaque quartier —
// et part vers le bâtiment d'une notification qui arrive ; chiffres clés en
// grand, derniers évènements qui défilent en bas. Rien ne s'y clique :
// flèches = étape précédente ou suivante, espace = pause, F = plein écran,
// Échap = quitter. L'écran ne se met pas en veille et les données sont
// relues toutes les 3 minutes. Affichage seul : AdminVillage fournit la carte.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'react-redux';
import dayjs from 'dayjs';
import { HiChevronLeft, HiChevronRight, HiX } from 'react-icons/hi';
import {
  HiOutlineArrowsPointingIn,
  HiOutlineArrowsPointingOut,
  HiOutlinePause,
  HiOutlinePlay,
} from 'react-icons/hi2';
import Carousel from '@/components/shared/Carousel';
import navigationIcon from '@/configs/navigation-icon.config';
import { useAppSelector, type RootState } from '@/store';
import VillageSparkline from './VillageSparkline';
import { AlertFlag } from './VillagePanel';
import { SECTION_INFO } from './villageSections';
import {
  LAYOUT,
  MAP_W,
  districtById,
  districtOf,
  toMap,
  type DistrictId,
  type SectionId,
} from './villageScene';
import {
  plural,
  trendText,
  type SeriesPoint,
  type Trend,
  type VillageData,
} from './villageModel';
import type { VillageActivity } from './villageActivity';
import type { VillageFlow } from './villageFlows';
import type { Journee } from './villageJournee';
import type { Ambiance } from './villageAmbiance';
import {
  WALL_LIVE_MS,
  WALL_ZOOM,
  districtLines,
  fitMap,
  stopDuration,
  tickerItems,
  wallScale,
  wallStops,
} from './villageWallTour';

/** Relecture des données (la cloche, elle, suit les notifications en continu). */
const REFRESH_MS = 3 * 60_000;
/** Commandes et curseur masqués après 3 s sans bouger la souris. */
const IDLE_MS = 3_000;
/** Mouvement de caméra lent, comme un plan de cinéma. */
const CAMERA_MS = 2_600;

export interface WallKpi {
  label: string;
  value: string | number | null | undefined;
  sub?: string | null;
  trend?: Trend;
  series?: SeriesPoint[];
  kind: 'past' | 'next';
  unit?: [string, string];
  icon: ReactNode;
  ink: string;
}

/** Cadrage demandé à la carte. */
export interface WallMapView {
  width: number;
  district: DistrictId | null;
  zoom: number;
  focus: [number, number] | null;
  labelScale: number;
  cameraMs: number;
}

interface Props {
  data: VillageData | null;
  kpis: WallKpi[];
  journee: Journee | null;
  activity: VillageActivity[];
  ambiance: Ambiance;
  renderMap: (view: WallMapView) => ReactNode;
  /** Flux d'activité affichés (vide = coupés) : rappelés dans la vue d'ensemble. */
  flows: VillageFlow[];
  onRefresh: () => void;
  onExit: () => void;
}

/** Couleurs des chiffres clés éclaircies : lisibles sur le fond sombre. */
const LIGHT: Record<string, string> = {
  '#6d5dfc': '#a99fff',
  '#2563eb': '#7fb2ff',
  '#16a34a': '#4ade80',
  '#f97316': '#fdba74',
};

const TREND_DARK: Record<Trend['tone'], { bg: string; fg: string }> = {
  good: { bg: 'rgba(74,222,128,0.16)', fg: '#86efac' },
  bad: { bg: 'rgba(248,113,113,0.18)', fg: '#fca5a5' },
  neutral: { bg: 'rgba(255,255,255,0.10)', fg: '#d6d9e6' },
};

const TEXT = '#f5f6ff';
const MUTED = 'rgba(245,246,255,0.66)';
const GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
};
const ELLIPSIS: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const CSS = `
.vw-root.vw-idle{cursor:none}
.vw-controls{transition:opacity .3s ease}
.vw-progress{animation:vw-progress linear forwards;transform-origin:0 50%}
@keyframes vw-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.vw-caption{animation:vw-caption .7s ease both}
@keyframes vw-caption{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.vw-dot{animation:vw-dot 1.4s ease-in-out infinite}
@keyframes vw-dot{0%,100%{opacity:1}50%{opacity:.3}}
.vw-btn:focus-visible{outline:3px solid #a99fff;outline-offset:2px}
@media (prefers-reduced-motion: reduce){
  .vw-progress,.vw-caption,.vw-dot{animation:none}
}
`;

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const icon = (id: SectionId) => navigationIcon[SECTION_INFO[id].icon];

const title = (s: number): CSSProperties => ({
  margin: `${6 * s}px 0 0`,
  fontSize: 38 * s,
  fontWeight: 800,
  letterSpacing: '-0.025em',
  lineHeight: 1.12,
});

const Eyebrow = ({
  s,
  color,
  dot = false,
  children,
}: {
  s: number;
  color: string;
  dot?: boolean;
  children: ReactNode;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8 * s,
      fontSize: 15 * s,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color,
    }}
  >
    <span
      className={dot ? 'vw-dot' : undefined}
      style={{
        width: 10 * s,
        height: 10 * s,
        borderRadius: '50%',
        background: color,
      }}
    />
    {children}
  </span>
);

const Badge = ({ s, children }: { s: number; children: ReactNode }) => (
  <span
    style={{
      flexShrink: 0,
      minWidth: 30 * s,
      height: 30 * s,
      padding: `0 ${9 * s}px`,
      boxSizing: 'border-box',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.14)',
      fontSize: 16 * s,
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </span>
);

const WallButton = ({
  s,
  label,
  onClick,
  children,
}: {
  s: number;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    className="vw-btn"
    aria-label={label}
    title={label}
    onClick={onClick}
    style={{
      width: 44 * s,
      height: 44 * s,
      border: 0,
      borderRadius: 999,
      background: 'rgba(255,255,255,0.08)',
      color: TEXT,
      fontSize: 22 * s,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

const VillageWall = ({
  data,
  kpis,
  journee,
  activity,
  ambiance,
  renderMap,
  flows,
  onRefresh,
  onExit,
}: Props) => {
  // ── Taille de l'écran et du cadre de la carte ──
  const [screen, setScreen] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () =>
      setScreen({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const s = wallScale(screen.w, screen.h);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: e.contentRect.width, h: e.contentRect.height })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = fitMap(box.w, box.h);

  // ── Horloge ──
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  // ── Tour des quartiers ──
  const stops = useMemo(wallStops, []);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState<VillageActivity | null>(null);
  const stop = stops[idx];
  const duration = stopDuration(stop, data?.sections ?? {});
  useEffect(() => {
    if (paused || live) return undefined;
    const t = window.setTimeout(
      () => setIdx((i) => (i + 1) % stops.length),
      duration
    );
    return () => window.clearTimeout(t);
  }, [idx, paused, live, duration, stops.length]);

  // Une notification arrive : la caméra va au bâtiment, puis reprend le tour.
  // Les bulles déjà là à l'ouverture ne comptent pas.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(activity.map((a) => a.key));
      return;
    }
    const known = seen.current;
    const fresh = activity.find((a) => !known.has(a.key));
    activity.forEach((a) => known.add(a.key));
    if (fresh && !paused) setLive(fresh);
  }, [activity, paused]);
  useEffect(() => {
    if (!live) return undefined;
    const t = window.setTimeout(() => setLive(null), WALL_LIVE_MS);
    return () => window.clearTimeout(t);
  }, [live]);

  const liveCell = live ? LAYOUT.find((c) => c.id === live.id) : undefined;
  const view: Omit<WallMapView, 'width' | 'labelScale' | 'cameraMs'> =
    live && liveCell
      ? {
          district: districtOf(live.id),
          zoom: WALL_ZOOM.live,
          focus: toMap(liveCell.u, liveCell.v),
        }
      : stop.kind === 'district'
        ? { district: stop.id, zoom: WALL_ZOOM.district, focus: null }
        : { district: null, zoom: WALL_ZOOM.overview, focus: null };

  // ── Commandes : visibles quand la souris bouge, sinon masquées ──
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  const wake = () => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS);
  };
  useEffect(() => {
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS);
    return () => window.clearTimeout(idleTimer.current);
  }, []);

  const [fullscreen, setFullscreen] = useState(
    () => !!document.fullscreenElement
  );
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    const p = document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.();
    p?.catch(() => undefined);
  };

  const go = (delta: number) => {
    setLive(null);
    setIdx((i) => (i + delta + stops.length) % stops.length);
  };
  // Échap en plein écran : le navigateur quitte d'abord le plein écran ; un
  // second Échap quitte l'écran mural.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyHandler.current = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') onExit();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === ' ') setPaused((p) => !p);
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    else return;
    e.preventDefault();
    wake();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Écran toujours allumé, données relues, page figée dessous ──
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const wakeLock = (
      navigator as unknown as {
        wakeLock?: { request: (type: 'screen') => Promise<Sentinel> };
      }
    ).wakeLock;
    if (!wakeLock) return undefined;
    let lock: Sentinel | null = null;
    let alive = true;
    const acquire = () =>
      wakeLock
        .request('screen')
        .then((l) => {
          if (alive) lock = l;
          else l.release().catch(() => undefined);
        })
        .catch(() => undefined);
    acquire();
    // Le verrou tombe quand l'onglet est caché : on le reprend au retour.
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    const id = window.setInterval(onRefresh, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [onRefresh]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // ── Fil des évènements (notifications de la cloche) ──
  const store = useStore<RootState>();
  const newestId = useAppSelector((st) =>
    String(st.base.notification?.notifications?.[0]?._id ?? '')
  );
  const minute = Math.floor(now.getTime() / 60_000);
  const items = useMemo(
    () =>
      tickerItems(
        store.getState().base.notification?.notifications ?? [],
        new Date(minute * 60_000)
      ),
    // newestId : la liste a changé ; minute : « hier » devient une date.
    [store, newestId, minute]
  );

  // Le carrousel ne boucle que si la piste dépasse la fenêtre : quelques
  // évènements seulement, on les répète.
  const track =
    items.length && items.length < 8
      ? Array.from({ length: Math.ceil(8 / items.length) }, (_, c) =>
          items.map((it) => ({ ...it, key: `${it.key}-${c}` }))
        ).flat()
      : items;

  // ── Légende de l'étape ──
  const sections = data?.sections;
  const caption = (() => {
    if (live) {
      const d = districtById(districtOf(live.id));
      return (
        <>
          <Eyebrow s={s} color="#4ade80" dot>
            En direct
          </Eyebrow>
          <h2 style={title(s)}>{live.text}</h2>
          <p
            style={{ margin: `${8 * s}px 0 0`, fontSize: 21 * s, color: MUTED }}
          >
            {SECTION_INFO[live.id].title} · {d.place}
          </p>
          {sections?.[live.id] && (
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12 * s,
                margin: `${22 * s}px 0 0`,
                padding: `${14 * s}px ${16 * s}px`,
                borderRadius: 16 * s,
                background: 'rgba(255,255,255,0.06)',
                fontSize: 19 * s,
                fontWeight: 700,
                color: sections[live.id].alert ? '#fca5a5' : TEXT,
              }}
            >
              <span style={{ display: 'flex', fontSize: 24 * s, color: d.hue }}>
                {icon(live.id)}
              </span>
              {sections[live.id].alert ?? sections[live.id].chip}
            </p>
          )}
        </>
      );
    }
    if (stop.kind === 'district') {
      const d = districtById(stop.id);
      const lines = sections ? districtLines(stop.id, sections) : [];
      return (
        <>
          <Eyebrow s={s} color={d.hue}>
            Quartier {d.name}
          </Eyebrow>
          <h2 style={title(s)}>{d.place}</h2>
          <div style={{ marginTop: 14 * s }}>
            {lines.map((l, i) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14 * s,
                  padding: `${10 * s}px 0`,
                  borderTop: i ? '1px solid rgba(255,255,255,0.08)' : 0,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    flexShrink: 0,
                    fontSize: 24 * s,
                    color: d.hue,
                  }}
                >
                  {icon(l.id)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 19 * s,
                      fontWeight: 800,
                      ...ELLIPSIS,
                    }}
                  >
                    {SECTION_INFO[l.id].title}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7 * s,
                      marginTop: 2 * s,
                      fontSize: 17 * s,
                      fontWeight: l.alert ? 700 : 500,
                      color: l.alert ? '#fca5a5' : MUTED,
                    }}
                  >
                    {l.alert && <AlertFlag size={15 * s} />}
                    <span style={ELLIPSIS}>{l.text}</span>
                  </span>
                </span>
                {l.badge && <Badge s={s}>{l.badge}</Badge>}
              </div>
            ))}
          </div>
        </>
      );
    }
    const deliveries = data?.todayDeliveryCount ?? 0;
    return (
      <>
        <Eyebrow s={s} color="#a99fff">
          Tout le village
        </Eyebrow>
        <h2 style={title(s)}>Aujourd’hui</h2>
        <p
          style={{
            margin: `${8 * s}px 0 0`,
            fontSize: 21 * s,
            fontWeight: 600,
            color: MUTED,
            lineHeight: 1.35,
          }}
        >
          {journee ? journee.lead : 'Chargement du village…'}
        </p>
        {journee?.urgent.slice(0, 4).map((r) => (
          <p
            key={r.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10 * s,
              margin: `${12 * s}px 0 0`,
              fontSize: 18 * s,
              fontWeight: 700,
              lineHeight: 1.35,
              color: '#fca5a5',
            }}
          >
            <span style={{ display: 'flex', paddingTop: 3 * s }}>
              <AlertFlag size={16 * s} />
            </span>
            {r.text}
          </p>
        ))}
        {journee?.todo
          .slice(0, Math.max(0, 7 - Math.min(4, journee.urgent.length)))
          .slice(0, 3)
          .map((r) => (
            <p
              key={r.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12 * s,
                margin: `${12 * s}px 0 0`,
                fontSize: 18 * s,
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              <span
                style={{
                  width: 10 * s,
                  height: 10 * s,
                  flexShrink: 0,
                  marginLeft: 3 * s,
                  borderRadius: '50%',
                  background: r.dot,
                }}
              />
              <span style={ELLIPSIS}>{r.text}</span>
              <span style={{ flexShrink: 0, color: MUTED, fontWeight: 500 }}>
                · {r.sub}
              </span>
            </p>
          ))}
        {data && (
          <p
            style={{
              margin: `${16 * s}px 0 0`,
              fontSize: 18 * s,
              color: MUTED,
            }}
          >
            {deliveries ? (
              <>
                <strong style={{ color: TEXT, fontWeight: 800 }}>
                  {plural(deliveries, 'livraison', 'livraisons')}
                </strong>{' '}
                prévue{deliveries > 1 ? 's' : ''} aujourd’hui
              </>
            ) : journee?.nextDelivery ? (
              <>
                Prochaine livraison :{' '}
                <strong style={{ color: TEXT, fontWeight: 800 }}>
                  {journee.nextDelivery}
                </strong>
              </>
            ) : (
              'Aucune livraison prévue'
            )}
          </p>
        )}
        {flows.some((f) => f.count !== null) && (
          <p
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: `${8 * s}px ${18 * s}px`,
              margin: `${14 * s}px 0 0`,
              fontSize: 17 * s,
              color: MUTED,
            }}
          >
            {flows.map((f) => (
              <span
                key={f.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8 * s,
                }}
              >
                <span
                  style={{
                    width: 10 * s,
                    height: 10 * s,
                    borderRadius: '50%',
                    background: f.color,
                    boxShadow: `0 0 ${8 * s}px ${f.color}`,
                  }}
                />
                <strong style={{ color: TEXT, fontWeight: 700 }}>
                  {f.count ?? '—'}
                </strong>
                {f.short}
              </span>
            ))}
          </p>
        )}
      </>
    );
  })();

  const labelScale = Math.min(1.5, Math.max(0.9, (fit.w / MAP_W) * 1.15));
  const showControls = !idle;

  return createPortal(
    <div
      role="region"
      aria-label="Écran mural du village PEG"
      className={`vw-root${idle ? ' vw-idle' : ''}`}
      onMouseMove={wake}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'grid',
        gridTemplateRows: `auto minmax(0, 1fr) ${Math.round(78 * s)}px`,
        gap: 20 * s,
        padding: `${24 * s}px ${34 * s}px 0`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: TEXT,
        background:
          'radial-gradient(70% 60% at 80% 30%, rgba(109,93,252,0.24), transparent 70%), radial-gradient(50% 50% at 8% 95%, rgba(14,165,233,0.16), transparent 70%), linear-gradient(135deg, #0a0a2e 0%, #13113a 55%, #1a0a4e 100%)',
      }}
    >
      <style>{CSS}</style>

      {/* En-tête : nom, date, heure */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24 * s,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 34 * s,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Village PEG
          </div>
          <div style={{ marginTop: 4 * s, fontSize: 19 * s, color: MUTED }}>
            {cap(dayjs(now).format('dddd D MMMM'))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 * s }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9 * s,
              height: 36 * s,
              padding: `0 ${14 * s}px`,
              borderRadius: 999,
              ...GLASS,
              fontSize: 16 * s,
              fontWeight: 700,
            }}
          >
            <span
              className="vw-dot"
              style={{
                width: 10 * s,
                height: 10 * s,
                borderRadius: '50%',
                background: paused ? '#fbbf24' : '#4ade80',
              }}
            />
            {paused ? 'En pause' : 'En direct'}
          </span>
          <time
            dateTime={now.toISOString()}
            style={{
              fontSize: 56 * s,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {dayjs(now).format('HH:mm')}
          </time>
        </div>
      </header>

      {/* Chiffres clés et légende à gauche, carte à droite */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${Math.round(640 * s)}px minmax(0, 1fr)`,
          gap: 24 * s,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16 * s,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14 * s,
            }}
          >
            {kpis.map((k) => {
              const ink = LIGHT[k.ink] ?? k.ink;
              const chip = k.trend
                ? { text: trendText(k.trend), ...TREND_DARK[k.trend.tone] }
                : k.sub
                  ? { text: k.sub, ...TREND_DARK.neutral }
                  : null;
              return (
                <div
                  key={k.label}
                  style={{
                    minWidth: 0,
                    padding: `${15 * s}px ${18 * s}px ${16 * s}px`,
                    borderRadius: 22 * s,
                    ...GLASS,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9 * s,
                      fontSize: 17 * s,
                      color: MUTED,
                    }}
                  >
                    <span
                      style={{ display: 'flex', fontSize: 22 * s, color: ink }}
                    >
                      {k.icon}
                    </span>
                    <span style={ELLIPSIS}>{k.label}</span>
                  </div>
                  <div
                    style={{
                      marginTop: 6 * s,
                      fontSize: 46 * s,
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.05,
                      ...ELLIPSIS,
                    }}
                  >
                    {k.value === undefined
                      ? '…'
                      : k.value === null
                        ? '—'
                        : k.value}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10 * s,
                      marginTop: 10 * s,
                      minHeight: 36 * s,
                    }}
                  >
                    {chip ? (
                      <span
                        style={{
                          minWidth: 0,
                          padding: `${3 * s}px ${10 * s}px`,
                          borderRadius: 999,
                          background: chip.bg,
                          color: chip.fg,
                          fontSize: 15 * s,
                          fontWeight: 700,
                          ...ELLIPSIS,
                        }}
                      >
                        {chip.text}
                      </span>
                    ) : (
                      <span />
                    )}
                    {k.series && (
                      <VillageSparkline
                        points={k.series}
                        accent={ink}
                        kind={k.kind}
                        unit={k.unit}
                        width={Math.round(104 * s)}
                        height={Math.round(36 * s)}
                        track="rgba(255,255,255,0.16)"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <section
            aria-label="Étape en cours"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: `${22 * s}px ${24 * s}px`,
              borderRadius: 24 * s,
              overflow: 'hidden',
              ...GLASS,
            }}
          >
            {/* Étapes du tour, façon « stories » : la barre avance avec l'étape */}
            <div
              aria-hidden="true"
              style={{ display: 'flex', gap: 6 * s, marginBottom: 18 * s }}
            >
              {stops.map((st, i) => (
                <span
                  key={st.kind === 'district' ? st.id : 'overview'}
                  style={{
                    flex: 1,
                    height: 5 * s,
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.14)',
                  }}
                >
                  {i < idx ? (
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        background: 'rgba(255,255,255,0.55)',
                      }}
                    />
                  ) : i === idx && !paused && !live ? (
                    <span
                      key={`${idx}-${duration}`}
                      className="vw-progress"
                      style={{
                        display: 'block',
                        height: '100%',
                        background: '#ffffff',
                        animationDuration: `${duration}ms`,
                      }}
                    />
                  ) : null}
                </span>
              ))}
            </div>
            <div
              key={live ? `live-${live.key}` : `stop-${idx}`}
              className="vw-caption"
              style={{ minHeight: 0 }}
            >
              {caption}
            </div>
          </section>
        </div>

        {/* Carte : la caméra fait le tour, rien ne s'y clique */}
        <div
          ref={boxRef}
          style={{
            position: 'relative',
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 28 * s,
            overflow: 'hidden',
            background: ambiance.sky,
            border: '1px solid rgba(255,255,255,0.12)',
            transition: 'background 1s ease',
          }}
        >
          {ambiance.veil && (
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
              }}
            />
          )}
          <div style={{ flexShrink: 0, pointerEvents: 'none' }}>
            {fit.w > 0 &&
              renderMap({
                ...view,
                width: fit.w,
                labelScale,
                cameraMs: CAMERA_MS,
              })}
          </div>

          {/* Commandes, au mouvement de la souris */}
          <div
            className="vw-controls"
            style={{
              position: 'absolute',
              left: '50%',
              top: 16 * s,
              transform: 'translateX(-50%)',
              zIndex: 2200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8 * s,
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? 'auto' : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 6 * s,
                padding: 6 * s,
                borderRadius: 999,
                background: '#0f0f36',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              }}
            >
              <WallButton s={s} label="Étape précédente" onClick={() => go(-1)}>
                <HiChevronLeft />
              </WallButton>
              <WallButton
                s={s}
                label={paused ? 'Reprendre le tour' : 'Mettre en pause'}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? <HiOutlinePlay /> : <HiOutlinePause />}
              </WallButton>
              <WallButton s={s} label="Étape suivante" onClick={() => go(1)}>
                <HiChevronRight />
              </WallButton>
              <WallButton
                s={s}
                label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                onClick={toggleFullscreen}
              >
                {fullscreen ? (
                  <HiOutlineArrowsPointingIn />
                ) : (
                  <HiOutlineArrowsPointingOut />
                )}
              </WallButton>
              <WallButton s={s} label="Quitter l’écran mural" onClick={onExit}>
                <HiX />
              </WallButton>
            </div>
            <span
              style={{
                padding: `${4 * s}px ${12 * s}px`,
                borderRadius: 999,
                background: '#0f0f36',
                fontSize: 13 * s,
                color: MUTED,
                whiteSpace: 'nowrap',
              }}
            >
              ← → étapes · Espace pause · F plein écran · Échap quitter
            </span>
          </div>
        </div>
      </div>

      {/* Fil des derniers évènements, qui défile */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18 * s,
          minWidth: 0,
          margin: `0 ${-34 * s}px`,
          padding: `0 ${34 * s}px`,
          background: 'rgba(5,5,24,0.55)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span
          style={{
            flexShrink: 0,
            padding: `${6 * s}px ${14 * s}px`,
            borderRadius: 999,
            background: '#6d5dfc',
            fontSize: 16 * s,
            fontWeight: 800,
          }}
        >
          Derniers évènements
        </span>
        {items.length ? (
          // Le carrousel partagé de PEG (défilé continu) : jamais de défilé
          // CSS maison (garde-fou carouselGuard.test.ts).
          <Carousel
            key={newestId}
            label="Derniers évènements"
            autoplay="continuous"
            speed={0.8 * s}
            gap={Math.round(44 * s)}
            style={{
              flex: 1,
              minWidth: 0,
              maskImage:
                'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)',
            }}
          >
            {track.map((it) => (
              <span
                key={it.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10 * s,
                  fontSize: 20 * s,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}
                >
                  {it.time}
                </span>
                {it.section && (
                  <span
                    style={{
                      display: 'flex',
                      fontSize: 22 * s,
                      color: districtById(districtOf(it.section)).hue,
                    }}
                  >
                    {icon(it.section)}
                  </span>
                )}
                <span style={{ fontWeight: 700 }}>{it.text}</span>
              </span>
            ))}
          </Carousel>
        ) : (
          <span style={{ fontSize: 20 * s, color: MUTED }}>
            Aucun évènement récent.
          </span>
        )}
      </footer>
    </div>,
    document.body
  );
};

export default VillageWall;
