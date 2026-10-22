// Dessins de la ville PEG (refonte du 22/10/2026) : les six bâtiments, les
// arbres, les bancs, le camion et les passants — tracés en SVG à partir de la
// projection de villageScene (aucune image). Lumière en haut à gauche : la
// face « +v » (bas-gauche) est éclairée, la face « +u » (bas-droite) ombrée.
import type { ReactNode } from 'react';
import {
  BUILDINGS,
  footprint,
  iso,
  pathOf,
  type DistrictId,
} from './villageScene';

type Pt = [number, number];

/** Les trois faces visibles d'un pavé [u0, u1] × [v0, v1] × [z0, z1]. */
const box = (
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number
) => ({
  top: pathOf([
    iso(u0, v0, z1),
    iso(u1, v0, z1),
    iso(u1, v1, z1),
    iso(u0, v1, z1),
  ]),
  lit: pathOf([
    iso(u0, v1, z0),
    iso(u1, v1, z0),
    iso(u1, v1, z1),
    iso(u0, v1, z1),
  ]),
  shade: pathOf([
    iso(u1, v0, z0),
    iso(u1, v1, z0),
    iso(u1, v1, z1),
    iso(u1, v0, z1),
  ]),
});

const Box = ({
  b,
  top,
  lit,
  shade,
}: {
  b: [number, number, number, number, number, number];
  top: string;
  lit: string;
  shade: string;
}) => {
  const f = box(...b);
  return (
    <>
      <path d={f.lit} fill={lit} />
      <path d={f.shade} fill={shade} />
      <path d={f.top} fill={top} />
    </>
  );
};

/** Rectangle sur la face éclairée (+v) : s le long de u (0 → 1), z en pixels. */
const onLit = (
  fp: [number, number, number, number],
  s0: number,
  s1: number,
  z0: number,
  z1: number,
  out = 0
) => {
  const [u0, , u1, v1] = fp;
  const a = u0 + (u1 - u0) * s0;
  const b = u0 + (u1 - u0) * s1;
  const v = v1 + out;
  return pathOf([iso(a, v, z0), iso(b, v, z0), iso(b, v, z1), iso(a, v, z1)]);
};

/** Rectangle sur la face ombrée (+u) : s le long de v (0 = fond, 1 = avant). */
const onShade = (
  fp: [number, number, number, number],
  s0: number,
  s1: number,
  z0: number,
  z1: number,
  out = 0
) => {
  const [, v0, u1, v1] = fp;
  const a = v0 + (v1 - v0) * s0;
  const b = v0 + (v1 - v0) * s1;
  const u = u1 + out;
  return pathOf([iso(u, a, z0), iso(u, b, z0), iso(u, b, z1), iso(u, a, z1)]);
};

/** Rangées de fenêtres sur une face. */
const windows = (
  face: typeof onLit,
  fp: [number, number, number, number],
  cols: number,
  rows: number,
  z0: number,
  z1: number,
  fill: string,
  shine: string,
  margin = 0.12,
  gap = 0.08
) => {
  const out: ReactNode[] = [];
  const w = (1 - 2 * margin - gap * (cols - 1)) / cols;
  const rh = (z1 - z0) / rows;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const s0 = margin + c * (w + gap);
      const zb = z0 + r * rh + rh * 0.18;
      const zt = z0 + (r + 1) * rh - rh * 0.12;
      out.push(
        <path
          key={`w${c}-${r}`}
          d={face(fp, s0, s0 + w, zb, zt)}
          fill={fill}
        />,
        <path
          key={`s${c}-${r}`}
          d={face(fp, s0, s0 + w * 0.45, zb + (zt - zb) * 0.45, zt)}
          fill={shine}
        />
      );
    }
  return out;
};

/** Toit plat : rebord clair, petit volume technique au fond. */
const Roof = ({
  fp,
  h,
  rim,
  cube,
  cubeTop,
  cubeShade,
}: {
  fp: [number, number, number, number];
  h: number;
  rim: string;
  cube: string;
  cubeTop: string;
  cubeShade: string;
}) => {
  const [u0, v0, u1, v1] = fp;
  const inset = 0.025;
  const cu = u0 + (u1 - u0) * 0.42;
  const cv = v0 + (v1 - v0) * 0.42;
  return (
    <>
      <path
        d={pathOf([
          iso(u0 + inset, v0 + inset, h),
          iso(u1 - inset, v0 + inset, h),
          iso(u1 - inset, v1 - inset, h),
          iso(u0 + inset, v1 - inset, h),
        ])}
        fill={rim}
      />
      <Box
        b={[cu - 0.05, cv - 0.05, cu + 0.05, cv + 0.05, h, h + 12]}
        top={cubeTop}
        lit={cube}
        shade={cubeShade}
      />
    </>
  );
};

// ── Les six bâtiments ────────────────────────────────────────────────────────

const Projets = () => {
  const fp = footprint('projets');
  const [u0, v0, u1, v1] = fp;
  const h = BUILDINGS.projets.h;
  return (
    <>
      <Box
        b={[u0, v0, u1, v1, 0, h]}
        top="#f3f0ff"
        lit="#e6e0ff"
        shade="#cfc5fb"
      />
      {windows(onLit, fp, 3, 5, 10, h - 12, '#5868ee', '#93a1ff', 0.1, 0.07)}
      {windows(onShade, fp, 3, 5, 10, h - 12, '#4a58da', '#7d8cf5', 0.1, 0.07)}
      {/* Arête violette sur l'angle avant */}
      <Box
        b={[u1 - 0.035, v1 - 0.035, u1 + 0.008, v1 + 0.008, 0, h + 10]}
        top="#a99fff"
        lit="#7c6cff"
        shade="#6152ec"
      />
      {/* Entrée vitrée */}
      <path d={onLit(fp, 0.38, 0.62, 0, 26)} fill="#3f33c9" />
      <path d={onLit(fp, 0.4, 0.49, 2, 24)} fill="#6b5ff0" />
      <Roof
        fp={fp}
        h={h}
        rim="#e8e2ff"
        cube="#8b7dff"
        cubeTop="#c2b9ff"
        cubeShade="#6d5dfc"
      />
    </>
  );
};

const Clients = () => {
  const fp = footprint('clients');
  const [u0, v0, u1, v1] = fp;
  const h = BUILDINGS.clients.h;
  const awning = (z: number, out: number) => {
    const a = u0 + (u1 - u0) * 0.56;
    const b = u0 + (u1 - u0) * 0.9;
    return pathOf([
      iso(a, v1, z),
      iso(b, v1, z),
      iso(b, v1 + out, z - 7),
      iso(a, v1 + out, z - 7),
    ]);
  };
  return (
    <>
      <Box
        b={[u0, v0, u1, v1, 0, h]}
        top="#f4f8ff"
        lit="#e2ecfd"
        shade="#c8d9f6"
      />
      {windows(onLit, fp, 3, 3, 40, h - 10, '#4f8df5', '#9cc0fb')}
      {windows(onShade, fp, 2, 3, 40, h - 10, '#3e78e2', '#7fa9f2')}
      {/* Rez-de-chaussée : vitrine et porte sous l'auvent bleu */}
      <path d={onLit(fp, 0.1, 0.48, 6, 32)} fill="#9cc0fb" />
      <path d={onLit(fp, 0.6, 0.86, 0, 30)} fill="#2f6fd8" />
      <path d={awning(34, 0.06)} fill="#3b82f6" />
      <path d={onShade(fp, 0.15, 0.8, 8, 30)} fill="#7fa9f2" />
      <Roof
        fp={fp}
        h={h}
        rim="#eaf1fd"
        cube="#7fb0f8"
        cubeTop="#b9d4fc"
        cubeShade="#5d95ef"
      />
    </>
  );
};

const Production = () => {
  const fp = footprint('production');
  const [u0, v0, u1, v1] = fp;
  const h = BUILDINGS.production.h;
  // Porte de garage : lames horizontales
  const slats: ReactNode[] = [];
  for (let z = 8; z < 58; z += 8)
    slats.push(
      <path key={z} d={onLit(fp, 0.1, 0.6, z, z + 1.3)} fill="#8a94a6" />
    );
  // Cartons empilés le long de la face ombrée
  const crates: [number, number, number, number][] = [
    [u1 + 0.03, v1 - 0.14, 0, 16],
    [u1 + 0.03, v1 - 0.06, 0, 16],
    [u1 + 0.035, v1 - 0.12, 16, 30],
  ];
  return (
    <>
      <Box
        b={[u0, v0, u1, v1, 0, h]}
        top="#f6f4f1"
        lit="#f8a165"
        shade="#eceef3"
      />
      {/* Bande blanche en haut de la façade orange */}
      <path d={onLit(fp, 0, 1, h - 16, h)} fill="#ffe2cc" />
      <path d={onLit(fp, 0.1, 0.6, 0, 58)} fill="#a8b1c0" />
      {slats}
      <path d={onLit(fp, 0.7, 0.9, 30, 58)} fill="#5b8def" />
      <path d={onLit(fp, 0.7, 0.78, 44, 58)} fill="#9cc0fb" />
      {windows(onShade, fp, 2, 1, 30, h - 22, '#5b8def', '#9cc0fb', 0.16, 0.14)}
      <path d={onShade(fp, 0.62, 0.84, 0, 26)} fill="#c5cad5" />
      {crates.map(([u, v, z0, z1], i) => (
        <Box
          key={i}
          b={[u, v, u + 0.07, v + 0.07, z0, z1]}
          top="#ecc391"
          lit="#dca46a"
          shade="#c88d52"
        />
      ))}
      <Roof
        fp={fp}
        h={h}
        rim="#efece8"
        cube="#f8a165"
        cubeTop="#fcc79f"
        cubeShade="#e88a48"
      />
    </>
  );
};

const Boutique = () => {
  const fp = footprint('boutique');
  const [u0, , u1, v1] = fp;
  const h = BUILDINGS.boutique.h;
  // Store rayé rouge et blanc au-dessus des vitrines
  const stripes: ReactNode[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = u0 + ((u1 - u0) * i) / n;
    const b = u0 + ((u1 - u0) * (i + 1)) / n;
    stripes.push(
      <path
        key={i}
        d={pathOf([
          iso(a, v1, 46),
          iso(b, v1, 46),
          iso(b, v1 + 0.07, 36),
          iso(a, v1 + 0.07, 36),
        ])}
        fill={i % 2 ? '#ffffff' : '#f43f6b'}
      />
    );
  }
  const valance: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    valance.push(iso(u, v1 + 0.07, 36));
  }
  return (
    <>
      <Box
        b={[u0, fp[1], u1, v1, 0, h]}
        top="#fff1f5"
        lit="#fde0ea"
        shade="#f6c2d4"
      />
      {windows(onLit, fp, 3, 1, 58, h - 8, '#f592b5', '#fbc3d7', 0.12, 0.1)}
      {windows(onShade, fp, 2, 1, 58, h - 8, '#e97aa1', '#f6aac5', 0.16, 0.12)}
      <path d={onLit(fp, 0.08, 0.42, 4, 34)} fill="#ffd6e4" />
      <path d={onLit(fp, 0.1, 0.24, 18, 32)} fill="#ffffff" opacity={0.7} />
      <path d={onLit(fp, 0.58, 0.92, 4, 34)} fill="#ffd6e4" />
      <path d={onLit(fp, 0.44, 0.56, 0, 32)} fill="#e8467a" />
      {stripes}
      <path
        d={`M${valance.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}`}
        stroke="#d92f5a"
        strokeWidth={1.4}
        fill="none"
      />
      <path d={onShade(fp, 0.18, 0.82, 6, 34)} fill="#f8b6cc" />
      <Roof
        fp={fp}
        h={h}
        rim="#ffe9f0"
        cube="#f9a8c3"
        cubeTop="#fcd0df"
        cubeShade="#ef86ab"
      />
    </>
  );
};

const Finance = () => {
  const fp = footprint('finance');
  const [u0, v0, u1, v1] = fp;
  const h = BUILDINGS.finance.h;
  const pillars: ReactNode[] = [];
  for (const s of [0.16, 0.36, 0.56, 0.76])
    pillars.push(
      <path
        key={s}
        d={onLit(fp, s, s + 0.07, 0, h - 18, 0.012)}
        fill="#ffffff"
      />,
      <path
        key={`${s}o`}
        d={onLit(fp, s + 0.05, s + 0.07, 0, h - 18, 0.012)}
        fill="#d7ebe6"
      />
    );
  return (
    <>
      <Box
        b={[u0, v0, u1, v1, 0, h]}
        top="#f0fbf8"
        lit="#d8f2eb"
        shade="#bde6db"
      />
      {windows(onLit, fp, 4, 2, 12, h - 24, '#43c6b3', '#8fe0d3', 0.1, 0.11)}
      {windows(onShade, fp, 2, 2, 12, h - 24, '#2fb3a1', '#7ad6c8', 0.16, 0.12)}
      {pillars}
      {/* Fronton turquoise */}
      <path d={onLit(fp, 0, 1, h - 18, h - 4)} fill="#14b8a6" />
      <path d={onShade(fp, 0, 1, h - 18, h - 4)} fill="#0f9e8f" />
      {/* Marches */}
      <Box
        b={[u0 + 0.08, v1, u1 - 0.08, v1 + 0.05, 0, 4]}
        top="#ffffff"
        lit="#e6efed"
        shade="#d4e3df"
      />
      <Roof
        fp={fp}
        h={h}
        rim="#e8f7f3"
        cube="#2dd4bf"
        cubeTop="#99f0e3"
        cubeShade="#14b8a6"
      />
    </>
  );
};

const Assistance = () => {
  const fp = footprint('assistance');
  const [u0, v0, u1, v1] = fp;
  const h = BUILDINGS.assistance.h;
  const [ax, ay] = iso(u0 + (u1 - u0) * 0.7, v0 + (v1 - v0) * 0.3, h);
  return (
    <>
      <Box
        b={[u0, v0, u1, v1, 0, h]}
        top="#f4f3ff"
        lit="#e4e2fd"
        shade="#ccc8f7"
      />
      {windows(onLit, fp, 3, 3, 36, h - 10, '#767cf2', '#a9adf8')}
      {windows(onShade, fp, 2, 3, 36, h - 10, '#646ae6', '#9599f2')}
      <path d={onLit(fp, 0.12, 0.5, 6, 28)} fill="#a9adf8" />
      <path d={onLit(fp, 0.62, 0.84, 0, 28)} fill="#5b5fe0" />
      <path d={onShade(fp, 0.2, 0.8, 8, 28)} fill="#9599f2" />
      <Roof
        fp={fp}
        h={h}
        rim="#ecebff"
        cube="#a5a8f8"
        cubeTop="#cfd1fb"
        cubeShade="#8a8ef2"
      />
      {/* Antenne : le support est joignable */}
      <path
        d={`M${ax} ${ay} L${ax} ${ay - 30}`}
        stroke="#8a8ef2"
        strokeWidth={2}
      />
      <circle cx={ax} cy={ay - 32} r={4} fill="#6366f1" />
      <circle
        cx={ax}
        cy={ay - 32}
        r={8}
        fill="none"
        stroke="#6366f1"
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />
    </>
  );
};

const ART: Record<DistrictId, () => JSX.Element> = {
  projets: Projets,
  clients: Clients,
  production: Production,
  boutique: Boutique,
  finance: Finance,
  assistance: Assistance,
};

export const BuildingArt = ({ id }: { id: DistrictId }) => {
  const Art = ART[id];
  return <Art />;
};

// ── Décors ───────────────────────────────────────────────────────────────────

/** Arbre rond, deux tons de vert, ombre au sol. */
export const TreeArt = ({ u, v, s }: { u: number; v: number; s: number }) => {
  const [x, y] = iso(u, v, 5);
  return (
    <g>
      <ellipse
        cx={x + 3 * s}
        cy={y + 2}
        rx={15 * s}
        ry={7 * s}
        fill="rgba(40,60,50,0.13)"
      />
      <rect
        x={x - 1.8 * s}
        y={y - 18 * s}
        width={3.6 * s}
        height={18 * s}
        rx={1.2}
        fill="#9b7d5d"
      />
      <circle cx={x} cy={y - 28 * s} r={15 * s} fill="#79c374" />
      <circle cx={x - 4.5 * s} cy={y - 32.5 * s} r={8.5 * s} fill="#9bd890" />
      <circle
        cx={x + 6 * s}
        cy={y - 24 * s}
        r={6 * s}
        fill="#68b463"
        opacity={0.6}
      />
    </g>
  );
};

/** Banc en bois. */
export const BenchArt = ({
  u,
  v,
  along,
}: {
  u: number;
  v: number;
  along: 'u' | 'v';
}) => {
  const l = 0.07;
  const t = 0.022;
  const [u0, u1, v0, v1] =
    along === 'u' ? [u - l, u + l, v - t, v + t] : [u - t, u + t, v - l, v + l];
  const seat = box(u0, v0, u1, v1, 6, 9);
  const back =
    along === 'u'
      ? box(u0, v0 - 0.012, u1, v0, 9, 17)
      : box(u0 - 0.012, v0, u0, v1, 9, 17);
  return (
    <g>
      <path d={seat.lit} fill="#b98656" />
      <path d={seat.shade} fill="#a2723f" />
      <path d={seat.top} fill="#d4a372" />
      <path d={back.lit} fill="#b98656" />
      <path d={back.shade} fill="#a2723f" />
      <path d={back.top} fill="#d4a372" />
    </g>
  );
};

/** Camion de livraison vu de trois quarts, qui roule vers le bas-droite. */
export const TruckArt = () => {
  // Projection locale (même angle que la carte, à l'échelle du camion).
  const P = (u: number, v: number, z: number): Pt => [
    30 + (u - v) * 30,
    22 + (u + v) * 17.3 - z,
  ];
  const face = (pts: [number, number, number][]) =>
    pathOf(pts.map(([u, v, z]) => P(u, v, z)));
  const cube = (
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    z0: number,
    z1: number
  ) => ({
    top: face([
      [u0, v0, z1],
      [u1, v0, z1],
      [u1, v1, z1],
      [u0, v1, z1],
    ]),
    lit: face([
      [u0, v1, z0],
      [u1, v1, z0],
      [u1, v1, z1],
      [u0, v1, z1],
    ]),
    shade: face([
      [u1, v0, z0],
      [u1, v1, z0],
      [u1, v1, z1],
      [u1, v0, z1],
    ]),
  });
  const body = cube(-0.55, -0.22, 0.18, 0.22, 4, 24);
  const cab = cube(0.18, -0.22, 0.5, 0.22, 4, 17);
  const wheel = (u: number, v: number) => {
    const [x, y] = P(u, v, 3);
    return (
      <ellipse
        key={`${u}${v}`}
        cx={x}
        cy={y}
        rx={3.2}
        ry={2.6}
        fill="#2b2f3a"
      />
    );
  };
  return (
    <svg width={60} height={44} viewBox="0 0 60 44" aria-hidden="true">
      <ellipse cx={31} cy={33} rx={22} ry={7} fill="rgba(30,30,60,0.14)" />
      {wheel(-0.4, 0.22)}
      {wheel(0.32, 0.22)}
      <path d={body.lit} fill="#ffffff" />
      <path d={body.shade} fill="#e6e8f0" />
      <path d={body.top} fill="#f7f8fc" />
      <path
        d={face([
          [-0.45, 0.22, 10],
          [0.08, 0.22, 10],
          [0.08, 0.22, 20],
          [-0.45, 0.22, 20],
        ])}
        fill="#8b7dff"
      />
      <path d={cab.lit} fill="#7c6cff" />
      <path d={cab.shade} fill="#6152ec" />
      <path d={cab.top} fill="#a99fff" />
      <path
        d={face([
          [0.5, -0.16, 9],
          [0.5, 0.16, 9],
          [0.5, 0.16, 15],
          [0.5, -0.16, 15],
        ])}
        fill="#c7d7fb"
      />
      {wheel(0.3, -0.22)}
    </svg>
  );
};

/** Passant (vu de face), tee-shirt de la couleur donnée. */
export const WalkerArt = ({ shirt }: { shirt: string }) => (
  <svg width={12} height={22} viewBox="0 0 12 22" aria-hidden="true">
    <ellipse cx={6} cy={20.5} rx={4.5} ry={1.5} fill="rgba(30,30,60,0.15)" />
    <rect x={3.2} y={13} width={2.2} height={7} rx={1} fill="#2b2f3a" />
    <rect x={6.6} y={13} width={2.2} height={7} rx={1} fill="#2b2f3a" />
    <rect x={2.5} y={6.5} width={7} height={8} rx={2.5} fill={shirt} />
    <circle cx={6} cy={4} r={3} fill="#f1c7a6" />
  </svg>
);
