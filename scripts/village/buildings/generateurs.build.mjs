// Village PEG — sprite « Générateurs » : le club des apporteurs d'affaires.
// Pavillon moderne à toit plat turquoise en porte-à-faux, grande baie vitrée (salon visible avec
// écran « réseau »), terrasse en bois, plaque « réseau » (3 points reliés) sur la façade +x,
// deux personnages qui se serrent la main.
//   node buildings/generateurs.build.mjs && node tools/lint.mjs buildings/generateurs.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, pottedPlant } from '../tools/props.mjs';

const ID = 'generateurs', TITLE = 'Générateurs';

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
const cube = (x0, y0, z0, x1, y1, z1, { lit, dark, top }) =>
  F([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], lit) +
  F([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], dark) +
  (top ? F([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top) : '');
const dot = (p, r, fill, o) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${fill}"${op(o)}/>`;
// écran : chemin à partir de points déjà projetés, et découpe par un polygone convexe (vitrage)
const S = (pts, fill, o) => (pts.length > 2 ? `<path d="M${pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')} Z" fill="${fill}"${op(o)}/>` : '');
const clipConvex = (subject, clipper) => {
  let out = subject;
  const n = clipper.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = clipper[i], b = clipper[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = Math.sign(area);
  for (let i = 0; i < n && out.length; i++) {
    const a = clipper[i], b = clipper[(i + 1) % n];
    const side = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const src = out; out = [];
    for (let j = 0; j < src.length; j++) {
      const p = src[j], q = src[(j + 1) % src.length], sp = side(p), sq = side(q);
      const cut = () => { const t = sp / (sp - sq); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
      if (sq >= 0) { if (sp < 0) out.push(cut()); out.push(q); } else if (sp >= 0) out.push(cut());
    }
  }
  return out;
};

/* ───────────── palette ───────────── */
const WALL_L = grad('wallL', [[0, '#ffffff'], [1, '#eef0f6']]);
const WALL_R = grad('wallR', [[0, '#e8eaf3'], [1, '#d7dbe8']]);
const PLINTH = { lit: '#e3e5ef', dark: '#cfd3e2', top: '#eef0f6' };
const TQ = '#2bb5a5', TQ_D = '#1f9a8c', TQ_L = tint(TQ, 0.35);
const NAVY = '#2e3a6e';
const WOOD = { lit: '#d9a066', dark: '#c08549', top: '#e2b27c' };
const SHADOW = '#3a2f4a';

/* ───────────── volumes ───────────── */
const SH = 1.6;                                                     // dalle claire du village
const X0 = -62, X1 = 28, Y0 = -50, Y1 = 8, HW = 44, FZ = SH + 1;    // corps (90 × 58) ; FZ = plancher
const GX0 = X0 + 2.5, GX1 = -2;                                     // baie vitrée sur +y
const CANT = 10;                                                    // porte-à-faux du toit côté terrasse
const R = { x0: X0 - 2.5, x1: X1 + 2.5, y0: Y0 - 2.5, y1: Y1 + CANT, z0: HW, z1: HW + 5 };
const SLAB = { x0: X0 - 6, x1: X1 + 8, y0: Y0 - 6, y1: Y1 + 30 };

let ground = '';
{
  const { x0, x1, y0, y1 } = SLAB;
  ground += F([[x0, y1, 0], [x1, y1, 0], [x1, y1, SH], [x0, y1, SH]], '#e3e5ef');
  ground += F([[x1, y0, 0], [x1, y1, 0], [x1, y1, SH], [x1, y0, SH]], '#cfd3e2');
  ground += F(onZ(SH, rect(x0, y0, x1, y1)), grad('slab', [[0, '#f6f7fa'], [1, '#eef0f5']]));
  ground += Ln([[x0, y1, SH], [x1, y1, SH], [x1, y0, SH]], '#ffffff', 0.9, 0.85);
  let j = '';
  for (let y = y0 + 18; y < y1 - 4; y += 18) j += line([[x1 - 0.4, y, SH], [X1 + 0.6, y, SH]]) + ' ';
  ground += `<path d="${j.trim()}" fill="none" stroke="#dde0ea" stroke-width="0.6"/>`;
}

let bld = '';
bld += cube(X0 - 1, Y0 - 1, SH, X1 + 1, Y1, FZ, PLINTH);
// intérieur vu à travers la baie (découpé au contour du vitrage)
const glassZ0 = FZ + 0.6, glassZ1 = HW - 0.6;
const glassScreen = [P(GX0, Y1, glassZ0), P(GX1, Y1, glassZ0), P(GX1, Y1, glassZ1), P(GX0, Y1, glassZ1)];
const IN = (worldPts, fill, o) => S(clipConvex(worldPts.map(([x, y, z]) => P(x, y, z)), glassScreen), fill, o);
let inside = '';
// Vu d'en haut à travers la baie, on voit le sol et le mur gauche de la pièce (jamais le mur du fond).
inside += IN([[X0 + 1, Y0 + 1, FZ], [X0 + 1, Y0 + 1, HW], [X0 + 1, Y1, HW], [X0 + 1, Y1, FZ]], '#d3d9e8');
inside += IN([[X0 + 1, Y0 + 1, FZ], [X1 - 1, Y0 + 1, FZ], [X1 - 1, Y1, FZ], [X0 + 1, Y1, FZ]], '#ead9c4');
inside += IN([[X0 + 1, Y1 - 30, FZ + 0.02], [GX1 - 2, Y1 - 30, FZ + 0.02], [GX1 - 2, Y1 - 4, FZ + 0.02], [X0 + 1, Y1 - 4, FZ + 0.02]], '#f3ecf8', 0.7);
// grand écran au mur gauche : graphe « réseau » turquoise (y croissant = vers la gauche à l'écran)
{
  const sx = X0 + 1.1, ya = Y1 - 21, yb = Y1 - 4, z0 = FZ + 9, z1 = FZ + 22;
  inside += IN(onX(sx, rect(ya - 0.8, z0 - 0.8, yb + 0.8, z1 + 0.8)), '#3a4473');
  inside += IN(onX(sx, rect(ya, z0, yb, z1)), '#1f2850');
  const m = (ya + yb) / 2, zm = (z0 + z1) / 2;
  const nodes = [[yb - 3, zm], [m - 0.5, zm + 4], [m - 0.5, zm - 4], [ya + 3, zm + 0.6]];
  for (const [i, k] of [[0, 1], [0, 2], [1, 3], [2, 3], [1, 2]]) {
    const p = nodes[i], q = nodes[k];
    inside += IN(onX(sx, [[p[0], p[1] - 0.3], [q[0], q[1] - 0.3], [q[0], q[1] + 0.3], [p[0], p[1] + 0.3]]), '#5fd0c3', 0.85);
  }
  for (const [y, z] of nodes) inside += IN(onX(sx, circ(y, z, 1.4, 12)), '#9ad1ff');
  inside += IN(onX(sx, circ(nodes[0][0], nodes[0][1], 1.4, 12)), TQ);
}
// table de réunion blanche près de la vitre, fauteuils turquoise / violets
{
  const tx0 = X0 + 14, tx1 = X0 + 36, ty0 = Y1 - 17, ty1 = Y1 - 8, tz = FZ + 10;
  const chair = (cx, cy, col, backSide) => {
    let c = '';
    if (backSide < 0) c += IN([[cx - 2.6, cy - 2.6, FZ + 5], [cx + 2.6, cy - 2.6, FZ + 5], [cx + 2.6, cy - 2.6, FZ + 12], [cx - 2.6, cy - 2.6, FZ + 12]], shade(col, 0.85));
    c += IN([[cx - 2.6, cy + 2.6, FZ], [cx + 2.6, cy + 2.6, FZ], [cx + 2.6, cy + 2.6, FZ + 5], [cx - 2.6, cy + 2.6, FZ + 5]], col);
    c += IN([[cx + 2.6, cy - 2.6, FZ], [cx + 2.6, cy + 2.6, FZ], [cx + 2.6, cy + 2.6, FZ + 5], [cx + 2.6, cy - 2.6, FZ + 5]], shade(col, 0.8));
    c += IN(onZ(FZ + 5, rect(cx - 2.6, cy - 2.6, cx + 2.6, cy + 2.6)), tint(col, 0.22));
    if (backSide > 0) c += IN([[cx - 2.6, cy + 2.6, FZ + 5], [cx + 2.6, cy + 2.6, FZ + 5], [cx + 2.6, cy + 2.6, FZ + 11], [cx - 2.6, cy + 2.6, FZ + 11]], shade(col, 0.9));
    return c;
  };
  for (const [cx, col] of [[tx0 + 5, TQ], [tx0 + 13, '#7c6bff'], [tx0 + 21, TQ]]) inside += chair(cx, ty0 - 3.2, col, -1);
  inside += IN([[tx0 + 1, ty1 - 1, FZ], [tx0 + 2, ty1 - 1, FZ], [tx0 + 2, ty1 - 1, tz], [tx0 + 1, ty1 - 1, tz]], '#9aa2b4');
  inside += IN([[tx1 - 2, ty1 - 1, FZ], [tx1 - 1, ty1 - 1, FZ], [tx1 - 1, ty1 - 1, tz], [tx1 - 2, ty1 - 1, tz]], '#9aa2b4');
  inside += IN([[tx0, ty1, tz - 1.2], [tx1, ty1, tz - 1.2], [tx1, ty1, tz], [tx0, ty1, tz]], '#dfe2ed');
  inside += IN([[tx1, ty0, tz - 1.2], [tx1, ty1, tz - 1.2], [tx1, ty1, tz], [tx1, ty0, tz]], '#c9cede');
  inside += IN(onZ(tz, rect(tx0, ty0, tx1, ty1)), '#ffffff');
  inside += IN(onZ(tz + 0.05, rect(tx0 + 5, ty0 + 2, tx0 + 9, ty0 + 5)), '#9ad1ff') + IN(onZ(tz + 0.05, rect(tx0 + 13, ty0 + 2.5, tx0 + 16, ty0 + 5.5)), '#f6c95c');
  for (const [cx, col] of [[tx0 + 6, '#7c6bff'], [tx0 + 16, TQ]]) inside += chair(cx, ty1 + 3.2, col, 1);
  // (pas de suspensions : sous le porte-à-faux, la vitre n'est visible que jusqu'à z ≈ 34 ;
  //  une lampe pendue au-dessus de la table resterait entièrement cachée par la rive du toit)
  // grande plante en pot dans l'angle droit de la baie
  const px = GX1 - 9, py = Y1 - 11, pc = P(px, py, FZ);
  inside += IN([[px - 2.5, py + 2.5, FZ], [px + 2.5, py + 2.5, FZ], [px + 2.5, py + 2.5, FZ + 6], [px - 2.5, py + 2.5, FZ + 6]], '#ffffff') + IN([[px + 2.5, py - 2.5, FZ], [px + 2.5, py + 2.5, FZ], [px + 2.5, py + 2.5, FZ + 6], [px + 2.5, py - 2.5, FZ + 6]], '#d9dce8');
  for (const [dx, dy, r, c] of [[0, -14, 4.2, '#3f9d5c'], [-1, -15, 3.4, '#5cc27a'], [2.5, -19, 3.4, '#3f9d5c'], [1.5, -20, 2.6, '#5cc27a'], [-2.5, -20.5, 2.8, '#5cc27a']]) inside += S(clipConvex(circ(pc[0] + dx, pc[1] + dy, r, 14), glassScreen), c);
}
bld += inside;
// vitrage : teinte bleue translucide, reflets, menuiseries bleu nuit
bld += F(onY(Y1, rect(GX0, glassZ0, GX1, glassZ1)), grad('glass', [[0, '#a9cdff', 0.38], [1, '#6f9ef5', 0.5]]));
{
  const g = [GX0, glassZ0, GX1, glassZ1], w = GX1 - GX0, h = glassZ1 - glassZ0;
  for (const [a, b] of [[0.05, 0.17], [0.23, 0.27], [0.52, 0.63], [0.69, 0.72]]) {
    const c = clip([[GX0 + w * a, glassZ1], [GX0 + w * b, glassZ1], [GX0 + w * b - h * 0.6, glassZ0], [GX0 + w * a - h * 0.6, glassZ0]], ...g);
    if (c.length > 2) bld += F(onY(Y1, c), '#ffffff', 0.22);
  }
  for (let k = 1; k < 6; k++) { const x = GX0 + (w * k) / 6; bld += Ln(onY(Y1, [[x, glassZ0], [x, glassZ1]]), NAVY, 0.9); }
  bld += Ln(onY(Y1, [[GX0, glassZ0 + 0.3], [GX1, glassZ0 + 0.3]]), NAVY, 1.1);
  bld += Ln(onY(Y1, [[GX0 + (w * 4) / 6 - 1.6, FZ + 12], [GX0 + (w * 4) / 6 - 1.6, FZ + 18]]), '#e8ecf5', 1);
}
// bandeaux blancs autour de la baie
bld += F(onY(Y1, rect(X0, FZ, GX0, HW)), WALL_L) + F(onY(Y1, rect(GX1, FZ, X1, HW)), WALL_L);
bld += F(onY(Y1, rect(GX0, HW - 0.6, GX1, HW)), '#ffffff');
// partie pleine à droite : fenêtre à deux vantaux
{
  const a = GX1 + 7, b = X1 - 6, z0 = FZ + 11, z1 = HW - 7;
  bld += F(onY(Y1, rect(a - 1.2, z0 - 1.2, b + 1.2, z1 + 1.2)), '#eef0f6');
  bld += F(onY(Y1, rect(a, z0, b, z1)), grad('win2', [[0, '#a9cdff'], [1, '#6f9ef5']]));
  bld += F(onY(Y1, [[a + 2, z1], [a + 6.5, z1], [a + 1.5, z0], [a, z0], [a, z0 + 3]]), '#ffffff', 0.3);
  bld += Ln(onY(Y1, [[(a + b) / 2, z0], [(a + b) / 2, z1]]), NAVY, 0.9);
}
// façade +x pleine : plaque « réseau » + deux fentes vitrées
bld += F(onX(X1, rect(Y0, FZ, Y1, HW)), WALL_R);
// soubassement (bande de 4 au pied des murs pleins, comme les autres bâtiments) + filet clair
bld += F(onX(X1, rect(Y0, FZ, Y1, FZ + 4)), PLINTH.dark) + F(onX(X1, rect(Y0, FZ + 4, Y1, FZ + 4.6)), '#ffffff', 0.5);
for (const [a, b] of [[X0, GX0], [GX1, X1]]) bld += F(onY(Y1, rect(a, FZ, b, FZ + 4)), PLINTH.lit) + F(onY(Y1, rect(a, FZ + 4, b, FZ + 4.6)), '#ffffff', 0.8);
const SLIT = grad('slit', [[0, '#7da6ea'], [1, '#5579c6']]);
for (const [ya, yb] of [[Y0 + 5, Y0 + 10], [Y1 - 10, Y1 - 5]]) {
  bld += F(onX(X1, rect(ya - 1, FZ + 7, yb + 1, HW - 5)), '#eceef5');
  bld += F(onX(X1, rect(ya, FZ + 8, yb, HW - 6)), SLIT);
  bld += F(onX(X1, [[yb - 1, HW - 6], [yb, HW - 6], [yb, HW - 12], [ya, FZ + 14]]), '#ffffff', 0.25);
}
const SIGN = { yc: (Y0 + Y1) / 2, zc: FZ + 21, hw: 13.5, hh: 13 };
{
  const { yc, zc, hw, hh } = SIGN, t = 1.8;
  const shape = rrect(yc - hw, zc - hh, yc + hw, zc + hh, 3.6, 5);
  // ombre portée vers le bas-droite de l'écran (−y, −z), comme toutes les ombres du village
  bld += F(onX(X1, shape.map(([a, b]) => [a - 1.6, b - 2.1])), SHADOW, 0.12);
  for (let k = 0; k <= 3; k++) bld += F(onX(X1 + (t * k) / 3, shape), k < 3 ? '#c9cede' : '#ffffff');
  bld += F(onX(X1 + t, rrect(yc - hw + 1.5, zc - hh + 1.5, yc + hw - 1.5, zc + hh - 1.5, 2.4, 5)), TQ_D);
  bld += F(onX(X1 + t, rrect(yc - hw + 2.8, zc - hh + 2.8, yc + hw - 2.8, zc + hh - 2.8, 1.5, 5)), '#ffffff');
  // icône « réseau » : un nœud à gauche relié à deux nœuds à droite (u → droite de l'écran = −y)
  const U = (u, v) => [yc - u, zc + v];
  const A = U(-5.8, 0), B = U(5.6, 5.8), C = U(5.6, -5.8);
  const bar = (p, q, w) => { const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz), nx = (-dz / l) * w, nz = (dx / l) * w; return [[p[0] + nx, p[1] + nz], [q[0] + nx, q[1] + nz], [q[0] - nx, q[1] - nz], [p[0] - nx, p[1] - nz]]; };
  bld += F(onX(X1 + t, bar(A, B, 0.95)), NAVY) + F(onX(X1 + t, bar(A, C, 0.95)), NAVY);
  for (const c of [A, B, C]) {
    bld += F(onX(X1 + t, circ(c[0], c[1], 3.4, 20)), TQ);
    bld += F(onX(X1 + t, circ(c[0] + 0.8, c[1] + 0.9, 1.2, 10)), '#ffffff', 0.55);
  }
}
// bandeau d'ombre sous le porte-à-faux
bld += F(onY(Y1, rect(X0, HW - 5, X1, HW)), grad('eaveSh', [[0, SHADOW, 0.22], [1, SHADOW, 0]]));
bld += F(onX(X1, rect(Y0, HW - 3, Y1, HW)), SHADOW, 0.07);

/* ───────────── toit plat turquoise ───────────── */
let roof = '';
roof += F([[R.x0, R.y1, R.z0], [R.x1, R.y1, R.z0], [R.x1, R.y1, R.z1], [R.x0, R.y1, R.z1]], grad('fasciaL', [[0, '#3cc6b6'], [1, TQ]]));
roof += F([[R.x1, R.y0, R.z0], [R.x1, R.y1, R.z0], [R.x1, R.y1, R.z1], [R.x1, R.y0, R.z1]], TQ_D);
roof += F(onZ(R.z1, rect(R.x0, R.y0, R.x1, R.y1)), TQ_L);
const RI = 2.2;
roof += F(onZ(R.z1, rect(R.x0 + RI, R.y0 + RI, R.x1 - RI, R.y1 - RI)), grad('roofIn', [[0, '#3fbfb0'], [1, '#2aa999']]));
roof += F([[R.x0 + RI, R.y0 + RI, R.z1], [R.x1 - RI, R.y0 + RI, R.z1], [R.x1 - RI, R.y0 + RI + 0.9, R.z1], [R.x0 + RI, R.y0 + RI + 0.9, R.z1]], '#1d8b7f', 0.6);
roof += F([[R.x0 + RI, R.y0 + RI, R.z1], [R.x0 + RI + 0.9, R.y0 + RI, R.z1], [R.x0 + RI + 0.9, R.y1 - RI, R.z1], [R.x0 + RI, R.y1 - RI, R.z1]], '#1d8b7f', 0.45);
roof += Ln([[R.x0, R.y1, R.z1], [R.x1, R.y1, R.z1], [R.x1, R.y0, R.z1]], tint(TQ, 0.55), 1.2);
roof += Ln([[R.x0, R.y1, R.z0 + 0.3], [R.x1, R.y1, R.z0 + 0.3]], TQ_D, 0.8, 0.6);
// lanterneaux + petit jardin sur le toit
for (const [sx, sy] of [[X0 + 14, Y0 + 16], [X0 + 34, Y0 + 16]]) {
  roof += cube(sx - 5.5, sy - 4.5, R.z1, sx + 5.5, sy + 4.5, R.z1 + 3, { lit: '#f4f5f9', dark: '#d9dce8', top: '#ffffff' });
  roof += F(onZ(R.z1 + 3.01, rect(sx - 4.5, sy - 3.5, sx + 4.5, sy + 3.5)), grad(`sky${sx}`, [[0, '#a9cdff'], [1, '#7da6ea']]));
  roof += F(onZ(R.z1 + 3.02, [[sx - 3.5, sy - 3.5], [sx - 1.3, sy - 3.5], [sx + 1, sy + 3.5], [sx - 1.2, sy + 3.5]]), '#ffffff', 0.35);
}
{
  const gx0 = X1 - 30, gx1 = X1 - 14, gy0 = Y0 + 12, gy1 = Y0 + 36;
  roof += cube(gx0, gy0, R.z1, gx1, gy1, R.z1 + 2, { lit: '#e3e5ef', dark: '#cfd3e2', top: '#8c6b4f' });
  for (let i = 0; i < 8; i++) {
    const p = P(gx0 + 3 + (i % 3) * 5, gy0 + 4 + Math.floor(i / 3) * 8, R.z1 + 3.2);
    if (i === 7) continue;
    roof += dot(p, 3, '#3f9d5c') + dot([p[0] - 0.6, p[1] - 0.8], 2.3, '#5cc27a') + dot([p[0] - 1.1, p[1] - 1.5], 0.9, '#7bd393', 0.8);
  }
}

/* ───────────── terrasse ───────────── */
const TX1 = X1 - 8, TY1 = Y1 + 26;
let deck = cube(X0 - 1, Y1, SH, TX1, TY1, FZ, { lit: WOOD.dark, dark: shade(WOOD.dark, 0.9), top: WOOD.lit });
for (let x = X0 + 2.2; x < TX1 - 0.5; x += 3.4) deck += Ln([[x, Y1, FZ], [x, TY1, FZ]], '#c08549', 0.45, 0.5);
// salon de jardin : deux fauteuils et une table basse sous le porte-à-faux
let lounge = '';
{
  const chair = (cx, cy, col) => cube(cx - 3.5, cy - 3.5, FZ, cx + 3.5, cy + 3.5, FZ + 4, { lit: '#f7f7fb', dark: '#d9dce8', top: '#ffffff' }) +
    cube(cx - 3.5, cy - 3.5, FZ + 4, cx - 1.8, cy + 3.5, FZ + 9, { lit: '#f7f7fb', dark: '#d9dce8', top: '#ffffff' }) +
    cube(cx - 1.8, cy - 3, FZ + 4, cx + 3, cy + 3, FZ + 5.4, { lit: col, dark: shade(col, 0.85), top: tint(col, 0.2) });
  lounge += chair(X0 + 6, Y1 + 7, TQ) + chair(X0 + 6, Y1 + 17, '#7c6bff');
  lounge += cube(X0 + 14, Y1 + 9, FZ, X0 + 20, Y1 + 15, FZ + 4.5, { lit: WOOD.lit, dark: WOOD.dark, top: '#e9c08e' });
  lounge += F(onZ(FZ + 4.55, rect(X0 + 15.5, Y1 + 10.5, X0 + 18, Y1 + 12.5)), '#ffffff');
}

/* ───────────── poignée de main ───────────── */
// person() en pose « wave » : le bras levé (dernier élément dessiné) est remplacé par un bras tendu
// vers l'autre personne, au même dessin (manche, peau, main, liseré).
function handshaker(x, y, facing, opts) {
  const p = person(x, y, { ...opts, facing, pose: 'wave' });
  const gi = p.svg.indexOf('<g '), ge = p.svg.indexOf('</g>', gi);
  const tags = (str) => str.match(/<(path|circle|ellipse)\s[^>]*\/>/g) || [];
  const rimIn = tags(p.svg.slice(p.svg.indexOf('>', gi) + 1, ge));
  const head = p.svg.slice(gi, p.svg.indexOf('>', gi) + 1);
  const body = tags(p.svg.slice(ge + 4));
  // Garde-fou : la même personne en pose « stand » ne diffère que par le bras proche. Si person()
  // change d'ordre interne, ce contrôle casse la construction au lieu de produire un bras orphelin.
  {
    const ref = person(x, y, { ...opts, facing, pose: 'stand' });
    const rgi = ref.svg.indexOf('<g '), rge = ref.svg.indexOf('</g>', rgi);
    const refRim = tags(ref.svg.slice(ref.svg.indexOf('>', rgi) + 1, rge)), refBody = tags(ref.svg.slice(rge + 4));
    const same = refRim.length === rimIn.length && refRim.slice(0, -3).join('') === rimIn.slice(0, -3).join('') &&
      refBody.length === body.length && body.slice(0, -3).every((t) => refBody.includes(t)) && !body.slice(-3).every((t) => refBody.includes(t));
    if (!same) throw new Error('generateurs/handshaker : person() a changé son ordre de dessin — adapter le remplacement du bras levé');
  }
  const Fv = { right: [1, 0], left: [0, 1], 'back-right': [0, -1], 'back-left': [-1, 0] }[facing];
  const Sd = [-Fv[1], Fv[0]], near = Sd[0] + Sd[1] > 0 ? 1 : -1, hip = 13.2, z = opts.z ?? 0;
  const Q = (u, v, h) => P(x + u * Fv[0] + v * Sd[0], y + u * Fv[1] + v * Sd[1], z + h);
  const v = 2.95 * near;
  const sh = Q(0, v, hip + 6.6), el = Q(2.4, v * 1.08, hip + 3.0), hd = Q(5.3, v * 0.55, hip + 3.4);
  const sl0 = Q(0, v * 0.8, hip + 7.0), sl1 = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2];
  const pl = (pts) => 'M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L');
  const skin = opts.skin ?? '#f2c7a5', top = opts.top ?? '#7c6bff';
  const arm = `<path d="${pl([sh, el, hd])}" fill="none" stroke="${skin}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${hd[0].toFixed(1)}" cy="${hd[1].toFixed(1)}" r="1.1" fill="${skin}"/>` +
    `<path d="${pl([sl0, sl1])}" fill="none" stroke="${top}" stroke-width="2.7" stroke-linecap="round"/>`;
  const armRim = `<path d="${pl([sh, el, hd])}" fill="none" stroke-width="3.4"/><circle cx="${hd[0].toFixed(1)}" cy="${hd[1].toFixed(1)}" r="1.1"/><path d="${pl([sl0, sl1])}" fill="none" stroke-width="4.2"/>`;
  const svg = p.svg.slice(0, gi) + head + rimIn.slice(0, -3).join('') + armRim + '</g>' + body.slice(0, -3).join('') + arm;
  return { d: p.d, svg, box: p.box };
}
const HX = -18, HY = Y1 + 19;
const shakerA = handshaker(HX - 5.3, HY, 'right', { top: '#7c6bff', hairStyle: 'short', z: FZ });
const shakerB = handshaker(HX + 5.3, HY, 'back-left', { top: '#f59e0b', hairStyle: 'bun', hair: '#6b4a2f', skin: '#c98f6a', z: FZ });

/* ───────────── composition ───────────── */
const items = [];
const cs = contactShadow(`${ID}-cs`, 152, 70, 198, 298, 0.2);
defs += cs.defs;
items.push({ d: -300, svg: ground });
items.push(treeRound(-76, 28, { size: 1.08 }));
items.push(treeCone(46, -72, { size: 1.08 }));
items.push({ d: -40, svg: bld + roof });
items.push({ d: -38, svg: deck + lounge });
items.push(pottedPlant(TX1 - 5, Y1 + 4, { z: FZ, pot: 'square', size: 1.1 }));
items.push(shakerA, shakerB);
// haies au sol, le long du bord +x de la dalle (qui s'arrête à x = X1 + 8) : posées à z = 0, pas à
// la hauteur de la dalle — sinon elles flottent de 1,6 au-dessus du sol.
items.push(bush(X1 + 15, Y0 + 16, { w: 10, d: 24, h: 9 }));
items.push(bush(X1 + 14, Y1 - 2, { w: 11, d: 11, h: 10 }));

const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs, body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// Manifeste : sommet = dessus du toit (coin arrière) ; hit = pavillon + terrasse
const top = P(R.x0, R.y0, R.z1)[1];
const left = P(R.x0, R.y1, R.z0)[0], right = P(R.x1, R.y0, R.z0)[0], bottom = Math.max(P(TX1, TY1, 0)[1], P(R.x1, R.y1, 0)[1]);
const man = { id: ID, title: TITLE, labelY: Math.round(top), hit: { x: Math.floor(left - 2), y: Math.floor(top - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - top + 4) } };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
void mix;
