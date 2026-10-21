// Village PEG — « Bannières » : l'imprimerie grand format.
// Atelier à toit monopente bleu nuit (joints debout), GRAND PANNEAU D'AFFICHAGE sur structure métallique
// au-dessus du toit (bannière colorée : coucher de soleil sur les Alpes, comme les bannières de l'espace
// client), porte sectionnelle relevée sur le TRACEUR GRAND FORMAT qui sort une impression, rouleau de bâche
// à moitié déroulé, kakémono à l'entrée, enseigne « image » sur la façade +x.
//   node buildings/bannieres.build.mjs && node tools/lint.mjs buildings/bannieres.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, compose, contactShadow, svgDoc, tint } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, bounds } from '../tools/props.mjs';

const ID = 'bannieres', TITLE = 'Bannières';
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
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${o}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const FE = (d, fill, o) => `<path d="${d}" fill="${fill}" fill-rule="evenodd"${op(o)}/>`;
const S = (d, color, w, o) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z]));
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z]));
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + F(b.top, c.top); };
const gY = (Y, x0, zTop, inner) => { const [a, b] = P(x0, Y, zTop); return `<g transform="matrix(0.866,0.5,0,1,${r1(a)},${r1(b)})">${inner}</g>`; };
const gX = (X, y0, zTop, inner) => { const [a, b] = P(X, y0, zTop); return `<g transform="matrix(0.866,-0.5,0,1,${r1(a)},${r1(b)})">${inner}</g>`; };
const rect = (x, y, w, h, fill, o = {}) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${o.rx ? ` rx="${r1(o.rx)}"` : ''} fill="${fill}"${op(o.op)}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 0.8}"` : ''}/>`;
const circ = (c, r, fill, o) => `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}" fill="${fill}"${op(o)}/>`;
const pth = (pts, close = true) => 'M' + pts.map(([a, b]) => r1(a) + ' ' + r1(b)).join(' L') + (close ? ' Z' : '');

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const ROOF = '#34427e', ROOF_L = '#3f4f93', ROOF_D = '#2a376b';
const WALL_L = lin('wall-l', [[0, '#ffffff'], [1, '#eff0f6']]);
const WALL_R = lin('wall-r', [[0, '#e9ebf3'], [1, '#d9dce9']]);
const GLASS_L = lin('glass-l', [[0, '#b9d8ff'], [0.5, '#93bdfb'], [1, '#6f9ef5']]);
const EAVE = lin('eave', [[0, NAVY, 0.2], [1, NAVY, 0]]);
const WHITE = { lit: '#f7f7fb', dark: '#dfe2ee', top: '#ffffff' };
const IRON = { lit: '#4b5373', dark: '#363d58', top: '#5d6690' };
const STEEL = { lit: '#46559e', dark: '#2a376b', top: '#5566b0' };
const WOOD = { lit: '#d9a066', dark: '#c08549', top: '#e4b47f' };

/** Motif de la bannière (coucher de soleil sur les Alpes), repère local w × h, origine en haut à gauche. */
function bannerArt(w, h, tag, { sun = true, logo = true } = {}) {
  // ciel chaud (violet → rose → orangé → or) : la partie visible au-dessus des sommets doit trancher
  // sur le toit bleu nuit, sinon le panneau se fond dans la toiture à l'échelle de la scène
  const sky = lin(`sky-${tag}`, [[0, '#8a7cff'], [0.3, '#ef8aa0'], [0.6, '#f8a86a'], [1, '#f6c95c']]);
  const k = (u, v) => [u * w, v * h];
  let g = rect(0, 0, w, h, sky);
  if (sun) {
    g += circ(k(0.69, 0.5), h * 0.33, '#fff2c4', 0.28) + circ(k(0.69, 0.5), h * 0.21, '#fff6d6');
  }
  const back = [[0, 1], [0, 0.66], [0.1, 0.5], [0.17, 0.6], [0.3, 0.36], [0.41, 0.6], [0.5, 0.48], [0.6, 0.7], [0.72, 0.44], [0.84, 0.62], [0.93, 0.52], [1, 0.6], [1, 1]];
  g += `<path d="${pth(back.map(([u, v]) => k(u, v)))}" fill="#9d8cf2" fill-opacity="0.9"/>`;
  // neiges éternelles sur les deux plus hauts sommets
  const cap = (u, v, s) => pth([[u, v], [u - 0.035 * s, v + 0.12 * s], [u - 0.012 * s, v + 0.09 * s], [u + 0.005 * s, v + 0.13 * s], [u + 0.022 * s, v + 0.085 * s], [u + 0.038 * s, v + 0.11 * s]].map(([a, b]) => k(a, b)));
  g += `<path d="${cap(0.3, 0.36, 1)} ${cap(0.72, 0.44, 0.85)}" fill="#ffffff"/>`;
  const front = [[0, 1], [0, 0.8], [0.08, 0.7], [0.18, 0.78], [0.27, 0.64], [0.38, 0.82], [0.47, 0.72], [0.56, 0.86], [0.66, 0.68], [0.78, 0.8], [0.88, 0.7], [1, 0.78], [1, 1]];
  g += `<path d="${pth(front.map(([u, v]) => k(u, v)))}" fill="#4a3db8"/>`;
  g += `<path d="${pth([[0, 1], [0, 0.9], [0.22, 0.84], [0.48, 0.91], [0.74, 0.85], [1, 0.9], [1, 1]].map(([u, v]) => k(u, v)))}" fill="#4fb36d"/>`;
  g += `<path d="${pth([[0, 0.9], [0.22, 0.84], [0.48, 0.91], [0.74, 0.85], [1, 0.9]].map(([u, v]) => k(u, v)), false)}" fill="none" stroke="#8fe0a6" stroke-width="${r1(h * 0.025)}"/>`;
  if (logo) { // pastille de marque + deux lignes de texte
    g += rect(w * 0.05, h * 0.14, w * 0.26, h * 0.2, '#ffffff', { rx: h * 0.1, op: 0.92 });
    g += circ([w * 0.05 + h * 0.1, h * 0.24], h * 0.065, '#7c6bff');
    g += rect(w * 0.05 + h * 0.2, h * 0.19, w * 0.13, h * 0.035, '#7c6bff', { rx: h * 0.018 }) + rect(w * 0.05 + h * 0.2, h * 0.255, w * 0.09, h * 0.035, '#c9c3ff', { rx: h * 0.018 });
  }
  return g;
}

/** Points écran du cercle d'extrémité (plan x = cx) d'un cylindre couché le long de x. */
const capPts = (cx, cy, cz, r, n = 28) => { const out = []; for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI; out.push(P(cx, cy + r * Math.cos(t), cz + r * Math.sin(t))); } return out; };
function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Rouleau couché le long de x (de x0 à x1), extrémité +x visible avec sa spirale et son mandrin. */
function rollX(x0, x1, yc, zc, r, tag, c = { lit: '#ffffff', mid: '#eceef6', dark: '#cfd3e2', edge: null }) {
  const body = hull([...capPts(x0, yc, zc, r), ...capPts(x1, yc, zc, r)]);
  const [ta, tb] = P((x0 + x1) / 2, yc, zc + r), [ba, bb] = P((x0 + x1) / 2, yc + r * 0.7, zc - r * 0.7);
  let s = F(pth(body), lin(`roll-${tag}`, [[0, c.lit], [0.55, c.mid], [1, c.dark]], [ta, tb - 0.5, ba, bb + 0.5], true));
  if (c.edge) { // liseré imprimé visible sur le bord du rouleau (dernier tour de bâche)
    const e = hull([...capPts(x1 - 2.2, yc, zc, r + 0.05), ...capPts(x1 - 0.2, yc, zc, r + 0.05)]);
    s += F(pth(e), c.edge, 0.9);
  }
  const cap = capPts(x1, yc, zc, r);
  s += F(pth(cap), '#f3f4f9');
  let sp = '';
  for (const k of [0.78, 0.58, 0.4]) sp += pth(capPts(x1 + 0.01, yc, zc, r * k, 22)) + ' ';
  s += S(sp.trim(), '#d3d7e4', 0.35);
  s += F(pth(capPts(x1 + 0.02, yc, zc, r * 0.26, 18)), '#c99a63') + F(pth(capPts(x1 + 0.03, yc, zc, r * 0.15, 14)), '#6b4c33');
  s += S(pth(cap.slice(16, 25), false), '#ffffff', 0.5, 0.9);
  return s;
}

/* ───────────── géométrie ───────────── */
const ZG = 2.5;                       // dessus de la terrasse
const X0 = -48, X1 = 40, Y0 = -34, Y1 = 18;
const H = 42, RISE = 9;               // toit monopente : bas à l'avant (y = Y1), haut à l'arrière
const OV = 3.2, T = 3.4;              // débord, épaisseur de la couverture
const ZP = ZG + 5;                    // soubassement
const TX0 = -66, TX1 = 58, TY0 = -52, TY1 = 46;
const roofZ = (y) => H + (RISE * (Y1 - y)) / (Y1 - Y0); // dessous de la couverture au droit des murs
const fF = onY(Y1), fR = onX(X1);

/* ───────────── sol ───────────── */
let ground = '';
{
  const ter = box(TX0, TY0, 0, TX1 - TX0, TY1 - TY0, ZG);
  ground += F(ter.right, '#d3d6e3') + F(ter.left, '#e4e6ef') + F(ter.top, lin('ter', [[0, '#f8f8fb'], [1, '#eff0f5']]));
  ground += S(line([[TX0, TY1, ZG], [TX1, TY1, ZG], [TX1, TY0, ZG]]), '#ffffff', 1, 0.95);
  let j = '';
  for (let x = TX0 + 15.5; x < TX1 - 2; x += 15.5) j += line([[x, Y1 + 0.6, ZG], [x, TY1, ZG]]) + ' ';
  for (let y = Y1 + 9.5; y < TY1 - 2; y += 9.5) j += line([[TX0, y, ZG], [TX1, y, ZG]]) + ' ';
  for (let y = TY0 + 13; y < Y1; y += 13) j += line([[X1 + 0.6, y, ZG], [TX1, y, ZG]]) + ' ';
  ground += S(j.trim(), '#e1e3eb', 0.5);
  // marquage de quai jaune devant la porte sectionnelle
  ground += F(poly([[-5, Y1 + 1, ZG], [31, Y1 + 1, ZG], [31, Y1 + 2.2, ZG], [-5, Y1 + 2.2, ZG]]), '#f6c95c', 0.85);
  const sh = (k, o) => F(poly([[X1, Y1, ZG], [X1 + k, Y1 - k, ZG], [X1 + k, Y0 - k, ZG], [X0 + k, Y0 - k, ZG], [X0, Y0, ZG], [X1, Y0, ZG]].map(([x, y, z]) => [Math.min(x, TX1), Math.max(y, TY0), z])), '#5a4a3a', o);
  ground += sh(19, 0.04) + sh(12, 0.05) + sh(5.5, 0.06);
  ground += F(poly([[X0, Y1, ZG], [X1, Y1, ZG], [X1 + 2.2, Y1 + 2.2, ZG], [X0, Y1 + 2.2, ZG]]), '#5a4a3a', 0.06);
}

/* ───────────── intérieur de l'atelier (vu par la porte sectionnelle relevée) ───────────── */
const OX0 = -4, OX1 = 30, OZ1 = 35.5;   // ouverture de la porte sectionnelle
let inside = '';
{
  const zf = ZG + 0.2;
  // fond, sol béton qui s'assombrit vers l'intérieur (l'atelier est dans la pénombre : la machine ressort)
  inside += F(poly([[OX0 - 30, Y1 - 40, zf], [OX1, Y1 - 40, zf], [OX1, Y1 - 40, H], [OX0 - 30, Y1 - 40, H]]), '#b4b9cd');
  inside += F(poly([[OX0 - 30, Y1 - 40, zf], [OX0 - 30, Y1, zf], [OX0 - 30, Y1, H], [OX0 - 30, Y1 - 40, H]]), '#a9afc4');
  const [fa, fb] = P(OX0, Y1, zf), [fc, fd] = P(OX0 - 22, Y1 - 22, zf);
  inside += F(poly([[OX0 - 30, Y1 - 40, zf], [OX1, Y1 - 40, zf], [OX1, Y1, zf], [OX0 - 30, Y1, zf]]), lin('in-floor', [[0, '#d9dce8'], [1, '#a9afc5']], [fa, fb, fc, fd], true));
  // TRACEUR GRAND FORMAT : pieds, rouleau d'alimentation, flasques bleu nuit, corps blanc, fente, écran
  const PX0 = -6, PX1 = 14, PY0 = 4, PY1 = 10, PZ0 = 13, PZ1 = 19, CW = 2.8;
  const cap = { lit: '#3d4466', dark: '#2b2f45', top: '#4f5a85' };
  for (const x of [PX0 - CW / 2, PX1 + CW / 2]) {
    inside += cube(x - 0.9, PY0 - 0.6, zf, 1.8, PY1 - PY0 + 1.2, 1, cap);
    inside += cube(x - 0.6, (PY0 + PY1) / 2 - 0.6, zf + 1, 1.2, 1.2, PZ0 - zf - 1, cap);
  }
  inside += cube(PX0, (PY0 + PY1) / 2 - 0.3, zf + 4.5, PX1 - PX0, 0.6, 0.8, cap); // traverse
  inside += rollX(PX0 + 0.4, PX1 - 0.4, PY0 + 1.4, PZ1 + 1.2, 2.1, 'feed');      // rouleau de média (à l'arrière)
  inside += cube(PX0 - CW, PY0 - 0.5, PZ0 - 1, CW, PY1 - PY0 + 1, PZ1 - PZ0 + 2.6, cap); // flasque gauche
  inside += cube(PX0, PY0, PZ0, PX1 - PX0, PY1 - PY0, PZ1 - PZ0, { lit: '#f6f7fb', dark: '#d7dbe8', top: '#ffffff' });
  inside += F(poly([[PX0, PY1 - 2.6, PZ1 + 0.02], [PX1, PY1 - 2.6, PZ1 + 0.02], [PX1, PY1 - 0.6, PZ1 + 0.02], [PX0, PY1 - 0.6, PZ1 + 0.02]]), '#5a6487', 0.75); // capot fumé
  inside += F(onY(PY1 + 0.02)(R(PX0 + 0.8, PX1 - 0.8, PZ0 + 0.6, PZ0 + 1.5)), '#2b2f45');  // fente de sortie
  inside += S(line([[PX0 + 0.2, PY1 + 0.03, PZ1 - 0.4], [PX1 - 0.2, PY1 + 0.03, PZ1 - 0.4]]), '#ffffff', 0.5, 0.9);
  inside += cube(PX1, PY0 - 0.5, PZ0 - 1, CW, PY1 - PY0 + 1, PZ1 - PZ0 + 2.6, cap); // flasque droite
  inside += F(onY(PY1 + 0.52)(R(PX1 + 0.4, PX1 + CW - 0.4, PZ0 + 3, PZ0 + 5.6)), '#9ad1ff'); // écran de commande
  inside += F(onY(PY1 + 0.53)(R(PX1 + 0.7, PX1 + 1.5, PZ0 + 4.4, PZ0 + 5)), '#7c6bff');
  // impression qui sort par la fente, descend devant le bâti et s'enroule au sol
  {
    const sx0 = PX0 + 1.5, sx1 = PX1 - 1.5, sy = PY1 + 0.45, zt = PZ0 + 1.1, zb = zf + 2.8;
    inside += gY(sy, sx0, zt, bannerArt(sx1 - sx0, zt - zb, 'print', { logo: false }));
    inside += F(poly([[sx0, sy, zt], [sx1, sy, zt], [sx1, sy, zt - 1.1], [sx0, sy, zt - 1.1]]), '#1d2033', 0.2);
    // l'impression s'enroule au sol : on voit le dos blanc du média, liseré imprimé au bord
    inside += rollX(sx0, sx1, sy + 1.7, zf + 1.75, 1.7, 'curl', { lit: '#ffffff', mid: '#eef0f6', dark: '#cfd3e2', edge: '#ef8aa0' });
  }
  // l'imprimeur, à côté de sa machine
  inside += person(22, 14.2, { z: zf, facing: 'left', pose: 'stand', top: '#14b8a6', hairStyle: 'short', hair: '#2a1d16', rim: false }).svg;
  // porte sectionnelle relevée (panneaux visibles en haut de l'ouverture), rails
  const zr = OZ1 - 3.6;
  inside += F(poly([[OX0, Y1 - 2.4, zr], [OX1, Y1 - 2.4, zr], [OX1, Y1 - 2.4, OZ1], [OX0, Y1 - 2.4, OZ1]]), lin('door', [[0, '#c3c9d6'], [1, '#e1e4ee']]));
  inside += S(line([[OX0, Y1 - 2.4, zr + 1.2], [OX1, Y1 - 2.4, zr + 1.2]]) + ' ' + line([[OX0, Y1 - 2.4, zr + 2.4], [OX1, Y1 - 2.4, zr + 2.4]]), '#a9b0c3', 0.4);
  inside += F(poly([[OX0, Y1 - 2.4, zr - 0.6], [OX1, Y1 - 2.4, zr - 0.6], [OX1, Y1 - 2.4, zr], [OX0, Y1 - 2.4, zr]]), '#7d8499');
  inside += F(poly([[OX0, Y1 - 2.4, ZG], [OX0, Y1, ZG], [OX0, Y1, OZ1], [OX0, Y1 - 2.4, OZ1]]), '#d0d3e2'); // tableau gauche
  inside += F(poly([[OX0, Y1 - 2.4, ZG], [OX0 + 1, Y1 - 2.4, ZG], [OX0 + 1, Y1 - 2.4, zr], [OX0, Y1 - 2.4, zr]]), '#9aa2b4'); // rail
}

/* ───────────── murs ───────────── */
let walls = '';
const DX0 = -24, DX1 = -12, DZ1 = ZG + 27;       // porte d'entrée vitrée
const WX0 = -44, WX1 = -30, WZ0 = 15, WZ1 = 33;   // fenêtre
{
  const t = 1.4, gy = Y1 - t;
  walls += F(poly([[DX0, gy, ZG], [DX1, gy, ZG], [DX1, gy, DZ1], [DX0, gy, DZ1]]), NAVY);
  walls += F(poly([[DX0 + 1.4, gy, ZG + 1.4], [DX1 - 1.4, gy, ZG + 1.4], [DX1 - 1.4, gy, DZ1 - 1.4], [DX0 + 1.4, gy, DZ1 - 1.4]]), GLASS_L);
  walls += F(poly([[DX0 + 3, gy, ZG + 4], [DX0 + 5.6, gy, ZG + 4], [DX0 + 9, gy, DZ1 - 2.5], [DX0 + 6.4, gy, DZ1 - 2.5]]), '#ffffff', 0.3);
  walls += F(poly([[DX1 - 3.2, gy, 12], [DX1 - 2.4, gy, 12], [DX1 - 2.4, gy, 21], [DX1 - 3.2, gy, 21]]), '#e8eaf2');
  walls += F(poly([[DX0, gy, ZG], [DX0, Y1, ZG], [DX0, Y1, DZ1], [DX0, gy, DZ1]]), '#d5d8e6');
  // fenêtre : on devine des rouleaux de bâche colorés derrière
  walls += F(poly([[WX0, gy, WZ0], [WX1, gy, WZ0], [WX1, gy, WZ1], [WX0, gy, WZ1]]), GLASS_L);
  walls += F(onY(gy - 0.01)(R(WX0 + 1, WX1 - 1, WZ0 + 1, WZ0 + 4.5)), '#7c6bff', 0.35) + F(onY(gy - 0.01)(R(WX0 + 1, WX1 - 1, WZ0 + 5, WZ0 + 8.5)), '#ef8aa0', 0.35);
  walls += F(poly([[WX0 + 2, gy, WZ0], [WX0 + 4.5, gy, WZ0], [WX0 + 8, gy, WZ1], [WX0 + 5.5, gy, WZ1]]), '#ffffff', 0.32);
  walls += F(poly([[(WX0 + WX1) / 2 - 0.5, gy, WZ0], [(WX0 + WX1) / 2 + 0.5, gy, WZ0], [(WX0 + WX1) / 2 + 0.5, gy, WZ1], [(WX0 + WX1) / 2 - 0.5, gy, WZ1]]) + poly([[WX0, gy, WZ1 - 1], [WX1, gy, WZ1 - 1], [WX1, gy, WZ1], [WX0, gy, WZ1]]) + poly([[WX0, gy, WZ0], [WX0 + 1, gy, WZ0], [WX0 + 1, gy, WZ1], [WX0, gy, WZ1]]) + poly([[WX0, gy, WZ0], [WX1, gy, WZ0], [WX1, gy, WZ0 + 1], [WX0, gy, WZ0 + 1]]), NAVY);
  walls += F(poly([[WX0, gy, WZ0], [WX0, Y1, WZ0], [WX0, Y1, WZ1], [WX0, gy, WZ1]]), '#d5d8e6');
  walls += F(poly([[WX0, gy, WZ0], [WX1, gy, WZ0], [WX1, Y1, WZ0], [WX0, Y1, WZ0]]), '#ffffff');
}
walls += FE(fF(R(X0, X1, ZG, H)) + ' ' + fF(R(OX0, OX1, ZG, OZ1)) + ' ' + fF(R(DX0, DX1, ZG, DZ1)) + ' ' + fF(R(WX0, WX1, WZ0, WZ1)), WALL_L);
// petite fenêtre haute à l'arrière de la façade +x : vitrage en retrait vu par le percement
const SW = { y0: -31.5, y1: -23.5, z0: 21, z1: 33 };
{
  const t = 1.2, gx = X1 - t;
  walls += F(poly([[gx, SW.y0, SW.z0], [gx, SW.y1, SW.z0], [gx, SW.y1, SW.z1], [gx, SW.y0, SW.z1]]), lin('glass-r', [[0, '#8fb4f0'], [1, '#5579c6']]));
  walls += F(poly([[gx, SW.y0 + 4.4, SW.z0], [gx, SW.y0 + 6, SW.z0], [gx, SW.y0 + 3, SW.z1], [gx, SW.y0 + 1.4, SW.z1]]), '#ffffff', 0.25);
  walls += F(poly([[gx, (SW.y0 + SW.y1) / 2 - 0.45, SW.z0], [gx, (SW.y0 + SW.y1) / 2 + 0.45, SW.z0], [gx, (SW.y0 + SW.y1) / 2 + 0.45, SW.z1], [gx, (SW.y0 + SW.y1) / 2 - 0.45, SW.z1]]), NAVY);
  walls += F(poly([[gx, SW.y0, SW.z0], [X1, SW.y0, SW.z0], [X1, SW.y0, SW.z1], [gx, SW.y0, SW.z1]]), '#e3e5ef'); // tableau (face +y)
  walls += F(poly([[gx, SW.y0, SW.z0], [gx, SW.y1, SW.z0], [X1, SW.y1, SW.z0], [X1, SW.y0, SW.z0]]), '#f4f5f9'); // appui
}
walls += FE(poly([[X1, Y0, ZG], [X1, Y1, ZG], [X1, Y1, H], [X1, Y0, H + RISE]]) + ' ' + fR(R(SW.y0, SW.y1, SW.z0, SW.z1)), WALL_R);
// soubassement
walls += F(fF(R(X0, DX0, ZG, ZP)) + fF(R(DX1, OX0, ZG, ZP)) + fF(R(OX1, X1, ZG, ZP)), '#e3e5ef') + F(fR(R(Y0, Y1, ZG, ZP)), '#cfd3e2');
walls += S(line([[X0, Y1, ZP], [DX0, Y1, ZP]]) + ' ' + line([[DX1, Y1, ZP], [OX0, Y1, ZP]]) + ' ' + line([[OX1, Y1, ZP], [X1, Y1, ZP], [X1, Y0, ZP]]), '#ffffff', 0.8, 0.9);
walls += cube(DX0 - 1, Y1, ZG, DX1 - DX0 + 2, 1.6, 0.8, { lit: '#e3e5ef', dark: '#cfd3e2', top: '#f4f5f9' });
// encadrement de la porte sectionnelle (bandeau bleu nuit + chasse-roues jaunes)
walls += F(fF(R(OX0 - 1.4, OX1 + 1.4, OZ1, OZ1 + 2.2)), NAVY) + F(fF(R(OX0 - 1.4, OX0, ZG, OZ1)) + fF(R(OX1, OX1 + 1.4, ZG, OZ1)), '#3f4f93');
walls += cube(OX0 - 1.2, Y1, ZG, 1.6, 1.6, 5, { lit: '#f6c95c', dark: '#e0ad3a', top: '#f9dc8e' }) + cube(OX1 - 0.4, Y1, ZG, 1.6, 1.6, 5, { lit: '#f6c95c', dark: '#e0ad3a', top: '#f9dc8e' });
// ombre de l'avant-toit
walls += F(fF(R(X0, X1, H - 7, H)), EAVE) + F(poly([[X1, Y0, H + RISE - 7], [X1, Y1, H - 7], [X1, Y1, H], [X1, Y0, H + RISE]]), EAVE);
walls += S(line([[X1, Y1, ZP], [X1, Y1, H - 0.4]]), '#ffffff', 1, 0.95);
// petit auvent au-dessus de l'entrée + applique
{
  const ax0 = DX0 - 2.5, ax1 = DX1 + 2.5, az = DZ1 + 2.2;
  walls += F(fF(R(ax0, ax1, az - 5.5, az)), NAVY, 0.12);
  const b = box(ax0, Y1, az, ax1 - ax0, 6, 2);
  walls += F(b.right, ROOF_D) + F(b.left, ROOF) + F(b.top, ROOF_L);
  walls += S(line([[ax0, Y1 + 6, az + 2], [ax1, Y1 + 6, az + 2], [ax1, Y1, az + 2]]), tint(ROOF, 0.45), 0.8, 0.9);
}

/* enseigne « image » sur la façade +x */
let sign = '';
{
  const y0 = 3.5, w = 23, zt = 35, h = 19, t = 1.2, xs = X1 + t;
  sign += gX(X1, y0, zt, rect(1.6, 1.6, w, h, NAVY, { rx: 3, op: 0.13 }));
  sign += F(poly([[X1, y0, zt], [xs, y0, zt], [xs, y0 - w, zt], [X1, y0 - w, zt]]), '#ffffff');
  sign += F(poly([[X1, y0, zt - h], [xs, y0, zt - h], [xs, y0, zt], [X1, y0, zt]]), '#e3e5ef');
  let g = rect(0, 0, w, h, lin('sign', [[0, '#fbfbfe'], [1, '#e9ebf3']]), { rx: 3 });
  // accent de l'enseigne pris dans la palette du village : framboise (rappel du kakémono)
  g += rect(3.4, 3, w - 6.8, h - 6, 'none', { rx: 1.8, stroke: '#d9467a', sw: 1.5 });
  g += `<path d="M5.6 13.1 L9.6 9 L12.7 12 L14.9 10 L17.6 12.8" fill="none" stroke="#d9467a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  g += circ([15.5, 6.6], 1.35, '#f59e0b');
  sign += gX(xs, y0, zt, g);
}

/* ───────────── toit monopente (joints debout) ───────────── */
let roof = '';
const rx0 = X0 - OV, rx1 = X1 + OV, ry0 = Y0 - OV, ry1 = Y1 + OV;
const zTop = (y) => roofZ(y) + T;
{
  const zf0 = roofZ(ry1), zb0 = roofZ(ry0);
  // rive avant (+y) et rive latérale (+x) : épaisseur de la couverture
  roof += F(poly([[rx0, ry1, zf0], [rx1, ry1, zf0], [rx1, ry1, zf0 + T], [rx0, ry1, zf0 + T]]), lin('rive', [[0, '#42519b'], [1, ROOF]]));
  roof += F(poly([[rx1, ry0, zb0], [rx1, ry1, zf0], [rx1, ry1, zf0 + T], [rx1, ry0, zb0 + T]]), ROOF_D);
  // pan : plus clair vers l'avant (vers la lumière)
  const [pa, pb] = P(rx0, ry0, zb0 + T), [pc, pd] = P(rx0, ry1, zf0 + T);
  roof += F(poly([[rx0, ry0, zb0 + T], [rx1, ry0, zb0 + T], [rx1, ry1, zf0 + T], [rx0, ry1, zf0 + T]]), lin('pan', [[0, '#3a4987'], [1, '#4a5aa3']], [pa, pb, pc, pd], true));
  // joints debout de la tôle (le long de la pente)
  let js = '', jh = '';
  for (let x = rx0 + 7; x < rx1 - 2; x += 7.2) {
    js += line([[x, ry0, zb0 + T + 0.05], [x, ry1, zf0 + T + 0.05]]) + ' ';
    jh += line([[x + 0.55, ry0, zb0 + T + 0.05], [x + 0.55, ry1, zf0 + T + 0.05]]) + ' ';
  }
  roof += S(js.trim(), '#2c3a72', 0.7, 0.75) + S(jh.trim(), '#7482c4', 0.45, 0.6);
  // liserés clairs
  roof += S(line([[rx0, ry1, zf0 + T], [rx1, ry1, zf0 + T], [rx1, ry0, zb0 + T]]), tint(ROOF, 0.5), 1.2, 0.95);
  roof += S(line([[rx0, ry1, zf0 + 0.3], [rx1, ry1, zf0 + 0.3]]), tint(ROOF, 0.22), 0.6, 0.55);
}

/* ───────────── panneau d'affichage sur structure ───────────── */
let bill = '';
const YB = -22, XB0 = -50, BW = 70, XB1 = XB0 + BW, ZB0 = 66, BH = 25, ZB1 = ZB0 + BH, BD = 2.2;
{
  // pieds (derrière le panneau) et croisillons
  const posts = [XB0 + 7, XB0 + BW / 2, XB1 - 7];
  let br = '';
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i] + 1, b = posts[i + 1] - 1, ya = YB - BD - 0.4, za = zTop(ya) + 0.5;
    br += line([[a, ya, za], [b, ya, ZB0 - 0.5]]) + ' ' + line([[a, ya, ZB0 - 0.5], [b, ya, za]]) + ' ';
  }
  for (const x of posts) {
    const yp = YB - BD - 1.2, zb = zTop(yp + 2);
    bill += F(poly([[x + 2, yp, zb], [x + 5.5, yp - 3.5, zb], [x + 5.5, yp - 1.5, zb], [x + 2, yp + 2, zb]]), '#1d2550', 0.22);
    bill += cube(x - 1.25, yp - 0.2, zb - 0.5, 2.5, 2.5, ZB0 - zb + 0.5, STEEL);
  }
  bill += S(br.trim(), '#46559e', 0.8);
  // tranches du panneau (dessus éclairé, côté +x ombré)
  bill += F(poly([[XB1, YB - BD, ZB0], [XB1, YB, ZB0], [XB1, YB, ZB1], [XB1, YB - BD, ZB1]]), ROOF_D);
  bill += F(poly([[XB0, YB - BD, ZB1], [XB1, YB - BD, ZB1], [XB1, YB, ZB1], [XB0, YB, ZB1]]), '#5566b0');
  // face avant : cadre clair + bannière
  let g = rect(0, 0, BW, BH, '#f4f5fa');
  g += rect(0, 0, BW, BH, 'none', { stroke: '#3f4f93', sw: 0.8 });
  g += `<g transform="translate(1.6 1.6)">${bannerArt(BW - 3.2, BH - 3.2, 'bill')}</g>`;
  // lumière des projecteurs sur la bannière
  for (const u of [BW * 0.17, BW * 0.5, BW * 0.83]) g += `<path d="M${r1(u - 1.2)} 1.6 L${r1(u + 1.2)} 1.6 L${r1(u + 9)} 15 L${r1(u - 9)} 15 Z" fill="#fff6d6" fill-opacity="0.18"/>`;
  bill += gY(YB, XB0, ZB1, g);
  bill += S(line([[XB0, YB, ZB1], [XB1, YB, ZB1], [XB1, YB - BD, ZB1]]), '#8c9ad6', 0.6, 0.9);
  // passerelle d'entretien sous le panneau
  bill += cube(XB0, YB, ZB0 - 1.6, BW, 3, 1.1, { lit: '#9aa2b4', dark: '#7d8499', top: '#c3c9d6' });
  let gr = '';
  for (let x = XB0 + 2; x < XB1; x += 2) gr += line([[x, YB + 0.2, ZB0 - 0.5], [x, YB + 2.8, ZB0 - 0.5]]) + ' ';
  bill += S(gr.trim(), '#8a92a6', 0.3, 0.8);
  // projecteurs sur bras (au-dessus du panneau)
  for (const u of [BW * 0.17, BW * 0.5, BW * 0.83]) {
    const x = XB0 + u;
    bill += S(line([[x, YB - 0.4, ZB1], [x, YB + 4.6, ZB1 + 2.2]]), '#2a376b', 0.7);
    bill += cube(x - 1.1, YB + 3.6, ZB1 + 1.1, 2.2, 2.2, 1.6, { lit: '#3d4466', dark: '#2b2f45', top: '#4b5375' });
    bill += F(onY(YB + 5.81)(R(x - 0.8, x + 0.8, ZB1 + 1.2, ZB1 + 1.8)), '#fff1b8');
  }
}

/* ───────────── accessoires ───────────── */
// kakémono (roll-up) devant le pilier droit
const kakemono = (() => {
  const x0 = 43, x1 = 51, y = 17, zb = ZG + 1.8, zt = ZG + 33;
  let s = '';
  s += `<ellipse cx="${r1(P((x0 + x1) / 2 + 2, y, ZG)[0])}" cy="${r1(P((x0 + x1) / 2 + 2, y, ZG)[1])}" rx="7.5" ry="2.6" fill="#5a4a3a" fill-opacity="0.12"/>`;
  s += S(line([[(x0 + x1) / 2, y - 0.8, zb], [(x0 + x1) / 2, y - 0.8, zt]]), '#7d8499', 0.6);
  s += gY(y, x0, zt, `<rect x="0" y="0" width="${x1 - x0}" height="${r1(zt - zb)}" fill="${lin('kake', [[0, '#7c6bff'], [0.62, '#b25fd0'], [1, '#d9467a']])}"/>` +
    circ([(x1 - x0) / 2, 6.4], 2.6, '#ffffff') + circ([(x1 - x0) / 2, 6.4], 1.3, '#7c6bff') +
    rect(1.4, 11.5, x1 - x0 - 2.8, 1.2, '#ffffff', { rx: 0.6 }) + rect(2.2, 14, x1 - x0 - 4.4, 0.9, '#ffffff', { rx: 0.45, op: 0.8 }) + rect(2.2, 16.2, x1 - x0 - 4.4, 0.9, '#ffffff', { rx: 0.45, op: 0.8 }) +
    `<path d="M0 ${r1(zt - zb)} L0 ${r1(zt - zb - 6)} L2.6 ${r1(zt - zb - 9)} L4.6 ${r1(zt - zb - 7)} L6.2 ${r1(zt - zb - 10)} L8 ${r1(zt - zb - 7.5)} L8 ${r1(zt - zb)} Z" fill="#34427e" fill-opacity="0.55"/>`);
  s += F(poly([[x1, y - 0.2, zb], [x1, y, zb], [x1, y, zt], [x1, y - 0.2, zt]]), '#a33b6a');
  s += cube(x0 - 0.6, y - 0.5, zt, x1 - x0 + 1.2, 0.8, 0.7, IRON);
  s += cube(x0 - 1, y - 1.6, ZG, x1 - x0 + 2, 2.6, 1.8, { lit: '#c3c9d6', dark: '#9aa2b4', top: '#d6dbe5' });
  return { d: 1000 + 47 + 17, svg: s };
})();
// rouleau de bâche à moitié déroulé sur la terrasse
const tarp = (() => {
  const x0 = -46, x1 = -22, yc = 30, r = 4.4, zc = ZG + r;
  let s = '';
  s += F(poly([[x0, yc + 1, ZG], [x1, yc + 1, ZG], [x1 + 5, yc - 4, ZG], [x0 + 5, yc - 4, ZG]]), '#5a4a3a', 0.1);
  // partie déroulée posée au sol, imprimée (vue de dessus)
  const [a, b] = P(x0 + 1, yc + 1, ZG + 0.15);
  const art = bannerArt(x1 - x0 - 2, 13, 'tarp', { sun: true, logo: true });
  s += F(poly([[x0 + 1.4, yc + 1, ZG + 0.1], [x1 - 0.6, yc + 1, ZG + 0.1], [x1 - 0.6 + 1.2, yc + 15.2, ZG + 0.1], [x0 + 1.4 + 1.2, yc + 15.2, ZG + 0.1]]), '#5a4a3a', 0.1);
  s += `<g transform="matrix(0.866,0.5,-0.866,0.5,${r1(a)},${r1(b)})">${art}</g>`;
  s += rollX(x0, x1, yc, zc, r, 'tarp', { lit: '#ffffff', mid: '#eef0f6', dark: '#cfd3e2', edge: '#7c6bff' });
  return { d: 1000 + (x0 + x1) / 2 + yc, svg: s };
})();

/* ───────────── composition ───────────── */
const cs = contactShadow(`${ID}-cs`, 150, 66, 198, 302, 0.18);
defs.push(cs.defs);
const items = [
  { d: -2000, svg: ground },
  { ...treeRound(-72, -6, { size: 1 }), d: -200 },
  treeCone(54, -58, { size: 0.95 }),
  { d: 0, svg: inside + walls + sign + roof + bill },
  kakemono,
  tarp,
  { ...bush(50, -26, { w: 10, d: 14, h: 10, z: ZG }), d: 1024 },
  { ...bush(-58, 18, { w: 11, d: 11, h: 9, z: ZG }), d: 960 },
  { ...person(-6, 34, { z: ZG, facing: 'right', pose: 'walk', top: '#ef4444', hairStyle: 'bun' }), d: 1028 },
];
const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

/* ───────────── manifeste : sommet du panneau, cadre bâtiment + panneau ───────────── */
const shell = F(poly([[XB0, YB - BD, ZB1], [XB1, YB - BD, ZB1], [XB1, YB, ZB1], [XB0, YB, ZB1]]), '#000') +
  F(poly([[XB0, YB, ZB0], [XB1, YB, ZB0], [XB1, YB, ZB1], [XB0, YB, ZB1]]), '#000') +
  F(poly([[rx0, ry1, 0], [rx1, ry1, 0], [rx1, ry1, zTop(ry1)], [rx0, ry1, zTop(ry1)]]), '#000') +
  F(poly([[rx1, ry0, 0], [rx1, ry1, 0], [rx1, ry1, zTop(ry1)], [rx1, ry0, zTop(ry0)]]), '#000') +
  F(poly([[rx0, ry0, zTop(ry0)], [rx1, ry0, zTop(ry0)], [rx1, ry1, zTop(ry1)], [rx0, ry1, zTop(ry1)]]), '#000');
const bb = bounds(shell);
const man = {
  id: ID, title: TITLE, labelY: Math.round(bb.y),
  hit: { x: Math.floor(bb.x - 2), y: Math.floor(bb.y - 2), w: Math.ceil(bb.w + 4), h: Math.ceil(bb.h + 4) },
};
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
