// Carte du village : sol teinté par quartier, bâtiments, décors, promeneurs,
// étiquettes et noms de quartier. Affichage seul — AdminVillage décide de tout.
//
// Le dessin (sol, sprites, promeneurs) vit dans un calque « monde » de
// MAP_W × MAP_H mis à l'échelle (ajustement au conteneur × zoom) ; les
// étiquettes vivent dans un calque écran, à taille fixe, repositionnées à
// chaque zoom et posées sans chevauchement (placeLabels).
//
// Caméra : on déplace la carte en la faisant glisser et on zoome à la molette
// autour du pointeur ; AdminVillage garde le zoom et le point visé (onCamera).
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { MdConstruction } from 'react-icons/md';
import type { Ambiance, Particle } from './villageAmbiance';
import type { VillageActivity } from './villageActivity';
import {
  matchesFilter,
  type ChantierHouse,
  type SectionStat,
  type VillageLife,
} from './villageModel';
import {
  CHANTIER,
  CHANTIER_CRANE,
  CHANTIER_HIT,
  CHANTIER_SLOTS,
  CHANTIER_SPRITE,
  CHIMNEY,
  DECOR,
  DELIVERY_ROUTE,
  DISTRICTS,
  FOUNTAIN_JET,
  LAYOUT,
  MAP_H,
  MAP_W,
  PARKING,
  SPRITE_META,
  SPRITE_SCALE,
  SPRITE_SIZE,
  WALKERS,
  ZOOM_MAX,
  buildGround,
  cameraOffset,
  chantierLabelAnchor,
  clampOffset,
  depthZ,
  districtById,
  districtCenter,
  districtOf,
  districtTagBox,
  focusOf,
  labelAnchor,
  labelWidth,
  placeLabels,
  plotFront,
  plotPath,
  previewPlacement,
  spritePoint,
  spriteUrl,
  toMap,
  type Box,
  type DistrictId,
  type SectionId,
  type Walker,
} from './villageScene';

export type VillageFilter =
  | 'tout'
  | 'urgent'
  | 'traiter'
  | 'production'
  | 'livrer';

export interface MapSection {
  title: string;
  icon: ReactNode;
  /** Pastille de compte (ex. « 38 », « +3 ») ; null = pas de pastille. */
  badge: string | null;
  tone: string;
  /** Filtres auxquels la rubrique répond. */
  tags: VillageFilter[];
  /** Phrase lue par les lecteurs d'écran. */
  aria: string;
  /** Vrai problème : halo rouge autour de la parcelle, drapeau à côté de l'étiquette. */
  alert: string | null;
  /**
   * Activité du mois : 1 = fanions aux coins de la parcelle, 2 = guirlande de
   * fanions, 3 = étoile dorée sur l'étiquette et scintillements.
   */
  level: 0 | 1 | 2 | 3;
  /** Aperçu au survol : phrase courte, 2 ou 3 chiffres, activité du mois. */
  preview: { chip: string; stats: SectionStat[]; activity: string | null };
}

const CSS = `
.vg-walk-1{animation:vg-walk linear infinite}
.vg-walk-2{animation:vg-trip linear infinite}
.vg-out{animation:vg-out linear infinite}
.vg-back{animation:vg-back linear infinite}
.vg-bob{animation:vg-bob .55s ease-in-out infinite}
@keyframes vg-walk{0%{transform:translate(0,0);z-index:var(--z0);opacity:0}6%{opacity:1}94%{opacity:1}100%{transform:translate(var(--dx),var(--dy));z-index:var(--z1);opacity:0}}
@keyframes vg-trip{0%{transform:translate(0,0);z-index:var(--z0)}50%{transform:translate(var(--dx),var(--dy));z-index:var(--z1)}100%{transform:translate(0,0);z-index:var(--z0)}}
@keyframes vg-out{0%,49.8%{opacity:1}50%,100%{opacity:0}}
@keyframes vg-back{0%,49.8%{opacity:0}50%,100%{opacity:1}}
@keyframes vg-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
.vg-fall{position:absolute;top:-6%;animation:vg-fall linear infinite}
@keyframes vg-fall{0%{transform:translate(0,0) rotate(0deg);opacity:0}8%{opacity:.95}92%{opacity:.95}100%{transform:translate(var(--drift),112vh) rotate(var(--spin));opacity:0}}
.vg-alert-ring{animation:vg-alert 1.6s ease-in-out infinite}
@keyframes vg-alert{0%,100%{stroke-opacity:.35;fill-opacity:.06}50%{stroke-opacity:1;fill-opacity:.16}}
.vg-flag{transform-origin:2px 4px;animation:vg-flag 1.2s ease-in-out infinite}
@keyframes vg-flag{0%,100%{transform:skewY(0deg) scaleX(1)}50%{transform:skewY(-6deg) scaleX(.9)}}
.vg-ping{transform-box:fill-box;transform-origin:center;animation:vg-ping 1.5s ease-out 5 forwards}
@keyframes vg-ping{0%{transform:scale(.92);stroke-opacity:.95}100%{transform:scale(1.22);stroke-opacity:0}}
.vg-bubble{animation:vg-bubble 9s ease forwards}
@keyframes vg-bubble{0%{opacity:0;transform:translateY(8px) scale(.9)}5%{opacity:1;transform:translateY(0) scale(1)}90%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-6px)}}
.vg-live{animation:vg-live 1s ease-in-out infinite}
@keyframes vg-live{0%,100%{opacity:1}50%{opacity:.35}}
.vg-preview{animation:vg-preview .16s ease-out backwards}
@keyframes vg-preview{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.vg-pill,.vg-tag{transition:translate .6s cubic-bezier(.2,.8,.2,1),transform .22s cubic-bezier(.3,1.6,.5,1),opacity .3s ease,box-shadow .2s ease}
.vg-pill:hover{transform:translateY(-3px);box-shadow:0 12px 24px rgba(40,36,80,.2) !important}
.vg-tag:hover{transform:translateY(-2px)}
.vg-pill:focus-visible,.vg-tag:focus-visible,.vg-house:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
.vg-moving .vg-world,.vg-moving .vg-pill,.vg-moving .vg-tag,.vg-moving .vg-follow{transition:none !important}
.vg-arrive{animation:vg-rise .5s cubic-bezier(.2,1.5,.4,1) backwards;transform-origin:50% 75%}
@keyframes vg-rise{from{opacity:0;transform:translateY(18px) scale(.7)}to{opacity:1;transform:none}}
.vg-fade-in{animation:vg-fade .6s ease backwards}
@keyframes vg-fade{from{opacity:0}to{opacity:1}}
.vg-label-in{animation:vg-label .35s ease backwards}
@keyframes vg-label{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.vg-smoke{position:absolute;border-radius:50%;background:radial-gradient(circle at 38% 35%,#ffffff,#d9dee9);box-shadow:0 0 6px rgba(255,255,255,.6);pointer-events:none;animation:vg-smoke 5.4s cubic-bezier(.3,.6,.5,1) infinite}
@keyframes vg-smoke{0%{transform:translate(-50%,-50%) scale(.5);opacity:0}8%{opacity:.9}70%{opacity:.75}100%{transform:translate(calc(-50% + 26px),calc(-50% - 96px)) scale(3.2);opacity:0}}
.vg-drop{position:absolute;width:2.4px;height:2.4px;margin:-1.2px 0 0 -1.2px;border-radius:50%;background:#cfe6ff;pointer-events:none;animation:vg-drop 1.3s ease-in infinite}
@keyframes vg-drop{0%{transform:translate(0,0);opacity:0}10%{opacity:1}45%{transform:translate(calc(var(--dx) * .55),-5px)}100%{transform:translate(var(--dx),9px);opacity:0}}
.vg-twinkle{transform-box:fill-box;transform-origin:center;animation:vg-twinkle 1.8s ease-in-out infinite}
@keyframes vg-twinkle{0%,100%{opacity:.2;transform:scale(.55)}50%{opacity:1;transform:scale(1.1)}}
.vg-pennant{transform-box:fill-box;transform-origin:0% 50%;animation:vg-pennant 1.6s ease-in-out infinite}
.vg-pennant-r{transform-box:fill-box;transform-origin:100% 50%;animation:vg-pennant 1.6s ease-in-out infinite}
@keyframes vg-pennant{0%,100%{transform:skewY(0deg) scaleX(1)}50%{transform:skewY(-8deg) scaleX(.86)}}
.vg-bulb{animation:vg-bulb 1.4s steps(1) infinite}
.vg-bulb-b{animation-delay:-.7s}
@keyframes vg-bulb{0%,100%{opacity:1}50%{opacity:.25}}
@media (prefers-reduced-motion: reduce){
  .vg-walk-1,.vg-walk-2,.vg-fall,.vg-smoke,.vg-drop{display:none}
  .vg-bob,.vg-out,.vg-back,.vg-alert-ring,.vg-flag,.vg-ping,.vg-bubble,.vg-live,.vg-arrive,.vg-fade-in,.vg-label-in,.vg-twinkle,.vg-pennant,.vg-pennant-r,.vg-bulb,.vg-preview{animation:none}
  .vg-pill,.vg-tag,.vg-world,.vg-follow{transition:none !important}
}
`;

const px = (n: number) => `${n.toFixed(1)}px`;
const pt = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Réduit une boîte autour de son point d'ancrage (étiquettes réduites). */
const scaleBox = (b: Box, [x, y]: [number, number], s: number): Box => ({
  x0: x + (b.x0 - x) * s,
  x1: x + (b.x1 - x) * s,
  y0: y + (b.y0 - y) * s,
  y1: y + (b.y1 - y) * s,
});

/** Couleurs des fanions et des ampoules. */
const FLAGS = ['#f6c445', '#ef8aa0', '#0ea5e9', '#16a34a', '#7c6bff'];
const BULBS = ['#ff5a5f', '#ffd166', '#06d6a0', '#4cc9f0'];
/** Hauteur des fanions et de la guirlande lumineuse au-dessus du sol (pixels carte). */
const POLE_H = 20;
const GARLAND_H = 13;

/** Point d'une courbe quadratique a → b, creusée de `sag` pixels vers le bas. */
const along = (
  a: [number, number],
  b: [number, number],
  sag: number,
  t: number
): [number, number] => {
  const c: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag];
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
};
const curve = (a: [number, number], b: [number, number], sag: number) =>
  `M${pt(a)} Q${pt([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag])} ${pt(b)}`;

/** Étoile à quatre branches (scintillement), centrée en c. */
const sparkle = ([x, y]: [number, number], r: number) =>
  `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`;

interface Props {
  width: number;
  sections: Record<SectionId, MapSection>;
  selected: SectionId | null;
  district: DistrictId | null;
  filter: VillageFilter;
  /** Zoom continu : 1 = tout le village, jusqu'à ZOOM_MAX. */
  zoom: number;
  /** Point de la carte visé (glisser, molette) ; null = bâtiment ou quartier choisi. */
  focus?: [number, number] | null;
  /** Nouveau cadrage demandé par la souris (glisser, molette). */
  onCamera?: (camera: { zoom: number; focus: [number, number] }) => void;
  onSelect: (id: SectionId) => void;
  onSelectDistrict: (id: DistrictId) => void;
  /** Taille des étiquettes (réduites sur les cartes étroites). */
  labelScale?: number;
  /**
   * Heure et saison réelles : lumières et neige au sol. Le voile de nuit est
   * posé par AdminVillage sur toute la carte (en-tête compris, sans démarcation).
   */
  ambiance?: Ambiance | null;
  /** Feuilles, flocons ou pétales qui tombent (vide = rien). */
  particles?: Particle[];
  /** Notifications reçues à l'instant : bulle au-dessus du bâtiment. */
  activity?: VillageActivity[];
  /** Clic sur une bulle d'activité : ouvrir la page de la notification. */
  onOpenActivity?: (a: VillageActivity) => void;
  /** Maisons du chantier, derrière Projets : un projet chacune. */
  chantier?: ChantierHouse[];
  onOpenProject?: (documentId: string) => void;
  /** Fumée de l'atelier, voitures devant la Boutique, camionnettes du jour. */
  life?: VillageLife | null;
  /** Guirlandes lumineuses sur les parcelles (fêtes de fin d'année). */
  festive?: boolean;
  /** Première visite de la session : le village se construit sous les yeux. */
  arrival?: boolean;
  /** Commandes posées par-dessus la carte (titre, filtres, zoom…). */
  children?: ReactNode;
}

const VillageMap = ({
  width,
  sections,
  selected,
  district,
  filter,
  zoom,
  focus = null,
  onCamera,
  onSelect,
  onSelectDistrict,
  labelScale = 1,
  ambiance = null,
  particles = [],
  activity = [],
  onOpenActivity,
  chantier = [],
  onOpenProject,
  life = null,
  festive = false,
  arrival = false,
  children,
}: Props) => {
  const ground = useMemo(buildGround, []);
  const fit = width / MAP_W;
  const height = Math.round(MAP_H * fit);
  const k = fit * zoom;

  // Cadrage : le point visé à la souris, sinon le quartier ou le bâtiment choisi.
  const target: [number, number] =
    focus ??
    (district
      ? districtCenter(district)
      : (() => {
          const cell =
            LAYOUT.find((c) => c.id === selected) ??
            LAYOUT.find((c) => c.id === 'projets')!;
          return toMap(cell.u, cell.v);
        })());
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

  const lit = (id: SectionId) =>
    matchesFilter(sections[id], filter) &&
    (!district || districtOf(id) === district);
  const calm = filter === 'tout' && !district;

  // ── Bâtiments, décors, chantier et voitures, du fond vers l'avant ──
  const houseKey = chantier.map((h) => `${h.documentId}:${h.stage}`).join('|');
  const cars = Math.max(0, Math.min(PARKING.length, life?.cars ?? 0));
  const sprites = useMemo(() => {
    const place = (
      key: string,
      kind: 'building' | 'decor' | 'chantier',
      id: SectionId | null,
      src: string,
      u: number,
      v: number
    ) => {
      const [x, y] = toMap(u, v);
      return {
        key,
        kind,
        id,
        src,
        x: x - 200 * SPRITE_SCALE,
        y: y - 300 * SPRITE_SCALE,
        z: depthZ(u + v),
      };
    };
    const list = [
      ...LAYOUT.map((c) =>
        place(c.id, 'building', c.id, spriteUrl(c.id), c.u, c.v)
      ),
      ...DECOR.map((d, i) =>
        place(`d${i}`, 'decor', null, spriteUrl(d.sprite), d.u, d.v)
      ),
      place(
        'grue',
        'chantier',
        null,
        spriteUrl(CHANTIER_CRANE.sprite),
        CHANTIER_CRANE.u,
        CHANTIER_CRANE.v
      ),
      ...houseKey
        .split('|')
        .filter(Boolean)
        .map((entry, i) => {
          const [documentId, stage] = entry.split(':');
          const [du, dv] = CHANTIER_SLOTS[i];
          return place(
            `maison-${documentId}`,
            'chantier',
            null,
            spriteUrl(CHANTIER_SPRITE[stage as keyof typeof CHANTIER_SPRITE]),
            CHANTIER.u + du,
            CHANTIER.v + dv
          );
        }),
      ...PARKING.slice(0, cars).map((p, i) =>
        place(`car${i}`, 'decor', null, spriteUrl(p.sprite), p.u, p.v)
      ),
    ];
    return list.sort((a, b) => a.z - b.z);
  }, [houseKey, cars]);
  /** Ordre de construction à l'arrivée : du fond vers l'avant. */
  const buildOrder = useMemo(
    () =>
      new Map(
        sprites
          .filter((s) => s.kind === 'building')
          .map((s, i) => [s.id as SectionId, i])
      ),
    [sprites]
  );
  const arriveDelay = (id: SectionId) => 150 + (buildOrder.get(id) ?? 0) * 45;

  // Camionnettes des livraisons du jour (à la place de celle de passage).
  const vans = Math.max(0, Math.min(3, life?.vans ?? 0));
  const walkers: Walker[] = useMemo(
    () =>
      vans
        ? [
            ...WALKERS.filter((w) => w.sprite !== 'van-y'),
            ...Array.from({ length: vans }, (_, i) => ({
              sprite: 'van-y',
              from: DELIVERY_ROUTE.from,
              to: DELIVERY_ROUTE.to,
              duration: 15,
              delay: -(i * 15) / vans,
              vehicle: true,
            })),
          ]
        : WALKERS,
    [vans]
  );

  // ── Étiquettes à taille fixe, en coordonnées écran, sans chevauchement ──
  const tagPos = DISTRICTS.map((d) => toScreen(d.tag[0], d.tag[1]));
  const tagBoxes = DISTRICTS.map((d, i) =>
    scaleBox(
      districtTagBox(d, tagPos[i][0], tagPos[i][1]),
      tagPos[i],
      labelScale
    )
  );
  const pillWidth = (s: MapSection) =>
    labelWidth(s.title, s.badge) + (s.level === 3 ? 18 : 0);
  const chantierAnchor = toScreen(...chantierLabelAnchor());
  const labels = placeLabels(
    [
      ...LAYOUT.map((c) => {
        const [ax, ay] = labelAnchor(c);
        const [x, y] = toScreen(ax, ay);
        return {
          id: c.id as string,
          x,
          y,
          w: pillWidth(sections[c.id]) * labelScale,
          h: 32 * labelScale,
          depth: c.u + c.v,
        };
      }),
      {
        id: 'chantier',
        x: chantierAnchor[0],
        y: chantierAnchor[1],
        w: labelWidth('Chantiers', null) * labelScale,
        h: 32 * labelScale,
        depth: CHANTIER.u + CHANTIER.v,
      },
    ],
    tagBoxes
  );
  const anchors = Object.fromEntries([
    ...LAYOUT.map((c) => [c.id, toScreen(...labelAnchor(c))]),
    ['chantier', chantierAnchor],
  ]) as Record<string, [number, number]>;

  // Lumières du soir : la lanterne de chaque lampadaire et les fenêtres de
  // chaque bâtiment (en coordonnées carte, converties à l'affichage).
  const lightSpots = useMemo(
    () => [
      ...DECOR.filter((d) => d.sprite === 'decor-lamp').map((d) => {
        const [x, y] = toMap(d.u, d.v);
        return { x, y: y - 40 * SPRITE_SCALE, r: 26, lamp: true };
      }),
      ...LAYOUT.map((c) => {
        const [x, y] = toMap(c.u, c.v);
        return { x, y: y - 34 * SPRITE_SCALE, r: 46, lamp: false };
      }),
    ],
    []
  );

  const selCell = LAYOUT.find((c) => c.id === selected);
  const ring = selCell && !district ? plotPath(selCell.u, selCell.v) : null;
  const [hoverHouse, setHoverHouse] = useState<number | null>(null);
  // Aperçu au survol d'un bâtiment ou de son étiquette (petit délai : pas de
  // bulle qui clignote quand on traverse la carte).
  const [hoverId, setHoverId] = useState<SectionId | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const startHover = (id: SectionId, delay = 140) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverId(id), delay);
  };
  const endHover = () => {
    window.clearTimeout(hoverTimer.current);
    setHoverId(null);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const previewId = moving ? null : hoverId;
  // Hauteur réelle de l'aperçu, mesurée avant l'affichage : il se place
  // au-dessus de l'étiquette s'il y tient, sinon à côté.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewH, setPreviewH] = useState(240);
  useLayoutEffect(() => {
    const h = previewRef.current?.offsetHeight;
    if (h) setPreviewH(h);
  }, [previewId]);
  const smoke = Math.max(0, Math.min(3, life?.smoke ?? 0));
  const prodCell = LAYOUT.find((c) => c.id === CHIMNEY.id)!;
  const fountainCell = LAYOUT.find((c) => c.id === FOUNTAIN_JET.id)!;

  /** Fanions, guirlande de fanions, scintillements et guirlande lumineuse d'une parcelle. */
  const plotDecor = (c: (typeof LAYOUT)[number]) => {
    const s = sections[c.id];
    const level = s.level;
    if (!level && !festive) return null;
    const [L, F, R] = plotFront(c.u, c.v);
    const up = (p: [number, number], h: number): [number, number] => [
      p[0],
      p[1] - h,
    ];
    const hue = districtById(c.district).hue;
    const hit = SPRITE_META[c.id].hit;
    const top = spritePoint(c.u, c.v, hit.x, hit.y)[1];
    const box = {
      x: L[0] - 14,
      y: Math.min(top - 12, L[1] - POLE_H - 12),
      w: R[0] - L[0] + 28,
      h: F[1] + 6 - Math.min(top - 12, L[1] - POLE_H - 12),
    };
    const flagsOn = (a: [number, number], b: [number, number], n: number) =>
      Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const p = along(a, b, 7, t);
        return (
          <path
            key={`${a[0]}-${t}`}
            d={`M${pt([p[0] - 2.6, p[1]])} L${pt([p[0] + 2.6, p[1]])} L${pt([p[0], p[1] + 5.4])} Z`}
            fill={FLAGS[(i + Math.round(a[0])) % FLAGS.length]}
          />
        );
      });
    const bulbsOn = (a: [number, number], b: [number, number], n: number) =>
      Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const p = along(a, b, 5, t);
        return (
          <circle
            key={`${a[0]}-${t}`}
            className={i % 2 ? 'vg-bulb vg-bulb-b' : 'vg-bulb'}
            cx={p[0].toFixed(1)}
            cy={(p[1] + 1.4).toFixed(1)}
            r={1.7}
            fill={BULBS[i % BULBS.length]}
          />
        );
      });
    return (
      <svg
        key={`deco-${c.id}`}
        aria-hidden="true"
        width={box.w}
        height={box.h}
        viewBox={`${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}`}
        className={arrival ? 'vg-fade-in' : undefined}
        style={{
          position: 'absolute',
          left: box.x,
          top: box.y,
          zIndex: depthZ(c.u + c.v) + 2,
          pointerEvents: 'none',
          overflow: 'visible',
          opacity: lit(c.id) ? 1 : 0.4,
          transition: 'opacity .3s ease',
          animationDelay: arrival ? `${arriveDelay(c.id) + 250}ms` : undefined,
        }}
      >
        {level >= 1 && (
          <g>
            {[L, R].map((p, i) => (
              <g key={i}>
                <path
                  d={`M${pt(p)} L${pt(up(p, POLE_H))}`}
                  stroke="#6f7891"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
                <path
                  className={i ? 'vg-pennant' : 'vg-pennant-r'}
                  d={
                    i
                      ? `M${pt(up(p, POLE_H))} l9 3.4 l-9 3.4 Z`
                      : `M${pt(up(p, POLE_H))} l-9 3.4 l9 3.4 Z`
                  }
                  fill={hue}
                />
              </g>
            ))}
          </g>
        )}
        {level >= 2 && (
          <g>
            <path
              d={`M${pt(F)} L${pt(up(F, POLE_H))}`}
              stroke="#6f7891"
              strokeWidth={1.3}
              strokeLinecap="round"
            />
            <path
              d={`${curve(up(L, POLE_H - 1), up(F, POLE_H - 1), 7)} ${curve(up(F, POLE_H - 1), up(R, POLE_H - 1), 7)}`}
              fill="none"
              stroke="#8a7a62"
              strokeWidth={0.8}
            />
            {flagsOn(up(L, POLE_H - 1), up(F, POLE_H - 1), 6)}
            {flagsOn(up(F, POLE_H - 1), up(R, POLE_H - 1), 6)}
          </g>
        )}
        {level >= 3 &&
          [
            [hit.x + hit.w * 0.14, hit.y + hit.h * 0.3, 0],
            [hit.x + hit.w * 0.86, hit.y + hit.h * 0.22, 0.6],
            [hit.x + hit.w * 0.58, hit.y + 4, 1.2],
          ].map(([x, y, delay]) => (
            <path
              key={`${x}-${y}`}
              className="vg-twinkle"
              d={sparkle(spritePoint(c.u, c.v, x, y), 5.5)}
              fill="#ffd166"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        {festive && (
          <g>
            <path
              d={`${curve(up(L, GARLAND_H), up(F, GARLAND_H), 5)} ${curve(up(F, GARLAND_H), up(R, GARLAND_H), 5)}`}
              fill="none"
              stroke="#2f3a52"
              strokeWidth={0.7}
            />
            {bulbsOn(up(L, GARLAND_H), up(F, GARLAND_H), 8)}
            {bulbsOn(up(F, GARLAND_H), up(R, GARLAND_H), 8)}
          </g>
        )}
      </svg>
    );
  };

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
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        cursor: zoom > 1.001 ? (moving ? 'grabbing' : 'grab') : 'default',
        touchAction: zoom > 1.001 ? 'none' : 'auto',
      }}
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
          transition: 'transform .6s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div
          aria-hidden="true"
          className={arrival ? 'vg-fade-in' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            filter: 'drop-shadow(0 16px 22px rgba(92,72,40,0.16))',
          }}
        >
          {ground.layers.map((g) => (
            <svg
              key={g.district.id}
              width={MAP_W}
              height={MAP_H}
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: !district || district === g.district.id ? 1 : 0.5,
                transition: 'opacity .3s ease',
              }}
            >
              <path d={g.lit} fill={g.district.lit} />
              <path d={g.shaded} fill={g.district.shaded} />
              <path d={g.tiles} fill={g.district.tile} />
              {!!ambiance?.snow && (
                <path d={g.tiles} fill="#ffffff" opacity={ambiance.snow} />
              )}
              <path d={g.plotLeft} fill={g.district.lit} />
              <path d={g.plotRight} fill={g.district.shaded} />
              <path d={g.plotTop} fill={g.district.plot} />
            </svg>
          ))}
          <svg
            width={MAP_W}
            height={MAP_H}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: !district || district === CHANTIER.district ? 1 : 0.5,
              transition: 'opacity .3s ease',
            }}
          >
            {/* Parcelle du chantier : terre battue et barrière de chantier */}
            <path d={ground.lot.left} fill="#d8c29b" />
            <path d={ground.lot.right} fill="#cbb38a" />
            <path d={ground.lot.top} fill="#ead9b6" />
            <path
              d={ground.lot.top}
              fill="none"
              stroke="#f08a4b"
              strokeWidth={2.2}
              strokeDasharray="7 5"
              strokeLinejoin="round"
              opacity={0.8}
            />
          </svg>
          <svg
            width={MAP_W}
            height={MAP_H}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{ position: 'absolute', inset: 0 }}
          >
            <path
              d={ground.stones}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={16}
              strokeLinecap="round"
            />
            <path
              d={ground.stones}
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray="8 11"
            />
            {LAYOUT.filter((c) => sections[c.id].alert).map((c) => (
              <path
                key={`alert-${c.id}`}
                className="vg-alert-ring"
                d={plotPath(c.u, c.v)}
                fill="#ef4444"
                stroke="#ef4444"
                strokeWidth={4}
                strokeLinejoin="round"
              />
            ))}
            {activity.map((a) => {
              const c = LAYOUT.find((x) => x.id === a.id);
              return (
                c && (
                  <path
                    key={`ping-${a.key}`}
                    className="vg-ping"
                    d={plotPath(c.u, c.v)}
                    fill="none"
                    stroke="#6d5dfc"
                    strokeWidth={5}
                    strokeLinejoin="round"
                  />
                )
              );
            })}
            {ring && (
              <path
                d={ring}
                fill="rgba(109,93,252,0.10)"
                stroke="#6d5dfc"
                strokeWidth={3}
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>

        {sprites.map((s, i) => {
          const on =
            s.kind === 'chantier' ? lit('projets') : s.id ? lit(s.id) : calm;
          const delay = !arrival
            ? 0
            : s.kind === 'building'
              ? arriveDelay(s.id as SectionId)
              : s.kind === 'chantier'
                ? 1050 + (i % 4) * 90
                : 900 + (i % 16) * 30;
          return (
            <img
              key={s.key}
              src={s.src}
              alt=""
              draggable={false}
              decoding="async"
              className={
                arrival
                  ? s.kind === 'decor'
                    ? 'vg-fade-in'
                    : 'vg-arrive'
                  : undefined
              }
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                width: SPRITE_SIZE,
                height: SPRITE_SIZE,
                zIndex: s.z,
                opacity:
                  s.id || s.kind === 'chantier'
                    ? on
                      ? 1
                      : 0.32
                    : on
                      ? 1
                      : 0.55,
                filter:
                  s.id && s.id === previewId
                    ? 'drop-shadow(0 10px 12px rgba(40,36,80,0.28)) brightness(1.04)'
                    : s.id && on && filter !== 'tout'
                      ? 'drop-shadow(0 0 10px rgba(109,93,252,0.45))'
                      : 'none',
                transform:
                  s.id && s.id === previewId ? 'translateY(-6px)' : undefined,
                transition:
                  'opacity .3s ease, filter .25s ease, transform .2s cubic-bezier(.3,1.5,.5,1)',
                pointerEvents: 'none',
                animationDelay: arrival ? `${delay}ms` : undefined,
              }}
            />
          );
        })}

        {LAYOUT.map((c) => plotDecor(c))}

        {/* Fumée de l'atelier quand la production tourne */}
        {Array.from({ length: smoke }, (_, i) => {
          const [x, y] = spritePoint(
            prodCell.u,
            prodCell.v,
            CHIMNEY.x,
            CHIMNEY.y
          );
          return (
            <span
              key={`smoke-${i}`}
              aria-hidden="true"
              className="vg-smoke"
              style={{
                left: x,
                top: y,
                width: 9,
                height: 9,
                zIndex: depthZ(prodCell.u + prodCell.v) + 3,
                animationDelay: `${-(i * 5.4) / smoke}s`,
                opacity: lit('producteurs') ? undefined : 0.3,
              }}
            />
          );
        })}

        {/* Gouttes de la fontaine de la place */}
        {[-7, -4, -1.5, 1.5, 4, 7].map((dx, i) => {
          const [x, y] = spritePoint(
            fountainCell.u,
            fountainCell.v,
            FOUNTAIN_JET.x,
            FOUNTAIN_JET.y
          );
          return (
            <span
              key={`drop-${dx}`}
              aria-hidden="true"
              className="vg-drop"
              style={
                {
                  left: x,
                  top: y,
                  zIndex: depthZ(fountainCell.u + fountainCell.v) + 3,
                  animationDelay: `${-i * 0.21}s`,
                  '--dx': `${dx}px`,
                } as CSSProperties
              }
            />
          );
        })}

        <div
          aria-hidden="true"
          className={arrival ? 'vg-fade-in' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            animationDelay: arrival ? '1300ms' : undefined,
          }}
        >
          {walkers.map((w, i) => {
            const [x0, y0] = toMap(...w.from);
            const [x1, y1] = toMap(...w.to);
            const timing = {
              animationDuration: `${w.duration}s`,
              animationDelay: `${w.delay}s`,
            };
            const img = {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            } as const;
            return (
              <div
                key={`w${i}`}
                className={w.back ? 'vg-walk-2' : 'vg-walk-1'}
                style={
                  {
                    position: 'absolute',
                    left: x0 - 200 * SPRITE_SCALE,
                    top: y0 - 300 * SPRITE_SCALE,
                    width: SPRITE_SIZE,
                    height: SPRITE_SIZE,
                    pointerEvents: 'none',
                    '--dx': px(x1 - x0),
                    '--dy': px(y1 - y0),
                    '--z0': String(depthZ(w.from[0] + w.from[1]) + 2),
                    '--z1': String(depthZ(w.to[0] + w.to[1]) + 2),
                    ...timing,
                  } as CSSProperties
                }
              >
                <div
                  className={w.vehicle ? undefined : 'vg-bob'}
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <img
                    src={spriteUrl(w.sprite)}
                    alt=""
                    draggable={false}
                    className={w.back ? 'vg-out' : undefined}
                    style={{ ...img, ...timing }}
                  />
                  {w.back && (
                    <img
                      src={spriteUrl(w.back)}
                      alt=""
                      draggable={false}
                      className="vg-back"
                      style={{ ...img, ...timing }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {LAYOUT.map((c) => {
          const [cx, cy] = toMap(c.u, c.v);
          const h = SPRITE_META[c.id].hit;
          const left = cx - 200 * SPRITE_SCALE;
          const top = cy - 300 * SPRITE_SCALE;
          return (
            <button
              key={`hit-${c.id}`}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => onSelect(c.id)}
              onMouseEnter={() => startHover(c.id)}
              onMouseLeave={endHover}
              style={{
                position: 'absolute',
                left: left + h.x * SPRITE_SCALE,
                top: top + h.y * SPRITE_SCALE,
                width: h.w * SPRITE_SCALE,
                height: h.h * SPRITE_SCALE,
                zIndex: depthZ(c.u + c.v) + 1,
                padding: 0,
                border: 0,
                borderRadius: 12,
                background: 'transparent',
                cursor: 'pointer',
              }}
            />
          );
        })}

        {/* Maisons du chantier : un projet chacune, clic = fiche du projet */}
        {chantier.map((h, i) => {
          const [du, dv] = CHANTIER_SLOTS[i];
          const [cx, cy] = toMap(CHANTIER.u + du, CHANTIER.v + dv);
          return (
            <button
              key={`house-${h.documentId}`}
              type="button"
              className="vg-house"
              aria-label={`Chantier : ${h.name} — ${h.stageLabel}${h.late ? ', en retard' : ''}`}
              onClick={() => onOpenProject?.(h.documentId)}
              onMouseEnter={() => setHoverHouse(i)}
              onMouseLeave={() => setHoverHouse(null)}
              onFocus={() => setHoverHouse(i)}
              onBlur={() => setHoverHouse(null)}
              style={{
                position: 'absolute',
                left: cx - 200 * SPRITE_SCALE + CHANTIER_HIT.x * SPRITE_SCALE,
                top: cy - 300 * SPRITE_SCALE + CHANTIER_HIT.y * SPRITE_SCALE,
                width: CHANTIER_HIT.w * SPRITE_SCALE,
                height: CHANTIER_HIT.h * SPRITE_SCALE,
                zIndex: depthZ(CHANTIER.u + du + CHANTIER.v + dv) + 1,
                padding: 0,
                border: 0,
                borderRadius: 8,
                background: 'transparent',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </div>

      {particles.map((p, i) => (
        <span
          key={`fall-${i}`}
          aria-hidden="true"
          className="vg-fall"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * (ambiance?.season === 'winter' ? 1 : 0.62),
              borderRadius:
                ambiance?.season === 'winter' ? '50%' : '80% 10% 80% 10%',
              background: p.color,
              boxShadow:
                ambiance?.season === 'winter'
                  ? '0 0 3px rgba(255,255,255,0.9)'
                  : 'none',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.rotate + 360}deg`,
              pointerEvents: 'none',
              zIndex: 1700,
            } as CSSProperties
          }
        />
      ))}
      {!!ambiance?.lights &&
        lightSpots.map((spot, i) => {
          const [x, y] = toScreen(spot.x, spot.y);
          const r = spot.r * k;
          return (
            <span
              key={`light-${i}`}
              aria-hidden="true"
              className="vg-follow"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: r * 2,
                height: r * (spot.lamp ? 2 : 1.3),
                translate: `${px(x - r)} ${px(y - r * (spot.lamp ? 1 : 0.65))}`,
                transition:
                  'translate .6s cubic-bezier(.2,.8,.2,1), width .6s, height .6s',
                borderRadius: '50%',
                background: spot.lamp
                  ? 'radial-gradient(closest-side, rgba(255,214,130,0.95), rgba(255,190,90,0.35) 55%, rgba(255,190,90,0))'
                  : 'radial-gradient(closest-side, rgba(255,226,160,0.75), rgba(255,210,130,0.25) 60%, rgba(255,210,130,0))',
                mixBlendMode: 'screen',
                opacity: ambiance.lights * (spot.lamp ? 1 : 0.85),
                pointerEvents: 'none',
                zIndex: 1600,
              }}
            />
          );
        })}

      {labels.map((l, li) => {
        if (l.id === 'chantier') {
          const on = lit('projets');
          return (
            <button
              key="lab-chantier"
              type="button"
              className={`vg-pill${arrival ? ' vg-label-in' : ''}`}
              onClick={() => onSelect('projets')}
              aria-label={`Chantiers : ${chantier.length ? chantier.map((h) => `${h.name} (${h.stageLabel.toLowerCase()})`).join(', ') : 'aucun projet en cours'}`}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                translate: `calc(${px(l.x)} - 50%) calc(${px(l.y)} - 100%)`,
                scale: String(labelScale),
                transformOrigin: '50% 100%',
                zIndex: 2000,
                opacity: on ? 1 : 0.45,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 32,
                boxSizing: 'border-box',
                padding: '0 14px 0 11px',
                borderRadius: 999,
                border: '1px solid rgba(240,138,75,0.45)',
                background: '#fff8ef',
                color: '#111827',
                fontSize: 13.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 8px 20px rgba(40,36,80,0.14)',
                cursor: 'pointer',
                animationDelay: arrival ? '1300ms' : undefined,
              }}
            >
              <span style={{ fontSize: 18, display: 'flex', color: '#e07a2f' }}>
                <MdConstruction />
              </span>
              Chantiers
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${-l.dx}px)`,
                  bottom: -5,
                  width: 10,
                  height: 10,
                  marginLeft: -5,
                  background: '#fff8ef',
                  transform: 'rotate(45deg)',
                  borderRadius: 2,
                }}
              />
            </button>
          );
        }
        const id = l.id as SectionId;
        const s = sections[id];
        const on = lit(id);
        const isSel = selected === id && !district;
        const [ax, ay] = anchors[id];
        const w = pillWidth(s);
        return (
          <div key={`lab-${id}`}>
            {s.alert && (
              <svg
                aria-hidden="true"
                width={18 * labelScale}
                height={24 * labelScale}
                viewBox="0 0 18 24"
                className="vg-follow"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  translate: `${px(l.x - (w * labelScale) / 2 - 16 * labelScale)} ${px(l.y - 26 * labelScale)}`,
                  transition: 'translate .6s cubic-bezier(.2,.8,.2,1)',
                  zIndex: 2001,
                  opacity: on ? 1 : 0.45,
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
            {l.lift > 6 && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: ax - 1,
                  top: l.y,
                  width: 2,
                  height: Math.max(0, ay - l.y + 8),
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 0 0 1px rgba(40,36,80,0.08)',
                  zIndex: 1999,
                  opacity: on ? 1 : 0.45,
                }}
              />
            )}
            <button
              type="button"
              className={`vg-pill${arrival ? ' vg-label-in' : ''}`}
              onClick={() => onSelect(id)}
              onMouseEnter={() => startHover(id, 80)}
              onMouseLeave={endHover}
              onFocus={() => startHover(id, 0)}
              onBlur={endHover}
              aria-pressed={isSel}
              aria-label={s.aria}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                translate: `calc(${px(l.x)} - 50%) calc(${px(l.y)} - 100%)`,
                scale: String(labelScale),
                transformOrigin: '50% 100%',
                zIndex: 2000,
                opacity: on ? 1 : 0.45,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 32,
                boxSizing: 'border-box',
                padding: s.badge ? '0 6px 0 11px' : '0 14px 0 11px',
                borderRadius: 999,
                border: isSel
                  ? '2px solid #6d5dfc'
                  : s.alert
                    ? '2px solid #ef4444'
                    : s.level === 3
                      ? '1.5px solid #f6c445'
                      : '1px solid rgba(17,24,39,0.04)',
                background: '#ffffff',
                color: '#111827',
                fontSize: 13.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 8px 20px rgba(40,36,80,0.14)',
                cursor: 'pointer',
                animationDelay: arrival
                  ? `${arriveDelay(id) + 300 + li * 5}ms`
                  : undefined,
              }}
            >
              <span style={{ fontSize: 18, display: 'flex', color: s.tone }}>
                {s.icon}
              </span>
              {s.level === 3 && (
                <svg
                  aria-hidden="true"
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  style={{ marginLeft: -3, flexShrink: 0 }}
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
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    borderRadius: 999,
                    background: s.tone,
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {s.badge}
                </span>
              )}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${-l.dx}px)`,
                  bottom: -5,
                  width: 10,
                  height: 10,
                  marginLeft: -5,
                  background: '#ffffff',
                  transform: 'rotate(45deg)',
                  borderRadius: 2,
                }}
              />
            </button>
          </div>
        );
      })}

      {previewId &&
        (() => {
          const l = labels.find((x) => x.id === previewId);
          if (!l) return null;
          const s = sections[previewId];
          const W = 248;
          const at = previewPlacement({
            x: l.x,
            y: l.y,
            pillW: pillWidth(s) * labelScale,
            pillH: 32 * labelScale,
            cardW: W,
            cardH: previewH,
            mapW: width,
            mapH: height,
            busyAbove: activity.some((a) => a.id === previewId),
          });
          return (
            <div
              key={`preview-${previewId}`}
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
                padding: '11px 12px 10px',
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: '0 14px 32px rgba(40,36,80,0.22)',
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
                  gap: 7,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                <span style={{ display: 'flex', fontSize: 17, color: s.tone }}>
                  {s.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{s.title}</span>
                {s.badge && (
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      padding: '0 6px',
                      boxSizing: 'border-box',
                      borderRadius: 999,
                      background: s.tone,
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.badge}
                  </span>
                )}
              </span>
              <span
                style={{
                  display: 'block',
                  marginTop: 3,
                  fontSize: 12.5,
                  color: '#6b7280',
                }}
              >
                {s.preview.chip}
              </span>
              {s.alert && (
                <span
                  style={{
                    display: 'block',
                    marginTop: 7,
                    padding: '6px 8px',
                    borderRadius: 9,
                    background: '#fef2f2',
                    color: '#b91c1c',
                    fontSize: 12.5,
                    fontWeight: 700,
                    lineHeight: 1.35,
                  }}
                >
                  {s.alert}
                </span>
              )}
              {s.preview.stats.length > 0 && (
                <span style={{ display: 'block', marginTop: 8 }}>
                  {s.preview.stats.map((st) => (
                    <span
                      key={st.label}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        padding: '3px 0',
                        borderTop: '1px solid #f1eee8',
                        fontSize: 12.5,
                      }}
                    >
                      <span style={{ flex: 1, color: '#6b7280' }}>
                        {st.label}
                      </span>
                      <strong style={{ fontWeight: 800 }}>{st.value}</strong>
                      {st.trend && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color:
                              st.trend.tone === 'good'
                                ? '#15803d'
                                : st.trend.tone === 'bad'
                                  ? '#b91c1c'
                                  : '#4b5563',
                          }}
                        >
                          {st.trend.delta > 0 ? '▲' : '▼'} {st.trend.text}
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              )}
              {s.preview.activity && (
                <span
                  style={{
                    display: 'block',
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: s.level === 3 ? '#a16207' : '#4b5563',
                  }}
                >
                  {s.preview.activity}
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
                Cliquez pour ouvrir la fiche
              </span>
            </div>
          );
        })()}

      {hoverHouse !== null &&
        chantier[hoverHouse] &&
        (() => {
          const h = chantier[hoverHouse];
          const [du, dv] = CHANTIER_SLOTS[hoverHouse];
          const [x, y] = toScreen(
            ...spritePoint(
              CHANTIER.u + du,
              CHANTIER.v + dv,
              205,
              CHANTIER_HIT.y
            )
          );
          return (
            <div
              role="tooltip"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                translate: `calc(${px(x)} - 50%) calc(${px(y - 6)} - 100%)`,
                zIndex: 2120,
                maxWidth: 260,
                padding: '7px 11px',
                borderRadius: 12,
                background: '#111827',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 600,
                lineHeight: 1.35,
                boxShadow: '0 10px 22px rgba(17,24,39,0.28)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <strong style={{ fontWeight: 800 }}>{h.name}</strong>
              <span
                style={{
                  display: 'block',
                  color: h.late ? '#fca5a5' : '#c7d2fe',
                }}
              >
                {h.stageLabel}
                {h.late ? ' · en retard' : ''} · {h.customer}
              </span>
            </div>
          );
        })()}

      {activity.map((a) => {
        const l = labels.find((x) => x.id === a.id);
        if (!l) return null;
        // Au-dessus de l'étiquette, ou dessous quand elle touche le haut de la carte.
        const top = l.y - 32 * labelScale - 10;
        const above = top - 40 > 0;
        return (
          <button
            key={`bubble-${a.key}`}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            title={a.link ? 'Ouvrir' : undefined}
            onClick={() =>
              onOpenActivity ? onOpenActivity(a) : onSelect(a.id)
            }
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              translate: above
                ? `calc(${px(l.x)} - 50%) calc(${px(top)} - 100%)`
                : `calc(${px(l.x)} - 50%) ${px(l.y + 12)}`,
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
                maxWidth: 240,
                padding: '7px 12px 7px 10px',
                borderRadius: 14,
                background: '#111827',
                color: '#ffffff',
                fontSize: 12.5 * Math.max(0.9, labelScale),
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
                  ...(above ? { bottom: -4 } : { top: -4 }),
                  width: 9,
                  height: 9,
                  marginLeft: -4.5,
                  background: '#111827',
                  transform: 'rotate(45deg)',
                  borderRadius: 2,
                }}
              />
            </span>
          </button>
        );
      })}
      <div
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {activity.map((a) => `${a.text} — ${sections[a.id].title}`).join('. ')}
      </div>

      {DISTRICTS.map((d, i) => {
        const on = district === d.id;
        const [x, y] = tagPos[i];
        return (
          <button
            key={`tag-${d.id}`}
            type="button"
            className={`vg-tag${arrival ? ' vg-label-in' : ''}`}
            onClick={() => onSelectDistrict(d.id)}
            aria-pressed={on}
            aria-label={`Quartier ${d.name} — ${d.place}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              translate: `calc(${px(x)} - 50%) calc(${px(y)} - 50%)`,
              scale: String(labelScale),
              zIndex: 1950,
              opacity: !district || on ? 1 : 0.6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 13px 6px 10px',
              borderRadius: 12,
              border: on ? `2px solid ${d.hue}` : `1.5px solid ${d.hue}55`,
              background: on ? d.soft : 'rgba(255,255,255,0.94)',
              boxShadow: '0 6px 16px rgba(40,36,80,0.10)',
              whiteSpace: 'nowrap',
              textAlign: 'left',
              cursor: 'pointer',
              animationDelay: arrival ? '1150ms' : undefined,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: d.hue,
                flexShrink: 0,
              }}
            />
            <span>
              <span
                style={{
                  display: 'block',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: d.ink,
                }}
              >
                QUARTIER
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#111827',
                }}
              >
                {d.name}
              </span>
            </span>
          </button>
        );
      })}

      {children}
    </div>
  );
};

export default VillageMap;
