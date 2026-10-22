// Dessins de la ville PEG : un bâtiment par onglet du menu (vingt), les
// arbres, les bancs, la fontaine, le camion et les passants — tracés en SVG à
// partir de la projection de villageScene (aucune image). Chaque bâtiment
// porte la couleur de son quartier et un signe de son onglet (couronne du
// Premium, roue des Paramètres, éolienne des Générateurs…). Lumière en haut
// à gauche : la face « +v » (bas-gauche) est éclairée, la face « +u »
// (bas-droite) ombrée. Les pièces qui tournent (classe `vg-spin`) ne bougent
// que sur la carte, animations allumées.
import type { ReactNode } from 'react';
import {
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
 * haut-droite. Une unité au sol vaut 120 px le long d'une façade.
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
const litLen = (fp: FP) => (fp[2] - fp[0]) * 120;

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

interface ArtProps {
  fp: FP;
  h: number;
  p: Palette;
}

/** Projets : la tour de verre violette, l'arête sur l'angle avant. */
const Projets = ({ fp, h, p }: ArtProps) => {
  const [, , u1, v1] = fp;
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      {windows(onLit, fp, 3, 6, 10, h - 10, p.win, p.shine, 0.1, 0.07)}
      {windows(onShade, fp, 3, 6, 10, h - 10, p.winS, p.shineS, 0.1, 0.07)}
      <Box
        b={[u1 - 0.03, v1 - 0.03, u1 + 0.008, v1 + 0.008, 0, h + 8]}
        top={p.accentL}
        lit={p.accent}
        shade={p.accentD}
      />
      <path d={onLit(fp, 0.38, 0.62, 0, 22)} fill="#3f33c9" />
      <path d={onLit(fp, 0.4, 0.49, 2, 20)} fill="#6b5ff0" />
      <Roof fp={fp} h={h} p={p} />
    </>
  );
};

/** Accueil : la maison, toit pointu violet, porte et lanterne. */
const Accueil = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const vc = (v0 + v1) / 2;
  const r = 30;
  const o = 0.03;
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit="#f5f2ff" shade="#e2dcfb" />
      {windows(onLit, fp, 2, 1, 22, h - 8, p.win, p.shine, 0.12, 0.42)}
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
        d={`M${f1(iso(u0 - o, vc, h + r)[0])} ${f1(iso(u0 - o, vc, h + r)[1])} L${f1(iso(u1 + o, vc, h + r)[0])} ${f1(iso(u1 + o, vc, h + r)[1])}`}
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
    </>
  );
};

/** Calendrier : une page de calendrier sur la façade. */
const Calendrier = ({ fp, h, p }: ArtProps) => (
  <>
    <Body fp={fp} h={h} p={p} cols={[3, 2]} from={24} />
    <g transform={plane(fp, 'lit', 0.5, h - 6)}>
      <rect x={-15} y={0} width={30} height={26} rx={3} fill="#ffffff" />
      <rect x={-15} y={0} width={30} height={8} rx={3} fill={p.accent} />
      <rect x={-15} y={5} width={30} height={3} fill={p.accent} />
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => (
          <rect
            key={`${c}${r}`}
            x={-10 + c * 8}
            y={12 + r * 6}
            width={4.5}
            height={3.5}
            rx={1}
            fill={c === 1 && r === 0 ? '#ef4444' : '#c7c2f4'}
          />
        ))
      )}
    </g>
  </>
);

/** Clients : immeuble bleu, auvent au-dessus de la porte. */
const Clients = ({ fp, h, p }: ArtProps) => {
  const [u0, , u1, v1] = fp;
  const a = u0 + (u1 - u0) * 0.56;
  const b = u0 + (u1 - u0) * 0.9;
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} from={34} door={false} />
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
    </>
  );
};

/** Leads : panneau à éclair sur le toit. */
const Leads = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.5, 0.42);
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[2, 2]} cube={false} />
      <Mast at={[x, y]} len={8} color={p.accentD} />
      <circle cx={x} cy={y - 18} r={11} fill={p.accent} />
      <circle
        cx={x}
        cy={y - 18}
        r={11}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.6}
      />
      <path
        d={`M${f1(x + 1.5)} ${f1(y - 26)} L${f1(x - 4)} ${f1(y - 17)} L${f1(x)} ${f1(y - 17)} L${f1(x - 1.5)} ${f1(y - 10)} L${f1(x + 4)} ${f1(y - 19)} L${f1(x)} ${f1(y - 19)} Z`}
        fill="#fde047"
      />
    </>
  );
};

/** Premium : bandeau doré, couronne sur le toit. */
const Premium = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h);
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
      <path d={onLit(fp, 0, 1, h - 7, h)} fill="#f6c445" />
      <path d={onShade(fp, 0, 1, h - 7, h)} fill="#d99a1e" />
      <path
        d={`M${f1(x - 11)} ${f1(y - 4)} L${f1(x - 12)} ${f1(y - 17)} L${f1(x - 5.5)} ${f1(y - 11)} L${f1(x)} ${f1(y - 21)} L${f1(x + 5.5)} ${f1(y - 11)} L${f1(x + 12)} ${f1(y - 17)} L${f1(x + 11)} ${f1(y - 4)} Z`}
        fill="#f6c445"
        stroke="#d99a1e"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {[-12, 0, 12].map((dx) => (
        <circle
          key={dx}
          cx={x + dx}
          cy={y - (dx ? 18 : 22)}
          r={1.9}
          fill="#fff3c4"
        />
      ))}
    </>
  );
};

/** Panneau publicitaire posé sur le toit, face à la rue (façade éclairée). */
const Billboard = ({
  fp,
  h,
  p,
  children,
}: ArtProps & { children: ReactNode }) => {
  const L = litLen(fp);
  const w = Math.min(46, L * 0.8);
  return (
    <>
      <g transform={plane(fp, 'lit', 0.5, h + 26)}>
        <rect x={-w / 2 + 6} y={18} width={2.4} height={10} fill="#9aa1b4" />
        <rect x={w / 2 - 8.4} y={18} width={2.4} height={10} fill="#9aa1b4" />
        <rect
          x={-w / 2}
          y={0}
          width={w}
          height={20}
          rx={2.5}
          fill="#ffffff"
          stroke={p.accentD}
          strokeWidth={1.2}
        />
        {children}
      </g>
    </>
  );
};

/** Campagnes : panneau au mégaphone sur le toit. */
const Campagnes = ({ fp, h, p }: ArtProps) => (
  <>
    <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
    <Billboard fp={fp} h={h} p={p}>
      <rect x={-21} y={2} width={42} height={16} rx={2} fill={p.shine} />
      <path d="M-9 7 L-3 7 L6 3 L6 17 L-3 13 L-9 13 Z" fill={p.accentD} />
      <path
        d="M9 6 Q12 10 9 14 M12 4 Q16.5 10 12 16"
        stroke="#ffffff"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
    </Billboard>
  </>
);

/** Producteurs : l'atelier — façade orange, porte de garage, haute cheminée. */
const Producteurs = ({ fp, h, p }: ArtProps) => {
  const [u0, v0, u1, v1] = fp;
  const slats: ReactNode[] = [];
  for (let z = 7; z < 44; z += 7)
    slats.push(
      <path key={z} d={onLit(fp, 0.1, 0.56, z, z + 1.2)} fill="#8a94a6" />
    );
  const cu = u0 + (u1 - u0) * 0.74;
  const cv = v0 + (v1 - v0) * 0.26;
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit="#f8a165" shade="#eceef3" />
      <path d={onLit(fp, 0, 1, h - 12, h)} fill="#ffe2cc" />
      <path d={onLit(fp, 0.1, 0.56, 0, 44)} fill="#a8b1c0" />
      {slats}
      <path d={onLit(fp, 0.66, 0.9, 26, 50)} fill="#5b8def" />
      <path d={onLit(fp, 0.66, 0.74, 38, 50)} fill="#9cc0fb" />
      {windows(onShade, fp, 2, 1, 28, h - 18, '#5b8def', '#9cc0fb', 0.16, 0.14)}
      <Roof fp={fp} h={h} p={p} cube={false} />
      <Box
        b={[cu - 0.04, cv - 0.04, cu + 0.04, cv + 0.04, h, h + 40]}
        top="#d6d9e2"
        lit="#eceef3"
        shade="#c5cad5"
      />
      <path
        d={pathOf([
          iso(cu - 0.04, cv + 0.04, h + 30),
          iso(cu + 0.04, cv + 0.04, h + 30),
          iso(cu + 0.04, cv + 0.04, h + 35),
          iso(cu - 0.04, cv + 0.04, h + 35),
        ])}
        fill={p.accent}
      />
    </>
  );
};

/** Planning : tableau de charge (barres de couleur) sur la façade. */
const Planning = ({ fp, h, p }: ArtProps) => {
  const L = litLen(fp);
  const w = Math.min(40, L * 0.7);
  const bars: [number, number, string][] = [
    [0, 0.55, '#f97316'],
    [0.25, 0.8, '#7c6cff'],
    [0.1, 0.45, '#14b8a6'],
    [0.45, 1, '#3b82f6'],
  ];
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} />
      <g transform={plane(fp, 'lit', 0.5, h - 6)}>
        <rect x={-w / 2} y={0} width={w} height={26} rx={3} fill="#ffffff" />
        {bars.map(([a, b, c], i) => (
          <rect
            key={i}
            x={-w / 2 + 3 + a * (w - 6)}
            y={4 + i * 5.4}
            width={(b - a) * (w - 6)}
            height={3.4}
            rx={1.5}
            fill={c}
          />
        ))}
      </g>
    </>
  );
};

/** Fournisseurs : l'entrepôt — grande porte de quai et cartons empilés. */
const Fournisseurs = ({ fp, h, p }: ArtProps) => {
  const [, v0, u1, v1] = fp;
  const slats: ReactNode[] = [];
  for (let z = 6; z < 40; z += 6)
    slats.push(
      <path key={z} d={onLit(fp, 0.08, 0.6, z, z + 1.1)} fill="#8a94a6" />
    );
  const crates: [number, number, number, number][] = [
    [u1 + 0.025, v1 - 0.16, 0, 13],
    [u1 + 0.025, v1 - 0.08, 0, 13],
    [u1 + 0.03, v1 - 0.14, 13, 25],
  ];
  return (
    <>
      <Box b={[...fp, 0, h]} top="#f1efec" lit="#e7e3de" shade="#d6d0c8" />
      <path d={onLit(fp, 0, 1, h - 9, h)} fill={p.accent} />
      <path d={onShade(fp, 0, 1, h - 9, h)} fill={p.accentD} />
      <path d={onLit(fp, 0.08, 0.6, 0, 40)} fill="#a8b1c0" />
      {slats}
      <path d={onLit(fp, 0.7, 0.9, 0, 24)} fill="#6b7280" />
      {windows(onShade, fp, 3, 1, 26, h - 14, '#9cc0fb', '#dbe8fd', 0.1, 0.1)}
      {/* Toit : nervures de tôle */}
      <Roof fp={fp} h={h} p={{ ...p, rim: '#ebe6df' }} cube={false} />
      {[0.25, 0.5, 0.75].map((t) => (
        <path
          key={t}
          d={`M${f1(iso(fp[0] + 0.02, v0 + (v1 - v0) * t, h)[0])} ${f1(iso(fp[0] + 0.02, v0 + (v1 - v0) * t, h)[1])} L${f1(iso(u1 - 0.02, v0 + (v1 - v0) * t, h)[0])} ${f1(iso(u1 - 0.02, v0 + (v1 - v0) * t, h)[1])}`}
          stroke="#d6d0c8"
          strokeWidth={1.2}
        />
      ))}
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

/** Boutique : vitrines et store rayé rouge et blanc. */
const Boutique = ({ fp, h, p }: ArtProps) => {
  const [u0, , u1, v1] = fp;
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
          iso(b, v1 + 0.06, 30),
          iso(a, v1 + 0.06, 30),
        ])}
        fill={i % 2 ? '#ffffff' : '#f43f6b'}
      />
    );
  }
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      {windows(onLit, fp, 3, 1, 46, h - 8, p.win, p.shine, 0.12, 0.1)}
      {windows(onShade, fp, 2, 1, 46, h - 8, p.winS, p.shineS, 0.16, 0.12)}
      <path d={onLit(fp, 0.08, 0.42, 3, 28)} fill="#ffd6e4" />
      <path d={onLit(fp, 0.1, 0.24, 15, 26)} fill="#ffffff" opacity={0.7} />
      <path d={onLit(fp, 0.58, 0.92, 3, 28)} fill="#ffd6e4" />
      <path d={onLit(fp, 0.44, 0.56, 0, 26)} fill="#e8467a" />
      {stripes}
      <path d={onShade(fp, 0.18, 0.82, 5, 28)} fill="#f8b6cc" />
      <Roof fp={fp} h={h} p={p} />
    </>
  );
};

/** Attributs : nuancier de couleurs sur la façade (tailles, couleurs). */
const Attributs = ({ fp, h, p }: ArtProps) => {
  const colors = [
    '#f43f5e',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ];
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[2, 2]} />
      <g transform={plane(fp, 'lit', 0.5, h - 8)}>
        <rect x={-17} y={0} width={34} height={22} rx={3} fill="#ffffff" />
        {colors.map((c, i) => (
          <rect
            key={c}
            x={-14 + (i % 3) * 10}
            y={3 + Math.floor(i / 3) * 9.5}
            width={8}
            height={7}
            rx={1.6}
            fill={c}
          />
        ))}
      </g>
    </>
  );
};

/** Bannières : grande affiche sur le toit, oriflamme sur la façade. */
const Bannieres = ({ fp, h, p }: ArtProps) => (
  <>
    <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
    <g transform={plane(fp, 'lit', 0.16, h - 10)}>
      <path d="M0 0 L9 0 L9 24 L4.5 20 L0 24 Z" fill={p.accent} />
    </g>
    <Billboard fp={fp} h={h} p={p}>
      <rect x={-21} y={2} width={42} height={16} rx={2} fill="#fde0ea" />
      <circle cx={11} cy={7} r={3.2} fill="#fbbf24" />
      <path d="M-21 18 L-9 8 L-1 14 L7 9 L21 18 Z" fill={p.accent} />
    </Billboard>
  </>
);

/** Finance : la banque — colonnes blanches, fronton, marches. */
const Finance = ({ fp, h, p }: ArtProps) => {
  const [u0, , u1, v1] = fp;
  const pillars: ReactNode[] = [];
  for (const s of [0.16, 0.36, 0.56, 0.76])
    pillars.push(
      <path
        key={s}
        d={onLit(fp, s, s + 0.07, 0, h - 16, 0.012)}
        fill="#ffffff"
      />,
      <path
        key={`${s}o`}
        d={onLit(fp, s + 0.05, s + 0.07, 0, h - 16, 0.012)}
        fill="#d7ebe6"
      />
    );
  return (
    <>
      <Box b={[...fp, 0, h]} top={p.top} lit={p.lit} shade={p.shade} />
      {windows(onLit, fp, 4, 2, 10, h - 20, p.win, p.shine, 0.1, 0.11)}
      {windows(onShade, fp, 2, 2, 10, h - 20, p.winS, p.shineS, 0.16, 0.12)}
      {pillars}
      <path d={onLit(fp, 0, 1, h - 16, h - 3)} fill={p.accent} />
      <path d={onShade(fp, 0, 1, h - 16, h - 3)} fill={p.accentD} />
      <Box
        b={[u0 + 0.07, v1, u1 - 0.07, v1 + 0.045, 0, 4]}
        top="#ffffff"
        lit="#e6efed"
        shade="#d4e3df"
      />
      <Roof fp={fp} h={h} p={p} />
    </>
  );
};

/** Générateurs : une éolienne sur le toit (elle tourne). */
const Generateurs = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.5, 0.45);
  const hub: Pt = [x, y - 34];
  const blade = (a: number) => {
    const r = 15;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tip: Pt = [hub[0] + ca * r, hub[1] + sa * r];
    const side: Pt = [hub[0] - sa * 2.2, hub[1] + ca * 2.2];
    return `M${f1(hub[0])} ${f1(hub[1])} L${f1(side[0])} ${f1(side[1])} L${f1(tip[0])} ${f1(tip[1])} Z`;
  };
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[2, 2]} cube={false} />
      <path
        d={`M${f1(x - 1.6)} ${f1(y)} L${f1(hub[0] - 0.8)} ${f1(hub[1])} L${f1(hub[0] + 0.8)} ${f1(hub[1])} L${f1(x + 1.6)} ${f1(y)} Z`}
        fill="#e6efed"
        stroke="#bde6db"
        strokeWidth={0.6}
      />
      <g
        className="vg-spin"
        style={{ transformOrigin: `${f1(hub[0])}px ${f1(hub[1])}px` }}
      >
        {[0, 2.094, 4.189].map((a) => (
          <path
            key={a}
            d={blade(a - Math.PI / 2)}
            fill="#eef2f8"
            stroke="#94a3b8"
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        ))}
      </g>
      <circle cx={hub[0]} cy={hub[1]} r={2.6} fill={p.accent} />
    </>
  );
};

/** Devis : une feuille de devis cochée, sur le toit. */
const Devis = ({ fp, h, p }: ArtProps) => (
  <>
    <Body fp={fp} h={h} p={p} cols={[2, 2]} cube={false} />
    <g transform={plane(fp, 'lit', 0.5, h + 24)}>
      <rect x={-1.2} y={20} width={2.4} height={8} fill="#9aa1b4" />
      <path d="M-11 0 L6 0 L11 5 L11 22 L-11 22 Z" fill="#ffffff" />
      <path d="M6 0 L6 5 L11 5 Z" fill="#d7ebe6" />
      <path
        d="M-7 6 L3 6 M-7 10 L5 10 M-7 14 L1 14"
        stroke="#9aa1b4"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <path
        d="M-1 17 L2 20 L8 13"
        stroke={p.accent}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </>
);

/** Tickets : le centre d'assistance, une bouée sur la façade. */
const Tickets = ({ fp, h, p }: ArtProps) => (
  <>
    <Body fp={fp} h={h} p={p} cols={[3, 2]} />
    <g transform={plane(fp, 'lit', 0.5, h - 7)}>
      <circle cx={0} cy={12} r={11.5} fill="#ffffff" />
      <circle
        cx={0}
        cy={12}
        r={8.6}
        fill="none"
        stroke="#ef4444"
        strokeWidth={5.6}
        strokeDasharray="6.75 6.75"
      />
      <circle cx={0} cy={12} r={5.2} fill={p.lit} />
    </g>
  </>
);

/** IA : antenne parabolique et étincelles sur le toit. */
const Ia = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.55, 0.45);
  const star = (cx: number, cy: number, r: number) =>
    `M${f1(cx)} ${f1(cy - r)} Q${f1(cx)} ${f1(cy)} ${f1(cx + r)} ${f1(cy)} Q${f1(cx)} ${f1(cy)} ${f1(cx)} ${f1(cy + r)} Q${f1(cx)} ${f1(cy)} ${f1(cx - r)} ${f1(cy)} Q${f1(cx)} ${f1(cy)} ${f1(cx)} ${f1(cy - r)} Z`;
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} cube={false} />
      <Mast at={[x, y]} len={9} color={p.accentD} width={2.4} />
      <ellipse
        cx={x - 2}
        cy={y - 15}
        rx={11}
        ry={6.5}
        transform={`rotate(-28 ${f1(x - 2)} ${f1(y - 15)})`}
        fill="#ffffff"
        stroke={p.accentD}
        strokeWidth={1.4}
      />
      <path
        d={`M${f1(x - 2)} ${f1(y - 15)} L${f1(x + 5)} ${f1(y - 24)}`}
        stroke={p.accentD}
        strokeWidth={1.2}
      />
      <circle cx={x + 5} cy={y - 24} r={1.8} fill={p.accent} />
      <path
        className="vg-twinkle"
        d={star(x + 13, y - 26, 4.5)}
        fill="#fbbf24"
      />
      <path
        className="vg-twinkle vg-twinkle2"
        d={star(x - 13, y - 25, 3.2)}
        fill={p.accentL}
      />
    </>
  );
};

/** Utilisateurs : l'immeuble d'habitation, balcons sur la façade. */
const Utilisateurs = ({ fp, h, p }: ArtProps) => {
  const rows = Math.max(1, Math.round((h - 26 - 8) / 21));
  const rh = (h - 26 - 8) / rows;
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[3, 2]} />
      {Array.from({ length: rows }, (_, r) => {
        const z = 26 + r * rh + rh * 0.12;
        return (
          <g key={r}>
            <path d={onLit(fp, 0.06, 0.94, z - 3, z, 0.035)} fill="#ffffff" />
            <path
              d={pathOf([
                iso(fp[0] + (fp[2] - fp[0]) * 0.06, fp[3], z),
                iso(fp[0] + (fp[2] - fp[0]) * 0.94, fp[3], z),
                iso(fp[0] + (fp[2] - fp[0]) * 0.94, fp[3] + 0.035, z),
                iso(fp[0] + (fp[2] - fp[0]) * 0.06, fp[3] + 0.035, z),
              ])}
              fill="#f8f7ff"
            />
          </g>
        );
      })}
    </>
  );
};

/** Paramètres : une grande roue dentée sur le toit (elle tourne). */
const Parametres = ({ fp, h, p }: ArtProps) => {
  const [x, y] = roofPoint(fp, h, 0.5, 0.45);
  const c: Pt = [x, y - 16];
  return (
    <>
      <Body fp={fp} h={h} p={p} cols={[2, 2]} cube={false} />
      <path
        d={`M${f1(x - 5)} ${f1(y)} L${f1(c[0] - 2)} ${f1(c[1])} L${f1(c[0] + 2)} ${f1(c[1])} L${f1(x + 5)} ${f1(y)} Z`}
        fill={p.shade}
      />
      <g
        className="vg-spin vg-spin-slow"
        style={{ transformOrigin: `${f1(c[0])}px ${f1(c[1])}px` }}
      >
        <path d={gearPath(c[0], c[1], 13)} fill={p.accent} />
        <circle cx={c[0]} cy={c[1]} r={4.6} fill="#ffffff" />
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

/** Arbre rond, deux tons de vert, ombre au sol. */
export const TreeArt = ({ u, v, s }: { u: number; v: number; s: number }) => {
  const [x, y] = iso(u, v, 4);
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
