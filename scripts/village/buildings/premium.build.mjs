// Village PEG — sprite « Premium » : pavillon élégant.
// Podium blanc, toit en pavillon doré sur corniche, portique à colonnes blanches et fronton,
// tapis violet qui descend les marches, plaque couronne dorée sur la façade ombrée (+x), deux cyprès.
//   node buildings/premium.build.mjs && node tools/lint.mjs buildings/premium.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeCone, bush, pottedPlant } from '../tools/props.mjs';

const ID = 'premium', TITLE = 'Premium';

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

/* ───────────── palette ───────────── */
const WALL_L = grad('wallL', [[0, '#ffffff'], [1, '#eef0f6']]);
const WALL_R = grad('wallR', [[0, '#e8eaf3'], [1, '#d7dbe8']]);
const STONE = { lit: '#eceef5', dark: '#d3d7e4', top: '#f8f9fc' };
const GLASS_L = grad('glassL', [[0, '#a9cdff'], [1, '#6f9ef5']]);
const GLASS_R = grad('glassR', [[0, '#7da6ea'], [1, '#5579c6']]);
const GOLD = '#f6c95c', GOLD_D = '#e0ad3a', GOLD_B = shade(GOLD, 0.75), GOLD_RIM = tint(GOLD, 0.45);
const ROOF_L = grad('roofL', [[0, '#fad777'], [1, '#efbd4c']]);
const ROOF_R = grad('roofR', [[0, '#e6b443'], [1, '#d9a535']]);
const COL = grad('col', [[0, '#ffffff'], [0.45, '#f3f4f9'], [1, '#c9cedd']], [0, 0, 1, 0]);
const VIOLET = '#7c6bff', VIOLET_L = '#8a7cff', VIOLET_D = '#6352e6';
const SHADOW = '#3a2f4a';

/* ───────────── fenêtres cintrées ───────────── */
const arch = (a0, a1, b0, b1, n = 10) => {
  const r = (a1 - a0) / 2, c = (a0 + a1) / 2, pts = [[a0, b0], [a1, b0], [a1, b1 - r]];
  for (let i = 1; i < n; i++) { const t = (i / n) * Math.PI; pts.push([c + r * Math.cos(t), b1 - r + r * Math.sin(t)]); }
  pts.push([a0, b1 - r]);
  return pts;
};
/** Fenêtre cintrée sur la façade +x (a = y). */
function archX(x, y0, y1, z0, z1) {
  let s = F(onX(x, arch(y0 - 1.4, y1 + 1.4, z0 - 1.4, z1 + 1.4)), '#f3f4f9');
  s += F(onX(x, arch(y0, y1, z0, z1)), '#c5cad9');
  s += F(onX(x, arch(y0 + 1.3, y1, z0 + 1.3, z1)), GLASS_R);
  const w = y1 - y0 - 1.3, h = z1 - z0;
  const c = clip([[y0 + 1.3 + w * 0.55, z1], [y0 + 1.3 + w * 0.85, z1], [y0 + 1.3 + w * 0.85 + h * 0.5, z0], [y0 + 1.3 + w * 0.55 + h * 0.5, z0]], y0 + 1.3, z0 + 1.3, y1, z1 - (y1 - y0) / 2);
  if (c.length > 2) s += F(onX(x, c), '#ffffff', 0.25);
  s += Ln(onX(x, [[(y0 + y1) / 2 + 0.6, z0 + 1.3], [(y0 + y1) / 2 + 0.6, z1 - 0.2]]), '#f3f4f9', 0.9);
  s += Ln(onX(x, [[y0 + 1.3, z0 + (z1 - z0) * 0.45], [y1, z0 + (z1 - z0) * 0.45]]), '#f3f4f9', 0.9);
  s += cube(x, y0 - 2.2, z0 - 2.6, x + 1.6, y1 + 2.2, z0 - 1.2, { lit: '#eceef5', dark: '#d3d7e4', top: '#ffffff' });
  return s;
}
/** Fenêtre cintrée sur la façade +y (a = x). */
function archY(y, x0, x1, z0, z1) {
  let s = F(onY(y, arch(x0 - 1.4, x1 + 1.4, z0 - 1.4, z1 + 1.4)), '#ffffff');
  s += F(onY(y, arch(x0, x1, z0, z1)), '#d3d7e4');
  s += F(onY(y, arch(x0 + 1.3, x1, z0 + 1.3, z1)), GLASS_L);
  s += Ln(onY(y, [[(x0 + x1) / 2 + 0.6, z0 + 1.3], [(x0 + x1) / 2 + 0.6, z1 - 0.2]]), '#ffffff', 0.9);
  return s;
}

/* ───────────── pavillon ───────────── */
const X0 = -58, X1 = 22, Y0 = -56, Y1 = 24, HW = 54;            // corps carré (80 × 80)
const XC = (X0 + X1) / 2, YCm = (Y0 + Y1) / 2;
const POD = { x0: X0 - 5, x1: X1 + 5, y0: Y0 - 5, h: 4.5 };      // podium
const PX0 = -46, PX1 = 6, PY1 = Y1 + 13, PXc = (PX0 + PX1) / 2;  // portique (52 de large)
POD.y1 = PY1 + 1.5;
// corniche : le débord du toit (ROV) en masque les ROV unités du haut à l'écran ; elle descend donc
// assez bas pour que son filet d'or reste visible sous le toit.
const CORN = 1.8, CZ0 = HW - 6.5;
const RISE = 38, ROV = 3;                                        // toit
const RX0 = X0 - CORN - ROV, RX1 = X1 + CORN + ROV, RY0 = Y0 - CORN - ROV, RY1 = Y1 + CORN + ROV, RZ = HW + 1.2;
const APEX = [(RX0 + RX1) / 2, (RY0 + RY1) / 2, RZ + RISE];

let pav = '';
// podium + marches
pav += cube(POD.x0, POD.y0, 0, POD.x1, POD.y1, POD.h, STONE);
pav += F(onY(POD.y1, rect(POD.x0, POD.h - 0.8, POD.x1, POD.h)), '#ffffff', 0.9) + F(onX(POD.x1, rect(POD.y0, POD.h - 0.8, POD.y1, POD.h)), '#ffffff', 0.6);
const SX0 = PX0 - 1, SX1 = PX1 + 1;
pav += cube(SX0, POD.y1, 0, SX1, POD.y1 + 3.6, 3, STONE);
pav += cube(SX0, POD.y1 + 3.6, 0, SX1, POD.y1 + 7.2, 1.5, STONE);
// murs
pav += cube(X0, Y0, POD.h, X1, Y1, HW, { lit: WALL_L, dark: WALL_R });
pav += F(onY(Y1, rect(X0, POD.h, X1, POD.h + 3.5)), '#e3e5ef') + F(onX(X1, rect(Y0, POD.h, Y1, POD.h + 3.5)), '#cfd3e2');
// pilastres d'angle (léger relief) — aux deux bouts de chaque façade visible
pav += cube(X0, Y1 - 0.01, POD.h + 3.5, X0 + 3.2, Y1 + 1.2, CZ0, { lit: '#ffffff', dark: '#dde0eb' });
pav += cube(X1 - 3.2, Y1 - 0.01, POD.h + 3.5, X1, Y1 + 1.2, CZ0, { lit: '#ffffff', dark: '#dde0eb' });
pav += cube(X1 - 0.01, Y0, POD.h + 3.5, X1 + 1.2, Y0 + 3.2, CZ0, { lit: '#ffffff', dark: '#dde0eb' });

// façade +y (derrière le portique) : porte double vitrée, deux fenêtres cintrées
const DX0 = PXc - 6, DX1 = PXc + 6, DZ1 = POD.h + 29;
{
  pav += F(onY(Y1, arch(DX0 - 1.8, DX1 + 1.8, POD.h, DZ1 + 1.8)), '#ffffff');
  pav += F(onY(Y1, arch(DX0, DX1, POD.h, DZ1)), '#cfd3e2');
  pav += F(onY(Y1, arch(DX0 + 1.4, DX1, POD.h, DZ1)), grad('door', [[0, '#9cc3fb'], [1, '#5f86d6']]));
  pav += Ln(onY(Y1, [[PXc + 0.7, POD.h], [PXc + 0.7, DZ1 - 0.5]]), '#f6c95c', 1.1);
  pav += Ln(onY(Y1, [[DX0 + 1.4, POD.h + 16], [DX1, POD.h + 16]]), '#ffffff', 0.9, 0.8);
  pav += dot(P(PXc - 0.9, Y1, POD.h + 13), 0.8, GOLD) + dot(P(PXc + 2.3, Y1, POD.h + 13), 0.8, GOLD);
}
pav += archY(Y1, PX0 + 5, PX0 + 13, POD.h + 8, POD.h + 31);
pav += archY(Y1, PX1 - 12, PX1 - 4, POD.h + 8, POD.h + 31);

// façade +x : deux fenêtres cintrées encadrant la plaque couronne
pav += archX(X1, Y0 + 9, Y0 + 19, POD.h + 9, POD.h + 35);
pav += archX(X1, Y1 - 19, Y1 - 9, POD.h + 9, POD.h + 35);
const SIGN = { yc: YCm, zc: POD.h + 24, hw: 13.5, hh: 12.5 };
{
  const { yc, zc, hw, hh } = SIGN, t = 1.7;
  const shape = rrect(yc - hw, zc - hh, yc + hw, zc + hh, 3.4, 5);
  // ombre portée vers le bas-droite de l'écran (−y, −z), comme toutes les ombres du village
  pav += F(onX(X1, shape.map(([a, b]) => [a - 1.6, b - 2.1])), SHADOW, 0.12);
  for (let k = 0; k <= 3; k++) pav += F(onX(X1 + (t * k) / 3, shape), k < 3 ? '#c9cede' : '#ffffff');
  pav += F(onX(X1 + t, rrect(yc - hw + 1.4, zc - hh + 1.4, yc + hw - 1.4, zc + hh - 1.4, 2.3, 5)), GOLD_D);
  pav += F(onX(X1 + t, rrect(yc - hw + 2.6, zc - hh + 2.6, yc + hw - 2.6, zc + hh - 2.6, 1.5, 5)), '#ffffff');
  // couronne : bandeau + trois pointes à perles (u vers la droite de l'écran = −y)
  const U = (u, v) => [yc - u, zc - 6.2 + v];
  const crown = [U(-6.4, 1.2), U(6.4, 1.2), U(6.4, 4.2), U(8.0, 10.6), U(3.4, 6.6), U(0, 12.4), U(-3.4, 6.6), U(-8.0, 10.6), U(-6.4, 4.2)];
  pav += F(onX(X1 + t, crown.map(([a, b]) => [a - 0.5, b - 0.6])), '#b8861f', 0.55);
  pav += F(onX(X1 + t, crown), GOLD);
  pav += F(onX(X1 + t, [U(-6.4, 1.2), U(6.4, 1.2), U(6.4, 4.2), U(-6.4, 4.2)]), GOLD_D);
  for (const [u, v] of [[-8.0, 11.2], [0, 13.1], [8.0, 11.2]]) pav += F(onX(X1 + t, circ(...U(u, v), 1.45, 12)), GOLD_D) + F(onX(X1 + t, circ(...U(u + 0.3, v + 0.3), 0.6, 8)), '#fff6d8');
  pav += F(onX(X1 + t, circ(...U(0, 2.7), 1.3, 12)), VIOLET);
  pav += F(onX(X1 + t, circ(...U(-3.6, 2.7), 0.8, 10)), '#ffffff', 0.85) + F(onX(X1 + t, circ(...U(3.6, 2.7), 0.8, 10)), '#ffffff', 0.85);
  pav += F(onX(X1 + t, [U(-5.4, 5.4), U(-3.6, 5.4), U(-1.4, 10.6), U(-2.4, 10.6)]), '#fff6d8', 0.55);
}

// tapis violet : depuis la porte, sur le portique, les marches, puis au sol
const KX0 = PXc - 4.8, KX1 = PXc + 4.8, KY1 = 84;
let carpet = '';
carpet += F(onZ(POD.h + 0.05, rect(KX0, Y1, KX1, POD.y1)), VIOLET_L);
carpet += F(onY(POD.y1 + 0.02, rect(KX0, 3, KX1, POD.h)), VIOLET_D) + F(onZ(3.05, rect(KX0, POD.y1, KX1, POD.y1 + 3.6)), VIOLET_L);
carpet += F(onY(POD.y1 + 3.62, rect(KX0, 1.5, KX1, 3)), VIOLET_D) + F(onZ(1.55, rect(KX0, POD.y1 + 3.6, KX1, POD.y1 + 7.2)), VIOLET_L);
carpet += F(onY(POD.y1 + 7.22, rect(KX0, 0, KX1, 1.5)), VIOLET_D);
let carpetGround = F(onZ(0.05, rect(KX0, POD.y1 + 7.2, KX1, KY1)), VIOLET);
carpetGround += F(onZ(0.06, rect(KX0 + 0.6, POD.y1 + 7.2, KX0 + 1.2, KY1 - 0.6)), GOLD, 0.9) + F(onZ(0.06, rect(KX1 - 1.2, POD.y1 + 7.2, KX1 - 0.6, KY1 - 0.6)), GOLD, 0.9);
carpetGround += F(onY(KY1, rect(KX0, 0, KX1, 0.5)), VIOLET_D);
for (const [ya, yb, z] of [[Y1, POD.y1, POD.h + 0.06], [POD.y1, POD.y1 + 3.6, 3.06], [POD.y1 + 3.6, POD.y1 + 7.2, 1.56]]) {
  carpet += F(onZ(z, rect(KX0 + 0.6, ya, KX0 + 1.2, yb)), GOLD, 0.9) + F(onZ(z, rect(KX1 - 1.2, ya, KX1 - 0.6, yb)), GOLD, 0.9);
}

// colonnes (fût cylindrique ombré, base et chapiteau carrés)
const COLY = PY1 - 2.8, CZ_TOP = POD.h + 32;
const colXs = [PX0 + 2.8, PX0 + 2.8 + (PX1 - PX0 - 5.6) / 3, PX0 + 2.8 + (2 * (PX1 - PX0 - 5.6)) / 3, PX1 - 2.8];
let columns = '';
for (const cx of colXs) {
  columns += cube(cx - 2.8, COLY - 2.8, POD.h, cx + 2.8, COLY + 2.8, POD.h + 1.8, STONE);
  const [a, b] = P(cx, COLY, POD.h + 1.8), rx = 2.1 * Math.SQRT2 * 0.866, ry = 2.1 * Math.SQRT2 * 0.5, h = CZ_TOP - POD.h - 3.6;
  columns += `<path d="M${(a - rx).toFixed(1)} ${(b - h).toFixed(1)} L${(a - rx).toFixed(1)} ${b.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(a + rx).toFixed(1)} ${b.toFixed(1)} L${(a + rx).toFixed(1)} ${(b - h).toFixed(1)} Z" fill="${COL}"/>`;
  for (const f of [-0.45, 0.1, 0.6]) columns += `<path d="M${(a + f * rx).toFixed(1)} ${(b - h + ry * 0.9).toFixed(1)} L${(a + f * rx).toFixed(1)} ${(b + ry * Math.sqrt(1 - f * f) - 0.6).toFixed(1)}" stroke="#c9cedd" stroke-width="0.35" stroke-opacity="0.8"/>`;
  columns += cube(cx - 3, COLY - 3, CZ_TOP - 1.8, cx + 3, COLY + 3, CZ_TOP, STONE);
}
// entablement + fronton à toit doré (faîtage selon y)
const EZ0 = CZ_TOP, EZ1 = CZ_TOP + 5, PED = 11, EY1 = PY1 + 0.6;
let portico = '';
portico += cube(PX0 - 1, Y1, EZ0, PX1 + 1, EY1, EZ1, { lit: '#ffffff', dark: '#dadde9', top: '#f6f7fb' });
portico += F(onY(EY1, rect(PX0 - 1, EZ0 + 1.6, PX1 + 1, EZ0 + 2.4)), GOLD);
const pg = { x0: PX0 - 2, x1: PX1 + 2, y0: Y1, y1: EY1 + 1, z: EZ1, r: PED };
const pgc = (pg.x0 + pg.x1) / 2;
// pan +x du fronton : dégradé en coordonnées de la toile (userSpaceOnUse), pour que la pièce redessinée
// après la corniche (voir pedPatch) prenne exactement les mêmes couleurs que le pan entier
const PED_R = (() => {
  const ys = [[pg.x1, pg.y0, pg.z], [pg.x1, pg.y1, pg.z], [pgc, pg.y1, pg.z + pg.r], [pgc, pg.y0, pg.z + pg.r]].map((p) => P(...p)[1]);
  defs += `<linearGradient id="${ID}-pedR" gradientUnits="userSpaceOnUse" x1="0" y1="${Math.min(...ys).toFixed(1)}" x2="0" y2="${Math.max(...ys).toFixed(1)}"><stop offset="0" stop-color="#e6b443"/><stop offset="1" stop-color="#d9a535"/></linearGradient>`;
  return `url(#${ID}-pedR)`;
})();
portico += F([[pg.x0, pg.y0, pg.z], [pg.x0, pg.y1, pg.z], [pgc, pg.y1, pg.z + pg.r], [pgc, pg.y0, pg.z + pg.r]], GOLD_B);
portico += F([[pg.x1, pg.y0, pg.z], [pg.x1, pg.y1, pg.z], [pgc, pg.y1, pg.z + pg.r], [pgc, pg.y0, pg.z + pg.r]], PED_R);
portico += F(onY(pg.y1, [[pg.x0, pg.z - 0.8], [pg.x1, pg.z - 0.8], [pg.x1, pg.z], [pgc, pg.z + pg.r], [pg.x0, pg.z]]), '#ffffff');
portico += F(onY(pg.y1, [[pg.x0 + 3.4, pg.z + 0.9], [pg.x1 - 3.4, pg.z + 0.9], [pgc, pg.z + pg.r - 1.8]]), '#eef0f6');
portico += F(onY(pg.y1, circ(pgc, pg.z + 3.9, 2.2, 16)), GOLD) + F(onY(pg.y1, circ(pgc - 0.4, pg.z + 4.3, 0.8, 8)), '#fff6d8', 0.8);
portico += Ln(onY(pg.y1 + 0.1, [[pg.x0 - 0.4, pg.z - 0.2], [pgc, pg.z + pg.r + 0.5], [pg.x1 + 0.4, pg.z - 0.2]]), GOLD, 1.6);
// (liseré du faîtage : dessiné une seule fois, après la corniche — voir pedPatch)

// corniche blanche
let cornice = cube(X0 - CORN, Y0 - CORN, CZ0, X1 + CORN, Y1 + CORN, HW, { lit: '#ffffff', dark: '#dfe2ed', top: '#ffffff' });
cornice += F(onY(Y1 + CORN, rect(X0 - CORN, CZ0, X1 + CORN, CZ0 + 0.6)), '#e3e5ef') + F(onX(X1 + CORN, rect(Y0 - CORN, CZ0, Y1 + CORN, CZ0 + 0.6)), '#cfd3e2');
cornice += F(onY(Y1 + CORN, rect(X0 - CORN, CZ0 + 1.5, X1 + CORN, CZ0 + 2.5)), GOLD, 0.95) + F(onX(X1 + CORN, rect(Y0 - CORN, CZ0 + 1.5, Y1 + CORN, CZ0 + 2.5)), GOLD_D, 0.95);
// Le faîtage du fronton (z = 52,5) monte plus haut que le bas de la corniche (CZ0) : la partie des pans
// située DEVANT la face de corniche (y > Y1 + CORN) mais projetée sur elle était recouverte par la
// corniche, dessinée après. On redessine cette pièce après la corniche, puis le débord du toit la
// recouvre là où il passe réellement devant.
const pedPatch = (() => {
  const zL = (x) => pg.z + ((x - pg.x0) / (pgc - pg.x0)) * pg.r, zR = (x) => pg.z + ((pg.x1 - x) / (pg.x1 - pgc)) * pg.r;
  const ya = Y1 + CORN, yb = ya + 6, k = (CZ0 - 1 - pg.z) / pg.r;
  const xl = pg.x0 + k * (pgc - pg.x0), xr = pg.x1 - k * (pg.x1 - pgc);
  return F([[xl, ya, zL(xl)], [xl, yb, zL(xl)], [pgc, yb, pg.z + pg.r], [pgc, ya, pg.z + pg.r]], GOLD_B) +
    F([[xr, ya, zR(xr)], [xr, yb, zR(xr)], [pgc, yb, pg.z + pg.r], [pgc, ya, pg.z + pg.r]], PED_R) +
    // liseré du faîtage sur toute sa longueur ; sa partie arrière (dans la corniche) passe sous le débord
    Ln([[pgc, pg.y0, pg.z + pg.r + 0.3], [pgc, pg.y1, pg.z + pg.r + 0.3]], GOLD_RIM, 1);
})();
// débord du toit (sous les pans dorés)
const eave = cube(X0 - CORN - ROV, Y0 - CORN - ROV, HW, X1 + CORN + ROV, Y1 + CORN + ROV, RZ, { lit: '#f2e2b8', dark: '#dcc796', top: '#fff' });

// toit en pavillon doré (pyramide) + épi de faîtage
let roof = '';
const c00 = [RX0, RY0, RZ], c10 = [RX1, RY0, RZ], c11 = [RX1, RY1, RZ], c01 = [RX0, RY1, RZ];
roof += F([c00, c10, APEX], GOLD_B) + F([c00, c01, APEX], shade(GOLD, 0.8));
roof += F([c01, c11, APEX], ROOF_L) + F([c10, c11, APEX], ROOF_R);
// côtes de toiture (lignes vers l'épi) pour un effet de feuilles dorées
for (const t of [0.25, 0.5, 0.75]) {
  roof += Ln([[RX0 + (RX1 - RX0) * t, RY1, RZ], [APEX[0] + (RX0 + (RX1 - RX0) * t - APEX[0]) * 0.12, APEX[1] + (RY1 - APEX[1]) * 0.12, APEX[2] - RISE * 0.12]], '#e3ae3f', 0.6, 0.6);
  roof += Ln([[RX1, RY0 + (RY1 - RY0) * t, RZ], [APEX[0] + (RX1 - APEX[0]) * 0.12, APEX[1] + (RY0 + (RY1 - RY0) * t - APEX[1]) * 0.12, APEX[2] - RISE * 0.12]], '#c99630', 0.6, 0.6);
}
roof += Ln([c01, c11, c10], GOLD_RIM, 1.4);
roof += Ln([c11, APEX], GOLD_RIM, 1.3);
roof += Ln([c01, APEX], tint(GOLD, 0.3), 0.9, 0.7);
{
  const [ax, ay, az] = APEX;
  roof += cube(ax - 1.4, ay - 1.4, az - 1, ax + 1.4, ay + 1.4, az + 1.6, { lit: GOLD, dark: GOLD_D, top: GOLD_RIM });
  const b = P(ax, ay, az + 4.8);
  roof += dot(b, 3, GOLD_D) + dot([b[0] - 0.5, b[1] - 0.4], 2.4, GOLD) + dot([b[0] - 1.1, b[1] - 1.1], 0.9, '#fff6d8', 0.9);
  roof += Ln([[ax, ay, az + 7.6], [ax, ay, az + 11]], GOLD_D, 1);
}

/* ───────────── composition ───────────── */
const items = [];
const cs = contactShadow(`${ID}-cs`, 152, 70, 198, 300, 0.2);
defs += cs.defs;
items.push({ d: -300, svg: carpetGround });
// buis en pot sur le podium, de part et d'autre du portique, sans toucher les socles des colonnes.
// Celui de gauche est DERRIÈRE la première colonne (x plus petit) : il se dessine avant les colonnes,
// à l'intérieur du pavillon. Celui de droite est devant la dernière colonne : il passe après.
const potL = pottedPlant(PX0 - 4.6, PY1 - 3, { z: POD.h, pot: 'square', size: 0.9 });
const potR = pottedPlant(PX1 + 4.4, PY1 - 3, { z: POD.h, pot: 'square', size: 0.9 });
items.push({ d: XC + YCm, svg: pav + carpet + potL.svg + columns + portico + cornice + pedPatch + eave + roof });
// deux cyprès qui encadrent le pavillon (un de chaque côté à l'écran)
items.push(treeCone(-79, 30, { size: 1.12 }));
items.push(treeCone(46, -76, { size: 1.12 }));
// allée : haies basses de part et d'autre du tapis ; jardin à la française côté +x
// cordons VIP : poteaux dorés et cordes violettes de part et d'autre du tapis
const stanchions = (x, ys) => {
  let g = '';
  for (let i = 0; i < ys.length - 1; i++) {
    const pts = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([x, ys[i] + (ys[i + 1] - ys[i]) * t, 9.2 - 2.6 * Math.sin(Math.PI * t)]); }
    g += Ln(pts, VIOLET_D, 1.3) + Ln(pts.map(([a, b, c]) => [a, b, c + 0.35]), VIOLET_L, 0.5, 0.8);
  }
  for (const y of ys) {
    const b = P(x, y, 0), t = P(x, y, 10.2);
    g += `<ellipse cx="${(b[0] + 0.8).toFixed(1)}" cy="${(b[1] + 0.3).toFixed(1)}" rx="3.2" ry="1.4" fill="${SHADOW}" fill-opacity="0.14"/>`;
    g += `<ellipse cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" rx="2.1" ry="1.1" fill="${GOLD_D}"/>`;
    g += `<path d="M${(b[0] - 0.55).toFixed(1)} ${(b[1] - 0.4).toFixed(1)} L${(t[0] - 0.55).toFixed(1)} ${t[1].toFixed(1)} L${(t[0] + 0.55).toFixed(1)} ${t[1].toFixed(1)} L${(b[0] + 0.55).toFixed(1)} ${(b[1] - 0.4).toFixed(1)} Z" fill="${GOLD_D}"/>`;
    g += `<path d="M${(b[0] - 0.55).toFixed(1)} ${(b[1] - 0.4).toFixed(1)} L${(t[0] - 0.55).toFixed(1)} ${t[1].toFixed(1)} L${(t[0] - 0.05).toFixed(1)} ${t[1].toFixed(1)} L${(b[0] - 0.05).toFixed(1)} ${(b[1] - 0.4).toFixed(1)} Z" fill="${GOLD}"/>`;
    g += dot([t[0], t[1] - 0.6], 1.25, GOLD_D) + dot([t[0] - 0.3, t[1] - 0.9], 0.85, GOLD) + dot([t[0] - 0.5, t[1] - 1.1], 0.35, '#fff6d8', 0.9);
  }
  return g;
};
const SY = [POD.y1 + 11, POD.y1 + 23, POD.y1 + 35];
items.push({ d: KX0 - 2.6 + SY[1], svg: stanchions(KX0 - 2.6, SY) });
items.push({ d: KX1 + 2.6 + SY[1], svg: stanchions(KX1 + 2.6, SY) });
items.push(bush(X1 + 15, Y0 + 18, { w: 9, d: 26, h: 8 }));
items.push(bush(X1 + 15, Y1 - 18, { w: 9, d: 26, h: 8 }));
items.push(potR);
// haut de la palette des personnages (le bleu nuit d'origine disparaissait sur le tapis violet)
items.push(person(PXc + 1, 62, { facing: 'back-right', pose: 'walk', top: '#0ea5e9', pants: '#2b2f45', hairStyle: 'bun', skin: '#c98f6a' }));

const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs, body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// Manifeste : sommet = pointe du toit (épi compris, sans la tige fine) ; hit = pavillon + portique
const top = P(APEX[0], APEX[1], APEX[2] + 7.8)[1];
// bas = coin avant-droit du podium (plus bas à l'écran que les marches)
const left = P(POD.x0, POD.y1, 0)[0], right = Math.max(P(RX1, RY0, RZ)[0], P(POD.x1, POD.y0, 0)[0]);
const bottom = Math.max(P(SX1, POD.y1 + 7.2, 0)[1], P(POD.x1, POD.y1, 0)[1]);
const man = { id: ID, title: TITLE, labelY: Math.round(top), hit: { x: Math.floor(left - 2), y: Math.floor(top - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - top + 4) } };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
void mix;
