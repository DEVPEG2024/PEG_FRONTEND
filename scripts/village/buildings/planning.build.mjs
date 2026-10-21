// Village PEG — « Planning » : le bureau d'ordonnancement (réf. « Mes BAT » de ref.png).
// Plan en L, toit plat bleu nuit à rebord, grande baie vitrée (bureau, écrans, planificatrice),
// GRAND TABLEAU DE PLANNING façon Gantt sur la façade +x (barres colorées en cascade, aimants,
// ligne « aujourd'hui »), une collègue qui y pose un aimant, entrée sous auvent, jardinière, arbres.
//   node buildings/planning.build.mjs && node tools/lint.mjs buildings/planning.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, compose, contactShadow, svgDoc, tint } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, pottedPlant, bounds, BENCH_SEAT } from '../tools/props.mjs';

const ID = 'planning', TITLE = 'Planning';
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };

/* ───────────── petits outils ───────────── */
const defs = [];
const seen = new Set();
const stopsOf = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
/** Dégradé linéaire (boîte englobante, vertical par défaut ; user = coordonnées écran). */
function lin(name, stops, dir = [0, 0, 0, 1], user = false) {
  const id = `${ID}-${name}`;
  if (!seen.has(id)) {
    seen.add(id);
    defs.push(`<linearGradient id="${id}" x1="${r1(dir[0])}" y1="${r1(dir[1])}" x2="${r1(dir[2])}" y2="${r1(dir[3])}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stopsOf(stops)}</linearGradient>`);
  }
  return `url(#${id})`;
}
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${o}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const FE = (d, fill, o) => `<path d="${d}" fill="${fill}" fill-rule="evenodd"${op(o)}/>`;
const S = (d, color, w, o) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
// Coordonnées « de façade » (u le long du mur, z) → monde.
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z])); // façade +y (éclairée), u = x
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z])); // façade +x (ombrée), u = y
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];
/** Pavé coloré (faces +x, +y, dessus). */
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + F(b.top, c.top); };
/** Repère local d'une façade (u vers la droite de l'écran, v vers le bas), origine au coin haut-gauche. */
const gY = (Y, x0, zTop, inner) => { const [a, b] = P(x0, Y, zTop); return `<g transform="matrix(0.866,0.5,0,1,${r1(a)},${r1(b)})">${inner}</g>`; };
const gX = (X, y0, zTop, inner) => { const [a, b] = P(X, y0, zTop); return `<g transform="matrix(0.866,-0.5,0,1,${r1(a)},${r1(b)})">${inner}</g>`; };
const rect = (x, y, w, h, fill, o = {}) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${o.rx ? ` rx="${r1(o.rx)}"` : ''} fill="${fill}"${op(o.op)}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 0.8}"` : ''}/>`;
const circ = (c, r, fill, o) => `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}" fill="${fill}"${op(o)}/>`;

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const ROOF = '#34427e', ROOF_L = '#3f4f93', ROOF_D = '#2a376b';
const WALL_L = lin('wall-l', [[0, '#ffffff'], [1, '#eff0f6']]);
const WALL_R = lin('wall-r', [[0, '#e9ebf3'], [1, '#d9dce9']]);
const GLASS_BAY = lin('glass-bay', [[0, '#d4e9ff', 0.82], [0.5, '#a9cdff', 0.4], [1, '#8db7f7', 0.3]]);
const GLASS_L = lin('glass-l', [[0, '#b9d8ff'], [0.5, '#93bdfb'], [1, '#6f9ef5']]);
const EAVE = lin('eave', [[0, NAVY, 0.2], [1, NAVY, 0]]);
const WHITE = { lit: '#f7f7fb', dark: '#dfe2ee', top: '#ffffff' };
const IRON = { lit: '#4b5373', dark: '#363d58', top: '#5d6690' };
const NIGHT = { lit: '#3d4466', dark: '#2b2f45', top: '#4b5375' };

/* ───────────── géométrie ───────────── */
const ZG = 2.5;                 // dessus de la terrasse
const H = 54;                   // haut des murs
const X0 = -48, X1 = 42;        // corps principal : x
const Y0 = -44, YM = 8;         //                   y
const XW = -8, YW = 28;         // aile avant gauche : x ∈ [X0, XW], y ∈ [YM, YW]
const OV = 3.2;                 // débord de la dalle de toit
const ZR0 = H, ZR1 = H + 5.2;   // dalle de toit
const ZP = ZG + 5;              // haut du soubassement
const TX0 = -64, TX1 = 60, TY0 = -56, TY1 = 48; // terrasse

const fM = onY(YM), fW = onY(YW), sW = onX(XW), sM = onX(X1);

/* ───────────── sol : terrasse, joints, ombres ───────────── */
let ground = '';
{
  const ter = box(TX0, TY0, 0, TX1 - TX0, TY1 - TY0, ZG);
  ground += F(ter.right, '#d3d6e3') + F(ter.left, '#e4e6ef') + F(ter.top, lin('ter', [[0, '#f8f8fb'], [1, '#eff0f5']]));
  ground += S(line([[TX0, TY1, ZG], [TX1, TY1, ZG], [TX1, TY0, ZG]]), '#ffffff', 1, 0.95);
  let j = '';
  for (let x = TX0 + 16; x < TX1 - 2; x += 16) j += line([[x, YW + 0.6, ZG], [x, TY1, ZG]]) + ' ';
  for (let x = XW + 16; x < TX1 - 2; x += 16) j += line([[x, YM + 0.6, ZG], [x, YW, ZG]]) + ' ';
  for (let y = YW + 10; y < TY1 - 2; y += 10) j += line([[TX0, y, ZG], [TX1, y, ZG]]) + ' ';
  for (let y = TY0 + 12; y < YM; y += 12) j += line([[X1 + 0.6, y, ZG], [TX1, y, ZG]]) + ' ';
  ground += S(j.trim(), '#e1e3eb', 0.5);
  // allée d'entrée (dalles plus claires) vers la porte de l'aile
  ground += F(poly([[-28, YW, ZG], [-13, YW, ZG], [-13, TY1, ZG], [-28, TY1, ZG]]), '#ffffff', 0.6);
  // ombre portée douce du bâtiment (vers la droite de l'écran)
  const sh = (k, o) => F(poly([[X1, YM, ZG], [X1 + k, YM - k, ZG], [X1 + k, Y0 - k, ZG], [X0 + k, Y0 - k, ZG], [X0, Y0, ZG], [X1, Y0, ZG]].map(([x, y, z]) => [Math.min(x, TX1), Math.max(y, TY0), z])), '#5a4a3a', o);
  ground += sh(20, 0.04) + sh(13, 0.05) + sh(6, 0.06);
  // ombre de pied au ras des façades avant
  ground += F(poly([[XW, YM, ZG], [X1, YM, ZG], [X1 + 2.2, YM + 2.2, ZG], [XW, YM + 2.2, ZG]]), '#5a4a3a', 0.06);
  ground += F(poly([[X0, YW, ZG], [XW, YW, ZG], [XW + 2.2, YW + 2.2, ZG], [X0, YW + 2.2, ZG]]), '#5a4a3a', 0.06);
}

/* ───────────── intérieur du bureau (vu à travers la baie) ───────────── */
// La façade percée (dessinée après) recadre tout ce qui suit : pas besoin de clip-path.
const WX0 = -3, WX1 = 31, WZ0 = ZP, WZ1 = 46, WT = 1.5; // baie de la façade avant du corps principal
const RY = YM - 16;  // mur du fond de la pièce
let inside = '';
{
  const zf = ZG + 0.3, xr = X1 - 4, xl = WX0 - 1;
  // mur du fond (face +y), mur gauche (face +x), sol en bois clair
  inside += F(poly([[xl, RY, zf], [xr, RY, zf], [xr, RY, H], [xl, RY, H]]), lin('in-back', [[0, '#fbfbfe'], [1, '#e9ebf3']]));
  inside += F(poly([[xl, RY, zf], [xl, YM, zf], [xl, YM, H], [xl, RY, H]]), lin('in-left', [[0, '#e3e6f1'], [1, '#d3d7e6']]));
  inside += F(poly([[xl, RY, zf], [xr, RY, zf], [xr, YM, zf], [xl, YM, zf]]), lin('in-floor', [[0, '#e6cfa6'], [1, '#f3e2c4']]));
  let pl = '';
  for (let y = RY + 3; y < YM; y += 3) pl += line([[xl, y, zf], [xr, y, zf]]) + ' ';
  inside += S(pl.trim(), '#d2b48a', 0.35, 0.55);
  inside += F(poly([[xl, RY, zf], [xr, RY, zf], [xr, RY, zf + 1.2], [xl, RY, zf + 1.2]]), '#cdd1e1');
  // petit planning mural au-dessus du bureau
  {
    const bw = 17, bh = 9;
    let g = rect(0.6, 0.7, bw, bh, NAVY, { rx: 0.8, op: 0.1 });
    g += rect(0, 0, bw, bh, '#ffffff', { rx: 0.8, stroke: '#c9cde0', sw: 0.4 });
    g += rect(0, 0, bw, 1.8, '#d9d4ff', { rx: 0.8 });
    [[1.5, 7.5, '#7c6bff'], [5, 11, '#f59e0b'], [8.5, 15.5, '#0ea5e9']].forEach(([a, b, c], i) => { g += rect(a, 3 + i * 1.95, b - a, 1.3, c, { rx: 0.6 }); });
    inside += gY(RY, -1.5, 31, g);
  }
  // bureau blanc contre le fond, deux écrans allumés (barres de planning)
  const DX0 = -2.5, DX1 = 15.5, DY0 = RY + 0.5, DY1 = RY + 7.5, DZ = zf + 11.5;
  for (const [x, y] of [[DX0 + 0.6, DY0 + 0.6], [DX1 - 1.4, DY0 + 0.6], [DX0 + 0.6, DY1 - 1.4], [DX1 - 1.4, DY1 - 1.4]]) inside += cube(x, y, zf, 0.8, 0.8, DZ - zf - 0.8, IRON);
  inside += cube(DX0, DY0, DZ - 0.8, DX1 - DX0, DY1 - DY0, 0.8, WHITE);
  const screen = (x0, x1) => {
    let s = cube((x0 + x1) / 2 - 0.6, DY0 + 1.7, DZ, 1.2, 1, 2, IRON);
    s += cube(x0, DY0 + 1.3, DZ + 2, x1 - x0, 0.8, 6.6, NIGHT);
    const ys = DY0 + 2.12;
    s += F(onY(ys)(R(x0 + 0.5, x1 - 0.5, DZ + 2.5, DZ + 8.1)), '#9ad1ff');
    const w = x1 - x0 - 1;
    [[0.08, 0.55, '#7c6bff'], [0.32, 0.8, '#f59e0b'], [0.55, 0.94, '#14b8a6']].forEach(([a, b, c], i) => {
      s += F(onY(ys + 0.02)(R(x0 + 0.5 + w * a, x0 + 0.5 + w * b, DZ + 6.8 - i * 1.55, DZ + 7.6 - i * 1.55)), c);
    });
    s += F(onY(ys + 0.03)(R(x0 + 0.7, x0 + 2, DZ + 2.7, DZ + 7.9)), '#ffffff', 0.3);
    return s;
  };
  inside += screen(-0.5, 7) + screen(7.8, 15.3);
  inside += cube(2.5, DY1 - 3.2, DZ, 4.6, 1.6, 0.4, { lit: '#d5d9e6', dark: '#b9bed0', top: '#e8eaf2' }); // clavier
  inside += cube(12.5, DY1 - 2.8, DZ, 1.6, 1.6, 2, { lit: '#ef8aa0', dark: '#e06f88', top: '#f7c1cd' });  // tasse
  // suspension au-dessus du bureau (lumière chaude)
  {
    const lx = 6.5, ly = RY + 6, lz = 36;
    inside += S(line([[lx, ly, H], [lx, ly, lz + 3]]), '#4b5373', 0.4);
    const [cx, cy] = P(lx, ly, lz);
    inside += `<ellipse cx="${r1(cx)}" cy="${r1(cy + 2)}" rx="7" ry="4.2" fill="#fff1c2" fill-opacity="0.35"/>`;
    inside += `<path d="M${r1(cx - 1)} ${r1(cy - 3)} L${r1(cx + 1)} ${r1(cy - 3)} L${r1(cx + 3.4)} ${r1(cy + 0.6)} L${r1(cx - 3.4)} ${r1(cy + 0.6)} Z" fill="#f7f7fb"/>`;
    inside += `<path d="M${r1(cx + 0.2)} ${r1(cy - 3)} L${r1(cx + 1)} ${r1(cy - 3)} L${r1(cx + 3.4)} ${r1(cy + 0.6)} L${r1(cx + 1.2)} ${r1(cy + 0.6)} Z" fill="#d9dce8"/>`;
    inside += `<ellipse cx="${r1(cx)}" cy="${r1(cy + 0.6)}" rx="3.4" ry="1" fill="#ffe7a0"/>`;
  }
  // planificatrice assise de dos, face aux écrans
  const sx = 6.8, sy = DY1 + 3.4;
  inside += cube(sx - 0.6, sy - 0.6, zf, 1.2, 1.2, BENCH_SEAT - 1.3, IRON);
  inside += cube(sx - 2.5, sy - 2.5, ZG + BENCH_SEAT - 1.1, 5, 5, 1.1, NIGHT);
  inside += person(sx, sy - 1, { facing: 'back-right', pose: 'sit', z: ZG + BENCH_SEAT, top: '#f59e0b', hairStyle: 'bun', hair: '#5a3a26', rim: false }).svg;
  inside += cube(sx - 2.5, sy + 1.8, ZG + BENCH_SEAT, 5, 0.8, 8, NIGHT);
  // grande plante verte, à droite
  inside += pottedPlant(22, YM - 8, { z: zf, size: 1.15, pot: 'square' }).svg;
  // vitrage (en retrait de WT), reflets et menuiseries
  const gy = YM - WT;
  inside += F(poly([[WX0, gy, WZ0], [WX1, gy, WZ0], [WX1, gy, WZ1], [WX0, gy, WZ1]]), GLASS_BAY);
  let rp = '';
  for (const [a, w] of [[0.12, 0.13], [0.3, 0.04], [0.66, 0.15], [0.84, 0.045]]) {
    const uc = WX0 + (WX1 - WX0) * a, ww = (WX1 - WX0) * w, m = 0.5 * (WZ1 - WZ0) / 2;
    rp += poly([[uc - ww / 2 - m, gy, WZ0], [uc + ww / 2 - m, gy, WZ0], [uc + ww / 2 + m, gy, WZ1], [uc - ww / 2 + m, gy, WZ1]]) + ' ';
  }
  inside += F(rp.trim(), '#ffffff', 0.24);
  let mp = '';
  for (const u of [WX0 + (WX1 - WX0) / 3, WX0 + (2 * (WX1 - WX0)) / 3]) mp += poly([[u - 0.55, gy, WZ0], [u + 0.55, gy, WZ0], [u + 0.55, gy, WZ1], [u - 0.55, gy, WZ1]]) + ' ';
  mp += poly([[WX0, gy, 37.4], [WX1, gy, 37.4], [WX1, gy, 38.6], [WX0, gy, 38.6]]) + ' ';
  mp += poly([[WX0, gy, WZ0], [WX1, gy, WZ0], [WX1, gy, WZ0 + 1.2], [WX0, gy, WZ0 + 1.2]]) + ' ';
  mp += poly([[WX0, gy, WZ1 - 1.1], [WX1, gy, WZ1 - 1.1], [WX1, gy, WZ1], [WX0, gy, WZ1]]) + ' ';
  mp += poly([[WX0, gy, WZ0], [WX0 + 1.1, gy, WZ0], [WX0 + 1.1, gy, WZ1], [WX0, gy, WZ1]]);
  inside += F(mp, NAVY);
  // embrasure gauche et appui (retour du mur)
  inside += F(poly([[WX0, gy, WZ0], [WX0, YM, WZ0], [WX0, YM, WZ1], [WX0, gy, WZ1]]), '#d5d8e6');
  inside += F(poly([[WX0, gy, WZ0], [WX1, gy, WZ0], [WX1, YM, WZ0], [WX0, YM, WZ0]]), '#ffffff');
}

/* ───────────── murs ───────────── */
let walls = '';
// porte vitrée et fenêtre de l'aile, en retrait (dessinées avant la façade percée)
const DX0 = -27, DX1 = -14, DZ1 = ZG + 28;      // porte
const FX0 = -44, FX1 = -33, FZ0 = 18, FZ1 = 42; // fenêtre de l'aile
{
  const t = 1.4, gy = YW - t;
  walls += F(poly([[DX0, gy, ZG], [DX1, gy, ZG], [DX1, gy, DZ1], [DX0, gy, DZ1]]), NAVY);
  walls += F(poly([[DX0 + 1.4, gy, ZG + 1.4], [DX1 - 1.4, gy, ZG + 1.4], [DX1 - 1.4, gy, DZ1 - 1.4], [DX0 + 1.4, gy, DZ1 - 1.4]]), GLASS_L);
  walls += F(poly([[DX0 + 3, gy, ZG + 4], [DX0 + 6, gy, ZG + 4], [DX0 + 9.5, gy, DZ1 - 2.5], [DX0 + 6.5, gy, DZ1 - 2.5]]), '#ffffff', 0.3);
  walls += F(poly([[DX1 - 3.4, gy, 12], [DX1 - 2.6, gy, 12], [DX1 - 2.6, gy, 21], [DX1 - 3.4, gy, 21]]), '#e8eaf2');
  walls += F(poly([[DX0, gy, ZG], [DX0, YW, ZG], [DX0, YW, DZ1], [DX0, gy, DZ1]]), '#d5d8e6');
  // fenêtre haute : stores vénitiens à moitié baissés
  walls += F(poly([[FX0, gy, FZ0], [FX1, gy, FZ0], [FX1, gy, FZ1], [FX0, gy, FZ1]]), GLASS_L);
  let bl = '';
  for (let z = FZ1 - 1.4; z > 31; z -= 1.35) bl += poly([[FX0, gy, z - 0.85], [FX1, gy, z - 0.85], [FX1, gy, z], [FX0, gy, z]]) + ' ';
  walls += F(bl.trim(), '#f4f5fa', 0.92);
  walls += F(poly([[FX0 + 1.5, gy, FZ0], [FX0 + 4, gy, FZ0], [FX0 + 7.5, gy, 30], [FX0 + 5, gy, 30]]), '#ffffff', 0.3);
  walls += F(poly([[FX0, gy, FZ0], [FX0, YW, FZ0], [FX0, YW, FZ1], [FX0, gy, FZ1]]), '#d5d8e6');
  walls += F(poly([[FX0, gy, FZ0], [FX1, gy, FZ0], [FX1, YW, FZ0], [FX0, YW, FZ0]]), '#ffffff');
  walls += F(poly([[FX0, gy, FZ1 - 1], [FX1, gy, FZ1 - 1], [FX1, gy, FZ1], [FX0, gy, FZ1]]) + poly([[FX0, gy, FZ0], [FX0 + 1, gy, FZ0], [FX0 + 1, gy, FZ1], [FX0, gy, FZ1]]) + poly([[FX0, gy, FZ0], [FX1, gy, FZ0], [FX1, gy, FZ0 + 1], [FX0, gy, FZ0 + 1]]), NAVY);
}
// façades éclairées (percées), faces ombrées
walls += FE(fM(R(XW, X1, ZG, H)) + ' ' + fM(R(WX0, WX1, WZ0, WZ1)), WALL_L);
walls += FE(fW(R(X0, XW, ZG, H)) + ' ' + fW(R(DX0, DX1, ZG, DZ1)) + ' ' + fW(R(FX0, FX1, FZ0, FZ1)), WALL_L);
walls += F(sW(R(YM, YW, ZG, H)), WALL_R) + F(sM(R(Y0, YM, ZG, H)), WALL_R);
// soubassement (bande claire au pied), interrompu par la porte
walls += F(fM(R(XW, WX0, ZG, ZP)) + fM(R(WX1, X1, ZG, ZP)) + fM(R(WX0, WX1, ZG, ZP)), '#e3e5ef');
walls += F(fW(R(X0, DX0, ZG, ZP)) + fW(R(DX1, XW, ZG, ZP)), '#e3e5ef');
walls += F(sW(R(YM, YW, ZG, ZP)) + sM(R(Y0, YM, ZG, ZP)), '#cfd3e2');
walls += S(line([[X0, YW, ZP], [DX0, YW, ZP]]) + ' ' + line([[DX1, YW, ZP], [XW, YW, ZP], [XW, YM, ZP]]) + ' ' + line([[XW, YM, ZP], [X1, YM, ZP], [X1, Y0, ZP]]), '#ffffff', 0.8, 0.9);
walls += cube(DX0 - 1, YW, ZG, DX1 - DX0 + 2, 1.6, 0.8, { lit: '#e3e5ef', dark: '#cfd3e2', top: '#f4f5f9' }); // seuil
// ombre de la dalle de toit sur le haut des murs
walls += F(fM(R(XW, X1, H - 7, H)) + fW(R(X0, XW, H - 7, H)), EAVE) + F(sW(R(YM, YW, H - 7, H)) + sM(R(Y0, YM, H - 7, H)), EAVE);
// arêtes verticales claires (angles saillants)
walls += S(line([[X1, YM, ZP], [X1, YM, H - 0.5]]) + ' ' + line([[XW, YW, ZP], [XW, YW, H - 0.5]]), '#ffffff', 1, 0.95);
// auvent bleu nuit au-dessus de la porte + applique
{
  const ax0 = DX0 - 3, ax1 = DX1 + 3, az = DZ1 + 2.4;
  walls += F(fW(R(ax0, ax1, az - 6, az)), NAVY, 0.12);
  const b = box(ax0, YW, az, ax1 - ax0, 6.5, 2.2);
  walls += F(b.right, ROOF_D) + F(b.left, ROOF) + F(b.top, ROOF_L);
  walls += S(line([[ax0, YW + 6.5, az + 2.2], [ax1, YW + 6.5, az + 2.2], [ax1, YW, az + 2.2]]), tint(ROOF, 0.45), 0.8, 0.9);
  // applique : verre allumé sur la face avant (+y) du boîtier, pas sur le mur qu'il masque
  walls += cube(DX1 + 4.4, YW, 20.5, 1.4, 1.2, 3, IRON) + F(onY(YW + 1.22)(R(DX1 + 4.6, DX1 + 5.6, 21, 23)), '#ffe9a8');
  const [lx, ly] = P(DX1 + 5.1, YW + 1.4, 22);
  walls += `<circle cx="${r1(lx)}" cy="${r1(ly)}" r="4.2" fill="#ffe9a8" fill-opacity="0.22"/>`;
}
// petite plaque « planning » sur le côté de l'aile (face +x)
{
  const w = 10, h = 10;
  let g = rect(1, 1, w, h, NAVY, { rx: 1.8, op: 0.14 });
  g += rect(0, 0, w, h, '#ffffff', { rx: 1.8 });
  // accent dans la palette du village (violet sombre), barres en cascade façon Gantt
  g += rect(1.6, 1.6, w - 3.2, h - 3.2, 'none', { rx: 1.1, stroke: '#6352e6', sw: 0.9 });
  g += rect(2.9, 3.5, 3.4, 1, '#6352e6', { rx: 0.5 }) + rect(3.9, 5, 3.6, 1, '#6352e6', { rx: 0.5 }) + rect(2.9, 6.5, 2.6, 1, '#6352e6', { rx: 0.5 });
  walls += gX(XW + 0.4, YW - 4, 40, g);
}

/* ───────────── grand tableau de planning (façade +x) ───────────── */
let board = '';
const BU0 = 5, BW = 47, BZT = 48.5, BH = 40, BT = 1.6; // y de départ (u = 0), largeur, haut, hauteur, épaisseur
{
  const xb = X1 + BT;
  board += gX(X1, BU0, BZT, rect(1.9, 1.9, BW, BH, NAVY, { rx: 2.4, op: 0.14 }));          // ombre portée sur le mur
  board += F(poly([[X1, BU0, BZT], [xb, BU0, BZT], [xb, BU0 - BW, BZT], [X1, BU0 - BW, BZT]]), '#5a6ab4'); // tranche haute
  board += F(poly([[X1, BU0, BZT - BH], [xb, BU0, BZT - BH], [xb, BU0, BZT], [X1, BU0, BZT]]), '#46559e');   // tranche +y
  let g = rect(0, 0, BW, BH, NAVY, { rx: 2.4 });
  g += rect(1.8, 1.8, BW - 3.6, BH - 3.6, lin('board', [[0, '#ffffff'], [1, '#eef0f7']]), { rx: 1.1 });
  // en-tête : semaines
  const u0 = 1.8, u1 = BW - 1.8;
  g += rect(u0, 1.8, u1 - u0, 3.8, '#e9e6ff', { rx: 1.1 }) + rect(u0, 3.8, u1 - u0, 1.8, '#e9e6ff');
  let tk = '';
  for (let i = 1; i < 6; i++) { const u = u0 + ((u1 - u0) * i) / 6; tk += `M${r1(u)} 5.6 L${r1(u)} ${r1(BH - 2.2)} `; }
  g += `<path d="${tk.trim()}" stroke="#dcdfeb" stroke-width="0.5" fill="none"/>`;
  for (let i = 0; i < 6; i++) { const u = u0 + ((u1 - u0) * (i + 0.5)) / 6; g += rect(u - 1.8, 3.1, 3.6, 1.2, '#9a8fff', { rx: 0.6 }); }
  // barres de Gantt en cascade, épaisses (relief clair en haut, filet sombre en bas)
  const bars = [[3.4, 19, '#7c6bff'], [12, 28.5, '#f59e0b'], [20.5, 36, '#0ea5e9'], [28, 43.6, '#14b8a6']];
  bars.forEach(([a, b, c], i) => {
    const y = 7.4 + i * 7.8, h = 6;
    g += rect(a, y, b - a, h, c, { rx: 2.6 });
    g += rect(a + 1.3, y + 0.7, b - a - 2.6, 1.3, '#ffffff', { rx: 0.65, op: 0.4 });
    g += rect(a + 1.2, y + h - 1.1, b - a - 2.4, 0.8, '#1d2033', { rx: 0.4, op: 0.12 });
  });
  // ligne « aujourd'hui »
  const ut = 24.6;
  g += `<path d="M${r1(ut)} 6.3 L${r1(ut)} ${r1(BH - 2.4)}" stroke="#ef4444" stroke-width="0.8" fill="none"/>`;
  g += `<path d="M${r1(ut - 1.7)} 5.5 L${r1(ut + 1.7)} 5.5 L${r1(ut)} 7.7 Z" fill="#ef4444"/>`;
  // aimants
  for (const [u, v, c] of [[17.6, 10.4, '#ef4444'], [34.4, 26, '#f6c95c'], [6.4, 35.4, NAVY]]) {
    g += circ([u + 0.4, v + 0.5], 1.95, '#1d2033', 0.2) + circ([u, v], 1.95, c) + circ([u - 0.6, v - 0.65], 0.62, '#ffffff', 0.75);
  }
  board += gX(xb, BU0, BZT, g);
  board += S(line([[xb, BU0, BZT], [xb, BU0 - BW, BZT]]), '#8c9ad6', 0.6, 0.9); // liseré clair
  // auget à feutres sous le tableau
  board += cube(X1, BU0 - BW + 5, BZT - BH - 1.7, 2.8, BW - 10, 1.3, WHITE);
  board += cube(X1 + 0.8, BU0 - 16, BZT - BH - 0.4, 1.2, 4, 0.9, { lit: '#ef4444', dark: '#c63434', top: '#f37b7b' });
  board += cube(X1 + 0.8, BU0 - 22, BZT - BH - 0.4, 1.2, 4, 0.9, { lit: '#7c6bff', dark: '#6352e6', top: '#a99cff' });
}

/* ───────────── toit plat à rebord (dalle en L) ───────────── */
let roof = '';
const ax0 = X0 - OV, ax1 = X1 + OV, ay0 = Y0 - OV, aym = YM + OV, axw = XW + OV, ayw = YW + OV;
{
  const RIVE = lin('rive', [[0, '#42519b'], [1, ROOF]]);
  roof += F(poly([[axw, aym, ZR0], [ax1, aym, ZR0], [ax1, aym, ZR1], [axw, aym, ZR1]]), RIVE);
  roof += F(poly([[axw, aym, ZR0], [axw, ayw, ZR0], [axw, ayw, ZR1], [axw, aym, ZR1]]), ROOF_D);
  roof += F(poly([[ax0, ayw, ZR0], [axw, ayw, ZR0], [axw, ayw, ZR1], [ax0, ayw, ZR1]]), RIVE);
  roof += F(poly([[ax1, ay0, ZR0], [ax1, aym, ZR0], [ax1, aym, ZR1], [ax1, ay0, ZR1]]), ROOF_D);
  const L = (z, i) => poly([[ax0 + i, ay0 + i, z], [ax1 - i, ay0 + i, z], [ax1 - i, aym - i, z], [axw - i, aym - i, z], [axw - i, ayw - i, z], [ax0 + i, ayw - i, z]]);
  roof += F(L(ZR1, 0), ROOF_L);
  // champ intérieur en creux derrière un petit acrotère
  const i = 3.2, zf = ZR1 - 1.2;
  const [gx1, gy1] = P(ax0 + i, ayw - i, zf), [gx2, gy2] = P(ax1 - i, ay0 + i, zf);
  roof += F(L(zf, i), lin('field', [[0, '#3c4b8b'], [1, '#33417b']], [gx1, gy1, gx2, gy2], true));
  roof += F(poly([[ax0 + i, ay0 + i, zf], [ax1 - i, ay0 + i, zf], [ax1 - i, ay0 + i, ZR1], [ax0 + i, ay0 + i, ZR1]]), '#4d5da4');
  roof += F(poly([[ax0 + i, ay0 + i, zf], [ax0 + i, ayw - i, zf], [ax0 + i, ayw - i, ZR1], [ax0 + i, ay0 + i, ZR1]]), '#3a4989');
  roof += S(line([[ax0, ayw, ZR1], [axw, ayw, ZR1], [axw, aym, ZR1], [ax1, aym, ZR1], [ax1, ay0, ZR1]]), tint(ROOF, 0.5), 1.2, 0.95);
  roof += S(line([[ax0 + i, ayw - i, ZR1 - 0.05], [axw - i, ayw - i, ZR1 - 0.05], [axw - i, aym - i, ZR1 - 0.05], [ax1 - i, aym - i, ZR1 - 0.05], [ax1 - i, ay0 + i, ZR1 - 0.05]]), tint(ROOF, 0.3), 0.6, 0.6);
  roof += S(line([[ax0, ayw, ZR0 + 0.3], [axw, ayw, ZR0 + 0.3]]) + ' ' + line([[axw, aym, ZR0 + 0.3], [ax1, aym, ZR0 + 0.3]]), tint(ROOF, 0.22), 0.6, 0.55);
  // équipements de toit : lanterneau vitré, caisson de ventilation
  const lx = 6, ly = -31, lw = 20, ld = 12, lh = 3.2;
  roof += F(poly([[lx + lw, ly, zf], [lx + lw + 2.6, ly - 2.6, zf], [lx + lw + 2.6, ly + ld - 2.6, zf], [lx + lw, ly + ld, zf]]), '#1d2550', 0.25);
  roof += cube(lx, ly, zf, lw, ld, lh, { lit: '#f4f5fa', dark: '#d9dce8', top: '#ffffff' });
  roof += F(poly([[lx + 1.4, ly + 1.4, zf + lh], [lx + lw - 1.4, ly + 1.4, zf + lh], [lx + lw - 1.4, ly + ld - 1.4, zf + lh], [lx + 1.4, ly + ld - 1.4, zf + lh]]), lin('sky', [[0, '#a8c6f3'], [1, '#dbe7fb']]));
  roof += F(poly([[lx + 4, ly + ld - 1.4, zf + lh], [lx + 8, ly + ld - 1.4, zf + lh], [lx + 13, ly + 1.4, zf + lh], [lx + 9, ly + 1.4, zf + lh]]), '#ffffff', 0.45);
  // groupe de ventilation : métal gris, bas, ventilateur rond sur le dessus. Surtout pas un cube
  // blanc : c'est la signature de la Boutique, juste en dessous dans le village.
  const vx = -38, vy = -34, vw = 12, vd = 10, vh = 4.2, MET = { lit: '#c3c9d6', dark: '#9aa2b4', top: '#d3d8e2' };
  roof += F(poly([[vx + vw, vy, zf], [vx + vw + 2.4, vy - 2.4, zf], [vx + vw + 2.4, vy + vd - 2.4, zf], [vx + vw, vy + vd, zf]]), '#1d2550', 0.25);
  roof += cube(vx, vy, zf, vw, vd, vh, MET);
  {
    const [fx, fy] = P(vx + vw / 2, vy + vd / 2, zf + vh), rx = 3.4 * Math.SQRT2 * 0.866, ry = 3.4 * Math.SQRT2 * 0.5;
    roof += `<ellipse cx="${r1(fx)}" cy="${r1(fy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="#7d8499"/>`;
    roof += `<ellipse cx="${r1(fx)}" cy="${r1(fy + 0.4)}" rx="${r1(rx * 0.86)}" ry="${r1(ry * 0.8)}" fill="#5d6378"/>`;
    roof += S(`M${r1(fx - rx * 0.7)} ${r1(fy - ry * 0.1)} L${r1(fx + rx * 0.7)} ${r1(fy + ry * 0.1)} M${r1(fx - rx * 0.1)} ${r1(fy - ry * 0.7)} L${r1(fx + rx * 0.1)} ${r1(fy + ry * 0.7)}`, '#9aa2b4', 0.5);
    roof += `<ellipse cx="${r1(fx)}" cy="${r1(fy)}" rx="${r1(rx * 0.22)}" ry="${r1(ry * 0.22)}" fill="#c3c9d6"/>`;
  }
  let gr = '';
  for (let z = zf + 1; z < zf + vh - 0.6; z += 0.8) gr += line([[vx + 1.6, vy + vd + 0.02, z], [vx + vw - 1.6, vy + vd + 0.02, z]]) + ' ';
  roof += S(gr.trim(), '#9aa2b4', 0.35);
  roof += S(line([[vx, vy + vd, zf + vh], [vx + vw, vy + vd, zf + vh], [vx + vw, vy, zf + vh]]), '#e8ebf2', 0.6, 0.9);
}

/* ───────────── jardinière d'angle (comme la référence) ───────────── */
const planter = (() => {
  const px0 = 34.5, px1 = 50, py0 = 11.5, py1 = 22, ph = 5.4;
  let g = cube(px0, py0, ZG, px1 - px0, py1 - py0, ph, { lit: '#f4f5f9', dark: '#dcdfeb', top: '#ffffff' });
  g += F(poly([[px0 + 1.1, py0 + 1.1, ZG + ph], [px1 - 1.1, py0 + 1.1, ZG + ph], [px1 - 1.1, py1 - 1.1, ZG + ph], [px0 + 1.1, py1 - 1.1, ZG + ph]]), '#8f6a48');
  g += bush(38.6, 16.7, { w: 7.4, d: 8, h: 8.6, z: ZG + ph - 0.6 }).svg + bush(45.8, 16.7, { w: 7.4, d: 8, h: 10.4, z: ZG + ph - 0.6 }).svg;
  return { d: 1000 + 42 + 17, svg: g };
})();

/* ───────────── composition ───────────── */
const cs = contactShadow(`${ID}-cs`, 150, 66, 196, 302, 0.18);
defs.push(cs.defs);
const items = [
  { d: -2000, svg: ground },
  treeCone(56, -60, { size: 0.92 }),
  { ...treeRound(-70, 22, { size: 0.98 }), d: -100 },
  { d: 0, svg: inside + walls + roof + board },
  planter,
  { ...person(47.4, -34.5, { z: ZG, facing: 'back-left', pose: 'wave', top: '#7c6bff', hairStyle: 'long', hair: '#3b2a20' }), d: 1013 },
  { ...pottedPlant(-30.6, 31.6, { z: ZG }), d: 1001 },
  { ...pottedPlant(-10.6, 31.6, { z: ZG }), d: 1021 },
  { ...person(-20.5, 41, { z: ZG, facing: 'back-right', pose: 'walk', top: '#0ea5e9', hairStyle: 'short' }), d: 1020.5 },
  { ...bush(-52, 40, { w: 12, d: 11, h: 9, z: ZG }), d: 988 },
  { ...bush(-41, 41.5, { w: 8, d: 8, h: 6.5, z: ZG }), d: 1000.5 },
];
const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

/* ───────────── manifeste : sommet du toit, cadre du bâtiment ───────────── */
const shell = F(poly([[ax0, ay0, ZR1], [ax1, ay0, ZR1], [ax1, aym, ZR1], [axw, aym, ZR1], [axw, ayw, ZR1], [ax0, ayw, ZR1]]), '#000') +
  F(poly([[ax0, ayw, ZR0], [axw, ayw, ZR0], [axw, ayw, 0], [ax0, ayw, 0]]), '#000') + F(poly([[X1, Y0, 0], [X1, YM, 0], [X1 + BT, YM, ZR0], [X1, Y0, ZR0]]), '#000') +
  F(poly([[axw, aym, 0], [ax1, aym, 0], [ax1, aym, ZR1], [axw, aym, ZR1]]), '#000');
const bb = bounds(shell);
const man = {
  id: ID, title: TITLE, labelY: Math.round(bb.y),
  hit: { x: Math.floor(bb.x - 2), y: Math.floor(bb.y - 2), w: Math.ceil(bb.w + 4), h: Math.ceil(bb.h + 4) },
};
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
