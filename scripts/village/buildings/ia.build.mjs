// Village PEG — « IA » : le labo. Rotonde blanche coiffée d'un dôme d'observatoire cyan (fente
// d'observation et lunette), couronne de panneaux lumineux cyan sous la corniche, aile de labo à
// toit-terrasse bleu nuit (baie vitrée sur baies de serveurs et écran « réseau de neurones »),
// antenne parabolique sur le toit, enseigne étincelles (comme l'icône du menu) sur la face +x,
// petit robot sympathique qui salue devant l'entrée.
//   node buildings/ia.build.mjs && node tools/lint.mjs buildings/ia.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, cylinder, compose, contactShadow, svgDoc, shade, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, pottedPlant, bounds } from '../tools/props.mjs';

const ID = 'ia', TITLE = 'IA';
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rad = (d) => (d * Math.PI) / 180;

/* ───────────── petits outils ───────────── */
const defs = [];
const seen = new Set();
const stopsOf = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
function lin(name, stops, dir = [0, 0, 0, 1]) {
  const id = `${ID}-${name}`;
  if (!seen.has(id)) { seen.add(id); defs.push(`<linearGradient id="${id}" x1="${dir[0]}" y1="${dir[1]}" x2="${dir[2]}" y2="${dir[3]}">${stopsOf(stops)}</linearGradient>`); }
  return `url(#${id})`;
}
/** Dégradé radial en coordonnées écran. */
function radU(name, stops, cx, cy, r) {
  const id = `${ID}-${name}`;
  if (!seen.has(id)) { seen.add(id); defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}">${stopsOf(stops)}</radialGradient>`); }
  return `url(#${id})`;
}
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${Math.round(o * 100) / 100}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const S = (d, color, w, o) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
const scr = (pts, close = true) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L') + (close ? ' Z' : '');
const dot = (p, r, fill, o) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(r)}" fill="${fill}"${op(o)}/>`;
const ell = (p, rx, ry, fill, o) => `<ellipse cx="${r1(p[0])}" cy="${r1(p[1])}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${fill}"${op(o)}/>`;
const elTop = (e, fill, o) => `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${fill}"${op(o)}/>`;
// façades planes : (u, z) → monde
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z])); // face +y (éclairée), u = x
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z])); // face +x (ombrée), u = y
const lnY = (Y) => (pts) => line(pts.map(([u, z]) => [u, Y, z]));
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + F(b.top, c.top); };
/** Rectangle arrondi 2D (u, v) */
function rr2(u0, v0, u1, v1, r, n = 4) {
  const pts = [], cs = [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]];
  for (const [cu, cv, a0] of cs) for (let i = 0; i <= n; i++) { const a = rad(a0 + (90 * i) / n); pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  return pts;
}
/** Étincelle à 4 branches aux flancs incurvés (taille k, taille de guêpe ≈ 0,39 k comme l'icône du menu). */
function sparkle(cu, cv, k, p = 3.7, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t);
    pts.push([cu + k * Math.sign(c) * Math.abs(c) ** p, cv + k * Math.sign(s) * Math.abs(s) ** p]);
  }
  return pts;
}
function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// lumière (comme props.mjs) : 0 = face +x (ombrée) … 1 = face +y (éclairée)
const LIGHT = (() => { const l = Math.hypot(-0.3, 1); return [-0.3 / l, 1 / l]; })();
const lightT = (nx, ny) => clamp((nx * LIGHT[0] + ny * LIGHT[1] - LIGHT[0]) / (LIGHT[1] - LIGHT[0]), 0, 1);

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const NIGHT = '#34427e', NIGHT_L = '#3f4f93', NIGHT_D = '#2a376b';
const CYAN = '#22c3e6', CYAN_D = '#1aa3c2', CYAN_L = '#7fe3f5';
const WALL_L = lin('wall-l', [[0, '#ffffff'], [1, '#f0f1f7']]);
const WALL_R = lin('wall-r', [[0, '#e8eaf3'], [1, '#d8dbe9']]);
const GL_L = lin('glass-l', [[0, '#b6d6ff'], [0.5, '#8fb9fb'], [1, '#6f9ef5']]);
const GL_R = lin('glass-r', [[0, '#88b0f0'], [1, '#5579c6']]);
const EAVE = lin('eave', [[0, NAVY, 0.15], [1, NAVY, 0]]);

/* ───────────── géométrie ───────────── */
const ZP = 2.5;                                     // dessus de la terrasse
const CX = -30, CY = -14, RR = 36;                  // rotonde
const ZW = 46.5;                                    // haut du mur de la rotonde
const RC = 38.2, ZC = ZW + 4;                       // corniche
const RD = 33.5, ZD = ZC;                           // dôme (centre de la sphère à ZD)
const WX0 = -8, WX1 = 56, WY0 = -40, WY1 = 14;      // aile du labo
const ZA = 33.5, ZAT = 36.5;                        // haut des murs de l'aile, dessus de l'acrotère
const TX0 = -72, TX1 = 68, TY0 = -66, TY1 = 56;     // terrasse

const cylPt = (th, z, r = RR) => [CX + r * Math.cos(rad(th)), CY + r * Math.sin(rad(th)), z];
/** Pièce posée sur la rotonde, entre les angles th0…th1 (degrés) et les hauteurs z0…z1. */
function cylPatch(th0, th1, z0, z1, r = RR, n = 6) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(cylPt(th0 + ((th1 - th0) * i) / n, z0, r));
  for (let i = n; i >= 0; i--) pts.push(cylPt(th0 + ((th1 - th0) * i) / n, z1, r));
  return poly(pts);
}
const cylArc = (th0, th1, z, r = RR, n = 12) => line(Array.from({ length: n + 1 }, (_, i) => cylPt(th0 + ((th1 - th0) * i) / n, z, r)));
/** Dégradé horizontal d'un cylindre vertical vu de face (boîte englobante) : clair à gauche, ombré à droite. */
function cylGrad(name, lit, dark) {
  const stops = [];
  for (let i = 0; i <= 6; i++) {
    const s = -1 + (2 * i) / 6;                                   // −1 = bord gauche de l'écran, +1 = bord droit
    const th = (Math.acos(clamp(s, -1, 1)) * 180) / Math.PI - 45;  // angle monde de la normale
    stops.push([r1(i / 6), mix(dark, lit, Math.pow(lightT(Math.cos(rad(th)), Math.sin(rad(th))), 0.8))]);
  }
  return lin(name, stops, [0, 0, 1, 0]);
}

/* ───────────── sol : terrasse, joints, ombres ───────────── */
let ground = '';
{
  const t = box(TX0, TY0, 0, TX1 - TX0, TY1 - TY0, ZP);
  ground += F(t.right, '#d3d6e3') + F(t.left, '#e5e7f0') + F(t.top, lin('ter', [[0, '#f7f7fa'], [1, '#eff0f5']]));
  ground += S(line([[TX0, TY1, ZP], [TX1, TY1, ZP], [TX1, TY0, ZP]]), '#ffffff', 1);
  // joints de dallage (devant et côté +x : le reste est sous les bâtiments)
  let j = '';
  for (let x = TX0 + 17; x < TX1 - 3; x += 17) j += line([[x, Math.max(WY1, CY + Math.sqrt(Math.max(0, RR * RR - (x - CX) ** 2))) + 1, ZP], [x, TY1, ZP]]) + ' ';
  for (let y = WY1 + 14; y < TY1 - 3; y += 14) j += line([[TX0, y, ZP], [TX1, y, ZP]]) + ' ';
  for (let y = TY0 + 14; y < WY1; y += 14) j += line([[WX1 + 1, y, ZP], [TX1, y, ZP]]) + ' ';
  ground += S(j.trim(), '#e2e4ec', 0.55);
  // allée vers l'entrée de la rotonde
  ground += F(poly([[-40, 20, ZP], [-23, 20, ZP], [-23, TY1, ZP], [-40, TY1, ZP]]), '#e9ebf2');
  // ombres portées (lumière avant-gauche → ombres vers la droite de l'écran)
  const shadowOf = (foot, k, o) => F(scr(hull([...foot.map(([x, y]) => P(x, y, ZP)), ...foot.map(([x, y]) => P(x + k, y - k, ZP))])), '#5a4a3a', o);
  const ring = Array.from({ length: 20 }, (_, i) => cylPt((i / 20) * 360, ZP, RC).slice(0, 2));
  const wing = [[WX0, WY0], [WX1, WY0], [WX1, WY1], [WX0, WY1]];
  for (const [k, o] of [[30, 0.035], [18, 0.04], [8, 0.05]]) ground += shadowOf(ring, k, o) + shadowOf(wing, k * 0.7, o);
}

/* ───────────── rotonde : partie basse (jusqu'au toit de l'aile) ───────────── */
const WALLC = cylGrad('rot', '#ffffff', '#d4d8e6');
const rotWall = (z0, z1) => F(cylinder(CX, CY, z0, RR, z1 - z0).side, WALLC);
let rotLow = rotWall(ZP, ZAT);
// soubassement
rotLow += F(cylinder(CX, CY, ZP, RR + 0.4, 5).side, cylGrad('plinth', '#e6e8f1', '#c9cede'));
rotLow += S(cylArc(-45, 135, ZP + 5, RR + 0.4, 20), '#ffffff', 0.7, 0.9);
// baies hautes de part et d'autre de l'entrée (vitrage bleu, lueur cyan intérieure)
const curvedWindow = (th0, th1, z0, z1) => {
  let s = '';
  const tc = (th0 + th1) / 2, t = lightT(Math.cos(rad(tc)), Math.sin(rad(tc)));
  s += F(cylPatch(th0 - 1.6, th1 + 1.6, z0 - 1.4, z1 + 1.4, RR + 0.15), mix('#d9dce8', '#f3f4f9', t)); // encadrement
  s += F(cylPatch(th0, th1, z0, z1, RR + 0.2), t > 0.5 ? GL_L : GL_R);
  s += F(cylPatch(th0 + 0.8, th1 - 0.8, z0 + 1, z0 + 7, RR + 0.22, 4), CYAN_L, 0.55); // écrans allumés à l'intérieur
  const a = th0 + (th1 - th0) * 0.62;
  s += F(poly([cylPt(a, z0 + 2, RR + 0.25), cylPt(a + 3, z0 + 2, RR + 0.25), cylPt(a + 0.6, z1 - 1, RR + 0.25), cylPt(a - 2.4, z1 - 1, RR + 0.25)]), '#ffffff', 0.32);
  s += S(cylArc(th0, th1, z0 + (z1 - z0) * 0.62, RR + 0.3, 4), NAVY, 0.9);
  s += F(cylPatch(th0 - 2.4, th1 + 2.4, z0 - 2.2, z0 - 0.8, RR + 1.2), '#ffffff');
  return s;
};
rotLow += curvedWindow(60, 72, 11, 31);
rotLow += curvedWindow(111, 122, 11, 31);
// entrée : porte vitrée double, encadrement de pierre, auvent blanc à liseré cyan
// (passage de 27,5 unités : un personnage en fait ≈ 27,4 — porte ≈ 28 au cahier des charges)
const DOOR = [83, 101], DZ = 30;
{
  rotLow += F(cylPatch(DOOR[0] - 2.2, DOOR[1] + 2.2, ZP, DZ + 2.4, RR + 0.15, 8), '#e3e5ef');
  rotLow += F(cylPatch(DOOR[0], DOOR[1], ZP, DZ, RR + 0.2, 8), lin('door', [[0, '#cfe2ff'], [1, '#8fb4f2']]));
  rotLow += F(cylPatch(DOOR[0] + 1, DOOR[1] - 1, ZP + 1, 12, RR + 0.22, 6), CYAN_L, 0.35);
  const mid = (DOOR[0] + DOOR[1]) / 2;
  rotLow += F(poly([cylPt(DOOR[0] + 2, ZP + 1, RR + 0.25), cylPt(DOOR[0] + 5, ZP + 1, RR + 0.25), cylPt(DOOR[0] + 9, DZ - 1, RR + 0.25), cylPt(DOOR[0] + 6, DZ - 1, RR + 0.25)]), '#ffffff', 0.3);
  let fr = line([cylPt(mid, ZP, RR + 0.3), cylPt(mid, DZ, RR + 0.3)]) + ' ' + cylArc(DOOR[0], DOOR[1], DZ, RR + 0.3, 6);
  fr += ' ' + line([cylPt(DOOR[0], ZP, RR + 0.3), cylPt(DOOR[0], DZ, RR + 0.3)]) + ' ' + line([cylPt(DOOR[1], ZP, RR + 0.3), cylPt(DOOR[1], DZ, RR + 0.3)]);
  rotLow += S(fr, NAVY, 1);
  rotLow += S(line([cylPt(mid - 1.6, 11, RR + 0.4), cylPt(mid - 1.6, 17, RR + 0.4)]) + ' ' + line([cylPt(mid + 1.6, 11, RR + 0.4), cylPt(mid + 1.6, 17, RR + 0.4)]), '#c3c9d6', 0.9);
  // auvent : demi-lune blanche en saillie, liseré cyan
  const th0 = DOOR[0] - 5, th1 = DOOR[1] + 5, za = DZ + 3;
  const out = [], inn = [];
  for (let i = 0; i <= 8; i++) { const th = th0 + ((th1 - th0) * i) / 8; out.push(cylPt(th, za, RR + 7)); inn.push(cylPt(th, za, RR)); }
  const lip = [...out.map(([x, y]) => [x, y, za - 1.6]), ...out.slice().reverse()];
  rotLow += F(poly([...inn.map(([x, y]) => [x, y, za - 7]), ...inn.slice().reverse().map(([x, y]) => [x, y, za - 1.6])]), '#24305e', 0.08); // ombre sur le mur
  rotLow += F(poly(lip), '#e8ebf3');
  rotLow += F(poly([...out.map(([x, y]) => [x, y, za - 1.6]), ...out.slice().reverse().map(([x, y]) => [x, y, za - 0.6])]), CYAN);
  rotLow += F(poly([...inn, ...out.slice().reverse()]), '#ffffff');
}

/* ───────────── aile du labo ───────────── */
const L = onY(WY1), Rt = onX(WX1);
let wing = '';
wing += F(L(R(WX0, WX1, ZP, ZA)), WALL_L) + F(Rt(R(WY0, WY1, ZP, ZA)), WALL_R);
wing += F(L(R(WX0, WX1, ZP, ZP + 4.5)), '#e3e5ef') + F(Rt(R(WY0, WY1, ZP, ZP + 4.5)), '#cfd3e2');
wing += S(line([[WX0, WY1, ZP + 4.5], [WX1, WY1, ZP + 4.5], [WX1, WY0, ZP + 4.5]]), '#ffffff', 0.7, 0.9);
// grande baie du labo (face +y) : serveurs à diodes cyan, écran « réseau de neurones »
{
  const u0 = 2, u1 = 50, z0 = 9, z1 = 29.5, t = 1.4;
  wing += F(L([[u0, z0], [u0 + t, z0 + t], [u0 + t, z1], [u0, z1]]), '#d3d7e6');
  wing += F(L([[u0, z0], [u1, z0], [u1, z0 + t], [u0 + t, z0 + t]]), '#ffffff');
  const g0 = u0 + t, gz0 = z0 + t;
  wing += F(L(R(g0, u1, gz0, z1)), lin('lab', [[0, '#93bdfd'], [1, '#6a96ec']]));
  for (const [a, b] of [[g0 + 2, g0 + 8], [g0 + 9.5, g0 + 15.5]]) {
    wing += F(L(R(a, b, gz0, z1 - 3)), '#2b3566', 0.85);
    let leds = '';
    for (let zz = gz0 + 2.5; zz < z1 - 5; zz += 2.6) leds += lnY(WY1)([[a + 1.2, zz], [b - 1.2, zz]]) + ' ';
    wing += S(leds.trim(), CYAN_L, 0.7, 0.95);
  }
  {
    const a = g0 + 19, b = g0 + 37, zs0 = gz0 + 6.5, zs1 = z1 - 2.5; // écran mural
    wing += F(L(R(a - 0.8, b + 0.8, zs0 - 0.8, zs1 + 0.8)), '#26315f');
    wing += F(L(R(a, b, zs0, zs1)), lin('screen', [[0, '#14366b'], [1, '#0e2a57']]));
    const nodes = [[0.14, 0.3], [0.14, 0.72], [0.47, 0.18], [0.47, 0.52], [0.47, 0.85], [0.84, 0.5]];
    const N = nodes.map(([p, q]) => [a + (b - a) * p, zs0 + (zs1 - zs0) * q]);
    let links = '';
    for (const i of [0, 1]) for (const j of [2, 3, 4]) links += lnY(WY1)([N[i], N[j]]) + ' ';
    for (const j of [2, 3, 4]) links += lnY(WY1)([N[j], N[5]]) + ' ';
    wing += S(links.trim(), CYAN, 0.5, 0.9);
    for (const n of N) { const p = P(n[0], WY1, n[1]); wing += dot(p, 1.25, CYAN_L) + dot(p, 0.55, '#ffffff'); }
    wing += F(L(R(a - 2, b + 2, gz0 + 4.5, gz0 + 5.6)), '#f1f3f9', 0.85); // bureau
  }
  for (const [a, w] of [[0.08, 0.06], [0.58, 0.12], [0.76, 0.04]]) { // reflets
    const uc = g0 + (u1 - g0) * a, ww = (u1 - g0) * w;
    wing += F(L([[uc, gz0], [uc + ww, gz0], [Math.min(uc + ww + (z1 - gz0), u1), z1], [Math.min(uc + (z1 - gz0), u1), z1]]), '#ffffff', 0.2);
  }
  let mu = '';
  for (const u of [g0 + 17.2, g0 + 33]) mu += lnY(WY1)([[u, gz0], [u, z1]]) + ' ';
  wing += S(mu + lnY(WY1)([[g0, z1 - 0.4], [u1, z1 - 0.4]]), NAVY, 1.1);
}
// face +x : enseigne étincelles (panneau blanc en saillie)
{
  const u0 = -33, u1 = -2, v0 = 6.5, v1 = 30.5, dep = 1.8;
  const shape = rr2(u0, v0, u1, v1, 4.4);
  const f0 = (pts) => pts.map(([u, v]) => P(WX1, u, v)), f1 = (pts) => pts.map(([u, v]) => P(WX1 + dep, u, v));
  wing += F(scr(f0(shape.map(([u, v]) => [u - 1.4, v - 1.8]))), '#1d2a5c', 0.12);
  wing += F(scr(hull([...f0(shape), ...f1(shape)])), '#c9cee0');
  wing += F(scr(f1(shape)), lin('panel', [[0, '#ffffff'], [1, '#eef0f8']]));
  wing += S(scr(f1(rr2(u0 + 0.7, v0 + 0.7, u1 - 0.7, v1 - 0.7, 3.7))), '#ffffff', 0.8, 0.9);
  // grande étincelle en haut à gauche + petite en bas à droite, disposées comme l'icône du menu
  // (icon-ia.svg) ; u croissant = vers la gauche de l'écran, v = hauteur
  const cu = (u0 + u1) / 2 + 2.4, cv = (v0 + v1) / 2 + 1.1, K = 9.8;
  wing += F(scr(f1(sparkle(cu - 0.8, cv - 1, K))), '#127f99', 0.25);
  wing += F(scr(f1(sparkle(cu, cv, K))), lin('star', [[0, '#55d4ee'], [1, CYAN_D]]));
  // facette éclairée en haut à gauche (u > cu = gauche de l'écran, v > cv = haut), côté de la lumière
  wing += F(scr(f1(sparkle(cu, cv, K).filter((_, i) => i <= 10).concat([[cu, cv]]))), '#ffffff', 0.3);
  wing += F(scr(f1(sparkle(u0 + 5.6, v0 + 5.2, 4.1))), CYAN);
  wing += F(scr(f1(sparkle(u0 + 6.4, v1 - 5.4, 2.4))), CYAN, 0.6);
}
// ombre sous l'acrotère, arête avant adoucie
wing += F(L(R(WX0, WX1, ZA - 6, ZA)), EAVE) + F(Rt(R(WY0, WY1, ZA - 6, ZA)), EAVE);
wing += S(line([[WX1, WY1, ZP + 5], [WX1, WY1, ZA]]), '#ffffff', 1, 0.85);
// acrotère bleu nuit (comme le toit-terrasse du bâtiment « Mes BAT » de la référence) + toit
{
  const k = 0.9, tw = 3;
  const b = box(WX0, WY0 - k, ZA, WX1 - WX0 + k, WY1 - WY0 + 2 * k, ZAT - ZA);
  wing += F(b.left, NIGHT_L) + F(b.right, NIGHT_D);
  wing += F(poly([[WX0, WY0 - k, ZAT], [WX1 + k, WY0 - k, ZAT], [WX1 + k, WY1 + k, ZAT], [WX0, WY1 + k, ZAT]]), '#5262a8');
  wing += F(poly([[WX0, WY0 + tw, ZAT], [WX1 - tw, WY0 + tw, ZAT], [WX1 - tw, WY1 - tw, ZAT], [WX0, WY1 - tw, ZAT]]), lin('roof', [[0, '#3f4f93'], [1, '#36447f']], [0, 0, 1, 1]));
  // rebord intérieur (ombre portée de l'acrotère sur le toit) + liserés
  wing += F(poly([[WX0, WY0 + tw, ZAT], [WX1 - tw, WY0 + tw, ZAT], [WX1 - tw, WY0 + tw + 2.2, ZAT], [WX0, WY0 + tw + 2.2, ZAT]]), '#1f2a57', 0.35);
  wing += S(line([[WX0, WY1 + k, ZAT], [WX1 + k, WY1 + k, ZAT], [WX1 + k, WY0 - k, ZAT]]), '#8d9ad6', 1.1, 0.95);
  wing += S(line([[WX0, WY1 - tw, ZAT], [WX1 - tw, WY1 - tw, ZAT], [WX1 - tw, WY0 + tw, ZAT]]), '#5d6db3', 0.6, 0.9);
  // lanterneau vitré
  const lx = 6, ly = -30, lw = 18, ld = 9, lh = 2.4;
  wing += cube(lx, ly, ZAT, lw, ld, lh, { lit: '#e8ebf3', dark: '#cfd4e2', top: lin('sky', [[0, '#cfe3ff'], [1, '#8db4f3']], [0, 0, 1, 1]) });
  wing += F(poly([[lx + 2, ly + 1.5, ZAT + lh], [lx + 6, ly + 1.5, ZAT + lh], [lx + 6, ly + ld - 1.5, ZAT + lh], [lx + 2, ly + ld - 1.5, ZAT + lh]]), '#ffffff', 0.35);
}

/* ───────────── rotonde : partie haute, couronne lumineuse, corniche ───────────── */
let rotHigh = rotWall(ZAT, ZW);
{
  // couronne de panneaux lumineux cyan (bandeau vitré continu, montants blancs) et son halo
  const z0 = 38.4, z1 = 43.6;
  rotHigh += F(cylPatch(-45, 135, z0 - 2.6, z1 + 1.6, RR + 0.05, 24), CYAN, 0.12);
  rotHigh += F(cylPatch(-45, 135, z0 - 0.8, z1 + 0.8, RR + 0.1, 24), '#e9ecf4');
  rotHigh += F(cylPatch(-45, 135, z0, z1, RR + 0.15, 24), lin('band', [[0, '#bdf3fd'], [0.45, '#5fd6ee'], [1, CYAN]], [0, 0, 1, 0]));
  rotHigh += F(cylPatch(-45, 135, z1 - 1.6, z1, RR + 0.18, 24), '#ffffff', 0.35);
  let mul = '';
  for (let th = -40; th < 135; th += 12) mul += line([cylPt(th, z0, RR + 0.25), cylPt(th, z1, RR + 0.25)]) + ' ';
  rotHigh += S(mul.trim(), '#ffffff', 0.9, 0.95);
}
// corniche (anneau blanc en débord)
{
  const c = cylinder(CX, CY, ZW, RC, ZC - ZW);
  rotHigh += F(c.side, cylGrad('corn', '#ffffff', '#d8dbe8')) + elTop(c.top, '#ffffff');
  rotHigh += S(cylArc(-45, 135, ZC, RC, 24), '#ffffff', 1.1);
  rotHigh += S(cylArc(-45, 135, ZW + 0.2, RC, 24), '#c9cede', 0.6, 0.9);
}

/* ───────────── dôme cyan ───────────── */
let dome = '';
const sph = (th, ph, r = RD) => [CX + r * Math.cos(rad(ph)) * Math.cos(rad(th)), CY + r * Math.cos(rad(ph)) * Math.sin(rad(th)), ZD + r * Math.sin(rad(ph))];
const visible = (th, ph) => Math.cos(rad(ph)) * (Math.cos(rad(th)) + Math.sin(rad(th))) + Math.sin(rad(ph)) > 0.02;
{
  const [cx, cy] = P(CX, CY, ZD);
  const Rs = RD * Math.SQRT2 * 0.866, ry = RD * Math.SQRT2 * 0.5;
  const outline = `M${r1(cx - Rs)} ${r1(cy)} A${r1(Rs)} ${r1(Rs)} 0 0 1 ${r1(cx + Rs)} ${r1(cy)} A${r1(Rs)} ${r1(ry)} 0 0 1 ${r1(cx - Rs)} ${r1(cy)} Z`;
  dome += F(outline, radU('dome', [[0, '#b9f2fc'], [0.28, '#5ad5ef'], [0.62, CYAN], [1, '#168fae']], cx - Rs * 0.38, cy - Rs * 0.52, Rs * 1.32));
  // panneaux : méridiens et parallèles (parties visibles)
  let seams = '';
  const seg = (fn, a0, a1, n) => {
    let cur = [];
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n, [th, ph] = fn(a);
      if (visible(th, ph)) cur.push(sph(th, ph)); else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
    return out.map((c) => line(c)).join(' ');
  };
  for (const ph of [24, 50]) seams += seg((a) => [a, ph], -180, 180, 40) + ' ';
  for (const th of [-15, 20, 95, 125]) seams += seg((a) => [th, a], 0, 88, 11) + ' ';
  dome += S(seams.trim(), '#138aa8', 0.7, 0.45);
  // fente d'observation (bande de largeur constante qui passe par le sommet) + lunette
  const TS = 52, half = 4.2;
  const n0 = [Math.cos(rad(TS)), Math.sin(rad(TS))], tv = [-Math.sin(rad(TS)), Math.cos(rad(TS))];
  const band = (s, ph, r = RD) => {
    const k = Math.sqrt(r * r - s * s);
    return P(CX + k * Math.cos(rad(ph)) * n0[0] + s * tv[0], CY + k * Math.cos(rad(ph)) * n0[1] + s * tv[1], ZD + k * Math.sin(rad(ph)));
  };
  const strip = (sa, sb, r, ph1 = 104) => {
    const a = [], b = [];
    for (let ph = 0; ph <= ph1; ph += 8) { a.push(band(sa, ph, r)); b.push(band(sb, ph, r)); }
    return scr([...a, ...b.reverse()]);
  };
  dome += F(strip(-half, half, RD + 0.15), '#1f2c5c');
  dome += F(strip(half - 1.1, half, RD + 0.2), '#9fe9f8', 0.9); // tranche de la coque, côté éclairé
  {
    const p0 = band(0.4, 30, RD * 0.86), p1 = band(0.4, 58, RD + 2.5);
    dome += S(scr([p0, p1], false), '#c3c9d6', 5.2) + S(scr([p0, p1], false), '#eef1f7', 3.6);
    dome += S(scr([band(0.4, 56, RD + 2.4), band(0.4, 58.5, RD + 2.7)], false), NAVY, 5.4);
  }
  // reflet doux sur le flanc éclairé + liseré clair sur le contour gauche
  const arcPts = (a0, a1, k, step = 6) => { const out = []; for (let a = a0; a <= a1; a += step) out.push([cx + Math.cos(rad(a)) * Rs * k, cy + Math.sin(rad(a)) * Rs * k]); return out; };
  dome += S(scr(arcPts(196, 250, 0.82), false), '#ffffff', 3.2, 0.35);
  dome += S(scr(arcPts(180, 300, (Rs - 0.6) / Rs), false), '#e6fbff', 1.1, 0.8);
  dome += S(cylArc(-45, 135, ZD + 0.6, RD - 0.1, 24), '#168fae', 1.4, 0.45); // pied du dôme
}

/* ───────────── antenne parabolique (toit de l'aile) ───────────── */
function dish(x, y, z) {
  let s = '';
  s += cube(x - 4.5, y - 4.5, z, 9, 9, 2.4, { lit: '#eceef5', dark: '#d3d7e4', top: '#f8f9fc' });
  s += cube(x - 1.2, y - 1.2, z + 2.4, 2.4, 2.4, 9.5, { lit: '#c3c9d6', dark: '#9aa2b4', top: '#d6dbe5' });
  // repère de l'antenne : axe a (vers le ciel, tourné vers l'avant-gauche éclairé)
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
  const a = nrm([-0.12, 0.5, 0.86]);
  const e1 = nrm([a[1], -a[0], 0]);
  const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
  const C = [x - a[0] * 1.5, y - a[1] * 1.5, z + 17];
  const Rd = 13.5, depth = 6;
  const at = (rr, t, dz) => P(C[0] + rr * (Math.cos(t) * e1[0] + Math.sin(t) * e2[0]) + dz * a[0], C[1] + rr * (Math.cos(t) * e1[1] + Math.sin(t) * e2[1]) + dz * a[1], C[2] + rr * (Math.cos(t) * e1[2] + Math.sin(t) * e2[2]) + dz * a[2]);
  const rimP = (rr = Rd, dz = 0, n = 24) => Array.from({ length: n }, (_, i) => at(rr, (i / n) * 2 * Math.PI, dz));
  s += F(scr(hull([...rimP(), ...rimP(Rd * 0.6, -depth * 0.75, 12), at(0, 0, -depth)])), '#aab2c4');      // dos de la coque
  s += F(scr(rimP(Rd + 0.5)), '#eef1f6');                                                                  // lèvre
  const c0 = at(0, 0, 0);
  s += F(scr(rimP(Rd - 0.5)), radU('dish', [[0, '#c9d0de'], [0.55, '#e9edf4'], [1, '#ffffff']], c0[0] - 2.4, c0[1] - 2.8, Rd * 1.5));
  s += S(scr(rimP(Rd * 0.55, 0.05, 32)), '#c9d0de', 0.45, 0.6);
  // bras et source au foyer
  const fz = 10, focus = P(C[0] + a[0] * fz, C[1] + a[1] * fz, C[2] + a[2] * fz);
  let arms = '';
  for (const t of [Math.PI * 0.5, Math.PI * 1.17, Math.PI * 1.83]) { const p = at(Rd - 0.8, t, 0.2); arms += `M${r1(p[0])} ${r1(p[1])} L${r1(focus[0])} ${r1(focus[1])} `; }
  s += S(arms.trim(), '#7d8499', 0.7);
  s += dot(focus, 2.1, NAVY) + dot([focus[0] - 0.5, focus[1] - 0.5], 0.9, CYAN_L);
  s += dot(c0, 1.3, '#b8bfcf');
  return s;
}

/* ───────────── petit robot ───────────── */
function robot(x, y, z = ZP) {
  let s = '';
  const base = P(x, y, z);
  for (let i = 0; i < 4; i++) { const t = 1 - i * 0.18; s += ell([base[0] + 1.6, base[1] + 0.3], 7.2 * t, 3 * t, '#5a4a3a', 0.06); }
  // socle à roulettes (cylindre bleu nuit)
  const c1 = cylinder(x, y, z + 0.4, 3.4, 2.6);
  s += F(c1.side, lin('rob-base', [[0, NIGHT_L], [1, '#26315f']], [0, 0, 1, 0])) + elTop(c1.top, '#4b5ca5');
  // corps : cylindre blanc
  const zb = z + 3, hb = 8.5, rb = 4.3;
  const c2 = cylinder(x, y, zb, rb, hb);
  s += F(c2.side, cylGrad('rob-body', '#ffffff', '#cdd2e2')) + elTop(c2.top, '#ffffff');
  // ceinture cyan + voyant de poitrine
  const belt = (z0, z1) => { const pts = []; for (let th = -45; th <= 135; th += 15) pts.push(P(x + rb * 1.01 * Math.cos(rad(th)), y + rb * 1.01 * Math.sin(rad(th)), z0)); for (let th = 135; th >= -45; th -= 15) pts.push(P(x + rb * 1.01 * Math.cos(rad(th)), y + rb * 1.01 * Math.sin(rad(th)), z1)); return scr(pts); };
  s += F(belt(zb + 1.2, zb + 2.4), CYAN);
  const chest = P(x + rb * Math.cos(rad(45)), y + rb * Math.sin(rad(45)), zb + 5.6);
  s += ell(chest, 1.7, 1.5, '#26315f') + ell(chest, 1.05, 0.95, CYAN_L) + dot([chest[0] - 0.3, chest[1] - 0.3], 0.35, '#ffffff');
  // bras droit (côté ombré) le long du corps
  const shR = P(x + rb + 0.3, y - 0.6, zb + 7), hdR = P(x + rb + 1.6, y - 1.2, zb + 2.6);
  s += S(scr([shR, hdR], false), '#cdd2e2', 2.4) + dot(hdR, 1.3, NIGHT_L);
  // cou + tête : sphère blanche, oreilles cyan, visière bleu nuit, yeux et sourire cyan, antenne
  const hc = P(x, y, zb + hb + 5.2), hr = 5.4;
  s += S(scr([P(x, y, zb + hb - 0.2), P(x, y, zb + hb + 1.4)], false), NIGHT_L, 2.6);
  s += dot(hc, hr, radU('rob-head', [[0, '#ffffff'], [0.55, '#f1f3f9'], [1, '#c3c9d9']], hc[0] - 2, hc[1] - 2.4, hr * 1.6));
  s += ell([hc[0] - hr + 0.2, hc[1] + 0.6], 1.1, 1.8, CYAN_D) + ell([hc[0] + hr - 0.3, hc[1] + 0.4], 1, 1.7, shade(CYAN_D, 0.85));
  const vc = [hc[0] + 0.3, hc[1] + 0.9];
  s += ell(vc, 4.0, 2.7, '#1d2750');
  s += ell([vc[0] - 1.45, vc[1] - 0.1], 0.75, 1.15, CYAN_L) + ell([vc[0] + 1.45, vc[1] - 0.1], 0.75, 1.15, CYAN_L);
  s += S(`M${r1(vc[0] - 1)} ${r1(vc[1] + 1.2)} Q${r1(vc[0])} ${r1(vc[1] + 1.9)} ${r1(vc[0] + 1)} ${r1(vc[1] + 1.2)}`, CYAN_L, 0.45, 0.9);
  s += S(`M${r1(vc[0] - 3)} ${r1(vc[1] - 1.1)} Q${r1(vc[0] - 1.6)} ${r1(vc[1] - 2.3)} ${r1(vc[0] + 0.6)} ${r1(vc[1] - 2.2)}`, '#ffffff', 0.5, 0.35);
  const at0 = [hc[0], hc[1] - hr + 0.4], at1 = [hc[0] + 0.6, hc[1] - hr - 4];
  s += S(scr([at0, at1], false), NIGHT_L, 0.7);
  s += dot(at1, 2.4, CYAN_L, 0.35) + dot(at1, 1.25, CYAN) + dot([at1[0] - 0.35, at1[1] - 0.35], 0.4, '#ffffff');
  // bras gauche (côté éclairé) levé : il salue
  const shL = P(x - 0.6, y + rb + 0.3, zb + 7), elL = P(x - 1, y + rb + 2.6, zb + 10.5), hdL = P(x - 1.6, y + rb + 3.2, zb + 14);
  s += S(scr([shL, elL, hdL], false), '#ffffff', 2.4) + S(scr([shL, elL, hdL], false), '#e3e6ef', 1.2, 0.5) + dot(hdL, 1.35, NIGHT_L);
  return { d: x + y, svg: s, box: bounds(s) };
}

/* ───────────── composition ───────────── */
const roofProps = dish(41, -22, ZAT);
const rob = robot(2, 33);
const items = [
  { d: -1000, svg: ground },
  { d: CX + CY, svg: rotLow + wing + rotHigh + dome + roofProps },
  // tout ce qui est sur la terrasse est posé sur son dessus (z = ZP), pas 2,5 unités dessous
  treeRound(-64, 40, { size: 1, z: ZP }),
  bush(-62, 20, { w: 11, d: 12, h: 9, z: ZP }),
  pottedPlant(-45, 27, { z: ZP, pot: 'square', size: 0.9 }),
  pottedPlant(-18, 27, { z: ZP, pot: 'square', size: 0.9 }),
  rob,
  person(-31, 47, { facing: 'back-right', pose: 'walk', top: '#f59e0b', pants: NIGHT, hairStyle: 'long', hair: '#6b4a2f', z: ZP }),
  pottedPlant(62, 9, { z: ZP, pot: 'round', size: 0.95 }),
  treeCone(64, -52, { size: 0.9, z: ZP }),
];
const cs = contactShadow(`${ID}-cs`, 150, 66, 200, 304, 0.18);
defs.push(cs.defs);
const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// manifeste : labelY = sommet du dôme ; hit = rotonde + dôme + aile.
// Le haut VISIBLE d'une sphère n'est pas son pôle : en projection orthographique, la silhouette est un
// cercle de rayon RD·√2·cos30 (= 1,22 RD) centré sur le centre projeté, soit ≈ 7,5 px au-dessus du pôle.
const domeTop = P(CX, CY, ZD)[1] - RD * Math.SQRT2 * 0.866;
const bb = bounds(F(cylinder(CX, CY, 0, RC, ZC).side, '#000') + F(box(WX0, WY0, 0, WX1 - WX0, WY1 - WY0, ZAT).left, '#000') + F(box(WX0, WY0, 0, WX1 - WX0, WY1 - WY0, ZAT).right, '#000'));
const hit = { x: Math.floor(bb.x - 2), y: Math.floor(domeTop - 2), w: Math.ceil(bb.w + 4), h: Math.ceil(bb.y + bb.h - domeTop + 4) };
const man = { id: ID, title: TITLE, labelY: Math.round(domeTop), hit };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man), { defs: defs.join('').length, ground: ground.length, rotLow: rotLow.length, wing: wing.length, rotHigh: rotHigh.length, dome: dome.length, dish: roofProps.length, robot: rob.svg.length });
