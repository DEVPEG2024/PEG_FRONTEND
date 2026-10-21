// Village PEG — sprite « Clients » : maison accueillante.
// Toit terracotta à deux pans, terrasse en bois avec banc, lanterne, clôture blanche, boîte aux lettres,
// jardin fleuri, enseigne cœur sur la façade ombrée (+x). Maison posée sur la dalle claire du village.
//   node buildings/clients.build.mjs && node tools/lint.mjs buildings/clients.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { treeRound, bush, bench, flowerBed, pottedPlant } from '../tools/props.mjs';

const ID = 'clients', TITLE = 'Clients';

/* ───────────── outils locaux ───────────── */
let defs = '';
const grad = (name, stops, v = [0, 0, 0, 1]) => {
  const id = `${ID}-${name}`;
  defs += `<linearGradient id="${id}" x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>';
  return `url(#${id})`;
};
const op = (o) => (o != null && o < 1 ? ` fill-opacity="${o}"` : '');
const F = (pts, fill, o) => `<path d="${poly(pts)}" fill="${fill}"${op(o)}/>`;
const Ln = (pts, col, w, o) => `<path d="${line(pts)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o != null && o < 1 ? ` stroke-opacity="${o}"` : ''}/>`;
// plans : façade +y (éclairée) en (x, z) ; façade +x (ombrée) en (y, z) ; horizontal en (x, y)
const onY = (y, pts) => pts.map(([x, z]) => [x, y, z]);
const onX = (x, pts) => pts.map(([y, z]) => [x, y, z]);
const onZ = (z, pts) => pts.map(([x, y]) => [x, y, z]);
const rect = (a0, b0, a1, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
const rrect = (a0, b0, a1, b1, r, n = 4) => {
  const out = [], cs = [[a1 - r, b0 + r, -90], [a1 - r, b1 - r, 0], [a0 + r, b1 - r, 90], [a0 + r, b0 + r, 180]];
  for (const [ca, cb, s] of cs) for (let i = 0; i <= n; i++) { const t = ((s + (90 * i) / n) * Math.PI) / 180; out.push([ca + r * Math.cos(t), cb + r * Math.sin(t)]); }
  return out;
};
const circ = (ca, cb, r, n = 28) => Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; return [ca + r * Math.cos(t), cb + r * Math.sin(t)]; });
/** Découpe d'un polygone 2D par un rectangle (Sutherland–Hodgman). */
const clip = (pts, a0, b0, a1, b1) => {
  const edges = [[(p) => p[0] >= a0, (p, q) => [a0, p[1] + ((q[1] - p[1]) * (a0 - p[0])) / (q[0] - p[0])]],
    [(p) => p[0] <= a1, (p, q) => [a1, p[1] + ((q[1] - p[1]) * (a1 - p[0])) / (q[0] - p[0])]],
    [(p) => p[1] >= b0, (p, q) => [p[0] + ((q[0] - p[0]) * (b0 - p[1])) / (q[1] - p[1]), b0]],
    [(p) => p[1] <= b1, (p, q) => [p[0] + ((q[0] - p[0]) * (b1 - p[1])) / (q[1] - p[1]), b1]]];
  let out = pts;
  for (const [inside, cut] of edges) {
    const src = out; out = [];
    for (let i = 0; i < src.length; i++) {
      const p = src[i], q = src[(i + 1) % src.length];
      if (inside(q)) { if (!inside(p)) out.push(cut(p, q)); out.push(q); } else if (inside(p)) out.push(cut(p, q));
    }
    if (!out.length) break;
  }
  return out;
};
/** Pavé : faces +y (lit), +x (dark), dessus (top). */
const cube = (x0, y0, z0, x1, y1, z1, { lit, dark, top }) =>
  F([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], lit) +
  F([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], dark) +
  (top ? F([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top) : '');
const dot = (p, r, fill, o) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${fill}"${op(o)}/>`;

/* ───────────── palette ───────────── */
const WALL_L = grad('wallL', [[0, '#ffffff'], [1, '#eef0f6']]);
const WALL_R = grad('wallR', [[0, '#e8eaf3'], [1, '#d7dbe8']]);
const PLINTH = { lit: '#e3e5ef', dark: '#cfd3e2', top: '#eef0f6' };
const GLASS_L = grad('glassL', [[0, '#a9cdff'], [1, '#6f9ef5']]);
const GLASS_R = grad('glassR', [[0, '#7da6ea'], [1, '#5579c6']]);
const TERRA = '#e98a62';
const ROOF_L = grad('roofL', [[0, '#f29d77'], [1, '#e2825a']]);
const ROOF_R = '#cf6c46', ROOF_B = shade(TERRA, 0.75), RIM = tint(TERRA, 0.38), TILE = '#c9643f';
const WOOD = { lit: '#d9a066', dark: '#c08549', top: '#e4b783' };
const SHADOW = '#3a2f4a';

/* ───────────── fenêtres (embrasure visible : gauche + appui sur +y, droite + appui sur +x) ───────────── */
function winY(y, x0, x1, z0, z1, o = {}) {
  const d = o.d ?? 1.6, fw = o.fw ?? 1.3, frame = o.frame ?? '#ffffff';
  let s = F(onY(y, rect(x0 - fw, z0 - fw, x1 + fw, z1 + fw)), frame);
  s += F(onY(y, [[x0, z0], [x0 + d, z0 + d], [x0 + d, z1], [x0, z1]]), '#d6dae7');
  s += F(onY(y, [[x0, z0], [x1, z0], [x1, z0 + d], [x0 + d, z0 + d]]), '#ffffff');
  const g = [x0 + d, z0 + d, x1, z1];
  s += F(onY(y, rect(...g)), GLASS_L);
  if (o.inside) s += o.inside(g);
  const w = g[2] - g[0], h = g[3] - g[1];
  for (const [a, b] of [[0.1, 0.32], [0.44, 0.54]]) {
    const c = clip([[g[0] + w * a, g[3]], [g[0] + w * b, g[3]], [g[0] + w * b - h * 0.55, g[1]], [g[0] + w * a - h * 0.55, g[1]]], ...g);
    if (c.length > 2) s += F(onY(y, c), '#ffffff', 0.32);
  }
  for (const m of o.mx ?? []) s += Ln(onY(y, [[m, g[1]], [m, g[3]]]), frame, 1.1);
  for (const m of o.mz ?? []) s += Ln(onY(y, [[g[0], m], [g[2], m]]), frame, 1.1);
  if (o.sill !== false) s += cube(x0 - fw - 0.8, y, z0 - fw - 1.4, x1 + fw + 0.8, y + 1.8, z0 - fw, { lit: '#f3f4f9', dark: '#d9dce8', top: '#ffffff' });
  return s;
}
function winX(x, y0, y1, z0, z1, o = {}) {
  const d = o.d ?? 1.6, fw = o.fw ?? 1.3, frame = o.frame ?? '#eef0f6';
  let s = F(onX(x, rect(y0 - fw, z0 - fw, y1 + fw, z1 + fw)), frame);
  s += F(onX(x, [[y0, z0], [y0 + d, z0 + d], [y0 + d, z1], [y0, z1]]), '#eceef5');
  s += F(onX(x, [[y0, z0], [y1, z0], [y1, z0 + d], [y0 + d, z0 + d]]), '#f7f8fb');
  const g = [y0 + d, z0 + d, y1, z1];
  s += F(onX(x, rect(...g)), GLASS_R);
  if (o.inside) s += o.inside(g);
  const w = g[2] - g[0], h = g[3] - g[1];
  for (const [a, b] of [[0.66, 0.88], [0.44, 0.54]]) {
    const c = clip([[g[0] + w * a, g[3]], [g[0] + w * b, g[3]], [g[0] + w * b + h * 0.55, g[1]], [g[0] + w * a + h * 0.55, g[1]]], ...g);
    if (c.length > 2) s += F(onX(x, c), '#ffffff', 0.26);
  }
  for (const m of o.my ?? []) s += Ln(onX(x, [[m, g[1]], [m, g[3]]]), frame, 1.1);
  for (const m of o.mz ?? []) s += Ln(onX(x, [[g[0], m], [g[2], m]]), frame, 1.1);
  if (o.sill !== false) s += cube(x, y0 - fw - 0.8, z0 - fw - 1.4, x + 1.8, y1 + fw + 0.8, z0 - fw, { lit: '#eceef5', dark: '#d3d7e4', top: '#ffffff' });
  return s;
}

/* ───────────── maison ───────────── */
const X0 = -62, X1 = 32, Y0 = -48, Y1 = 10, HW = 44;           // corps de la maison (94 × 58)
const YC = (Y0 + Y1) / 2, HD = (Y1 - Y0) / 2, RISE = 32, OV = 4.5, OVX = 4.5, RT = 2.8;
const SL = RISE / HD, ZR = HW + RISE, ZE = HW - OV * SL;      // faîtage, égout (débord compris)
const roofZ = (y) => ZR - Math.abs(y - YC) * SL;
const SH = 1.6;                                                // dalle claire (comme le reste du village)
const SLAB = { x0: X0 - 7, x1: X1 + 9, y0: Y0 - 7, y1: Y1 + 16 };

let walls = '';
walls += cube(X0, Y0, SH, X1, Y1, SH + 5, PLINTH);
walls += cube(X0, Y0, SH + 5, X1, Y1, HW, { lit: WALL_L, dark: WALL_R });
walls += F(onY(Y1, rect(X0, SH + 5, X1, SH + 5.8)), '#ffffff', 0.8) + F(onX(X1, rect(Y0, SH + 5, Y1, SH + 5.8)), '#ffffff', 0.5);
walls += F(onX(X1, [[Y0, HW], [Y1, HW], [YC, ZR]]), grad('gable', [[0, '#eceef5'], [1, '#dfe2ed']]));
walls += Ln([[X1, Y1, SH + 5.4], [X1, Y1, HW - 0.5]], '#ffffff', 0.8, 0.75);                 // arête d'angle adoucie
// ombre de l'avant-toit sur la façade éclairée et sous le pignon
walls += F(onY(Y1, rect(X0, HW - 8, X1, HW)), grad('eaveSh', [[0, SHADOW, 0.2], [1, SHADOW, 0]]));
walls += F(onX(X1, [[Y0, HW - 0.5], [Y1, HW - 0.5], [YC, ZR - 0.5], [YC, ZR - 3.5], [Y1 - 2, HW - 3.5], [Y0 + 2, HW - 3.5]]), SHADOW, 0.08);

// façade +y : fenêtre gauche (derrière le banc), porte, grande fenêtre à rideaux + jardinière, petite fenêtre
const FZ0 = SH + 13, FZ1 = SH + 33;                            // allège / linteau des fenêtres
walls += winY(Y1, X0 + 7, X0 + 17, FZ0, FZ1, { mz: [FZ0 + 11] });
const DOOR = [X0 + 28, X0 + 40], DZ0 = SH + 3, DZ = SH + 29;
{
  const [a, b] = DOOR, z0 = DZ0, d = 1.6, mid = a + d + (b - a - d) / 2;
  walls += F(onY(Y1, rect(a - 1.6, z0, b + 1.6, DZ + 1.6)), '#ffffff');
  walls += F(onY(Y1, [[a, z0], [a + d, z0 + d], [a + d, DZ], [a, DZ]]), '#d6dae7');
  walls += F(onY(Y1, rect(a + d, z0, b, DZ)), grad('door', [[0, '#5868b8'], [1, '#34427e']]));
  walls += F(onY(Y1, rect(a + d + 1.8, z0 + 3, b - 1.8, z0 + 11)), '#ffffff', 0.1);
  walls += F(onY(Y1, circ(mid, DZ - 7, 2.8, 18)), GLASS_L);
  walls += F(onY(Y1, circ(mid - 0.7, DZ - 6.3, 1.1, 10)), '#ffffff', 0.55);
  walls += F(onY(Y1, circ(b - 2.2, z0 + 12, 0.8, 10)), '#f6c95c');
}
const BW = [X0 + 57, X0 + 79];                                   // grande fenêtre
walls += winY(Y1, BW[0], BW[1], FZ0, FZ1, { mx: [(BW[0] + BW[1]) / 2], inside: (g) => {
  const [a0, , a1, b1] = g;
  return F(onY(Y1, [[a0, b1], [a0 + 5.5, b1], [a0, b1 - 11]]), '#fff7ea', 0.8) + F(onY(Y1, [[a1, b1], [a1 - 5.5, b1], [a1, b1 - 11]]), '#fff7ea', 0.8) +
    F(onY(Y1, rect(a0, g[1], a1, g[1] + 2.2)), '#ffe6b0', 0.35);
} });
walls += winY(Y1, X1 - 10, X1 - 4, FZ0 + 4, FZ1, {});
// jardinière fleurie sous la grande fenêtre
walls += cube(BW[0] - 1, Y1, FZ0 - 5, BW[1] + 1, Y1 + 4.4, FZ0 - 1.8, { lit: WOOD.lit, dark: WOOD.dark, top: '#a77a52' });
for (let i = 0; i < 11; i++) {
  const p = P(BW[0] + 0.3 + i * 2.15, Y1 + 2.2, FZ0 - 0.8 + (i % 2) * 0.9);
  walls += dot(p, 1.9, i % 3 ? '#5cc27a' : '#4fae6c') + dot([p[0] - 0.4, p[1] - 1], 1.15, ['#ef8aa0', '#f6c95c', '#ffffff', '#d9467a', '#8a7cff'][i % 5]);
}

// façade +x : fenêtre (au fond) + enseigne cœur (vers l'avant), lucarne ronde dans le pignon
walls += winX(X1, Y0 + 7, Y0 + 20, FZ0, FZ1, { mz: [FZ0 + 11] });
{
  const zc = HW + 13, r = 5;
  walls += F(onX(X1, circ(YC, zc, r + 1.5, 24)), '#f4f5f9');
  walls += F(onX(X1, circ(YC, zc, r, 24)), GLASS_R);
  walls += Ln(onX(X1, [[YC - r, zc], [YC + r, zc]]), '#f4f5f9', 0.9) + Ln(onX(X1, [[YC, zc - r], [YC, zc + r]]), '#f4f5f9', 0.9);
}
const SIGN = { yc: Y1 - 19, zc: SH + 23, hw: 12.5, hh: 12.5 };
{
  const { yc, zc, hw, hh } = SIGN, t = 1.8;
  const shape = rrect(yc - hw, zc - hh, yc + hw, zc + hh, 3.6, 5);
  // ombre portée vers le bas-droite de l'écran (−y, −z), comme toutes les ombres du village
  walls += F(onX(X1, shape.map(([a, b]) => [a - 1.6, b - 2.1])), SHADOW, 0.12);
  for (let k = 0; k <= 3; k++) walls += F(onX(X1 + (t * k) / 3, shape), k < 3 ? '#c9cede' : '#ffffff');
  walls += F(onX(X1 + t, rrect(yc - hw + 1.5, zc - hh + 1.5, yc + hw - 1.5, zc + hh - 1.5, 2.4, 5)), '#2e3a6e');
  walls += F(onX(X1 + t, rrect(yc - hw + 3, zc - hh + 3, yc + hw - 3, zc + hh - 3, 1.5, 5)), '#ffffff');
  const heart = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * 2 * Math.PI;
    heart.push([yc + 16 * Math.sin(a) ** 3 * 0.44, zc + 0.8 + (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.44]);
  }
  walls += F(onX(X1 + t, heart), '#d9467a');
  walls += F(onX(X1 + t, circ(yc + 3.7, zc + 4.2, 1.7, 12)), '#ffffff', 0.5);
}

/* ───────────── terrasse, banc, lanterne ───────────── */
const TX0 = X0 + 2, TX1 = DOOR[1] + 6, TY1 = Y1 + 13, TZ = SH + 2.4;
let deck = cube(TX0, Y1, SH, TX1, TY1, TZ, { lit: WOOD.dark, dark: shade(WOOD.dark, 0.9), top: WOOD.lit });
for (let x = TX0 + 3.2; x < TX1 - 0.5; x += 3.2) deck += Ln([[x, Y1, TZ], [x, TY1, TZ]], '#c08549', 0.45, 0.55);
deck += F(onZ(TZ, rect(DOOR[0] + 0.5, Y1 + 0.6, DOOR[1] - 0.5, Y1 + 5.4)), '#8c5a3e');
const terraceBench = bench(X0 + 13, Y1 + 3.5, { axis: 'x', back: true, len: 17, z: TZ, sitters: [{ at: -3.2, top: '#14b8a6', hairStyle: 'long', hair: '#6b4a2f' }] });
// lanterne murale allumée à droite de la porte
let lantern = '';
{
  const lx = DOOR[1] + 4.4, lz = SH + 19;
  lantern += cube(lx - 0.5, Y1, lz + 5.2, lx + 0.5, Y1 + 2.6, lz + 6, { lit: '#3f4f93', dark: '#2a376b', top: '#4b5ca5' });
  lantern += cube(lx - 1.6, Y1 + 1.2, lz, lx + 1.6, Y1 + 4.2, lz + 5, { lit: '#ffe9a8', dark: '#f6cf6a', top: '#3f4f93' });
  lantern += cube(lx - 2, Y1 + 0.8, lz + 5, lx + 2, Y1 + 4.6, lz + 6.2, { lit: '#3f4f93', dark: '#2a376b', top: '#4b5ca5' });
  const g = P(lx, Y1 + 2.7, lz + 2.6);
  lantern += dot(g, 7, '#ffe9a8', 0.18) + dot(g, 4.2, '#fff4cc', 0.28);
}

/* ───────────── toit principal ───────────── */
const RX0 = X0 - OVX, RX1 = X1 + OVX, RY0 = Y0 - OV, RY1 = Y1 + OV;
const roofBack = F([[RX0, RY0, ZE], [RX1, RY0, ZE], [RX1, YC, ZR], [RX0, YC, ZR]], ROOF_B);
let roof = F([[RX0, RY1, ZE], [RX1, RY1, ZE], [RX1, YC, ZR], [RX0, YC, ZR]], ROOF_L);
for (let k = 1; k <= 8; k++) {
  const y = YC + ((RY1 - YC) * k) / 9, z = ZR - (y - YC) * SL;
  roof += Ln([[RX0 + 0.8, y, z], [RX1 - 0.8, y, z]], TILE, 0.6, 0.36);
}
roof += F([[RX1, RY0, ZE], [RX1, YC, ZR], [RX1, RY1, ZE], [RX1, RY1, ZE - RT], [RX1, YC, ZR - RT], [RX1, RY0, ZE - RT]], ROOF_R);
roof += F([[RX0, RY1, ZE], [RX1, RY1, ZE], [RX1, RY1, ZE - RT], [RX0, RY1, ZE - RT]], tint(TERRA, 0.22));
roof += Ln([[RX0, RY1, ZE], [RX1, RY1, ZE]], RIM, 1.3);
roof += Ln([[RX1, RY1, ZE], [RX1, YC, ZR], [RX1, RY0, ZE]], RIM, 1.2);
roof += Ln([[RX0, YC, ZR + 0.4], [RX1, YC, ZR + 0.4]], tint(TERRA, 0.5), 1.7);
// cheminée blanche sur le pan avant, côté gauche
const CH = { x0: X0 + 14, x1: X0 + 22, y0: YC + 5, y1: YC + 12, top: ZR + 6 };
{
  const { x0, x1, y0, y1, top } = CH, zb0 = roofZ(y0), zb1 = roofZ(y1);
  roof += F([[x0, y1, zb1], [x1, y1, zb1], [x1, y1, top], [x0, y1, top]], '#f4f5f9');
  roof += F([[x1, y0, zb0], [x1, y1, zb1], [x1, y1, top], [x1, y0, top]], '#d9dce8');
  roof += cube(x0 - 1, y0 - 1, top, x1 + 1, y1 + 1, top + 2.4, { lit: '#e7e9f1', dark: '#c8ccdb', top: '#ffffff' });
  roof += F(onZ(top + 2.4, rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1)), '#6f6470');
  roof += Ln([[x0, y1 + 0.2, zb1 + 0.4], [x1, y1 + 0.2, zb1 + 0.4]], SHADOW, 1.4, 0.16);
}

/* ───────────── dalle, jardin ───────────── */
const items = [];
let ground = '';
{
  const { x0, x1, y0, y1 } = SLAB;
  ground += F([[x0, y1, 0], [x1, y1, 0], [x1, y1, SH], [x0, y1, SH]], '#e6e1d8');
  ground += F([[x1, y0, 0], [x1, y1, 0], [x1, y1, SH], [x1, y0, SH]], '#d8d1c4');
  ground += F(onZ(SH, rect(x0, y0, x1, y1)), grad('slab', [[0, '#f7f5f1'], [1, '#efebe4']]));
  ground += Ln([[x0, y1, SH], [x1, y1, SH], [x1, y0, SH]], '#ffffff', 0.9, 0.8);
  // ombre douce du pied des murs sur la dalle
  ground += F(onZ(SH, [[X0, Y1, 0], [X1, Y1, 0], [X1 + 6, Y1 - 6, 0], [X1 + 6, Y0 - 6, 0], [X1, Y0, 0]].map(([x, y]) => [x, y])), SHADOW, 0.05);
  // marches de la dalle puis allée de pierres claires jusqu'au bord de la parcelle
  const a = DOOR[0] + 0.5, b = DOOR[1] - 0.5;
  ground += F(onZ(0, rect(a - 0.5, y1, b + 0.5, 85)), '#ece5d8');
  // 8 dalles réparties entre la dalle de la maison et le bout de l'allée (y = 85) : la dernière
  // dépassait l'allée et sortait de la parcelle (y > 86,6)
  const s0 = y1 + 1.5, slot = (84 - s0) / 8;
  for (let k = 0; k < 8; k++) { const y = s0 + k * slot; ground += F(onZ(0.3, rrect(a + 0.8, y, b - 0.8, y + slot - 1.9, 1.7, 3)), '#ffffff', 0.9); }
}
const cs = contactShadow(`${ID}-cs`, 150, 70, 200, 300, 0.2);
defs += cs.defs;
items.push({ d: -300, svg: ground });
items.push(treeRound(-74, 38, { size: 1.08 }));
items.push({ d: -40, svg: walls + roofBack });
items.push({ d: -39, svg: deck + lantern + terraceBench.svg + roof });
items.push(flowerBed((BW[0] + BW[1]) / 2, Y1 + 9.5, 30, 10, { z: SH, seed: 4 }));
items.push(flowerBed(-58, 52, 24, 13, { seed: 9 }));
items.push(flowerBed(55, 18, 13, 24, { seed: 2 }));
items.push(bush(X1 + 4.5, Y0 + 6, { z: SH, w: 6, d: 9, h: 9 }));
items.push(bush(55, -34, { w: 12, d: 16, h: 11 }));
items.push(pottedPlant(TX1 + 3.5, TY1 - 2, { z: SH, pot: 'square', size: 0.85 }));

// clôture blanche à piquets le long du bord avant, portillon ouvert sur l'allée
const FY = 74;
const fence = (xa, xb) => {
  let s = '';
  for (const z of [2.6, 6.4]) s += cube(xa, FY - 1.2, z, xb, FY - 0.5, z + 1.3, { lit: '#eef0f6', dark: '#d3d7e4', top: '#ffffff' });
  const n = Math.round((xb - xa) / 3.3);
  for (let i = 0; i <= n; i++) {
    const x = xa + ((xb - xa) * i) / n, w = 1.05;
    s += F([[x + w, FY - 0.5, 0], [x + w, FY + 0.2, 0], [x + w, FY + 0.2, 8.6], [x + w, FY - 0.5, 8.6]], '#d3d7e4');
    s += F(onY(FY + 0.2, [[x - w, 0], [x + w, 0], [x + w, 8.6], [x, 10], [x - w, 8.6]]), '#ffffff');
  }
  return s;
};
items.push({ d: FY - 60, svg: fence(-76, DOOR[0] - 2.5) });
items.push({ d: FY - 16, svg: fence(DOOR[1] + 2.5, 20) });

// boîte aux lettres violette sur poteau, au bout de l'allée (drapeau rouge levé)
{
  const mx = DOOR[1] + 9, my = 80, zb = 15, w = 3.3, x0 = mx - 5, x1 = mx + 4, h1 = zb + 4.2;
  let s = `<ellipse cx="${P(mx + 3, my - 1, 0)[0].toFixed(1)}" cy="${P(mx + 3, my - 1, 0)[1].toFixed(1)}" rx="5.5" ry="2.2" fill="#5a4a3a" fill-opacity="0.16"/>`;
  s += cube(mx - 0.9, my - 0.9, 0, mx + 0.9, my + 0.9, zb, { lit: WOOD.lit, dark: WOOD.dark, top: WOOD.top });
  const arc = Array.from({ length: 9 }, (_, i) => { const t = Math.PI - (i / 8) * Math.PI; return [my + w * Math.cos(t), h1 + w * Math.sin(t)]; });
  s += F([[x0, my + w, zb], [x1, my + w, zb], [x1, my + w, h1], [x0, my + w, h1]], '#7c6bff');
  for (let i = 0; i < 8; i++) s += F([[x0, arc[i][0], arc[i][1]], [x1, arc[i][0], arc[i][1]], [x1, arc[i + 1][0], arc[i + 1][1]], [x0, arc[i + 1][0], arc[i + 1][1]]], i < 4 ? '#6352e6' : mix('#8a7cff', '#b3a9ff', (i - 4) / 3));
  s += F(onX(x1, [[my - w, zb], [my + w, zb], ...arc.slice().reverse()]), '#6352e6');
  s += Ln(onX(x1 + 0.02, [[my - 1.7, h1 + 0.8], [my + 1.7, h1 + 0.8]]), '#2e3a6e', 0.7);
  s += cube(x0 + 2.2, my + w, zb + 1.5, x0 + 2.9, my + w + 0.6, h1 + 5.4, { lit: '#ef4444', dark: '#c93434', top: '#f87171' });
  s += F(onY(my + w + 0.6, rect(x0 + 2.9, h1 + 2.8, x0 + 6.4, h1 + 5.4)), '#ef4444');
  items.push({ d: mx + my, svg: s });
}

const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs, body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// Manifeste : sommet = faîtage côté arrière (la cheminée reste plus basse) ; hit = maison + terrasse
const top = Math.min(P(RX0, YC, ZR + 1)[1], P(CH.x0 - 1, CH.y0 - 1, CH.top + 2.4)[1]);
const left = P(RX0, RY1, ZE)[0], right = P(RX1, RY0, ZE)[0], bottom = P(X1, TY1, 0)[1];
const man = { id: ID, title: TITLE, labelY: Math.round(top), hit: { x: Math.floor(left - 2), y: Math.floor(top - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - top + 4) } };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
