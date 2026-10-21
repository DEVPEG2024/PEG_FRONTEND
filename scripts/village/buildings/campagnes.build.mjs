// Village PEG — sprite « Campagnes » : le studio d'annonces.
// Bâtiment blanc à toit plat FRAMBOISE (acrotère), gros mégaphone blanc sur le toit qui lance
// des ondes et des enveloppes, petite antenne, enseigne enveloppe sur la face +x,
// boîte aux lettres jaune avec une lettre glissée, une passante qui poste son courrier.
//   node buildings/campagnes.build.mjs && node tools/lint.mjs buildings/campagnes.svg
import { writeFileSync } from 'node:fs';
import { P, COS, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, pottedPlant, PAL } from '../tools/props.mjs';

const ID = 'campagnes', TITLE = 'Campagnes';

/* ───────────────────────── boîte à outils ───────────────────────── */
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const r3 = (n) => { const v = Math.round(n * 1000) / 1000; return String(Object.is(v, -0) ? 0 : v); };
const fmt = (p) => r1(p[0]) + ' ' + r1(p[1]);
const pathS = (scr, close = true) => 'M' + scr.map(fmt).join(' L') + (close ? ' Z' : '');
const W = (pts) => pathS(pts.map(([x, y, z]) => P(x, y, z)));
const Wl = (pts) => pathS(pts.map(([x, y, z]) => P(x, y, z)), false);
const op = (o) => (o != null && o < 1 ? ` fill-opacity="${r3(o)}"` : '');
const path = (d, fill, o, extra = '') => `<path d="${d}" fill="${fill}"${op(o)}${extra}/>`;
const face = (d, fill, seam = 0.6) => `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${seam}" stroke-linejoin="round"/>`;
const strokeP = (d, color, w, o = 1, cap = 'round') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${o < 1 ? ` stroke-opacity="${r3(o)}"` : ''}/>`;

const defs = [];
const stopsOf = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
function gradPlane(name, o, u, v, stops) {
  const id = `${ID}-${name}`;
  const lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
  const m = [u[0] / lu, u[1] / lu, v[0] / lv, v[1] / lv, o[0], o[1]].map(r3).join(' ');
  defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${r1(lv)}" gradientTransform="matrix(${m})">${stopsOf(stops)}</linearGradient>`);
  return `url(#${id})`;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const EX = sub(P(1, 0, 0), P(0, 0, 0));
const EY = sub(P(0, 1, 0), P(0, 0, 0));
const neg = (v) => [-v[0], -v[1]];
const gradFaceY = (name, x, y, z1, z0, stops) => gradPlane(name, P(x, y, z1), EX, [0, z1 - z0], stops);
const gradFaceX = (name, x, y, z1, z0, stops) => gradPlane(name, P(x, y, z1), EY, [0, z1 - z0], stops);

function rrect2(u0, v0, u1, v1, r, n = 4) {
  r = Math.max(0.01, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const c = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]];
  const pts = [];
  for (const [cu, cv, a0] of c) for (let i = 0; i <= n; i++) { const a = ((a0 + (90 * i) / n) * Math.PI) / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  return pts;
}
const circle2 = (cu, cv, r, n = 28) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return [cu + r * Math.cos(a), cv + r * Math.sin(a)]; });
const onX = (x, pts) => pathS(pts.map(([y, z]) => P(x, y, z)));
const onY = (y, pts) => pathS(pts.map(([x, z]) => P(x, y, z)));
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
/** Vitrage sur une face y = const (u = x) ou x = const (u = −y) : dégradé + reflets diagonaux. */
function glassY(name, y, x0, z0, x1, z1, o = 1, mid = '') {
  const A = P(x0, y, z1), B = P(x1, y, z0), D = sub(B, A);
  const g = gradPlane(name, A, [-D[1], D[0]], D, [[0, '#b4d4ff'], [0.55, '#8db6fb'], [1, '#6f9ef5']]);
  let s = path(onY(y, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]), g, o) + mid;
  const w = x1 - x0, h = z1 - z0, sl = h * 0.55;
  for (const [a, bw, op2] of [[0.1, 0.18, 0.34], [0.4, 0.07, 0.24], [0.6, 0.13, 0.16]]) {
    const ua = x0 + a * w + sl * 0.5;
    const q = clipRect([[ua, z1], [ua + bw * w, z1], [ua + bw * w - sl * 1.6, z0], [ua - sl * 1.6, z0]], x0, z0, x1, z1);
    if (q.length > 2) s += path(onY(y, q), '#ffffff', op2);
  }
  return s;
}
function glassX(name, x, y0, z0, y1, z1) { // y0 > y1 : y0 = bord gauche à l'écran
  const A = P(x, y0, z1), B = P(x, y1, z0), D = sub(B, A);
  const g = gradPlane(name, A, [-D[1], D[0]], D, [[0, '#8fb2ee'], [0.55, '#7097dc'], [1, '#5579c6']]);
  let s = path(onX(x, [[y0, z0], [y1, z0], [y1, z1], [y0, z1]]), g);
  const w = y0 - y1, h = z1 - z0, sl = h * 0.55;
  for (const [a, bw, op2] of [[0.12, 0.2, 0.26], [0.45, 0.08, 0.18]]) {
    const ua = a * w + sl * 0.5; // u mesuré depuis le bord gauche (y0) vers la droite
    const q = clipRect([[ua, z1], [ua + bw * w, z1], [ua + bw * w - sl * 1.6, z0], [ua - sl * 1.6, z0]], 0, z0, w, z1);
    if (q.length > 2) s += path(onX(x, q.map(([u, z]) => [y0 - u, z])), '#ffffff', op2);
  }
  return s;
}

/* ─────────────── volumes 3D quelconques (mégaphone) : ombrage par facette ─────────────── */
const nrm = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const addv = (...vs) => vs.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
const mul = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
const VIEW = nrm([1, 1, 1]);            // vers le spectateur
const LIGHT = nrm([-0.3, 1, 1.2]);      // vers la lumière (avant-gauche, en haut)
const Pw = (p) => P(p[0], p[1], p[2]);
/** teinte d'une facette de normale n entre dark et lit */
const shadeN = (n, lit, dark, amb = 0.28) => mix(dark, lit, Math.max(0, Math.min(1, amb + (1 - amb) * Math.max(0, dot(n, LIGHT)) * 1.15)));
/** Surface de révolution : axe a depuis O, profil [[t, r]], couleurs (lit, dark) par tronçon. */
function revolve(O, a, prof, nSeg, colorsOf) {
  const u = nrm(cross(a, [0, 0, 1])), w = cross(u, a);
  const ring = (t, r) => Array.from({ length: nSeg }, (_, j) => { const th = (j / nSeg) * 2 * Math.PI; return addv(O, mul(a, t), mul(u, r * Math.cos(th)), mul(w, r * Math.sin(th))); });
  const rings = prof.map(([t, r]) => ring(t, r));
  const quads = [];
  for (let i = 0; i < prof.length - 1; i++) {
    const [t0, r0] = prof[i], [t1, r1_] = prof[i + 1];
    const slope = (r1_ - r0) / (t1 - t0 || 1e-6);
    for (let j = 0; j < nSeg; j++) {
      const j2 = (j + 1) % nSeg, thm = ((j + 0.5) / nSeg) * 2 * Math.PI;
      const radial = addv(mul(u, Math.cos(thm)), mul(w, Math.sin(thm)));
      const n = nrm(addv(radial, mul(a, -slope)));
      if (dot(n, VIEW) <= 0.001) continue;
      const q = [rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]];
      const c = q.reduce((s, p) => addv(s, p), [0, 0, 0]).map((v) => v / 4);
      const [lit, dark] = colorsOf(i);
      quads.push({ depth: dot(c, VIEW), d: pathS(q.map(Pw)), fill: shadeN(n, lit, dark) });
    }
  }
  quads.sort((p, q) => p.depth - q.depth);
  return { svg: quads.map((q) => face(q.d, q.fill, 0.35)).join(''), ring, u, w };
}
/** Pavé orienté (centre c, axes e1 e2 e3 unitaires, demi-tailles) ombré par face. */
function obox(c, e1, e2, e3, h1, h2, h3, lit, dark) {
  const corner = (s1, s2, s3) => addv(c, mul(e1, s1 * h1), mul(e2, s2 * h2), mul(e3, s3 * h3));
  const faces = [];
  for (const [ax, sgn] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) {
    const e = [e1, e2, e3][ax], n = mul(e, sgn);
    if (dot(n, VIEW) <= 0.001) continue;
    const others = [0, 1, 2].filter((k) => k !== ax);
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => { const s = [0, 0, 0]; s[ax] = sgn; s[others[0]] = p; s[others[1]] = q; return corner(...s); });
    faces.push({ depth: dot(addv(c, mul(n, 1)), VIEW), d: pathS(pts.map(Pw)), fill: shadeN(n, lit, dark) });
  }
  faces.sort((p, q) => p.depth - q.depth);
  return faces.map((f) => face(f.d, f.fill, 0.3)).join('');
}

/**
 * Surface de révolution LISSE (léger) : silhouette remplie d'un dégradé transversal calculé
 * depuis l'éclairage, puis rubans de lumière / d'ombre qui suivent l'évasement du profil.
 */
function smoothRev(name, O, a, prof, lit, dark) {
  const u = nrm(cross(a, [0, 0, 1])), w = cross(u, a);
  const at = (t, r, th) => addv(O, mul(a, t), mul(u, r * Math.cos(th)), mul(w, r * Math.sin(th)));
  const n0 = prof.length - 1;
  const slope = (prof[n0][1] - prof[0][1]) / (prof[n0][0] - prof[0][0] || 1);
  const A = dot(u, VIEW), B = dot(w, VIEW), Rv = Math.hypot(A, B), phi = Math.atan2(B, A);
  const Dl = Math.acos(Math.max(-1, Math.min(1, (slope * dot(a, VIEW)) / Rv)));
  const th0 = phi - Dl, th1 = phi + Dl;
  const wrap = (x) => { while (x > Math.PI) x -= 2 * Math.PI; while (x <= -Math.PI) x += 2 * Math.PI; return x; };
  const thL = phi + wrap(Math.atan2(dot(w, LIGHT), dot(u, LIGHT)) - phi);
  const nAt = (th) => nrm(addv(mul(u, Math.cos(th)), mul(w, Math.sin(th)), mul(a, -slope)));
  const clampT = (x) => Math.max(th0, Math.min(th1, x));
  /** ruban entre les génératrices ta et tb, des anneaux i0 à i1 */
  const ribbon = (ta, tb, i0 = 0, i1 = n0, M = 8) => {
    const pts = [];
    for (let i = i0; i <= i1; i++) pts.push(at(prof[i][0], prof[i][1], ta));
    for (let k = 1; k < M; k++) pts.push(at(prof[i1][0], prof[i1][1], ta + ((tb - ta) * k) / M));
    for (let i = i1; i >= i0; i--) pts.push(at(prof[i][0], prof[i][1], tb));
    for (let k = 1; k < M; k++) pts.push(at(prof[i0][0], prof[i0][1], tb + ((ta - tb) * k) / M));
    return pathS(pts.map(Pw));
  };
  /** dégradé transversal (perpendiculaire à l'axe à l'écran) mesuré sur l'anneau im */
  const across = (gname, im, l, d) => {
    const [t, r] = prof[im];
    const p0 = Pw(at(t, r, th0)), p1 = Pw(at(t, r, th1));
    const ax = sub(Pw(addv(O, a)), Pw(O)), la = Math.hypot(...ax), sa = [ax[0] / la, ax[1] / la], sp = [-sa[1], sa[0]];
    const span = (p1[0] - p0[0]) * sp[0] + (p1[1] - p0[1]) * sp[1];
    const stops = [];
    for (let k = 0; k <= 8; k++) {
      const th = th0 + ((th1 - th0) * k) / 8, q = Pw(at(t, r, th));
      const off = ((q[0] - p0[0]) * sp[0] + (q[1] - p0[1]) * sp[1]) / span;
      stops.push([Math.max(0, Math.min(1, Math.round(off * 1000) / 1000)), shadeN(nAt(th), l, d)]);
    }
    stops.sort((x, y) => x[0] - y[0]);
    return gradPlane(gname, p0, sa, [sp[0] * span, sp[1] * span], stops);
  };
  return { u, w, at, th0, th1, thL, ribbon, across, clampT, dark: Math.abs(thL - th0) > Math.abs(thL - th1) ? th0 : th1 };
}

/* ───────────────────────── géométrie ───────────────────────── */
const X0 = -54, X1 = 38, Y0 = -52, Y1 = 34;  // murs
const ZB = 2, ZT = 52;                         // dessus de la dalle, haut des murs
const RF = { ov: 4, t: 5, par: 2.6, ph: 2.4 };  // toit plat : débord, épaisseur, acrotère (largeur, hauteur)
const RASP = '#d9467a', RASP_D = '#bd3463', NAVY = '#2e3a6e';
const rx0 = X0 - RF.ov, rx1 = X1 + RF.ov, ry0 = Y0 - RF.ov, ry1 = Y1 + RF.ov;
const zr0 = ZT, zr1 = ZT + RF.t, zp = zr1 + RF.ph; // dessous du toit, champ du toit, haut de l'acrotère

const parts = [];
const add = (d, svg) => parts.push({ d, svg });

/* Ombres au sol */
const cs = contactShadow(`${ID}-cs`, 140, 66, 198, 296, 0.2);
defs.push(cs.defs);
let ground = cs.el;
{
  const k = 28;
  const sh = [P(X0, Y0, 0), P(X1 + k, Y0 - k, 0), P(X1 + k, Y1 - k, 0), P(X1, Y1, 0), P(X0, Y1, 0)];
  const g = gradPlane('cast', P(X1, Y1, 0), [0, 1], sub(P(X1 + k, Y1 - k, 0), P(X1, Y1, 0)), [[0, PAL.shadow, 0.16], [1, PAL.shadow, 0]]);
  ground += path(pathS(sh), g);
}

/* Dalle claire */
const SL = { x0: -62, x1: 52, y0: -60, y1: 50, h: ZB };
let slab = '';
slab += face(W([[SL.x0, SL.y1, 0], [SL.x1, SL.y1, 0], [SL.x1, SL.y1, SL.h], [SL.x0, SL.y1, SL.h]]), '#e3e5ef', 0.4);
slab += face(W([[SL.x1, SL.y0, 0], [SL.x1, SL.y1, 0], [SL.x1, SL.y1, SL.h], [SL.x1, SL.y0, SL.h]]), '#cfd3e2', 0.4);
slab += face(W([[SL.x0, SL.y0, SL.h], [SL.x1, SL.y0, SL.h], [SL.x1, SL.y1, SL.h], [SL.x0, SL.y1, SL.h]]), '#f3f4f8', 0.4);
slab += strokeP(Wl([[SL.x0, SL.y1, SL.h], [SL.x1, SL.y1, SL.h], [SL.x1, SL.y0, SL.h]]), '#ffffff', 0.8, 0.9);
slab += path(W([[X0 - 0.5, Y1, ZB], [X1, Y1, ZB], [X1 + 4, Y1 - 4, ZB], [X1 + 4, Y0 - 4, ZB], [X1, Y0 - 4, ZB]]), PAL.shadow, 0.07);
// allée vers la porte (dalles plus claires)
for (let i = 0; i < 3; i++) slab += face(W([[6, Y1 + 2 + i * 4.6, ZB], [18, Y1 + 2 + i * 4.6, ZB], [18, Y1 + 5.6 + i * 4.6, ZB], [6, Y1 + 5.6 + i * 4.6, ZB]]), '#ffffff', 0.2);

/* ───────────────── murs ───────────────── */
let walls = '';
{
  const gL = gradFaceY('wallL', X0, Y1, ZT, ZB, [[0, '#ffffff'], [0.55, '#f7f7fb'], [1, '#eceef5']]);
  walls += face(W([[X0, Y1, ZB], [X1, Y1, ZB], [X1, Y1, ZT], [X0, Y1, ZT]]), gL, 0.5);
  const gR = gradFaceX('wallR', X1, Y1, ZT, ZB, [[0, '#e7e9f2'], [0.55, '#dfe2ee'], [1, '#d5d8e6']]);
  walls += face(W([[X1, Y0, ZB], [X1, Y1, ZB], [X1, Y1, ZT], [X1, Y0, ZT]]), gR, 0.5);
  // soubassement
  walls += face(W([[X0, Y1 + 0.05, ZB], [X1, Y1 + 0.05, ZB], [X1, Y1 + 0.05, ZB + 5], [X0, Y1 + 0.05, ZB + 5]]), '#e3e5ef', 0.3);
  walls += face(W([[X1 + 0.05, Y0, ZB], [X1 + 0.05, Y1, ZB], [X1 + 0.05, Y1, ZB + 5], [X1 + 0.05, Y0, ZB + 5]]), '#cfd3e2', 0.3);
  walls += strokeP(Wl([[X0, Y1 + 0.1, ZB + 5], [X1, Y1 + 0.1, ZB + 5], [X1 + 0.1, Y0, ZB + 5]]), '#ffffff', 0.6, 0.75);
  walls += strokeP(Wl([[X1, Y1, ZB + 5], [X1, Y1, ZT - 3]]), '#ffffff', 0.9, 0.85);
  // ombre du débord de toit
  const gEL = gradFaceY('eaveL', X0, Y1, ZT, ZT - 10, [[0, '#4a3048', 0.2], [1, '#4a3048', 0]]);
  walls += path(W([[X0, Y1 + 0.1, ZT - 10], [X1, Y1 + 0.1, ZT - 10], [X1, Y1 + 0.1, ZT], [X0, Y1 + 0.1, ZT]]), gEL);
  const gER = gradFaceX('eaveR', X1, Y1, ZT, ZT - 10, [[0, '#3a2840', 0.2], [1, '#3a2840', 0]]);
  walls += path(W([[X1 + 0.1, Y0, ZT - 10], [X1 + 0.1, Y1, ZT - 10], [X1 + 0.1, Y1, ZT], [X1 + 0.1, Y0, ZT]]), gER);
}

/* Intérieur du studio vu à travers la baie : fond, panneaux acoustiques, bureau, écran, micro.
   Chaque forme est découpée au cadre de la baie (dans le plan du vitrage). */
function studioInterior(xa, xb, za, zb, yp, xc = xb, zc = zb) { // (xc, zc) : bords droit et haut de la partie visible
  const toPlane = (sp) => { const x = (sp[0] - 200) / COS + yp; return [x, 300 + (x + yp) / 2 - sp[1]]; };
  const F3 = (pts3, fill, o) => { const q = clipRect(pts3.map(([x, y, z]) => toPlane(P(x, y, z))), xa, za, xc, zc); return q.length > 2 ? path(onY(yp, q), fill, o) : ''; };
  const DEEP = '#2f4c9c';
  let s = '';
  // fond de la pièce plus sombre vers le haut (plafond)
  const g = gradFaceY('studio', xa, yp, zc, za, [[0, '#24387e', 0.5], [0.55, '#24387e', 0.18], [1, '#24387e', 0.05]]);
  s += path(onY(yp, [[xa, za], [xc, za], [xc, zc], [xa, zc]]), g);
  // panneaux acoustiques framboise (fond), vus à travers le verre, découpés à la partie visible
  for (let i = 0; i < 6; i++) {
    const x0 = xa + 1.6 + i * 5.9, z0 = zb - 9.5;
    const q = clipRect([[x0, z0], [x0 + 4.6, z0], [x0 + 4.6, z0 + 5], [x0, z0 + 5]], xa, za, xc, zc);
    if (q.length > 2) s += path(onY(yp, q), i % 2 ? '#c25f9e' : '#b04a8e', 0.55);
  }
  // bureau
  const dx0 = -40, dx1 = -21, dy0 = Y1 - 15, dy1 = Y1 - 6, dz = ZB + 12.5;
  for (const lx of [dx0 + 1, dx1 - 1]) s += F3([[lx - 0.4, dy1 - 1, ZB], [lx + 0.4, dy1 - 1, ZB], [lx + 0.4, dy1 - 1, dz], [lx - 0.4, dy1 - 1, dz]], DEEP, 0.6);
  s += F3([[dx1, dy0, dz - 1.2], [dx1, dy1, dz - 1.2], [dx1, dy1, dz], [dx1, dy0, dz]], DEEP, 0.45);
  s += F3([[dx0, dy1, dz - 1.2], [dx1, dy1, dz - 1.2], [dx1, dy1, dz], [dx0, dy1, dz]], DEEP, 0.4);
  s += F3([[dx0, dy0, dz], [dx1, dy0, dz], [dx1, dy1, dz], [dx0, dy1, dz]], '#e9f2ff', 0.55);
  // écran allumé avec une carte « campagne »
  const sy = Y1 - 13, sx0 = -37, sx1 = -27, sz0 = dz + 2.4, sz1 = dz + 9.4;
  s += F3([[sx0 + 4, sy - 1, dz], [sx0 + 6, sy - 1, dz], [sx0 + 6, sy - 1, sz0], [sx0 + 4, sy - 1, sz0]], DEEP, 0.7);
  s += F3([[sx0, sy, sz0], [sx1, sy, sz0], [sx1, sy, sz1], [sx0, sy, sz1]], '#1f2c5c', 0.85);
  s += F3([[sx0 + 0.7, sy + 0.05, sz0 + 0.7], [sx1 - 0.7, sy + 0.05, sz0 + 0.7], [sx1 - 0.7, sy + 0.05, sz1 - 0.7], [sx0 + 0.7, sy + 0.05, sz1 - 0.7]], '#cfe9ff');
  s += F3([[sx0 + 2, sy + 0.1, sz0 + 1.6], [sx1 - 2, sy + 0.1, sz0 + 1.6], [sx1 - 2, sy + 0.1, sz1 - 1.4], [sx0 + 2, sy + 0.1, sz1 - 1.4]], '#ffffff');
  s += F3([[sx0 + 2, sy + 0.15, sz1 - 3.2], [sx1 - 2, sy + 0.15, sz1 - 3.2], [sx1 - 2, sy + 0.15, sz1 - 1.4], [sx0 + 2, sy + 0.15, sz1 - 1.4]], RASP);
  // micro de studio sur bras articulé
  s += F3([[-38.6, Y1 - 12, dz], [-37.8, Y1 - 12, dz], [-35.2, Y1 - 7, dz + 9], [-36, Y1 - 7, dz + 9]], '#1f2c5c', 0.8);
  s += F3([[-36, Y1 - 7.4, dz + 8.4], [-35.2, Y1 - 7.4, dz + 9.2], [-30.4, Y1 - 4, dz + 6.8], [-31.2, Y1 - 4, dz + 6]], '#1f2c5c', 0.8);
  s += F3([[-32.2, Y1 - 3.6, dz + 3.4], [-29.4, Y1 - 3.6, dz + 3.4], [-29.4, Y1 - 3.6, dz + 8.2], [-32.2, Y1 - 3.6, dz + 8.2]], '#1f2c5c', 0.9);
  s += F3([[-31.6, Y1 - 3.5, dz + 4.4], [-30, Y1 - 3.5, dz + 4.4], [-30, Y1 - 3.5, dz + 7.4], [-31.6, Y1 - 3.5, dz + 7.4]], '#e0457e', 0.9);
  return s;
}

/* Grande baie du studio (face +y) : cadre blanc, retrait, vitrage, meneaux bleu nuit.
   Retrait dp : vu selon (−1,−1,−1), l'ouverture découpe le plan du vitrage en [xa ; xb − dp] × [za ; zb − dp]
   (le reste est caché par le tableau droit et le linteau) ; tableau gauche coupé en biais en haut,
   appui intérieur coupé en biais à droite. */
function bayY(xa, xb, za, zb, cols = 3) {
  const y = Y1, dp = 2, xv = xb - dp, zv = zb - dp;
  let s = '';
  s += face(W([[xa - 1.8, y + 0.15, za - 1.8], [xb + 1.8, y + 0.15, za - 1.8], [xb + 1.8, y + 0.15, zb + 1.8], [xa - 1.8, y + 0.15, zb + 1.8]]), '#ffffff', 0.3);
  s += face(W([[xa, y + 0.2, za], [xa, y - dp, za], [xa, y - dp, zv], [xa, y + 0.2, zb + 0.2]]), '#d3d7e5', 0.2);
  s += glassY('bay', y - dp, xa, za, xv, zv, 1, studioInterior(xa, xb, za, zb, y - dp, xv, zv));
  s += face(W([[xa, y - dp, za], [xv, y - dp, za], [xb + 0.2, y + 0.2, za], [xa, y + 0.2, za]]), '#eef0f6', 0.2);
  for (let i = 1; i < cols; i++) { const xm = xa + ((xb - xa) * i) / cols; s += face(W([[xm - 0.55, y - dp + 0.05, za], [xm + 0.55, y - dp + 0.05, za], [xm + 0.55, y - dp + 0.05, zv], [xm - 0.55, y - dp + 0.05, zv]]), NAVY, 0.1); }
  const zm = za + (zb - za) * 0.7;
  s += face(W([[xa, y - dp + 0.05, zm - 0.5], [xv, y - dp + 0.05, zm - 0.5], [xv, y - dp + 0.05, zm + 0.5], [xa, y - dp + 0.05, zm + 0.5]]), NAVY, 0.1);
  s += face(W([[xa - 2.6, y + 2.2, za - 2.8], [xb + 2.6, y + 2.2, za - 2.8], [xb + 2.6, y + 2.2, za - 1.5], [xa - 2.6, y + 2.2, za - 1.5]]), '#eceef5', 0.2);
  s += face(W([[xb + 2.6, y, za - 2.8], [xb + 2.6, y + 2.2, za - 2.8], [xb + 2.6, y + 2.2, za - 1.5], [xb + 2.6, y, za - 1.5]]), '#d6d9e7', 0.2);
  s += face(W([[xa - 2.6, y, za - 1.5], [xb + 2.6, y, za - 1.5], [xb + 2.6, y + 2.2, za - 1.5], [xa - 2.6, y + 2.2, za - 1.5]]), '#ffffff', 0.2);
  return s;
}
/* Porte vitrée (face +y) + marquise framboise + voyant « à l'antenne » */
function doorY(xa, xb, z0, z1) {
  const y = Y1, dp = 0.8; // porte presque à fleur : même découpe que la baie, le montant droit reste visible
  let s = '';
  s += face(W([[xa - 1.4, y + 0.15, z0], [xb + 1.4, y + 0.15, z0], [xb + 1.4, y + 0.15, z1 + 1.4], [xa - 1.4, y + 0.15, z1 + 1.4]]), '#ffffff', 0.3);
  s += face(W([[xa, y + 0.2, z0], [xa, y - dp, z0], [xa, y - dp, z1 - dp], [xa, y + 0.2, z1 + 0.2]]), '#d3d7e5', 0.2);
  s += face(W([[xa, y - dp, z0], [xb - dp, y - dp, z0], [xb - dp, y - dp, z1 - dp], [xa, y - dp, z1 - dp]]), NAVY, 0.2);
  s += glassY('door', y - dp + 0.05, xa + 1.3, z0 + 1.3, xb - 1.3, z1 - 1.3);
  s += face(W([[xa + 1.3, y - dp + 0.1, z0 + 12], [xb - 1.3, y - dp + 0.1, z0 + 12], [xb - 1.3, y - dp + 0.1, z0 + 13.2], [xa + 1.3, y - dp + 0.1, z0 + 13.2]]), NAVY, 0.1);
  s += face(W([[xb - 3.6, y - dp + 0.4, z0 + 13.6], [xb - 3, y - dp + 0.4, z0 + 13.6], [xb - 3, y - dp + 0.4, z0 + 19], [xb - 3.6, y - dp + 0.4, z0 + 19]]), '#e3e7f2', 0.1);
  // marquise
  const ma = xa - 3, mb = xb + 3, m0 = z1 + 3, m1 = m0 + 2.2, my1 = y + 7;
  const gsh = gradFaceY('awnsh', ma, y + 0.2, m0, m0 - 5, [[0, '#4a3048', 0.2], [1, '#4a3048', 0]]);
  s += path(W([[ma + 1.5, y + 0.2, m0], [mb, y + 0.2, m0], [mb + 2.5, y + 0.2, m0 - 5], [ma + 4, y + 0.2, m0 - 5]]), gsh);
  s += face(W([[ma, my1, m0], [mb, my1, m0], [mb, my1, m1], [ma, my1, m1]]), RASP, 0.3);
  s += face(W([[mb, y, m0], [mb, my1, m0], [mb, my1, m1], [mb, y, m1]]), RASP_D, 0.3);
  const ga = gradPlane('awn', P(ma, y, m1), EX, sub(P(ma, my1, m1), P(ma, y, m1)), [[0, '#ec7aa2'], [1, '#e05e8e']]);
  s += face(W([[ma, y, m1], [mb, y, m1], [mb, my1, m1], [ma, my1, m1]]), ga, 0.3);
  s += strokeP(Wl([[ma, my1, m1], [mb, my1, m1], [mb, y, m1]]), tint(RASP, 0.5), 0.6, 0.9);
  // voyant rouge « à l'antenne » au-dessus de la marquise : gélule lumineuse sur platine
  const lx = (xa + xb) / 2, lz = m1 + 4.6;
  s += face(onY(y + 0.3, rrect2(lx - 5, lz - 2.4, lx + 5, lz + 2.4, 2.4, 4)), '#ffffff', 0.2);
  s += path(onY(y + 0.35, rrect2(lx - 5, lz - 2.4, lx + 5, lz + 2.4, 2.4, 4)), '#d6d9e7', 0.6);
  s += path(onY(y + 1.4, rrect2(lx - 4, lz - 1.6, lx + 4, lz + 1.6, 1.6, 4)), '#ff4f6d');
  s += path(onY(y + 1.45, rrect2(lx - 3.2, lz + 0.1, lx + 3.2, lz + 1.1, 0.5, 2)), '#ffc2cc', 0.85);
  const lc = P(lx, y + 1.4, lz);
  s += `<ellipse cx="${r1(lc[0])}" cy="${r1(lc[1])}" rx="9" ry="5.4" fill="#ff5a75" fill-opacity="0.14"/>`;
  return s;
}
/* Fenêtre haute (face +x) */
function windowX(y0, y1, za, zb) { // y0 > y1
  // Retrait dp sur la face +x : l'ouverture découpe le vitrage en y ∈ [y1 ; y0 − dp], z ∈ [za ; zb − dp]
  // (bord gauche et haut cachés par le mur) ; tableau droit (face +y) coupé en biais en haut, appui à gauche.
  const x = X1, dp = 1.8, yv = y0 - dp, zv = zb - dp;
  let s = '';
  s += face(W([[x + 0.15, y0 + 1.6, za - 1.6], [x + 0.15, y1 - 1.6, za - 1.6], [x + 0.15, y1 - 1.6, zb + 1.6], [x + 0.15, y0 + 1.6, zb + 1.6]]), '#eef0f6', 0.3);
  s += face(W([[x + 0.2, y1, za], [x - dp, y1, za], [x - dp, y1, zv], [x + 0.2, y1, zb + 0.2]]), '#e7e9f2', 0.2); // tableau (face +y) à droite
  s += glassX('winR', x - dp, yv, za, y1, zv);
  s += face(W([[x - dp, yv, za], [x - dp, y1, za], [x + 0.2, y1, za], [x + 0.2, y0 + 0.2, za]]), '#dfe2ee', 0.2);
  const ym = (y0 + y1) / 2, zm = za + (zb - za) * 0.62;
  s += face(W([[x - dp + 0.05, ym - 0.5, za], [x - dp + 0.05, ym + 0.5, za], [x - dp + 0.05, ym + 0.5, zv], [x - dp + 0.05, ym - 0.5, zv]]), NAVY, 0.1);
  s += face(W([[x - dp + 0.05, yv, zm - 0.5], [x - dp + 0.05, y1, zm - 0.5], [x - dp + 0.05, y1, zm + 0.5], [x - dp + 0.05, yv, zm + 0.5]]), NAVY, 0.1);
  s += face(W([[x, y0 + 2.4, za - 2.8], [x + 2.2, y0 + 2.4, za - 2.8], [x + 2.2, y0 + 2.4, za - 1.5], [x, y0 + 2.4, za - 1.5]]), '#eef0f6', 0.2);
  s += face(W([[x + 2.2, y1 - 2.4, za - 2.8], [x + 2.2, y0 + 2.4, za - 2.8], [x + 2.2, y0 + 2.4, za - 1.5], [x + 2.2, y1 - 2.4, za - 1.5]]), '#d6d9e7', 0.2);
  s += face(W([[x, y1 - 2.4, za - 1.5], [x + 2.2, y1 - 2.4, za - 1.5], [x + 2.2, y0 + 2.4, za - 1.5], [x, y0 + 2.4, za - 1.5]]), '#ffffff', 0.2);
  return s;
}

/* Enseigne enveloppe (face +x) : panneau blanc arrondi, enveloppe framboise, pastille de notification */
const SIGN = { y: 9, z: 35, w: 30, h: 23 };
function signX() {
  const xs = X1 + 0.15, t = 1.6;
  const y0 = SIGN.y - SIGN.w / 2, y1 = SIGN.y + SIGN.w / 2, z0 = SIGN.z - SIGN.h / 2, z1 = SIGN.z + SIGN.h / 2;
  let s = '';
  const rr = rrect2(y0, z0, y1, z1, 4, 4);
  s += path(onX(xs, rr), '#c5cada');
  s += path(onX(xs + t, rr), '#ffffff');
  s += path(onX(xs + t, rrect2(y0 + 1.3, z0 + 1.3, y1 - 1.3, z1 - 1.3, 3, 4)), '#fff4f8');
  // enveloppe (u vers la droite écran = −y)
  const ey0 = SIGN.y + 9.5, ey1 = SIGN.y - 9.5, ez0 = SIGN.z - 6.8, ez1 = SIGN.z + 6.4, xf = xs + t + 0.05;
  s += path(onX(xf, rrect2(ey1, ez0, ey0, ez1, 1.6, 3)), RASP);
  s += path(onX(xf + 0.02, [[ey0 - 0.9, ez0 + 0.9], [ey1 + 0.9, ez0 + 0.9], [SIGN.y, SIGN.z - 1.2]]), '#c23a6a');
  s += path(onX(xf + 0.04, [[ey0 - 0.5, ez1 - 0.5], [ey1 + 0.5, ez1 - 0.5], [SIGN.y, SIGN.z - 2.4]]), '#f2a2bf');
  s += strokeP(onX(xf + 0.05, [[ey0 - 0.6, ez1 - 0.6], [SIGN.y, SIGN.z - 2.2], [ey1 + 0.6, ez1 - 0.6]]).replace(' Z', ''), '#ffffff', 1.1, 0.95);
  // pastille de notification
  const bc = [ey1 + 0.6, ez1 + 0.4];
  s += path(onX(xf + 0.1, circle2(bc[0], bc[1], 4.1, 22)), '#ffffff');
  s += path(onX(xf + 0.12, circle2(bc[0], bc[1], 3.1, 22)), '#f6c95c');
  s += path(onX(xf + 0.14, circle2(bc[0] + 0.7, bc[1] + 0.9, 1.0, 12)), '#ffffff', 0.7);
  // reflet
  s += path(onX(xs + t + 0.2, [[y1 - 1.5, z1 - 3.5], [y1 - 5, z1 - 1.5], [y1 - 7, z1 - 1.5], [y1 - 1.5, z1 - 6.5]]), '#ffffff', 0.55);
  return s;
}

/* ───────────────── toit plat framboise à acrotère ───────────────── */
let roof = '';
{
  // tranches du toit (débord), dégradé léger
  const gL = gradFaceY('roofL', rx0, ry1, zp, zr0, [[0, '#e35a8a'], [1, RASP]]);
  const gR = gradFaceX('roofR', rx1, ry1, zp, zr0, [[0, '#c63d6f'], [1, RASP_D]]);
  roof += face(W([[rx0, ry1, zr0], [rx1, ry1, zr0], [rx1, ry1, zp], [rx0, ry1, zp]]), gL, 0.4);
  roof += face(W([[rx1, ry0, zr0], [rx1, ry1, zr0], [rx1, ry1, zp], [rx1, ry0, zp]]), gR, 0.4);
  // dessus de l'acrotère (anneau) puis champ en creux + faces intérieures visibles (fond et gauche)
  const p = RF.par;
  roof += face(W([[rx0, ry0, zp], [rx1, ry0, zp], [rx1, ry1, zp], [rx0, ry1, zp]]), '#e97ca3', 0.4);
  const ix0 = rx0 + p, ix1 = rx1 - p, iy0 = ry0 + p, iy1 = ry1 - p;
  const gF = gradPlane('field', P(ix0, iy0, zr1), EX, sub(P(ix0, iy1, zr1), P(ix0, iy0, zr1)), [[0, '#d24d80'], [1, '#df5f8f']]);
  roof += face(W([[ix0, iy0, zr1], [ix1, iy0, zr1], [ix1, iy1, zr1], [ix0, iy1, zr1]]), gF, 0.3);
  roof += face(W([[ix0, iy0, zr1], [ix1, iy0, zr1], [ix1, iy0, zp], [ix0, iy0, zp]]), '#c8416f', 0.3);  // face intérieure du fond (+y)
  roof += face(W([[ix0, iy0, zr1], [ix0, iy1, zr1], [ix0, iy1, zp], [ix0, iy0, zp]]), '#b23763', 0.3);  // face intérieure gauche (+x)
  // joints de l'étanchéité
  let seams = '';
  for (let k = 1; k <= 3; k++) { const yy = iy0 + ((iy1 - iy0) * k) / 4; seams += Wl([[ix0 + 0.5, yy, zr1], [ix1 - 0.5, yy, zr1]]) + ' '; }
  roof += strokeP(seams.trim(), '#f08cb0', 0.7, 0.45);
  // ombre portée de l'acrotère sur le champ
  roof += path(W([[ix0, iy0, zr1], [ix1, iy0, zr1], [ix1 - 0.01, iy0 + 3, zr1], [ix0 + 3, iy0 + 3, zr1], [ix0 + 3, iy1, zr1], [ix0, iy1, zr1]]), '#7a1f45', 0.12);
  // liserés clairs
  roof += strokeP(Wl([[rx0, ry1, zp], [rx1, ry1, zp], [rx1, ry0, zp]]), '#f8b3cb', 1.1, 0.95);
  roof += strokeP(Wl([[rx0, ry1, zp], [rx0, ry0, zp], [rx1, ry0, zp]]), '#f8b3cb', 0.7, 0.6);
  roof += strokeP(Wl([[ix1, iy0, zp], [ix1, iy1, zp], [ix0, iy1, zp]]), '#f39abb', 0.6, 0.7);
  roof += strokeP(Wl([[rx0, ry1, zr0], [rx1, ry1, zr0], [rx1, ry0, zr0]]), '#8f2550', 0.5, 0.45);
}

/* ───────────────── équipements du toit ───────────────── */
// Antenne (mât bleu nuit, deux traverses, boule rose) au fond à droite
function antenna(x, y, z) {
  let s = '';
  const sh = P(x + 1.5, y - 1.5, z);
  s += `<ellipse cx="${r1(sh[0])}" cy="${r1(sh[1])}" rx="4" ry="1.7" fill="#5a1d3a" fill-opacity="0.18"/>`;
  s += face(W([[x - 2.2, y + 2.2, z], [x + 2.2, y + 2.2, z], [x + 2.2, y + 2.2, z + 1.2], [x - 2.2, y + 2.2, z + 1.2]]), '#3f4f93', 0.2);
  s += face(W([[x + 2.2, y - 2.2, z], [x + 2.2, y + 2.2, z], [x + 2.2, y + 2.2, z + 1.2], [x + 2.2, y - 2.2, z + 1.2]]), '#2a376b', 0.2);
  s += face(W([[x - 2.2, y - 2.2, z + 1.2], [x + 2.2, y - 2.2, z + 1.2], [x + 2.2, y + 2.2, z + 1.2], [x - 2.2, y + 2.2, z + 1.2]]), '#4b5ca5', 0.2);
  const H = 24;
  s += strokeP(Wl([[x, y, z + 1.2], [x, y, z + H]]), '#34427e', 1.1);
  s += strokeP(Wl([[x, y, z + 1.2], [x, y, z + H]]), '#5a6bb5', 0.35, 0.8);
  for (const [zz, L] of [[z + H - 9, 5], [z + H - 4.5, 3.6]]) s += strokeP(Wl([[x - L, y + L, zz], [x + L, y - L, zz]]), '#34427e', 0.8);
  const tip = P(x, y, z + H + 1);
  s += `<circle cx="${r1(tip[0])}" cy="${r1(tip[1])}" r="3.4" fill="#ff6b8a" fill-opacity="0.18"/><circle cx="${r1(tip[0])}" cy="${r1(tip[1])}" r="1.5" fill="#ff4f75"/><circle cx="${r1(tip[0] - 0.45)}" cy="${r1(tip[1] - 0.45)}" r="0.5" fill="#ffffff" fill-opacity="0.8"/>`;
  return s;
}

// Mégaphone : axe vers la gauche de l'écran (−x +y) en montant, vu de trois quarts
const MA = nrm([-0.36, 0.86, 0.36]);
const MO = [18, -6, zr1 + 27];    // col du pavillon
function megaphone() {
  let s = '';
  // socle + poteau + fourche sous le corps
  const B = addv(MO, mul(MA, -8.5));
  const post = [B[0], B[1]];
  const zb = zr1, zt = B[2] - 6.2;
  const e = { cx: P(post[0], post[1], zb) };
  s += `<ellipse cx="${r1(e.cx[0] + 2)}" cy="${r1(e.cx[1] + 0.5)}" rx="11" ry="4.6" fill="#5a1d3a" fill-opacity="0.2"/>`;
  // ombre portée du pavillon et du corps sur le toit (lumière de gauche → ombre vers la droite)
  const ks = 9, sh0 = addv(MO, mul(MA, -15)), sh1 = addv(MO, mul(MA, 34));
  const shp = [[sh0[0] + ks, sh0[1] - ks, zb], [sh1[0] + ks, sh1[1] - ks, zb]].map(([x, y, z]) => P(x, y, z));
  s += strokeP(pathS(shp, false), '#5a1d3a', 13, 0.08) + strokeP(pathS(shp, false), '#5a1d3a', 7, 0.08);
  s += obox([post[0], post[1], zb + 0.8], [1, 0, 0], [0, 1, 0], [0, 0, 1], 5.5, 5.5, 0.8, '#4b5ca5', '#2a376b');
  s += obox([post[0], post[1], (zb + 1.6 + zt) / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1], 1.3, 1.3, (zt - zb - 1.6) / 2, '#4b5ca5', '#2a376b');
  // poignée (sous le corps), puis corps (moteur) bleu nuit lisse
  const bprof = [[-15.5, 5.6], [-14.4, 6.4], [-4.4, 6.4], [-1.6, 5.1], [0, 4.7]];
  const body = smoothRev('mbody', MO, MA, bprof, '#5f70bd', '#232c57');
  const u = body.u, w = body.w;
  const hc = addv(MO, mul(MA, -10), mul(w, -9.2));
  s += obox(hc, MA, u, w, 1.6, 1.7, 4, '#4b5ca5', '#26305c');
  s += path(body.ribbon(body.th0, body.th1), body.across('mbodyg', 2, '#5f70bd', '#232c57'));
  s += path(body.ribbon(body.clampT(body.thL - 0.22), body.clampT(body.thL + 0.22), 1, 3), '#ffffff', 0.28);
  s += strokeP(pathS([body.at(-14.4, 6.42, body.th0), body.at(-14.4, 6.42, (body.th0 + body.th1) / 2), body.at(-14.4, 6.42, body.th1)].map(Pw), false), '#8d9be0', 0.6, 0.7);
  // pavillon blanc évasé, bande framboise près de l'embouchure
  const L = 34, R0 = 4.7, R1 = 15.5;
  const rad = (t) => R0 + (R1 - R0) * Math.pow(t / L, 1.45);
  const prof = [0, 6, 12, 18, 23, 26.5, 29.5, 32, 34].map((t) => [t, rad(t)]);
  const horn = smoothRev('mhorn', MO, MA, prof, '#ffffff', '#aeb5cc');
  s += path(horn.ribbon(horn.th0, horn.th1), horn.across('mhorng', 4, '#ffffff', '#aeb5cc'));
  s += path(horn.ribbon(horn.th0, horn.th1, 5, 6), horn.across('mbandg', 5, '#f2709a', '#9e2a58'));
  // lumière qui suit l'évasement : halo large, reflet net ; ombre de bord côté sombre
  s += path(horn.ribbon(horn.clampT(horn.thL - 0.75), horn.clampT(horn.thL + 0.75)), '#ffffff', 0.22);
  s += path(horn.ribbon(horn.clampT(horn.thL - 0.2), horn.clampT(horn.thL + 0.14)), '#ffffff', 0.7);
  const dk = horn.dark, sg = dk === horn.th0 ? 1 : -1;
  s += path(horn.ribbon(dk, dk + sg * 0.45), '#5d6488', 0.16);
  const ring = (t, r) => Array.from({ length: 36 }, (_, j) => horn.at(t, r, (j / 36) * 2 * Math.PI));
  // embouchure : intérieur (dégradé) + lèvre
  const mouth = ring(L, R1 + 0.6).map(Pw);
  const inner = ring(L, R1 - 0.9).map(Pw);
  const mc = Pw(addv(MO, mul(MA, L)));
  s += path(pathS(mouth), '#f7f7fb');
  const lo = inner.reduce((a, p) => (p[0] < a[0] ? p : a)), hi = inner.reduce((a, p) => (p[0] > a[0] ? p : a));
  const gI = gradPlane('mouth', lo, [0, 1], sub(hi, lo), [[0, '#f9d3e1'], [0.45, '#ec7fa6'], [1, '#b8336a']]);
  s += path(pathS(inner), gI);
  // gorge sombre décalée vers l'arrière du pavillon
  const throat = ring(L * 0.42, 7.2).map(Pw);
  const tc = throat.reduce((a, p) => [a[0] + p[0] / throat.length, a[1] + p[1] / throat.length], [0, 0]);
  const k = 0.55;
  s += path(pathS(throat.map((p) => [mc[0] + (p[0] - tc[0]) * k + (tc[0] - mc[0]) * 0.32, mc[1] + (p[1] - tc[1]) * k + (tc[1] - mc[1]) * 0.32])), '#8f2350', 0.55);
  s += strokeP(pathS(mouth), '#ffffff', 1.1, 0.9);
  return { svg: s, mc };
}
const mega = megaphone();

// Ondes (sphères centrées sur l'embouchure → cercles à l'écran) et enveloppes qui s'envolent
function waves(mc) {
  const dir = Pw(addv(MO, mul(MA, 40))), base = Pw(MO);
  const ang = Math.atan2(dir[1] - base[1], dir[0] - base[0]);
  let s = '';
  for (const [r, sw, o, span] of [[23, 3.2, 0.95, 42], [32, 2.9, 0.7, 38], [41, 2.6, 0.45, 34]]) {
    const a0 = ang - (span * Math.PI) / 180, a1 = ang + (span * Math.PI) / 180;
    const p0 = [mc[0] + r * Math.cos(a0), mc[1] + r * Math.sin(a0)], p1 = [mc[0] + r * Math.cos(a1), mc[1] + r * Math.sin(a1)];
    const d = `M${fmt(p0)} A${r1(r)} ${r1(r)} 0 0 1 ${fmt(p1)}`;
    // liseré blanc sous l'onde : sans lui, l'onde framboise se perdait sur le toit framboise
    s += `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${r1(sw + 1.8)}" stroke-linecap="round" stroke-opacity="${r3(o * 0.85)}"/>`;
    s += `<path d="${d}" fill="none" stroke="${RASP}" stroke-width="${sw}" stroke-linecap="round" stroke-opacity="${o}"/>`;
  }
  return s;
}
/** Enveloppe à plat dans un plan y = const, tournée de rot (deg) dans ce plan : corps blanc,
 *  rabat rose pâle bordé framboise, plis du bas, cachet. */
function envelope(c, wE, hE, rot, flap = RASP) {
  const [cx, cy, cz] = c, a = (rot * Math.PI) / 180;
  const L = (u, v) => [cx + u * Math.cos(a) - v * Math.sin(a), cz + u * Math.sin(a) + v * Math.cos(a)];
  const hw = wE / 2, hh = hE / 2;
  const corners = [L(-hw, -hh), L(hw, -hh), L(hw, hh), L(-hw, hh)];
  let s = '';
  // ombre douce sous l'enveloppe (sur le plan, décalée vers le bas-droite)
  s += path(onY(cy - 0.6, corners.map(([x, z]) => [x + 1.6, z - 1.8])), '#7a1f45', 0.12);
  s += path(onY(cy - 0.6, corners), '#d3d7e6');
  s += path(onY(cy, corners), '#ffffff');
  s += strokeP(onY(cy + 0.03, [L(-hw + 0.5, -hh + 0.5), L(-hw * 0.12, -hh * 0.05), L(hw * 0.12, -hh * 0.05), L(hw - 0.5, -hh + 0.5)]).replace(' Z', ''), '#e7c3d2', 0.6);
  s += path(onY(cy + 0.04, [L(-hw, hh), L(hw, hh), L(0, -hh * 0.18)]), '#fbe2ec');
  s += strokeP(onY(cy + 0.05, [L(-hw + 0.3, hh - 0.3), L(0, -hh * 0.18), L(hw - 0.3, hh - 0.3)]).replace(' Z', ''), flap, 0.9);
  s += path(onY(cy + 0.06, circle2(...L(0, -hh * 0.12), 1.05, 12)), flap);
  return s;
}

/* Boîte aux lettres jaune sur pied, avec une lettre glissée dans la fente */
function letterbox(x, y, z) {
  let s = '';
  const sh = P(x + 1.6, y - 1.6, z);
  s += `<ellipse cx="${r1(sh[0])}" cy="${r1(sh[1])}" rx="5.2" ry="2.2" fill="${PAL.shadow}" fill-opacity="0.15"/>`;
  s += face(W([[x - 0.7, y + 0.7, z], [x + 0.7, y + 0.7, z], [x + 0.7, y + 0.7, z + 13], [x - 0.7, y + 0.7, z + 13]]), '#3f4f93', 0.15);
  s += face(W([[x + 0.7, y - 0.7, z], [x + 0.7, y + 0.7, z], [x + 0.7, y + 0.7, z + 13], [x + 0.7, y - 0.7, z + 13]]), '#2a376b', 0.15);
  // caisson (6 × 7 × 8) à dessus arrondi : demi-cylindre elliptique d'axe y (demi-axes RX en x, RZ en z)
  const bx0 = x - 3.2, bx1 = x + 3.2, by0 = y - 3.8, by1 = y + 3.8, bz0 = z + 12.5, bz1 = z + 19;
  const RX = 3.2, RZ = 2.6, NA = 10;
  const arcPt = (t) => [x + RX * Math.cos(t), bz1 + RZ * Math.sin(t)];
  const arc = Array.from({ length: NA + 1 }, (_, i) => arcPt((i / NA) * Math.PI));
  s += face(W([[bx1, by0, bz0], [bx1, by1, bz0], [bx1, by1, bz1], [bx1, by0, bz1]]), '#e0ad3a', 0.2);                // face +x
  // dessus arrondi : seules les bandes tournées vers le spectateur (n·(1,1,1) > 0), teintées selon leur
  // vraie normale → le haut est le plus clair, la bande qui rejoint la face +x a sa teinte ombrée.
  // (Avant : normale de signe faux → dessus sombre, et une bande arrière peinte en clair par-dessus.)
  for (let i = 0; i < NA; i++) {
    const tm = ((i + 0.5) / NA) * Math.PI, n = nrm([Math.cos(tm) / RX, 0, Math.sin(tm) / RZ]);
    if (n[0] + n[2] <= 0.02) continue;
    const [xa, za] = arc[i], [xb2, zb2] = arc[i + 1];
    s += face(W([[xa, by0, za], [xb2, by0, zb2], [xb2, by1, zb2], [xa, by1, za]]), shadeN(n, '#fbe08a', '#e0ad3a', 0.05), 0.2);
  }
  s += face(onY(by1, [[bx0, bz0], [bx1, bz0], [bx1, bz1], ...arc]), '#f6c95c', 0.2); // face +y (avant)
  // liseré clair sur l'arête cintrée de la face avant (et non plus en travers de la face)
  s += strokeP(Wl(arc.map(([xx, zz]) => [xx, by1 + 0.02, zz])), '#fff3c4', 0.4, 0.75);
  // fente + lettre glissée
  s += path(onY(by1 + 0.05, [[x - 2, bz1 - 1.6], [x + 2, bz1 - 1.6], [x + 2, bz1 - 0.6], [x - 2, bz1 - 0.6]]), '#5a4520');
  s += face(W([[x - 1.6, by1 + 0.1, bz1 - 1.2], [x + 1.8, by1 + 0.1, bz1 - 1.2], [x + 2.2, by1 + 1.4, bz1 + 1.8], [x - 1.2, by1 + 1.4, bz1 + 1.8]]), '#ffffff', 0.15);
  s += strokeP(Wl([[x - 1.2, by1 + 1.4, bz1 + 1.8], [x + 0.5, by1 + 0.8, bz1 + 0.5], [x + 2.2, by1 + 1.4, bz1 + 1.8]]), RASP, 0.4, 0.8);
  // pastille bleue (cornet postal stylisé) : disque posé DANS le plan de la face avant (ellipse projetée)
  s += path(onY(by1 + 0.06, circle2(x, bz0 + 3, 1.5, 14)), '#34427e');
  return s;
}

/* ───────────────── composition ───────────────── */
const building = walls + bayY(-44, -8, 12, 40) + doorY(4, 20, ZB, ZB + 30) + windowX(-20, -42, 16, 40) + signX() + roof;
const BD = -17;
add(-200, ground);
add(-190, slab);
add(-58, treeRound(-78, 20, { size: 1 }).svg);
add(BD, building);
add(BD + 0.5, antenna(X1 - 8, Y0 + 9, zr1));
add(BD + 1, mega.svg);
add(BD + 2, waves(mega.mc));
// enveloppes qui s'envolent du mégaphone (plans y = const, devant l'embouchure)
{
  const M = addv(MO, mul(MA, 34));
  let env = '';
  env += envelope(addv(M, mul(MA, 24), [0, 0, 9]), 12, 8, -12);
  env += envelope(addv(M, mul(MA, 41), [0, 0, -8]), 10, 6.8, 9);
  add(BD + 3, env);
}
add(5, bush(-42, 42, { z: ZB, w: 12, d: 9, h: 10 }).svg);
add(17, bush(-29, 42, { z: ZB, w: 12, d: 9, h: 10 }).svg);
add(74, letterbox(44, 30, ZB));
add(76, person(51, 25, { facing: 'left', top: '#14b8a6', hairStyle: 'bun', z: ZB }).svg);
add(10, treeCone(60, -52, { size: 1 }).svg);
add(86, bush(40, 46, { z: ZB, w: 9, d: 9, h: 9 }).svg);

const body = compose(parts);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// manifeste : sommet = coin arrière de l'acrotère (ou haut du mégaphone s'il dépasse)
const topRoof = P(rx0, ry0, zp)[1];
const megaTop = Math.min(...[[0, 1], [0.5, 1], [1, 1]].map(() => mega.mc[1] - 14));
const labelY = Math.round(Math.min(topRoof, megaTop) - 1);
const left = P(rx0, ry1, zp)[0], right = P(rx1, ry0, zp)[0], bottom = P(SL.x1, SL.y1, 0)[1];
const hit = { x: Math.floor(left - 2), y: labelY - 1, w: 0, h: 0 };
hit.w = Math.ceil(right + 2) - hit.x; hit.h = Math.ceil(bottom + 2) - hit.y;
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify({ id: ID, title: TITLE, labelY, hit }, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg (${svg.length} o) labelY=${labelY}`, hit, 'roofTop', topRoof.toFixed(1), 'megaTop', megaTop.toFixed(1));
