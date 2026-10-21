// Village PEG — sprite « Tickets » : l'assistance (réf. « Assistance » de ref.png).
// Petit bâtiment blanc à toit ROSE en pavillon, guichet ouvert sur la face +x :
// un agent au casque devant l'écran mural des tickets, un client debout au comptoir,
// enseigne ronde casque-micro, porte vitrée à auvent rose, buissons, cyprès.
//   node buildings/tickets.build.mjs && node tools/lint.mjs buildings/tickets.svg
import { writeFileSync } from 'node:fs';
import { P, hip, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, bench, pottedPlant, PAL } from '../tools/props.mjs';

const ID = 'tickets', TITLE = 'Tickets';

/* ───────────────────────── boîte à outils ───────────────────────── */
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const r3 = (n) => { const v = Math.round(n * 1000) / 1000; return String(Object.is(v, -0) ? 0 : v); };
const fmt = (p) => r1(p[0]) + ' ' + r1(p[1]);
/** chemin fermé (points écran) */
const pathS = (scr, close = true) => 'M' + scr.map(fmt).join(' L') + (close ? ' Z' : '');
/** chemin fermé (points monde) */
const W = (pts) => pathS(pts.map(([x, y, z]) => P(x, y, z)));
const Wl = (pts) => pathS(pts.map(([x, y, z]) => P(x, y, z)), false);
const op = (o) => (o != null && o < 1 ? ` fill-opacity="${r3(o)}"` : '');
const path = (d, fill, o, extra = '') => `<path d="${d}" fill="${fill}"${op(o)}${extra}/>`;
/** face pleine avec un trait de même couleur qui ferme les joints d'anticrénelage */
const face = (d, fill, seam = 0.6) => `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${seam}" stroke-linejoin="round"/>`;
const strokeP = (d, color, w, o = 1, cap = 'round') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${o < 1 ? ` stroke-opacity="${r3(o)}"` : ''}/>`;

const defs = [];
const stopsOf = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
/** Dégradé linéaire le long du vecteur écran v (origine o), isolignes parallèles au vecteur écran u. */
function gradPlane(name, o, u, v, stops) {
  const id = `${ID}-${name}`;
  const lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
  const m = [u[0] / lu, u[1] / lu, v[0] / lv, v[1] / lv, o[0], o[1]].map(r3).join(' ');
  defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${r1(lv)}" gradientTransform="matrix(${m})">${stopsOf(stops)}</linearGradient>`);
  return `url(#${id})`;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const EX = sub(P(1, 0, 0), P(0, 0, 0)); // écran d'un pas monde +x
const EY = sub(P(0, 1, 0), P(0, 0, 0)); // écran d'un pas monde +y
const EZ = [0, -1];                     // écran d'un pas monde +z
const neg = (v) => [-v[0], -v[1]];
/** Dégradé vertical (de z1 en haut à z0 en bas) sur une face y = const (isolignes selon x). */
const gradFaceY = (name, x, y, z1, z0, stops) => gradPlane(name, P(x, y, z1), EX, [0, z1 - z0], stops);
/** Dégradé vertical sur une face x = const (isolignes selon y). */
const gradFaceX = (name, x, y, z1, z0, stops) => gradPlane(name, P(x, y, z1), EY, [0, z1 - z0], stops);

/** Rectangle arrondi en 2D local (u vers la droite, v vers le haut), sens quelconque. */
function rrect2(u0, v0, u1, v1, r, n = 4) {
  r = Math.max(0.01, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const c = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]];
  const pts = [];
  for (const [cu, cv, a0] of c) for (let i = 0; i <= n; i++) { const a = ((a0 + (90 * i) / n) * Math.PI) / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  return pts;
}
const circle2 = (cu, cv, r, n = 28) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return [cu + r * Math.cos(a), cv + r * Math.sin(a)]; });
/** Plans de façade : (u, v) local → point monde. Face +y : u le long de +x. Face +x : u le long de −y (vers la droite écran). */
const planeY = (y) => (u, v) => [u, y, v];
const planeX = (x) => (u, v) => [x, -u, v];
const on = (pl, pts2) => pathS(pts2.map(([u, v]) => P(...pl(u, v))));
/** Polygone 2D (y, z) posé sur le plan x = const, et (x, z) sur le plan y = const. */
const onX = (x, pts) => pathS(pts.map(([y, z]) => P(x, y, z)));
const onY = (y, pts) => pathS(pts.map(([x, z]) => P(x, y, z)));

/** Découpe d'un polygone 2D par un rectangle (Sutherland–Hodgman). */
function clipRect(poly, u0, v0, u1, v1) {
  const edges = [[(p) => p[0] >= u0, (a, b) => { const t = (u0 - a[0]) / (b[0] - a[0]); return [u0, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[0] <= u1, (a, b) => { const t = (u1 - a[0]) / (b[0] - a[0]); return [u1, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[1] >= v0, (a, b) => { const t = (v0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), v0]; }],
    [(p) => p[1] <= v1, (a, b) => { const t = (v1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), v1]; }]];
  let out = poly;
  for (const [inside, cut] of edges) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

/** Vitrage : dégradé + reflets diagonaux découpés au cadre. u0..u1 × v0..v1 en coordonnées de plan. */
function glass(name, pl, u0, v0, u1, v1, lit = true) {
  const A = P(...pl(u0, v1)), B = P(...pl(u1, v0));
  const D = sub(B, A);
  const g = gradPlane(name, A, [-D[1], D[0]], D,
    lit ? [[0, '#b4d4ff'], [0.55, '#8db6fb'], [1, '#6f9ef5']] : [[0, '#8fb2ee'], [0.55, '#7097dc'], [1, '#5579c6']]);
  let s = path(on(pl, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]), g);
  const w = u1 - u0, h = v1 - v0, sl = h * 0.55;
  for (const [a, bw, o] of [[0.12, 0.2, 0.34], [0.42, 0.08, 0.24], [0.62, 0.14, 0.16]]) {
    const ua = u0 + a * w + sl * 0.5;
    const q = clipRect([[ua, v1], [ua + bw * w, v1], [ua + bw * w - sl * 1.6, v0], [ua - sl * 1.6, v0]], u0, v0, u1, v1);
    if (q.length > 2) s += path(on(pl, q), '#ffffff', o);
  }
  return s;
}

/* ───────────────────────── géométrie ───────────────────────── */
const X0 = -52, X1 = 36, Y0 = -52, Y1 = 36; // murs
const ZB = 2, ZT = 56;                        // sol du bâtiment (dessus de la dalle), haut des murs
const OV = 5, RISE = 49;                      // débord et hauteur du toit en pavillon
const ROSE = '#ef8aa0', ROSE_D = '#d4708a', ROSE_DEEP = '#e8496f';
const NAVY = '#2e3a6e';
const HATCH = { y0: -7, y1: 28, z0: 19.6, z1: 45 }; // guichet sur la face +x
const SIGN = { y: -32, z: 32.5, r: 15 };

const parts = []; // { d, svg }
const add = (d, svg) => parts.push({ d, svg });

/* Ombres au sol */
const cs = contactShadow(`${ID}-cs`, 134, 64, 200, 295, 0.2);
defs.push(cs.defs);
let ground = cs.el;
{ // ombre portée du bâtiment vers la droite de l'écran (lumière de l'avant-gauche)
  const k = 26;
  const foot = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]];
  const sh = [P(X0, Y0, 0), P(X1 + k, Y0 - k, 0), P(X1 + k, Y1 - k, 0), P(X1, Y1, 0), P(X0, Y1, 0)];
  void foot;
  const g = gradPlane('cast', P(X1, Y1, 0), [0, 1], sub(P(X1 + k, Y1 - k, 0), P(X1, Y1, 0)), [[0, PAL.shadow, 0.16], [1, PAL.shadow, 0]]);
  ground += path(pathS(sh), g);
}

/* Dalle (trottoir clair) */
const SL = { x0: -60, x1: 56, y0: -60, y1: 46, h: ZB };
let slab = '';
slab += face(W([[SL.x0, SL.y1, 0], [SL.x1, SL.y1, 0], [SL.x1, SL.y1, SL.h], [SL.x0, SL.y1, SL.h]]), '#e3e5ef', 0.4);
slab += face(W([[SL.x1, SL.y0, 0], [SL.x1, SL.y1, 0], [SL.x1, SL.y1, SL.h], [SL.x1, SL.y0, SL.h]]), '#cfd3e2', 0.4);
slab += face(W([[SL.x0, SL.y0, SL.h], [SL.x1, SL.y0, SL.h], [SL.x1, SL.y1, SL.h], [SL.x0, SL.y1, SL.h]]), '#f3f4f8', 0.4);
slab += strokeP(Wl([[SL.x0, SL.y1, SL.h], [SL.x1, SL.y1, SL.h], [SL.x1, SL.y0, SL.h]]), '#ffffff', 0.8, 0.9);
// ombre douce du bâtiment sur la dalle (pied des murs)
slab += path(W([[X0 - 0.5, Y1, ZB], [X1, Y1, ZB], [X1 + 4, Y1 - 4, ZB], [X1 + 4, Y0 - 4, ZB], [X1, Y0 - 4, ZB]]), PAL.shadow, 0.07);

/* ───────────────── intérieur du guichet (vu par l'ouverture) ───────────────── */
const XP = X1 - 14; // cloison du fond du guichet
let inside = '';
{
  // cloison du fond (face +x)
  const gP = gradFaceX('part', XP, HATCH.y1, ZT, ZB, [[0, '#c9cede'], [0.35, '#dfe2ee'], [1, '#e9ebf3']]);
  inside += face(W([[XP, HATCH.y0, ZB], [XP, HATCH.y1, ZB], [XP, HATCH.y1, ZT], [XP, HATCH.y0, ZT]]), gP, 0.3);
  // écran mural des tickets (derrière l'agent) : y ∈ [−7, 5], z ∈ [11, 23.5]
  const xs = XP + 0.25, ya = 0, yb = 14, za = 14.5, zb = 28.5;
  inside += path(onX(xs, rrect2(ya - 0.8, za - 0.8, yb + 0.8, zb + 0.8, 1, 2)), NAVY);
  const gs = gradFaceX('wallscreen', xs, yb, zb, za, [[0, '#c4e6ff'], [1, '#86c2f7']]);
  inside += path(onX(xs + 0.05, [[ya, za], [yb, za], [yb, zb], [ya, zb]]), gs);
  // lignes de tickets : pastille colorée + barre blanche (lecture de gauche à droite = y décroissant)
  for (const [z, c] of [[25.4, '#e8496f'], [21.6, '#f6c95c'], [17.8, '#14b8a6']]) {
    inside += path(onX(xs + 0.1, rrect2(ya + 1.1, z - 1.1, yb - 1.1, z + 1.1, 0.8, 2)), '#ffffff', 0.92);
    inside += path(onX(xs + 0.15, circle2(yb - 2.5, z, 0.75, 10)), c);
    inside += path(onX(xs + 0.15, [[yb - 4, z - 0.25], [ya + 2.6, z - 0.25], [ya + 2.6, z + 0.25], [yb - 4, z + 0.25]]), '#9fb4d8');
  }
  // reflet diagonal
  inside += path(onX(xs + 0.2, [[yb, zb], [yb - 3.2, zb], [yb, zb - 5.4]]), '#ffffff', 0.2);
  // paroi latérale droite du guichet (face +y), avec l'épaisseur du mur en clair
  const gS = gradFaceY('side', XP, HATCH.y0, ZT, ZB, [[0, '#d6d9e7'], [0.4, '#eceef5'], [1, '#f3f4f8']]);
  inside += face(W([[XP, HATCH.y0, ZB], [X1, HATCH.y0, ZB], [X1, HATCH.y0, ZT], [XP, HATCH.y0, ZT]]), gS, 0.3);
  inside += face(W([[X1 - 2.2, HATCH.y0, ZB], [X1, HATCH.y0, ZB], [X1, HATCH.y0, ZT], [X1 - 2.2, HATCH.y0, ZT]]), '#f7f7fb', 0.3);
  // petite étagère sur la paroi latérale, avec classeurs
  inside += face(W([[XP + 1.5, HATCH.y0 + 2.6, 29.8], [XP + 10, HATCH.y0 + 2.6, 29.8], [XP + 10, HATCH.y0 + 2.6, 31], [XP + 1.5, HATCH.y0 + 2.6, 31]]), PAL.woodShade, 0.2);
  inside += face(W([[XP + 10, HATCH.y0, 29.8], [XP + 10, HATCH.y0 + 2.6, 29.8], [XP + 10, HATCH.y0 + 2.6, 31], [XP + 10, HATCH.y0, 31]]), shade(PAL.woodShade, 0.9), 0.2);
  inside += face(W([[XP + 1.5, HATCH.y0, 31], [XP + 10, HATCH.y0, 31], [XP + 10, HATCH.y0 + 2.6, 31], [XP + 1.5, HATCH.y0 + 2.6, 31]]), '#e8bd88', 0.2);
  let bx = XP + 2.6;
  for (const [w, h, c] of [[1.4, 4.2, '#7c6bff'], [1.4, 3.8, '#e8496f'], [1.4, 4.4, '#f6c95c'], [1.2, 3.4, '#14b8a6']]) {
    inside += face(W([[bx, HATCH.y0 + 2, 31], [bx + w, HATCH.y0 + 2, 31], [bx + w, HATCH.y0 + 2, 31 + h], [bx, HATCH.y0 + 2, 31 + h]]), c, 0.2);
    inside += face(W([[bx, HATCH.y0, 31 + h], [bx + w, HATCH.y0, 31 + h], [bx + w, HATCH.y0 + 2, 31 + h], [bx, HATCH.y0 + 2, 31 + h]]), tint(c, 0.3), 0.2);
    bx += w + 0.35;
  }
  // ombre du linteau sur le fond (le guichet s'assombrit vers le haut)
  const gL = gradFaceX('lintel', X1, HATCH.y1, HATCH.z1, HATCH.z1 - 9, [[0, '#3a3f5a', 0.22], [1, '#3a3f5a', 0]]);
  inside += path(W([[X1 - 0.01, HATCH.y0, HATCH.z1 - 9], [X1 - 0.01, HATCH.y1, HATCH.z1 - 9], [X1 - 0.01, HATCH.y1, HATCH.z1], [X1 - 0.01, HATCH.y0, HATCH.z1]]), gL);
}

/* L'agent au casque, debout derrière le comptoir, tourné vers le client */
const AG = { x: X1 - 7, y: 4, z: ZB };
function headset(x, y, z) {
  const zc = z + 24.2, R = 3.75;
  let s = '';
  const band = [];
  for (let a = 196; a >= -16; a -= 12) { const t = (a * Math.PI) / 180; band.push(P(x - 0.3, y + R * Math.cos(t), zc + 0.2 + R * Math.sin(t))); }
  s += strokeP(pathS(band, false), NAVY, 0.95);
  const ear = P(x - 0.2, y + 3.55, zc - 0.5);
  s += `<ellipse cx="${r1(ear[0])}" cy="${r1(ear[1])}" rx="1.25" ry="1.5" fill="${NAVY}"/>`;
  s += `<ellipse cx="${r1(ear[0] - 0.2)}" cy="${r1(ear[1] - 0.1)}" rx="0.6" ry="0.8" fill="${ROSE_DEEP}"/>`;
  const m0 = P(x + 0.2, y + 3.4, zc - 1.2), m1 = P(x + 2.6, y + 2.0, zc - 2.9);
  s += strokeP(pathS([m0, [(m0[0] + m1[0]) / 2 - 0.3, (m0[1] + m1[1]) / 2 + 0.6], m1], false), NAVY, 0.6);
  s += `<circle cx="${r1(m1[0])}" cy="${r1(m1[1])}" r="0.75" fill="${ROSE_DEEP}"/>`;
  return s;
}
const agent = person(AG.x, AG.y, { facing: 'right', top: '#14b8a6', hairStyle: 'bun', z: AG.z });
inside += agent.svg + headset(AG.x, AG.y, AG.z);

// dessus du comptoir, partie intérieure (avant l'écran posé dessus)
const CT = { x0: X1 - 4, x1: X1 + 4.5, z: HATCH.z0, t: 1.6 };
inside += face(W([[CT.x0, HATCH.y0, CT.z], [X1, HATCH.y0, CT.z], [X1, HATCH.y1, CT.z], [CT.x0, HATCH.y1, CT.z]]), '#ffffff', 0.3);

/* Écran client sur le comptoir (côté droit), tourné vers l'extérieur */
{
  const mx = X1 - 1.8, my = -2, mz = HATCH.z0, hw = 4.4, z0 = mz + 3, z1 = mz + 9.4;
  // pied
  inside += face(W([[mx - 0.6, my - 1.6, mz], [mx + 0.9, my - 1.6, mz], [mx + 0.9, my + 1.6, mz], [mx - 0.6, my + 1.6, mz]]), '#4b5373', 0.2);
  inside += face(W([[mx, my - 0.35, mz], [mx, my + 0.35, mz], [mx, my + 0.35, z0 + 0.6], [mx, my - 0.35, z0 + 0.6]]), '#3d4466', 0.2);
  // boîtier : tranche +y, dessus, puis face avant
  inside += face(W([[mx - 0.5, my + hw, z0], [mx + 0.6, my + hw, z0], [mx + 0.6, my + hw, z1], [mx - 0.5, my + hw, z1]]), '#3d4466', 0.2);
  inside += face(W([[mx - 0.5, my - hw, z1], [mx + 0.6, my - hw, z1], [mx + 0.6, my + hw, z1], [mx - 0.5, my + hw, z1]]), '#4b5373', 0.2);
  inside += face(onX(mx + 0.6, [[my - hw, z0], [my + hw, z0], [my + hw, z1], [my - hw, z1]]), NAVY, 0.2);
  const gm = gradFaceX('mon', mx + 0.65, my + hw, z1 - 0.6, z0 + 0.6, [[0, '#c4e6ff'], [1, '#7fb8f5']]);
  inside += path(onX(mx + 0.65, [[my - hw + 0.7, z0 + 0.6], [my + hw - 0.7, z0 + 0.6], [my + hw - 0.7, z1 - 0.6], [my - hw + 0.7, z1 - 0.6]]), gm);
  // bulle de discussion blanche à l'écran
  inside += path(onX(mx + 0.7, rrect2(my - 2, z0 + 2.2, my + 2.2, z0 + 4.6, 0.9, 2)), '#ffffff', 0.95);
  inside += path(onX(mx + 0.7, [[my + 1.4, z0 + 2.3], [my + 2.3, z0 + 1.2], [my + 0.3, z0 + 2.3]]), '#ffffff', 0.95);
  inside += path(onX(mx + 0.72, [[my + hw - 0.7, z1 - 0.6], [my + hw - 2.4, z1 - 0.6], [my + hw - 0.7, z1 - 3.4]]), '#ffffff', 0.25);
}

/* ───────────────── murs ───────────────── */
let walls = '';
{
  // face +y (éclairée)
  const gL = gradFaceY('wallL', X0, Y1, ZT, ZB, [[0, '#ffffff'], [0.55, '#f7f7fb'], [1, '#eceef5']]);
  walls += face(W([[X0, Y1, ZB], [X1, Y1, ZB], [X1, Y1, ZT], [X0, Y1, ZT]]), gL, 0.5);
  // face +x (ombrée) percée du guichet
  const gR = gradFaceX('wallR', X1, Y1, ZT, ZB, [[0, '#e7e9f2'], [0.55, '#dfe2ee'], [1, '#d5d8e6']]);
  const outer = W([[X1, Y0, ZB], [X1, Y1, ZB], [X1, Y1, ZT], [X1, Y0, ZT]]);
  const hole = W([[X1, HATCH.y0, HATCH.z0], [X1, HATCH.y1, HATCH.z0], [X1, HATCH.y1, HATCH.z1], [X1, HATCH.y0, HATCH.z1]]);
  walls += `<path d="${outer} ${hole}" fill="${gR}" fill-rule="evenodd"/>`;
  // soubassement
  walls += face(W([[X0, Y1 + 0.05, ZB], [X1, Y1 + 0.05, ZB], [X1, Y1 + 0.05, ZB + 5], [X0, Y1 + 0.05, ZB + 5]]), '#e3e5ef', 0.3);
  walls += face(W([[X1 + 0.05, Y0, ZB], [X1 + 0.05, Y1, ZB], [X1 + 0.05, Y1, ZB + 5], [X1 + 0.05, Y0, ZB + 5]]), '#cfd3e2', 0.3);
  walls += strokeP(Wl([[X0, Y1 + 0.1, ZB + 5], [X1, Y1 + 0.1, ZB + 5], [X1 + 0.1, Y0, ZB + 5]]), '#ffffff', 0.6, 0.75);
  // arête verticale avant, liseré clair
  walls += strokeP(Wl([[X1, Y1, ZB + 5], [X1, Y1, ZT - 3]]), '#ffffff', 0.9, 0.85);
  // ombre du débord de toit en haut des murs
  const gEL = gradFaceY('eaveL', X0, Y1, ZT, ZT - 11, [[0, '#4a3f5c', 0.2], [1, '#4a3f5c', 0]]);
  walls += path(W([[X0, Y1 + 0.1, ZT - 11], [X1, Y1 + 0.1, ZT - 11], [X1, Y1 + 0.1, ZT], [X0, Y1 + 0.1, ZT]]), gEL);
  const gER = gradFaceX('eaveR', X1, Y1, ZT, ZT - 11, [[0, '#3a3150', 0.2], [1, '#3a3150', 0]]);
  walls += path(W([[X1 + 0.1, Y0, ZT - 11], [X1 + 0.1, HATCH.y0, ZT - 11], [X1 + 0.1, HATCH.y0, ZT], [X1 + 0.1, Y0, ZT]]), gER);
  walls += path(W([[X1 + 0.1, HATCH.y0, HATCH.z1], [X1 + 0.1, Y1, HATCH.z1], [X1 + 0.1, Y1, ZT], [X1 + 0.1, HATCH.y0, ZT]]), gER);
}

/* Fenêtre (face +y) : cadre blanc, retrait, vitrage, croisillon bleu nuit, appui.
   Retrait de profondeur dp : vu selon (−1,−1,−1), le bord droit de l'ouverture tombe en x = xb − dp et
   le bord haut en z = zb − dp sur le plan du vitrage → seule cette partie du verre est visible ; le
   tableau gauche est coupé en biais en haut (masqué par le linteau), l'appui en biais à droite. */
function windowY(xa, xb, za, zb) {
  const y = Y1, dp = 1.8;
  let s = '';
  s += face(W([[xa - 1.6, y + 0.15, za - 1.6], [xb + 1.6, y + 0.15, za - 1.6], [xb + 1.6, y + 0.15, zb + 1.6], [xa - 1.6, y + 0.15, zb + 1.6]]), '#ffffff', 0.3);
  s += face(W([[xa, y + 0.2, za], [xa, y - dp, za], [xa, y - dp, zb - dp], [xa, y + 0.2, zb + 0.2]]), '#d3d7e5', 0.2); // tableau gauche (face +x)
  s += glass('winL', planeY(y - dp), xa, za, xb - dp, zb - dp, true);
  s += face(W([[xa, y - dp, za], [xb - dp, y - dp, za], [xb + 0.2, y + 0.2, za], [xa, y + 0.2, za]]), '#eef0f6', 0.2); // appui intérieur
  // croisillon
  const xm = (xa + xb) / 2, zm = za + (zb - za) * 0.58;
  s += face(W([[xm - 0.5, y - dp + 0.05, za], [xm + 0.5, y - dp + 0.05, za], [xm + 0.5, y - dp + 0.05, zb - dp], [xm - 0.5, y - dp + 0.05, zb - dp]]), NAVY, 0.1);
  s += face(W([[xa, y - dp + 0.05, zm - 0.5], [xb - dp, y - dp + 0.05, zm - 0.5], [xb - dp, y - dp + 0.05, zm + 0.5], [xa, y - dp + 0.05, zm + 0.5]]), NAVY, 0.1);
  // appui extérieur saillant
  s += face(W([[xa - 2.4, y + 2, za - 2.6], [xb + 2.4, y + 2, za - 2.6], [xb + 2.4, y + 2, za - 1.4], [xa - 2.4, y + 2, za - 1.4]]), '#eceef5', 0.2);
  s += face(W([[xb + 2.4, y, za - 2.6], [xb + 2.4, y + 2, za - 2.6], [xb + 2.4, y + 2, za - 1.4], [xb + 2.4, y, za - 1.4]]), '#d6d9e7', 0.2);
  s += face(W([[xa - 2.4, y, za - 1.4], [xb + 2.4, y, za - 1.4], [xb + 2.4, y + 2, za - 1.4], [xa - 2.4, y + 2, za - 1.4]]), '#ffffff', 0.2);
  return s;
}

/* Porte vitrée (face +y) à cadre bleu nuit, marche, auvent rose.
   Porte presque à fleur (retrait 0,8) : même découpe que les fenêtres, le montant droit reste visible. */
function doorY(xa, xb, z0, z1) {
  const y = Y1, dp = 0.8;
  let s = '';
  // embrasure claire + cadre
  s += face(W([[xa - 1.4, y + 0.15, z0], [xb + 1.4, y + 0.15, z0], [xb + 1.4, y + 0.15, z1 + 1.4], [xa - 1.4, y + 0.15, z1 + 1.4]]), '#ffffff', 0.3);
  s += face(W([[xa, y + 0.2, z0], [xa, y - dp, z0], [xa, y - dp, z1 - dp], [xa, y + 0.2, z1 + 0.2]]), '#d3d7e5', 0.2);
  s += face(W([[xa, y - dp, z0], [xb - dp, y - dp, z0], [xb - dp, y - dp, z1 - dp], [xa, y - dp, z1 - dp]]), NAVY, 0.2);
  s += glass('door', planeY(y - dp + 0.05), xa + 1.3, z0 + 1.3, xb - 1.3, z1 - 1.3, true);
  // traverse et poignée
  s += face(W([[xa + 1.3, y - dp + 0.1, z0 + 11], [xb - 1.3, y - dp + 0.1, z0 + 11], [xb - 1.3, y - dp + 0.1, z0 + 12.2], [xa + 1.3, y - dp + 0.1, z0 + 12.2]]), NAVY, 0.1);
  s += face(W([[xb - 3.6, y - dp + 0.4, z0 + 12.6], [xb - 3, y - dp + 0.4, z0 + 12.6], [xb - 3, y - dp + 0.4, z0 + 18], [xb - 3.6, y - dp + 0.4, z0 + 18]]), '#e3e7f2', 0.1);
  return s;
}

/* Comptoir extérieur : habillage bois sous le guichet + tablette blanche + sonnette */
let counter = '';
{
  const xw = X1 + 0.25, za = ZB + 5, zb = CT.z;
  const gw = gradFaceX('wood', xw, HATCH.y1, zb, za, [[0, '#b9864f'], [0.25, '#cc9862'], [1, '#c48f5a']]);
  counter += face(W([[xw, HATCH.y0, za], [xw, HATCH.y1, za], [xw, HATCH.y1, zb], [xw, HATCH.y0, zb]]), gw, 0.3);
  let planks = '';
  for (let yy = HATCH.y0 + 3.75; yy < HATCH.y1 - 1; yy += 3.75) planks += Wl([[xw + 0.05, yy, za + 0.3], [xw + 0.05, yy, zb - 0.4]]) + ' ';
  counter += strokeP(planks.trim(), '#a8743f', 0.4, 0.55);
  counter += strokeP(Wl([[xw + 0.05, HATCH.y0, za + 0.15], [xw + 0.05, HATCH.y1, za + 0.15]]), '#a8743f', 0.5, 0.5);
  // tablette (partie extérieure)
  const y0 = HATCH.y0 - 1.2, y1 = HATCH.y1 + 1.2, z0 = CT.z - CT.t, z1 = CT.z;
  counter += face(W([[CT.x1, y0, z0], [CT.x1, y1, z0], [CT.x1, y1, z1], [CT.x1, y0, z1]]), '#e4e7f1', 0.3);
  counter += face(W([[X1, y1, z0], [CT.x1, y1, z0], [CT.x1, y1, z1], [X1, y1, z1]]), '#f4f5f9', 0.3);
  counter += face(W([[X1, y0, z1], [CT.x1, y0, z1], [CT.x1, y1, z1], [X1, y1, z1]]), '#ffffff', 0.3);
  counter += strokeP(Wl([[X1, y1, z1], [CT.x1, y1, z1], [CT.x1, y0, z1]]), '#ffffff', 0.6, 0.9);
  // ombre de la tablette sur le bois
  const gS = gradFaceX('ctshadow', xw, HATCH.y1, z0, z0 - 3.5, [[0, '#3b2a20', 0.28], [1, '#3b2a20', 0]]);
  counter += path(W([[xw + 0.1, HATCH.y0, z0 - 3.5], [xw + 0.1, HATCH.y1, z0 - 3.5], [xw + 0.1, HATCH.y1, z0], [xw + 0.1, HATCH.y0, z0]]), gS);
  // sonnette de réception dorée
  const b = P(X1 + 2.4, 24.5, z1);
  counter += `<ellipse cx="${r1(b[0] + 0.4)}" cy="${r1(b[1] + 0.3)}" rx="2.2" ry="0.9" fill="${PAL.shadow}" fill-opacity="0.18"/>`;
  counter += `<ellipse cx="${r1(b[0])}" cy="${r1(b[1])}" rx="2" ry="0.95" fill="#c99a2e"/>`;
  counter += `<path d="M${r1(b[0] - 1.6)} ${r1(b[1] - 0.2)} A1.6 1.7 0 0 1 ${r1(b[0] + 1.6)} ${r1(b[1] - 0.2)} Z" fill="#f6c95c"/>`;
  counter += `<circle cx="${r1(b[0] - 0.55)}" cy="${r1(b[1] - 1.05)}" r="0.45" fill="#fff6d6" fill-opacity="0.85"/>`;
  counter += `<rect x="${r1(b[0] - 0.25)}" y="${r1(b[1] - 2.6)}" width="0.5" height="0.9" fill="#a8801f"/>`;
}

/* Enseigne ronde casque-micro sur la face +x */
let sign = '';
{
  const xs = X1 + 0.15, pl0 = planeX(xs), pl1 = planeX(xs + 1.6);
  const c2 = circle2(-SIGN.y, SIGN.z, SIGN.r, 40);
  sign += path(on(pl0, c2), '#c5cada');                       // tranche
  sign += path(on(pl1, c2), '#ffffff');                       // panneau
  sign += path(on(pl1, circle2(-SIGN.y, SIGN.z, SIGN.r - 1.3, 40)), '#fff5f7');
  sign += strokeP(on(pl1, circle2(-SIGN.y, SIGN.z, SIGN.r - 0.9, 40)), ROSE, 0.7, 0.9);
  // pictogramme (repère du menu, 24 × 24) posé sur le panneau
  // (un peu plus grand et plus gras qu'avant : à 0,555 l'arceau ne faisait que 1,3 px)
  const k = SIGN.r * 0.065, o = P(xs + 1.65, SIGN.y + 12 * k, SIGN.z + 12 * k);
  const m = [k * EY[0] * -1, k * EY[1] * -1, 0, k, o[0], o[1]].map(r3).join(' ');
  sign += `<g transform="matrix(${m})" fill="none" stroke="${ROSE_DEEP}" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M4.2 14.5v-2.3a7.8 7.8 0 0 1 15.6 0v2.3"/>` +
    `<rect x="2.6" y="12.6" width="4.6" height="7" rx="1.8" fill="${ROSE_DEEP}" stroke-width="1.2"/>` +
    `<rect x="16.8" y="12.6" width="4.6" height="7" rx="1.8" fill="${ROSE_DEEP}" stroke-width="1.2"/>` +
    `<path d="M19.1 19.6c0 1.6-2 2.6-4.8 2.6" stroke-width="2.1"/><circle cx="13.4" cy="22.2" r="1.5" fill="${ROSE_DEEP}" stroke="none"/></g>`;
  // reflet
  const R = SIGN.r;
  sign += path(on(pl1, [[-SIGN.y - 0.66 * R, SIGN.z + 0.6 * R], [-SIGN.y - 0.22 * R, SIGN.z + 0.86 * R], [-SIGN.y - 0.44 * R, SIGN.z + 0.77 * R], [-SIGN.y - 0.77 * R, SIGN.z + 0.4 * R]]), '#ffffff', 0.5);
}

/* Auvent rose au-dessus de la porte */
const DOOR = { xa: -3, xb: 13, z0: ZB, z1: ZB + 30 };
let awning = '';
{
  const xa = DOOR.xa - 3, xb = DOOR.xb + 3, y0 = Y1, y1 = Y1 + 7, z0 = DOOR.z1 + 3.2, z1 = z0 + 2.2;
  // ombre sur le mur
  const gsh = gradFaceY('awnsh', xa, Y1 + 0.2, z0, z0 - 5, [[0, '#4a3f5c', 0.2], [1, '#4a3f5c', 0]]);
  awning += path(W([[xa + 1.5, Y1 + 0.2, z0], [xb, Y1 + 0.2, z0], [xb + 2.5, Y1 + 0.2, z0 - 5], [xa + 4, Y1 + 0.2, z0 - 5]]), gsh);
  awning += face(W([[xa, y1, z0], [xb, y1, z0], [xb, y1, z1], [xa, y1, z1]]), ROSE_DEEP, 0.3);
  awning += face(W([[xb, y0, z0], [xb, y1, z0], [xb, y1, z1], [xb, y0, z1]]), shade(ROSE_DEEP, 0.85), 0.3);
  const ga = gradPlane('awn', P(xa, y0, z1), EX, sub(P(xa, y1, z1), P(xa, y0, z1)), [[0, '#f29aae'], [1, '#ec8399']]);
  awning += face(W([[xa, y0, z1], [xb, y0, z1], [xb, y1, z1], [xa, y1, z1]]), ga, 0.3);
  awning += strokeP(Wl([[xa, y1, z1], [xb, y1, z1], [xb, y0, z1]]), tint(ROSE, 0.45), 0.6, 0.9);
}

/* ───────────────── toit en pavillon ───────────────── */
let roof = '';
{
  const rx0 = X0 - OV, ry0 = Y0 - OV, rw = X1 - X0 + 2 * OV, rd = Y1 - Y0 + 2 * OV, zf = ZT - 3;
  const apex = [rx0 + rw / 2, ry0 + rd / 2, ZT + RISE];
  const h = hip(rx0, ry0, ZT, rw, rd, RISE);
  // bandeau de rive (épaisseur du toit)
  roof += face(W([[rx0, ry0 + rd, zf], [rx0 + rw, ry0 + rd, zf], [rx0 + rw, ry0 + rd, ZT], [rx0, ry0 + rd, ZT]]), '#d9667f', 0.3);
  roof += face(W([[rx0 + rw, ry0, zf], [rx0 + rw, ry0 + rd, zf], [rx0 + rw, ry0 + rd, ZT], [rx0 + rw, ry0, ZT]]), '#b9566d', 0.3);
  // pans (arrière cachés : pente > 45°)
  const A = P(...apex);
  const gF = gradPlane('roofF', A, EX, sub(P(apex[0], ry0 + rd, ZT), A), [[0, '#f5a6b7'], [0.6, '#f08ea3'], [1, '#ec8299']]);
  const gR = gradPlane('roofR', A, neg(EY), sub(P(rx0 + rw, apex[1], ZT), A), [[0, '#de8297'], [0.6, '#d4708a'], [1, '#cb6781']]);
  roof += face(h.front, gF, 0.5);
  roof += face(h.right, gR, 0.5);
  // liserés clairs : arêtier avant, arêtes hautes, égout
  const fc = [rx0 + rw, ry0 + rd, ZT], lc = [rx0, ry0 + rd, ZT], rc = [rx0 + rw, ry0, ZT];
  roof += strokeP(Wl([fc, apex]), tint(ROSE, 0.5), 1.1, 0.85);
  roof += strokeP(Wl([lc, apex, rc]), tint(ROSE, 0.55), 1.0, 0.8);
  roof += strokeP(Wl([lc, fc, rc]), tint(ROSE, 0.45), 1.0, 0.9);
  roof += strokeP(Wl([[rx0, ry0 + rd, zf], [rx0 + rw, ry0 + rd, zf], [rx0 + rw, ry0, zf]]), '#a94c62', 0.5, 0.5);
  // léger relief de tuiles : deux rangs discrets = lignes de niveau des deux pans visibles,
  // d'arêtier à arêtier. À la hauteur ZT + RISE·(1 − t), la demi-largeur du pavillon vaut (rw/2)·t
  // (et non (rw/2)·(1 − t) : les rangs sortaient alors du toit et flottaient dans le ciel).
  for (const t of [1 / 3, 2 / 3]) {
    const zz = ZT + RISE * (1 - t), off = (rw / 2) * t;
    roof += strokeP(Wl([[apex[0] - off, apex[1] + off, zz], [apex[0] + off, apex[1] + off, zz], [apex[0] + off, apex[1] - off, zz]]), '#ffffff', 0.5, 0.2);
  }
  // épi de faîtage
  roof += `<circle cx="${r1(A[0])}" cy="${r1(A[1] - 1.6)}" r="1.9" fill="${ROSE_DEEP}"/><circle cx="${r1(A[0] - 0.6)}" cy="${r1(A[1] - 2.2)}" r="0.7" fill="#ffffff" fill-opacity="0.7"/>`;
}

/* Distributeur de tickets « prenez un numéro » (poteau bleu nuit, tête rose, ticket blanc) */
function dispenser(x, y, z) {
  let s = '';
  const sh = P(x + 1.2, y - 1.2, z);
  s += `<ellipse cx="${r1(sh[0])}" cy="${r1(sh[1])}" rx="4.2" ry="1.8" fill="${PAL.shadow}" fill-opacity="0.14"/>`;
  // socle
  s += face(W([[x - 2, y + 2, z], [x + 2, y + 2, z], [x + 2, y + 2, z + 0.9], [x - 2, y + 2, z + 0.9]]), '#3f4f93', 0.2);
  s += face(W([[x + 2, y - 2, z], [x + 2, y + 2, z], [x + 2, y + 2, z + 0.9], [x + 2, y - 2, z + 0.9]]), '#2a376b', 0.2);
  s += face(W([[x - 2, y - 2, z + 0.9], [x + 2, y - 2, z + 0.9], [x + 2, y + 2, z + 0.9], [x - 2, y + 2, z + 0.9]]), '#4b5ca5', 0.2);
  // poteau
  s += face(W([[x - 0.55, y + 0.55, z + 0.9], [x + 0.55, y + 0.55, z + 0.9], [x + 0.55, y + 0.55, z + 16], [x - 0.55, y + 0.55, z + 16]]), '#3f4f93', 0.15);
  s += face(W([[x + 0.55, y - 0.55, z + 0.9], [x + 0.55, y + 0.55, z + 0.9], [x + 0.55, y + 0.55, z + 16], [x + 0.55, y - 0.55, z + 16]]), '#2a376b', 0.15);
  // tête ronde (disque tourné vers +y) : arrière sombre, tranche, face rose, moyeu, ticket qui pend
  const R = 3.7, zc = z + 18.6, t2 = 1.3;
  const disc = (yy, r = R, n = 26) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return P(x + r * Math.cos(a), yy, zc + r * Math.sin(a)); });
  s += path(pathS(disc(y - t2)), shade(ROSE_DEEP, 0.7));
  // tranche : enveloppe des deux disques
  const all = [...disc(y - t2), ...disc(y + t2)];
  const hullPts = (pts) => { const q = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of q) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = q.length - 1; i >= 0; i--) { const p = q[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  s += path(pathS(hullPts(all)), shade(ROSE_DEEP, 0.8));
  s += path(pathS(disc(y + t2)), ROSE_DEEP);
  s += path(pathS(disc(y + t2 + 0.05, R * 0.78)), '#f0647f');
  const hub = P(x, y + t2 + 0.1, zc);
  s += `<circle cx="${r1(hub[0])}" cy="${r1(hub[1])}" r="1.2" fill="#ffffff"/><circle cx="${r1(hub[0])}" cy="${r1(hub[1])}" r="0.45" fill="${NAVY}"/>`;
  s += strokeP(pathS(disc(y + t2 + 0.1, R * 0.92).slice(8, 15), false), '#ffffff', 0.5, 0.55);
  // ticket blanc qui sort en bas
  s += face(W([[x - 1.1, y + t2 + 0.2, zc - R + 0.6], [x + 1.1, y + t2 + 0.2, zc - R + 0.6], [x + 1.3, y + t2 + 1.2, zc - R - 3.4], [x - 0.9, y + t2 + 1.2, zc - R - 3.4]]), '#ffffff', 0.15);
  s += strokeP(Wl([[x - 0.6, y + t2 + 0.7, zc - R - 1.2], [x + 0.7, y + t2 + 0.7, zc - R - 1.2]]), '#e8496f', 0.35, 0.8);
  return s;
}

/* ───────────────── composition ───────────────── */
const building = walls + windowY(-43, -19, 20, 42) + doorY(DOOR.xa, DOOR.xb, DOOR.z0, DOOR.z1) + awning + sign + counter + roof;
const BD = -16; // profondeur du bâtiment (centre au sol ≈ (−8, −8))
add(-200, ground);
add(-190, slab);
add(-60, treeRound(28, -76, { size: 0.95 }).svg);   // arbre au fond à droite, derrière le bâtiment
add(BD - 1, inside);
add(BD, building);
// devant
// buissons au pied de la fenêtre : y = 41 → emprise y ∈ [36,5 ; 45,5], posés sur la dalle (bord à 46)
add(1, bush(-40, 41, { z: ZB, w: 12, d: 9, h: 10 }).svg);
add(14, bush(-27, 41, { z: ZB, w: 12, d: 9, h: 10 }).svg);
// plante en pot ENTRE la porte et l'angle (à x = 21 elle masquait le tiers droit de la porte vitrée)
add(69.5, pottedPlant(28, 41.5, { z: ZB, pot: 'square', size: 1 }).svg);
add(84, bush(43, 41, { z: ZB, w: 9, d: 9, h: 9 }).svg);
add(60, person(50, 10, { facing: 'back-left', top: '#7c6bff', hairStyle: 'short', z: ZB }).svg);
add(0, treeCone(-64, 58, { size: 1 }).svg);
add(35, dispenser(47, -12, ZB));
add(10, bench(50, -40, { axis: 'y', len: 18, back: true, z: ZB, sitters: [{ at: 3.5, top: '#f59e0b', hairStyle: 'long', hair: '#6b4226' }] }).svg);

const body = compose(parts);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// manifeste : sommet = pointe du toit (sous l'épi), cadre = bâtiment + guichet + client
const apexS = P((X0 + X1) / 2, (Y0 + Y1) / 2, ZT + RISE);
const left = P(X0 - OV, Y1 + OV, ZT)[0], right = P(X1 + OV, Y0 - OV, ZT)[0], bottom = P(SL.x1, SL.y1, 0)[1];
const labelY = Math.round(apexS[1] - 3);
const hit = { x: Math.floor(left - 2), y: Math.floor(apexS[1] - 4), w: 0, h: 0 };
hit.w = Math.ceil(right + 2) - hit.x; hit.h = Math.ceil(bottom + 2) - hit.y;
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify({ id: ID, title: TITLE, labelY, hit }, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg (${svg.length} o) labelY=${labelY}`, hit);
