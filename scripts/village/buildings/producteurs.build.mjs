// Village PEG — « Producteurs » : l'atelier de fabrication.
// Toit en sheds (quatre dents de scie) bleu nuit à verrières continues, profil en dents de scie sur
// la façade éclairée +y, grande baie sur la machine à broder multi-têtes (cônes de fil colorés) et
// l'étagère des tissus, cheminée en brique, enseigne machine à coudre sur la face +x, terrasse en
// pierre claire, palette de t-shirts pliés, palette de cartons dans la cour, une ouvrière.
//   node buildings/producteurs.build.mjs && node tools/lint.mjs buildings/producteurs.svg
import { writeFileSync } from 'node:fs';
import { P, contactShadow, svgDoc, tint } from '../tools/iso.mjs';
import { person, treeCone, bush, pallet, bounds } from '../tools/props.mjs';

const ID = 'producteurs', TITLE = 'Producteurs';

/* ───────────── outils ───────────── */
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const defs = [];
const url = (n) => `url(#${ID}-${n})`;
function lin(n, stops, v = [0, 0, 0, 1]) {
  defs.push(`<linearGradient id="${ID}-${n}" x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return url(n);
}
const S = (pts, close = true) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L') + (close ? ' Z' : '');
const W = (pts) => pts.map(([x, y, z]) => P(x, y, z));
const fill = (d, c, o, more = '') => `<path d="${d}" fill="${c}"${o != null && o < 1 ? ` fill-opacity="${o}"` : ''}${more}/>`;
const strk = (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o != null && o < 1 ? ` stroke-opacity="${o}"` : ''}/>`;
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
/** Cylindre vertical : flanc, dessus éventuel */
function cyl(x, y, z, r, h, side, top, n = 18) {
  const ring = (zz) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return P(x + r * Math.cos(a), y + r * Math.sin(a), zz); });
  const hi = ring(z + h);
  return fill(S(hull([...ring(z), ...hi])), side) + (top ? fill(S(hi), top) : '');
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

/* ───────────── géométrie ───────────── */
const X0 = -62, X1 = 42, Y0 = -60, Y1 = 12;  // murs
const ZG = 2, H = 48;                          // dessus de la terrasse (pied des murs), égout côté +x
const NT = 4, RT = 18, PT = (X1 - X0) / NT;    // quatre dents de scie, faîtages selon y
const T = 2.6, OG = 3, OV = 3;                 // épaisseur des pans, débord en rive (+y), à l'égout (+x)
const TX0 = X0 - 5, TX1 = X1 + 22, TY0 = Y0 - 5, TY1 = Y1 + 25; // terrasse en pierre claire (palette au coin avant droit)
const WIN = [-50, 4, ZG + 5, ZG + 37];         // baie de l'atelier (face +y) : u0, u1, v0, v1
const DOOR = [14, 30];                         // porte de l'atelier (face +y)
const C = { navyL: '#3f4f93', navyD: '#2a376b', menu: '#2e3a6e' };

/* ───────────── dégradés ───────────── */
lin('wallL', [[0, '#ffffff'], [1, '#eff0f7']]);
lin('wallR', [[0, '#e7eaf3'], [1, '#d7dbe9']]);
lin('glassL', [[0, '#a9cdff'], [1, '#6f9ef5']], [0, 0, 0.7, 1]);
lin('glassR', [[0, '#7da6ea'], [1, '#5579c6']], [0, 0, 0.7, 1]);
lin('baie', [[0, '#bcd8ff', 0.5], [0.6, '#8fb6f7', 0.32], [1, '#6f9ef5', 0.22]], [0, 0, 0.6, 1]);
lin('sky', [[0, '#d9eaff'], [0.5, '#b4d2ff'], [1, '#86aef3']], [0, 0, 1, 0.35]);   // verrières des sheds
lin('pane', [[0, '#3b4886'], [1, '#313e75']], [0, 0, 1, 0.7]);                     // pans tournés vers +x
lin('brick', [[0, '#f09872'], [0.55, '#e07b54'], [1, '#c8603d']], [0, 0, 1, 0]);
lin('inFloor', [[0, '#b8bccc'], [1, '#e2e4ec']]);
lin('panel', [[0, '#ffffff'], [1, '#eef0f8']]);
lin('slab', [[0, '#f7f7fa'], [1, '#eceef4']]);
const mid = P((X0 + X1) / 2, (Y0 + Y1) / 2, 0);
const cs = contactShadow(`${ID}-cs`, 136, 66, mid[0] + 4, mid[1] + 8, 0.2);
defs.push(cs.defs);

/* ───────────── sol : terrasse, ombres ───────────── */
let ground = cs.el;
{
  ground += face([[TX0, TY1, 0], [TX1, TY1, 0], [TX1, TY1, ZG], [TX0, TY1, ZG]], '#e3e5ef', 0.4);
  ground += face([[TX1, TY0, 0], [TX1, TY1, 0], [TX1, TY1, ZG], [TX1, TY0, ZG]], '#cfd3e2', 0.4);
  ground += face([[TX0, TY0, ZG], [TX1, TY0, ZG], [TX1, TY1, ZG], [TX0, TY1, ZG]], url('slab'), 0.4);
  ground += strk(S(W([[TX0, TY1, ZG], [TX1, TY1, ZG], [TX1, TY0, ZG]]), false), '#ffffff', 0.9, 0.9);
  // joints de dallage devant la façade et le long de la face +x
  const j = [];
  for (let x = TX0 + 12; x < TX1 - 2; x += 12) j.push(S(W([[x, Y1 + 0.8, ZG], [x, TY1, ZG]]), false));
  for (let y = TY0 + 12; y < Y1; y += 12) j.push(S(W([[X1 + 0.8, y, ZG], [TX1, y, ZG]]), false));
  j.push(S(W([[TX0 + 1, Y1 + 11, ZG], [TX1 - 0.5, Y1 + 11, ZG]]), false));
  ground += strk(j.join(' '), '#dcdfe8', 0.45, 0.9);
  // ombre portée de l'atelier (vers la droite de l'écran), découpée à la terrasse
  const k = 25, foot = [[X0, Y0], [X1 + OV, Y0 - OG], [X1 + OV, Y1], [X0, Y1]];
  const c = clip(hull([...foot, ...foot.map(([x, y]) => [x + k, y - k])]), [[TX0, TY0], [TX1, TY0], [TX1, TY1], [TX0, TY1]]);
  const cx = c.reduce((a, p) => a + p[0], 0) / c.length, cy = c.reduce((a, p) => a + p[1], 0) / c.length;
  ground += fill(S(c.map(([x, y]) => P(x, y, ZG))), '#5a4a3a', 0.06);
  ground += fill(S(c.map(([x, y]) => P(cx + (x - cx) * 0.85, cy + (y - cy) * 0.85, ZG))), '#5a4a3a', 0.05);
}

/* ───────────── intérieur : machine à broder et tissus, vus par la baie ───────────── */
function inside() {
  let g = '';
  const [u0, u1, v0, v1] = WIN, ZF = ZG;
  g += fill(S(W([[X0 + 0.8, Y1 - 42, ZF], [u1 + 4, Y1 - 42, ZF], [u1 + 4, Y1, ZF], [X0 + 0.8, Y1, ZF]])), url('inFloor'));
  g += face([[X0 + 0.8, Y1 - 42, ZF], [X0 + 0.8, Y1, ZF], [X0 + 0.8, Y1, H], [X0 + 0.8, Y1 - 42, H]], '#dfe2ec', 0);
  // étagère des tissus contre le mur de gauche : montants, tablettes, rouleaux colorés (face +x)
  {
    const xs = X0 + 7, ya = Y1 - 36, yb = Y1 - 11, f = FR(xs + 0.05);
    g += face([[X0 + 1, ya, ZF], [xs, ya, ZF], [xs, ya, ZF + 31], [X0 + 1, ya, ZF + 31]], '#d9a066', 0);
    g += face([[xs, ya, ZF], [xs, yb, ZF], [xs, yb, ZF + 31], [xs, ya, ZF + 31]], '#efe9df', 0);
    const rolls = ['#ef8aa0', '#7c6bff', '#f6c95c', '#22c3e6', '#ffffff', '#14b8a6', '#2e3a6e', '#ef4444', '#f59e0b'];
    for (let r = 0; r < 3; r++) {
      const z0 = ZF + 1.5 + r * 10;
      for (let i = 0; i < 3; i++) {
        const c = rolls[r * 3 + i], ua = -yb + 1.4 + i * 7.9;
        g += fill(S(W(rr2(ua, z0, ua + 6.8, z0 + 7.4, 1.2, 2).map(([u, v]) => f(u, v)))), c);
        g += fill(S(W(rect(f, ua + 0.6, ua + 1.8, z0 + 0.6, z0 + 6.8))), '#ffffff', 0.35);
      }
      g += fill(S(W(rect(FR(xs + 0.1), -yb, -ya, z0 - 1.2, z0))), '#c08549');
    }
  }
  // machine à broder multi-têtes (4 têtes) : socle, table, poutre, têtes, cadres, cônes de fil
  const xa = -46, xb = -6, yt = Y1 - 9; // yt = arrière de la table
  g += blk(xa, yt, ZF, xb - xa, 6, 2.2, { lit: '#3a4370', dark: '#2a3155', top: '#4a5487' }, 0.3);
  g += blk(xa, yt, ZF + 2.2, xb - xa, 6, 8.8, { lit: '#eef0f6', dark: '#cfd3df', top: '#f8f9fc' }, 0.3);
  g += blk(xa, yt - 1.6, ZF + 11, xb - xa, 3.6, 8.4, { lit: '#f7f8fb', dark: '#d6dae5', top: '#ffffff' }, 0.3);
  g += face([[xa, yt + 2.01, ZF + 15.2], [xb, yt + 2.01, ZF + 15.2], [xb, yt + 2.01, ZF + 16.4], [xa, yt + 2.01, ZF + 16.4]], '#7c6bff', 0);
  const fabric = ['#ffffff', '#7c6bff', '#ef8aa0', '#22c3e6'];
  for (let i = 0; i < 4; i++) {
    const c = xa + 5 + i * 10;
    g += face([[c - 3.4, yt + 2.2, ZF + 11.05], [c + 3.4, yt + 2.2, ZF + 11.05], [c + 3.4, yt + 5.6, ZF + 11.05], [c - 3.4, yt + 5.6, ZF + 11.05]], fabric[i], 0.3);
    g += strk(S(W([[c - 3.4, yt + 2.2, ZF + 11.1], [c + 3.4, yt + 2.2, ZF + 11.1], [c + 3.4, yt + 5.6, ZF + 11.1], [c - 3.4, yt + 5.6, ZF + 11.1]])), '#9aa2b4', 0.5);
    g += blk(c - 2.3, yt + 2, ZF + 12.6, 4.6, 2.8, 6, { lit: '#ffffff', dark: '#d9dde8', top: '#ffffff' }, 0.3);
    g += face([[c - 2.3, yt + 4.81, ZF + 15.4], [c + 2.3, yt + 4.81, ZF + 15.4], [c + 2.3, yt + 4.81, ZF + 16.4], [c - 2.3, yt + 4.81, ZF + 16.4]], '#7c6bff', 0);
    g += strk(S(W([[c, yt + 3.6, ZF + 12.6], [c, yt + 3.6, ZF + 11.4]]), false), '#4b5170', 0.6);
  }
  const thr = ['#ef4444', '#f6c95c', '#7c6bff', '#22c3e6', '#14b8a6', '#ef8aa0', '#f59e0b', '#2e3a6e', '#ffffff'];
  thr.forEach((col, i) => { g += cyl(xa + 2.4 + i * 4.4, yt + 0.2, ZF + 19.4, 1.3, 3.5, col, tint(col, 0.35), 10); });
  // pupitre à écran au bout de la machine
  g += blk(xb + 1.5, yt + 0.5, ZF, 1.4, 1.4, 16, { lit: '#4a5487', dark: '#2a3155', top: '#5d6690' }, 0.2);
  g += blk(xb, yt + 1.4, ZF + 15.5, 4.4, 1.2, 4.2, { lit: '#2e3a6e', dark: '#232c58', top: '#3f4f93' }, 0.2);
  g += face([[xb + 0.5, yt + 2.61, ZF + 16.2], [xb + 3.9, yt + 2.61, ZF + 16.2], [xb + 3.9, yt + 2.61, ZF + 19.1], [xb + 0.5, yt + 2.61, ZF + 19.1]], '#9ad1ff', 0);
  // pénombre douce au fond, tableau gauche et appui intérieur de la baie
  g += fill(S(W(rect(FL(Y1 - 0.2), u0 - 1, u1 + 3, v0, v1 + 3))), '#1d2347', 0.07);
  g += face([[u0, Y1 - 2.4, v0], [u0, Y1, v0], [u0, Y1, v1], [u0, Y1 - 2.4, v1]], '#cfd3e2', 0.3);
  g += face([[u0, Y1 - 2.4, v0], [u1, Y1 - 2.4, v0], [u1, Y1, v0], [u0, Y1, v0]], '#e9ebf3', 0.3);
  return g;
}

/* ───────────── façades ───────────── */
let bld = inside();
{ // face +y : pignon en dents de scie, percée de la baie
  const f = FL(Y1);
  const outer = [f(X0, ZG), f(X1, ZG), f(X1, H)];
  for (let k = NT - 1; k >= 0; k--) { const a = X0 + k * PT; outer.push(f(a, H + RT)); if (k > 0) outer.push(f(a, H)); }
  const hole = rect(f, WIN[0], WIN[1], WIN[2], WIN[3]).reverse();
  bld += `<path d="${S(W(outer))} ${S(W(hole))}" fill="${url('wallL')}" fill-rule="evenodd"/>`;
  // soubassement
  for (const [a, b] of [[X0, DOOR[0] - 1.6], [DOOR[1] + 1.6, X1]]) bld += fill(S(W(rect(f, a, b, ZG, ZG + 4.5))), '#e3e5ef') + strk(S(W([f(a, ZG + 4.5), f(b, ZG + 4.5)]), false), '#ffffff', 0.7, 0.9);
  // baie : verre très clair (la machine se voit), reflets, meneaux blancs, appui
  const [u0, u1, v0, v1] = WIN;
  bld += fill(S(W(rect(f, u0, u1, v0, v1))), url('baie'));
  const G = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  for (const [c, w, o] of [[u0 - 8, 9, 0.3], [u0 + 9, 3.5, 0.24], [u0 + 33, 6, 0.2]]) {
    const q = clip([[c, v0 - 1], [c + w, v0 - 1], [c + w + (v1 - v0) + 2, v1 + 1], [c + (v1 - v0) + 2, v1 + 1]], G);
    if (q.length > 2) bld += fill(S(W(q.map(([u, v]) => f(u, v)))), '#ffffff', o);
  }
  bld += fill(S(W([f(u0 - 1.4, v0 - 1.4), f(u0, v0 - 1.4), f(u0, v1), f(u1, v1), f(u1, v0 - 1.4), f(u1 + 1.4, v0 - 1.4), f(u1 + 1.4, v1 + 1.4), f(u0 - 1.4, v1 + 1.4)])), '#ffffff');
  for (const u of [u0 + (u1 - u0) / 3, u0 + (2 * (u1 - u0)) / 3]) bld += fill(S(W(rect(f, u - 0.6, u + 0.6, v0, v1))), '#ffffff');
  bld += fill(S(W(rect(f, u0, u1, v0 + 20.5, v0 + 21.5))), '#ffffff');
  bld += blk(u0 - 2, Y1, v0 - 2.6, u1 - u0 + 4, 1.8, 1.2, { lit: '#e9ebf3', dark: '#cfd3e2', top: '#ffffff' }, 0.3);
  // porte vitrée
  bld += fill(S(W(rect(f, DOOR[0] - 1.6, DOOR[1] + 1.6, ZG, ZG + 29.6))), '#e4e7f1');
  bld += glazing(f, DOOR[0], DOOR[1], ZG, ZG + 28, { frame: C.menu, ft: 1.2, cols: [(DOOR[0] + DOOR[1]) / 2], refl: [[0.14, 0.14], [0.4, 0.06]] });
  for (const du of [-2.6, 1.8]) bld += fill(S(W(rect(f, (DOOR[0] + DOOR[1]) / 2 + du, (DOOR[0] + DOOR[1]) / 2 + du + 0.8, ZG + 10, ZG + 16))), '#c3c9d6');
  // auvent : tôle bleu nuit inclinée, tranche claire, ombre sur la façade
  {
    const a = DOOR[0] - 3.5, b = DOOR[1] + 3.5, z0 = ZG + 32.5, z1 = ZG + 30, dy = 7;
    bld += fill(S(W(rect(f, a, b, z0 - 4.5, z0 - 1.2))), '#24305e', 0.1);
    // tranche avant (+y, éclairée), about +x (ombré ; l'about −x est caché), dessus incliné vers +y (le plus clair)
    bld += fill(S(W([[a, Y1 + dy, z1 - 1.2], [b, Y1 + dy, z1 - 1.2], [b, Y1 + dy, z1], [a, Y1 + dy, z1]])), '#3f4f93');
    bld += fill(S(W([[b, Y1 + dy, z1 - 1.2], [b, Y1 + dy, z1], [b, Y1, z0], [b, Y1, z0 - 1.2]])), '#2a376b');
    bld += face([[a, Y1, z0], [b, Y1, z0], [b, Y1 + dy, z1], [a, Y1 + dy, z1]], '#4f5e9f', 0.3);
    bld += strk(S(W([[a, Y1 + dy, z1], [b, Y1 + dy, z1]]), false), '#8d98cc', 0.9, 0.9);
  }
  // ombre des rives sur le pignon (sous chaque dent) et ouïes
  const vents = [];
  for (let k = 0; k < NT; k++) {
    const a = X0 + k * PT, b = a + PT;
    bld += fill(S(W([f(a, H + RT), f(b, H), f(b, H - 3.5), f(a, H + RT - 3.5)])), '#24305e', 0.08);
    const va = a + 2.8, vb = a + 10, vv = H + 3;
    bld += fill(S(W(rr2(va, vv, vb, vv + 6.4, 1.6).map(([u, v]) => f(u, v)))), '#dcdfeb');
    for (let v = vv + 1.7; v < vv + 5.6; v += 1.5) vents.push(S(W([f(va + 1.2, v), f(vb - 1.2, v)]), false));
  }
  bld += strk(vents.join(' '), '#9aa2bd', 0.6);
}
{ // face +x (ombrée) : fenêtre, enseigne machine à coudre
  const f = FR(X1);
  const u0 = -Y1, u1 = -Y0;
  bld += fill(S(W(rect(f, u0, u1, ZG, H))), url('wallR'));
  bld += fill(S(W(rect(f, u0, u1, ZG, ZG + 4.5))), '#cfd3e2') + strk(S(W([f(u0, ZG + 4.5), f(u1, ZG + 4.5)]), false), '#e9ebf3', 0.6);
  bld += glazing(f, -4, 14, ZG + 12, ZG + 32, { lit: false, frame: '#ffffff', ft: 1.3, cols: [5], refl: [[0.16, 0.16], [0.42, 0.07]] });
  bld += blk(X1, -15.5, ZG + 10.4, 1.6, 20, 1.2, { lit: '#e9ebf3', dark: '#cfd3e2', top: '#ffffff' }, 0.2);
  {
    const su0 = 21, su1 = 58, sv0 = ZG + 7, sv1 = ZG + 37, dep = 1.8;
    const shape = rr2(su0, sv0, su1, sv1, 4);
    const fx = FR(X1 + dep);
    bld += fill(S(W(shape.map(([u, v]) => f(u + 1.6, v - 1.8)))), '#1d2a5c', 0.12);
    bld += fill(S(hull([...W(shape.map(([u, v]) => f(u, v))), ...W(shape.map(([u, v]) => fx(u, v)))])), '#c9cee0');
    bld += fill(S(W(shape.map(([u, v]) => fx(u, v)))), url('panel'));
    bld += strk(S(W(rr2(su0 + 0.7, sv0 + 0.7, su1 - 0.7, sv1 - 0.7, 3.4).map(([u, v]) => fx(u, v)))), '#ffffff', 0.8, 0.9);
    // pictogramme machine à coudre (repère icône 24 × 24, v vers le bas)
    const k = 1.36, cu = (su0 + su1) / 2, cv = (sv0 + sv1) / 2;
    const I = (pts) => S(W(pts.map(([a, b]) => fx(cu + (a - 12) * k, cv - (b - 12.3) * k))));
    const main = '#e06f45', dark = '#c3532b', light = '#f3a07a';
    bld += fill(I(rr2(1.6, 18.2, 22.4, 21.2, 1.2)), dark);                                      // plateau
    bld += fill(I([[15.6, 18.2], [15.6, 8.4], [20.4, 8.4], [20.4, 18.2]]), main);                   // montant
    bld += fill(I(rr2(3.6, 4.2, 20.4, 9.4, 2.4)), main);                                            // bras
    bld += fill(I(rr2(3.6, 4.2, 8.8, 14.2, 1.6)), main);                                            // tête
    bld += fill(I([[5.7, 14], [6.7, 14], [6.7, 17.4], [5.7, 17.4]]), C.menu);                       // aiguille
    bld += fill(I(circ2(20.6, 9.6, 2.9)), light) + fill(I(circ2(20.6, 9.6, 1.1, 10)), '#ffffff');  // volant
    bld += fill(I([[11.2, 2.2], [13, 2.2], [13, 4.4], [11.2, 4.4]]), C.menu);                       // bobine
    bld += fill(I(rr2(4.6, 5.2, 19, 6.3, 0.5)), light, 0.9);                                        // reflet du bras
  }
  bld += fill(S(W(rect(f, u0, u1 + 0.5, H - 4.5, H))), '#24305e', 0.07) + fill(S(W(rect(f, u0, u1 + 0.5, H - 2.2, H))), '#24305e', 0.09);
  // descente d'eau pluviale à l'angle avant
  bld += fill(S(W(rect(FR(X1 + 0.3), u0 + 1.6, u0 + 3.4, ZG, H - 1))), '#c3c9d6') + fill(S(W(rect(FR(X1 + 0.35), u0 + 1.6, u0 + 2.1, ZG, H - 1))), '#eceff6');
}
bld += strk(S(W([[X1, Y1, ZG + 0.5], [X1, Y1, H - 0.5]]), false), '#ffffff', 1.1, 0.85);

/* ───────────── toit en sheds + cheminée ───────────── */
let roof = '';
// Cheminée : x, y, rayon, sommet. Sommet à 86 (et non 96) : c'est elle qui fixe labelY, et l'étiquette
// « Producteurs » doit rester nettement sous celle du QG « Projets », le plus haut du village.
// Elle dépasse encore d'environ 24 unités du pan où elle sort : toujours lisible à 0,533.
const CH = [-52, -38, 4.4, 86];
for (let k = 0; k < NT; k++) {
  const a = X0 + k * PT, a2 = k === NT - 1 ? X1 + OV : a + PT, b0 = Y0 - OG, b1 = Y1 + OG;
  const zt = (x) => H + RT * (1 - (x - a) / PT) + T;
  // Verrière : lanterneau filant ÉTROIT sous le faîtage, posé sur une costière blanche, sans petits
  // bois transversaux. (Une large bande quadrillée couvrant les 2/3 du pan visible se lisait, à 0,555,
  // comme des panneaux solaires.) La vraie face vitrée du shed, verticale, est tournée vers −x : invisible.
  const s0 = a + 1.1, s1 = a + PT * 0.25, gy0 = b0 + 1.8, gy1 = b1 - 1.8, up = 1.1;
  // pan + tôle nervurée (joints selon la pente, sous la verrière)
  roof += face([[a, b0, zt(a)], [a2, b0, zt(a2)], [a2, b1, zt(a2)], [a, b1, zt(a)]], url('pane'), 0.4);
  roof += strk(Array.from({ length: 6 }, (_, i) => { const y = b0 + ((b1 - b0) * (i + 1)) / 7; return S(W([[s1 + 0.8, y, zt(s1 + 0.8) + 0.05], [a2 - 0.3, y, zt(a2 - 0.3) + 0.05]]), false); }).join(' '), '#27315e', 0.6, 0.6);
  {
    const pt = (x, y) => [x, y, zt(x) + up];
    // costière : flanc aval (tourné vers +x) et about avant (+y, éclairé) ; les deux autres sont cachés
    roof += face([[s1, gy0, zt(s1)], [s1, gy1, zt(s1)], [s1, gy1, zt(s1) + up], [s1, gy0, zt(s1) + up]], '#e3e6f0', 0.2);
    roof += face([[s0, gy1, zt(s0)], [s1, gy1, zt(s1)], [s1, gy1, zt(s1) + up], [s0, gy1, zt(s0) + up]], '#ffffff', 0.2);
    roof += fill(S(W([pt(s0, gy0), pt(s1, gy0), pt(s1, gy1), pt(s0, gy1)])), url('sky'));
    const G = [[s0, gy0], [s1, gy0], [s1, gy1], [s0, gy1]];
    for (const [t, w, o] of [[0.12, 7, 0.34], [0.36, 2.6, 0.26], [0.66, 4.5, 0.22]]) {
      const yc = gy0 + (gy1 - gy0) * t;
      const q = clip([[s0 - 1, yc + 6], [s0 - 1, yc + 6 + w], [s1 + 1, yc - 6 + w], [s1 + 1, yc - 6]].reverse(), G.slice().reverse()).reverse();
      if (q.length > 2) roof += fill(S(W(q.map(([x, y]) => pt(x, y)))), '#ffffff', o);
    }
    roof += strk(S(W([pt(s1, gy0), pt(s1, gy1)]), false), '#f6f8fd', 0.9, 0.95);
    roof += strk(S(W([pt(s0, gy0), pt(s0, gy1)]), false), '#e6ecfb', 0.7, 0.9);
  }
  // rive (tranche du pan, côté +y, éclairée) et liserés
  roof += face([[a, b1, zt(a) - T], [a2, b1, zt(a2) - T], [a2, b1, zt(a2)], [a, b1, zt(a)]], C.navyL, 0.3);
  roof += strk(S(W([[a, b1, zt(a)], [a2, b1, zt(a2)]]), false), tint(C.navyL, 0.45), 1.1, 0.95);
  roof += strk(S(W([[a, b0 + 0.3, zt(a) + 0.1], [a, b1, zt(a) + 0.1]]), false), '#97a2d4', 1.1, 0.85);
  // about du pan au creux de la noue, sur la partie en débord (tourné vers +x, ombré)
  if (k < NT - 1) roof += face([[a2, Y1, zt(a2) - T], [a2, b1, zt(a2) - T], [a2, b1, zt(a2)], [a2, Y1, zt(a2)]], C.navyD, 0.2);
  // égout côté +x (dernier pan) : bandeau ombré
  if (k === NT - 1) {
    roof += face([[a2, b0, zt(a2) - T], [a2, b1, zt(a2) - T], [a2, b1, zt(a2)], [a2, b0, zt(a2)]], C.navyD, 0.3);
    roof += strk(S(W([[a2, b0 + 0.4, zt(a2)], [a2, b1, zt(a2)]]), false), tint(C.navyL, 0.3), 1, 0.8);
  }
  // cheminée en brique, qui traverse le premier pan
  if (k === 0) {
    const [cx, cy, cr, top] = CH, zb = zt(cx + cr) - 0.6;
    roof += fill(S(W(rr2(cx - cr - 1.6, cy - cr - 1.6, cx + cr + 1.6, cy + cr + 1.6, 1.4).map(([x, y]) => [x, y, zt(x) + 0.15]))), '#4a5487');
    // fût : son pied suit la pente du pan (intersection cylindre / plan), il ne flotte plus devant le toit
    const ringAt = (zf, rr = cr, n = 20) => Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; const x = cx + rr * Math.cos(t); return P(x, cy + rr * Math.sin(t), zf(x)); });
    roof += fill(S(hull([...ringAt((x) => zt(x) - 0.2), ...ringAt(() => top)])), url('brick'));
    // joints de brique : arcs de la moitié visible (normale tournée vers le spectateur : −45° … 135°),
    // coupés là où ils passeraient sous le pan
    const arc = (zz, rr = cr) => Array.from({ length: 13 }, (_, i) => { const t = ((-45 + (180 * i) / 12) * Math.PI) / 180; return [cx + rr * Math.cos(t), cy + rr * Math.sin(t), zz]; })
      .filter(([x, , z]) => z > zt(x) + 0.8).map(([x, y, z]) => P(x, y, z));
    const joints = [];
    for (let zz = zb + 5; zz < top - 5; zz += 5.5) { const q = arc(zz); if (q.length > 1) joints.push(S(q, false)); }
    roof += strk(joints.join(' '), '#b9583a', 0.55, 0.5);
    roof += strk(S(arc(top - 9, cr + 0.05), false), '#ffffff', 1.6, 0.9);
    roof += cyl(cx, cy, top - 3.2, cr + 0.9, 3.2, '#3f4f93', '#56659f', 20);
    roof += fill(S(Array.from({ length: 18 }, (_, i) => { const t = (i / 18) * 2 * Math.PI; return P(cx + (cr - 0.6) * Math.cos(t), cy + (cr - 0.6) * Math.sin(t), top); })), '#23263a');
    { const t = (112 * Math.PI) / 180, hx = cx + cr * 0.92 * Math.cos(t), hy = cy + cr * 0.92 * Math.sin(t); roof += strk(S([P(hx, hy, zt(hx) + 1.5), P(hx, hy, top - 13)], false), '#ffffff', 0.9, 0.4); }
  }
}

/* ───────────── accessoires ───────────── */
const front = [];
// La palette de t-shirts attend au coin avant droit, hors du passage : devant la porte, elle en masquait
// le bas et la condamnait. L'ouvrière se tient entre la baie et la porte, sans cacher ni l'une ni l'autre.
front.push(pallet(51.5, Y1 + 12, { axis: 'y', load: 'tshirts', z: ZG }));
front.push(person(27, Y1 + 21, { facing: 'left', pose: 'wave', top: '#14b8a6', hairStyle: 'bun', z: ZG }));
front.push(bush(-56, Y1 + 8, { w: 12, d: 9, h: 9, z: ZG }));
// Côté gauche, une palette de cartons plutôt que l'arbre rond : elle casse le cadrage « arbre rond à
// gauche / cyprès à droite » répété d'une parcelle à l'autre et dit « cour d'usine ». Posée au sol,
// entièrement hors de la terrasse (x ≤ −68 < TX0 = −67) : à cheval sur le bord, elle s'enfoncerait
// dans la dalle épaisse de ZG. Axe y, parallèle au bord de la dalle, sans toucher le buisson.
front.push(pallet(-77, 30, { axis: 'y', load: 'crates' }));
front.push(treeCone(74, -66, { size: 0.95 }));

const sorted = (a) => [...a].sort((p, q) => p.d - q.d).map((i) => i.svg).join('');
const body = ground + bld + roof + sorted(front);

/* ───────────── manifeste ───────────── */
const main = bounds(bld + roof);
const man = { id: ID, title: TITLE, labelY: Math.round(main.y), hit: { x: Math.floor(main.x - 2), y: Math.floor(main.y - 2), w: Math.ceil(main.w + 4), h: Math.ceil(main.h + 4) } };
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svgDoc({ title: TITLE, defs: defs.join(''), body }));
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, JSON.stringify(man), 'parts', { ground: ground.length, bld: bld.length, roof: roof.length, front: sorted(front).length, defs: defs.join('').length });
