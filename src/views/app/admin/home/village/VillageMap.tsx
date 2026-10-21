// Carte du village : sol teinté par quartier, bâtiments, décors, promeneurs,
// étiquettes et noms de quartier. Affichage seul — AdminVillage décide de tout.
//
// Le dessin (sol, sprites, promeneurs) vit dans un calque « monde » de
// MAP_W × MAP_H mis à l'échelle (ajustement au conteneur × zoom) ; les
// étiquettes vivent dans un calque écran, à taille fixe, repositionnées à
// chaque zoom et posées sans chevauchement (placeLabels).
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Ambiance, Particle } from './villageAmbiance';
import type { VillageActivity } from './villageActivity';
import { matchesFilter } from './villageModel';
import {
  DECOR,
  DISTRICTS,
  LAYOUT,
  MAP_H,
  MAP_W,
  SPRITE_META,
  SPRITE_SCALE,
  SPRITE_SIZE,
  WALKERS,
  buildGround,
  depthZ,
  districtCenter,
  districtOf,
  districtTagBox,
  labelAnchor,
  labelWidth,
  placeLabels,
  plotPath,
  spriteUrl,
  toMap,
  type Box,
  type DistrictId,
  type SectionId,
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
}

export const ZOOMS = [1, 1.4, 1.85] as const;

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
.vg-pill,.vg-tag{transition:translate .6s cubic-bezier(.2,.8,.2,1),transform .22s cubic-bezier(.3,1.6,.5,1),opacity .3s ease,box-shadow .2s ease}
.vg-pill:hover{transform:translateY(-3px);box-shadow:0 12px 24px rgba(40,36,80,.2) !important}
.vg-tag:hover{transform:translateY(-2px)}
.vg-pill:focus-visible,.vg-tag:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
@media (prefers-reduced-motion: reduce){
  .vg-walk-1,.vg-walk-2,.vg-fall{display:none}
  .vg-bob,.vg-out,.vg-back,.vg-alert-ring,.vg-flag,.vg-ping,.vg-bubble,.vg-live{animation:none}
  .vg-pill,.vg-tag,.vg-world{transition:none !important}
}
`;

const px = (n: number) => `${n.toFixed(1)}px`;

/** Réduit une boîte autour de son point d'ancrage (étiquettes réduites). */
const scaleBox = (b: Box, [x, y]: [number, number], s: number): Box => ({
  x0: x + (b.x0 - x) * s,
  x1: x + (b.x1 - x) * s,
  y0: y + (b.y0 - y) * s,
  y1: y + (b.y1 - y) * s,
});

interface Props {
  width: number;
  sections: Record<SectionId, MapSection>;
  selected: SectionId | null;
  district: DistrictId | null;
  filter: VillageFilter;
  zoom: 0 | 1 | 2;
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
  onSelect,
  onSelectDistrict,
  labelScale = 1,
  ambiance = null,
  particles = [],
  activity = [],
  children,
}: Props) => {
  const ground = useMemo(buildGround, []);
  const fit = width / MAP_W;
  const height = Math.round(MAP_H * fit);
  const k = fit * ZOOMS[zoom];

  // Zoom centré sur le quartier choisi, sinon sur le bâtiment choisi.
  const [fx, fy] = district
    ? districtCenter(district)
    : (() => {
        const cell =
          LAYOUT.find((c) => c.id === selected) ??
          LAYOUT.find((c) => c.id === 'projets')!;
        return toMap(cell.u, cell.v);
      })();
  // Zoom centré sur la cible, sans jamais montrer le bord de la carte.
  let tx = 0;
  let ty = 0;
  if (zoom > 0) {
    tx = Math.min(0, Math.max(width - MAP_W * k, width / 2 - fx * k));
    ty = Math.min(0, Math.max(height - MAP_H * k, height / 2 - (fy - 50) * k));
  }
  const toScreen = (x: number, y: number): [number, number] => [
    x * k + tx,
    y * k + ty,
  ];

  const lit = (id: SectionId) =>
    matchesFilter(sections[id], filter) &&
    (!district || districtOf(id) === district);
  const calm = filter === 'tout' && !district;

  // Bâtiments et décors, du fond vers l'avant.
  const sprites = useMemo(() => {
    const list = [
      ...LAYOUT.map((c) => {
        const [cx, cy] = toMap(c.u, c.v);
        return {
          key: c.id,
          id: c.id as SectionId | null,
          src: spriteUrl(c.id),
          x: cx - 200 * SPRITE_SCALE,
          y: cy - 300 * SPRITE_SCALE,
          z: depthZ(c.u + c.v),
        };
      }),
      ...DECOR.map((d, i) => {
        const [x, y] = toMap(d.u, d.v);
        return {
          key: `d${i}`,
          id: null as SectionId | null,
          src: spriteUrl(d.sprite),
          x: x - 200 * SPRITE_SCALE,
          y: y - 300 * SPRITE_SCALE,
          z: depthZ(d.u + d.v),
        };
      }),
    ];
    return list.sort((a, b) => a.z - b.z);
  }, []);

  // Étiquettes à taille fixe : posées en coordonnées écran, sans chevauchement,
  // en contournant les noms de quartier.
  const tagPos = DISTRICTS.map((d) => toScreen(d.tag[0], d.tag[1]));
  const tagBoxes = DISTRICTS.map((d, i) =>
    scaleBox(
      districtTagBox(d, tagPos[i][0], tagPos[i][1]),
      tagPos[i],
      labelScale
    )
  );
  const labels = placeLabels(
    LAYOUT.map((c) => {
      const [ax, ay] = labelAnchor(c);
      const [x, y] = toScreen(ax, ay);
      const s = sections[c.id];
      return {
        id: c.id,
        x,
        y,
        w: labelWidth(s.title, s.badge) * labelScale,
        h: 32 * labelScale,
        depth: c.u + c.v,
      };
    }),
    tagBoxes
  );
  const anchors = Object.fromEntries(
    LAYOUT.map((c) => [c.id, toScreen(...labelAnchor(c))])
  ) as Record<SectionId, [number, number]>;

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

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
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

        {sprites.map((s) => {
          const on = s.id ? lit(s.id) : calm;
          return (
            <img
              key={s.key}
              src={s.src}
              alt=""
              draggable={false}
              decoding="async"
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                width: SPRITE_SIZE,
                height: SPRITE_SIZE,
                zIndex: s.z,
                opacity: s.id ? (on ? 1 : 0.32) : on ? 1 : 0.55,
                filter:
                  s.id && on && filter !== 'tout'
                    ? 'drop-shadow(0 0 10px rgba(109,93,252,0.45))'
                    : 'none',
                transition: 'opacity .3s ease, filter .3s ease',
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {WALKERS.map((w, i) => {
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
              aria-hidden="true"
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
      </div>

      {!!ambiance?.lights &&
        lightSpots.map((spot, i) => {
          const [x, y] = toScreen(spot.x, spot.y);
          const r = spot.r * k;
          return (
            <span
              key={`light-${i}`}
              aria-hidden="true"
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

      {labels.map((l) => {
        const s = sections[l.id as SectionId];
        const on = lit(l.id as SectionId);
        const isSel = selected === l.id && !district;
        const [ax, ay] = anchors[l.id as SectionId];
        return (
          <div key={`lab-${l.id}`}>
            {s.alert && (
              <svg
                aria-hidden="true"
                width={18 * labelScale}
                height={24 * labelScale}
                viewBox="0 0 18 24"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  translate: `${px(l.x - (labelWidth(s.title, s.badge) * labelScale) / 2 - 16 * labelScale)} ${px(l.y - 26 * labelScale)}`,
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
              className="vg-pill"
              onClick={() => onSelect(l.id as SectionId)}
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
                    : '1px solid rgba(17,24,39,0.04)',
                background: '#ffffff',
                color: '#111827',
                fontSize: 13.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 8px 20px rgba(40,36,80,0.14)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18, display: 'flex', color: s.tone }}>
                {s.icon}
              </span>
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
            onClick={() => onSelect(a.id)}
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
            className="vg-tag"
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
