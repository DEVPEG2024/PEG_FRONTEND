// Village PEG — « Boutique » (réf. « Boutique » de ref.png).
// Toit plat bleu nuit à rebord, cube blanc sur le toit, vitrine ouverte avec portant de
// t-shirts (noir, blanc, violet), enseigne t-shirt violet sur la face +x, store rayé.
//   node buildings/boutique.build.mjs
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, contactShadow, svgDoc, shade, tint } from '../tools/iso.mjs';
import { person, treeCone, bush, bounds } from '../tools/props.mjs';

const ID = 'boutique';
const TITLE = 'Boutique';
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };

/* ───────────── outils de dessin ───────────── */
const defs = [];
let gn = 0;
/** Dégradé linéaire (boîte englobante par défaut, ou coordonnées écran si user). */
function grad(stops, [x1, y1, x2, y2] = [0, 0, 0, 1], user = false) {
  const id = `${ID}-g${++gn}`;
  defs.push(`<linearGradient id="${id}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return `url(#${id})`;
}
/**
 * Dégradé écran (userSpaceOnUse) dont les iso-lignes suivent la direction monde `iso`
 * ([1,0,0] = arêtes horizontales d'une face +y ; [0,1,0] = d'une face +x) : offset 0 au point
 * monde A, 1 au point B. Un dégradé « boîte englobante » sur une face en biais s'étalerait de
 * gauche à droite au lieu de suivre la hauteur.
 */
function gradIso(stops, A, B, iso) {
  const a = P(...A), b = P(...B), o = P(0, 0, 0), q = P(...iso);
  const hl = Math.hypot(q[0] - o[0], q[1] - o[1]), ux = -(q[1] - o[1]) / hl, uy = (q[0] - o[0]) / hl;
  const L = (b[0] - a[0]) * ux + (b[1] - a[1]) * uy;
  return grad(stops, [a[0], a[1], a[0] + L * ux, a[1] + L * uy], true);
}
/** Dégradé vertical sur une face +y (resp. +x), de zTop (offset 0) à zBot (offset 1). */
const gradY = (stops, zTop, zBot, y = 0) => gradIso(stops, [0, y, zTop], [0, y, zBot], [1, 0, 0]);
const gradX = (stops, zTop, zBot, x = 0) => gradIso(stops, [x, 0, zTop], [x, 0, zBot], [0, 1, 0]);
const attrs = (o = {}) => (o.op != null ? ` fill-opacity="${o.op}"` : '') + (o.seam ? ` stroke="${o.seamColor ?? o.fill}" stroke-width="${o.seam}" stroke-linejoin="round"` : '');
/** Face plane (points monde). */
const face = (pts, fill, o = {}) => `<path d="${poly(pts)}" fill="${fill}"${attrs({ ...o, fill })}/>`;
/** Chemin écran quelconque. */
const pathEl = (d, fill, o = {}) => `<path d="${d}" fill="${fill}"${attrs({ ...o, fill })}/>`;
/** Trait (points monde). */
const stroke = (pts, color, w, op) => `<path d="${line(pts)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` stroke-opacity="${op}"` : ''}/>`;
/** Raccourcit les extrémités d'une ligne brisée (points monde) de d unités : pas de bout arrondi qui dépasse d'un angle. */
const trimEnds = (pts, d = 0.7) => {
  const mv = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1; return a.map((v, i) => v + ((b[i] - v) * d) / L); };
  const q = pts.map((p) => [...p]);
  q[0] = mv(q[0], q[1]); q[q.length - 1] = mv(q[q.length - 1], q[q.length - 2]);
  return q;
};
const strokeD = (d, color, w, op) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` stroke-opacity="${op}"` : ''}/>`;
/** Pavé : faces +x, +y, dessus (couleurs ou dégradés). */
const solid = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return `<path d="${b.right}" fill="${c.right}"/><path d="${b.left}" fill="${c.left}"/><path d="${b.top}" fill="${c.top}"/>`; };

// Repères locaux (u vers la droite de l'écran, v vers le haut) sur les plans verticaux.
const planeY = (c) => (u, v) => P(u, c, v);   // face éclairée (+y) : u = x
const planeX = (c) => (u, v) => P(c, -u, v);  // face ombrée (+x) : u = −y
/** Reprojette un chemin local (commandes absolues M L C Z) sur un plan. */
const tp = (d, map) => d.replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, a, b) => { const [X, Y] = map(+a, +b); return r1(X) + ' ' + r1(Y); });
const f = r1;
function rrectL(x0, y0, x1, y1, r) {
  const k = r * 0.4477;
  return `M${f(x0 + r)} ${f(y0)} L${f(x1 - r)} ${f(y0)} C${f(x1 - k)} ${f(y0)} ${f(x1)} ${f(y0 + k)} ${f(x1)} ${f(y0 + r)} L${f(x1)} ${f(y1 - r)} C${f(x1)} ${f(y1 - k)} ${f(x1 - k)} ${f(y1)} ${f(x1 - r)} ${f(y1)} L${f(x0 + r)} ${f(y1)} C${f(x0 + k)} ${f(y1)} ${f(x0)} ${f(y1 - k)} ${f(x0)} ${f(y1 - r)} L${f(x0)} ${f(y0 + r)} C${f(x0)} ${f(y0 + k)} ${f(x0 + k)} ${f(y0)} ${f(x0 + r)} ${f(y0)} Z`;
}
/** Silhouette de t-shirt (repère local, origine = milieu du haut des épaules, v vers le haut). */
function teeL(s = 1) {
  const p = (u, v) => `${f(u * s)} ${f(v * s)}`;
  return `M${p(-2.3, 0.1)} C${p(-1.5, -1.7)} ${p(1.5, -1.7)} ${p(2.3, 0.1)} L${p(4.7, -0.5)} C${p(5.6, -0.9)} ${p(6.6, -1.7)} ${p(7.5, -2.8)} L${p(6.1, -5.4)} L${p(4.5, -4.5)} L${p(4.6, -12.2)} C${p(4.6, -12.6)} ${p(4.4, -12.8)} ${p(4.0, -12.8)} L${p(-4.0, -12.8)} C${p(-4.4, -12.8)} ${p(-4.6, -12.6)} ${p(-4.6, -12.2)} L${p(-4.5, -4.5)} L${p(-6.1, -5.4)} L${p(-7.5, -2.8)} C${p(-6.6, -1.7)} ${p(-5.6, -0.9)} ${p(-4.7, -0.5)} Z`;
}

/** Retire l'ombre portée d'un accessoire posé en hauteur (elle tomberait dans le vide). */
const noShadow = (p) => ({ ...p, svg: p.svg.replace(/^(<path [^>]*fill="#5a4a3a"[^>]*\/>)+/, '') });

/* ───────────── dimensions (monde) ───────────── */
const X0 = -48, X1 = 44, Y0 = -30, Y1 = 28;   // murs extérieurs
const ZG = 2;          // dessus de la terrasse
const ZW = 58;         // haut des murs
const T = 4;           // épaisseur des murs
const ZFL = 5.5;       // plancher de la boutique (une marche)
const XO0 = X0 + 3.5;  // vitrine ouverte : de la poutre d'angle…
const XO1 = X1 - 19;   // … au poteau de droite
const ZO = 48;         // haut de l'ouverture
const OV = 2.6;        // débord du toit
const ZR0 = ZW, ZR1 = ZW + 5; // dalle de toit
const TX0 = X0 - 6, TX1 = X1 + 14, TY0 = Y0 - 6, TY1 = Y1 + 16; // terrasse

const WALL = '#f7f7fb';
const NAVY = '#34427e', NAVY_L = '#3f4f93', NAVY_D = '#2a376b';
const WOOD = '#d9a066', WOOD_SH = '#c08549';
const VIOLET = '#7c6bff';

let out = '';

/* ───────────── sol ───────────── */
const cs = contactShadow(`${ID}-cs`, 138, 64, 207, 306, 0.2);
defs.push(cs.defs);
out += cs.el;

// Terrasse en pierre claire (détache le bâtiment de la dalle beige)
{
  out += solid(TX0, TY0, 0, TX1 - TX0, TY1 - TY0, ZG, { right: '#cfd3e2', left: '#e3e5ef', top: grad([[0, '#f7f7fa'], [1, '#eceef4']]) });
  out += stroke([[TX0, TY1, ZG], [TX1, TY1, ZG], [TX1, TY0, ZG]], '#ffffff', 0.9, 0.9);
  // joints de dallage discrets devant la vitrine et le long de la face +x
  let j = '';
  for (let x = TX0 + 12; x < TX1 - 2; x += 12) j += line([[x, Y1 + 0.8, ZG], [x, TY1, ZG]]) + ' ';
  for (let y = TY0 + 12; y < Y1; y += 12) j += line([[X1 + 0.8, y, ZG], [TX1, y, ZG]]) + ' ';
  out += strokeD(j.trim(), '#dcdfe8', 0.45, 0.9);
}
// Ombre portée du bâtiment (douce, vers la droite de l'écran)
{
  const k = 0.42 * ZW;
  const ring = [[X1 + 0.5, Y1, ZG], [X1 + k, Y1 - k, ZG], [X1 + k, Y0 - k, ZG], [X0 + 8, Y0 - k, ZG], [X0 + 8, Y0, ZG], [X1, Y0, ZG]];
  // dégradé perpendiculaire à la façade +x : dense au pied du mur, nul au bord de l'ombre
  const a = P(X1, (Y0 + Y1) / 2, ZG), L = 0.866 * k;
  out += face(ring, grad([[0, '#5a4a3a', 0.17], [0.5, '#5a4a3a', 0.08], [1, '#5a4a3a', 0]], [a[0], a[1], a[0] + 0.5 * L, a[1] + 0.866 * L], true));
}
const GROUND_END = out.length;

/* ───────────── intérieur de la vitrine ───────────── */
const YB = Y1 - 16;        // cloison du fond de la vitrine
const XI1 = X1 - T;        // mur intérieur droit
// plancher bois clair, lames
out += face([[XO0, YB, ZFL], [XI1, YB, ZFL], [XI1, Y1, ZFL], [XO0, Y1, ZFL]], grad([[0, '#d6b88c'], [1, '#efd8b2']]));
{
  let pl = '';
  for (let y = YB + 3.4; y < Y1; y += 3.4) pl += line([[XO0, y, ZFL], [XI1, y, ZFL]]) + ' ';
  out += strokeD(pl.trim(), '#c8a477', 0.4, 0.55);
}
// cloison du fond (face +y, lavande grisée) et mur intérieur gauche (face +x) : plus sombres
// sous le linteau, éclaircis vers le plancher (seule la partie basse se voit par l'ouverture)
out += face([[XO0, YB, ZFL], [XI1, YB, ZFL], [XI1, YB, ZW], [XO0, YB, ZW]], gradY([[0, '#c3c5dc'], [0.45, '#d3d4e6'], [1, '#e2e2ee']], 34, ZFL, YB));
out += face([[XO0, YB, ZFL], [XO0, Y1, ZFL], [XO0, Y1, ZW], [XO0, YB, ZW]], gradX([[0, '#b4b8cf'], [0.6, '#c6c9db'], [1, '#d3d6e3']], ZO, ZFL, XO0));
out += face([[XO0, YB, ZFL], [XI1, YB, ZFL], [XI1, YB, ZFL + 1.4], [XO0, YB, ZFL + 1.4]], '#b9bdd2');
// ombre portée du portant au sol
out += face([[XO0 + 6, Y1 - 9, ZFL], [XO1 - 2, Y1 - 9, ZFL], [XO1 + 2, Y1 - 13, ZFL], [XO0 + 10, Y1 - 13, ZFL]], '#5a4a3a', { op: 0.08 });

// Portant : barre bleu nuit, deux montants, t-shirts tournés vers la rue
const YR = Y1 - 7, ZRL = 31.6, XRa = XO0 + 3.2, XRb = XO1 - 2.4;
for (const xx of [XRa, XRb]) {
  out += stroke([[xx, YR - 3, ZFL + 0.4], [xx, YR + 3, ZFL + 0.4]], NAVY_D, 1.3);
  out += stroke([[xx, YR, ZFL], [xx, YR, ZRL]], NAVY, 1.2);
}
out += stroke([[XRa - 0.6, YR, ZRL], [XRb + 0.6, YR, ZRL]], '#2e3a6e', 1.35);
out += stroke([[XRa - 0.4, YR, ZRL + 0.4], [XRb + 0.4, YR, ZRL + 0.4]], '#6a78b8', 0.4, 0.9);

const TEES = ['#262a3e', '#f7f7fb', '#7c6bff', '#34427e', '#f7f7fb'];
const TS = 1.5; // taille des t-shirts du portant
const xs = TEES.map((_, i) => XRa + 9.8 + i * ((XRb - XRa - 19.6) / (TEES.length - 1)));
TEES.forEach((c, i) => {
  const white = c === '#f7f7fb';
  const yy = YR + 0.7 + i * 0.45, top = ZRL - 2.6, xc = xs[i];
  const m = planeY(yy);
  const map = (u, v) => m(xc + u * TS, top + v * TS);
  const dark = white ? '#d3d6e4' : shade(c, 0.78);
  // cintre (crochet sur la barre + épaules)
  out += strokeD(tp(`M0 1.95 C0.75 1.95 0.75 2.75 0.05 2.85 M0 1.95 L0 1.2 M-4.4 -0.25 L0 1.2 L4.4 -0.25`, map), '#a3aabb', 0.45);
  out += pathEl(tp(teeL(1), map), c, { seam: 0.3, seamColor: white ? '#d6d9e5' : c });
  // dos visible dans l'encolure
  out += pathEl(tp(`M-2.3 0.1 C-1.5 0.75 1.5 0.75 2.3 0.1 C1.5 -1.7 -1.5 -1.7 -2.3 0.1 Z`, map), shade(c, white ? 0.84 : 0.66));
  // ombre de pli à droite, coutures d'emmanchure, reflet doux à gauche
  out += pathEl(tp(`M2.5 -4.6 L4.5 -4.5 L4.6 -12.2 C4.6 -12.6 4.4 -12.8 4.0 -12.8 L2.8 -12.8 Z`, map), dark, { op: 0.6 });
  out += strokeD(tp(`M-4.45 -4.5 L-5.9 -5.3 M4.45 -4.5 L5.9 -5.3`, map), dark, 0.35, 0.9);
  if (!white) out += pathEl(tp(`M-4.2 -1 L-2.4 -1.4 L-2.7 -11.9 L-4.2 -11.9 Z`, map), '#ffffff', { op: 0.1 });
  // ourlet
  out += strokeD(tp(`M-4.3 -11.9 L4.3 -11.9`, map), dark, 0.3, 0.8);
});

/* ───────────── murs ───────────── */
// Face +x (ombrée), légèrement plus claire en haut
out += face([[X1, Y0, ZG], [X1, Y1, ZG], [X1, Y1, ZW], [X1, Y0, ZW]], gradX([[0, '#e7e9f2'], [1, '#d7dae7']], ZW, ZG, X1), { seam: 0.4, seamColor: '#dfe2ee' });
// Face +y (éclairée) : bandeau haut, trumeau d'angle — un seul dégradé pour les deux (pas de raccord)
const wallL = gradY([[0, '#ffffff'], [1, '#eff0f6']], ZW, ZG, Y1);
out += face([[X0, Y1, ZO], [X1, Y1, ZO], [X1, Y1, ZW], [X0, Y1, ZW]], wallL, { seam: 0.3, seamColor: WALL });
out += face([[XO1 + 3.5, Y1, ZG], [X1, Y1, ZG], [X1, Y1, ZO + 0.2], [XO1 + 3.5, Y1, ZO + 0.2]], wallL, { seam: 0.3, seamColor: WALL });
// arête verticale d'angle adoucie
out += stroke([[X1, Y1, ZG + 5.5], [X1, Y1, ZW - 0.5]], '#ffffff', 0.9, 0.95);
// poutre d'angle en bois (avec son tableau) et poteau de droite
out += face([[XO0, Y1 - T, ZFL], [XO0, Y1, ZFL], [XO0, Y1, ZO], [XO0, Y1 - T, ZO]], WOOD_SH);
out += face([[X0, Y1, ZG], [XO0, Y1, ZG], [XO0, Y1, ZO], [X0, Y1, ZO]], grad([[0, '#e2ad74'], [1, WOOD]]));
out += stroke([[X0 + 0.45, Y1, ZG + 0.6], [X0 + 0.45, Y1, ZO]], '#f0c793', 0.55, 0.95);
out += face([[XO1, Y1, ZG], [XO1 + 3.5, Y1, ZG], [XO1 + 3.5, Y1, ZO], [XO1, Y1, ZO]], grad([[0, '#e2ad74'], [1, WOOD]]));
out += stroke([[XO1 + 0.45, Y1, ZG + 0.6], [XO1 + 0.45, Y1, ZO]], '#f0c793', 0.55, 0.95);
// linteau : ombre douce dans le haut de l'ouverture (la plus dense contre le linteau)
out += face([[XO0, Y1, ZO - 3], [XO1, Y1, ZO - 3], [XO1, Y1, ZO], [XO0, Y1, ZO]], gradY([[0, NAVY_D, 0.16], [1, NAVY_D, 0]], ZO, ZO - 3, Y1));
// marche / seuil de la vitrine
out += face([[XO0, Y1, ZG], [XO1, Y1, ZG], [XO1, Y1, ZFL], [XO0, Y1, ZFL]], '#e3e5ef');
out += stroke([[XO0, Y1, ZFL], [XO1, Y1, ZFL]], '#ffffff', 0.75, 0.95);
// soubassement (face +x et trumeau), dessus éclairci
{
  const zp = ZG + 5.5, e = 0.7;
  out += face([[X1 + e, Y0, ZG], [X1 + e, Y1 + e, ZG], [X1 + e, Y1 + e, zp], [X1 + e, Y0, zp]], '#cfd3e2');
  out += face([[XO1 + 3.5, Y1 + e, ZG], [X1 + e, Y1 + e, ZG], [X1 + e, Y1 + e, zp], [XO1 + 3.5, Y1 + e, zp]], '#e3e5ef');
  out += face([[XO1 + 3.5, Y1, zp], [X1, Y1, zp], [X1 + e, Y1 + e, zp], [XO1 + 3.5, Y1 + e, zp]], '#f4f5f9');
  out += face([[X1, Y0, zp], [X1 + e, Y0, zp], [X1 + e, Y1 + e, zp], [X1, Y1, zp]], '#e8eaf1');
}
// Ombre du débord de toit sur le haut des murs : la dalle cache les murs au-dessus de
// ZR0 − OV (projection de son arête basse) ; l'ombre part de là et s'estompe vers le bas.
{
  const zv = ZR0 - OV + 0.3;
  out += face([[X1, Y0, ZW - 8], [X1, Y1, ZW - 8], [X1, Y1, ZW], [X1, Y0, ZW]], gradX([[0, NAVY, 0.17], [0.45, NAVY, 0.07], [1, NAVY, 0]], zv, zv - 6, X1));
  out += face([[X0, Y1, ZW - 8], [X1, Y1, ZW - 8], [X1, Y1, ZW], [X0, Y1, ZW]], gradY([[0, NAVY, 0.12], [0.45, NAVY, 0.05], [1, NAVY, 0]], zv, zv - 5, Y1));
}

/* ───────────── enseigne t-shirt (face +x) ───────────── */
{
  const yc = -1, zc = 31, hw = 16.5, hh = 16.5, rr = 2.8;
  const mWall = planeX(X1), mFront = planeX(X1 + 1.1);
  const shadowMap = (u, v) => mWall(u + 1.6, v - 1.1);
  const panel = rrectL(-yc - hw, zc - hh, -yc + hw, zc + hh, rr);
  out += pathEl(tp(panel, shadowMap), '#3a3550', { op: 0.13 });
  out += pathEl(tp(panel, mWall), '#ffffff');
  out += pathEl(tp(panel, mFront), gradX([[0, '#fafbfd'], [1, '#e8eaf2']], zc + hh, zc - hh, X1 + 1.1));
  out += strokeD(tp(rrectL(-yc - hw + 2, zc - hh + 2, -yc + hw - 2, zc + hh - 2, rr * 0.6), mFront), '#d9dcea', 0.45, 0.9);
  // t-shirt violet, légèrement ombré (face +x)
  const s = 1.92;
  const tm = (u, v) => mFront(-yc + u * s, zc + 12.4 + v * s);
  out += pathEl(tp(teeL(1), tm), '#7262f0');
  out += pathEl(tp(`M-2.3 0.1 C-1.5 0.75 1.5 0.75 2.3 0.1 C1.5 -1.7 -1.5 -1.7 -2.3 0.1 Z`, tm), '#5545cf');
  out += pathEl(tp(`M-4.4 -1 L-2.3 -1.5 L-2.6 -11.9 L-4.4 -11.9 Z`, tm), '#a397ff', { op: 0.42 });
  out += pathEl(tp(`M2.4 -4.6 L4.5 -4.5 L4.6 -12.2 C4.6 -12.6 4.4 -12.8 4.0 -12.8 L2.6 -12.8 Z`, tm), '#4a3cbd', { op: 0.38 });
  out += strokeD(tp(`M-4.45 -4.5 L-5.9 -5.3 M4.45 -4.5 L5.9 -5.3`, tm), '#5545cf', 0.4, 0.9);
}

/* ───────────── lanterne murale (face +x, côté arrière, comme la référence) ───────────── */
{
  const ly = Y0 + 8, lz = 44, ax = X1 + 5.2;
  // platine et potence bleu nuit
  out += face([[X1 + 0.05, ly - 1.4, lz + 1], [X1 + 0.05, ly + 1.4, lz + 1], [X1 + 0.05, ly + 1.4, lz + 5.4], [X1 + 0.05, ly - 1.4, lz + 5.4]], '#2a376b');
  out += stroke([[X1, ly, lz + 4], [ax, ly, lz + 4]], '#2e3a6e', 0.9);
  out += stroke([[X1, ly, lz + 1.6], [ax - 2.2, ly, lz + 4]], '#2e3a6e', 0.55);
  out += stroke([[ax, ly, lz + 4], [ax, ly, lz + 2.4]], '#2e3a6e', 0.5);
  // lanterne : chapeau, verre chaud, fond
  const lx0 = ax - 1.5, ly0 = ly - 1.5;
  out += solid(lx0 - 0.2, ly0 - 0.2, lz - 3.6, 3.4, 3.4, 0.8, { right: '#2a376b', left: '#3f4f93', top: '#4b5ca5' });
  out += solid(lx0, ly0, lz - 2.8, 3, 3, 4.4, { right: '#f6cf6a', left: '#fff3c8', top: '#fff8dc' });
  out += stroke([[lx0 + 1.5, ly0 + 3, lz - 2.6], [lx0 + 1.5, ly0 + 3, lz + 1.4]], '#2e3a6e', 0.3, 0.7);
  out += solid(lx0 - 0.4, ly0 - 0.4, lz + 1.6, 3.8, 3.8, 0.9, { right: '#2a376b', left: '#3f4f93', top: '#4b5ca5' });
  out += solid(lx0 + 0.9, ly0 + 0.9, lz + 2.5, 1.2, 1.2, 0.8, { right: '#2a376b', left: '#3f4f93', top: '#5566b0' });
  const g = P(ax, ly, lz - 0.6);
  out += `<circle cx="${r1(g[0])}" cy="${r1(g[1])}" r="6.5" fill="#ffe9a8" fill-opacity="0.14"/><circle cx="${r1(g[0])}" cy="${r1(g[1])}" r="4" fill="#fff4cc" fill-opacity="0.2"/>`;
}

/* ───────────── store rayé (au-dessus de la vitrine) ───────────── */
{
  const za = ZW - 6.6, zb = za - 4.2, dy = 5.2, xa = X0 + 1, xb = XO1 + 4, n = 11;
  const valH = 2.5;
  // ombre du store sur le bandeau : la plus dense sous la fixation, estompée vers le bas
  out += face([[xa, Y1, zb - 5], [xb, Y1, zb - 5], [xb, Y1, za], [xa, Y1, za]], gradY([[0, '#2a2f55', 0.18], [1, '#2a2f55', 0]], za, zb - 5, Y1));
  const wS = (xb - xa) / n;
  for (let i = 0; i < n; i++) {
    const x0 = xa + i * wS, x1 = x0 + wS, vio = i % 2 === 0;
    // pente du store (dessus : plus clair en haut)
    out += face([[x0, Y1, za], [x1, Y1, za], [x1, Y1 + dy, zb], [x0, Y1 + dy, zb]], vio ? grad([[0, '#9b8fff'], [1, '#8576ff']]) : grad([[0, '#ffffff'], [1, '#f1f1f8']]), { seam: 0.25, seamColor: vio ? '#8b7dff' : '#f7f7fb' });
    // lambrequin festonné
    const bot = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; bot.push([x1 - t * wS, Y1 + dy, zb - valH + 1.2 - 1.2 * Math.sin(Math.PI * t)]); }
    out += face([[x0, Y1 + dy, zb], [x1, Y1 + dy, zb], ...bot], vio ? VIOLET : '#f7f7fb', { seam: 0.2 });
  }
  out += stroke([[xa, Y1 + dy, zb], [xb, Y1 + dy, zb]], '#ffffff', 0.5, 0.65);
  out += stroke([[xa, Y1, za], [xb, Y1, za]], '#2a2f55', 0.6, 0.18);
  // joue latérale droite (face +x, ombrée)
  out += face([[xb, Y1, za], [xb, Y1 + dy, zb], [xb, Y1 + dy, zb - valH + 0.6], [xb, Y1 + 0.4, zb - 0.6]], '#d6d9e8');
  out += face([[xb, Y1 + dy * 0.5, (za + zb) / 2], [xb, Y1 + dy, zb], [xb, Y1 + dy, zb - valH + 0.6], [xb, Y1 + dy * 0.5, zb - 1.5]], '#6556d8');
}

/* ───────────── toit plat ───────────── */
{
  const x0 = X0 - OV, x1 = X1 + OV, y0 = Y0 - OV, y1 = Y1 + OV;
  const b = box(x0, y0, ZR0, x1 - x0, y1 - y0, ZR1 - ZR0);
  out += `<path d="${b.right}" fill="${NAVY_D}" stroke="${NAVY_D}" stroke-width="0.3"/>`;
  out += `<path d="${b.left}" fill="${gradY([[0, '#3e4d8e'], [1, NAVY]], ZR1, ZR0, y1)}"/>`;
  out += `<path d="${b.top}" fill="${NAVY_L}"/>`;
  // champ intérieur en creux derrière un petit acrotère
  const i = 3, zf = ZR1 - 1.1;
  const [ax, ay] = P(x0 + i, y1 - i, zf), [bx, by] = P(x1 - i, y0 + i, zf);
  out += face([[x0 + i, y0 + i, zf], [x1 - i, y0 + i, zf], [x1 - i, y1 - i, zf], [x0 + i, y1 - i, zf]], grad([[0, '#3d4c8e'], [1, '#33417c']], [ax, ay, bx, by], true));
  out += face([[x0 + i, y0 + i, zf], [x1 - i, y0 + i, zf], [x1 - i, y0 + i, ZR1], [x0 + i, y0 + i, ZR1]], '#4c5ca3');
  out += face([[x0 + i, y0 + i, zf], [x0 + i, y1 - i, zf], [x0 + i, y1 - i, ZR1], [x0 + i, y0 + i, ZR1]], '#3a4989');
  // liserés clairs (arêtes du rebord)
  out += stroke(trimEnds([[x0, y1, ZR1], [x1, y1, ZR1], [x1, y0, ZR1]]), tint(NAVY, 0.5), 1.2, 0.95);
  out += stroke(trimEnds([[x0, y1, ZR0 + 0.25], [x1, y1, ZR0 + 0.25]], 0.5), tint(NAVY, 0.25), 0.6, 0.55);
  out += stroke([[x0 + i, y1 - i, ZR1 - 0.05], [x1 - i, y1 - i, ZR1 - 0.05], [x1 - i, y0 + i, ZR1 - 0.05]], tint(NAVY, 0.3), 0.6, 0.65);

  // cube blanc sur le toit (lanterneau vitré)
  const cx0 = -24, cy0 = -22, cw = 18, cd = 18, ch = 12, cz = zf;
  const k = 0.45 * ch;
  out += face([[cx0 + cw, cy0, cz], [cx0 + cw + k, cy0 - k, cz], [cx0 + cw + k, cy0 + cd - k, cz], [cx0 + cw, cy0 + cd, cz]], '#1d2550', { op: 0.22 });
  out += solid(cx0, cy0, cz, cw, cd, ch, { right: gradX([[0, '#e6e9f2'], [1, '#d3d7e5']], cz + ch, cz, cx0 + cw), left: gradY([[0, '#ffffff'], [1, '#eff0f6']], cz + ch, cz, cy0 + cd), top: '#ffffff' });
  const g = 2.6, zt = cz + ch;
  out += face([[cx0 + g, cy0 + g, zt], [cx0 + cw - g, cy0 + g, zt], [cx0 + cw - g, cy0 + cd - g, zt], [cx0 + g, cy0 + cd - g, zt]], grad([[0, '#b9c9ea'], [1, '#e3eaf7']]));
  out += face([[cx0 + g + 2, cy0 + cd - g, zt], [cx0 + g + 6, cy0 + cd - g, zt], [cx0 + g + 11, cy0 + g, zt], [cx0 + g + 7, cy0 + g, zt]], '#ffffff', { op: 0.45 });
  out += stroke(trimEnds([[cx0, cy0 + cd, zt], [cx0 + cw, cy0 + cd, zt], [cx0 + cw, cy0, zt]], 0.5), '#ffffff', 0.9, 0.95);
  out += stroke([[cx0 + cw, cy0 + cd, cz + 0.4], [cx0 + cw, cy0 + cd, zt - 0.4]], '#ffffff', 0.7, 0.8);
}

/* ───────────── accessoires ───────────── */
const props = [];
// jardinière blanche le long de la face +x, cubes de buis
{
  const px0 = X1 + 2.6, px1 = X1 + 11.5, py0 = -20, py1 = 25, ph = 4.8;
  let g = solid(px0, py0, ZG, px1 - px0, py1 - py0, ph, { right: '#dcdfeb', left: '#f4f5f9', top: '#ffffff' });
  g += face([[px0 + 1.2, py0 + 1.2, ZG + ph], [px1 - 1.2, py0 + 1.2, ZG + ph], [px1 - 1.2, py1 - 1.2, ZG + ph], [px0 + 1.2, py1 - 1.2, ZG + ph]], '#8f6a48');
  const ys = [19.6, 8.6, -2.4, -13.4];
  const hs = [9.5, 8.4, 9.2, 8.4];
  g += ys.map((y, i) => noShadow(bush((px0 + px1) / 2, y, { w: 8.6, d: 9.2, h: hs[i], z: ZG + ph - 0.6 }))).sort((a, b2) => a.d - b2.d).map((q) => q.svg).join('');
  props.push({ d: (px0 + px1) / 2 + (py0 + py1) / 2, svg: g });
}
// buis colonne à l'arrière droite
props.push(bush(X1 + 7, -27, { w: 8.4, d: 8.4, h: 26, z: ZG }));
// cyprès
props.push(treeCone(-72, 34, { size: 1.02 }));
props.push(treeCone(66, -40, { size: 0.98 }));
// buis taillé à deux étages, devant à gauche
{
  const a = bush(-44, 56, { w: 12.5, d: 12.5, h: 9.5 });
  const b = noShadow(bush(-44, 56, { w: 7.5, d: 7.5, h: 7, z: 9.5 }));
  props.push({ d: a.d, svg: a.svg + b.svg });
}
// cliente qui sort avec son sac rose
{
  const px = 6, py = 54;
  const p = person(px, py, { facing: 'left', pose: 'walk', top: '#0ea5e9', hairStyle: 'bun', pants: '#2b2f45' });
  const hx = px + 3.4, hy = py + 2.2;
  const bx0 = hx - 1.1, by0 = hy - 3.2, bw = 2.2, bd = 6.4, bz = 3.6, bh = 7.6;
  let bag = solid(bx0, by0, bz, bw, bd, bh, { right: '#d43f86', left: '#ec5fa0', top: '#a62c66' });
  bag += stroke([[hx, hy - 1.6, bz + bh], [hx + 0.2, hy, bz + bh + 2.6], [hx, hy + 1.6, bz + bh]], '#a62c66', 0.45);
  bag += face([[bx0 + bw, by0 + 2, bz + 3.2], [bx0 + bw, by0 + 4.4, bz + 3.2], [bx0 + bw, by0 + 4.4, bz + 5.4], [bx0 + bw, by0 + 2, bz + 5.4]], '#ffffff', { op: 0.85 });
  props.push({ d: p.d, svg: p.svg + bag });
}
// Ordre du peintre : chaque accessoire est hors de l'emprise du bâtiment ; ceux marqués back
// (côtés −x / −y) passent avant lui, les autres après, triés entre eux par d = x + y.
props.sort((a, b) => a.d - b.d);
const behind = props.filter((p) => p.back).map((p) => p.svg).join('');
const front = props.filter((p) => !p.back).map((p) => p.svg).join('');
const body = out.slice(0, GROUND_END) + behind + out.slice(GROUND_END) + front;

writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svgDoc({ title: TITLE, defs: defs.join(''), body }));

/* ───────────── manifeste ───────────── */
const top = P(X0 - OV, Y0 - OV, ZR1)[1];
const left = P(X0 - OV, Y1 + OV, 0)[0], right = P(X1 + OV, Y0 - OV, 0)[0];
const bottom = P(X1, Y1, 0)[1];
const man = {
  id: ID, title: TITLE, labelY: Math.round(top),
  hit: { x: Math.floor(left - 2), y: Math.floor(top - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - top + 4) },
};
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man) + '\n');
console.log('ok', ID, man, 'bounds', bounds(body));
