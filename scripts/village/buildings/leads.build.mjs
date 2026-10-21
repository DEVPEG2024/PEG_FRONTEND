// Village PEG — « Leads » : le phare (les prospects qu'on attire).
// Tour blanche élancée à bandes violettes, galerie bleu nuit à garde-corps, lanterne jaune allumée
// avec halo et faisceau doux translucide, dôme violet ; maison du gardien (qui salue) à son pied,
// enseigne « personne + », îlot herbeux, rochers, sentier de pierres, une visiteuse qui arrive.
//   node buildings/leads.build.mjs && node tools/lint.mjs buildings/leads.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeCone, treeRound, bush, flowerBed, bounds } from '../tools/props.mjs';

const ID = 'leads', TITLE = 'Leads';
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };

/* ───────────── petits outils ───────────── */
const defs = [];
const seen = new Set();
const stopsOf = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
function lin(name, stops, dir = [0, 0, 0, 1], user = false) {
  const id = `${ID}-${name}`;
  if (!seen.has(id)) {
    seen.add(id);
    defs.push(`<linearGradient id="${id}" x1="${r1(dir[0])}" y1="${r1(dir[1])}" x2="${r1(dir[2])}" y2="${r1(dir[3])}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stopsOf(stops)}</linearGradient>`);
  }
  return `url(#${id})`;
}
function rad(name, stops, { cx = 0.5, cy = 0.5, r = 0.5, fx, fy } = {}) {
  const id = `${ID}-${name}`;
  if (!seen.has(id)) {
    seen.add(id);
    defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx != null ? ` fx="${fx}" fy="${fy}"` : ''}>${stopsOf(stops)}</radialGradient>`);
  }
  return `url(#${id})`;
}
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${o}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const S = (d, color, w, o) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z]));
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z]));
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + F(b.top, c.top); };
const gX = (X, y0, zTop, inner) => { const [a, b] = P(X, y0, zTop); return `<g transform="matrix(0.866,-0.5,0,1,${r1(a)},${r1(b)})">${inner}</g>`; };
const circ = (c, r, fill, o) => `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}" fill="${fill}"${op(o)}/>`;
const pth = (pts, close = true) => 'M' + pts.map(([a, b]) => r1(a) + ' ' + r1(b)).join(' L') + (close ? ' Z' : '');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Courbe lisse fermée (Catmull-Rom) par des points écran. */
function smooth(pts) {
  const n = pts.length, g = (i) => pts[(i + n) % n];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + ' Z';
}
/* Lumière : 0 = face +x (ombrée) … 1 = face +y (éclairée), pour une normale horizontale (même loi que props). */
const LIGHT = (() => { const l = Math.hypot(-0.3, 1); return [-0.3 / l, 1 / l]; })();
const lightT = (n) => clamp((n[0] * LIGHT[0] + n[1] * LIGHT[1] - LIGHT[0]) / (LIGHT[1] - LIGHT[0]), 0, 1);

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const VIOLET = '#7c6bff', VIOLET_L = '#8a7cff', VIOLET_D = '#6352e6';
const NIGHT = '#34427e', NIGHT_L = '#3f4f93', NIGHT_D = '#2a376b';
/** Dégradé horizontal d'un fût éclairé à gauche (la face tournée vers +y), ombré à droite. */
const shaft = (name, c) => lin(name, [[0, c[1]], [0.07, c[0]], [0.42, c[2]], [0.78, c[3]], [1, c[4]]], [0, 0, 1, 0]);
const WHITE_SHAFT = shaft('shaft-w', ['#ffffff', '#f8f8fb', '#f1f2f8', '#e2e5ef', '#d2d6e4']);
const VIOLET_SHAFT = shaft('shaft-v', ['#9386ff', '#8577ff', '#7a69fb', '#6858ea', '#5747d0']);
const NIGHT_SHAFT = shaft('shaft-n', ['#4a5aa3', '#43529a', '#3a4888', '#303d76', '#283363']);
const STONE_SHAFT = shaft('shaft-s', ['#eef0f6', '#e8eaf2', '#dfe2ec', '#cfd3e2', '#c0c5d6']);

/* ───────────── géométrie du phare ───────────── */
const ZG = 2;                          // dessus de l'îlot herbeux
const CX = -15, CY = -15;              // axe de la tour (x − y = 0 : centré à l'écran)
const [SX, SY] = P(CX, CY, 0);
const ZB = ZG + 5;                     // dessus du socle de pierre
const ZT = 146;                        // haut du fût
const RB = 15.5, RT = 10.6;            // rayons du fût (bas, haut)
const rAt = (z) => RB + ((RT - RB) * (z - ZB)) / (ZT - ZB);
const ell = (r) => ({ rx: r * Math.SQRT2 * 0.866, ry: r * Math.SQRT2 * 0.5 });
/** Tranche de tronc de cône (face avant visible) entre z0 et z1. */
function band(z0, ra, z1, rb, fill) {
  const a = ell(ra), b = ell(rb), y0 = SY - z0, y1 = SY - z1;
  return `<path d="M${r1(SX - a.rx)} ${r1(y0)} A${r1(a.rx)} ${r1(a.ry)} 0 0 0 ${r1(SX + a.rx)} ${r1(y0)} L${r1(SX + b.rx)} ${r1(y1)} A${r1(b.rx)} ${r1(b.ry)} 0 0 1 ${r1(SX - b.rx)} ${r1(y1)} Z" fill="${fill}"/>`;
}
const disc = (z, r, fill, o) => { const e = ell(r); return `<ellipse cx="${r1(SX)}" cy="${r1(SY - z)}" rx="${r1(e.rx)}" ry="${r1(e.ry)}" fill="${fill}"${op(o)}/>`; };
/** Arc avant (de gauche à droite par l'avant) d'un cercle horizontal, en trait. */
const frontArc = (z, r, color, w, o) => { const e = ell(r); return S(`M${r1(SX - e.rx)} ${r1(SY - z)} A${r1(e.rx)} ${r1(e.ry)} 0 0 0 ${r1(SX + e.rx)} ${r1(SY - z)}`, color, w, o); };
const backArc = (z, r, color, w, o) => { const e = ell(r); return S(`M${r1(SX - e.rx)} ${r1(SY - z)} A${r1(e.rx)} ${r1(e.ry)} 0 0 1 ${r1(SX + e.rx)} ${r1(SY - z)}`, color, w, o); };
/** Point monde sur un cercle d'axe (CX, CY), angle a (degrés, 0 = +x, 90 = +y). */
const onC = (a, r, z) => { const t = (a * Math.PI) / 180; return P(CX + r * Math.cos(t), CY + r * Math.sin(t), z); };
const facing = (a) => { const t = (a * Math.PI) / 180; return Math.cos(t) + Math.sin(t) > 0.02; };

let tower = '';
/* socle de pierre */
tower += band(ZG, 19.5, ZB, 19.5, STONE_SHAFT) + disc(ZB, 19.5, '#f2f3f8');
{
  let j = '';
  for (const a of [100, 130, 160, 70, 40, 10, -20]) if (facing(a)) { const [x0, y0] = onC(a, 19.5, ZG + 0.3), [x1, y1] = onC(a, 19.5, ZB - 0.3); j += `M${r1(x0)} ${r1(y0)} L${r1(x1)} ${r1(y1)} `; }
  tower += S(j.trim(), '#c7ccdb', 0.45, 0.8) + frontArc(ZB, 19.5, '#ffffff', 0.8, 0.9);
  tower += disc(ZB, 16.4, '#5a4a3a', 0.08);
}
/* fût : bandes blanches et violettes */
const BANDS = [[ZB, 36, 'w'], [36, 60, 'v'], [60, 86, 'w'], [86, 110, 'v'], [110, ZT, 'w']];
for (const [z0, z1, k] of BANDS) tower += band(z0, rAt(z0), z1, rAt(z1), k === 'v' ? VIOLET_SHAFT : WHITE_SHAFT);
// filets clairs au haut de chaque bande violette, filet d'ombre dessous
for (const [z0, z1, k] of BANDS) if (k === 'v') { tower += frontArc(z1, rAt(z1), '#b3a9ff', 0.7, 0.9) + frontArc(z0 + 0.4, rAt(z0), '#4b3cc0', 0.6, 0.35); }
// reflet vertical doux sur le côté éclairé
{
  const pts = [onC(118, rAt(ZB + 4) + 0.1, ZB + 4), onC(118, rAt(ZT - 6) + 0.1, ZT - 6), onC(110, rAt(ZT - 6) + 0.1, ZT - 6), onC(110, rAt(ZB + 4) + 0.1, ZB + 4)];
  tower += F(pth(pts), '#ffffff', 0.35);
}
/* porte cintrée face à l'arrivée, fenêtres hublots en spirale */
function archOn(a, zc, w, h, layer) { // ouverture cintrée posée sur le fût (plaquée, angle a)
  const t = (a * Math.PI) / 180, r = rAt(zc) + 0.25;
  const n = [Math.cos(t), Math.sin(t)], tg = [-Math.sin(t), Math.cos(t)];
  const pt = (u, v) => P(CX + n[0] * r + tg[0] * u, CY + n[1] * r + tg[1] * u, zc + v);
  const pts = [pt(-w / 2, -h / 2), pt(w / 2, -h / 2)];
  for (let i = 0; i <= 8; i++) { const q = (i / 8) * Math.PI; pts.push(pt((w / 2) * Math.cos(q), h / 2 - w / 2 + (w / 2) * Math.sin(q))); }
  return layer(pts, pt);
}
// porte à l'échelle des personnages (≈ 26 unités, cf. § 3 du cahier des charges)
const DOOR_A = 102;
tower += archOn(DOOR_A, ZB + 13.4, 11.6, 26.8, (pts) => F(pth(pts), '#e4e6ef'));
tower += archOn(DOOR_A, ZB + 12.8, 9.2, 25.6, (pts, pt) => F(pth(pts), NAVY) + S(pth([pt(0, -12.8), pt(0, 8.2)], false), '#46559e', 0.5) +
  F(pth([pt(1.7, -2.4), pt(2.8, -2.4), pt(2.8, -1.5), pt(1.7, -1.5)]), '#f6c95c'));
for (const [a, zc] of [[94, 48], [74, 73], [98, 98], [78, 128]]) {
  tower += archOn(a, zc, 5.4, 10.4, (pts) => F(pth(pts), (zc > 36 && zc < 60) || (zc > 86 && zc < 110) ? '#5747d0' : '#d5d9e6'));
  tower += archOn(a, zc + 0.3, 3.8, 8.6, (pts, pt) => F(pth(pts), lin('win', [[0, '#b9d8ff'], [1, '#6f9ef5']])) +
    F(pth([pt(-1.6, -3.4), pt(-0.6, -3.4), pt(1, 3.2), pt(0, 3.2)]), '#ffffff', 0.4));
}

/* galerie (balcon) bleu nuit sur consoles */
const ZGAL = ZT, RG = 16.5;
let galBack = '', galFront = '';
{
  // consoles sous la galerie
  let k = '';
  for (let a = -40; a <= 130; a += 22.5) {
    if (!facing(a)) continue;
    const [x0, y0] = onC(a, rAt(ZT - 7), ZT - 7), [x1, y1] = onC(a, RG - 1.2, ZT), [x2, y2] = onC(a, rAt(ZT), ZT);
    k += `M${r1(x0)} ${r1(y0)} L${r1(x1)} ${r1(y1)} L${r1(x2)} ${r1(y2)} Z `;
  }
  tower += F(k.trim(), NIGHT_D);
  tower += band(ZGAL - 3, RG, ZGAL, RG, NIGHT_SHAFT) + disc(ZGAL, RG, NIGHT_L) + frontArc(ZGAL, RG, '#8c9ad6', 0.9, 0.95);
  // garde-corps : poteaux (arrière derrière la lanterne, avant devant), lisse
  const zr = ZGAL + 8;
  for (let a = 0; a < 360; a += 20) {
    const [x0, y0] = onC(a, RG - 0.8, ZGAL), [x1, y1] = onC(a, RG - 0.8, zr);
    const s = S(`M${r1(x0)} ${r1(y0)} L${r1(x1)} ${r1(y1)}`, NAVY, 0.7);
    if (facing(a)) galFront += s; else galBack += s;
  }
  galBack += backArc(zr, RG - 0.8, NAVY, 0.9) + backArc(zr - 4, RG - 0.8, NAVY, 0.45, 0.8);
  galFront += frontArc(zr - 4, RG - 0.8, NAVY, 0.45, 0.85) + frontArc(zr, RG - 0.8, NAVY, 1) + frontArc(zr + 0.4, RG - 0.8, '#8c9ad6', 0.4, 0.8);
}
/* lanterne allumée, corniche, dôme violet, boule et paratonnerre */
const ZL0 = ZGAL, ZL1 = ZGAL + 4, ZL2 = ZGAL + 19, ZL3 = ZGAL + 21.5, RL = 9.2;
let lantern = '';
let LAMP;
{
  lantern += band(ZL0, RL + 0.6, ZL1, RL + 0.6, WHITE_SHAFT) + frontArc(ZL1, RL + 0.6, '#ffffff', 0.6, 0.9);
  lantern += band(ZL1, RL, ZL2, RL, rad('glow-glass', [[0, '#fffef4'], [0.45, '#ffeb9c'], [1, '#f6c24c']], { cx: 0.42, cy: 0.5, r: 0.62 }));
  LAMP = [SX, SY - (ZL1 + ZL2) / 2];
  lantern += circ(LAMP, 4.2, '#fffbea') + circ(LAMP, 2.4, '#ffffff');
  // montants de la lanterne
  let m = '';
  for (let a = -45; a <= 135; a += 30) {
    const [x0, y0] = onC(a, RL, ZL1), [, y1] = onC(a, RL, ZL2);
    m += `M${r1(x0)} ${r1(y0)} L${r1(x0)} ${r1(y1)} `;
  }
  lantern += S(m.trim(), NAVY, 0.8) + frontArc(ZL1 + 0.3, RL, NAVY, 0.8) + frontArc(ZL2 - 0.3, RL, NAVY, 0.8);
  // reflets sur le vitrage
  lantern += F(pth([onC(128, RL + 0.05, ZL1 + 1), onC(116, RL + 0.05, ZL1 + 1), onC(116, RL + 0.05, ZL2 - 1), onC(128, RL + 0.05, ZL2 - 1)]), '#ffffff', 0.45);
  // corniche
  lantern += band(ZL2, RL + 1.6, ZL3, RL + 1.6, NIGHT_SHAFT) + disc(ZL3, RL + 1.6, NIGHT_L) + frontArc(ZL3, RL + 1.6, '#8c9ad6', 0.8, 0.95);
  // dôme : demi-ellipsoïde violet, éclairé en haut à gauche
  const rd = RL + 0.6, hd = 10.5, e = ell(rd), yb = SY - ZL3, rv = Math.sqrt(hd * hd + 0.5 * rd * rd);
  lantern += `<path d="M${r1(SX - e.rx)} ${r1(yb)} A${r1(e.rx)} ${r1(rv)} 0 0 1 ${r1(SX + e.rx)} ${r1(yb)} A${r1(e.rx)} ${r1(e.ry)} 0 0 1 ${r1(SX - e.rx)} ${r1(yb)} Z" fill="${rad('dome', [[0, '#b9b0ff'], [0.5, VIOLET], [1, '#5544cf']], { cx: 0.36, cy: 0.32, r: 0.8, fx: 0.3, fy: 0.25 })}"/>`;
  lantern += `<path d="M${r1(SX - e.rx * 0.62)} ${r1(yb - rv * 0.42)} A${r1(e.rx * 0.7)} ${r1(rv * 0.7)} 0 0 1 ${r1(SX - e.rx * 0.08)} ${r1(yb - rv * 0.9)}" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" stroke-opacity="0.55"/>`;
  // boule faîtière dorée et paratonnerre
  const top = yb - rv;
  lantern += S(`M${r1(SX)} ${r1(top - 2)} L${r1(SX)} ${r1(top - 11)}`, NAVY, 0.7);
  lantern += circ([SX, top - 1.6], 2.3, '#f6c95c') + circ([SX - 0.7, top - 2.3], 0.8, '#fff3c8');
  lantern += circ([SX, top - 11.3], 0.8, '#f6c95c');
}
const DOME_TOP = SY - ZL3 - Math.sqrt(10.5 * 10.5 + 0.5 * (RL + 0.6) ** 2) - 3.9; // haut de la boule

/* halo (derrière la lanterne) et faisceaux doux (partent du vitrage, par-dessus tout le reste) */
let halo = '', light = '';
{
  const [lx, ly] = LAMP, gx = ell(RL).rx;
  halo += `<circle cx="${r1(lx)}" cy="${r1(ly)}" r="34" fill="${rad('halo', [[0, '#ffe98f', 0.75], [0.32, '#ffe98f', 0.3], [1, '#ffe98f', 0]])}"/>`;
  // grand faisceau vers la gauche (vers les prospects), légèrement plongeant, bout arrondi qui s'efface
  const x0 = lx - gx + 0.6, ex = 58, ec = ly + 8;
  light += `<path d="M${r1(x0)} ${r1(ly - 5.5)} L${r1(ex)} ${r1(ec - 25)} C${r1(ex - 9)} ${r1(ec - 10)} ${r1(ex - 9)} ${r1(ec + 10)} ${r1(ex)} ${r1(ec + 25)} L${r1(x0)} ${r1(ly + 5.5)} Z" fill="${lin('beam-o', [[0, '#ffe27a', 0.62], [0.45, '#ffe27a', 0.26], [1, '#ffe27a', 0]], [x0, ly, ex, ec], true)}"/>`;
  light += `<path d="M${r1(x0)} ${r1(ly - 3)} L${r1(ex + 26)} ${r1(ec - 11)} L${r1(ex + 26)} ${r1(ec + 11)} L${r1(x0)} ${r1(ly + 3)} Z" fill="${lin('beam-i', [[0, '#fff7d2', 0.9], [0.5, '#fff3bf', 0.32], [1, '#fff3bf', 0]], [x0, ly, ex + 26, ec], true)}"/>`;
  // contre-faisceau plus court vers la droite (il part vers l'arrière) : même axe que le grand
  // faisceau, sens opposé (une lentille tournante émet deux faisceaux opposés)
  const x1 = lx + gx - 0.6, Lr = 60, er = ly - ((ec - ly) * Lr) / (x0 - ex);
  light += `<path d="M${r1(x1)} ${r1(ly - 4)} L${r1(x1 + Lr)} ${r1(er - 12)} L${r1(x1 + Lr)} ${r1(er + 12)} L${r1(x1)} ${r1(ly + 4)} Z" fill="${lin('beam-r', [[0, '#ffe27a', 0.45], [1, '#ffe27a', 0]], [x1, ly, x1 + Lr, er], true)}"/>`;
}

/* ───────────── maison du gardien ───────────── */
// À l'échelle des personnages (≈ 28 unités) : murs d'un petit étage, porte de 27 unités.
const HX0 = 6, HX1 = 40, HY0 = -12, HY1 = 13, HH = ZG + 31, HR = 12; // murs, faîtage le long de x
let house = '';
{
  const WL = lin('h-wall-l', [[0, '#ffffff'], [1, '#eff0f6']]), WR = lin('h-wall-r', [[0, '#e9ebf3'], [1, '#d9dce9']]);
  const GLASS = lin('h-glass', [[0, '#b9d8ff'], [1, '#6f9ef5']]);
  const ym = (HY0 + HY1) / 2;
  const ox = 2.2, oy = 2.6; // débords
  const rx0 = HX0 - ox, rx1 = HX1 + ox, ry0 = HY0 - oy, ry1 = HY1 + oy;
  const zEave = HH - (HR * oy) / ((HY1 - HY0) / 2), zRidge = HH + HR;
  // pan arrière (caché par le pan avant), puis la cheminée qui en sort : dessinée AVANT le pan avant,
  // qui masque sa base — on ne voit que ce qui dépasse du faîtage
  house += F(poly([[rx0, ry0, zEave], [rx1, ry0, zEave], [rx1, ym, zRidge], [rx0, ym, zRidge]]), shade(VIOLET, 0.75));
  const cx0 = 27, cy0 = -6.4, cw = 4.4, czb = zRidge - 8;
  house += cube(cx0, cy0, czb, cw, cw, zRidge - czb + 6, { lit: '#f4f5fa', dark: '#d9dce8', top: '#ffffff' });
  house += cube(cx0 - 0.6, cy0 - 0.6, zRidge + 6, cw + 1.2, cw + 1.2, 1.5, { lit: NIGHT, dark: NIGHT_D, top: NIGHT_L });
  // murs
  house += F(onY(HY1)(R(HX0, HX1, ZG, HH)), WL) + F(poly([[HX1, HY0, ZG], [HX1, HY1, ZG], [HX1, HY1, HH], [HX1, ym, zRidge], [HX1, HY0, HH]]), WR);
  const ZS = ZG + 4.5; // soubassement
  house += F(onY(HY1)(R(HX0, HX1, ZG, ZS)), '#e3e5ef') + F(onX(HX1)(R(HY0, HY1, ZG, ZS)), '#cfd3e2');
  house += S(line([[HX0, HY1, ZS], [HX1, HY1, ZS], [HX1, HY0, ZS]]), '#ffffff', 0.7, 0.9);
  house += S(line([[HX1, HY1, ZS], [HX1, HY1, HH - 0.3]]), '#ffffff', 0.9, 0.95);
  // porte en retrait de t : embrasure à gauche, linteau qui masque le haut du battant
  const t = 1.1, DA = 13, DB = 22, DZ = ZG + 27;
  house += F(onY(HY1)(R(DA, DB, ZG, DZ)), '#d5d8e6');
  house += F(onY(HY1 - t)(R(DA, DB - t, ZG, DZ - 0.5 * t)), NAVY);
  house += F(onY(HY1 - t + 0.02)(R(DA + 1.3, DB - t - 1.3, ZG + 15.5, DZ - 3)), GLASS);
  house += F(onY(HY1 - t + 0.02)(R(DA + 1.3, DB - t - 1.3, ZG + 4, ZG + 13)), '#46559e');
  house += F(onY(HY1 - t + 0.03)(R(DB - t - 2.7, DB - t - 1.9, ZG + 13.6, ZG + 14.6)), '#f6c95c');
  house += cube(DA - 1, HY1, ZG, DB - DA + 2, 1.6, 0.8, { lit: '#e3e5ef', dark: '#cfd3e2', top: '#f4f5f9' }); // seuil
  // fenêtre à jardinière (façade +y)
  const WA = 26.5, WB = 35.5, WZ0 = ZG + 12, WZ1 = ZG + 23;
  house += F(onY(HY1)(R(WA, WB, WZ0, WZ1)), NAVY) + F(onY(HY1 + 0.01)(R(WA + 0.8, WB - 0.8, WZ0 + 0.8, WZ1 - 0.8)), GLASS);
  house += F(onY(HY1 + 0.02)(R((WA + WB) / 2 - 0.35, (WA + WB) / 2 + 0.35, WZ0 + 0.8, WZ1 - 0.8)), NAVY);
  house += F(onY(HY1 + 0.02)(R(WA + 1.6, WA + 3, WZ0 + 1.4, WZ1 - 1.6)), '#ffffff', 0.35);
  house += cube(WA - 0.4, HY1, WZ0 - 2.4, WB - WA + 0.8, 2.2, 2, { lit: '#d9a066', dark: '#c08549', top: '#e4b47f' });
  for (const [x, c] of [[27.6, '#ef8aa0'], [29.3, '#f6c95c'], [31, '#ffffff'], [32.7, '#8a7cff'], [34.4, '#ef8aa0']]) {
    const p = P(x, HY1 + 1.1, WZ0 + 0.2); house += circ([p[0], p[1]], 1.2, '#5cc27a') + circ([p[0] - 0.2, p[1] - 0.6], 0.85, c);
  }
  // petite fenêtre du pignon (+x)
  house += F(onX(HX1 + 0.01)(R(-8.5, -2.5, ZG + 12, ZG + 22)), NAVY) + F(onX(HX1 + 0.02)(R(-7.8, -3.2, ZG + 12.7, ZG + 21.3)), lin('h-glass-r', [[0, '#8fb4f0'], [1, '#5579c6']]));
  // enseigne ronde « personne + » sur le pignon (dessin de base pour un rayon 3,8, mis à l'échelle)
  {
    const yc = 6.2, zc = ZG + 19.5, rr = 3.8, k = 4.6 / 3.8;
    const sh = (u, v) => `${r1(u)} ${r1(v)}`;
    let g = `<circle cx="${r1(rr + 0.8)}" cy="${r1(rr + 0.8)}" r="${rr}" fill="${NAVY}" fill-opacity="0.15"/>`;
    g += `<circle cx="${r1(rr)}" cy="${r1(rr)}" r="${rr}" fill="#ffffff"/>`;
    g += `<circle cx="${r1(rr - 0.8)}" cy="${r1(rr - 1.1)}" r="1.1" fill="none" stroke="${VIOLET}" stroke-width="0.75"/>`;
    g += `<path d="M${sh(rr - 2.9, rr + 2.4)} C${sh(rr - 2.9, rr + 0.7)} ${sh(rr + 1.3, rr + 0.7)} ${sh(rr + 1.3, rr + 2.4)}" fill="none" stroke="${VIOLET}" stroke-width="0.75" stroke-linecap="round"/>`;
    g += `<path d="M${sh(rr + 1.9, rr - 1.2)} L${sh(rr + 1.9, rr + 1.2)} M${sh(rr + 0.7, rr)} L${sh(rr + 3.1, rr)}" fill="none" stroke="#f59e0b" stroke-width="0.75" stroke-linecap="round"/>`;
    house += gX(HX1 + 0.3, yc + rr * k, zc + rr * k, `<g transform="scale(${r1(k * 100) / 100})">${g}</g>`);
  }
  // pan avant violet, rives, liserés
  house += F(poly([[rx0, ry1, zEave], [rx1, ry1, zEave], [rx1, ym, zRidge], [rx0, ym, zRidge]]), lin('h-roof', [[0, '#9a8eff'], [1, '#8475fb']]));
  house += F(poly([[rx0, ry1, zEave - 1.4], [rx1, ry1, zEave - 1.4], [rx1, ry1, zEave], [rx0, ry1, zEave]]), VIOLET_D);
  house += F(poly([[rx1, ry1, zEave - 1.4], [rx1, ym, zRidge - 1.4], [rx1, ym, zRidge], [rx1, ry1, zEave]]), shade(VIOLET, 0.8));
  house += F(poly([[rx1, ry0, zEave - 1.4], [rx1, ym, zRidge - 1.4], [rx1, ym, zRidge], [rx1, ry0, zEave]]), shade(VIOLET, 0.7));
  house += S(line([[rx0, ry1, zEave], [rx1, ry1, zEave], [rx1, ym, zRidge], [rx1, ry0, zEave]]), tint(VIOLET, 0.45), 1, 0.95);
  house += S(line([[rx0, ym, zRidge], [rx1, ym, zRidge]]), tint(VIOLET, 0.35), 0.8, 0.8);
}

/* ───────────── plateau rocheux clair, pelouse, sentier ───────────── */
let ground = '';
/** Contour organique (points monde) : « carré arrondi » ondulé. */
function blob(cx, cy, ax, ay, wob, n = 44, pw = 0.55) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI, k = 1 + wob * (Math.sin(3 * t + 0.6) + 0.7 * Math.cos(5 * t + 0.2) + 0.4 * Math.sin(7 * t + 1.3));
    const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), pw);
    out.push([cx + ax * k * sq(Math.cos(t)), cy + ay * k * sq(Math.sin(t))]);
  }
  return out;
}
{
  // plateau de pierre claire (même famille que les terrasses du village), tranche visible à l'avant
  const pl = blob(-6, -6, 64, 60, 0.028, 30);
  const top = pl.map(([x, y]) => P(x, y, ZG)), bot = pl.map(([x, y]) => P(x, y, 0));
  ground += F(smooth(hull([...top, ...bot])), lin('pl-side', [[0, '#e2e4ed'], [1, '#c6cad8']], [0, 0, 1, 0]));
  ground += F(smooth(top), lin('pl-top', [[0, '#f8f8fb'], [1, '#eceef4']]));
  ground += S(smooth(top), '#ffffff', 0.9, 0.9);
  // pelouses (au pied du phare et autour de la maison), sans épaisseur
  const lawnA = blob(-20, 4, 38, 34, 0.05, 24, 0.7).map(([x, y]) => P(x, y, ZG + 0.05));
  const lawnB = blob(30, -30, 22, 18, 0.06, 18, 0.75).map(([x, y]) => P(x, y, ZG + 0.05));
  ground += F(smooth(lawnA) + ' ' + smooth(lawnB), lin('lawn', [[0, '#a8e2b6'], [1, '#8fd6a1']]));
  // touffes d'herbe
  let tf = '';
  for (const [x, y] of [[-46, 22], [-40, 30], [-8, 30], [-52, -6], [24, -40], [40, -26], [-32, 12], [6, 12]]) {
    const [a, b] = P(x, y, ZG);
    tf += `M${r1(a - 2.2)} ${r1(b)} L${r1(a - 1.2)} ${r1(b - 3.2)} L${r1(a - 0.4)} ${r1(b - 0.6)} L${r1(a + 0.6)} ${r1(b - 3.8)} L${r1(a + 1.2)} ${r1(b - 0.4)} L${r1(a + 2.4)} ${r1(b - 2.6)} L${r1(a + 2.2)} ${r1(b)} Z `;
  }
  ground += F(tf.trim(), '#5cc27a', 0.85);
  // sentier de pierres plates jusqu'à la porte du phare
  for (const [x, y, s] of [[-30, 48, 1], [-27, 39, 0.92], [-24.5, 30.5, 1], [-22.5, 22, 0.9], [-21, 13.5, 0.95]]) {
    const pts = [];
    for (let i = 0; i < 7; i++) { const t = (i / 7) * 2 * Math.PI; pts.push(P(x + 4.2 * s * Math.cos(t) * (1 + 0.08 * Math.sin(3 * t)), y + 3.4 * s * Math.sin(t), ZG + 0.3)); }
    ground += F(smooth(pts.map(([a, b]) => [a + 0.6, b + 0.7])), '#5a4a3a', 0.12) + F(smooth(pts), '#eceef4');
  }
  // ombre portée douce de la maison du gardien (vers la droite de l'écran), comme les autres bâtiments
  const hsh = (k, o) => F(poly([[HX1, HY1, ZG], [HX1 + k, HY1 - k, ZG], [HX1 + k, HY0 - k, ZG], [HX0 + k, HY0 - k, ZG], [HX0, HY0, ZG], [HX1, HY0, ZG]]), '#5a4a3a', o);
  ground += hsh(15, 0.04) + hsh(9.5, 0.05) + hsh(4.5, 0.06);
  // marches devant la porte (sur le socle)
  const ta = (DOOR_A * Math.PI) / 180, n = [Math.cos(ta), Math.sin(ta)], tg = [-Math.sin(ta), Math.cos(ta)];
  for (const [d, z] of [[23.5, ZG + 2.5], [21.5, ZG + 5]]) {
    const c = [CX + n[0] * d, CY + n[1] * d], w = 6.5;
    const p = (u, v) => [c[0] + tg[0] * u + n[0] * v, c[1] + tg[1] * u + n[1] * v];
    const [a, b, cc, dd] = [p(-w, -3), p(w, -3), p(w, 2.5), p(-w, 2.5)];
    ground += F(poly([[...a, z], [...b, z], [...cc, z], [...dd, z]]), '#f2f3f8');
    // contremarche tournée vers ~+y (côté éclairé) : ton clair du soubassement, pas l'ombré
    ground += F(poly([[...dd, z - 2.5], [...cc, z - 2.5], [...cc, z], [...dd, z]]), '#e3e5ef');
  }
}

/** Rocher à facettes : anneaux bas / milieu / haut irréguliers, facettes teintées selon leur normale. */
function rock(x, y, s = 1, seed = 1, z = ZG) {
  let sd = seed * 9301 + 49297;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd % 1000) / 1000; };
  const n = 6, rings = [];
  const base = [], mid = [], top = [];
  const rad0 = [];
  for (let i = 0; i < n; i++) rad0.push(0.8 + 0.4 * rnd());
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI + 0.3;
    base.push([x + 7 * s * rad0[i] * Math.cos(t), y + 6 * s * rad0[i] * Math.sin(t)]);
    mid.push([x + 6.2 * s * rad0[i] * Math.cos(t + 0.15), y + 5.2 * s * rad0[i] * Math.sin(t + 0.15)]);
    top.push([x - 0.8 * s + 3.4 * s * rad0[i] * Math.cos(t + 0.3), y - 0.6 * s + 2.8 * s * rad0[i] * Math.sin(t + 0.3)]);
  }
  rings.push({ z, pts: base }, { z: z + 4.6 * s, pts: mid }, { z: z + 7.4 * s, pts: top });
  const pr = rings.map((r) => r.pts.map(([a, b]) => P(a, b, r.z)));
  let g = F(smooth(hull([...pr[0], ...pr[0].map(([a, b]) => [a + 5 * s, b - 1.2 * s])])), '#5a4a3a', 0.1);
  const col = (nrm, k) => mix(k ? '#a9b0c2' : '#9aa2b4', k ? '#eef0f5' : '#dde0e9', lightT(nrm));
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, A = rings[k].pts, B = rings[k + 1].pts;
      const ex = A[j][0] - A[i][0], ey = A[j][1] - A[i][1], l = Math.hypot(ex, ey), nrm = [ey / l, -ex / l];
      if (nrm[0] + nrm[1] < -0.2) continue;
      g += F(pth([pr[k][i], pr[k][j], pr[k + 1][j], pr[k + 1][i]]), col(nrm, k), undefined).replace('/>', ` stroke="${col(nrm, k)}" stroke-width="0.3" stroke-linejoin="round"/>`);
    }
  }
  g += F(pth(pr[2]), '#f4f5f9');
  return { d: x + y, svg: g };
}

/* ───────────── composition ───────────── */
const cs = contactShadow(`${ID}-cs`, 132, 60, 196, 300, 0.16);
defs.push(cs.defs);
const towerAll = tower + halo + galBack + lantern + galFront;
// ombre portée de la tour sur l'herbe (vers la droite de l'écran)
const towerShadow = (() => {
  const pts = [];
  for (let i = 0; i < 12; i++) { const t = (i / 12) * 2 * Math.PI; pts.push([CX + 16 * Math.cos(t), CY + 16 * Math.sin(t)]); }
  const sh = (k, o) => F(smooth(hull([...pts.map(([a, b]) => P(a, b, ZG)), ...pts.map(([a, b]) => P(a + k, b - k, ZG))])), '#5a4a3a', o);
  return sh(34, 0.04) + sh(20, 0.05) + sh(9, 0.05);
})();
const items = [
  { d: -2000, svg: ground },
  { d: -1900, svg: towerShadow },
  rock(-50, -26, 1.25, 3), rock(-40, -44, 0.85, 7), rock(-58, -6, 0.75, 11),
  { ...treeRound(-66, -16, { size: 0.95, z: ZG }), d: -82 },
  { ...treeCone(30, -46, { size: 0.9, z: ZG }), d: -16 },
  { d: CX + CY, svg: towerAll },
  { ...bush(-36, 2, { w: 9, d: 9, h: 7.5, z: ZG }), d: -20 },
  { d: 2, svg: house },
  rock(51, 10, 1, 5), rock(44, 32, 0.7, 13), rock(-48, 22, 0.9, 17),
  { ...flowerBed(-2, 25, 12, 7, { z: ZG, seed: 4 }), d: 23 },
  { ...bush(51, -17, { w: 9, d: 12, h: 9, z: ZG }), d: 34 },
  // le gardien, à gauche de sa porte, salue la visiteuse qui arrive par le sentier
  { ...person(9.5, 18.5, { z: ZG, facing: 'left', pose: 'wave', top: '#7c6bff', hairStyle: 'short', hair: '#5a3a26' }), d: 28 },
  { ...person(-27, 33, { z: ZG, facing: 'back-right', pose: 'walk', top: '#f59e0b', hairStyle: 'long' }), d: 6 },
];
const body = cs.el + compose(items) + light;
if (process.env.SIZES) console.log({ ground: ground.length, tower: tower.length, gal: galBack.length + galFront.length, lantern: lantern.length, light: light.length, house: house.length, defs: defs.join('').length, items: items.map((i) => i.svg.length) });
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

/* ───────────── manifeste : boule faîtière (hors paratonnerre), phare + maison ───────────── */
const eG = ell(RG), eB = ell(19.5);
const hit = {
  x: Math.floor(Math.min(SX - eB.rx, SX - eG.rx) - 2),
  y: Math.floor(DOME_TOP - 2),
};
const hb = bounds(house);
hit.w = Math.ceil(Math.max(hb.x + hb.w, SX + eG.rx) + 2 - hit.x);
hit.h = Math.ceil(Math.max(hb.y + hb.h, SY + eB.ry) + 2 - hit.y);
const man = { id: ID, title: TITLE, labelY: Math.round(DOME_TOP), hit };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
