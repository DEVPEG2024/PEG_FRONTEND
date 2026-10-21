// Village PEG — sprite « Finance » : la banque (réf. « Factures » de ref.png).
// Cube blanc à toit-terrasse crème derrière un acrotère, grande entrée vitrée sur la
// face éclairée (+y), grand « € » en relief sur la face ombrée (+x), distributeur de
// billets, jardinières blanches plantées, un client au distributeur.
//   node buildings/finance.build.mjs && node tools/lint.mjs buildings/finance.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, onLeft, onRight, onTop, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush } from '../tools/props.mjs';

const ID = 'finance', TITLE = 'Finance';

/* ───────────── petits outils SVG ───────────── */
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${r1(o * 100) / 100}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const S = (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
const scr = (pts) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L') + ' Z';
const defs = [];
/** Dégradé linéaire (boîte englobante par défaut) ; stops = [[offset, couleur, opacité?], …] */
const lg = (name, stops, [x1, y1, x2, y2] = [0, 0, 0, 1]) => {
  const id = `${ID}-${name}`;
  defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return `url(#${id})`;
};
/**
 * Dégradé aligné sur un plan du monde (userSpaceOnUse) : offset 0 en A3, offset 1 en B3, isolignes
 * parallèles à la direction monde U3. Un dégradé « boîte englobante » sur une bande en biais court le
 * long de la bande au lieu de la traverser : celui-ci la traverse vraiment.
 */
const pg = (name, stops, A3, B3, U3) => {
  const A = P(...A3), B = P(...B3), O = P(0, 0, 0), Uv = P(...U3);
  const u = [Uv[0] - O[0], Uv[1] - O[1]], l = Math.hypot(u[0], u[1]), n = [-u[1] / l, u[0] / l];
  const t = (B[0] - A[0]) * n[0] + (B[1] - A[1]) * n[1];
  const id = `${ID}-${name}`;
  defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${r1(A[0])}" y1="${r1(A[1])}" x2="${r1(A[0] + t * n[0])}" y2="${r1(A[1] + t * n[1])}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return `url(#${id})`;
};
/** Enveloppe convexe de points écran */
const hull = (points) => {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
/** Ombre portée douce d'un pavé (vers la droite de l'écran), en trois couches. */
const castShadow = (x0, y0, x1, y1, z, h, o = 0.06) => {
  let s = '';
  for (const t of [1, 0.66, 0.36]) {
    const k = 0.42 * h * t;
    const foot = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    s += F(scr(hull([...foot.map(([a, b]) => P(a, b, z)), ...foot.map(([a, b]) => P(a + k, b - k, z))])), '#5a4a3a', o);
  }
  return s;
};

/* ───────────── palette ───────────── */
const WALL = '#f7f7fb', WALL_SH = '#dfe2ee', WALL_TOP = '#ffffff', PLINTH = '#e3e5ef', PLINTH_SH = '#cfd3e2';
const NAVY = '#2e3a6e';
const CREAM = '#eed6ae';

/* ───────────── géométrie ───────────── */
const X0 = -54, X1 = 36, Y0 = -54, Y1 = 36; // emprise du cube (90 × 90)
const ZT = 65;   // dessus de la couvertine
const CT = 2.6;  // épaisseur de la couvertine
const OV = 1.0;  // débord de la couvertine
const ZR = 59.5; // toit-terrasse
const T = 4;     // épaisseur de l'acrotère
const PL = 5;    // soubassement
const ZW = ZT - CT; // haut des murs
// dalle (trottoir)
const SH = 1.6, SX0 = -66, SX1 = 62, SY0 = -66, SY1 = 62;

const items = [];
let ground = '';

/* ── ombre de contact + dalle ── */
const cs = contactShadow(`${ID}-cs`, 124, 56, P(-9, -9, 0)[0], P(-9, -9, 0)[1] + 8, 0.22);
defs.push(cs.defs);
ground += cs.el;
{
  const b = box(SX0, SY0, 0, SX1 - SX0, SY1 - SY0, SH);
  ground += F(b.left, '#e6e1d8') + F(b.right, '#d8d1c4') + F(b.top, lg('slab', [[0, '#f7f5f1'], [1, '#efebe4']]));
  ground += S(line([[SX0, SY1, SH], [SX1, SY1, SH], [SX1, SY0, SH]]), '#ffffff', 0.9, 0.8);
  // joints de dallage discrets
  let j = '';
  for (let x = SX0 + 20; x < SX1 - 4; x += 20) j += line([[x, SY1 - 0.4, SH], [x, Y1 + 0.5, SH]]) + ' ';
  for (let y = SY0 + 20; y < SY1 - 4; y += 20) j += line([[SX1 - 0.4, y, SH], [X1 + 0.5, y, SH]]) + ' ';
  ground += S(j.trim(), '#ddd6ca', 0.5, 0.7);
  ground += castShadow(X0, Y0, X1, Y1, SH, ZT, 0.055);
}

/* ───────────── le bâtiment ───────────── */
let bld = '';

// 1. Toit-terrasse (vu par l'ouverture de la couvertine) + faces intérieures de l'acrotère du fond
{
  const ix0 = X0 + T, ix1 = X1 - T, iy0 = Y0 + T, iy1 = Y1 - T;
  bld += F(onTop(ZR, ix0, iy0, ix1, iy1), CREAM);
  // membrane plus claire au centre (léger relief)
  bld += F(onTop(ZR, ix0 + 6, iy0 + 6, ix1 - 6, iy1 - 6), '#f4e4c8');
  bld += S(line([[ix0 + 6, iy1 - 6, ZR], [ix1 - 6, iy1 - 6, ZR], [ix1 - 6, iy0 + 6, ZR]]), '#dfc192', 0.6, 0.85);
  bld += S(line([[ix0 + 6, iy1 - 6, ZR], [ix0 + 6, iy0 + 6, ZR], [ix1 - 6, iy0 + 6, ZR]]), '#fbf2e2', 0.6, 0.9);
  // lanterneau vitré
  {
    const lx = -26, ly = -30, lw = 22, ld = 16, lh = 3.2;
    const b = box(lx, ly, ZR, lw, ld, lh);
    bld += F(b.left, '#efe7da') + F(b.right, '#ddd2c0');
    bld += F(b.top, lg('sky', [[0, '#cfe3ff'], [1, '#8db4f3']], [0, 0, 1, 1]));
    bld += F(onTop(ZR + lh, lx + 3, ly + 2, lx + 8, ly + ld - 2), '#ffffff', 0.35);
    bld += S(line([[lx + lw / 2, ly, ZR + lh], [lx + lw / 2, ly + ld, ZR + lh]]), '#f4efe6', 0.8);
  }
  // faces intérieures visibles : acrotère du fond (+y, éclairé) et de gauche (+x, ombré)
  bld += F(onLeft(iy0, ix0, ix1, ZR, ZT), '#f3f3f8');
  bld += F(onRight(ix0, iy0, iy1, ZR, ZT), '#e2e5ef');
  // ombre portée de l'acrotère gauche (−x, côté lumière) sur la terrasse : bande le long de son pied,
  // sombre contre l'acrotère, fondue vers l'intérieur. (Celle de l'acrotère avant +y tomberait dans
  // les 5,5 unités de terrasse que cet acrotère masque lui-même : inutile de la dessiner.)
  bld += F(onTop(ZR, ix0, iy0, ix0 + 4.5, iy1), pg('terrSh', [[0, '#8a6a4c', 0.16], [1, '#8a6a4c', 0]], [ix0, 0, ZR], [ix0 + 4.5, 0, ZR], [0, 1, 0]));
}

// 2. Murs : face éclairée (+y) et face ombrée (+x), dégradé vertical léger
const gL = lg('wallL', [[0, '#ffffff'], [1, '#f1f1f7']]);
const gR = lg('wallR', [[0, '#e7e9f3'], [1, '#d9dce9']]);
bld += F(onLeft(Y1, X0, X1, 0, ZW), gL);
bld += F(onRight(X1, Y0, Y1, 0, ZW), gR);
// soubassement
bld += F(onLeft(Y1, X0, X1, 0, PL), PLINTH) + F(onRight(X1, Y0, Y1, 0, PL), PLINTH_SH);
bld += S(line([[X0, Y1, PL], [X1, Y1, PL], [X1, Y0, PL]]), '#f4f5f9', 0.7, 0.9);

// 3. Entrée vitrée (face +y) : mur-rideau en retrait, portes doubles
const GX0 = -45, GX1 = 14, GZ0 = 2.6, GZ1 = 46, DX0 = -24, DX1 = -5, DZ1 = 33, REC = 1.6;
{
  const glass = lg('glassL', [[0, '#b4d4ff'], [0.55, '#8ab3f8'], [1, '#6f9ef5']]);
  const doorG = lg('doorL', [[0, '#cfe2ff'], [1, '#96bbf6']]);
  // fond vitré
  bld += F(onLeft(Y1, GX0, GX1, GZ0, GZ1), glass);
  // intérieur deviné : guichet (bandeau plus sombre) derrière les vitres fixes
  bld += F(onLeft(Y1, GX0, DX0, 5, 15), '#4f74c4', 0.22) + F(onLeft(Y1, DX1, GX1, 5, 15), '#4f74c4', 0.22);
  bld += F(onLeft(Y1, GX0, DX0, 15, 16.2), '#ffffff', 0.35) + F(onLeft(Y1, DX1, GX1, 15, 16.2), '#ffffff', 0.35);
  // portes (verre plus clair)
  bld += F(onLeft(Y1, DX0, DX1, GZ0, DZ1), doorG);
  // reflets diagonaux continus d'un carreau à l'autre
  const refl = (x0, w, z0, z1, a = 0.32) => F(poly([[x0, Y1, z0], [x0 + w, Y1, z0], [x0 + w + (z1 - z0) * 0.7, Y1, z1], [x0 + (z1 - z0) * 0.7, Y1, z1]]), '#ffffff', a);
  bld += refl(GX0 + 1, 6, 6, 42, 0.26) + refl(GX0 + 10, 2.4, 6, 42, 0.2);
  bld += refl(DX0 + 0.5, 4.5, 3, 20, 0.3);
  bld += refl(DX1 + 1.5, 5, 6, 26, 0.24);
  bld += F(onLeft(Y1, GX0, GX1, 35, GZ1), '#ffffff', 0.1);
  // menuiseries bleu nuit (dans le plan du vitrage, en retrait)
  const yG = Y1 - REC * 0.4;
  let fr = '';
  fr += line([[GX0, yG, GZ1 - 0.6], [GX1, yG, GZ1 - 0.6]]) + ' ';
  fr += line([[GX0, yG, DZ1], [GX1, yG, DZ1]]) + ' ';
  fr += line([[GX0, yG, 5], [DX0, yG, 5]]) + ' ' + line([[DX1, yG, 5], [GX1, yG, 5]]) + ' ';
  for (const x of [-34.5, DX0, (DX0 + DX1) / 2, DX1]) fr += line([[x, yG, GZ0], [x, yG, GZ1]]) + ' ';
  fr += line([[GX1 - 0.6, yG, GZ0], [GX1 - 0.6, yG, GZ1]]);
  bld += S(fr, '#34427e', 1.05);
  // poignées des portes (barres verticales dorées)
  const hx = (DX0 + DX1) / 2;
  bld += S(line([[hx - 1.7, yG + 0.3, 12], [hx - 1.7, yG + 0.3, 21]]) + ' ' + line([[hx + 1.7, yG + 0.3, 12], [hx + 1.7, yG + 0.3, 21]]), '#e0ad3a', 1.0);
  // tableau gauche (ébrasement, tourné vers +x) et seuil
  bld += F(poly([[GX0, Y1, GZ0], [GX0, Y1 - REC, GZ0], [GX0, Y1 - REC, GZ1], [GX0, Y1, GZ1]]), '#d3d8e6');
  bld += F(poly([[GX0, Y1, GZ0], [GX1, Y1, GZ0], [GX1, Y1 - REC, GZ0], [GX0, Y1 - REC, GZ0]]), '#eceef4');
  // tapis d'entrée bleu nuit devant les portes
  bld += F(onTop(SH + 0.15, DX0 + 1, Y1 + 1, DX1 - 1, Y1 + 8), '#3f4f93');
  bld += F(onTop(SH + 0.2, DX0 + 2.2, Y1 + 2, DX1 - 2.2, Y1 + 7), '#4b5ca5');
}

// 4. Distributeur de billets (face +y, à droite du vitrage)
{
  const ax0 = 23, ax1 = 32, az0 = 10, az1 = 31;
  bld += F(onLeft(Y1, ax0 - 1, ax1 + 1, az0 - 1, az1 + 1), '#e4e7f0');
  bld += F(onLeft(Y1, ax0, ax1, az0, az1), NAVY);
  bld += F(onLeft(Y1, ax0 + 1.2, ax1 - 1.2, az1 - 9, az1 - 1.4), '#9ad1ff');
  bld += F(poly([[ax0 + 1.2, Y1, az1 - 9], [ax0 + 3.4, Y1, az1 - 9], [ax0 + 5.6, Y1, az1 - 1.4], [ax0 + 3.4, Y1, az1 - 1.4]]), '#ffffff', 0.35);
  // clavier + fente
  let k = '';
  // touches : petits traits posés dans le plan de la façade (le long de x), pas à l'horizontale écran
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = ax0 + 2.3 + i * 1.9, z = az0 + 3 + j * 1.9; k += line([[x - 0.5, Y1, z], [x + 0.5, Y1, z]]) + ' '; }
  bld += S(k.trim(), '#c3c9d6', 0.75);
  bld += S(line([[ax1 - 3.2, Y1, az0 + 6.4], [ax1 - 1.4, Y1, az0 + 6.4]]), '#f6c95c', 0.6);
  // petit auvent
  const b = box(ax0 - 1.4, Y1, az1 + 1.4, ax1 - ax0 + 2.8, 2.4, 1.2);
  bld += F(b.left, '#f2f3f8') + F(b.right, '#dde0ec') + F(b.top, '#ffffff');
}

// 5. Grand « € » en relief (face +x) — tracé géométrique projeté sur le mur
{
  // boucle légèrement ovale (plus haute que large), terminaisons coupées en biais, barres plus fines
  const yc = 10, zc = 32, ax = 13.2, az = 15.4, th = 4.6, a0 = 46, a1 = 314;
  const pt = (u, v, e) => [X1 + e, yc - u, zc + v];
  const arc = (e) => {
    const pts = [];
    for (let a = a0; a <= a1 + 0.01; a += 4) { const t = (a * Math.PI) / 180; pts.push(pt(ax * Math.cos(t), az * Math.sin(t), e)); }
    for (let a = a1 - 6; a >= a0 + 6 - 0.01; a -= 4) { const t = (a * Math.PI) / 180; pts.push(pt((ax - th) * Math.cos(t), (az - th) * Math.sin(t), e)); }
    return poly(pts);
  };
  const bar = (uL, uR, v0, v1, e) => poly([pt(uL, v0, e), pt(uR, v0, e), pt(uR, v1, e), pt(uL, v1, e)]);
  const glyph = (e, col, o) => F(arc(e), col, o) + F(bar(-17.6, 3.6, 1.3, 4.5, e), col, o) + F(bar(-16.6, 1.9, -4.8, -1.6, e), col, o);
  // ombre douce sur le mur, portée vers le bas-droite de l'écran (lumière d'en haut, à gauche) comme
  // toutes les ombres du village ; puis tranche claire (dessus + flanc +y, éclairés), puis face
  bld += `<g transform="translate(1.3 1.3)">${glyph(0, '#2a3466', 0.13)}</g>`;
  bld += glyph(0, '#5d6ba6') + glyph(0.6, '#4f5d99');
  bld += glyph(1.2, NAVY);
  // reflet sur l'arête haute de la boucle
  const hl = [];
  for (let a = 96; a <= 204; a += 6) { const t = (a * Math.PI) / 180; hl.push(pt((ax - 1) * Math.cos(t), (az - 1) * Math.sin(t), 1.2)); }
  bld += S(line(hl), '#7181c4', 0.9, 0.65);
}

// 6. Fenêtre (face +x) : 2 × 2 carreaux, tableau éclairé à droite
{
  const wy0 = -46, wy1 = -17, wz0 = 19, wz1 = 47, rec = 1.6;
  bld += F(onRight(X1, wy0, wy1, wz0, wz1), lg('glassR', [[0, '#8fb3f0'], [0.6, '#6f93dc'], [1, '#5579c6']]));
  bld += F(poly([[X1, wy1 - 3, wz0 + 2], [X1, wy1 - 7, wz0 + 2], [X1, wy1 - 13, wz1 - 2], [X1, wy1 - 9, wz1 - 2]]), '#ffffff', 0.26);
  bld += F(poly([[X1, wy0 + 9, wz0 + 2], [X1, wy0 + 7.4, wz0 + 2], [X1, wy0 + 3.4, wz1 - 2], [X1, wy0 + 5, wz1 - 2]]), '#ffffff', 0.18);
  const xg = X1 - rec * 0.4;
  let fr = line([[xg, (wy0 + wy1) / 2, wz0], [xg, (wy0 + wy1) / 2, wz1]]) + ' ' + line([[xg, wy0, (wz0 + wz1) / 2], [xg, wy1, (wz0 + wz1) / 2]]);
  fr += ' ' + line([[xg, wy0, wz1 - 0.5], [xg, wy1, wz1 - 0.5]]) + ' ' + line([[xg, wy1 - 0.5, wz0], [xg, wy1 - 0.5, wz1]]);
  bld += S(fr, NAVY, 1.15);
  // tableau côté −y (tourné vers +y : éclairé) et appui
  bld += F(poly([[X1, wy0, wz0], [X1 - rec, wy0, wz0], [X1 - rec, wy0, wz1], [X1, wy0, wz1]]), '#f4f5fa');
  const b = box(X1 - 0.2, wy0 - 1, wz0 - 1.4, 2.4, wy1 - wy0 + 2, 1.4);
  bld += F(b.left, '#eef0f6') + F(b.right, '#dadeea') + F(b.top, '#ffffff');
}

// 7. Arête verticale avant adoucie + filet d'ombre sous la couvertine
bld += S(line([[X1, Y1, PL + 0.5], [X1, Y1, ZW - 0.5]]), '#ffffff', 1.1, 0.75);
bld += F(onLeft(Y1, X0, X1, ZW - 1.4, ZW), '#c9cede', 0.25) + F(onRight(X1, Y0, Y1, ZW - 1.4, ZW), '#aab1c6', 0.25);

// 8. Couvertine (anneau blanc en léger débord) + liserés
{
  const ox0 = X0 - OV, ox1 = X1 + OV, oy0 = Y0 - OV, oy1 = Y1 + OV;
  const b = box(ox0, oy0, ZW, ox1 - ox0, oy1 - oy0, CT);
  bld += F(b.left, '#fbfbfd') + F(b.right, '#e9ebf3');
  const outer = onTop(ZT, ox0, oy0, ox1, oy1), inner = onTop(ZT, X0 + T, Y0 + T, X1 - T, Y1 - T);
  bld += `<path d="${outer} ${inner}" fill="${WALL_TOP}" fill-rule="evenodd"/>`;
  bld += S(line([[ox0, oy1, ZT], [ox1, oy1, ZT], [ox1, oy0, ZT]]), '#ffffff', 1.2);
  bld += S(line([[ox0, oy1, ZW], [ox1, oy1, ZW], [ox1, oy0, ZW]]), '#c7ccdb', 0.5, 0.8);
  bld += S(line([[X0 + T, Y1 - T, ZT], [X0 + T, Y0 + T, ZT], [X1 - T, Y0 + T, ZT]]), '#e6e8f0', 0.6);
}
items.push({ d: (X0 + X1) / 2 + (Y0 + Y1) / 2, svg: bld });

/* ───────────── jardinières, arbres, client ───────────── */
function planter(cx, cy, w, d, axis = 'x', n = 2) {
  const h = 5.5, x0 = cx - w / 2, y0 = cy - d / 2;
  const b = box(x0, y0, SH, w, d, h);
  let s = castShadow(x0, y0, x0 + w, y0 + d, SH, h + 8, 0.05);
  s += F(b.left, '#f7f7fb') + F(b.right, '#dcdfeb') + F(b.top, '#ffffff');
  s += F(onTop(SH + h, x0 + 1, y0 + 1, x0 + w - 1, y0 + d - 1), '#8a6a4c');
  s += S(line([[x0, y0 + d, SH + h], [x0 + w, y0 + d, SH + h], [x0 + w, y0, SH + h]]), '#ffffff', 0.7);
  const bs = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const [bx, by] = axis === 'x' ? [x0 + w * t, cy] : [cx, y0 + d * t];
    const [bw, bd] = axis === 'x' ? [w / n - 1.2, d - 2] : [w - 2, d / n - 1.2];
    bs.push(bush(bx, by, { z: SH + h, w: bw, d: bd, h: 8.5 + (i % 2) * 1.5 }));
  }
  s += bs.sort((a, b2) => a.d - b2.d).map((q) => q.svg).join('');
  return { d: cx + cy, svg: s };
}
items.push(planter(-41, 45, 18, 8.5, 'x'));
items.push(planter(6, 45, 14, 8.5, 'x'));
items.push(planter(46, 22, 8.5, 18, 'y'));
items.push(planter(46, -37, 8.5, 20, 'y'));

// arbre rond dégagé de l'arête gauche (à (−73, 33) la couvertine lui tranchait 5 px de feuillage)
items.push(treeRound(-72, 46, { size: 1 }));
items.push(treeCone(66, -55, { size: 0.9 }));

// cliente au distributeur, de dos
items.push(person(27.5, 44, { facing: 'back-right', pose: 'stand', top: '#f59e0b', hairStyle: 'bun', pants: '#34427e' }));

/* ───────────── sortie ───────────── */
const body = ground + compose(items);
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svgDoc({ title: TITLE, defs: defs.join(''), body }));

// manifeste : sommet = coin arrière de la couvertine ; hit = bâtiment principal
const top = P(X0 - OV, Y0 - OV, ZT)[1];
const left = P(X0 - OV, Y1 + OV, 0)[0], right = P(X1 + OV, Y0 - OV, 0)[0], bottom = P(X1 + OV, Y1 + OV, 0)[1];
const hit = { x: Math.floor(left - 2), y: Math.floor(top - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - top + 4) };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify({ id: ID, title: TITLE, labelY: Math.round(top), hit }, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, body.length, 'o');
