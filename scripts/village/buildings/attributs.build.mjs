// Village PEG — « Attributs » : la mercerie (tailles, couleurs, formulaires, checklists).
// Petite boutique à toit rose deux pans, enseigne bobine de fil violet PEG (face +x), nuancier en
// éventail sur la façade, étiquettes S·M·L (blanches à liseré bleu nuit) et mannequin de couture
// en vitrine, mètre ruban en frise, chevalet « checklist » devant la porte.
//   node buildings/attributs.build.mjs
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, flowerBed, pottedPlant, bush, bounds } from '../tools/props.mjs';

const ID = 'attributs';
const TITLE = 'Attributs';
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };

/* ───────────── outils de dessin ───────────── */
const defs = [];
let gn = 0;
function grad(stops, [x1, y1, x2, y2] = [0, 0, 0, 1], user = false) {
  const id = `${ID}-g${++gn}`;
  defs.push(`<linearGradient id="${id}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return `url(#${id})`;
}
/**
 * Dégradé écran (userSpaceOnUse) dont les iso-lignes suivent la direction monde `iso`
 * ([1,0,0] = arêtes horizontales d'une face +y ; [0,1,0] = d'une face +x ; ou la pente d'une
 * rive) : offset 0 au point monde A, 1 au point B. Un dégradé « boîte englobante » sur une face
 * en biais s'étalerait de gauche à droite au lieu de suivre la hauteur.
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
const face = (pts, fill, o = {}) => `<path d="${poly(pts)}" fill="${fill}"${attrs({ ...o, fill })}/>`;
const pathEl = (d, fill, o = {}) => `<path d="${d}" fill="${fill}"${attrs({ ...o, fill })}/>`;
const stroke = (pts, color, w, op) => `<path d="${line(pts)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` stroke-opacity="${op}"` : ''}/>`;
/** Raccourcit les extrémités d'une ligne brisée (points monde) de d unités : pas de bout arrondi qui dépasse d'un angle. */
const trimEnds = (pts, d = 0.7) => {
  const mv = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1; return a.map((v, i) => v + ((b[i] - v) * d) / L); };
  const q = pts.map((p) => [...p]);
  q[0] = mv(q[0], q[1]); q[q.length - 1] = mv(q[q.length - 1], q[q.length - 2]);
  return q;
};
const strokeD = (d, color, w, op) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` stroke-opacity="${op}"` : ''}/>`;
const solid = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return `<path d="${b.right}" fill="${c.right}"/><path d="${b.left}" fill="${c.left}"/><path d="${b.top}" fill="${c.top}"/>`; };

const planeY = (c) => (u, v) => P(u, c, v);   // face éclairée (+y) : u = x
const planeX = (c) => (u, v) => P(c, -u, v);  // face ombrée (+x) : u = −y
const tp = (d, map) => d.replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, a, b) => { const [X, Y] = map(+a, +b); return r1(X) + ' ' + r1(Y); });
const f = r1;
function rrectL(x0, y0, x1, y1, r) {
  const k = r * 0.4477;
  return `M${f(x0 + r)} ${f(y0)} L${f(x1 - r)} ${f(y0)} C${f(x1 - k)} ${f(y0)} ${f(x1)} ${f(y0 + k)} ${f(x1)} ${f(y0 + r)} L${f(x1)} ${f(y1 - r)} C${f(x1)} ${f(y1 - k)} ${f(x1 - k)} ${f(y1)} ${f(x1 - r)} ${f(y1)} L${f(x0 + r)} ${f(y1)} C${f(x0 + k)} ${f(y1)} ${f(x0)} ${f(y1 - k)} ${f(x0)} ${f(y1 - r)} L${f(x0)} ${f(y0 + r)} C${f(x0)} ${f(y0 + k)} ${f(x0 + k)} ${f(y0)} ${f(x0 + r)} ${f(y0)} Z`;
}
const circleL = (cx, cy, r) => { const k = 0.5523 * r; return `M${f(cx + r)} ${f(cy)} C${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} C${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} C${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} C${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} Z`; };
/** Ovale en coordonnées locales fines (normalisées 0…1) : 4 décimales, pas l'arrondi au dixième de f. */
const ovalL = (cx, cy, rx, ry) => {
  const g = (n) => String(Math.round(n * 1e4) / 1e4), kx = 0.5523 * rx, ky = 0.5523 * ry;
  return `M${g(cx + rx)} ${g(cy)} C${g(cx + rx)} ${g(cy + ky)} ${g(cx + kx)} ${g(cy + ry)} ${g(cx)} ${g(cy + ry)} C${g(cx - kx)} ${g(cy + ry)} ${g(cx - rx)} ${g(cy + ky)} ${g(cx - rx)} ${g(cy)} C${g(cx - rx)} ${g(cy - ky)} ${g(cx - kx)} ${g(cy - ry)} ${g(cx)} ${g(cy - ry)} C${g(cx + kx)} ${g(cy - ry)} ${g(cx + rx)} ${g(cy - ky)} ${g(cx + rx)} ${g(cy)} Z`;
};
/** Rectangle local tourné de a degrés autour de (px, py) : points [u, v]. */
const rot = (px, py, a) => { const c = Math.cos(a), s = Math.sin(a); return (u, v) => [px + u * c - v * s, py + u * s + v * c]; };
const polyL = (pts) => 'M' + pts.map(([u, v]) => f(u) + ' ' + f(v)).join(' L') + ' Z';

/* ───────────── dimensions (monde) ───────────── */
const X0 = -50, X1 = 42, Y0 = -28, Y1 = 26;   // murs
const ZG = 2;              // dessus du trottoir
const ZW = 54;             // haut des murs (sous l'avant-toit)
const OV = 4;              // débords du toit
const YM = (Y0 + Y1) / 2;  // faîtage
const RISE = 22;           // hauteur du faîtage au-dessus des murs
const SLOPE = RISE / ((Y1 - Y0) / 2);
const ZE = ZW - SLOPE * OV;    // bas de l'avant-toit
const ZRG = ZW + RISE;         // faîtage
const TH = 2.6;                // épaisseur de la couverture
const TX0 = X0 - 5, TX1 = X1 + 13, TY0 = Y0 - 5, TY1 = Y1 + 15; // trottoir

const PINK = '#ef8aa0', PINK_D = '#e06f88';
const NAVY = '#2e3a6e';
const GOLD = '#f6c95c';

let out = '';

/* ───────────── sol ───────────── */
const cs = contactShadow(`${ID}-cs`, 138, 64, 206, 306, 0.2);
defs.push(cs.defs);
out += cs.el;
{
  out += solid(TX0, TY0, 0, TX1 - TX0, TY1 - TY0, ZG, { right: '#cfd3e2', left: '#e3e5ef', top: grad([[0, '#f7f7fa'], [1, '#eceef4']]) });
  out += stroke([[TX0, TY1, ZG], [TX1, TY1, ZG], [TX1, TY0, ZG]], '#ffffff', 0.9, 0.9);
  let j = '';
  for (let x = TX0 + 11; x < TX1 - 2; x += 11) j += line([[x, Y1 + 0.8, ZG], [x, TY1, ZG]]) + ' ';
  for (let y = TY0 + 11; y < Y1; y += 11) j += line([[X1 + 0.8, y, ZG], [TX1, y, ZG]]) + ' ';
  out += strokeD(j.trim(), '#dcdfe8', 0.45, 0.9);
}
// ombre portée du bâtiment vers la droite
{
  const k = 0.42 * (ZW + RISE * 0.5);
  const ring = [[X1 + 0.5, Y1, ZG], [X1 + k, Y1 - k, ZG], [X1 + k, Y0 - k, ZG], [X0 + 8, Y0 - k, ZG], [X0 + 8, Y0, ZG], [X1, Y0, ZG]];
  // dégradé perpendiculaire à la façade +x : dense au pied du mur, nul au bord de l'ombre
  const a = P(X1, (Y0 + Y1) / 2, ZG), L = 0.866 * k;
  out += face(ring, grad([[0, '#5a4a3a', 0.17], [0.5, '#5a4a3a', 0.08], [1, '#5a4a3a', 0]], [a[0], a[1], a[0] + 0.5 * L, a[1] + 0.866 * L], true));
}
const GROUND_END = out.length;

/* ───────────── vitrine : intérieur ───────────── */
const WX0 = -18, WX1 = 17, WZ0 = 12, WZ1 = 35; // ouverture de la vitrine (face +y)
const DX0 = 23, DX1 = 35, DZ1 = 34;             // porte
const YIN = Y1 - 11;                               // mur du fond intérieur
{
  // sol, fond rose pâle, côté gauche
  out += face([[WX0 - 2, YIN, ZG + 1], [WX1 + 2, YIN, ZG + 1], [WX1 + 2, Y1, ZG + 1], [WX0 - 2, Y1, ZG + 1]], '#e9d6c4');
  out += face([[WX0 - 2, YIN, ZG + 1], [WX1 + 2, YIN, ZG + 1], [WX1 + 2, YIN, ZW], [WX0 - 2, YIN, ZW]], gradY([[0, '#f9eef1'], [1, '#f0dbe2']], WZ1, ZG + 1, YIN));
  out += face([[WX0 - 2, YIN, ZG + 1], [WX0 - 2, Y1, ZG + 1], [WX0 - 2, Y1, ZW], [WX0 - 2, YIN, ZW]], '#e3ccd4');
  // étagère murale de bobines
  for (const [zs, cols] of [[17, ['#7c6bff', '#ef8aa0', '#f6c95c', '#2bb5a5', '#22c3e6', '#e98a62', '#34427e', '#d9467a']], [10.5, ['#2bb5a5', '#f6c95c', '#d9467a', '#7c6bff', '#e98a62', '#22c3e6', '#ef8aa0', '#3f4f93']]]) {
    out += solid(WX0 - 1, YIN, zs - 1, WX1 - WX0 + 2, 3.6, 1, { right: '#e6e0e6', left: '#ffffff', top: '#f6f2f4' });
    cols.forEach((c, i) => {
      const x = WX0 + 1.6 + i * ((WX1 - WX0 - 3.2) / (cols.length - 1)), y = YIN + 1.8;
      const [a, b] = P(x, y, zs), rx = 1.25 * 1.2247, ry = 1.25 * 0.7071;
      out += `<path d="M${r1(a - rx)} ${r1(b - 3)} L${r1(a - rx)} ${r1(b)} A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(a + rx)} ${r1(b)} L${r1(a + rx)} ${r1(b - 3)} Z" fill="${c}"/>`;
      out += `<path d="M${r1(a + rx * 0.2)} ${r1(b - 3)} L${r1(a + rx)} ${r1(b - 3)} L${r1(a + rx)} ${r1(b)} A${r1(rx)} ${r1(ry)} 0 0 1 ${r1(a + rx * 0.2)} ${r1(b + ry * 0.98)} Z" fill="#000" fill-opacity="0.14"/>`;
      out += `<ellipse cx="${r1(a)}" cy="${r1(b - 3)}" rx="${r1(rx * 1.18)}" ry="${r1(ry * 1.18)}" fill="#e8c9a0"/><ellipse cx="${r1(a)}" cy="${r1(b - 3)}" rx="${r1(rx * 0.32)}" ry="${r1(ry * 0.32)}" fill="#a4774c"/>`;
      out += `<ellipse cx="${r1(a)}" cy="${r1(b + 0.1)}" rx="${r1(rx * 1.18)}" ry="${r1(ry * 1.18)}" fill="#d8b384" fill-opacity="0.9"/>`;
    });
  }
}
// mannequin de couture avec mètre ruban au cou (à gauche dans la vitrine)
{
  const xm = WX0 + 7, ym = Y1 - 5;
  const m = planeY(ym), map = (u, v) => m(xm + u * 1.08, 2.4 + v * 1.08);
  out += strokeD(tp(`M0 4 L0 13`, map), '#8b6a4a', 0.9);
  out += strokeD(tp(`M-3 3.6 L0 4.6 L3 3.6`, map), '#8b6a4a', 0.8);
  out += pathEl(tp(`M-1.2 27 C-1.2 28.2 1.2 28.2 1.2 27 L1.2 26 C3.4 25.8 4.8 25.2 5 23.6 C5.2 21.6 4.2 20.4 3.6 19.4 C3.2 18.4 3.4 17.4 4.4 16.2 C5.2 15 5 13.6 4.4 12.6 L-4.4 12.6 C-5 13.6 -5.2 15 -4.4 16.2 C-3.4 17.4 -3.2 18.4 -3.6 19.4 C-4.2 20.4 -5.2 21.6 -5 23.6 C-4.8 25.2 -3.4 25.8 -1.2 26 Z`, map), '#3f4f93');
  out += pathEl(tp(`M1.2 26 C3.4 25.8 4.8 25.2 5 23.6 C5.2 21.6 4.2 20.4 3.6 19.4 C3.2 18.4 3.4 17.4 4.4 16.2 C5.2 15 5 13.6 4.4 12.6 L2.2 12.6 C2.8 14.6 2.4 16.4 1.8 17.6 C1.4 18.8 1.8 20.6 2.4 22 C2.8 23.6 2.4 25 1.2 26 Z`, map), '#2a376b', { op: 0.8 });
  out += strokeD(tp(`M-4.4 12.6 L4.4 12.6`, map), '#26305e', 0.5);
  out += pathEl(tp(`M-3.6 24.4 C-4.2 22.6 -3.4 21 -2.6 20.2 C-2.2 21.6 -2.4 23.2 -3.6 24.4 Z`, map), '#ffffff', { op: 0.22 });
  // mètre ruban jaune drapé
  out += strokeD(tp(`M-2.6 25.4 C-3.2 22 -3.4 19 -3.0 15.6 M2.6 25.4 C3.4 23.4 3.8 21.4 3.6 18.4`, map), GOLD, 0.9);
  out += strokeD(tp(`M-1.8 25.9 C-0.6 26.6 0.6 26.6 1.8 25.9`, map), GOLD, 0.9);
}
// étiquettes S · M · L suspendues derrière la vitre — ×1,5 (presque invisibles dans la scène) et
// blanches à liseré bleu nuit (le blanc seul se perdait sur le fond rose pâle).
// Positions en coordonnées « vitre » (x', z') : un point à D unités derrière la vitre paraît
// décalé de +D en x et en z. Trois étiquettes de cette taille ne tiennent pas côte à côte dans le
// carreau droit sans se masquer (partie visible : x' ∈ [−0,9 ; 16,7] entre meneau et montant, soit
// 17,6 pour 17,5 d'étiquettes S + L liserés compris) : S et L en haut, sous le petit bois remonté
// pour elles ; L, plus près de la vitre, recouvre 1 unité de la marge vierge de S (lettre S à
// 0,95 de là) → 0,55 de jour côté meneau et côté montant. M pend plus bas entre elles, plus au
// fond (dessinée d'abord) : S et L ne couvrent que son haut vierge, jamais une lettre (bas de L,
// liseré compris, à z' 19,8 ; haut de la lettre M à 19,4).
{
  const tags = [
    { L: 'M', xc: 7.45, top: 22.3, w: 7.8, h: 9.9, D: 2.8 },
    { L: 'S', xc: 3.575, top: 30.9, w: 6.9, h: 8.7, D: 2.4 },
    { L: 'L', xc: 11.325, top: 31.35, w: 8.7, h: 11.1, D: 2.0 },
  ];
  const shape = `M-0.5 0.78 L-0.22 1 L0.22 1 L0.5 0.78 L0.5 0.05 C0.5 0.02 0.48 0 0.45 0 L-0.45 0 C-0.48 0 -0.5 0.02 -0.5 0.05 Z`;
  const glyphs = {
    S: `M0.24 0.62 C0.2 0.72 -0.24 0.74 -0.24 0.55 C-0.24 0.38 0.24 0.42 0.24 0.24 C0.24 0.04 -0.2 0.06 -0.25 0.17`,
    M: `M-0.27 0.1 L-0.27 0.64 L0 0.36 L0.27 0.64 L0.27 0.1`,
    L: `M-0.2 0.66 L-0.2 0.1 L0.24 0.1`,
  };
  for (const t of tags) {
    const m = planeY(Y1 - t.D);
    const map = (u, v) => m(t.xc - t.D + u * t.w, t.top - t.D - (1 - v) * t.h);
    // ficelle jusqu'au-dessus de la vitrine (le mur en masque le haut)
    out += strokeD(tp(`M0 0.86 L0 ${f(1 + (WZ1 + 1 - t.top) / t.h)}`, map), '#8b93a8', 0.4);
    out += pathEl(tp(shape, (u, v) => { const [a, b] = map(u, v); return [a + 0.7, b + 0.55]; }), '#5a4a3a', { op: 0.13 });
    out += pathEl(tp(shape, map), '#ffffff', { seam: 0.95, seamColor: NAVY });
    // œillet rond : rayon monde 0,075·w, donc 0,075 en u et 0,075·w/h en v
    out += pathEl(tp(ovalL(0, 0.86, 0.075, (0.075 * t.w) / t.h), map), '#cfd3e2');
    out += strokeD(tp(glyphs[t.L], (u, v) => map(u * 0.95, 0.06 + v * 0.95)), NAVY, Math.max(0.55, t.w * 0.11));
  }
}

/* ───────────── murs ───────────── */
// pignon +x (ombré) : rectangle + triangle sous le toit
out += face([[X1, Y0, ZG], [X1, Y1, ZG], [X1, Y1, ZW], [X1, YM, ZRG - 1], [X1, Y0, ZW]], gradX([[0, '#e8eaf3'], [1, '#d6d9e6']], ZRG, ZG, X1), { seam: 0.4, seamColor: '#dfe2ee' });
// façade +y (éclairée), percée de la vitrine et de la porte (evenodd)
{
  const outer = poly([[X0, Y1, ZG], [X1, Y1, ZG], [X1, Y1, ZW], [X0, Y1, ZW]]);
  const win = poly([[WX0, Y1, WZ0], [WX0, Y1, WZ1], [WX1, Y1, WZ1], [WX1, Y1, WZ0]]);
  const door = poly([[DX0, Y1, ZG + 1.4], [DX0, Y1, DZ1], [DX1, Y1, DZ1], [DX1, Y1, ZG + 1.4]]);
  out += `<path d="${outer} ${win} ${door}" fill-rule="evenodd" fill="${gradY([[0, '#ffffff'], [1, '#eff0f6']], ZW, ZG, Y1)}"/>`;
}
out += stroke([[X1, Y1, ZG + 5.5], [X1, Y1, ZW - 4]], '#ffffff', 0.9, 0.95);

// vitre de la vitrine : teinte bleue légère + reflets, menuiseries bleu nuit
{
  const m = planeY(Y1);
  out += face([[WX0, Y1, WZ0], [WX1, Y1, WZ0], [WX1, Y1, WZ1], [WX0, Y1, WZ1]], gradY([[0, '#bcd8ff', 0.34], [1, '#7aa6f0', 0.3]], WZ1, WZ0, Y1));
  // reflets plus discrets sur le carreau droit : ils passent sur les étiquettes S·M·L
  for (const [a, w, op] of [[-13.5, 3.4, 0.34], [-8.6, 1.3, 0.34], [4.5, 3.6, 0.24], [9.6, 1.2, 0.24]]) {
    out += pathEl(tp(polyL([[a, WZ0 + 0.6], [a + w, WZ0 + 0.6], [a + w + 7, WZ1 - 0.6], [a + 7, WZ1 - 0.6]].map(([u, v]) => [Math.min(Math.max(u, WX0 + 0.6), WX1 - 0.6), v])), m), '#ffffff', { op });
  }
  // cadre, meneau central et petit bois (bleu nuit de la palette des menuiseries)
  const fr = '#2e3a6e';
  out += face([[WX0 - 1, Y1 + 0.3, WZ1], [WX1 + 1, Y1 + 0.3, WZ1], [WX1 + 1, Y1 + 0.3, WZ1 + 1.2], [WX0 - 1, Y1 + 0.3, WZ1 + 1.2]], fr);
  out += face([[WX0 - 1, Y1 + 0.3, WZ0 - 0.2], [WX0, Y1 + 0.3, WZ0 - 0.2], [WX0, Y1 + 0.3, WZ1], [WX0 - 1, Y1 + 0.3, WZ1]], fr);
  out += face([[WX1, Y1 + 0.3, WZ0 - 0.2], [WX1 + 1, Y1 + 0.3, WZ0 - 0.2], [WX1 + 1, Y1 + 0.3, WZ1], [WX1, Y1 + 0.3, WZ1]], fr);
  out += face([[-1.5, Y1 + 0.3, WZ0], [-0.6, Y1 + 0.3, WZ0], [-0.6, Y1 + 0.3, WZ1], [-1.5, Y1 + 0.3, WZ1]], fr);
  // petit bois horizontal (imposte) : au-dessus des étiquettes S et L, qui pendent juste dessous
  out += face([[WX0, Y1 + 0.3, 32.3], [WX1, Y1 + 0.3, 32.3], [WX1, Y1 + 0.3, 33.0], [WX0, Y1 + 0.3, 33.0]], fr);
  // appui de fenêtre blanc
  out += solid(WX0 - 1.8, Y1, WZ0 - 1.6, WX1 - WX0 + 3.6, 2.2, 1.6, { right: '#dfe2ee', left: '#eef0f6', top: '#ffffff' });
}
// porte rose vitrée
{
  out += face([[DX0, Y1 - 1.5, ZG + 1.4], [DX0, Y1, ZG + 1.4], [DX0, Y1, DZ1], [DX0, Y1 - 1.5, DZ1]], '#d8dbe7');
  out += face([[DX0, Y1 - 1.5, ZG + 1.4], [DX1, Y1 - 1.5, ZG + 1.4], [DX1, Y1 - 1.5, DZ1], [DX0, Y1 - 1.5, DZ1]], gradY([[0, '#f39bb0'], [1, PINK_D]], DZ1, ZG + 1.4, Y1 - 1.5));
  const m = planeY(Y1 - 1.5);
  out += pathEl(tp(rrectL(DX0 + 2, 15, DX1 - 2, DZ1 - 2.4, 1), m), grad([[0, '#a9cdff'], [1, '#6f9ef5']]));
  out += pathEl(tp(polyL([[DX0 + 3, 15.6], [DX0 + 5, 15.6], [DX0 + 8, DZ1 - 3], [DX0 + 6, DZ1 - 3]]), m), '#ffffff', { op: 0.35 });
  out += pathEl(tp(rrectL(DX0 + 2, 5.6, DX1 - 2, 12.6, 0.8), m), '#000', { op: 0.07 });
  out += pathEl(tp(circleL(DX1 - 3, 14, 0.75), m), GOLD);
  // encadrement blanc et marche
  out += face([[DX0 - 1.2, Y1 + 0.3, DZ1], [DX1 + 1.2, Y1 + 0.3, DZ1], [DX1 + 1.2, Y1 + 0.3, DZ1 + 1.4], [DX0 - 1.2, Y1 + 0.3, DZ1 + 1.4]], '#ffffff');
  out += solid(DX0 - 1.5, Y1, ZG, DX1 - DX0 + 3, 3, 1.4, { right: '#dfe2ee', left: '#e9ebf2', top: '#f7f7fb' });
}
// soubassement (face +y hors porte, face +x)
{
  const zp = ZG + 5, e = 0.7;
  out += face([[X1 + e, Y0, ZG], [X1 + e, Y1 + e, ZG], [X1 + e, Y1 + e, zp], [X1 + e, Y0, zp]], '#cfd3e2');
  out += face([[X1, Y0, zp], [X1 + e, Y0, zp], [X1 + e, Y1 + e, zp], [X1, Y1, zp]], '#e8eaf1');
  for (const [a, b] of [[X0, DX0 - 1.5], [DX1 + 1.5, X1 + e]]) {
    out += face([[a, Y1 + e, ZG], [b, Y1 + e, ZG], [b, Y1 + e, zp], [a, Y1 + e, zp]], '#e3e5ef');
    out += face([[a, Y1, zp], [b, Y1, zp], [b, Y1 + e, zp], [a, Y1 + e, zp]], '#f4f5f9');
  }
}

/* ───────────── nuancier en éventail (façade +y, à gauche) ───────────── */
{
  const m = planeY(Y1 + 0.08);
  const px = -34.5, pz = 11, L = 21, Wd = 4.9;
  const cols = ['#e98a62', '#f6c95c', '#2bb5a5', '#22c3e6', '#7c6bff', '#ef8aa0'];
  const angles = cols.map((_, i) => ((-37 + i * 14.8) * Math.PI) / 180);
  // ombre douce sous l'éventail
  cols.forEach((_, i) => {
    const R = rot(px + 0.7, pz - 0.6, angles[i]);
    out += pathEl(tp(polyL([R(-Wd / 2, -1.5), R(Wd / 2, -1.5), R(Wd / 2, L), R(-Wd / 2, L)].map(([u, v]) => [u, v])), (u, v) => m(u, v)), '#3a3550', { op: 0.07 });
  });
  cols.forEach((c, i) => {
    // angle mesuré depuis la verticale : on tourne (u, v) = (0, L) vers la gauche pour les angles négatifs
    const a = angles[i];
    const R = (u, v) => [px + u * Math.cos(a) + v * Math.sin(a), pz - u * Math.sin(a) + v * Math.cos(a)];
    const card = [R(-Wd / 2, -1.6), R(Wd / 2, -1.6), R(Wd / 2, L), R(-Wd / 2, L)];
    out += pathEl(tp(polyL(card), m), '#ffffff', { seam: 0.25, seamColor: '#e4e6ef' });
    const chip = [R(-Wd / 2 + 0.5, L * 0.36), R(Wd / 2 - 0.5, L * 0.36), R(Wd / 2 - 0.5, L - 0.5), R(-Wd / 2 + 0.5, L - 0.5)];
    out += pathEl(tp(polyL(chip), m), c);
    const hi = [R(-Wd / 2 + 0.5, L * 0.36), R(-Wd / 2 + 1.3, L * 0.36), R(-Wd / 2 + 1.3, L - 0.5), R(-Wd / 2 + 0.5, L - 0.5)];
    out += pathEl(tp(polyL(hi), m), '#ffffff', { op: 0.18 });
    // « lignes de texte » de l'étiquette blanche
    out += strokeD(tp(`M${f(R(-1.2, L * 0.24)[0])} ${f(R(-1.2, L * 0.24)[1])} L${f(R(1.2, L * 0.24)[0])} ${f(R(1.2, L * 0.24)[1])}`, m), '#c9cde0', 0.45);
  });
  out += pathEl(tp(circleL(px, pz, 1.25), m), '#9aa2b4');
  out += pathEl(tp(circleL(px - 0.25, pz + 0.25, 0.6), m), '#e6e9f1');
}

/* ───────────── mètre ruban en frise sous l'avant-toit ───────────── */
{
  const z0 = 39.8, z1 = 42.7, x0 = X0 + 1.2, x1 = X1 - 0.6;
  out += face([[x0, Y1 + 0.1, z0], [x1, Y1 + 0.1, z0], [x1, Y1 + 0.1, z1], [x0, Y1 + 0.1, z1]], gradY([[0, '#f9d77a'], [1, '#eab94a']], z1, z0, Y1 + 0.1));
  let tk = '';
  for (let x = x0 + 1.5, i = 1; x < x1 - 0.5; x += 1.5, i++) {
    const big = i % 5 === 0;
    tk += line([[x, Y1 + 0.15, z1], [x, Y1 + 0.15, z1 - (big ? 1.5 : 0.8)]]) + ' ';
  }
  out += strokeD(tk.trim(), '#6b4f1d', 0.28, 0.75);
  // repères « chiffres » (petits traits épais) tous les 7,5
  let nb = '';
  for (let x = x0 + 7.5 - 0.6; x < x1 - 2; x += 7.5) nb += line([[x, Y1 + 0.15, z0 + 0.7], [x + 1.2, Y1 + 0.15, z0 + 0.7]]) + ' ';
  out += strokeD(nb.trim(), '#d9467a', 0.5, 0.85);
  // embout métallique au bout du ruban (angle droit)
  out += face([[x1 - 0.2, Y1 + 0.2, z0 - 0.4], [x1 + 0.9, Y1 + 0.2, z0 - 0.4], [x1 + 0.9, Y1 + 0.2, z1 + 0.4], [x1 - 0.2, Y1 + 0.2, z1 + 0.4]], '#9aa2b4');
}

/* ───────────── enseigne bobine de fil (face +x) ───────────── */
// Panneau 35 × 35 : silhouette en « I » franche — flasques bois épaisses, nettement plus larges
// que le fil. Fil VIOLET PEG : le framboise d'avant se fondait dans le toit et la porte roses
// (à 0,533 on lisait « un bloc rose entre deux barres brunes »). Bobine à l'échelle 1,75.
{
  const yc = -1, zc = 30.5, hw = 17.5, hh = 17.5, rr = 3.2;
  const mWall = planeX(X1), mFront = planeX(X1 + 1.1);
  const panel = rrectL(-yc - hw, zc - hh, -yc + hw, zc + hh, rr);
  out += pathEl(tp(panel, (u, v) => mWall(u + 1.6, v - 1.1)), '#3a3550', { op: 0.13 });
  out += pathEl(tp(panel, mWall), '#ffffff');
  out += pathEl(tp(panel, mFront), gradX([[0, '#fafbfd'], [1, '#e8eaf2']], zc + hh, zc - hh, X1 + 1.1));
  // filet intérieur rapproché du bord (1,2 au lieu de 1,8) : la bobine agrandie tient dedans
  const ins = 1.2;
  out += strokeD(tp(rrectL(-yc - hw + ins, zc - hh + ins, -yc + hw - ins, zc + hh - ins, rr * 0.6), mFront), '#d9dcea', 0.45, 0.9);
  // bobine : flasques bois, fil violet enroulé, aiguille argentée — centrée sur le panneau
  // (étendue locale u ∈ [−8,6 ; 8,9], v ∈ [−8,4 ; 8,9] avec l'aiguille, qui reste dans le filet)
  const s = 1.75, cu = -yc - 0.4, cv = zc - 0.7;
  const mp = (u, v) => mFront(cu + u * s, cv + v * s);
  out += pathEl(tp(rrectL(-5.2, -5.3, 5.2, 5.3, 1.2), mp), '#7c6bff');
  out += pathEl(tp(rrectL(-5.2, -5.3, -3.1, 5.3, 1.1), mp), '#8a7cff');
  out += pathEl(tp(rrectL(3.4, -5.3, 5.2, 5.3, 1.1), mp), '#6352e6');
  let th = '';
  for (let k = -4.2; k <= 4.3; k += 1.4) th += `M-5 ${f(k - 0.5)} L5 ${f(k + 0.5)} `;
  out += strokeD(tp(th.trim(), mp), '#5a4bd6', 0.34, 0.75);
  out += pathEl(tp(rrectL(-8.6, 5.1, 8.6, 8.4, 1.3), mp), '#c08549');
  out += pathEl(tp(rrectL(-8.6, 7.1, 8.6, 8.4, 1.1), mp), '#e0ad74');
  out += pathEl(tp(rrectL(-8.6, -8.4, 8.6, -5.1, 1.3), mp), '#c08549');
  out += pathEl(tp(rrectL(-8.6, -6.2, 8.6, -5.1, 0.8), mp), '#d9a066');
  // aiguille plantée en diagonale + bout de fil (assorti au fil)
  out += strokeD(tp(`M-1.2 -2.2 L8.9 8.9`, mp), '#8b93a8', 1.0);
  out += strokeD(tp(`M7.8 7.7 L8.9 8.9`, mp), '#ffffff', 0.4, 0.9);
  out += strokeD(tp(`M5.2 1 C7.6 0.4 9.1 2.9 8.7 5.4 C8.4 7.1 8.4 7.9 8.5 8.5`, mp), '#7c6bff', 0.7);
}
// œil-de-bœuf dans le pignon
{
  const m0 = planeX(X1), m1 = planeX(X1 + 0.6);
  const zc = ZW + 6.5, uc = -YM + 3;
  out += pathEl(tp(circleL(uc, zc, 5.2), m1), '#ffffff');
  out += pathEl(tp(circleL(uc, zc, 4.1), m0), grad([[0, '#7da6ea'], [1, '#5579c6']]));
  out += pathEl(tp(`M${f(uc - 2.8)} ${f(zc - 1.4)} L${f(uc - 1.2)} ${f(zc - 3)} L${f(uc + 2.4)} ${f(zc + 1.2)} L${f(uc + 0.8)} ${f(zc + 2.8)} Z`, m0), '#ffffff', { op: 0.3 });
  out += strokeD(tp(`M${f(uc - 4.1)} ${f(zc)} L${f(uc + 4.1)} ${f(zc)} M${f(uc)} ${f(zc - 4.1)} L${f(uc)} ${f(zc + 4.1)}`, m1), '#ffffff', 0.7);
}

/* ───────────── toit rose à deux pans ───────────── */
{
  const xa = X0 - OV, xb = X1 + OV, yf = Y1 + OV, yb = Y0 - OV;
  // Ombres du débord. Le toit cache les murs au-dessus de la projection de ses arêtes basses
  // (décalage OV le long de la vue) : sur la façade, au-dessus de zF ; sur le pignon, au-dessus
  // de la ligne brisée (Y1, zF) → (YM − OV, sommet) → (Y0, …). L'ombre part de ces lignes et
  // s'estompe vers le bas (5 à 6 unités) ; le toit, dessiné ensuite, recouvre ce qui dépasse.
  const zF = ZE - TH - OV;
  const sh = [[0, '#5a2a3a', 0.17], [0.45, '#5a2a3a', 0.07], [1, '#5a2a3a', 0]];
  out += face([[X0, Y1, zF - 6], [X1, Y1, zF - 6], [X1, Y1, zF + 1], [X0, Y1, zF + 1]], gradY(sh, zF, zF - 6, Y1));
  {
    const yA = YM - OV, zA = zF + SLOPE * (Y1 - yA); // sommet de la ligne visible sur le pignon
    const zB = zA - SLOPE * (yA - Y0);               // à l'arrière du pignon (y = Y0)
    const shX = [[0, '#3a2a40', 0.14], [0.45, '#3a2a40', 0.06], [1, '#3a2a40', 0]];
    out += face([[X1, Y1, zF + 1], [X1, yA, zA + 1], [X1, yA, zA - 5], [X1, Y1, zF - 5]], gradIso(shX, [X1, Y1, zF], [X1, Y1, zF - 5], [0, 1, -SLOPE]));
    out += face([[X1, yA, zA + 1], [X1, Y0, zB + 1], [X1, Y0, zB - 5], [X1, yA, zA - 5]], gradIso(shX, [X1, Y0, zB], [X1, Y0, zB - 5], [0, 1, SLOPE]));
  }
  // pan arrière (à peine visible), pan avant éclairé (plus clair au faîtage)
  out += face([[xa, yb, ZE], [xb, yb, ZE], [xb, YM, ZRG], [xa, YM, ZRG]], shade(PINK, 0.75));
  out += face([[xa, yf, ZE], [xb, yf, ZE], [xb, YM, ZRG], [xa, YM, ZRG]], gradIso([[0, '#f6a6b8'], [1, '#ec8399']], [0, YM, ZRG], [0, yf, ZE], [1, 0, 0]), { seam: 0.3, seamColor: '#ef8aa0' });
  // rangs de tuiles plates (lignes douces parallèles au faîtage)
  let rows = '';
  for (let t = 0.2; t < 0.99; t += 0.2) {
    const y = yf + (YM - yf) * t, z = ZE + (ZRG - ZE) * t;
    rows += line([[xa + 0.5, y, z], [xb - 0.5, y, z]]) + ' ';
  }
  out += strokeD(rows.trim(), '#d9677f', 0.45, 0.45);
  // tranche avant (bandeau de rive) et rives du pignon (faces +x)
  out += face([[xa, yf, ZE - TH], [xb, yf, ZE - TH], [xb, yf, ZE], [xa, yf, ZE]], PINK_D);
  out += face([[xb, yf, ZE - TH], [xb, yf, ZE], [xb, YM, ZRG], [xb, YM, ZRG - TH]], shade(PINK, 0.8));
  out += face([[xb, YM, ZRG - TH], [xb, YM, ZRG], [xb, yb, ZE], [xb, yb, ZE - TH]], shade(PINK, 0.72));
  // liserés clairs : égout, faîtage, rive
  out += stroke(trimEnds([[xa, yf, ZE], [xb, yf, ZE]], 0.6), tint(PINK, 0.45), 1.1, 0.95);
  out += stroke(trimEnds([[xa, YM, ZRG], [xb, YM, ZRG]], 0.7), tint(PINK, 0.5), 1.3, 0.95);
  out += stroke(trimEnds([[xb, yf, ZE], [xb, YM, ZRG], [xb, yb, ZE]], 0.5), tint(PINK, 0.35), 0.9, 0.9);
  // faîtière (petit boudin)
  out += stroke([[xa + 0.4, YM, ZRG + 0.6], [xb - 0.4, YM, ZRG + 0.6]], '#e9849b', 1.4);
  out += stroke([[xa + 0.4, YM + 0.2, ZRG + 1], [xb - 0.4, YM + 0.2, ZRG + 1]], '#f9c7d2', 0.5, 0.9);
}

// Enseigne en potence à l'angle avant de la façade +y : essayée le 21/10 et écartée. La porte
// n'est qu'à 7 unités de l'angle : une console en saillie de 10 pend forcément devant le haut de
// la porte, reste dans le contour du bâtiment (la silhouette ne change pas) et son nuancier ne
// fait que ≈ 2 px à 0,533. Voir renders/attributs-essai-potence-*.png.

/* ───────────── accessoires ───────────── */
const props = [];
// arbre rond qui dépasse derrière, à gauche
props.push({ ...treeRound(-74, -6, { size: 1.05 }), back: true });
// cyprès à droite
props.push(treeCone(64, -38, { size: 0.98 }));
// massif fleuri devant la vitrine, contre le soubassement (sous l'appui : il est plus bas)
// → y ∈ [Y1 + 1.2 ; Y1 + 7.2], libère le trottoir pour le chevalet
props.push(flowerBed(-0.5, Y1 + 4.2, 32, 6, { z: ZG, seed: 3 }));
// plante en pot près de la porte, buis à l'angle
// (pot de 8,8 : centré à X1 + 5,6, il ne mord plus dans le soubassement en X1 + 0,7)
props.push(pottedPlant(X1 + 5.6, Y1 - 3.2, { z: ZG, pot: 'square', size: 1.05 }));
props.push(bush(X1 + 7, -20, { w: 9, d: 10, h: 9, z: ZG }));
// chevalet « checklist » (formulaires, listes) sur le trottoir, devant le massif : ses pieds
// arrière (y = cy − 2·lean) et son ombre restent hors du massif (y ≤ Y1 + 7,2).
{
  const cx = 4, cy = Y1 + 14, H = 13, W = 9, lean = 2.8;
  const zb = ZG;
  const at = (u, v) => P(cx - W / 2 + u, cy - lean * (v / H), zb + v); // panneau avant incliné (face +y)
  // pieds arrière (montants bois visibles sur le côté)
  let g = '';
  g += stroke([[cx + W / 2 - 0.4, cy - lean, zb + H], [cx + W / 2 - 0.4, cy - 2 * lean, zb]], '#b07a45', 0.9);
  g += stroke([[cx - W / 2 + 0.4, cy - lean, zb + H], [cx - W / 2 + 0.4, cy - 2 * lean, zb]], '#b07a45', 0.9);
  // ombre au sol (vers la droite de l'écran, comme les accessoires partagés)
  g += face([[cx - W / 2, cy, zb], [cx + W / 2, cy, zb], [cx + W / 2 + 4.2, cy - 2 * lean - 0.6, zb], [cx - W / 2 + 4.2, cy - 2 * lean - 0.6, zb]], '#5a4a3a', { op: 0.12 });
  // cadre bois + ardoise bleu nuit
  g += pathEl(tp(polyL([[0, 0], [W, 0], [W, H], [0, H]]), at), '#d9a066');
  g += pathEl(tp(polyL([[W - 0.9, 0.9], [W, 0], [W, H], [W - 0.9, H - 0.9]]), at), '#c08549');
  g += pathEl(tp(polyL([[0.9, 0.9], [W - 0.9, 0.9], [W - 0.9, H - 0.9], [0.9, H - 0.9]]), at), '#34427e');
  // liste : 3 cases cochées + lignes
  for (let k = 0; k < 3; k++) {
    const v = H - 3.2 - k * 3.2;
    g += pathEl(tp(polyL([[1.8, v - 0.9], [3.4, v - 0.9], [3.4, v + 0.7], [1.8, v + 0.7]]), at), '#ffffff', { op: 0.9 });
    g += strokeD(tp(`M2.1 ${f(v)} L2.6 ${f(v - 0.6)} L3.7 ${f(v + 1)}`, at), k < 2 ? '#2bb5a5' : '#ffffff', 0.45, k < 2 ? 1 : 0);
    g += strokeD(tp(`M4.4 ${f(v)} L${f(W - 1.8)} ${f(v)}`, at), '#ffffff', 0.5, 0.75);
  }
  props.push({ d: cx + cy, svg: g });
}
// cliente qui se dirige vers la porte
props.push(person(33, 49, { facing: 'back-right', pose: 'walk', top: '#14b8a6', hairStyle: 'long', hair: '#6b4a2f', pants: '#34427e' }));
// Ordre du peintre : accessoires hors de l'emprise du bâtiment ; « back » (côtés −x / −y) avant
// lui, les autres après, triés entre eux par d = x + y.
props.sort((a, b) => a.d - b.d);
const behind = props.filter((p) => p.back).map((p) => p.svg).join('');
const front = props.filter((p) => !p.back).map((p) => p.svg).join('');
const body = out.slice(0, GROUND_END) + behind + out.slice(GROUND_END) + front;

writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svgDoc({ title: TITLE, defs: defs.join(''), body }));

/* ───────────── manifeste ───────────── */
const top = Math.min(P(X0 - OV, YM, ZRG + 1.4)[1], P(X1 + OV, YM, ZRG + 1.4)[1]);
const left = P(X0 - OV, Y1 + OV, 0)[0], right = P(X1 + OV, Y0 - OV, 0)[0];
const bottom = P(X1, Y1, 0)[1];
const man = {
  id: ID, title: TITLE, labelY: Math.round(top),
  hit: { x: Math.floor(left - 2), y: Math.floor(top - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - top + 4) },
};
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man) + '\n');
console.log('ok', ID, man, 'bounds', bounds(body));
