// Dessins de la ville PEG : un bâtiment par onglet du menu (vingt), les
// arbres, les bancs, la fontaine, le camion et les passants — tracés en SVG à
// partir de la projection de villageScene (aucune image). Chaque bâtiment
// porte la couleur de son quartier et ressemble à son onglet (la grue des
// Projets, le calendrier géant, la tête de robot de l'IA…). Lumière en haut
// à gauche : la face « +v » (bas-gauche) est éclairée, la face « +u »
// (bas-droite) ombrée. Les pièces qui tournent (classe `vg-spin`) ne bougent
// que sur la carte, animations allumées.
import type { ReactNode } from 'react';
import {
  A,
  BUILDINGS,
  FOUNTAIN,
  districtOf,
  footprint,
  iso,
  pathOf,
  type DistrictId,
  type SectionId,
} from './villageScene';

type Pt = [number, number];
type FP = [number, number, number, number];

const f1 = (n: number) => n.toFixed(1);

// ── Couleurs des quartiers ──────────────────────────────────────────────────

interface Palette {
  top: string;
  lit: string;
  shade: string;
  win: string;
  shine: string;
  winS: string;
  shineS: string;
  rim: string;
  accent: string;
  accentD: string;
  accentL: string;
  /** Petit volume technique du toit : face éclairée, dessus, face ombrée. */
  cube: [string, string, string];
}

const PAL: Record<DistrictId, Palette> = {
  projets: {
    top: '#f3f0ff',
    lit: '#e6e0ff',
    shade: '#cfc5fb',
    win: '#5868ee',
    shine: '#93a1ff',
    winS: '#4a58da',
    shineS: '#7d8cf5',
    rim: '#e8e2ff',
    accent: '#7c6cff',
    accentD: '#6152ec',
    accentL: '#a99fff',
    cube: ['#8b7dff', '#c2b9ff', '#6d5dfc'],
  },
  clients: {
    top: '#f4f8ff',
    lit: '#e2ecfd',
    shade: '#c8d9f6',
    win: '#4f8df5',
    shine: '#9cc0fb',
    winS: '#3e78e2',
    shineS: '#7fa9f2',
    rim: '#eaf1fd',
    accent: '#3b82f6',
    accentD: '#2563eb',
    accentL: '#93c5fd',
    cube: ['#7fb0f8', '#b9d4fc', '#5d95ef'],
  },
  production: {
    top: '#f6f4f1',
    lit: '#fde7d6',
    shade: '#f4cfb3',
    win: '#f08a4b',
    shine: '#fbbf94',
    winS: '#e2773a',
    shineS: '#f6a877',
    rim: '#f3ede7',
    accent: '#f97316',
    accentD: '#ea580c',
    accentL: '#fdba74',
    cube: ['#f8a165', '#fcc79f', '#e88a48'],
  },
  boutique: {
    top: '#fff1f5',
    lit: '#fde0ea',
    shade: '#f6c2d4',
    win: '#f592b5',
    shine: '#fbc3d7',
    winS: '#e97aa1',
    shineS: '#f6aac5',
    rim: '#ffe9f0',
    accent: '#ec4899',
    accentD: '#db2777',
    accentL: '#f9a8d4',
    cube: ['#f9a8c3', '#fcd0df', '#ef86ab'],
  },
  finance: {
    top: '#f0fbf8',
    lit: '#d8f2eb',
    shade: '#bde6db',
    win: '#43c6b3',
    shine: '#8fe0d3',
    winS: '#2fb3a1',
    shineS: '#7ad6c8',
    rim: '#e8f7f3',
    accent: '#14b8a6',
    accentD: '#0f9e8f',
    accentL: '#5eead4',
    cube: ['#2dd4bf', '#99f0e3', '#14b8a6'],
  },
  assistance: {
    top: '#f4f3ff',
    lit: '#e4e2fd',
    shade: '#ccc8f7',
    win: '#767cf2',
    shine: '#a9adf8',
    winS: '#646ae6',
    shineS: '#9599f2',
    rim: '#ecebff',
    accent: '#6366f1',
    accentD: '#4f46e5',
    accentL: '#a5b4fc',
    cube: ['#a5a8f8', '#cfd1fb', '#8a8ef2'],
  },
};

// ── Volumes et façades ──────────────────────────────────────────────────────

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
  fp: FP,
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
  fp: FP,
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
  fp: FP,
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
      const zt = z0 + (r + 1) * rh - rh * 0.14;
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

/**
 * Pose un dessin plat (en pixels, y vers le bas) sur une façade, à partir du
 * point (s le long de la façade, hauteur z) : la façade éclairée file vers
 * le bas-droite, la façade ombrée (vue de l'avant vers le fond) vers le
 * haut-droite. Une unité au sol vaut A / cos 30° px le long d'une façade.
 */
const plane = (fp: FP, face: 'lit' | 'shade', s: number, z: number) => {
  const [u0, v0, u1, v1] = fp;
  const [x, y] =
    face === 'lit'
      ? iso(u0 + (u1 - u0) * s, v1, z)
      : iso(u1, v1 - (v1 - v0) * s, z);
  return `matrix(0.866 ${face === 'lit' ? 0.5 : -0.5} 0 1 ${f1(x)} ${f1(y)})`;
};

/** Longueur d'une façade en pixels « façade ». */
const litLen = (fp: FP) => ((fp[2] - fp[0]) * A) / 0.866;

/** Toit plat : rebord clair et, au besoin, un petit volume technique. */
const Roof = ({
  fp,
  h,
  p,
  cube = true,
}: {
  fp: FP;
  h: number;
  p: Palette;
  cube?: boolean;
}) => {
  const [u0, v0, u1, v1] = fp;
  const inset = 0.022;
  const cu = u0 + (u1 - u0) * 0.4;
  const cv = v0 + (v1 - v0) * 0.4;
  return (
    <>
      <path
        d={pathOf([
          iso(u0 + inset, v0 + inset, h),
          iso(u1 - inset, v0 + inset, h),
          iso(u1 - inset, v1 - inset, h),
          iso(u0 + inset, v1 - inset, h),
        ])}
        fill={p.rim}
      />
      {cube && (
        <Box
          b={[cu - 0.045, cv - 0.045, cu + 0.045, cv + 0.045, h, h + 10]}
          lit={p.cube[0]}
          top={p.cube[1]}
          shade={p.cube[2]}
        />
      )}
    </>
  );
};

/** Corps d'immeuble : volume, fenêtres sur deux faces, porte, toit. */
const Body = ({
  fp,
  h,
  p,
  cols = [3, 2],
  from = 26,
  door = true,
  roof = true,
  cube = true,
}: {
  fp: FP;
  h: number;
  p: Palette;
  cols?: [number, number];
  from?: number;
  door?: boolean;
  roof?: boolean;
  cube?: boolean;
}) => {
  const rows = Math.max(1, Math.round((h - from - 8) / 21));
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      {windows(onLit, fp, cols[0], rows, from, h - 8, p.win, p.shine)}
      {windows(onShade, fp, cols[1], rows, from, h - 8, p.winS, p.shineS)}
      {door && (
        <>
          <path d={onLit(fp, 0.4, 0.62, 0, 21)} fill={p.accentD} />
          <path d={onLit(fp, 0.42, 0.5, 2, 19)} fill={p.accentL} />
          <path d={onShade(fp, 0.18, 0.78, 6, 20)} fill={p.shineS} />
        </>
      )}
      {roof && <Roof fp={fp} h={h} p={p} cube={cube} />}
    </>
  );
};

/** Centre du toit (point de la carte) et un point du toit (s, t ∈ 0..1). */
const roofPoint = (fp: FP, h: number, s = 0.5, t = 0.5): Pt => {
  const [u0, v0, u1, v1] = fp;
  return iso(u0 + (u1 - u0) * s, v0 + (v1 - v0) * t, h);
};

/** Mât vertical (antenne, poteau de panneau). */
const Mast = ({
  at,
  len,
  color,
  width = 2,
}: {
  at: Pt;
  len: number;
  color: string;
  width?: number;
}) => (
  <path
    d={`M${f1(at[0])} ${f1(at[1])} L${f1(at[0])} ${f1(at[1] - len)}`}
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
  />
);

/** Roue dentée (centre, rayon). */
const gearPath = (cx: number, cy: number, r: number, teeth = 8) => {
  const pts: string[] = [];
  for (let k = 0; k < teeth * 2; k++) {
    const a0 = (k * Math.PI) / teeth - Math.PI / (teeth * 2.4);
    const a1 = (k * Math.PI) / teeth + Math.PI / (teeth * 2.4);
    const rr = k % 2 ? r * 0.78 : r;
    pts.push(
      `${f1(cx + rr * Math.cos(a0))} ${f1(cy + rr * Math.sin(a0))}`,
      `${f1(cx + rr * Math.cos(a1))} ${f1(cy + rr * Math.sin(a1))}`
    );
  }
  return `M${pts.join(' L')} Z`;
};

// ── Les vingt bâtiments ─────────────────────────────────────────────────────
//
// Chaque bâtiment ressemble à son onglet, pour le reconnaître d'un coup
// d'œil sans lire son nom : la tour en chantier des Projets, le calendrier
// géant, la banque à fronton, la tête de robot de l'IA… Son signe reprend
// l'icône du menu (éclair des Leads, couronne du Premium, mégaphone…).

interface ArtProps {
  fp: FP;
  h: number;
  p: Palette;
}

/** Point de la carte en coordonnées de chemin SVG. */
const xy = (q: Pt) => `${f1(q[0])} ${f1(q[1])}`;

/** Segment entre deux points de la carte. */
const seg = (a: Pt, b: Pt) => `M${xy(a)} L${xy(b)}`;

/** Jaune de chantier (grue). */
const YELLOW = { top: '#fde68a', lit: '#fbbf24', shade: '#d97706' };

/** Étincelle à quatre branches. */
const star = (cx: number, cy: number, r: number) =>
  `M${f1(cx)} ${f1(cy - r)} Q${f1(cx)} ${f1(cy)} ${f1(cx + r)} ${f1(cy)} Q${f1(cx)} ${f1(cy)} ${f1(cx)} ${f1(cy + r)} Q${f1(cx)} ${f1(cy)} ${f1(cx - r)} ${f1(cy)} Q${f1(cx)} ${f1(cy)} ${f1(cx)} ${f1(cy - r)} Z`;

/** Projets : la tour en chantier — une grue jaune sur le toit hisse une caisse. */
const Projets = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const mu = u0 + (u1 - u0) * 0.24;
  const mv = (v0 + v1) / 2;
  const zj = h + 34;
  const tail = mu - 0.2;
  const tip = mu + 0.74;
  const hook = mu + 0.58;
  const k = 0.02;
  const m = 0.026;
  const truss: Pt[] = [];
  for (let i = 0, u = mu + m; u <= tip; i++, u += 0.055)
    truss.push(iso(u, mv + k, i % 2 ? zj - 3 : zj + 1));
  const load: FP = [hook - 0.05, mv - 0.05, hook + 0.05, mv + 0.05];
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      {windows(onLit, fp, 3, 6, 10, h - 10, p.win, p.shine, 0.1, 0.07)}
      {windows(onShade, fp, 3, 6, 10, h - 10, p.winS, p.shineS, 0.1, 0.07)}
      <Box
        b={[u1 - 0.03, v1 - 0.03, u1 + 0.008, v1 + 0.008, 0, h + 6]}
        top={p.accentL}
        lit={p.accent}
        shade={p.accentD}
      />
      <path d={onLit(fp, 0.38, 0.62, 0, 22)} fill="#3f33c9" />
      <path d={onLit(fp, 0.4, 0.49, 2, 20)} fill="#6b5ff0" />
      <Roof fp={fp} h={h} p={p} cube={false} />
      {/* Contrepoids et contre-flèche, derrière le mât */}
      <Box
        b={[tail, mv - 0.035, tail + 0.075, mv + 0.035, zj - 10, zj + 1]}
        top="#cbd5e1"
        lit="#94a3b8"
        shade="#64748b"
      />
      <Box
        b={[tail + 0.07, mv - k, mu - m, mv + k, zj - 3, zj + 1]}
        {...YELLOW}
      />
      {/* Mât, cabine, flèche */}
      <Box b={[mu - m, mv - m, mu + m, mv + m, h, zj + 12]} {...YELLOW} />
      <Box
        b={[mu + m, mv - 0.03, mu + 0.085, mv + 0.03, zj - 12, zj - 3]}
        top="#f8fafc"
        lit="#e2e8f0"
        shade="#cbd5e1"
      />
      <path
        d={onLit(
          [mu + m, mv - 0.03, mu + 0.085, mv + 0.03],
          0.18,
          0.82,
          zj - 10,
          zj - 5.5
        )}
        fill="#60a5fa"
      />
      <Box b={[mu + m, mv - k, tip, mv + k, zj - 3, zj + 1]} {...YELLOW} />
      <path
        d={`M${truss.map(xy).join(' L')}`}
        stroke="#b45309"
        strokeWidth={0.8}
        fill="none"
      />
      <path
        d={`${seg(iso(mu, mv, zj + 12), iso(tip - 0.22, mv, zj + 1))} ${seg(iso(mu, mv, zj + 12), iso(tail + 0.03, mv, zj + 1))}`}
        stroke="#b45309"
        strokeWidth={0.9}
      />
      {/* Chariot, câble, crochet et la caisse hissée */}
      <Box
        b={[hook - 0.028, mv - 0.024, hook + 0.028, mv + 0.024, zj - 6, zj - 3]}
        top="#64748b"
        lit="#475569"
        shade="#334155"
      />
      <path
        d={seg(iso(hook, mv, zj - 6), iso(hook, mv, h + 17))}
        stroke="#475569"
        strokeWidth={0.9}
      />
      <path
        d={`M${xy(iso(hook, mv, h + 17))} q-2.4 0 -2.4 -2.2`}
        stroke="#334155"
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
      />
      <Box
        b={[...load, h + 4, h + 15]}
        top="#c2b9ff"
        lit="#8b7dff"
        shade="#6d5dfc"
      />
      <path d={onLit(load, 0.4, 0.6, h + 4, h + 15)} fill="#ede9fe" />
      <path
        d={pathOf([
          iso(load[0] + 0.04, load[1], h + 15),
          iso(load[0] + 0.06, load[1], h + 15),
          iso(load[0] + 0.06, load[3], h + 15),
          iso(load[0] + 0.04, load[3], h + 15),
        ])}
        fill="#ede9fe"
      />
    </>
  );
};

/** Accueil : la maison — toit pointu, cheminée, jardinières et clôture blanche. */
const Accueil = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const vc = (v0 + v1) / 2;
  const r = 30;
  const o = 0.03;
  const fence: ReactNode[] = [];
  for (let s = -0.04; s <= 1.02; s += 0.075) {
    if (s > 0.33 && s < 0.62) continue;
    fence.push(
      <path key={s} d={onLit(fp, s, s + 0.03, 0, 9, 0.09)} fill="#ffffff" />
    );
  }
  const flowers: ReactNode[] = [];
  for (const [s, c] of [
    [0.14, '#f472b6'],
    [0.21, '#fbbf24'],
    [0.27, '#f472b6'],
    [0.74, '#fbbf24'],
    [0.8, '#f472b6'],
    [0.86, '#fbbf24'],
  ] as const) {
    const [x, y] = iso(u0 + (u1 - u0) * s, v1 + 0.02, 22.5);
    flowers.push(<circle key={s} cx={x} cy={y} r={1.5} fill={c} />);
  }
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit="#f5f2ff" shade="#e2dcfb" />
      {windows(onLit, fp, 2, 1, 22, h - 8, p.win, p.shine, 0.12, 0.42)}
      <path d={onLit(fp, 0.11, 0.3, 18, 21, 0.018)} fill="#65a30d" />
      <path d={onLit(fp, 0.7, 0.89, 18, 21, 0.018)} fill="#65a30d" />
      {flowers}
      <path d={onLit(fp, 0.42, 0.58, 0, 26)} fill={p.accentD} />
      <circle
        cx={iso(u0 + (u1 - u0) * 0.5, v1, 34)[0]}
        cy={iso(u0 + (u1 - u0) * 0.5, v1, 34)[1]}
        r={2.6}
        fill="#fcd34d"
      />
      {windows(onShade, fp, 1, 1, 22, h - 8, p.winS, p.shineS, 0.3, 0)}
      {/* Pan arrière, pignon, pan avant */}
      <path
        d={pathOf([
          iso(u0 - o, v0 - o, h - 2),
          iso(u1 + o, v0 - o, h - 2),
          iso(u1 + o, vc, h + r),
          iso(u0 - o, vc, h + r),
        ])}
        fill={p.accentD}
      />
      <path
        d={pathOf([iso(u1, v0, h), iso(u1, v1, h), iso(u1, vc, h + r)])}
        fill="#e2dcfb"
      />
      <circle
        cx={iso(u1, vc, h + r * 0.42)[0]}
        cy={iso(u1, vc, h + r * 0.42)[1]}
        r={3.6}
        fill={p.winS}
      />
      <path
        d={pathOf([
          iso(u0 - o, v1 + o, h - 2),
          iso(u1 + o, v1 + o, h - 2),
          iso(u1 + o, vc, h + r),
          iso(u0 - o, vc, h + r),
        ])}
        fill={p.accent}
      />
      <path
        d={seg(iso(u0 - o, vc, h + r), iso(u1 + o, vc, h + r))}
        stroke={p.accentL}
        strokeWidth={1.6}
      />
      {/* Cheminée */}
      <Box
        b={[
          u0 + (u1 - u0) * 0.22,
          vc - 0.08,
          u0 + (u1 - u0) * 0.22 + 0.06,
          vc - 0.02,
          h + 8,
          h + r + 4,
        ]}
        top="#c2b9ff"
        lit="#8b7dff"
        shade="#6d5dfc"
      />
      {/* Clôture blanche, ouverte devant la porte */}
      <path d={onLit(fp, -0.04, 0.36, 4.5, 6.3, 0.09)} fill="#ffffff" />
      <path d={onLit(fp, 0.62, 1.04, 4.5, 6.3, 0.09)} fill="#ffffff" />
      {fence}
    </>
  );
};

/** Calendrier : un calendrier géant — pages blanches, en-tête rouge, anneaux, grille des jours. */
const Calendrier = ({ fp, h }: ArtProps) => {
  const [u0, , u1, v1] = fp;
  const band = 17;
  const cells: ReactNode[] = [];
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 3; r++) {
      const s0 = 0.1 + c * 0.205;
      const z0 = h - band - 10 - r * 10.5;
      cells.push(
        <path
          key={`l${c}${r}`}
          d={onLit(fp, s0, s0 + 0.15, z0, z0 + 7)}
          fill={c === 2 && r === 1 ? '#ef4444' : '#e7e3f7'}
        />
      );
    }
  for (let c = 0; c < 3; c++)
    for (let r = 0; r < 3; r++) {
      const s0 = 0.12 + c * 0.27;
      const z0 = h - band - 10 - r * 10.5;
      cells.push(
        <path
          key={`s${c}${r}`}
          d={onShade(fp, s0, s0 + 0.2, z0, z0 + 7)}
          fill="#d6d1ee"
        />
      );
    }
  const ring = (s: number) => {
    const u = u0 + (u1 - u0) * s;
    const a = iso(u, v1, h - 8);
    const b = iso(u, v1 - 0.05, h + 6);
    return (
      <g key={s}>
        <ellipse cx={a[0]} cy={a[1]} rx={2.2} ry={1.4} fill="#7f1d1d" />
        <path
          d={`M${xy(a)} Q${f1(a[0] - 3)} ${f1(b[1] - 2)} ${xy(b)}`}
          stroke="#475569"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${xy(a)} Q${f1(a[0] - 3)} ${f1(b[1] - 2)} ${xy(b)}`}
          stroke="#cbd5e1"
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  };
  return (
    <>
      <Box b={[...fp, 0, h]} top="#ffffff" lit="#ffffff" shade="#e9e6f8" />
      {/* Tranche des pages */}
      {[3, 6, 9].map((z) => (
        <g key={z}>
          <path d={onLit(fp, 0, 1, z, z + 0.8)} fill="#dcd7f1" />
          <path d={onShade(fp, 0, 1, z, z + 0.8)} fill="#cdc6ea" />
        </g>
      ))}
      {cells}
      <path d={onLit(fp, 0, 1, h - band, h)} fill="#ef4444" />
      <path d={onShade(fp, 0, 1, h - band, h)} fill="#c81e1e" />
      <path
        d={onLit(fp, 0.3, 0.7, h - band + 5, h - band + 8.5)}
        fill="#ffffff"
        opacity={0.85}
      />
      {ring(0.25)}
      {ring(0.75)}
    </>
  );
};

/** Clients : la tour des clients, deux grandes silhouettes sur le toit (l'icône du menu). */
const Clients = ({ fp, h, p }: ArtProps) => {
  const [u0, , u1, v1] = fp;
  const a = u0 + (u1 - u0) * 0.56;
  const b = u0 + (u1 - u0) * 0.9;
  const [x, y] = roofPoint(fp, h);
  return (
    <>
      <Body
        fp={fp}
        h={h}
        p={p}
        cols={[3, 2]}
        from={34}
        door={false}
        cube={false}
      />
      <path d={onLit(fp, 0.1, 0.46, 6, 28)} fill={p.shine} />
      <path d={onLit(fp, 0.6, 0.86, 0, 26)} fill={p.accentD} />
      <path
        d={pathOf([
          iso(a, v1, 30),
          iso(b, v1, 30),
          iso(b, v1 + 0.06, 24),
          iso(a, v1 + 0.06, 24),
        ])}
        fill={p.accent}
      />
      <path d={onShade(fp, 0.15, 0.8, 8, 26)} fill={p.shineS} />
      {/* Les deux silhouettes : celle du fond, puis celle de devant */}
      <g
        transform={`translate(${f1(x)} ${f1(y)}) scale(1.3) translate(${f1(-x)} ${f1(-y)})`}
      >
        <circle
          cx={x + 8}
          cy={y - 29}
          r={6}
          fill={p.accentL}
          stroke={p.accentD}
          strokeWidth={1.3}
        />
        <path
          d={`M${f1(x - 1)} ${f1(y - 6)} Q${f1(x - 1)} ${f1(y - 21)} ${f1(x + 8)} ${f1(y - 21)} Q${f1(x + 17)} ${f1(y - 21)} ${f1(x + 17)} ${f1(y - 6)} Z`}
          fill={p.accentL}
          stroke={p.accentD}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        <circle
          cx={x - 5}
          cy={y - 26}
          r={7}
          fill="#ffffff"
          stroke={p.accentD}
          strokeWidth={1.5}
        />
        <path
          d={`M${f1(x - 17)} ${f1(y - 2)} Q${f1(x - 17)} ${f1(y - 17)} ${f1(x - 5)} ${f1(y - 17)} Q${f1(x + 7)} ${f1(y - 17)} ${f1(x + 7)} ${f1(y - 2)} Z`}
          fill="#ffffff"
          stroke={p.accentD}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </g>
    </>
  );
};

/** Leads : un grand éclair jaune sur la façade, une antenne qui appelle. */
const Leads = ({ fp, h, p }: ArtProps) => {
  const L = litLen(fp);
  const bh = h - 16;
  const bw = Math.min(30, L * 0.74);
  const bolt = (
    [
      [9, 0],
      [27, 0],
      [18, 24],
      [29, 24],
      [6, 60],
      [12, 32],
      [1, 32],
    ] as const
  )
    .map(([bx, by]) => `${f1((bx / 30) * bw - bw / 2)} ${f1((by / 60) * bh)}`)
    .join(' L');
  const [x, y] = roofPoint(fp, h, 0.5, 0.42);
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[0, 2]} door={false} cube={false} />
      <path d={onLit(fp, 0.72, 0.9, 0, 15)} fill={p.accentD} />
      <g transform={plane(fp, 'lit', 0.46, h - 7)}>
        <path
          d={`M${bolt} Z`}
          fill="#facc15"
          stroke="#ca8a04"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </g>
      <Mast at={[x, y]} len={12} color={p.accentD} width={2} />
      <circle cx={x} cy={y - 13} r={2.2} fill={p.accent} />
      <path
        d={`M${f1(x + 5)} ${f1(y - 18)} Q${f1(x + 8.5)} ${f1(y - 13)} ${f1(x + 5)} ${f1(y - 8)} M${f1(x + 9)} ${f1(y - 21)} Q${f1(x + 14)} ${f1(y - 13)} ${f1(x + 9)} ${f1(y - 5)} M${f1(x - 5)} ${f1(y - 18)} Q${f1(x - 8.5)} ${f1(y - 13)} ${f1(x - 5)} ${f1(y - 8)} M${f1(x - 9)} ${f1(y - 21)} Q${f1(x - 14)} ${f1(y - 13)} ${f1(x - 9)} ${f1(y - 5)}`}
        stroke={p.accent}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
};

/** Premium : le palais — bandeau doré, dôme d'or couronné, tapis rouge. */
const Premium = ({ fp, h, p }: ArtProps) => {
  const [u0, , u1, v1] = fp;
  const [x, y] = roofPoint(fp, h);
  const rx = 15;
  const ry = rx * 0.58;
  const drum = 5;
  const dh = 17;
  const yb = y - drum;
  const c = yb - dh - 1;
  const a = u0 + (u1 - u0) * 0.38;
  const b = u0 + (u1 - u0) * 0.64;
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
      <path d={onLit(fp, 0, 1, h - 7, h)} fill="#f6c445" />
      <path d={onShade(fp, 0, 1, h - 7, h)} fill="#d99a1e" />
      {/* Tapis rouge devant la porte */}
      <path
        d={pathOf([
          iso(a, v1, 0.5),
          iso(b, v1, 0.5),
          iso(b, v1 + 0.17, 0.5),
          iso(a, v1 + 0.17, 0.5),
        ])}
        fill="#dc2626"
      />
      {/* Tambour et dôme */}
      <path
        d={`M${f1(x - rx)} ${f1(yb)} A${rx} ${f1(ry)} 0 0 0 ${f1(x + rx)} ${f1(yb)} L${f1(x + rx)} ${f1(y)} A${rx} ${f1(ry)} 0 0 1 ${f1(x - rx)} ${f1(y)} Z`}
        fill="#d99a1e"
      />
      <path
        d={`M${f1(x - rx)} ${f1(yb)} A${rx} ${dh} 0 0 1 ${f1(x + rx)} ${f1(yb)} A${rx} ${f1(ry)} 0 0 1 ${f1(x - rx)} ${f1(yb)} Z`}
        fill="#f6c445"
      />
      <path
        d={`M${f1(x + 2)} ${f1(yb - dh + 0.4)} A${rx} ${dh} 0 0 1 ${f1(x + rx)} ${f1(yb)} A${rx} ${f1(ry)} 0 0 1 ${f1(x + 4)} ${f1(yb + ry - 0.6)} Z`}
        fill="#e3a92a"
      />
      <ellipse
        cx={x - 6}
        cy={yb - dh * 0.55}
        rx={2.6}
        ry={4.6}
        fill="#fff3c4"
        opacity={0.8}
      />
      {/* Couronne */}
      <path
        d={`M${f1(x - 9)} ${f1(c)} L${f1(x - 10)} ${f1(c - 12)} L${f1(x - 4.5)} ${f1(c - 7)} L${f1(x)} ${f1(c - 16)} L${f1(x + 4.5)} ${f1(c - 7)} L${f1(x + 10)} ${f1(c - 12)} L${f1(x + 9)} ${f1(c)} Z`}
        fill="#f6c445"
        stroke="#b7791f"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      {[-10, 0, 10].map((dx) => (
        <circle
          key={dx}
          cx={x + dx}
          cy={c - (dx ? 13 : 17)}
          r={1.7}
          fill="#fff3c4"
        />
      ))}
    </>
  );
};

/** Campagnes : un mégaphone géant sur le toit, ses ondes vers la rue. */
const Campagnes = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.55, 0.45);
  const back: Pt = [x + 14, y - 26];
  const mouth: Pt = [x - 12, y - 19];
  const dx = mouth[0] - back[0];
  const dy = mouth[1] - back[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const r0 = 4.5;
  const r1 = 13;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const at = (q: Pt, t: number, r: number): Pt => [
    q[0] + (dx / len) * t + nx * r,
    q[1] + (dy / len) * t + ny * r,
  ];
  const waves = [19, 25, 31].map((r) => {
    const a0 = Math.atan2(dy, dx) - 0.62;
    const a1 = Math.atan2(dy, dx) + 0.62;
    const s: Pt = [mouth[0] + r * Math.cos(a0), mouth[1] + r * Math.sin(a0)];
    const e: Pt = [mouth[0] + r * Math.cos(a1), mouth[1] + r * Math.sin(a1)];
    return `M${xy(s)} A${r} ${r} 0 0 1 ${xy(e)}`;
  });
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
      <path
        d={seg([x + 3, y + 1], [x + 3, y - 18])}
        stroke={p.accentD}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <path
        d={pathOf([
          at(back, 0, r0),
          at(mouth, 0, r1),
          at(mouth, 0, -r1),
          at(back, 0, -r0),
        ])}
        fill="#ffffff"
        stroke={p.accentD}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path
        d={pathOf([
          at(back, len * 0.42, r0 + (r1 - r0) * 0.42),
          at(back, len * 0.56, r0 + (r1 - r0) * 0.56),
          at(back, len * 0.56, -(r0 + (r1 - r0) * 0.56)),
          at(back, len * 0.42, -(r0 + (r1 - r0) * 0.42)),
        ])}
        fill={p.accent}
      />
      <ellipse
        cx={back[0]}
        cy={back[1]}
        rx={2}
        ry={r0}
        transform={`rotate(${f1(deg)} ${xy(back)})`}
        fill={p.accentD}
      />
      <ellipse
        cx={mouth[0]}
        cy={mouth[1]}
        rx={4.2}
        ry={r1}
        transform={`rotate(${f1(deg)} ${xy(mouth)})`}
        fill={p.accentD}
        stroke={p.accent}
        strokeWidth={1.8}
      />
      <path
        d={waves.join(' ')}
        stroke={p.accent}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
};

/** Producteurs : l'usine — toit en dents de scie vitrées, haute cheminée qui fume, porte de quai. */
const Producteurs = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const rise = 15;
  const n = 3;
  const slats: ReactNode[] = [];
  for (let z = 6; z < 30; z += 6)
    slats.push(
      <path key={z} d={onLit(fp, 0.1, 0.5, z, z + 1.1)} fill="#8a94a6" />
    );
  const teeth = Array.from({ length: n }, (_, k) => {
    const a = u0 + ((u1 - u0) * k) / n;
    const b = u0 + ((u1 - u0) * (k + 1)) / n;
    return (
      <g key={k}>
        <path
          d={pathOf([
            iso(a, v0, h),
            iso(b, v0, h + rise),
            iso(b, v1, h + rise),
            iso(a, v1, h),
          ])}
          fill="#f5e7dc"
        />
        <path
          d={pathOf([
            iso(b, v0, h),
            iso(b, v1, h),
            iso(b, v1, h + rise),
            iso(b, v0, h + rise),
          ])}
          fill="#8fb8f5"
        />
        {[0.33, 0.66].map((t) => (
          <path
            key={t}
            d={seg(
              iso(b, v0 + (v1 - v0) * t, h),
              iso(b, v0 + (v1 - v0) * t, h + rise)
            )}
            stroke="#5b8def"
            strokeWidth={0.9}
          />
        ))}
        <path
          d={pathOf([iso(a, v1, h), iso(b, v1, h + rise), iso(b, v1, h)])}
          fill="#fbb98a"
        />
      </g>
    );
  });
  const cu = u0 + 0.07;
  const cv = v0 + 0.08;
  const top = h + 42;
  const [sx, sy] = iso(cu, cv, top);
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit="#fbb98a" shade="#f39a5f" />
      <path d={onLit(fp, 0, 1, h - 5, h)} fill={p.accentD} />
      <path d={onShade(fp, 0, 1, h - 5, h)} fill="#c2410c" />
      <path d={onLit(fp, 0.1, 0.5, 0, 30)} fill="#a8b1c0" />
      {slats}
      {windows(onLit, fp, 2, 1, 14, h - 10, '#5b8def', '#9cc0fb', 0.58, 0.06)}
      {windows(onShade, fp, 3, 1, 14, h - 10, '#4f7fe0', '#86aef5', 0.12, 0.08)}
      {teeth}
      {/* Cheminée rayée et sa fumée */}
      <Box
        b={[cu - 0.04, cv - 0.04, cu + 0.04, cv + 0.04, h, top]}
        top="#d6d9e2"
        lit="#eceef3"
        shade="#c5cad5"
      />
      {[top - 14, top - 6].map((z) => (
        <g key={z}>
          <path
            d={onLit(
              [cu - 0.04, cv - 0.04, cu + 0.04, cv + 0.04],
              0,
              1,
              z,
              z + 4
            )}
            fill={p.accent}
          />
          <path
            d={onShade(
              [cu - 0.04, cv - 0.04, cu + 0.04, cv + 0.04],
              0,
              1,
              z,
              z + 4
            )}
            fill={p.accentD}
          />
        </g>
      ))}
      <circle cx={sx + 4} cy={sy - 6} r={4.5} fill="#e5e7eb" />
      <circle cx={sx + 10} cy={sy - 12} r={5.5} fill="#eef0f3" />
      <circle cx={sx + 18} cy={sy - 15} r={4} fill="#f3f4f6" />
    </>
  );
};

/** Planning : le tableau de charge géant sur la façade, une horloge sur le toit. */
const Planning = ({ fp, h, p }: ArtProps) => {
  const L = litLen(fp);
  const w = L * 0.86;
  const bh = h - 22;
  const bars: [number, number, string][] = [
    [0, 0.48, '#f97316'],
    [0.22, 0.74, '#7c6cff'],
    [0.06, 0.4, '#14b8a6'],
    [0.44, 0.96, '#3b82f6'],
    [0.3, 0.64, '#ec4899'],
  ];
  const row = (bh - 10) / bars.length;
  const [x, y] = roofPoint(fp, h, 0.5, 0.42);
  const c: Pt = [x, y - 17];
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      {windows(onShade, fp, 2, 3, 12, h - 8, p.winS, p.shineS)}
      <path d={onLit(fp, 0.42, 0.6, 0, 13)} fill={p.accentD} />
      <Roof fp={fp} h={h} p={p} cube={false} />
      <g transform={plane(fp, 'lit', 0.07, h - 6)}>
        <rect
          x={0}
          y={0}
          width={w}
          height={bh}
          rx={2.5}
          fill="#ffffff"
          stroke={p.accentD}
          strokeWidth={1.8}
        />
        {[0.25, 0.5, 0.75].map((t) => (
          <path
            key={t}
            d={`M${f1(3 + t * (w - 6))} 3 V${f1(bh - 3)}`}
            stroke="#e5e7eb"
            strokeWidth={0.8}
          />
        ))}
        {bars.map(([a, b, col], i) => (
          <rect
            key={col}
            x={3 + a * (w - 6)}
            y={5 + i * row}
            width={(b - a) * (w - 6)}
            height={row * 0.62}
            rx={1.6}
            fill={col}
          />
        ))}
        <path
          d={`M${f1(3 + 0.6 * (w - 6))} 2 V${f1(bh - 2)}`}
          stroke="#ef4444"
          strokeWidth={1.3}
        />
      </g>
      {/* Horloge */}
      <path
        d={seg([x - 4, y + 1], [x - 2, c[1] + 6])}
        stroke={p.accentD}
        strokeWidth={1.8}
      />
      <path
        d={seg([x + 4, y + 1], [x + 2, c[1] + 6])}
        stroke={p.accentD}
        strokeWidth={1.8}
      />
      <circle
        cx={c[0]}
        cy={c[1]}
        r={10}
        fill="#ffffff"
        stroke={p.accentD}
        strokeWidth={2.4}
      />
      {[0, 1, 2, 3].map((i) => {
        const t = (i * Math.PI) / 2;
        return (
          <circle
            key={i}
            cx={c[0] + Math.cos(t) * 7}
            cy={c[1] + Math.sin(t) * 7}
            r={0.9}
            fill="#9a3412"
          />
        );
      })}
      <path
        d={`M${xy(c)} L${f1(c[0])} ${f1(c[1] - 6)} M${xy(c)} L${f1(c[0] + 4.5)} ${f1(c[1] + 1.5)}`}
        stroke="#1f2937"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </>
  );
};

/** Fournisseurs : l'entrepôt — toit voûté en tôle, portes de quai, palette de cartons. */
const Fournisseurs = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const R = (v1 - v0) / 2;
  const Rz = (R * A) / 0.866;
  const vc = (v0 + v1) / 2;
  const N = 12;
  const arc = (k: number): [number, number] => {
    const t = (Math.PI * k) / N;
    return [vc - R * Math.cos(t), h + Rz * Math.sin(t)];
  };
  const strips = Array.from({ length: N }, (_, k) => {
    const [va, za] = arc(k);
    const [vb, zb] = arc(k + 1);
    const front = k >= N / 2;
    const fill = front
      ? k % 2
        ? '#f4f1ec'
        : '#ebe6df'
      : k % 2
        ? '#e3ddd4'
        : '#d9d2c8';
    return (
      <path
        key={k}
        d={pathOf([
          iso(u0, va, za),
          iso(u1, va, za),
          iso(u1, vb, zb),
          iso(u0, vb, zb),
        ])}
        fill={fill}
      />
    );
  });
  const gable = [
    iso(u1, v0, 0),
    iso(u1, v1, 0),
    ...Array.from({ length: N + 1 }, (_, k) => {
      const [v, z] = arc(N - k);
      return iso(u1, v, z);
    }),
  ];
  const slats: ReactNode[] = [];
  for (const [s0, s1] of [
    [0.08, 0.42],
    [0.56, 0.9],
  ])
    for (let z = 4; z < 20; z += 4)
      slats.push(
        <path
          key={`${s0}-${z}`}
          d={onLit(fp, s0, s1, z, z + 0.9)}
          fill="#8a94a6"
        />
      );
  const pallet: FP = [u1 + 0.03, v1 - 0.2, u1 + 0.17, v1 - 0.04];
  const crates: [number, number, number, number][] = [
    [pallet[0] + 0.005, pallet[1] + 0.005, 3, 14],
    [pallet[0] + 0.005, pallet[1] + 0.08, 3, 14],
    [pallet[0] + 0.07, pallet[1] + 0.005, 3, 14],
    [pallet[0] + 0.07, pallet[1] + 0.08, 3, 14],
    [pallet[0] + 0.04, pallet[1] + 0.04, 14, 25],
  ];
  return (
    <>
      <Box b={[...fp, 0, h]} top="#f1efec" lit="#ece7e0" shade="#d6d0c8" />
      <path d={onLit(fp, 0, 1, h - 5, h)} fill={p.accent} />
      <path d={onLit(fp, 0.08, 0.42, 0, 20)} fill="#a8b1c0" />
      <path d={onLit(fp, 0.56, 0.9, 0, 20)} fill="#a8b1c0" />
      {slats}
      {strips}
      <path d={pathOf(gable)} fill="#d6d0c8" />
      <path d={onShade(fp, 0, 1, h - 5, h)} fill={p.accentD} />
      <path d={onShade(fp, 0.28, 0.72, 0, h - 9)} fill={p.accent} />
      <path d={onShade(fp, 0.3, 0.7, 0, h - 11)} fill="#fdba74" />
      <g transform={plane(fp, 'shade', 0.5, h + Rz * 0.62)}>
        <circle cx={0} cy={0} r={4.2} fill="#9ca3af" />
        <path d="M-3 0 H3 M0 -3 V3" stroke="#e5e7eb" strokeWidth={1} />
      </g>
      <Box b={[...pallet, 0, 3]} top="#d6b48a" lit="#b98f5c" shade="#a37a49" />
      {crates.map(([u, v, z0, z1], i) => (
        <Box
          key={i}
          b={[u, v, u + 0.065, v + 0.065, z0, z1]}
          top="#ecc391"
          lit="#dca46a"
          shade="#c88d52"
        />
      ))}
    </>
  );
};

/** Boutique : vitrines aux t-shirts, store rayé, grand sac de courses sur le toit. */
const Boutique = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const stripes: ReactNode[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = u0 + ((u1 - u0) * i) / n;
    const b = u0 + ((u1 - u0) * (i + 1)) / n;
    stripes.push(
      <path
        key={i}
        d={pathOf([
          iso(a, v1, 38),
          iso(b, v1, 38),
          iso(b, v1 + 0.08, 29),
          iso(a, v1 + 0.08, 29),
        ])}
        fill={i % 2 ? '#ffffff' : '#f43f6b'}
      />,
      <path
        key={`f${i}`}
        d={`M${xy(iso(a, v1 + 0.08, 29))} Q${xy(iso((a + b) / 2, v1 + 0.08, 25))} ${xy(iso(b, v1 + 0.08, 29))} Z`}
        fill={i % 2 ? '#ffffff' : '#f43f6b'}
      />
    );
  }
  const tee =
    'M-5 0 L-2 -1.6 Q0 0.4 2 -1.6 L5 0 L7.6 3.6 L5.4 5 L5.4 12 L-5.4 12 L-5.4 5 L-7.6 3.6 Z';
  const bag: FP = [
    (u0 + u1) / 2 - 0.08,
    (v0 + v1) / 2 - 0.05,
    (u0 + u1) / 2 + 0.08,
    (v0 + v1) / 2 + 0.05,
  ];
  const handle = (v: number) => {
    const a = iso(bag[0] + 0.04, v, h + 22);
    const b = iso(bag[2] - 0.04, v, h + 22);
    return `M${xy(a)} C${f1(a[0])} ${f1(a[1] - 11)} ${f1(b[0])} ${f1(b[1] - 11)} ${xy(b)}`;
  };
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      {windows(onLit, fp, 3, 1, 44, h - 6, p.win, p.shine, 0.12, 0.1)}
      {windows(onShade, fp, 2, 1, 44, h - 6, p.winS, p.shineS, 0.16, 0.12)}
      <path d={onLit(fp, 0.06, 0.42, 3, 27)} fill="#ffe4ee" />
      <path d={onLit(fp, 0.58, 0.94, 3, 27)} fill="#ffe4ee" />
      <g transform={plane(fp, 'lit', 0.24, 22)}>
        <path d={tee} fill="#ffffff" stroke="#f9a8d4" strokeWidth={0.8} />
      </g>
      <g transform={plane(fp, 'lit', 0.76, 22)}>
        <path d={tee} fill={p.accent} />
      </g>
      <path d={onLit(fp, 0.44, 0.56, 0, 26)} fill="#e8467a" />
      {stripes}
      <path d={onShade(fp, 0.18, 0.82, 5, 28)} fill="#f8b6cc" />
      <Roof fp={fp} h={h} p={p} cube={false} />
      {/* Sac de courses géant */}
      <path
        d={handle(bag[1] + 0.02)}
        stroke="#9d174d"
        strokeWidth={1.8}
        fill="none"
      />
      <Box
        b={[...bag, h, h + 22]}
        top="#f9a8d4"
        lit="#f472b6"
        shade="#db2777"
      />
      <path
        d={handle(bag[3] - 0.02)}
        stroke="#be185d"
        strokeWidth={1.8}
        fill="none"
      />
      <g transform={plane(bag, 'lit', 0.5, h + 15)}>
        <path
          d="M0 7 C-6 2.5 -6 -2 -2.6 -2 C-1.2 -2 -0.3 -1 0 0 C0.3 -1 1.2 -2 2.6 -2 C6 -2 6 2.5 0 7 Z"
          fill="#ffffff"
        />
      </g>
    </>
  );
};

/** Attributs : un cube de couleurs (tailles, couleurs : la grille du menu) sur sa vitrine. */
const Attributs = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const base = 14;
  const n = 3;
  const g = 0.07;
  const c = (1 - g * (n + 1)) / n;
  const LIT = [
    '#ef4444',
    '#facc15',
    '#3b82f6',
    '#22c55e',
    '#f8fafc',
    '#f97316',
    '#3b82f6',
    '#ef4444',
    '#facc15',
  ];
  const SHADE = [
    '#16a34a',
    '#c2410c',
    '#e2e8f0',
    '#ca8a04',
    '#2563eb',
    '#dc2626',
    '#e2e8f0',
    '#16a34a',
    '#2563eb',
  ];
  const TOP = [
    '#fde047',
    '#ffffff',
    '#f87171',
    '#60a5fa',
    '#fb923c',
    '#4ade80',
    '#ffffff',
    '#fde047',
    '#fb923c',
  ];
  const stickers: ReactNode[] = [];
  const z = (j: number) => base + (h - base) * (g + j * (c + g));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const s = g + i * (c + g);
      stickers.push(
        <path
          key={`l${i}${j}`}
          d={onLit(fp, s, s + c, z(j), z(j) + (h - base) * c)}
          fill={LIT[i * n + j]}
        />,
        <path
          key={`s${i}${j}`}
          d={onShade(fp, s, s + c, z(j), z(j) + (h - base) * c)}
          fill={SHADE[i * n + j]}
        />
      );
      const ua = u0 + (u1 - u0) * s;
      const ub = ua + (u1 - u0) * c;
      const va = v0 + (v1 - v0) * (g + j * (c + g));
      const vb = va + (v1 - v0) * c;
      stickers.push(
        <path
          key={`t${i}${j}`}
          d={pathOf([
            iso(ua, va, h),
            iso(ub, va, h),
            iso(ub, vb, h),
            iso(ua, vb, h),
          ])}
          fill={TOP[i * n + j]}
        />
      );
    }
  const plinth: FP = [u0 + 0.03, v0 + 0.03, u1 - 0.03, v1 - 0.03];
  return (
    <>
      <Box b={[...plinth, 0, base]} top={p.top} lit={p.lit} shade={p.shade} />
      <path d={onLit(plinth, 0.08, 0.92, 2, base - 3)} fill="#ffe4ee" />
      <path d={onLit(plinth, 0.4, 0.6, 0, base - 2)} fill={p.accentD} />
      <path d={onShade(plinth, 0.1, 0.9, 2, base - 3)} fill="#f8b6cc" />
      <Box b={[...fp, base, h]} top="#334155" lit="#1f2937" shade="#111827" />
      {stickers}
    </>
  );
};

/** Bannières : deux grandes oriflammes sur la façade, un drapeau au sommet du mât. */
const Bannieres = ({ fp, h, p }: ArtProps) => {
  const L = litLen(fp);
  const bw = L * 0.32;
  const len = h - 10;
  const flag = (s: number, color: string) => (
    <g transform={plane(fp, 'lit', s, h - 2)}>
      <path
        d={`M0 0 L${f1(bw)} 0 L${f1(bw)} ${f1(len)} L${f1(bw / 2)} ${f1(len - 7)} L0 ${f1(len)} Z`}
        fill={color}
      />
      <path
        d={`M${f1(bw * 0.3)} 0 L${f1(bw * 0.44)} 0 L${f1(bw * 0.44)} ${f1(len - 4.5)} L${f1(bw * 0.3)} ${f1(len - 3)} Z`}
        fill="#ffffff"
        opacity={0.85}
      />
      <circle cx={bw / 2} cy={11} r={bw * 0.2} fill="#ffffff" />
      <rect
        x={-1.5}
        y={-2}
        width={bw + 3}
        height={2.6}
        rx={1.2}
        fill="#6b7280"
      />
    </g>
  );
  const [x, y] = roofPoint(fp, h, 0.8, 0.22);
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[0, 2]} door={false} cube={false} />
      <path d={onLit(fp, 0.43, 0.57, 0, 18)} fill={p.accentD} />
      {flag(0.1, p.accent)}
      {flag(0.63, '#8b5cf6')}
      <Mast at={[x, y]} len={42} color="#94a3b8" width={1.8} />
      <circle cx={x} cy={y - 43} r={1.9} fill="#fbbf24" />
      <path
        d={`M${f1(x)} ${f1(y - 41)} C${f1(x - 8)} ${f1(y - 46)} ${f1(x - 17)} ${f1(y - 36)} ${f1(x - 28)} ${f1(y - 40)} L${f1(x - 28)} ${f1(y - 24)} C${f1(x - 17)} ${f1(y - 20)} ${f1(x - 8)} ${f1(y - 30)} ${f1(x)} ${f1(y - 25)} Z`}
        fill={p.accent}
      />
      <path
        d={`M${f1(x)} ${f1(y - 35.5)} C${f1(x - 8)} ${f1(y - 40.5)} ${f1(x - 17)} ${f1(y - 30.5)} ${f1(x - 28)} ${f1(y - 34.5)} L${f1(x - 28)} ${f1(y - 30)} C${f1(x - 17)} ${f1(y - 26)} ${f1(x - 8)} ${f1(y - 36)} ${f1(x)} ${f1(y - 31)} Z`}
        fill="#ffffff"
        opacity={0.85}
      />
    </>
  );
};

/** Finance : la banque — colonnes, fronton triangulaire et sa pièce d'or, marches. */
const Finance = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const uc = (u0 + u1) / 2;
  const R = 20;
  const ent = 9;
  const pillars: ReactNode[] = [];
  for (const s of [0.1, 0.32, 0.54, 0.76])
    pillars.push(
      <path
        key={s}
        d={onLit(fp, s, s + 0.13, 4, h - ent, 0.012)}
        fill="#ffffff"
      />,
      <path
        key={`${s}o`}
        d={onLit(fp, s + 0.09, s + 0.13, 4, h - ent, 0.012)}
        fill="#d7ebe6"
      />
    );
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      <path d={onLit(fp, 0.04, 0.96, 4, h - ent)} fill="#8fd3c4" />
      <path d={onLit(fp, 0.235, 0.3, 4, 26)} fill={p.accentD} />
      <path d={onLit(fp, 0.455, 0.52, 4, 26)} fill={p.accentD} />
      <path d={onLit(fp, 0.675, 0.74, 4, 26)} fill={p.accentD} />
      {pillars}
      {windows(onShade, fp, 2, 2, 10, h - 16, p.winS, p.shineS, 0.16, 0.12)}
      <path d={onLit(fp, 0, 1, h - ent, h)} fill="#ffffff" />
      <path
        d={onLit(fp, 0, 1, h - ent + 2.5, h - ent + 4.5)}
        fill={p.accentL}
      />
      <path d={onShade(fp, 0, 1, h - ent, h)} fill="#e6efed" />
      {/* Toit à deux pans et fronton */}
      <path
        d={pathOf([
          iso(u0, v0, h),
          iso(u0, v1, h),
          iso(uc, v1, h + R),
          iso(uc, v0, h + R),
        ])}
        fill="#d3efe8"
      />
      <path
        d={pathOf([
          iso(uc, v0, h + R),
          iso(uc, v1, h + R),
          iso(u1, v1, h),
          iso(u1, v0, h),
        ])}
        fill="#9fd8ca"
      />
      <path
        d={pathOf([
          iso(u0 - 0.012, v1 + 0.012, h - 0.5),
          iso(u1 + 0.012, v1 + 0.012, h - 0.5),
          iso(uc, v1 + 0.012, h + R + 1),
        ])}
        fill="#ffffff"
        stroke={p.accentD}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path
        d={pathOf([
          iso(u0 + 0.06, v1 + 0.012, h + 2),
          iso(u1 - 0.06, v1 + 0.012, h + 2),
          iso(uc, v1 + 0.012, h + R - 4),
        ])}
        fill="#e8f7f3"
      />
      <g transform={plane(fp, 'lit', 0.5, h + 7.5)}>
        <circle
          cx={0}
          cy={0}
          r={5.8}
          fill="#f6c445"
          stroke="#d99a1e"
          strokeWidth={1.1}
        />
        <text
          x={0}
          y={3}
          textAnchor="middle"
          fontSize={8}
          fontWeight={800}
          fill="#92400e"
          fontFamily="Inter, system-ui, sans-serif"
        >
          €
        </text>
      </g>
      {/* Marches */}
      <Box
        b={[u0 + 0.02, v1, u1 - 0.02, v1 + 0.05, 0, 4]}
        top="#ffffff"
        lit="#e6efed"
        shade="#d4e3df"
      />
      <Box
        b={[u0 + 0.05, v1 + 0.05, u1 - 0.05, v1 + 0.09, 0, 2]}
        top="#ffffff"
        lit="#e6efed"
        shade="#d4e3df"
      />
    </>
  );
};

/** Générateurs : une grande éolienne sur le toit (un générateur ; elle tourne). */
const Generateurs = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.5, 0.45);
  const hub: Pt = [x, y - 40];
  const r = 23;
  const blade = (a: number) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tip: Pt = [hub[0] + ca * r, hub[1] + sa * r];
    const side: Pt = [
      hub[0] + ca * r * 0.3 - sa * 4.2,
      hub[1] + sa * r * 0.3 + ca * 4.2,
    ];
    return `M${xy(hub)} L${xy(side)} L${xy(tip)} Z`;
  };
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[2, 2]} cube={false} />
      <path
        d={`M${f1(x - 3)} ${f1(y)} L${f1(hub[0] - 1.2)} ${f1(hub[1])} L${f1(hub[0] + 1.2)} ${f1(hub[1])} L${f1(x + 3)} ${f1(y)} Z`}
        fill="#ffffff"
        stroke={p.accentD}
        strokeWidth={0.9}
      />
      <ellipse
        cx={hub[0] + 2.5}
        cy={hub[1]}
        rx={5.5}
        ry={3.2}
        fill={p.accentL}
        stroke={p.accentD}
        strokeWidth={0.9}
      />
      <g
        className="vg-spin"
        style={{ transformOrigin: `${f1(hub[0])}px ${f1(hub[1])}px` }}
      >
        {[0, 2.094, 4.189].map((a) => (
          <path
            key={a}
            d={blade(a - Math.PI / 2)}
            fill="#ffffff"
            stroke={p.accentD}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        ))}
      </g>
      <circle cx={hub[0]} cy={hub[1]} r={3.4} fill={p.accentD} />
    </>
  );
};

/** Devis : une feuille de devis géante — coin corné, lignes de texte, total et coche. */
const Devis = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const z0 = 4;
  const c = 13;
  const cw = (c * 0.866) / A;
  const sc = 1 - cw / (u1 - u0);
  const edges: ReactNode[] = [];
  for (let z = z0 + 4; z < h - c; z += 4.5)
    edges.push(
      <path key={z} d={onShade(fp, 0, 1, z, z + 0.7)} fill="#c8d6d2" />
    );
  const lines: [number, number, number][] = [
    [h - 24, 0.7, 2.6],
    [h - 31, 0.6, 2.6],
    [h - 38, 0.68, 2.6],
    [h - 45, 0.46, 2.6],
  ];
  return (
    <>
      <Box
        b={[u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, z0]}
        top="#e6efed"
        lit="#d4e3df"
        shade="#bfd3cd"
      />
      <path
        d={pathOf([
          iso(u1, v0, z0),
          iso(u1, v1, z0),
          iso(u1, v1, h - c),
          iso(u1, v0, h - c),
        ])}
        fill="#dfe9e6"
      />
      {edges}
      <path
        d={pathOf([
          iso(u0, v1, z0),
          iso(u1, v1, z0),
          iso(u1, v1, h - c),
          iso(u1 - cw, v1, h),
          iso(u0, v1, h),
        ])}
        fill="#ffffff"
      />
      <path
        d={pathOf([
          iso(u0, v0, h),
          iso(u1 - cw, v0, h),
          iso(u1 - cw, v1, h),
          iso(u0, v1, h),
        ])}
        fill="#f6f8f8"
      />
      <path
        d={pathOf([
          iso(u1 - cw, v0, h),
          iso(u1, v0, h - c),
          iso(u1, v1, h - c),
          iso(u1 - cw, v1, h),
        ])}
        fill="#e3ecea"
      />
      {/* Coin replié */}
      <path
        d={pathOf([
          iso(u1 - cw, v1 + 0.004, h),
          iso(u1, v1 + 0.004, h - c),
          iso(u1 - cw, v1 + 0.004, h - c),
        ])}
        fill="#d3e4e0"
      />
      {/* Titre, lignes, total, coche */}
      <path
        d={onLit(fp, 0.1, sc - 0.12, h - 15, h - 10.5, 0.004)}
        fill={p.accentD}
      />
      {lines.map(([z, l, t]) => (
        <path
          key={z}
          d={onLit(fp, 0.1, 0.1 + l, z, z + t, 0.004)}
          fill="#b9c6c9"
        />
      ))}
      <path d={onLit(fp, 0.52, 0.9, z0 + 8, z0 + 17, 0.004)} fill={p.accent} />
      <path
        d={onLit(fp, 0.58, 0.84, z0 + 11.5, z0 + 13.5, 0.006)}
        fill="#ffffff"
      />
      <g transform={plane(fp, 'lit', 0.12, z0 + 16)}>
        <path
          d="M0 3 L4 7 L12 -2"
          stroke={p.accentD}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </>
  );
};

/** Tickets : le poste de secours — une grande bouée sur le toit, une bulle « ? » sur la façade. */
const Tickets = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.5, 0.45);
  const c: Pt = [x, y - 19];
  const r = 12;
  const w = 7.5;
  const dash = (2 * Math.PI * r) / 8;
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
      <g transform={plane(fp, 'shade', 0.5, h - 9)}>
        <rect x={-9} y={0} width={18} height={14} rx={4} fill="#ffffff" />
        <path d="M-3 13.5 L-6 19 L2 13.5 Z" fill="#ffffff" />
        <text
          x={0}
          y={11}
          textAnchor="middle"
          fontSize={11}
          fontWeight={800}
          fill={p.accentD}
          fontFamily="Inter, system-ui, sans-serif"
        >
          ?
        </text>
      </g>
      <path
        d={seg([x - 7, y + 1], [x - 4, c[1] + 9])}
        stroke={p.accentD}
        strokeWidth={2}
      />
      <path
        d={seg([x + 7, y + 1], [x + 4, c[1] + 9])}
        stroke={p.accentD}
        strokeWidth={2}
      />
      <circle
        cx={c[0]}
        cy={c[1]}
        r={r}
        fill="none"
        stroke="#ffffff"
        strokeWidth={w}
      />
      <circle
        cx={c[0]}
        cy={c[1]}
        r={r}
        fill="none"
        stroke="#ef4444"
        strokeWidth={w}
        strokeDasharray={`${f1(dash)} ${f1(dash)}`}
      />
      <circle
        cx={c[0]}
        cy={c[1]}
        r={r + w / 2}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={0.8}
      />
      <circle
        cx={c[0]}
        cy={c[1]}
        r={r - w / 2}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={0.8}
      />
    </>
  );
};

/** IA : une tête de robot — visière et grands yeux lumineux, bouche-grille, oreille, antenne. */
const Ia = ({ fp, h, p }: ArtProps) => {
  const L = litLen(fp);
  const [x, y] = roofPoint(fp, h, 0.5, 0.5);
  return (
    <>
      <Box b={[...fp, 0, h]} top="#eef0fe" lit="#dfe2fb" shade="#c4c8f3" />
      <g transform={plane(fp, 'lit', 0.5, h - 8)}>
        <rect
          x={-L * 0.41}
          y={0}
          width={L * 0.82}
          height={22}
          rx={7}
          fill="#1e1b4b"
        />
        {[-1, 1].map((d) => (
          <g key={d}>
            <circle
              cx={d * L * 0.19}
              cy={11}
              r={7.4}
              fill="#22d3ee"
              opacity={0.35}
            />
            <circle cx={d * L * 0.19} cy={11} r={5.6} fill="#22d3ee" />
            <circle cx={d * L * 0.19 - 1.8} cy={9} r={1.9} fill="#ffffff" />
          </g>
        ))}
      </g>
      <g transform={plane(fp, 'lit', 0.5, 25)}>
        <rect
          x={-L * 0.25}
          y={0}
          width={L * 0.5}
          height={21}
          rx={3.5}
          fill="#4338ca"
        />
        {[5, 10.5, 16].map((yy) => (
          <rect
            key={yy}
            x={-L * 0.2}
            y={yy - 1}
            width={L * 0.4}
            height={2}
            rx={1}
            fill="#a5b4fc"
          />
        ))}
      </g>
      <g transform={plane(fp, 'shade', 0.5, h - 16)}>
        <circle cx={0} cy={8} r={8.5} fill={p.accent} />
        <circle cx={0} cy={8} r={3.6} fill="#c7d2fe" />
      </g>
      <Mast at={[x, y]} len={14} color="#64748b" width={2.2} />
      <circle
        className="vg-twinkle"
        cx={x}
        cy={y - 17}
        r={4.4}
        fill="#22d3ee"
      />
      <circle cx={x} cy={y - 17} r={1.7} fill="#ffffff" />
      <path
        className="vg-twinkle vg-twinkle2"
        d={star(x + 14, y - 22, 4)}
        fill="#fbbf24"
      />
      <path
        className="vg-twinkle"
        d={star(x - 13, y - 14, 3)}
        fill={p.accentL}
      />
    </>
  );
};

/** Utilisateurs : l'immeuble des comptes — balcons habités, avatar géant sur le toit. */
const Utilisateurs = ({ fp, h, p }: ArtProps) => {
  const [u0, , u1, v1] = fp;
  const rows = Math.max(1, Math.round((h - 26 - 8) / 21));
  const rh = (h - 26 - 8) / rows;
  const people: [number, number, string][] = [
    [0, 0.3, '#f97316'],
    [1, 0.72, '#22c55e'],
    [0, 0.82, '#ec4899'],
  ];
  const [x, y] = roofPoint(fp, h);
  const c: Pt = [x, y - 22];
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
      {Array.from({ length: rows }, (_, r) => {
        const z = 26 + r * rh + rh * 0.12;
        return (
          <g key={r}>
            {people
              .filter(([pr]) => pr === r)
              .map(([, s, shirt]) => {
                const [px, py] = iso(u0 + (u1 - u0) * s, v1 + 0.02, z);
                return (
                  <g key={s}>
                    <rect
                      x={px - 2}
                      y={py - 7}
                      width={4}
                      height={6}
                      rx={1.6}
                      fill={shirt}
                    />
                    <circle cx={px} cy={py - 9} r={2.1} fill="#f2c4a0" />
                  </g>
                );
              })}
            <path d={onLit(fp, 0.06, 0.94, z - 3, z, 0.035)} fill="#ffffff" />
            <path
              d={pathOf([
                iso(u0 + (u1 - u0) * 0.06, v1, z),
                iso(u0 + (u1 - u0) * 0.94, v1, z),
                iso(u0 + (u1 - u0) * 0.94, v1 + 0.035, z),
                iso(u0 + (u1 - u0) * 0.06, v1 + 0.035, z),
              ])}
              fill="#f8f7ff"
            />
          </g>
        );
      })}
      <path
        d={seg([x, y + 1], [x, c[1] + 12])}
        stroke={p.accentD}
        strokeWidth={2.4}
      />
      <circle
        cx={c[0]}
        cy={c[1]}
        r={14}
        fill={p.accent}
        stroke="#ffffff"
        strokeWidth={2.2}
      />
      <circle cx={c[0]} cy={c[1] - 4} r={4.6} fill="#ffffff" />
      <path
        d={`M${f1(c[0] - 8.5)} ${f1(c[1] + 9)} Q${f1(c[0] - 8.5)} ${f1(c[1] + 1.6)} ${f1(c[0])} ${f1(c[1] + 1.6)} Q${f1(c[0] + 8.5)} ${f1(c[1] + 1.6)} ${f1(c[0] + 8.5)} ${f1(c[1] + 9)} Z`}
        fill="#ffffff"
      />
    </>
  );
};

/** Paramètres : deux roues dentées sur le toit, qui tournent en sens contraire. */
const Parametres = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.5, 0.45);
  const big: Pt = [x - 5, y - 22];
  const small: Pt = [x + 17, y - 9];
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[2, 2]} cube={false} />
      <path
        d={`M${f1(x - 11)} ${f1(y)} L${f1(big[0] - 2)} ${f1(big[1])} L${f1(big[0] + 2)} ${f1(big[1])} L${f1(x + 1)} ${f1(y)} Z`}
        fill={p.shade}
      />
      <g
        className="vg-spin vg-spin-slow"
        style={{ transformOrigin: `${f1(big[0])}px ${f1(big[1])}px` }}
      >
        <path d={gearPath(big[0], big[1], 18, 10)} fill={p.accent} />
        <circle cx={big[0]} cy={big[1]} r={6} fill="#ffffff" />
      </g>
      <g
        className="vg-spin vg-spin-slow vg-spin-rev"
        style={{ transformOrigin: `${f1(small[0])}px ${f1(small[1])}px` }}
      >
        <path d={gearPath(small[0], small[1], 11, 7)} fill={p.accentL} />
        <circle cx={small[0]} cy={small[1]} r={3.6} fill="#ffffff" />
      </g>
    </>
  );
};

const ART: Record<SectionId, (props: ArtProps) => JSX.Element> = {
  projets: Projets,
  accueil: Accueil,
  calendrier: Calendrier,
  clients: Clients,
  leads: Leads,
  premium: Premium,
  campagnes: Campagnes,
  producteurs: Producteurs,
  planning: Planning,
  fournisseurs: Fournisseurs,
  boutique: Boutique,
  attributs: Attributs,
  bannieres: Bannieres,
  finance: Finance,
  generateurs: Generateurs,
  devis: Devis,
  tickets: Tickets,
  ia: Ia,
  utilisateurs: Utilisateurs,
  parametres: Parametres,
};

/** Le bâtiment d'un onglet du menu, à sa place sur la carte. */
export const BuildingArt = ({ id }: { id: SectionId }) => {
  const Art = ART[id];
  return <Art fp={footprint(id)} h={BUILDINGS[id].h} p={PAL[districtOf(id)]} />;
};

// ── Décors ───────────────────────────────────────────────────────────────────

/** Arbre : feuillu rond (deux tons de vert) ou conifère, ombre au sol. */
export const TreeArt = ({
  u,
  v,
  s,
  kind = 'round',
}: {
  u: number;
  v: number;
  s: number;
  kind?: 'round' | 'pine';
}) => {
  const [x, y] = iso(u, v, 4);
  if (kind === 'pine')
    return (
      <g>
        <ellipse
          cx={x + 3 * s}
          cy={y + 2}
          rx={12 * s}
          ry={5.5 * s}
          fill="rgba(40,60,50,0.13)"
        />
        <rect
          x={x - 1.6 * s}
          y={y - 10 * s}
          width={3.2 * s}
          height={10 * s}
          rx={1}
          fill="#8a6b4c"
        />
        {[0, 1, 2].map((k) => {
          const base = y - 8 * s - k * 11 * s;
          const half = (13 - k * 3) * s;
          return (
            <g key={k}>
              <path
                d={`M${f1(x - half)} ${f1(base)} L${f1(x)} ${f1(base - 17 * s)} L${f1(x + half)} ${f1(base)} Z`}
                fill="#4f9a5b"
              />
              <path
                d={`M${f1(x - half)} ${f1(base)} L${f1(x)} ${f1(base - 17 * s)} L${f1(x)} ${f1(base)} Z`}
                fill="#62b06d"
              />
            </g>
          );
        })}
      </g>
    );
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

/** Buisson rond, au pied d'un bâtiment. */
export const BushArt = ({ u, v, s }: { u: number; v: number; s: number }) => {
  const [x, y] = iso(u, v, 0);
  return (
    <g>
      <ellipse
        cx={x + 1}
        cy={y + 1}
        rx={7 * s}
        ry={3 * s}
        fill="rgba(40,60,50,0.12)"
      />
      <circle cx={x - 2.5 * s} cy={y - 3.5 * s} r={4.2 * s} fill="#6fbf6a" />
      <circle cx={x + 2.5 * s} cy={y - 4 * s} r={4.6 * s} fill="#83cc7c" />
      <circle cx={x} cy={y - 6.5 * s} r={3.6 * s} fill="#9bd890" />
    </g>
  );
};

/** Massif de fleurs : petites corolles sur un lit de feuilles. */
export const FlowerArt = ({
  u,
  v,
  color,
}: {
  u: number;
  v: number;
  color: string;
}) => {
  const [x, y] = iso(u, v, 0);
  const dots: Pt[] = [
    [-6, -2],
    [-2, -4],
    [3, -3],
    [6, -1],
    [-3, 1],
    [2, 1],
  ];
  return (
    <g>
      <ellipse cx={x} cy={y - 1} rx={10} ry={4.6} fill="#7fc276" />
      {dots.map(([dx, dy], i) => (
        <circle
          key={i}
          cx={x + dx}
          cy={y + dy - 1}
          r={1.9}
          fill={i % 3 === 2 ? '#ffffff' : color}
        />
      ))}
    </g>
  );
};

/** Aire de jeux : bac à sable, portique de balançoire, toboggan. */
export const PlaygroundArt = ({ u, v }: { u: number; v: number }) => {
  const [x, y] = iso(u, v, 0);
  return (
    <g>
      <ellipse cx={x} cy={y} rx={26} ry={13} fill="#f3e3bf" />
      {/* Portique */}
      <path
        d={`M${f1(x - 14)} ${f1(y + 2)} L${f1(x - 10)} ${f1(y - 20)} L${f1(x - 6)} ${f1(y + 2)} M${f1(x + 6)} ${f1(y - 6)} L${f1(x + 10)} ${f1(y - 28)} L${f1(x + 14)} ${f1(y - 6)} M${f1(x - 10)} ${f1(y - 20)} L${f1(x + 10)} ${f1(y - 28)}`}
        stroke="#ef4444"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${f1(x - 2)} ${f1(y - 23)} L${f1(x - 2)} ${f1(y - 10)} M${f1(x + 3)} ${f1(y - 25)} L${f1(x + 3)} ${f1(y - 12)}`}
        stroke="#9aa1b4"
        strokeWidth={0.9}
      />
      <rect x={x - 4} y={y - 11} width={8} height={2.2} rx={1} fill="#3b82f6" />
      {/* Toboggan */}
      <path
        d={`M${f1(x + 16)} ${f1(y + 4)} L${f1(x + 16)} ${f1(y - 12)} L${f1(x + 21)} ${f1(y - 12)} L${f1(x + 29)} ${f1(y + 3)}`}
        stroke="#f59e0b"
        strokeWidth={2.2}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Deux enfants */}
      <circle cx={x - 18} cy={y - 7} r={2.2} fill="#f1c7a6" />
      <rect x={x - 20} y={y - 5} width={4} height={6} rx={1.6} fill="#ec4899" />
      <circle cx={x + 24} cy={y - 9} r={2.2} fill="#f1c7a6" />
      <rect x={x + 22} y={y - 7} width={4} height={6} rx={1.6} fill="#14b8a6" />
    </g>
  );
};

/** Table de terrasse sous un parasol, deux personnes attablées. */
export const TerraceArt = ({
  u,
  v,
  color,
}: {
  u: number;
  v: number;
  color: string;
}) => {
  const [x, y] = iso(u, v, 0);
  return (
    <g>
      <ellipse cx={x} cy={y + 1} rx={11} ry={5} fill="rgba(40,36,80,0.10)" />
      <circle cx={x - 7} cy={y - 7} r={2.1} fill="#f1c7a6" />
      <rect
        x={x - 9}
        y={y - 5}
        width={4.2}
        height={6}
        rx={1.6}
        fill="#6366f1"
      />
      <circle cx={x + 7} cy={y - 6} r={2.1} fill="#8d5a3b" />
      <rect
        x={x + 5}
        y={y - 4}
        width={4.2}
        height={6}
        rx={1.6}
        fill="#f97316"
      />
      <ellipse cx={x} cy={y - 4} rx={5} ry={2.4} fill="#ffffff" />
      <rect x={x - 0.7} y={y - 22} width={1.4} height={18} fill="#9aa1b4" />
      <path
        d={`M${f1(x - 13)} ${f1(y - 18)} Q${f1(x)} ${f1(y - 30)} ${f1(x + 13)} ${f1(y - 18)} Z`}
        fill={color}
      />
      <path
        d={`M${f1(x - 13)} ${f1(y - 18)} Q${f1(x - 6)} ${f1(y - 25)} ${f1(x)} ${f1(y - 26)} L${f1(x)} ${f1(y - 18)} Z`}
        fill="#ffffff"
        opacity={0.35}
      />
    </g>
  );
};

/** Pique-nique dans le bois : nappe à carreaux, panier, deux personnes. */
export const PicnicArt = ({ u, v }: { u: number; v: number }) => {
  const sq = 0.07;
  const cells: ReactNode[] = [];
  for (let a = 0; a < 3; a++)
    for (let b = 0; b < 3; b++)
      cells.push(
        <path
          key={`${a}${b}`}
          d={pathOf([
            iso(u - 1.5 * sq + a * sq, v - 1.5 * sq + b * sq),
            iso(u - 0.5 * sq + a * sq, v - 1.5 * sq + b * sq),
            iso(u - 0.5 * sq + a * sq, v - 0.5 * sq + b * sq),
            iso(u - 1.5 * sq + a * sq, v - 0.5 * sq + b * sq),
          ])}
          fill={(a + b) % 2 ? '#ffffff' : '#ef4444'}
        />
      );
  const [x, y] = iso(u, v, 0);
  return (
    <g>
      {cells}
      <rect x={x - 3} y={y - 6} width={6} height={5} rx={1.2} fill="#b98656" />
      <circle cx={x - 14} cy={y - 8} r={2.2} fill="#f1c7a6" />
      <rect
        x={x - 16}
        y={y - 6}
        width={4.4}
        height={6}
        rx={1.8}
        fill="#22c55e"
      />
      <circle cx={x + 13} cy={y - 6} r={2.2} fill="#8d5a3b" />
      <rect
        x={x + 11}
        y={y - 4}
        width={4.4}
        height={6}
        rx={1.8}
        fill="#6366f1"
      />
    </g>
  );
};

/** Cartons et palettes de la cour des ateliers. */
export const CrateArt = ({ u, v, h }: { u: number; v: number; h: number }) => (
  <Box
    b={[u - 0.04, v - 0.04, u + 0.04, v + 0.04, 0, h]}
    top="#ecc391"
    lit="#dca46a"
    shade="#c88d52"
  />
);

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
  const l = 0.075;
  const t = 0.024;
  const [u0, u1, v0, v1] =
    along === 'u' ? [u - l, u + l, v - t, v + t] : [u - t, u + t, v - l, v + l];
  const seat = box(u0, v0, u1, v1, 5, 8);
  const back =
    along === 'u'
      ? box(u0, v0 - 0.012, u1, v0, 8, 15)
      : box(u0 - 0.012, v0, u0, v1, 8, 15);
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

/** Ellipse d'un cercle posé au sol (rayon r, en unités de sol). */
const groundEllipse = (u: number, v: number, r: number, z = 0) => {
  const [x, y] = iso(u, v, z);
  const [x1] = iso(u + r, v - r, z);
  const [, y1] = iso(u + r, v + r, z);
  return { cx: x, cy: y, rx: x1 - x, ry: y1 - y };
};

/** La fontaine de la place : bassin de pierre, eau, jet (il danse). */
export const FountainArt = () => {
  const { u, v, r } = FOUNTAIN;
  const rim = groundEllipse(u, v, r, 0);
  const rimTop = groundEllipse(u, v, r, 7);
  const water = groundEllipse(u, v, r * 0.8, 7);
  const [jx, jy] = iso(u, v, 7);
  return (
    <g>
      <ellipse {...rim} fill="#cfd4e2" />
      <path
        d={`M${f1(rim.cx - rim.rx)} ${f1(rim.cy)} L${f1(rimTop.cx - rimTop.rx)} ${f1(rimTop.cy)} A${f1(rimTop.rx)} ${f1(rimTop.ry)} 0 0 0 ${f1(rimTop.cx + rimTop.rx)} ${f1(rimTop.cy)} L${f1(rim.cx + rim.rx)} ${f1(rim.cy)} A${f1(rim.rx)} ${f1(rim.ry)} 0 0 1 ${f1(rim.cx - rim.rx)} ${f1(rim.cy)} Z`}
        fill="#dfe3ee"
      />
      <ellipse {...rimTop} fill="#eef0f6" />
      <ellipse {...water} fill="#a5c8fb" />
      <ellipse
        cx={water.cx - water.rx * 0.25}
        cy={water.cy - water.ry * 0.2}
        rx={water.rx * 0.4}
        ry={water.ry * 0.3}
        fill="#cfe2fd"
      />
      <g
        className="vg-jet"
        style={{ transformOrigin: `${f1(jx)}px ${f1(jy)}px` }}
      >
        <path
          d={`M${f1(jx - 2)} ${f1(jy)} Q${f1(jx)} ${f1(jy - 30)} ${f1(jx + 2)} ${f1(jy)} Z`}
          fill="#dbeafe"
        />
        <circle cx={jx - 7} cy={jy - 14} r={1.6} fill="#bfdbfe" />
        <circle cx={jx + 7} cy={jy - 12} r={1.6} fill="#bfdbfe" />
        <circle cx={jx} cy={jy - 26} r={2.2} fill="#ffffff" />
      </g>
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
    <svg width={42} height={31} viewBox="0 0 60 44" aria-hidden="true">
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

/** Voiture vue de trois quarts, allongée le long de u ou de v. */
export const CarArt = ({ axis, color }: { axis: 'u' | 'v'; color: string }) => {
  // Projection locale (même angle que la carte, à l'échelle de la voiture).
  const P = (a: number, b: number, z: number): Pt => {
    const [u, v] = axis === 'u' ? [a, b] : [b, a];
    return [17 + (u - v) * 20, 14 + (u + v) * 11.5 - z];
  };
  const box3 = (
    a0: number,
    b0: number,
    a1: number,
    b1: number,
    z0: number,
    z1: number
  ) => {
    const q = (pts: [number, number, number][]) =>
      pathOf(pts.map(([a, b, z]) => P(a, b, z)));
    // Faces visibles : dessus, face +v (éclairée), face +u (ombrée).
    const [u0, u1, v0, v1] = axis === 'u' ? [a0, a1, b0, b1] : [b0, b1, a0, a1];
    const corner = (
      u: number,
      v: number,
      z: number
    ): [number, number, number] => (axis === 'u' ? [u, v, z] : [v, u, z]);
    return {
      top: q([
        corner(u0, v0, z1),
        corner(u1, v0, z1),
        corner(u1, v1, z1),
        corner(u0, v1, z1),
      ]),
      lit: q([
        corner(u0, v1, z0),
        corner(u1, v1, z0),
        corner(u1, v1, z1),
        corner(u0, v1, z1),
      ]),
      shade: q([
        corner(u1, v0, z0),
        corner(u1, v1, z0),
        corner(u1, v1, z1),
        corner(u1, v0, z1),
      ]),
    };
  };
  const body = box3(-0.34, -0.16, 0.34, 0.16, 2, 9);
  const cabin = box3(-0.14, -0.13, 0.18, 0.13, 9, 15);
  const wheel = (a: number, b: number) => {
    const [x, y] = P(a, b, 2);
    return (
      <ellipse key={`${a}${b}`} cx={x} cy={y} rx={2.6} ry={2} fill="#2b2f3a" />
    );
  };
  return (
    <svg width={34} height={28} viewBox="0 0 34 28" aria-hidden="true">
      <ellipse cx={17} cy={21} rx={14} ry={5} fill="rgba(30,30,60,0.14)" />
      {wheel(-0.22, 0.16)}
      {wheel(0.22, 0.16)}
      <path d={body.lit} fill={color} />
      <path d={body.shade} fill={color} opacity={0.82} />
      <path d={body.top} fill={color} opacity={0.65} />
      <path d={cabin.lit} fill="#cfe2fd" />
      <path d={cabin.shade} fill="#a9c8f5" />
      <path d={cabin.top} fill="#ffffff" />
      {wheel(0.22, -0.16)}
    </svg>
  );
};

/** Cycliste (vu de profil), maillot de la couleur donnée. */
export const BikeArt = ({ shirt }: { shirt: string }) => (
  <svg width={16} height={18} viewBox="0 0 16 18" aria-hidden="true">
    <ellipse cx={8} cy={16.6} rx={7} ry={1.3} fill="rgba(30,30,60,0.15)" />
    <circle
      cx={3.6}
      cy={13}
      r={3}
      fill="none"
      stroke="#2b2f3a"
      strokeWidth={1.2}
    />
    <circle
      cx={12.4}
      cy={13}
      r={3}
      fill="none"
      stroke="#2b2f3a"
      strokeWidth={1.2}
    />
    <path
      d="M3.6 13 L7 8.5 L12.4 13 M7 8.5 L10.5 8.5"
      stroke="#6b7280"
      strokeWidth={1.2}
      fill="none"
    />
    <rect x={6} y={3.6} width={4} height={5.4} rx={1.6} fill={shirt} />
    <circle cx={8.4} cy={2.4} r={2} fill="#f1c7a6" />
  </svg>
);

/** Canard (vu de trois quarts). */
export const DuckArt = () => (
  <svg width={11} height={8} viewBox="0 0 11 8" aria-hidden="true">
    <ellipse cx={5} cy={5.4} rx={4.2} ry={2.4} fill="#ffffff" />
    <circle cx={8} cy={3} r={1.8} fill="#ffffff" />
    <path d="M9.6 3 L11 3.5 L9.6 3.9 Z" fill="#f59e0b" />
    <circle cx={8.3} cy={2.6} r={0.4} fill="#111827" />
  </svg>
);

/** Passant (vu de face), tee-shirt de la couleur donnée. */
export const WalkerArt = ({ shirt }: { shirt: string }) => (
  <svg width={10} height={19} viewBox="0 0 12 22" aria-hidden="true">
    <ellipse cx={6} cy={20.5} rx={4.5} ry={1.5} fill="rgba(30,30,60,0.15)" />
    <rect x={3.2} y={13} width={2.2} height={7} rx={1} fill="#2b2f3a" />
    <rect x={6.6} y={13} width={2.2} height={7} rx={1} fill="#2b2f3a" />
    <rect x={2.5} y={6.5} width={7} height={8} rx={2.5} fill={shirt} />
    <circle cx={6} cy={4} r={3} fill="#f1c7a6" />
  </svg>
);
