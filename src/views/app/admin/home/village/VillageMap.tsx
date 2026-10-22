// Carte de la ville PEG (refonte du 22/10/2026, maquette « petite ville
// isométrique moderne ») : six quartiers, des rues, une place centrale, des
// parcs — tout en SVG. Camions, passants et échanges (points lumineux,
// documents) circulent entre les bâtiments au rythme des vraies données ;
// un interrupteur les coupe. Survol = bâtiment mis en évidence et aperçu ;
// clic = fiche du quartier à droite. Zoom à la molette et aux boutons,
// déplacement en glissant. Affichage seul : AdminVillage choisit et reçoit.
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { VillageActivity } from './villageActivity';
import type { VillageFlow } from './villageFlows';
import {
  BENCHES,
  CITY_EDGE,
  DISTRICTS,
  DISTRICT_BLOCK,
  GRID,
  MAP_H,
  MAP_W,
  PARKS,
  PLOT_INSET,
  TREES,
  TRUCK_ROUTE,
  WALKERS,
  ZOOM_MAX,
  blockCenter,
  cameraOffset,
  clampOffset,
  crosswalks,
  depthOf,
  districtById,
  districtCenter,
  districtOf,
  focusOf,
  groundRect,
  iso,
  labelAnchor,
  labelWidth,
  laneDashes,
  placeLabels,
  previewPlacement,
  routePath,
  silhouette,
  type DistrictId,
  type SectionId,
} from './villageScene';
import {
  BenchArt,
  BuildingArt,
  TreeArt,
  TruckArt,
  WalkerArt,
} from './VillageBuildings';

export type VillageFilter =
  | 'tout'
  | 'urgent'
  | 'traiter'
  | 'production'
  | 'livrer';

export interface MapDistrict {
  title: string;
  icon: ReactNode;
  /** Pastille de la rubrique principale du quartier. */
  badge: string | null;
  tone: string;
  /** Première alerte d'une rubrique du quartier (drapeau rouge). */
  alert: string | null;
  /** Le filtre en cours ne retient aucune rubrique du quartier. */
  dimmed: boolean;
  /** Activité du mois la plus forte du quartier (étoile dorée à 3). */
  level: 0 | 1 | 2 | 3;
  aria: string;
  /** Aperçu au survol : une ligne par rubrique. */
  lines: {
    id: SectionId;
    title: string;
    text: string;
    alert: boolean;
    badge: string | null;
  }[];
}

interface Props {
  width: number;
  districts: Record<DistrictId, MapDistrict>;
  /** Quartier dont la fiche est ouverte (mis en évidence). */
  selected: DistrictId | null;
  /** Quartier visé par la caméra quand on zoome (null = le point visé ou le centre). */
  focusDistrict?: DistrictId | null;
  /** Zoom continu : 1 = toute la ville, jusqu'à ZOOM_MAX. */
  zoom: number;
  /** Point de la carte visé (glisser, molette). */
  focus?: [number, number] | null;
  /** Nouveau cadrage demandé par la souris (glisser, molette). */
  onCamera?: (camera: { zoom: number; focus: [number, number] }) => void;
  onSelect: (id: DistrictId) => void;
  /** Taille des étiquettes (réduites sur les cartes étroites). */
  labelScale?: number;
  /** Notifications reçues à l'instant : bulle au-dessus du quartier. */
  activity?: VillageActivity[];
  /** Clic sur une bulle : ouvrir la page de la notification. */
  onOpenActivity?: (a: VillageActivity) => void;
  /** Camions, passants et échanges (interrupteur « Animations »). */
  animations?: boolean;
  /** Échanges entre les bâtiments (vrais chiffres). */
  flows?: VillageFlow[];
  /** Camions sur la route : un par livraison du jour (3 au plus). */
  trucks?: number;
  /** Première visite de la session : les bâtiments sortent de terre. */
  arrival?: boolean;
  /** Durée d'un mouvement de caméra (ms) ; lent = plan de cinéma (écran mural). */
  cameraMs?: number;
  /** Couleur du fond autour de la carte : fondu des bords quand on zoome. */
  edge?: string;
  /** Commandes posées par-dessus la carte (titre, filtres, zoom…). */
  children?: ReactNode;
}

const CSS = `
.vg-world{will-change:transform}
.vg-agent{position:absolute;left:0;top:0;pointer-events:none;offset-rotate:0deg;animation-name:vg-move;animation-timing-function:linear;animation-iteration-count:infinite}
@keyframes vg-move{0%{offset-distance:0%;opacity:0}9%{opacity:1}90%{opacity:1}100%{offset-distance:100%;opacity:0}}
.vg-step{animation:vg-step .42s ease-in-out infinite alternate}
@keyframes vg-step{from{transform:translateY(0)}to{transform:translateY(-1.5px)}}
.vg-dash{animation:vg-dash 1.1s linear infinite}
@keyframes vg-dash{to{stroke-dashoffset:-18}}
.vg-bld{transition:transform .22s cubic-bezier(.3,1.5,.5,1),filter .2s ease,opacity .3s ease;transform-box:fill-box;transform-origin:50% 100%;cursor:pointer}
.vg-bld.vg-lift{transform:translateY(-7px)}
.vg-plot{transition:fill .2s ease,stroke .2s ease;cursor:pointer}
.vg-rise{animation:vg-rise .55s cubic-bezier(.2,1.4,.4,1) backwards}
@keyframes vg-rise{from{opacity:0;transform:translateY(22px) scale(.92)}to{opacity:1;transform:none}}
.vg-pill{transition:translate var(--vg-cam),transform .22s cubic-bezier(.3,1.6,.5,1),opacity .3s ease,box-shadow .2s ease}
.vg-pill:hover,.vg-pill.vg-hot{transform:translateY(-3px);box-shadow:0 12px 26px rgba(76,63,214,.22) !important}
.vg-pill:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
.vg-follow{transition:translate var(--vg-cam)}
.vg-moving .vg-world,.vg-moving .vg-pill,.vg-moving .vg-follow{transition:none !important}
.vg-bubble{animation:vg-bubble 9s ease forwards}
@keyframes vg-bubble{0%{opacity:0;transform:translateY(8px) scale(.9)}5%{opacity:1;transform:none}90%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-6px)}}
.vg-live{animation:vg-live 1s ease-in-out infinite}
@keyframes vg-live{0%,100%{opacity:1}50%{opacity:.35}}
.vg-preview{animation:vg-preview .16s ease-out backwards}
@keyframes vg-preview{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.vg-flag{transform-box:fill-box;transform-origin:0% 50%;animation:vg-flag 1.4s ease-in-out infinite}
@keyframes vg-flag{0%,100%{transform:skewY(0)}50%{transform:skewY(-8deg)}}
@media (prefers-reduced-motion: reduce){
  .vg-agent,.vg-step,.vg-dash,.vg-rise,.vg-bubble,.vg-live,.vg-preview,.vg-flag{animation:none}
  .vg-agent{display:none}
  .vg-bld,.vg-pill,.vg-world,.vg-follow{transition:none !important}
}
`;

const px = (n: number) => `${n.toFixed(1)}px`;
const SHIRTS = ['#6d5dfc', '#3b82f6', '#ec4899', '#14b8a6'];

/** Le verre des étiquettes : clair, net (graisses 600/700 chargées pour Inter). */
const GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.78)',
  border: '1px solid rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(10px) saturate(1.6)',
  boxShadow:
    '0 8px 22px rgba(40,36,80,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
  color: '#0f172a',
  letterSpacing: '-0.006em',
  WebkitFontSmoothing: 'antialiased',
};

const VillageMap = ({
  width,
  districts,
  selected,
  focusDistrict = null,
  zoom,
  focus = null,
  onCamera,
  onSelect,
  labelScale = 1,
  activity = [],
  onOpenActivity,
  animations = true,
  flows = [],
  trucks = 0,
  arrival = false,
  cameraMs = 600,
  edge = '#ffffff',
  children,
}: Props) => {
  // Identifiants SVG propres à cette carte : l'écran mural en affiche une
  // seconde, et un filtre pris dans la carte masquée effacerait le bâtiment.
  const uid = useId().replace(/:/g, '');
  const ref = (name: string) => `url(#${uid}${name})`;
  const fit = width / MAP_W;
  const height = Math.round(MAP_H * fit);
  const k = fit * zoom;
  const ls = labelScale;

  // Cadrage : le point visé à la souris, sinon le quartier visé ou choisi.
  const aim = focusDistrict ?? selected;
  const target: [number, number] =
    focus ?? (aim ? districtCenter(aim) : [MAP_W / 2, MAP_H / 2]);
  const [tx, ty] =
    zoom > 1.001
      ? cameraOffset(width, height, k, target[0], target[1])
      : [0, 0];
  const toScreen = (x: number, y: number): [number, number] => [
    x * k + tx,
    y * k + ty,
  ];

  // ── Déplacement à la souris (glisser) et zoom à la molette ──
  const rootRef = useRef<HTMLDivElement>(null);
  const cam = useRef({ zoom, k, tx, ty, width, height, fit });
  cam.current = { zoom, k, tx, ty, width, height, fit };
  const onCameraRef = useRef(onCamera);
  onCameraRef.current = onCamera;
  const drag = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    id: number;
    moved: boolean;
  } | null>(null);
  const swallowClick = useRef(false);
  const [moving, setMoving] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      const send = onCameraRef.current;
      if (!send) return;
      const c = cam.current;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const next = Math.min(
        ZOOM_MAX,
        Math.max(1, c.zoom * Math.exp(-delta * 0.0016))
      );
      // Aux bornes, la molette fait défiler la page comme d'habitude.
      if (Math.abs(next - c.zoom) < 1e-4) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px0 = e.clientX - r.left;
      const py0 = e.clientY - r.top;
      // Le point de la carte sous le pointeur reste sous le pointeur.
      const mx = (px0 - c.tx) / c.k;
      const my = (py0 - c.ty) / c.k;
      const nk = c.fit * next;
      const [ntx, nty] = clampOffset(
        c.width,
        c.height,
        nk,
        px0 - mx * nk,
        py0 - my * nk
      );
      send({ zoom: next, focus: focusOf(c.width, c.height, nk, ntx, nty) });
      setMoving(true);
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setMoving(false), 180);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(idleTimer.current);
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || zoom <= 1.001 || !onCamera) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      tx,
      ty,
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
      setMoving(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const c = cam.current;
    const [ntx, nty] = clampOffset(
      c.width,
      c.height,
      c.k,
      d.tx + dx,
      d.ty + dy
    );
    onCameraRef.current?.({
      zoom: c.zoom,
      focus: focusOf(c.width, c.height, c.k, ntx, nty),
    });
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setMoving(false);
    // Le relâchement d'un glisser ne doit pas ouvrir le bâtiment sous la souris.
    swallowClick.current = true;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 0);
  };

  // ── Survol : bâtiment mis en évidence tout de suite, aperçu après un instant ──
  const [hot, setHot] = useState<DistrictId | null>(null);
  const [previewId, setPreviewId] = useState<DistrictId | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const enter = (id: DistrictId, delay = 160) => {
    setHot(id);
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setPreviewId(id), delay);
  };
  const leave = () => {
    setHot(null);
    window.clearTimeout(hoverTimer.current);
    setPreviewId(null);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const shownPreview = moving ? null : previewId;
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewH, setPreviewH] = useState(200);
  useLayoutEffect(() => {
    const h = previewRef.current?.offsetHeight;
    if (h) setPreviewH(h);
  }, [shownPreview]);

  // ── Le décor, du fond vers l'avant (un objet devant en cache un autre) ──
  const objects = useMemo(
    () =>
      [
        ...TREES.map((t, i) => ({
          key: `tree-${i}`,
          depth: depthOf(t.u, t.v),
          node: <TreeArt u={t.u} v={t.v} s={t.s} />,
          id: null as DistrictId | null,
        })),
        ...BENCHES.map((b, i) => ({
          key: `bench-${i}`,
          depth: depthOf(b.u, b.v),
          node: <BenchArt u={b.u} v={b.v} along={b.along} />,
          id: null as DistrictId | null,
        })),
        ...DISTRICTS.map((d) => {
          const [cu, cv] = blockCenter(d.id);
          return {
            key: `bld-${d.id}`,
            depth: depthOf(cu, cv) + 0.2,
            node: <BuildingArt id={d.id} />,
            id: d.id as DistrictId | null,
          };
        }),
      ].sort((a, b) => a.depth - b.depth),
    []
  );
  const ground = useMemo(
    () => ({
      slab: groundRect(
        -CITY_EDGE,
        -CITY_EDGE,
        GRID + CITY_EDGE,
        GRID + CITY_EDGE,
        0.34,
        0
      ),
      slabSide: groundRect(
        -CITY_EDGE,
        -CITY_EDGE,
        GRID + CITY_EDGE,
        GRID + CITY_EDGE,
        0.34,
        -14
      ),
      dashes: laneDashes(),
      zebras: crosswalks(),
      plots: [
        ...DISTRICTS.map((d) => {
          const [i, j] = DISTRICT_BLOCK[d.id];
          return { id: d.id as DistrictId | null, i, j };
        }),
        ...PARKS.map(([i, j]) => ({ id: null as DistrictId | null, i, j })),
      ].map((p) => ({
        ...p,
        top: groundRect(
          p.i + PLOT_INSET,
          p.j + PLOT_INSET,
          p.i + 1 - PLOT_INSET,
          p.j + 1 - PLOT_INSET,
          0.08,
          6
        ),
        side: groundRect(
          p.i + PLOT_INSET,
          p.j + PLOT_INSET,
          p.i + 1 - PLOT_INSET,
          p.j + 1 - PLOT_INSET,
          0.08,
          0
        ),
      })),
      trucks: routePath(TRUCK_ROUTE.pts, 4),
      walkers: WALKERS.map((w) => routePath(w.pts, 6)),
    }),
    []
  );
  const plaza = iso(...blockCenter('projets'), 6);

  const isLit = (id: DistrictId) => !districts[id].dimmed;
  const active = (id: DistrictId) => id === hot || id === selected;
  const truckCount = Math.max(0, Math.min(3, trucks));
  const liveFlows = flows.filter((f) => f.exchange && f.dots > 0);

  // ── Étiquettes : à l'aplomb de leur toit, écartées (ou montées) si elles se touchent ──
  const pills = DISTRICTS.map((d) => {
    const s = districts[d.id];
    const [x, y] = toScreen(...labelAnchor(d.id));
    return {
      id: d.id,
      x,
      y,
      w: (labelWidth(s.title, s.badge) + (s.level === 3 ? 18 : 0)) * ls,
      h: 41 * ls,
      left: s.alert ? 18 * ls : 0,
    };
  });
  const placed = placeLabels(pills);
  /** Pastille placée : centre (cx), bas (cy), largeur, déplacement. */
  const pillOf = (id: DistrictId) => {
    const p = pills.find((q) => q.id === id) as (typeof pills)[number];
    const { dx, dy } = placed[id];
    return { ...p, dx, dy, cx: p.x + dx, cy: p.y + dy };
  };

  // ── Bulles d'activité : une par quartier (la plus récente) ──
  const bubbles = activity.reduce<(VillageActivity & { d: DistrictId })[]>(
    (acc, a) => {
      const d = districtOf(a.id);
      if (!acc.some((b) => b.d === d)) acc.push({ ...a, d });
      return acc;
    },
    []
  );

  return (
    <div
      ref={rootRef}
      className={moving ? 'vg-moving' : undefined}
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
      style={
        {
          position: 'relative',
          width,
          height,
          overflow: 'hidden',
          cursor: zoom > 1.001 ? (moving ? 'grabbing' : 'grab') : 'default',
          touchAction: zoom > 1.001 ? 'none' : 'auto',
          // Rythme commun de tout ce qui suit la caméra (îlot, étiquettes,
          // bulles) : ils restent alignés pendant le mouvement.
          '--vg-cam': `${cameraMs}ms ${
            cameraMs > 1000
              ? 'cubic-bezier(.65,0,.35,1)'
              : 'cubic-bezier(.2,.8,.2,1)'
          }`,
        } as CSSProperties
      }
    >
      <style>{CSS}</style>
      <div
        className="vg-world"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: MAP_W,
          height: MAP_H,
          transformOrigin: '0 0',
          transform: `translate(${px(tx)}, ${px(ty)}) scale(${k})`,
          transition: 'transform var(--vg-cam)',
        }}
      >
        {/* Le sol : l'îlot, les rues et leurs marquages, les parcelles */}
        <svg
          width={MAP_W}
          height={MAP_H}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id={`${uid}plaza`}>
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.32} />
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </radialGradient>
            <filter
              id={`${uid}soft`}
              x="-20%"
              y="-20%"
              width="140%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>
          <path
            d={ground.slab}
            fill="rgba(60,56,110,0.10)"
            filter={ref('soft')}
            transform="translate(0 22)"
          />
          <path d={ground.slabSide} fill="#d9dde7" />
          <path d={ground.slab} fill="#e9ecf2" />
          <path
            d={ground.dashes}
            stroke="#ffffff"
            strokeWidth={2.4}
            strokeDasharray="11 10"
            strokeLinecap="round"
          />
          <path d={ground.zebras} fill="#ffffff" opacity={0.95} />
          {ground.plots.map((p) => {
            const id = p.id;
            const park = !id;
            const isPlaza = id === 'projets';
            const on = id ? active(id) : false;
            const alert = id ? !!districts[id].alert : false;
            const hue = id ? districtById(id).hue : '#86c77f';
            return (
              <g
                key={`plot-${p.i}-${p.j}`}
                opacity={id && !isLit(id) ? 0.45 : 1}
                style={{ transition: 'opacity .3s ease' }}
                onPointerEnter={id ? () => enter(id) : undefined}
                onPointerLeave={id ? leave : undefined}
                onClick={id ? () => onSelect(id) : undefined}
              >
                <path
                  d={p.side}
                  fill={park ? '#cfe4c6' : isPlaza ? '#ddd5fb' : '#e1e4ec'}
                />
                <path
                  className={id ? 'vg-plot' : undefined}
                  d={p.top}
                  fill={
                    park
                      ? '#e4f2de'
                      : isPlaza
                        ? '#f3f0ff'
                        : on
                          ? '#fbfaff'
                          : alert
                            ? '#fff7f7'
                            : '#f7f8fb'
                  }
                  stroke={on ? hue : 'none'}
                  strokeWidth={on ? 2.5 : 0}
                />
                {/* Alerte : liseré discret (le drapeau et l'étiquette disent le reste) */}
                {alert && !on && (
                  <path
                    d={p.top}
                    fill="none"
                    stroke="#f87171"
                    strokeOpacity={0.7}
                    strokeWidth={1.5}
                    strokeDasharray="7 6"
                  />
                )}
              </g>
            );
          })}
          <ellipse
            cx={plaza[0]}
            cy={plaza[1]}
            rx={150}
            ry={76}
            fill={ref('plaza')}
            pointerEvents="none"
          />
          {/* Échanges : chemins en pointillés entre les bâtiments */}
          {flows
            .filter((f) => f.exchange && f.count !== null)
            .map((f) => (
              <path
                key={`ex-${f.id}`}
                className={animations && f.dots > 0 ? 'vg-dash' : undefined}
                d={f.d}
                fill="none"
                stroke="#7c6cff"
                strokeOpacity={f.dots > 0 ? 0.55 : 0.18}
                strokeWidth={2.2}
                strokeDasharray="3 6"
                strokeLinecap="round"
                pointerEvents="none"
              />
            ))}
        </svg>

        {/* Ce qui circule : sous les bâtiments, au-dessus du sol (le survol
            et le clic passent au travers, jusqu'aux parcelles) */}
        {animations && (
          <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {liveFlows.flatMap((f) =>
              Array.from({ length: f.dots }, (_, i) => (
                <span
                  key={`tok-${f.id}-${i}`}
                  className="vg-agent"
                  style={{
                    offsetPath: `path('${f.d}')`,
                    animationDuration: `${f.duration}s`,
                    animationDelay: `${(-i * f.duration) / f.dots}s`,
                  }}
                >
                  {f.exchange?.token === 'doc' ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 22,
                        marginLeft: -10,
                        marginTop: -11,
                        borderRadius: 6,
                        background: '#ffffff',
                        border: '1.5px solid #8b7dff',
                        boxShadow: '0 4px 10px rgba(76,63,214,0.25)',
                      }}
                    >
                      <svg width={11} height={13} viewBox="0 0 11 13">
                        <path
                          d="M1 1 h6 l3 3 v8 h-9 z"
                          fill="#efecfe"
                          stroke="#6d5dfc"
                          strokeWidth={1.2}
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3 6.5 h5 M3 9 h4"
                          stroke="#6d5dfc"
                          strokeWidth={1.1}
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'block',
                        width: 10,
                        height: 10,
                        marginLeft: -5,
                        marginTop: -5,
                        borderRadius: '50%',
                        background: '#7c6cff',
                        border: '2px solid #ffffff',
                        boxShadow: '0 0 10px 2px rgba(124,108,255,0.55)',
                      }}
                    />
                  )}
                </span>
              ))
            )}
            {Array.from({ length: truckCount }, (_, i) => (
              <span
                key={`truck-${i}`}
                className="vg-agent"
                style={{
                  offsetPath: `path('${ground.trucks}')`,
                  animationDuration: `${TRUCK_ROUTE.duration}s`,
                  animationDelay: `${(-i * TRUCK_ROUTE.duration) / truckCount}s`,
                }}
              >
                <span
                  style={{ display: 'block', marginLeft: -30, marginTop: -30 }}
                >
                  <TruckArt />
                </span>
              </span>
            ))}
            {WALKERS.map((w, i) => (
              <span
                key={`walker-${i}`}
                className="vg-agent"
                style={{
                  offsetPath: `path('${ground.walkers[i]}')`,
                  animationDuration: `${w.duration}s`,
                  animationDelay: `${-i * 6.5}s`,
                }}
              >
                <span
                  className="vg-step"
                  style={{ display: 'block', marginLeft: -6, marginTop: -21 }}
                >
                  <WalkerArt shirt={SHIRTS[i % SHIRTS.length]} />
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Bâtiments, arbres et bancs, du fond vers l'avant */}
        <svg
          width={MAP_W}
          height={MAP_H}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <filter
              id={`${uid}glow`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="10"
                stdDeviation="9"
                floodColor="#6d5dfc"
                floodOpacity="0.32"
              />
            </filter>
          </defs>
          {objects.map((o, idx) => {
            if (!o.id) return <g key={o.key}>{o.node}</g>;
            const id = o.id;
            const on = active(id);
            return (
              <g
                key={o.key}
                className={`vg-bld${id === hot ? ' vg-lift' : ''}${arrival ? ' vg-rise' : ''}`}
                opacity={isLit(id) ? 1 : 0.45}
                filter={on ? ref('glow') : undefined}
                style={{
                  pointerEvents: 'auto',
                  animationDelay: arrival ? `${idx * 40}ms` : undefined,
                }}
                onPointerEnter={() => enter(id)}
                onPointerLeave={leave}
                onClick={() => onSelect(id)}
              >
                {o.node}
                {/* Toute la silhouette répond au survol, fenêtres comprises */}
                <path d={silhouette(id)} fill="transparent" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Zoom : la ville se fond dans le fond en haut et en bas, sans coupe nette */}
      {zoom > 1.001 &&
        (['top', 'bottom'] as const).map((side) => (
          <div
            key={`fade-${side}`}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              [side]: 0,
              height: 30,
              background: `linear-gradient(to ${side}, transparent, ${edge})`,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        ))}

      {/* Étiquettes : taille fixe à l'écran, en verre dépoli */}
      {DISTRICTS.map((d) => {
        const s = districts[d.id];
        const { cx, cy, w, dx, dy } = pillOf(d.id);
        const on = active(d.id);
        const rim = on
          ? d.hue
          : s.alert
            ? 'rgba(239,68,68,0.9)'
            : 'rgba(109,93,252,0.45)';
        return (
          <div key={`lab-${d.id}`}>
            {s.alert && (
              <svg
                aria-hidden="true"
                width={18 * ls}
                height={24 * ls}
                viewBox="0 0 18 24"
                className="vg-follow"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  translate: `${px(cx - w / 2 - 16 * ls)} ${px(cy - 26 * ls)}`,
                  zIndex: 2001,
                  opacity: isLit(d.id) ? 1 : 0.45,
                  overflow: 'visible',
                }}
              >
                <rect x="1" y="2" width="2" height="21" rx="1" fill="#7f1d1d" />
                <path
                  className="vg-flag"
                  d="M3 3 L16 7.5 L3 12 Z"
                  fill="#ef4444"
                />
              </svg>
            )}
            <button
              type="button"
              className={`vg-pill${d.id === hot ? ' vg-hot' : ''}`}
              onClick={() => onSelect(d.id)}
              onMouseEnter={() => enter(d.id, 80)}
              onMouseLeave={leave}
              onFocus={() => enter(d.id, 0)}
              onBlur={leave}
              aria-pressed={selected === d.id}
              aria-label={s.aria}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                translate: `calc(${px(cx)} - 50%) calc(${px(cy)} - 100%)`,
                zIndex: 2000,
                opacity: isLit(d.id) ? 1 : 0.45,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7 * ls,
                height: 34 * ls,
                boxSizing: 'border-box',
                padding: s.badge
                  ? `0 ${6 * ls}px 0 ${12 * ls}px`
                  : `0 ${15 * ls}px 0 ${12 * ls}px`,
                borderRadius: 999,
                ...GLASS,
                ...(on || s.alert ? { border: `2px solid ${rim}` } : {}),
                fontSize: 14 * ls,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <span
                style={{ fontSize: 18 * ls, display: 'flex', color: d.hue }}
              >
                {s.icon}
              </span>
              {s.level === 3 && (
                <svg
                  aria-hidden="true"
                  width={13 * ls}
                  height={13 * ls}
                  viewBox="0 0 24 24"
                  style={{ marginLeft: -3 * ls, flexShrink: 0 }}
                >
                  <path
                    d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
                    fill="#f6c445"
                    stroke="#d99a1e"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {s.title}
              {s.badge && (
                <span
                  style={{
                    minWidth: 24 * ls,
                    height: 24 * ls,
                    padding: `0 ${7 * ls}px`,
                    boxSizing: 'border-box',
                    borderRadius: 999,
                    background: s.tone,
                    color: '#ffffff',
                    fontSize: 12.5 * ls,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {s.badge}
                </span>
              )}
              <svg
                aria-hidden="true"
                width={12 * ls}
                height={7 * ls}
                viewBox="0 0 12 7"
                style={{
                  position: 'absolute',
                  // La pointe reste au-dessus du toit si la pastille a glissé.
                  left: `calc(50% - ${px(dx)})`,
                  bottom: -7 * ls + 1,
                  marginLeft: -6 * ls,
                  overflow: 'visible',
                }}
              >
                <path d="M0 0 L6 7 L12 0 Z" fill="rgba(255,255,255,0.86)" />
              </svg>
              {/* Étiquette montée pour ne pas en cacher une autre : une tige la relie au toit */}
              {dy < -1 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: `calc(50% - ${px(dx)})`,
                    top: '100%',
                    marginTop: 6 * ls - 1,
                    marginLeft: -1,
                    width: 2,
                    height: -dy,
                    borderRadius: 1,
                    background: rim,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: -2,
                      bottom: -3,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: rim,
                    }}
                  />
                </span>
              )}
            </button>
          </div>
        );
      })}

      {/* Aperçu au survol : les rubriques du quartier et ses échanges */}
      {shownPreview &&
        (() => {
          const s = districts[shownPreview];
          const d = districtById(shownPreview);
          const pill = pillOf(shownPreview);
          const W = 262;
          const at = previewPlacement({
            x: pill.cx,
            y: pill.cy,
            pillW: pill.w + 8 * ls,
            pillH: 34 * ls,
            cardW: W,
            cardH: previewH,
            mapW: width,
            mapH: height,
            busyAbove: bubbles.some((b) => b.d === shownPreview),
          });
          const exchanges = flows.filter(
            (f) =>
              f.exchange &&
              f.count !== null &&
              (f.exchange.from === shownPreview ||
                f.exchange.to === shownPreview)
          );
          return (
            <div
              key={`preview-${shownPreview}`}
              ref={previewRef}
              className="vg-preview"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                translate: `${px(at.left)} ${px(at.top)}`,
                width: W,
                boxSizing: 'border-box',
                padding: '12px 13px 10px',
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: '0 16px 34px rgba(40,36,80,0.18)',
                border: s.alert
                  ? '1.5px solid #fecaca'
                  : '1px solid rgba(17,24,39,0.06)',
                zIndex: 2130,
                pointerEvents: 'none',
                color: '#111827',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14.5,
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'flex', fontSize: 18, color: d.hue }}>
                  {s.icon}
                </span>
                <span style={{ flex: 1 }}>{s.title}</span>
                <span
                  style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7280' }}
                >
                  {s.lines.length} rubriques
                </span>
              </span>
              <span style={{ display: 'block', marginTop: 6 }}>
                {s.lines.map((l) => (
                  <span
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 6,
                      padding: '4px 0',
                      borderTop: '1px solid #f1eee8',
                      fontSize: 12.5,
                    }}
                  >
                    <span style={{ width: 92, flexShrink: 0, fontWeight: 700 }}>
                      {l.title}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: l.alert ? '#b91c1c' : '#6b7280',
                        fontWeight: l.alert ? 700 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.text}
                    </span>
                  </span>
                ))}
              </span>
              {exchanges.length > 0 && (
                <span
                  style={{
                    display: 'block',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px solid #f1eee8',
                  }}
                >
                  {exchanges.map((f) => (
                    <span
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: '#4b5563',
                        padding: '1px 0',
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#7c6cff',
                          flexShrink: 0,
                        }}
                      />
                      {f.exchange?.from === shownPreview ? '→ ' : '← '}
                      {
                        districtById(
                          f.exchange?.from === shownPreview
                            ? (f.exchange?.to as DistrictId)
                            : (f.exchange?.from as DistrictId)
                        ).name
                      }{' '}
                      ·{' '}
                      <strong style={{ fontWeight: 700, color: '#111827' }}>
                        {f.count}
                      </strong>{' '}
                      {f.short}
                    </span>
                  ))}
                </span>
              )}
              <span
                style={{
                  display: 'block',
                  marginTop: 7,
                  fontSize: 11.5,
                  color: '#9ca3af',
                }}
              >
                Cliquez pour ouvrir le quartier
              </span>
            </div>
          );
        })()}

      {/* Bulles d'activité en direct */}
      {bubbles.map((a) => {
        const { cx: x, cy } = pillOf(a.d);
        const top = cy - 34 * ls - 10;
        return (
          <button
            key={`bubble-${a.key}`}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            title={a.link ? 'Ouvrir' : undefined}
            onClick={() => (onOpenActivity ? onOpenActivity(a) : onSelect(a.d))}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              translate: `calc(${px(x)} - 50%) calc(${px(top)} - 100%)`,
              transition: 'translate var(--vg-cam)',
              zIndex: 2100,
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span
              className="vg-bubble"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                maxWidth: 250,
                padding: '7px 12px 7px 10px',
                borderRadius: 14,
                background: '#111827',
                color: '#ffffff',
                fontSize: 12.5 * Math.max(0.9, ls),
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 10px 22px rgba(17,24,39,0.28)',
              }}
            >
              <span
                className="vg-live"
                style={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: '#4ade80',
                }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.text}
              </span>
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: -5,
                  width: 10,
                  height: 10,
                  marginLeft: -5,
                  background: '#111827',
                  transform: 'rotate(45deg)',
                  borderRadius: 2,
                }}
              />
            </span>
          </button>
        );
      })}

      {/* Annonce pour les lecteurs d'écran : nouvelle activité */}
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {bubbles[0]
          ? `Nouvelle activité, ${districtById(bubbles[0].d).name} : ${bubbles[0].text}`
          : ''}
      </span>

      {children}
    </div>
  );
};

export default VillageMap;
