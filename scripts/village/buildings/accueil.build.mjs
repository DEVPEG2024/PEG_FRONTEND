// Village PEG — sprite « Accueil » : la place du village (aucun bâtiment fermé).
// Place pavée ronde surélevée d'une marche, rose des vents lavande qui pointe vers les quatre allées,
// fontaine centrale (bassin, vasque, jet d'eau), grand panneau de liège « pense-bête » couvert de
// post-its sous un petit toit violet (grand bandeau à l'enseigne « maison », taille alignée sur les
// enseignes des voisins), banc, lampadaires, arbres, buissons, poteau indicateur vers les allées,
// passants, pigeons. Volume bas : le toit du panneau est le point haut (labelY ≈ 191).
// Poids surveillé (≤ 70 Ko) : SIZES=1 détaille chaque élément.
//   node buildings/accueil.build.mjs && node tools/lint.mjs buildings/accueil.svg
import { writeFileSync } from 'node:fs';
import { P, compose, contactShadow, svgDoc, shade, tint } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, bench, lamp } from '../tools/props.mjs';

const ID = 'accueil', TITLE = 'Accueil';

/* ───────────────────────── boîte à outils ───────────────────────── */
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const r3 = (n) => { const v = Math.round(n * 1000) / 1000; return String(Object.is(v, -0) ? 0 : v); };
const fmt = (p) => r1(p[0]) + ' ' + r1(p[1]);
const pathS = (scr, close = true) => 'M' + scr.map(fmt).join('L') + (close ? 'Z' : '');
/** chemin (points monde [x,y,z]) */
const W = (pts, close = true) => pathS(pts.map(([x, y, z]) => P(x, y, z)), close);
/** Segment compact (déplacement relatif, jamais d'espace devant un nombre négatif → lint). */
const seg = (a, b) => {
  const A = [Math.round(a[0] * 10) / 10, Math.round(a[1] * 10) / 10], B = [Math.round(b[0] * 10) / 10, Math.round(b[1] * 10) / 10];
  const dy = r1(B[1] - A[1]);
  return 'M' + fmt(A) + 'l' + r1(B[0] - A[0]) + (dy[0] === '-' ? '' : ' ') + dy;
};
const op = (o) => (o != null && o < 1 ? ` fill-opacity="${r3(o)}"` : '');
const fill = (d, color, o, extra = '') => `<path d="${d}" fill="${color}"${op(o)}${extra}/>`;
const face = (d, color, seam = 0.5) => `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="${seam}"/>`;
const strokeP = (d, color, w, o = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}"${o < 1 ? ` stroke-opacity="${r3(o)}"` : ''}/>`;
const dot = (p, r, color, o) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(r)}" fill="${color}"${op(o)}/>`;

const KX = Math.SQRT2 * Math.cos(Math.PI / 6), KY = Math.SQRT2 * 0.5; // cercle monde → ellipse écran
/** Ellipse écran d'un cercle horizontal monde. */
const E = (cx, cy, z, r) => { const [a, b] = P(cx, cy, z); return { a, b, rx: r * KX, ry: r * KY }; };
const ellipseEl = (cx, cy, z, r, color, o, extra = '') => { const e = E(cx, cy, z, r); return `<ellipse cx="${r1(e.a)}" cy="${r1(e.b)}" rx="${r1(e.rx)}" ry="${r1(e.ry)}" fill="${color}"${op(o)}${extra}/>`; };
const ellipseStroke = (cx, cy, z, r, color, w, o) => { const e = E(cx, cy, z, r); return `<ellipse cx="${r1(e.a)}" cy="${r1(e.b)}" rx="${r1(e.rx)}" ry="${r1(e.ry)}" fill="none" stroke="${color}" stroke-width="${w}"${o < 1 ? ` stroke-opacity="${o}"` : ''}/>`; };
/** Moitié avant d'un cercle horizontal (arc écran, de gauche à droite par le bas). */
const frontArc = (cx, cy, z, r) => { const e = E(cx, cy, z, r); return `M${r1(e.a - e.rx)} ${r1(e.b)} A${r1(e.rx)} ${r1(e.ry)} 0 0 0 ${r1(e.a + e.rx)} ${r1(e.b)}`; };
/** Flanc visible d'un tronc de cône vertical (rayon r0 en z0, rT en z1) : arcs avant exacts. */
function coneSide(cx, cy, r0, z0, rT, z1) {
  const b = E(cx, cy, z0, r0), t = E(cx, cy, z1, rT);
  return `M${r1(t.a - t.rx)} ${r1(t.b)} L${r1(b.a - b.rx)} ${r1(b.b)} A${r1(b.rx)} ${r1(b.ry)} 0 0 0 ${r1(b.a + b.rx)} ${r1(b.b)} ` +
    `L${r1(t.a + t.rx)} ${r1(t.b)} A${r1(t.rx)} ${r1(t.ry)} 0 0 1 ${r1(t.a - t.rx)} ${r1(t.b)} Z`;
}
const cylSide = (cx, cy, r, z0, z1) => coneSide(cx, cy, r, z0, r, z1);
/** Anneau horizontal (couronne) entre ri et ro — à remplir en evenodd. */
function annulus(cx, cy, z, ri, ro) {
  const o = E(cx, cy, z, ro), i = E(cx, cy, z, ri);
  return `M${r1(o.a + o.rx)} ${r1(o.b)} A${r1(o.rx)} ${r1(o.ry)} 0 1 0 ${r1(o.a - o.rx)} ${r1(o.b)} A${r1(o.rx)} ${r1(o.ry)} 0 1 0 ${r1(o.a + o.rx)} ${r1(o.b)} Z ` +
    `M${r1(i.a + i.rx)} ${r1(i.b)} A${r1(i.rx)} ${r1(i.ry)} 0 1 1 ${r1(i.a - i.rx)} ${r1(i.b)} A${r1(i.rx)} ${r1(i.ry)} 0 1 1 ${r1(i.a + i.rx)} ${r1(i.b)} Z`;
}
const EO = ' fill-rule="evenodd"';
/**
 * Plan d'eau vu dans un bassin : cercle r à la hauteur zw, vu par l'ouverture (même cercle en zr > zw).
 * Intersection des deux ellipses : arc haut de l'eau + arc bas de l'ouverture.
 */
function waterIn(cx, cy, r, zr, zw) {
  const h = E(cx, cy, zr, r), d = zr - zw, ym = h.b + d / 2;
  const xi = h.rx * Math.sqrt(Math.max(0, 1 - (d / 2 / h.ry) ** 2));
  return `M${r1(h.a - xi)} ${r1(ym)} A${r1(h.rx)} ${r1(h.ry)} 0 0 1 ${r1(h.a + xi)} ${r1(ym)} A${r1(h.rx)} ${r1(h.ry)} 0 0 1 ${r1(h.a - xi)} ${r1(ym)} Z`;
}

const defs = [];
const stopsOf = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
/** Dégradé sur la boîte englobante (v = [x1, y1, x2, y2]). */
function grad(name, stops, v = [0, 0, 0, 1]) {
  const id = `${ID}-${name}`;
  defs.push(`<linearGradient id="${id}" x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}">${stopsOf(stops)}</linearGradient>`);
  return `url(#${id})`;
}
/** Dégradé linéaire écran (userSpaceOnUse) du point A au point B. */
function gradAB(name, A, B, stops) {
  const id = `${ID}-${name}`;
  defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${r1(A[0])}" y1="${r1(A[1])}" x2="${r1(B[0])}" y2="${r1(B[1])}">${stopsOf(stops)}</linearGradient>`);
  return `url(#${id})`;
}
/** Générateur pseudo-aléatoire déterministe. */
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed % 10000) / 10000; };

/** Pavé : faces +y (lit), +x (dark), dessus (top). */
const cube = (x0, y0, z0, x1, y1, z1, { lit, dark, top }) =>
  face(W([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]), lit, 0.3) +
  face(W([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]), dark, 0.3) +
  (top ? face(W([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]), top, 0.3) : '');
/** Polygone 2D (x, z) posé sur le plan y = const. */
const onY = (y, pts) => W(pts.map(([x, z]) => [x, y, z]));
const onYl = (y, pts) => W(pts.map(([x, z]) => [x, y, z]), false);
/** Rectangle arrondi 2D. */
function rrect2(u0, v0, u1, v1, r, n = 4) {
  r = Math.max(0.01, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const c = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]];
  const pts = [];
  for (const [cu, cv, a0] of c) for (let i = 0; i <= n; i++) { const a = ((a0 + (90 * i) / n) * Math.PI) / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  return pts;
}
/** Point (u, v) d'un repère local tourné de deg autour de (cu, cv), dans le plan d'une façade. */
const rotPt = (cu, cv, u, v, deg) => { const t = (deg * Math.PI) / 180; return [cu + u * Math.cos(t) - v * Math.sin(t), cv + u * Math.sin(t) + v * Math.cos(t)]; };
const rotRect = (cu, cv, hw, hh, deg) => [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => rotPt(cu, cv, u, v, deg));

/* ───────────────────────── palette ───────────────────────── */
const SHADOW = '#5a4a3a';
const STONE = grad('stone', [[0, '#ffffff'], [0.4, '#f3f4f9'], [0.78, '#e1e4ee'], [1, '#d2d6e3']], [0, 0, 1, 0]);
const STONE2 = grad('stone2', [[0, '#ffffff'], [0.45, '#f6f7fb'], [1, '#dde0eb']], [0, 0, 1, 0]);
const WOOD = { lit: '#d9a066', dark: '#c08549', top: '#e4b783' };
const VIOLET = '#7c6bff';

/* ───────────────────────── la place ───────────────────────── */
const H0 = 2.8;     // dessus de la place (une marche)
const R = 66;       // rayon de la place
const RF = R - 4.6; // bord intérieur de la bordure
const items = [];

// Allées vers les rues, aux quatre milieux de côté (dessinées sous la place).
let ground = '';
{
  const half = 8.5, edge = 86.6, from = R - 6;
  let strips = '', borders = '';
  for (const [axis, sgn] of [['x', -1], ['y', -1], ['x', 1], ['y', 1]]) {
    const q = (t, s) => (axis === 'x' ? [sgn * t, s, 0] : [s, sgn * t, 0]);
    strips += W([q(from, -half), q(edge, -half), q(edge, half), q(from, half)]) + ' ';
    // bordures arrêtées 0,6 avant le bord : leur bout arrondi ne déborde pas de la dalle
    borders += W([q(from, -half), q(edge - 0.6, -half)], false) + ' ' + W([q(from, half), q(edge - 0.6, half)], false) + ' ';
  }
  ground += fill(strips.trim(), '#faf7f2') + strokeP(borders.trim(), '#e3d8c6', 0.9);
}

let plaza = '';
// marche : flanc avant visible
plaza += fill(cylSide(0, 0, R, 0, H0), grad('step', [[0, '#ece5d8'], [0.55, '#ddd4c4'], [1, '#cbc1ae']], [0, 0, 1, 0]));
// dessus : bordure en pierre plus soutenue (biseau clair côté intérieur), puis champ pavé clair
plaza += ellipseEl(0, 0, H0, R, '#e3d9c7');
plaza += ellipseEl(0, 0, H0, RF + 0.9, '#f7f3ec');
plaza += ellipseEl(0, 0, H0, RF, grad('field', [[0, '#fdfcf9'], [1, '#f1ece3']], [0, 0, 1, 1]));
// rose des vents lavande : 4 grandes branches vers les allées, 4 petites en diagonale (moitié claire / moitié ombrée)
{
  const RA = 27.5;
  let lite = '', dark = '';
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, big = k % 2 === 0, len = big ? 52 : 40, w = big ? 0.2 : 0.16;
    const tip = [len * Math.cos(a), len * Math.sin(a), H0];
    const mid = [RA * Math.cos(a), RA * Math.sin(a), H0];
    const l = [RA * Math.cos(a - w), RA * Math.sin(a - w), H0], r = [RA * Math.cos(a + w), RA * Math.sin(a + w), H0];
    lite += W([l, tip, mid]) + ' ';
    dark += W([mid, tip, r]) + ' ';
  }
  plaza += fill(lite.trim(), '#e6e1fb') + fill(dark.trim(), '#d4cdf6');
}
// parvis de la fontaine (couronne plus soutenue)
plaza += fill(annulus(0, 0, H0, 21.5, 27.5), '#ebe4d8', undefined, EO);
// joints : cercles concentriques puis joints rayonnants décalés d'un rang à l'autre
for (const [rr, o] of [[RF, 0.9], [27.5, 0.8], [38, 0.5], [50, 0.5]]) plaza += ellipseStroke(0, 0, H0, rr, '#d9cebd', 0.6, o);
{
  let j = '';
  const rays = (ra, rb, n, off) => { for (let i = 0; i < n; i++) { const a = ((i + off) / n) * 2 * Math.PI; j += seg(P(ra * Math.cos(a), ra * Math.sin(a), H0), P(rb * Math.cos(a), rb * Math.sin(a), H0)); } };
  rays(21.5, 27.5, 20, 0);
  rays(27.5, 38, 24, 0.5);
  rays(38, 50, 30, 0);
  rays(50, RF, 36, 0.5);
  rays(RF, R, 40, 0.25);
  plaza += strokeP(j, '#d9cebd', 0.5, 0.6);
}
// liseré clair sur l'arête avant de la marche
plaza += strokeP(frontArc(0, 0, H0, R), '#ffffff', 1, 0.85);

/* ───────────────────────── fontaine ───────────────────────── */
let fountain = '';
{
  const rb = 20.5, zr = H0 + 7.2, rin = 17.6, zw = H0 + 4.4;
  // ombre douce portée sur la place (vers la droite de l'écran)
  fountain += ellipseEl(5, -5, H0, rb + 2, SHADOW, 0.07);
  // bassin : ombre de contact au pied, mur extérieur + margelle débordante + dessus de margelle
  fountain += ellipseStroke(0, 0, H0, rb + 0.5, SHADOW, 1.6, 0.12);
  fountain += fill(cylSide(0, 0, rb, H0, zr - 1.6), STONE);
  fountain += fill(cylSide(0, 0, rb + 1.1, zr - 1.6, zr), STONE2);
  fountain += fill(annulus(0, 0, zr, rin, rb + 1.1), '#ffffff', undefined, EO);
  // paroi intérieure (arrière) puis eau
  fountain += ellipseEl(0, 0, zr, rin, '#cbd3e6');
  const e = E(0, 0, zr, rin);
  fountain += fill(waterIn(0, 0, rin, zr, zw), gradAB('water', [e.a - e.rx, e.b - e.ry], [e.a + e.rx * 0.6, e.b + e.ry], [[0, '#bcdaff'], [0.55, '#8db8fb'], [1, '#6f9ef5']]));
  const ew = E(0, 0, zw, rin);
  fountain += strokeP(`M${r1(ew.a - ew.rx * 0.8)} ${r1(ew.b - 1.4)} Q${r1(ew.a - ew.rx * 0.45)} ${r1(ew.b - ew.ry * 0.66)} ${r1(ew.a - ew.rx * 0.02)} ${r1(ew.b - ew.ry * 0.72)}`, '#ffffff', 0.9, 0.55);
  fountain += strokeP(`M${r1(ew.a + ew.rx * 0.36)} ${r1(ew.b + ew.ry * 0.56)} Q${r1(ew.a + ew.rx * 0.62)} ${r1(ew.b + ew.ry * 0.4)} ${r1(ew.a + ew.rx * 0.74)} ${r1(ew.b + ew.ry * 0.08)}`, '#ffffff', 0.7, 0.4);
  // pied central
  fountain += fill(cylSide(0, 0, 4.4, zw, zw + 2.6), STONE) + ellipseEl(0, 0, zw + 2.6, 4.4, '#ffffff');
  fountain += fill(cylSide(0, 0, 2.3, zw + 2.6, H0 + 17), STONE);
  // vasque évasée + lèvre + eau
  const zv0 = H0 + 15.2, zv1 = H0 + 20.2, rv = 9.8;
  fountain += fill(coneSide(0, 0, 2.6, zv0, rv, zv1), STONE);
  fountain += fill(cylSide(0, 0, rv, zv1, zv1 + 1.1), STONE2);
  fountain += ellipseEl(0, 0, zv1 + 1.1, rv, '#ffffff');
  fountain += ellipseEl(0, 0, zv1 + 1.1, rv - 1.3, '#cbd3e6');
  fountain += fill(waterIn(0, 0, rv - 1.3, zv1 + 1.1, zv1 + 0.3), '#a6caff');
  // rideau d'eau translucide qui déborde de la vasque, écume au pied
  {
    const t = E(0, 0, zv1 + 0.6, rv + 0.2), b = E(0, 0, zw, rv + 2.4);
    const d = `M${r1(t.a - t.rx)} ${r1(t.b)} L${r1(b.a - b.rx)} ${r1(b.b)} A${r1(b.rx)} ${r1(b.ry)} 0 0 0 ${r1(b.a + b.rx)} ${r1(b.b)} L${r1(t.a + t.rx)} ${r1(t.b)} A${r1(t.rx)} ${r1(t.ry)} 0 0 1 ${r1(t.a - t.rx)} ${r1(t.b)} Z`;
    fountain += fill(d, gradAB('curtain', [t.a, t.b], [t.a, b.b + b.ry], [[0, '#ffffff', 0.8], [0.6, '#e3f0ff', 0.5], [1, '#bcd8ff', 0.3]]));
    let st = '';
    for (const k of [-0.78, -0.48, -0.16, 0.18, 0.5, 0.8]) {
      const c = Math.sqrt(1 - k * k);
      st += seg([t.a + k * t.rx, t.b + t.ry * c], [b.a + k * b.rx, b.b + b.ry * c]);
    }
    fountain += strokeP(st, '#ffffff', 0.55, 0.6);
    fountain += `<ellipse cx="${r1(b.a)}" cy="${r1(b.b)}" rx="${r1(b.rx + 0.8)}" ry="${r1(b.ry + 0.5)}" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-opacity="0.7"/>`;
    fountain += ellipseStroke(0, 0, zw, rv + 5, '#ffffff', 0.6, 0.35);
  }
  // colonnette, bouton, jet en panache et gerbe qui retombe dans la vasque
  fountain += fill(cylSide(0, 0, 1.3, zv1 + 1.1, H0 + 25.5), STONE);
  {
    const k0 = P(0, 0, H0 + 26.4);
    fountain += dot(k0, 1.9, '#e6e9f2') + dot([k0[0] - 0.55, k0[1] - 0.55], 1.1, '#ffffff');
    const base = k0[1] - 1.2, top = base - 8.5, cx = k0[0];
    const v = E(0, 0, zv1 + 1.1, rv - 1.6);
    let arcs = '';
    for (const [k, dy] of [[-0.86, 0.1], [0.86, 0.1], [-0.42, 0.78], [0.42, 0.78]]) {
      arcs += `M${r1(cx + k * 0.8)} ${r1(top + 1.6)} Q${r1(cx + k * v.rx * 0.62)} ${r1(top - 0.6)} ${r1(v.a + k * v.rx)} ${r1(v.b + dy * v.ry)} `;
    }
    fountain += strokeP(arcs.trim(), '#ffffff', 0.9, 0.7) + strokeP(arcs.trim(), '#a9cdff', 0.35, 0.7);
    fountain += fill(`M${r1(cx - 0.9)} ${r1(base)} C${r1(cx - 1.3)} ${r1(base - 4)} ${r1(cx - 1.5)} ${r1(top + 1)} ${r1(cx)} ${r1(top)} C${r1(cx + 1.5)} ${r1(top + 1)} ${r1(cx + 1.3)} ${r1(base - 4)} ${r1(cx + 0.9)} ${r1(base)} Z`, '#ffffff', 0.9);
    fountain += strokeP(`M${r1(cx)} ${r1(base - 0.5)} L${r1(cx)} ${r1(top + 1.6)}`, '#a9cdff', 0.5, 0.8);
    for (const [dx, dy, r] of [[-5.4, 2.4, 0.5], [5.8, 3, 0.5], [-2.6, -1.6, 0.4], [3, -1.2, 0.45], [-8.6, 6.4, 0.45], [8.8, 6.8, 0.45]]) fountain += dot([cx + dx, top + dy], r, '#ffffff', 0.9);
  }
}
items.push({ d: 0, svg: fountain });

/* ───────────────────────── panneau « pense-bête » ───────────────────────── */
const YB = -48;                       // face avant du panneau (plan y = YB)
const XA = -34, XB = 18;              // axes des poteaux
const ZB0 = H0 + 7, ZB1 = H0 + 30;    // liège : bas, haut (post-its à hauteur de main)
const ZH = H0 + 54;                   // haut du cadre : grand bandeau d'enseigne, lisible à 0,555
const ZT = ZH + 1.6;                  // base du toit (haut des poteaux) : la rive ne masque pas la plaque
const RY0 = YB - 7.2, RY1 = YB + 2.4, RIDGE = (RY0 + RY1) / 2, RISE = 6.4, RX0 = XA - 4.4, RX1 = XB + 4.4, RT = 1.5;
let board = '';
{
  // ombre portée douce vers l'arrière-droite + pieds des poteaux
  board += fill(W([[XA, YB - 1, H0], [XB, YB - 1, H0], [XB + 13, YB - 17, H0], [XA + 13, YB - 17, H0]]), SHADOW, 0.06);
  for (const x of [XA, XB]) board += ellipseEl(x + 1, YB - 1.2, H0, 2.6, SHADOW, 0.16);
  // poteau gauche (derrière le panneau)
  board += cube(XA - 1.5, YB - 2.9, H0, XA + 1.5, YB + 0.5, ZT, WOOD);
  // caisson bois du panneau
  board += cube(XA + 1.5, YB - 2.2, ZB0 - 2.4, XB - 1.5, YB, ZH, { lit: grad('frame', [[0, '#e2ad74'], [1, '#cf955a']]), dark: WOOD.dark, top: WOOD.top });
  // liège + ombre intérieure du cadre + grain
  const cx0 = XA + 3.6, cx1 = XB - 3.6;
  board += fill(onY(YB, [[cx0, ZB0], [cx1, ZB0], [cx1, ZB1], [cx0, ZB1]]), grad('cork', [[0, '#e3b57d'], [1, '#d3a068']]));
  board += fill(onY(YB, [[cx0, ZB1 - 1.6], [cx1, ZB1 - 1.6], [cx1, ZB1], [cx0, ZB1]]), '#8a5a2e', 0.2);
  board += fill(onY(YB, [[cx0, ZB0], [cx0 + 1.2, ZB0], [cx0 + 1.2, ZB1 - 1.6], [cx0, ZB1 - 1.6]]), '#8a5a2e', 0.14);
  {
    const rnd = rng(11);
    let g1 = '', g2 = '';
    for (let i = 0; i < 28; i++) {
      const p = P(cx0 + 1.6 + rnd() * (cx1 - cx0 - 3.2), YB, ZB0 + 1 + rnd() * (ZB1 - ZB0 - 3.4));
      const s = `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(0.32 + rnd() * 0.3)}"/>`;
      if (i % 3) g1 += s; else g2 += s;
    }
    board += `<g fill="#a8723f" fill-opacity="0.35">${g1}</g><g fill="#f3d3a6" fill-opacity="0.5">${g2}</g>`;
  }
  // feuille « à faire » : bandeau violet, cases (2 cochées), lignes
  {
    const sc = [-7, (ZB0 + ZB1) / 2], hw = 6, hh = 9.4, ang = -2;
    let s = fill(onY(YB + 0.05, rotRect(sc[0] + 0.5, sc[1] - 0.7, hw, hh, ang)), SHADOW, 0.16);
    s += fill(onY(YB + 0.1, rotRect(...sc, hw, hh, ang)), '#ffffff');
    s += fill(onY(YB + 0.12, [rotPt(...sc, -hw, hh - 3.6, ang), rotPt(...sc, hw, hh - 3.6, ang), rotPt(...sc, hw, hh, ang), rotPt(...sc, -hw, hh, ang)]), VIOLET);
    let lines = '', checks = '', open = '';
    for (let k = 0; k < 4; k++) {
      const v = hh - 5.9 - k * 3.9;
      const box = [rotPt(...sc, -hw + 1.3, v - 1.05, ang), rotPt(...sc, -hw + 3.4, v - 1.05, ang), rotPt(...sc, -hw + 3.4, v + 1.05, ang), rotPt(...sc, -hw + 1.3, v + 1.05, ang)];
      if (k < 2) {
        s += fill(onY(YB + 0.14, box), '#22c38a');
        checks += onYl(YB + 0.16, [rotPt(...sc, -hw + 1.8, v, ang), rotPt(...sc, -hw + 2.3, v - 0.55, ang), rotPt(...sc, -hw + 3.05, v + 0.7, ang)]) + ' ';
      } else open += onY(YB + 0.14, box) + ' ';
      lines += onYl(YB + 0.14, [rotPt(...sc, -hw + 4.6, v, ang), rotPt(...sc, hw - 1.3 - (k % 2) * 2, v, ang)]) + ' ';
    }
    s += strokeP(open.trim(), '#b9bfd3', 0.35) + strokeP(checks.trim(), '#ffffff', 0.45) + strokeP(lines.trim(), '#9aa2bd', 0.55, 0.85);
    board += s;
  }
  // post-its colorés, épinglés de travers
  const POST = [
    { u: -25.8, v: ZB1 - 5.2, c: '#f6c95c', a: -6, pin: '#e0445f' },
    { u: -18, v: ZB1 - 4.6, c: '#ef8aa0', a: 5, pin: '#2e3a6e' },
    { u: 9.4, v: ZB1 - 5, c: '#22c3e6', a: -4, pin: '#e0445f' },
    { u: -25.6, v: ZB0 + 5.4, c: '#7bd393', a: 4, pin: '#e0445f' },
    { u: -17.8, v: ZB0 + 6, c: '#8a7cff', a: -5, pin: '#f6c95c' },
    { u: 9.2, v: ZB0 + 5.2, c: '#f59e0b', a: 6, pin: '#2e3a6e' },
  ];
  for (const n of POST) {
    const hw = 3.6;
    let s = fill(onY(YB + 0.05, rotRect(n.u + 0.5, n.v - 0.7, hw, hw, n.a)), SHADOW, 0.16);
    const sq = rotRect(n.u, n.v, hw, hw, n.a);
    s += fill(onY(YB + 0.1, sq), n.c);
    s += fill(onY(YB + 0.12, [sq[3], sq[2], rotPt(n.u, n.v, hw, hw - 1.4, n.a), rotPt(n.u, n.v, -hw, hw - 1.4, n.a)]), shade(n.c, 0.88), 0.55);
    s += fill(onY(YB + 0.12, [sq[1], rotPt(n.u, n.v, hw - 1.8, -hw, n.a), rotPt(n.u, n.v, hw, -hw + 1.8, n.a)]), tint(n.c, 0.55));
    s += strokeP(onYl(YB + 0.14, [rotPt(n.u, n.v, -hw + 1.1, 0.5, n.a), rotPt(n.u, n.v, hw - 1, 0.5, n.a)]) + ' ' +
      onYl(YB + 0.14, [rotPt(n.u, n.v, -hw + 1.1, -1.5, n.a), rotPt(n.u, n.v, hw - 2.4, -1.5, n.a)]), shade(n.c, 0.6), 0.5, 0.75);
    const pp = rotPt(n.u, n.v, 0, hw - 0.9, n.a), pin = P(pp[0], YB + 0.3, pp[1]);
    s += dot(pin, 0.95, n.pin) + dot([pin[0] - 0.3, pin[1] - 0.3], 0.35, '#ffffff', 0.8);
    board += s;
  }
  // bandeau : grande plaque blanche arrondie, pictogramme « maison » violet = l'icône du menu Accueil.
  // Taille alignée sur les enseignes des voisins (≈ 14 unités de haut → ≈ 8 px dans la scène).
  {
    const xc = (XA + XB) / 2, z0 = ZB1 + 1.2, z1 = ZH - 2.4, hw = 15; // z1 : dégagée de la rive du toit
    const plate = rrect2(xc - hw, z0, xc + hw, z1, 3, 3);
    board += fill(onY(YB + 0.05, plate.map(([u, v]) => [u + 0.7, v - 0.9])), SHADOW, 0.22);
    board += fill(onY(YB + 0.4, plate), '#ffffff');
    const zc = (z0 + z1) / 2 - 0.3;
    const house = [[xc - 5.4, zc - 6.6], [xc + 5.4, zc - 6.6], [xc + 5.4, zc + 0.6], [xc + 8, zc + 0.6], [xc, zc + 7.4], [xc - 8, zc + 0.6], [xc - 5.4, zc + 0.6]];
    board += fill(onY(YB + 0.45, house), VIOLET);
    board += fill(onY(YB + 0.5, [[xc - 1.7, zc - 6.6], [xc + 1.7, zc - 6.6], [xc + 1.7, zc - 2], [xc - 1.7, zc - 2]]), '#ffffff');
  }
  // ombre de l'avant-toit sur le haut du panneau (plaque comprise)
  board += fill(onY(YB + 0.6, [[XA + 1.5, ZH - 5], [XB - 1.5, ZH - 5], [XB - 1.5, ZH], [XA + 1.5, ZH]]), gradAB('eave', P(XA, YB, ZH), P(XA, YB, ZH - 5), [[0, SHADOW, 0.2], [1, SHADOW, 0]]));
  // poteau droit
  board += cube(XB - 1.5, YB - 2.9, H0, XB + 1.5, YB + 0.5, ZT, WOOD);
  // petit toit violet : pignon bois côté +x, pan avant, rive, profil épais côté +x, faîtière
  const zE = ZT, zR = ZT + RISE;
  board += face(W([[XB + 1.5, RY0 + 1.8, zE], [XB + 1.5, RIDGE, zR - 1.6], [XB + 1.5, RY1 - 1.6, zE]]), WOOD.dark, 0.3);
  board += face(W([[RX0, RY1, zE], [RX1, RY1, zE], [RX1, RIDGE, zR], [RX0, RIDGE, zR]]), gradAB('roof', P(RX0, RIDGE, zR), P(RX0, RY1, zE), [[0, '#968aff'], [1, '#7866fb']]), 0.4);
  board += face(W([[RX0, RY1, zE], [RX1, RY1, zE], [RX1, RY1, zE - RT], [RX0, RY1, zE - RT]]), '#6b5af0', 0.3);
  board += face(W([[RX1, RY0, zE], [RX1, RIDGE, zR], [RX1, RY1, zE], [RX1, RY1, zE - RT], [RX1, RIDGE, zR - RT], [RX1, RY0, zE - RT]]), '#5444d2', 0.3);
  board += strokeP(W([[RX0, RY1, zE], [RX1, RY1, zE]], false), tint(VIOLET, 0.45), 1.1);
  board += strokeP(W([[RX1, RY1, zE], [RX1, RIDGE, zR]], false), tint(VIOLET, 0.35), 0.9);
  board += strokeP(W([[RX0, RIDGE, zR + 0.3], [RX1, RIDGE, zR + 0.3]], false), tint(VIOLET, 0.55), 1.4);
}
items.push({ d: YB + (XA + XB) / 2, svg: board });

/* ───────────────────────── mobilier, végétation, passants ───────────────────────── */
items.push(bench(-46, -12, { axis: 'y', back: true, len: 20, z: H0, sitters: [{ at: -3.5, top: '#f59e0b', hairStyle: 'long', hair: '#6b4a2f' }] }));
items.push(lamp(-38, 50, { z: H0 }));
items.push(lamp(50, -38, { z: H0 }));
items.push(treeRound(-64, 52, { size: 1.08 }));
items.push(treeCone(56, -64, { size: 1 }));
items.push(bush(-46, 72, { w: 12, d: 12, h: 10 }));
items.push(bush(72, -46, { w: 12, d: 12, h: 10 }));
// passants : on épingle un post-it, on traverse la place vers une allée, on salue (accueil)
// (3,5 unités devant le liège, entre la feuille « à faire » et la colonne de droite : la main levée
//  se projette sur le post-it cyan au lieu de flotter devant la feuille, qu'elle masquait)
items.push(person(5.5, -44.5, { z: H0, facing: 'back-right', pose: 'wave', top: '#0ea5e9', hairStyle: 'bun' }));
items.push(person(50, 6, { z: H0, facing: 'right', pose: 'walk', top: '#7c6bff' }));
items.push(person(12, 52, { z: H0, facing: 'left', pose: 'wave', top: '#ef4444', hair: '#2a1d16' }));

/** Pigeon (minuscule, lisible au zoom) ; s = 1 tourné vers la droite de l'écran, −1 vers la gauche. */
function pigeon(x, y, s = 1, peck = false) {
  const [a, b] = P(x, y, H0);
  let g = `<ellipse cx="${r1(a + 0.5)}" cy="${r1(b + 0.2)}" rx="2.3" ry="0.8" fill="${SHADOW}" fill-opacity="0.14"/>`;
  g += fill(pathS([[a - s * 1.9, b - 1.5], [a - s * 3.6, b - 2.3], [a - s * 3.3, b - 1.1]]), '#6e7891');
  g += `<ellipse cx="${r1(a)}" cy="${r1(b - 1.7)}" rx="2.3" ry="1.35" fill="#a7afc3"/>`;
  g += `<ellipse cx="${r1(a - s * 0.5)}" cy="${r1(b - 1.95)}" rx="1.5" ry="0.8" fill="#8890a8"/>`;
  const hx = a + s * (peck ? 2.5 : 1.9), hy = b - (peck ? 0.9 : 3.1);
  g += dot([hx - s * 0.45, hy + 0.55], 0.85, '#6aa59f') + dot([hx, hy], 0.9, '#8e97ae');
  g += fill(pathS([[hx + s * 0.75, hy - 0.15], [hx + s * 1.55, hy + 0.3], [hx + s * 0.75, hy + 0.4]]), '#f59e0b');
  g += dot([hx + s * 0.25, hy - 0.25], 0.22, '#1d2033');
  return { d: x + y, svg: g };
}
// (à gauche du poteau indicateur : la pointe de la flèche turquoise ne touche plus un pigeon)
items.push(pigeon(10, 34, 1, true), pigeon(16, 31, -1), pigeon(12, 40, -1, true));

/* ───────────────────────── poteau indicateur : de l'accueil, on va partout ───────────────────────── */
{
  const SX = 46, SY = 40, SH = 27.5;
  const NAVY = { lit: '#3f4f93', dark: '#2a376b', top: '#4b5ca5' };
  let s = ellipseEl(SX + 2.2, SY - 2.2, H0, 3, SHADOW, 0.13) + ellipseEl(SX + 0.6, SY - 0.6, H0, 1.9, SHADOW, 0.16);
  s += cube(SX - 1.6, SY - 1.6, H0, SX + 1.6, SY + 1.6, H0 + 1.4, NAVY);
  s += cube(SX - 0.8, SY - 0.8, H0 + 1.4, SX + 0.8, SY + 0.8, H0 + SH, NAVY);
  { const c = P(SX, SY, H0 + SH + 1); s += dot(c, 1.3, '#e0ad3a') + dot([c[0] - 0.35, c[1] - 0.4], 0.6, '#fbe3a0'); }
  const yF = SY + 0.9, xF = SX + 0.9;
  // flèche (u0 → u1 = corps, tip = pointe) sur un plan de façade ; on() = (u, z) → point monde
  const arrow = (on, u0, u1, tip, z0, z1, col, txt) => {
    const zm = (z0 + z1) / 2, k = Math.sign(tip - u0);
    let g = fill(W([[u0, z0], [u1, z0], [tip, zm], [u1, z1], [u0, z1]].map(([u, z]) => on(u, z))), col);
    g += fill(W([[u0, z1 - 0.7], [u1, z1 - 0.7], [u1 + (tip - u1) * 0.2, z1 - 0.1 - (z1 - zm) * 0.2], [u1, z1], [u0, z1]].map(([u, z]) => on(u, z))), '#ffffff', 0.18);
    g += strokeP(W([[u0 + k * 1.4, zm + 0.5], [u0 + k * 1.4 + (u1 - u0) * 0.62, zm + 0.5]].map(([u, z]) => on(u, z)), false) + ' ' +
      W([[u0 + k * 1.4, zm - 0.9], [u0 + k * 1.4 + (u1 - u0) * 0.42, zm - 0.9]].map(([u, z]) => on(u, z)), false), txt, 0.55, 0.9);
    return g;
  };
  // vers l'allée arrière-gauche (−x), l'allée avant-gauche (+y), l'allée avant-droite (+x)
  s += arrow((u, z) => [u, yF, z], SX + 2, SX - 9, SX - 12, H0 + 14.4, H0 + 18.6, '#2bb5a5', '#d6f5f1');
  s += arrow((u, z) => [xF, u, z], SY - 2, SY + 9, SY + 12, H0 + 19.2, H0 + 23.4, shade('#ef8aa0', 0.88), '#fde4ea');
  s += arrow((u, z) => [u, yF, z], SX - 2, SX + 9, SX + 12, H0 + 24, H0 + 28.2 - 0.4, VIOLET, '#e4e0ff');
  items.push({ d: SX + SY, svg: s });
}

/* ───────────────────────── assemblage ───────────────────────── */
const cs = contactShadow(`${ID}-cs`, 118, 62, 204, 304, 0.18);
defs.push(cs.defs);
// Tous les traits du sprite sont arrondis : on porte linecap/linejoin une seule fois sur le groupe racine.
const slim = (s) => s.replace(/ stroke-linecap="round"/g, '').replace(/ stroke-linejoin="round"/g, '');
if (process.env.SIZES) {
  console.log('ground', ground.length, 'plaza', plaza.length, 'defs', defs.join('').length);
  items.forEach((it, i) => console.log('item', i, it.d, slim(it.svg).length));
}
const body = `<g stroke-linecap="round" stroke-linejoin="round">` + slim(cs.el + ground + plaza + compose(items)) + `</g>`;
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// Manifeste : sommet = faîtage du toit du panneau ; hit = place + panneau.
const top = Math.min(P(RX0, RIDGE, ZT + RISE)[1], P(RX0, RY0, ZT)[1]);
const pl = E(0, 0, H0, R);
const left = pl.a - pl.rx, right = pl.a + pl.rx, bottom = P(0, 0, 0)[1] + R * KY;
const man = { id: ID, title: TITLE, labelY: Math.round(top), hit: { x: Math.floor(left - 2), y: Math.floor(top - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - top + 4) } };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
