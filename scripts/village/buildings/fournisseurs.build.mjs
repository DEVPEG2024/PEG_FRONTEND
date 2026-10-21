// Village PEG — « Fournisseurs » : l'entrepôt (réf. « Livraisons » de ref.png).
// Hangar blanc à toit bleu nuit à deux pans (faîtage selon y, pignon sur la face éclairée +y),
// deux portes de quai : la camionnette PEG à reculons dans la première, la seconde ouverte sur
// l'intérieur (rayonnage chargé de cartons). Côté +x : porte vitrée, grande enseigne camion violet,
// cartons, transpalette jaune, palette.
//   node buildings/fournisseurs.build.mjs && node tools/lint.mjs buildings/fournisseurs.svg
import { writeFileSync } from 'node:fs';
import { P, contactShadow, svgDoc, tint } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, crate, pallet, van, bounds } from '../tools/props.mjs';

const ID = 'fournisseurs', TITLE = 'Fournisseurs';

/* ───────────── outils ───────────── */
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const defs = [];
const url = (n) => `url(#${ID}-${n})`;
function lin(n, stops, v = [0, 0, 0, 1]) {
  defs.push(`<linearGradient id="${ID}-${n}" x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return url(n);
}
/** chemin écran fermé (ou non) */
const S = (pts, close = true) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L') + (close ? ' Z' : '');
/** points monde → écran */
const W = (pts) => pts.map(([x, y, z]) => P(x, y, z));
const fill = (d, c, o, more = '') => `<path d="${d}" fill="${c}"${o != null && o < 1 ? ` fill-opacity="${o}"` : ''}${more}/>`;
const strk = (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o != null && o < 1 ? ` stroke-opacity="${o}"` : ''}/>`;
/** face monde pleine (+ joint de même couleur qui ferme l'anticrénelage) */
const face = (pts, c, seam = 0.6) => fill(S(W(pts)), c, 1, seam ? ` stroke="${c}" stroke-width="${seam}" stroke-linejoin="round"` : '');

// Plans de façade. Face +y (y = Y) : u = x, v = z. Face +x (x = X) : u = −y (vers la droite de l'écran), v = z.
const FL = (Y) => (u, v) => [u, Y, v];
const FR = (X) => (u, v) => [X, -u, v];
const rect = (f, u0, u1, v0, v1) => [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)];

/** Découpe (Sutherland–Hodgman) d'un polygone 2D par un polygone convexe (sens trigo). */
function clip(subject, cp) {
  let out = subject;
  for (let i = 0; i < cp.length && out.length; i++) {
    const A = cp[i], B = cp[(i + 1) % cp.length];
    const ins = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]) >= 0;
    const X = (p, q) => {
      const a1 = B[1] - A[1], b1 = A[0] - B[0], c1 = a1 * A[0] + b1 * A[1];
      const a2 = q[1] - p[1], b2 = p[0] - q[0], c2 = a2 * p[0] + b2 * p[1], det = a1 * b2 - a2 * b1;
      return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
    };
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length], pi = ins(p), qi = ins(q);
      if (pi) { out.push(p); if (!qi) out.push(X(p, q)); } else if (qi) out.push(X(p, q));
    }
  }
  return out;
}
/** Rectangle arrondi 2D (u, v), sens trigo */
function rr2(u0, v0, u1, v1, r, n = 4) {
  const pts = [], cs = [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]];
  for (const [cu, cv, a0] of cs) for (let i = 0; i <= n; i++) { const a = ((a0 + (90 * i) / n) * Math.PI) / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  return pts;
}
const circ2 = (cu, cv, r, n = 18) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return [cu + r * Math.cos(a), cv + r * Math.sin(a)]; });
/** Enveloppe convexe 2D */
function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Pavé simple (faces visibles) : coin arrière (x, y, z), w × d × h */
function blk(x, y, z, w, d, h, { lit, dark, top }, seam = 0.4) {
  return face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], dark, seam) +
    face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], lit, seam) +
    face([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top, seam);
}
/** Carton léger (intérieur) : coin arrière, ruban éventuel */
const CARTON = { lit: '#d9a96f', dark: '#bf8d53', top: '#e6bd88' };
function carton(x, y, z, w, d, h, tape = false) {
  let g = blk(x, y, z, w, d, h, CARTON, 0);
  if (tape) {
    const yc = y + d / 2, t = Math.max(0.55, d * 0.08);
    g += face([[x, yc - t, z + h], [x + w, yc - t, z + h], [x + w, yc + t, z + h], [x, yc + t, z + h]], '#f1dcb8', 0);
    g += face([[x + w, yc - t, z + h], [x + w, yc + t, z + h], [x + w, yc + t, z + h * 0.55], [x + w, yc - t, z + h * 0.55]], '#d2b88f', 0);
  }
  return g;
}

/** Vitrage sur un plan : cadre, verre dégradé, reflets diagonaux découpés, ombre de feuillure, meneaux. */
function glazing(f, u0, u1, v0, v1, { lit = true, frame = '#ffffff', ft = 1.3, cols = [], rows = [], refl = [[0.18, 0.16], [0.42, 0.07]] } = {}) {
  let g = fill(S(W(rect(f, u0, u1, v0, v1))), frame);
  const a0 = u0 + ft, a1 = u1 - ft, b0 = v0 + ft, b1 = v1 - ft;
  g += fill(S(W(rect(f, a0, a1, b0, b1))), lit ? url('glassL') : url('glassR'));
  const G = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]], span = a1 - a0 + (b1 - b0);
  for (const [t, w] of refl) {
    const c = a0 - (b1 - b0) + t * span, ww = w * span;
    const q = clip([[c, b0 - 1], [c + ww, b0 - 1], [c + ww + (b1 - b0) + 2, b1 + 1], [c + (b1 - b0) + 2, b1 + 1]], G);
    if (q.length > 2) g += fill(S(W(q.map(([u, v]) => f(u, v)))), '#ffffff', lit ? 0.34 : 0.26);
  }
  g += fill(S(W([f(a0, b1), f(a1, b1), f(a1, b1 - 1.6), f(a0 + 1.2, b1 - 1.6), f(a0 + 1.2, b0), f(a0, b0)])), '#1d2a5c', 0.16);
  for (const u of cols) g += fill(S(W(rect(f, u - 0.55, u + 0.55, b0, b1))), frame);
  for (const v of rows) g += fill(S(W(rect(f, a0, a1, v - 0.5, v + 0.5))), frame);
  return g;
}

/* ───────────── géométrie du hangar ───────────── */
const X0 = -65, X1 = 40, Y0 = -64, Y1 = 6;    // emprise des murs
const H = 50, RISE = 22, XR = (X0 + X1) / 2;  // hauteur d'égout ; faîtage selon y, en x = XR
const T = 3, OV = 4, OG = 4;                  // épaisseur du toit, débords (égouts / pignons)
const half = (X1 - X0) / 2;
const zRoof = (x) => H + RISE * (1 - Math.abs(x - XR) / half); // dessous du toit (= haut des murs)
const DA = [-58, -30], DB = [-17, 13], DH = 41;                 // quais A (camionnette) et B (ouvert)

const C = { plinth: '#e3e5ef', plinthSh: '#cfd3e2', navyL: '#3f4f93', navyD: '#2a376b', menu: '#2e3a6e' };

/* ───────────── dégradés ───────────── */
lin('wallL', [[0, '#ffffff'], [1, '#eff0f7']]);
lin('wallR', [[0, '#e7eaf3'], [1, '#d7dbe9']]);
lin('glassL', [[0, '#a9cdff'], [1, '#6f9ef5']], [0, 0, 0.7, 1]);
lin('glassR', [[0, '#7da6ea'], [1, '#5579c6']], [0, 0, 0.7, 1]);
lin('paneF', [[0, '#3c4a8b'], [1, '#33417a']], [0, 0, 1, 0.6]);   // pan tourné vers +x
lin('paneB', [[0, '#2d396a'], [1, '#34427a']], [0, 0, 1, 0.4]);   // pan arrière, tourné vers −x
lin('inFloor', [[0, '#7f7c8c'], [1, '#d6cfc2']]);                   // sol intérieur, sombre au fond
lin('inDark', [[0, '#1d2347', 0.6], [0.5, '#1d2347', 0.22], [1, '#1d2347', 0]]);
lin('panel', [[0, '#ffffff'], [1, '#eef0f8']]);
lin('apron', [[0, '#f1f2f6'], [1, '#e6e8ef']]);
const mid = P((X0 + X1) / 2, (Y0 + Y1) / 2, 0);
const cs = contactShadow(`${ID}-cs`, 128, 62, mid[0], mid[1] + 4, 0.2);
defs.push(cs.defs);

/* ───────────── sol : dalle de quai, marquages, ombres ───────────── */
let ground = '';
// cour en béton clair, de plain-pied (devant les quais et le long de la face +x), joints de dilatation.
// Elle porte TOUT le matériel : la camionnette (jusqu'à y ≈ 60,5) et le transpalette (jusqu'à x ≈ 68,4)
// débordaient auparavant sur la terre battue de la parcelle.
const YD = Y1 + 57, XD = X1 + 30;
ground += fill(S(W([[X0 - 3, Y0 - 3, 0], [XD, Y0 - 3, 0], [XD, YD, 0], [X0 - 3, YD, 0]])), url('apron'));
{
  const j = [];
  for (let x = X0 + 11; x < XD - 2; x += 14) j.push(S(W([[x, Y1 + 0.5, 0], [x, YD, 0]]), false));
  for (let y = Y0 + 10; y < Y1; y += 14) j.push(S(W([[X1 + 0.5, y, 0], [XD, y, 0]]), false));
  for (let y = Y1 + 17; y < YD - 4; y += 20) j.push(S(W([[X0 - 3, y, 0], [XD, y, 0]]), false));
  ground += strk(j.join(' '), '#d6d9e3', 0.5, 0.9);
  ground += strk(S(W([[X0 - 3, YD, 0], [XD, YD, 0], [XD, Y0 - 3, 0]]), false), '#ffffff', 0.9, 0.8);
}
for (const x of [DA[0] - 1, DA[1] + 1]) ground += fill(S(W([[x - 0.6, Y1 + 2, 0], [x + 0.6, Y1 + 2, 0], [x + 0.6, Y1 + 50, 0], [x - 0.6, Y1 + 50, 0]])), '#ffffff', 0.95);
ground += fill(S(W([[DB[0], Y1 + 1.2, 0], [DB[1], Y1 + 1.2, 0], [DB[1], Y1 + 2.6, 0], [DB[0], Y1 + 2.6, 0]])), '#f6c95c');
{ // ombre portée du hangar (lumière avant-gauche → vers la droite de l'écran), découpée à la parcelle
  const k = 26, foot = [[X0, Y0], [X1 + OV, Y0 - OG], [X1 + OV, Y1], [X0, Y1]];
  const c = clip(hull([...foot, ...foot.map(([x, y]) => [x + k, y - k])]), [[-84, -84], [84, -84], [84, 84], [-84, 84]]);
  const cx = c.reduce((a, p) => a + p[0], 0) / c.length, cy = c.reduce((a, p) => a + p[1], 0) / c.length;
  ground += fill(S(c.map(([x, y]) => P(x, y, 0))), '#5a4a3a', 0.07);
  ground += fill(S(c.map(([x, y]) => P(cx + (x - cx) * 0.85, cy + (y - cy) * 0.85, 0))), '#5a4a3a', 0.06);
}
ground += cs.el;

/* ───────────── intérieur des quais (vu par les ouvertures) ───────────── */
function dockInside([u0, u1], contents = '') {
  let g = '';
  const fx0 = Math.max(X0 + 0.8, u0 - 48);
  g += fill(S(W([[fx0, Y1 - 48, 0], [u1 + 3, Y1 - 48, 0], [u1 + 3, Y1, 0], [fx0, Y1, 0]])), url('inFloor'));
  if (u0 - X0 < DH) g += face([[X0 + 0.8, Y0 + 1, 0], [X0 + 0.8, Y1, 0], [X0 + 0.8, Y1, H], [X0 + 0.8, Y0 + 1, H]], '#a3a7bd', 0);
  g += contents;
  g += fill(S(W(rect(FL(Y1 - 0.2), u0 - 1, u1 + 3, 0, DH + 3))), url('inDark'));
  // rideau métallique remonté sous le linteau
  const f = FL(Y1 - 1.4);
  g += fill(S(W(rect(f, u0, u1, DH - 7, DH))), '#b7bfd3');
  const sl = [];
  for (let v = DH - 5.6; v < DH; v += 1.5) sl.push(S(W([f(u0, v), f(u1, v)]), false));
  g += strk(sl.join(' '), '#8f98b2', 0.45, 0.8);
  g += fill(S(W(rect(f, u0, u1, DH - 7.6, DH - 6.4))), '#6f7896');
  // tableau gauche (épaisseur du mur, face +x)
  g += face([[u0, Y1 - 2.4, 0], [u0, Y1, 0], [u0, Y1, DH], [u0, Y1 - 2.4, DH]], '#c4c9da', 0.3);
  return g;
}
// quai B : rayonnage (montants bleu nuit, lisses orange) chargé de cartons, deux cartons au seuil
function rackB() {
  const yF = Y1 - 15, yB = Y1 - 22;
  const up = { lit: '#3f4f93', dark: '#2a376b', top: '#56659f' }, beam = { lit: '#f59e0b', dark: '#d9850a', top: '#fbb83a' };
  let g = '';
  const boxes = [[-27, 0, 12, 8.5], [-13, 0, 12, 8], [1, 0, 11, 8.5], [-26, 11.5, 11, 7.5], [-12.5, 11.5, 12, 7], [1.5, 11.5, 10, 7.5]];
  const posts = [-28.6, -14.4, -0.2, 13.4];
  // ordre du peintre : montants arrière, PUIS cartons, puis montants avant et lisses
  for (const x of posts) g += blk(x, yB, 0, 1.5, 1.4, 34, up, 0);
  for (const [x, z, w, h] of boxes) g += carton(x, yB + 0.5, z, w, yF - yB - 1.4, h);
  for (const x of posts) g += blk(x, yF - 1.4, 0, 1.5, 1.4, 34, up, 0);
  for (const z of [9.5, 19.5, 29.5]) g += blk(-28.6, yF - 1.4, z, 43.5, 1.4, 1.8, beam, 0);
  g += carton(-16, Y1 - 10, 0, 9, 8, 8.5, true) + carton(-15.4, Y1 - 9.4, 8.5, 7.6, 6.6, 6.5, true);
  return g;
}

/* ───────────── façades ───────────── */
let bld = '';
bld += dockInside(DA);
bld += dockInside(DB, rackB());

// face +y (pignon) percée des deux quais
{
  const f = FL(Y1);
  const outer = [f(X0, 0), f(X1, 0), f(X1, H), f(XR, H + RISE), f(X0, H)];
  const holes = [DA, DB].map(([a, b]) => [f(a, 0), f(a, DH), f(b, DH), f(b, 0)]);
  bld += `<path d="${[outer, ...holes].map((q) => S(W(q))).join(' ')}" fill="${url('wallL')}" fill-rule="evenodd"/>`;
  // soubassement entre les ouvertures
  for (const [a, b] of [[X0, DA[0] - 2], [DA[1] + 2, DB[0] - 2], [DB[1] + 2, X1]]) {
    bld += fill(S(W(rect(f, a, b, 0, 5))), C.plinth) + strk(S(W([f(a, 5), f(b, 5)]), false), '#ffffff', 0.7, 0.9);
  }
  // encadrements des quais (cornière claire) + butoirs
  for (const [a, b] of [DA, DB]) {
    bld += fill(S(W([f(a - 2, 0), f(a, 0), f(a, DH), f(b, DH), f(b, 0), f(b + 2, 0), f(b + 2, DH + 2), f(a - 2, DH + 2)])), '#e4e7f1');
    bld += strk(S(W([f(a - 2, 0), f(a - 2, DH + 2), f(b + 2, DH + 2), f(b + 2, 0)]), false), '#ffffff', 0.8, 0.9);
    bld += strk(S(W([f(a, 0.2), f(a, DH), f(b, DH)]), false), '#c4c9da', 0.6, 0.9);
    for (const u of [a + 1.2, b - 4.2]) bld += blk(u, Y1, 3, 3, 1.6, 6, { lit: '#3a3f55', dark: '#2a2e40', top: '#4b5170' }, 0.2);
    // applique au-dessus du quai (boîtier bleu nuit, lumière chaude)
    const lu = (a + b) / 2;
    bld += blk(lu - 2.4, Y1, DH + 4.2, 4.8, 2.2, 2.4, { lit: '#3f4f93', dark: '#2a376b', top: '#56659f' }, 0.2);
    bld += fill(S(W([[lu - 2, Y1 + 2.21, DH + 4.2], [lu + 2, Y1 + 2.21, DH + 4.2], [lu + 2, Y1 + 2.21, DH + 5], [lu - 2, Y1 + 2.21, DH + 5]])), '#ffe9a8');
    bld += fill(S(W([[lu - 4, Y1 + 0.1, DH + 4.4], [lu + 4, Y1 + 0.1, DH + 4.4], [lu + 2.6, Y1 + 0.1, DH + 2.2], [lu - 2.6, Y1 + 0.1, DH + 2.2]])), '#fff4cc', 0.35);
  }
  // ouïe de ventilation dans le pignon
  {
    const u0 = XR - 10, u1 = XR + 10, v0 = H + 4, v1 = H + 13;
    bld += fill(S(W(rr2(u0, v0, u1, v1, 2.2).map(([u, v]) => f(u, v)))), '#d9dcea');
    const sl = [];
    for (let v = v0 + 2; v < v1 - 1; v += 2.1) sl.push(S(W([f(u0 + 1.8, v), f(u1 - 1.8, v)]), false));
    bld += strk(sl.join(' '), '#9aa2bd', 0.75);
  }
  // ombre portée du débord de toit sur le pignon
  const shd = (dz) => [f(X0, H), f(XR, H + RISE), f(X1, H), f(X1, H - dz), f(XR, H + RISE - dz), f(X0, H - dz)];
  bld += fill(S(W(shd(4.5))), '#24305e', 0.07) + fill(S(W(shd(2.2))), '#24305e', 0.08);
}

// face +x (ombrée) : porte vitrée, enseigne, soubassement, descente d'eau
{
  const f = FR(X1);
  const u0 = -Y1, u1 = -Y0;
  bld += fill(S(W(rect(f, u0, u1, 0, H))), url('wallR'));
  const DU = [3, 21];
  for (const [a, b] of [[u0, DU[0] - 1.5], [DU[1] + 1.5, u1]]) bld += fill(S(W(rect(f, a, b, 0, 5))), C.plinthSh) + strk(S(W([f(a, 5), f(b, 5)]), false), '#e9ebf3', 0.6);
  bld += fill(S(W(rect(f, DU[0] - 1.5, DU[1] + 1.5, 0, 31.5))), '#c9cede');
  bld += glazing(f, DU[0], DU[1], 0, 30, { lit: false, frame: C.menu, ft: 1.2, cols: [(DU[0] + DU[1]) / 2], refl: [[0.16, 0.14], [0.4, 0.06]] });
  for (const du of [-3, 2.2]) bld += fill(S(W(rect(f, (DU[0] + DU[1]) / 2 + du, (DU[0] + DU[1]) / 2 + du + 0.8, 12, 18))), '#c3c9d6');
  // enseigne : panneau blanc arrondi en saillie, pictogramme camion violet
  {
    const su0 = 27, su1 = 60, sv0 = 9, sv1 = 39.5, dep = 1.8;
    const shape = rr2(su0, sv0, su1, sv1, 4);
    const fx = FR(X1 + dep);
    bld += fill(S(W(shape.map(([u, v]) => f(u + 1.6, v - 1.8)))), '#1d2a5c', 0.12);
    bld += fill(S(hull([...W(shape.map(([u, v]) => f(u, v))), ...W(shape.map(([u, v]) => fx(u, v)))])), '#c9cee0');
    bld += fill(S(W(shape.map(([u, v]) => fx(u, v)))), url('panel'));
    bld += strk(S(W(rr2(su0 + 0.7, sv0 + 0.7, su1 - 0.7, sv1 - 0.7, 3.4).map(([u, v]) => fx(u, v)))), '#ffffff', 0.8, 0.9);
    const k = 1.32, cu = (su0 + su1) / 2, cv = (sv0 + sv1) / 2;
    const I = (pts) => S(W(pts.map(([a, b]) => fx(cu + (a - 12) * k, cv - (b - 12.2) * k))));
    bld += fill(I(rr2(1.4, 5, 13.6, 16.6, 1.4)), '#7c6bff');
    bld += fill(I([[13.1, 8.4], [18.3, 8.4], [22.4, 12.5], [22.4, 16.6], [13.1, 16.6]]), '#6352e6');
    bld += fill(I([[15, 10], [17.8, 10], [20.4, 12.7], [15, 12.7]]), '#e8e4ff');
    bld += fill(I([[2.6, 6.4], [12.4, 6.4], [12.4, 7.7], [2.6, 7.7]]), '#a99cff');
    for (const cx of [6.3, 17.7]) bld += fill(I(circ2(cx, 17.3, 2.6)), C.menu) + fill(I(circ2(cx, 17.3, 1, 10)), '#ffffff');
  }
  // ombre du débord de toit
  bld += fill(S(W(rect(f, u0, u1 + 0.5, H - 5, H))), '#24305e', 0.07) + fill(S(W(rect(f, u0, u1 + 0.5, H - 2.4, H))), '#24305e', 0.09);
  // descente d'eau pluviale à l'angle avant
  bld += fill(S(W(rect(FR(X1 + 0.3), u0 + 1.6, u0 + 3.4, 0, H - 1))), '#c3c9d6') + fill(S(W(rect(FR(X1 + 0.35), u0 + 1.6, u0 + 2.1, 0, H - 1))), '#eceff6');
}
// arête verticale avant adoucie
bld += strk(S(W([[X1, Y1, 0.5], [X1, Y1, H - 0.5]]), false), '#ffffff', 1.1, 0.85);

/* ───────────── toit ───────────── */
let roof = '';
{
  const xa = X0 - OV, xb = X1 + OV, ya = Y0 - OG, yb = Y1 + OG;
  const zt = (x) => zRoof(x) + T;
  roof += face([[xa, ya, zt(xa)], [XR, ya, zt(XR)], [XR, yb, zt(XR)], [xa, yb, zt(xa)]], url('paneB'), 0.4);
  roof += face([[XR, ya, zt(XR)], [xb, ya, zt(xb)], [xb, yb, zt(xb)], [XR, yb, zt(XR)]], url('paneF'), 0.4);
  // joints debout (tôle nervurée)
  const n = 6, seamD = [], seamL = [];
  for (let i = 1; i < n; i++) {
    const y = ya + ((yb - ya) * i) / n;
    seamD.push(S(W([[xa + 0.4, y, zt(xa + 0.4) + 0.05], [XR, y, zt(XR) + 0.05], [xb - 0.4, y, zt(xb - 0.4) + 0.05]]), false));
    seamL.push(S(W([[xa + 0.4, y + 0.7, zt(xa + 0.4) + 0.05], [XR, y + 0.7, zt(XR) + 0.05], [xb - 0.4, y + 0.7, zt(xb - 0.4) + 0.05]]), false));
  }
  roof += strk(seamD.join(' '), '#26315f', 0.75, 0.75) + strk(seamL.join(' '), '#6574b8', 0.5, 0.45);
  roof += strk(S(W([[XR, ya + 0.3, zt(XR) + 0.2], [XR, yb - 0.2, zt(XR) + 0.2]]), false), '#8d98cc', 1.1, 0.75);
  // rive de pignon (tranche éclairée, côté +y) et bandeau d'égout (côté +x, ombré)
  roof += face([[xa, yb, zt(xa)], [XR, yb, zt(XR)], [xb, yb, zt(xb)], [xb, yb, zRoof(xb)], [XR, yb, zRoof(XR)], [xa, yb, zRoof(xa)]], C.navyL, 0.4);
  roof += face([[xb, ya, zRoof(xb)], [xb, yb, zRoof(xb)], [xb, yb, zt(xb)], [xb, ya, zt(xb)]], C.navyD, 0.4);
  // liserés clairs
  roof += strk(S(W([[xa, yb, zt(xa)], [XR, yb, zt(XR)], [xb, yb, zt(xb)]]), false), tint(C.navyL, 0.45), 1.2, 0.95);
  roof += strk(S(W([[xb, ya + 0.4, zt(xb)], [xb, yb, zt(xb)]]), false), tint(C.navyL, 0.3), 1, 0.8);
  roof += strk(S(W([[xa, yb, zRoof(xa) + 0.1], [XR, yb, zRoof(XR) + 0.1], [xb, yb, zRoof(xb) + 0.1]]), false), '#232d58', 0.6, 0.5);
}

/* ───────────── accessoires ───────────── */
/** Transpalette jaune (réf.) : fourches vers +y, corps arrondi, deux montants et poignée, grande roue côté +x. */
function palletJack(x, y) {
  let g = '';
  const navy = { lit: '#3a4370', dark: '#2a3155', top: '#4a5487' };
  // ombre
  g += fill(S(W([[x - 4, y - 3, 0], [x + 7, y - 6, 0], [x + 7, y + 17, 0], [x - 4, y + 19, 0]])), '#5a4a3a', 0.1);
  // montants (derrière le corps) et poignée
  for (const s of [-2.6, 2.2]) g += blk(x + s, y - 3.2, 4, 1, 1, 22.5, navy, 0.2);
  g += blk(x - 3.2, y - 3.4, 26.2, 6.6, 1.4, 1.5, { lit: '#f59e0b', dark: '#d9850a', top: '#fbbf3c' }, 0.2);
  // corps jaune (deux étages pour l'arrondi) + panneau en creux
  g += blk(x - 4.4, y - 2.4, 1.6, 8.8, 5.6, 9.6, { lit: '#f7c331', dark: '#d9a017', top: '#ffd96a' }, 0.3);
  g += blk(x - 3.6, y - 1.8, 11.2, 7.2, 4.4, 1.2, { lit: '#f9cd4a', dark: '#dca82a', top: '#ffe28a' }, 0.2);
  g += face([[x - 2.6, y + 3.21, 3.4], [x + 2.6, y + 3.21, 3.4], [x + 2.6, y + 3.21, 9.6], [x - 2.6, y + 3.21, 9.6]], '#e6ac1c', 0);
  // grande roue côté +x
  const wc = [x + 4.6, y - 0.4, 3.3];
  const disc = (r, n = 14) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return P(wc[0], wc[1] + r * Math.cos(a), wc[2] + r * Math.sin(a)); });
  g += fill(S(disc(3.3)), '#23263a') + fill(S(disc(1.4, 10)), '#c3c9d6');
  // fourches
  for (const s of [-3.2, 1.8]) g += blk(x + s, y + 3.2, 0.3, 1.6, 15, 1.4, { lit: '#2f3550', dark: '#23283d', top: '#454c6b' }, 0.2);
  return { d: x + y, svg: g, box: bounds(g) };
}

const front = [];
front.push(van((DA[0] + DA[1]) / 2, Y1 + 27.6, { facing: 'y' }));
front.push(pallet(-2, Y1 + 15, { axis: 'y', load: 'crates' }));
front.push(person(21, Y1 + 31, { facing: 'left', pose: 'wave', top: '#f59e0b' }));
front.push(palletJack(64, -14));
front.push(crate(50, -1, 0, { size: 11 }));
front.push(crate(51, 11, 0, { size: 9 }));
// arbres et buisson sur la terre battue, hors de la cour ; le buisson n'est plus collé à la roue avant
front.push(treeCone(76, -72, { size: 0.95 }));
front.push(treeRound(-74, 70, { size: 0.9 }));
front.push(bush(78, -46, { w: 10, d: 10, h: 9 }));

const sorted = (a) => [...a].sort((p, q) => p.d - q.d).map((i) => i.svg).join('');
const body = ground + bld + roof + sorted(front);

/* ───────────── manifeste ───────────── */
const main = bounds(bld + roof);
const man = {
  id: ID, title: TITLE, labelY: Math.round(main.y),
  hit: { x: Math.floor(main.x - 2), y: Math.floor(main.y - 2), w: Math.ceil(main.w + 4), h: Math.ceil(main.h + 4) },
};
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svgDoc({ title: TITLE, defs: defs.join(''), body }));
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, JSON.stringify(man), 'parts', { ground: ground.length, bld: bld.length, roof: roof.length, front: sorted(front).length, defs: defs.join('').length });
