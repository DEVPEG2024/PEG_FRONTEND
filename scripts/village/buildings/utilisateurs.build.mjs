// Village PEG — « Utilisateurs » : la mairie. Corps blanc sur soubassement de pierre, toit en
// croupe d'ardoise (rangs d'ardoises, deux lucarnes), avant-corps à quatre colonnes coiffé d'un
// fronton triangulaire, perron de quatre marches, drapeau tricolore sur mât, enseigne « deux
// silhouettes » sur la face +x, arbres, haies basses, un administré qui monte les marches.
//   node buildings/utilisateurs.build.mjs && node tools/lint.mjs buildings/utilisateurs.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, hip, cylinder, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, bounds } from '../tools/props.mjs';

const ID = 'utilisateurs', TITLE = 'Utilisateurs';
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
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${Math.round(o * 100) / 100}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const S = (d, color, w, o) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
const scr = (pts, close = true) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L') + (close ? ' Z' : '');
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z])); // face +y (éclairée), u = x
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z])); // face +x (ombrée), u = y
const lnY = (Y) => (pts) => line(pts.map(([u, z]) => [u, Y, z]));
const lnX = (X) => (pts) => line(pts.map(([u, z]) => [X, u, z]));
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + (c.top ? F(b.top, c.top) : ''); };
function rr2(u0, v0, u1, v1, r, n = 4) {
  const pts = [], cs = [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]];
  for (const [cu, cv, a0] of cs) for (let i = 0; i <= n; i++) { const a = rad(a0 + (90 * i) / n); pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  return pts;
}
const circ2 = (cu, cv, r, n = 16, a0 = 0, a1 = 360) => Array.from({ length: n }, (_, i) => { const a = rad(a0 + ((a1 - a0) * i) / (a1 - a0 === 360 ? n : n - 1)); return [cu + r * Math.cos(a), cv + r * Math.sin(a)]; });
function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const LIGHT = (() => { const l = Math.hypot(-0.3, 1); return [-0.3 / l, 1 / l]; })();
const lightT = (nx, ny) => clamp((nx * LIGHT[0] + ny * LIGHT[1] - LIGHT[0]) / (LIGHT[1] - LIGHT[0]), 0, 1);
function cylGrad(name, lit, dark) {
  const stops = [];
  for (let i = 0; i <= 6; i++) {
    const s = -1 + (2 * i) / 6, th = (Math.acos(clamp(s, -1, 1)) * 180) / Math.PI - 45;
    stops.push([r1(i / 6), mix(dark, lit, Math.pow(lightT(Math.cos(rad(th)), Math.sin(rad(th))), 0.8))]);
  }
  return lin(name, stops, [0, 0, 1, 0]);
}

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const SLATE = '#8b93a8', SLATE_D = '#727a90';
const VIOLET = '#7c6bff';
const WALL_L = lin('wall-l', [[0, '#ffffff'], [1, '#f0f1f7']]);
const WALL_R = lin('wall-r', [[0, '#e8eaf3'], [1, '#d8dbe9']]);
const GL_L = lin('glass-l', [[0, '#b6d6ff'], [0.5, '#8fb9fb'], [1, '#6f9ef5']]);
const GL_R = lin('glass-r', [[0, '#88b0f0'], [1, '#5579c6']]);
const EAVE = lin('eave', [[0, NAVY, 0.16], [1, NAVY, 0]]);
const STONE = { lit: '#e3e5ef', dark: '#cfd3e2', top: '#f4f5fa' };
const BAND = { lit: '#f9f9fc', dark: '#dcdfea', top: '#ffffff' };

/* ───────────── géométrie ───────────── */
const X0 = -58, X1 = 40, Y0 = -46, Y1 = 0;   // corps (98 × 46)
const ZB = 8;                                 // dessus du soubassement / du perron
const ZT = 52;                                // haut des murs (corniche au-dessus)
const ZE = 45;                                // dessous de l'entablement du portique
const ZR = ZT + 2;                            // égout du toit (dessus de la corniche)
const PX0 = -28, PX1 = 10, PY1 = 13, PXC = (PX0 + PX1) / 2; // avant-corps à colonnes
const OV = 4, RISE = 25;                      // débord et hauteur du toit
const RX0 = X0 - OV, RX1 = X1 + OV, RY0 = Y0 - OV, RY1 = Y1 + OV;
const RD = RY1 - RY0;
const zSlope = (y) => ZR + (RISE * (RY1 - y)) / (RD / 2); // pan avant du toit (y entre faîtage et égout)
const PR = 11, PXa = PX0 - 2, PXb = PX1 + 2, PYf = PY1 + 1, ZPA = ZR + PR; // fronton
const yMeet = (z) => RY1 - ((z - ZR) * (RD / 2)) / RISE;   // où le pan avant atteint la hauteur z
const SX0 = -74, SX1 = 70, SY0 = -66, SY1 = 58;             // parvis
const ZS = 1.6;                                              // dessus du parvis

const L = onY(Y1), Rt = onX(X1);

/* ───────────── sol : parvis, ombre ───────────── */
let ground = '';
{
  const t = box(SX0, SY0, 0, SX1 - SX0, SY1 - SY0, 1.6);
  ground += F(t.right, '#d8d1c4') + F(t.left, '#e6e1d8') + F(t.top, lin('slab', [[0, '#f7f5f1'], [1, '#efebe4']]));
  ground += S(line([[SX0, SY1, 1.6], [SX1, SY1, 1.6], [SX1, SY0, 1.6]]), '#ffffff', 0.9, 0.85);
  let j = '';
  for (let x = SX0 + 18; x < SX1 - 3; x += 18) j += line([[x, Y1 + 4, 1.6], [x, SY1, 1.6]]) + ' ';
  for (let y = Y1 + 16; y < SY1 - 3; y += 14) j += line([[SX0, y, 1.6], [SX1, y, 1.6]]) + ' ';
  for (let y = SY0 + 16; y < Y1; y += 16) j += line([[X1 + 4, y, 1.6], [SX1, y, 1.6]]) + ' ';
  ground += S(j.trim(), '#ddd6ca', 0.5, 0.7);
  // allée claire vers le perron
  ground += F(poly([[PX0, PYf + 14, 1.6], [PX1, PYf + 14, 1.6], [PX1 + 6, SY1, 1.6], [PX0 - 6, SY1, 1.6]]), '#f3efe8');
  // ombre portée douce (vers la droite de l'écran)
  const foot = [[X0 - 3, Y0 - 3], [X1 + 3, Y0 - 3], [X1 + 3, Y1 + 3], [X0 - 3, Y1 + 3]];
  for (const [k, o] of [[32, 0.035], [20, 0.04], [9, 0.05]]) ground += F(scr(hull([...foot.map(([x, y]) => P(x, y, 1.6)), ...foot.map(([x, y]) => P(x + k, y - k, 1.6))])), '#5a4a3a', o);
}

/* ───────────── soubassement + perron ───────────── */
let base = '';
base += cube(X0 - 3, Y0 - 3, 0, X1 - X0 + 6, Y1 - Y0 + 6, ZB, STONE);
base += cube(PX0 - 1, Y1 + 3, 0, PX1 - PX0 + 2, PYf - Y1 - 3, ZB, STONE);
base += S(line([[X0 - 3, Y1 + 3, ZB], [PX0 - 1, Y1 + 3, ZB], [PX0 - 1, PYf, ZB], [PX1 + 1, PYf, ZB], [PX1 + 1, Y1 + 3, ZB], [X1 + 3, Y1 + 3, ZB], [X1 + 3, Y0 - 3, ZB]]), '#ffffff', 0.9);
// joints de pierre du soubassement
base += S(lnY(Y1 + 3)([[X0 - 3, ZB / 2], [PX0 - 1, ZB / 2]]) + ' ' + lnY(Y1 + 3)([[PX1 + 1, ZB / 2], [X1 + 3, ZB / 2]]) + ' ' + lnX(X1 + 3)([[Y0 - 3, ZB / 2], [Y1 + 3, ZB / 2]]), '#c9cede', 0.5, 0.8);
// marches (de la plus haute, contre le perron, à la plus basse)
let steps = '';
{
  const n = 4, sd = 3.4, ri = ZB / n;
  for (let i = 1; i < n; i++) {
    const y0 = PYf + (i - 1) * sd, h = ZB - i * ri;
    steps += cube(PX0 + 1, y0, 0, PX1 - PX0 - 2, sd, h, STONE);
    steps += S(line([[PX0 + 1, y0 + sd, h], [PX1 - 1, y0 + sd, h], [PX1 - 1, y0, h]]), '#ffffff', 0.7, 0.9);
  }
}

/* ───────────── fenêtres ───────────── */
/** Fenêtre à petits bois sur la face +y : encadrement de pierre, appui, verre, croisée. */
function winY(Y, u0, u1, z0, z1, { lit = true, cross = true } = {}) {
  const f = onY(Y), l = lnY(Y);
  let s = F(f(R(u0 - 1.3, u1 + 1.3, z0 - 1.3, z1 + 1.3)), lit ? '#eceef5' : '#d6dae6');
  s += F(f(R(u0, u1, z0, z1)), lit ? GL_L : GL_R);
  s += F(f([[u0, z0], [u0 + 1.1, z0 + 1.1], [u0 + 1.1, z1], [u0, z1]]), '#c8cddc');          // embrasure
  s += F(f([[u0 + (u1 - u0) * 0.55, z0 + 1], [u0 + (u1 - u0) * 0.8, z0 + 1], [u0 + (u1 - u0) * 0.42, z1 - 1], [u0 + (u1 - u0) * 0.17, z1 - 1]]), '#ffffff', 0.3);
  if (cross) s += S(l([[(u0 + u1) / 2 + 0.5, z0 + 0.6], [(u0 + u1) / 2 + 0.5, z1]]) + ' ' + l([[u0 + 1, z0 + (z1 - z0) * 0.62], [u1, z0 + (z1 - z0) * 0.62]]), '#ffffff', 0.85);
  s += cube(u0 - 2, Y, z0 - 2.2, u1 - u0 + 4, 1.4, 1.2, { lit: '#ffffff', dark: '#dadde9', top: '#ffffff' }); // appui
  s += F(f(R((u0 + u1) / 2 - 1.2, (u0 + u1) / 2 + 1.2, z1 + 0.2, z1 + 2.2)), '#ffffff');            // clé
  return s;
}
function winX(X, u0, u1, z0, z1) { // face +x (u = y croissant vers la gauche de l'écran)
  const f = onX(X), l = lnX(X);
  let s = F(f(R(u0 - 1.3, u1 + 1.3, z0 - 1.3, z1 + 1.3)), '#e1e4ee');
  s += F(f(R(u0, u1, z0, z1)), GL_R);
  s += F(f([[u0 + (u1 - u0) * 0.3, z0 + 1], [u0 + (u1 - u0) * 0.52, z0 + 1], [u0 + (u1 - u0) * 0.85, z1 - 1], [u0 + (u1 - u0) * 0.63, z1 - 1]]), '#ffffff', 0.24);
  s += S(l([[(u0 + u1) / 2, z0], [(u0 + u1) / 2, z1]]) + ' ' + l([[u0, z0 + (z1 - z0) * 0.62], [u1, z0 + (z1 - z0) * 0.62]]), '#eef0f6', 0.85);
  s += cube(X, u0 - 2, z0 - 2.2, 1.4, u1 - u0 + 4, 1.2, { lit: '#f3f4f9', dark: '#d8dbe7', top: '#ffffff' });
  return s;
}

/* ───────────── corps de la mairie ───────────── */
let bld = '';
bld += F(L(R(X0, X1, ZB, ZT)), WALL_L) + F(Rt(R(Y0, Y1, ZB, ZT)), WALL_R);
// chaînages d'angle (pierres alternées)
{
  let q = '';
  for (let z = ZB, i = 0; z < ZT - 2; z += 4.4, i++) {
    const w = i % 2 ? 3.2 : 5.6;
    q += L(R(X1 - w, X1, z + 0.35, z + 4.05)) + L(R(X0, X0 + w, z + 0.35, z + 4.05));
    q += Rt(R(Y1 - w, Y1, z + 0.35, z + 4.05)) + Rt(R(Y0, Y0 + w, z + 0.35, z + 4.05));
  }
  bld += F(q, '#5a6385', 0.06);
}
// bandeau d'étage
bld += F(L(R(X0, X1, 31.2, 32.6)), '#eceef5') + F(Rt(R(Y0, Y1, 31.2, 32.6)), '#d3d7e5');
bld += S(line([[X0, Y1, 32.6], [X1, Y1, 32.6], [X1, Y0, 32.6]]), '#ffffff', 0.7, 0.9);
// fenêtres de la façade (de part et d'autre de l'avant-corps) : rez + étage
for (const [u0, u1] of [[-53, -45], [-40, -32], [15, 23], [28, 36]]) {
  bld += winY(Y1, u0, u1, 13, 28);
  bld += winY(Y1, u0, u1, 36, 46, { cross: true });
}
// face +x : enseigne « deux silhouettes » encadrée de deux fenêtres
bld += winX(X1, -42, -37, 13, 28) + winX(X1, -9, -4, 13, 28);
bld += winX(X1, -42, -37, 36, 46) + winX(X1, -9, -4, 36, 46);
{
  const u0 = -34, u1 = -12, v0 = 14.5, v1 = 45, dep = 1.8; // panneau blanc en saillie
  const shape = rr2(u0, v0, u1, v1, 3.6);
  const f0 = (pts) => pts.map(([u, v]) => P(X1, u, v)), f1 = (pts) => pts.map(([u, v]) => P(X1 + dep, u, v));
  bld += F(scr(f0(shape.map(([u, v]) => [u - 1.4, v - 1.8]))), '#1d2a5c', 0.12);
  bld += F(scr(hull([...f0(shape), ...f1(shape)])), '#c9cee0');
  bld += F(scr(f1(shape)), lin('panel', [[0, '#ffffff'], [1, '#eef0f8']]));
  bld += S(scr(f1(rr2(u0 + 0.7, v0 + 0.7, u1 - 0.7, v1 - 0.7, 3))), '#ffffff', 0.8, 0.9);
  // deux silhouettes : celle de derrière (claire), décalée vers le haut-droite ; celle de devant (violette)
  const person2 = (cu, cv, k, col, colHead) => {
    const head = circ2(cu, cv + 4.7 * k, 2.7 * k, 18);
    const bust = [];
    for (let i = 0; i <= 14; i++) { // épaules : demi-superellipse
      const a = Math.PI * (i / 14), c = Math.cos(a), sn = Math.sin(a);
      bust.push([cu + 5.3 * k * Math.sign(c) * Math.abs(c) ** 0.8, cv - 3.4 * k + 4.6 * k * sn ** 1.15]);
    }
    for (let i = 1; i < 4; i++) { const a = Math.PI + (Math.PI / 2) * (i / 4); bust.push([cu - 4.3 * k + Math.cos(a) * k, cv - 3.4 * k + Math.sin(a) * k * 0.9]); }
    for (let i = 1; i < 4; i++) { const a = 1.5 * Math.PI + (Math.PI / 2) * (i / 4); bust.push([cu + 4.3 * k + Math.cos(a) * k, cv - 3.4 * k + Math.sin(a) * k * 0.9]); }
    return F(scr(f1(bust)), col) + F(scr(f1(head)), colHead);
  };
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  // silhouette de derrière en violet moyen : en #c4bcff elle disparaissait à 0,555 (une seule personne lue)
  bld += person2(cu - 3.9, cv + 4.4, 1.08, '#a597ff', '#a597ff');
  bld += F(scr(f1(circ2(cu + 1.4, cv - 1.6, 8.9, 20))), '#ffffff');                // détache la silhouette de devant
  bld += person2(cu + 1.4, cv - 2.6, 1.24, VIOLET, VIOLET);
  bld += F(scr(f1(circ2(cu + 2.2, cv + 3.9, 1.3, 10))), '#ffffff', 0.45);          // reflet sur la tête
}
// ombre sous la corniche, arête avant adoucie
bld += F(L(R(X0, X1, ZT - 7, ZT)), EAVE) + F(Rt(R(Y0, Y1, ZT - 7, ZT)), EAVE);
bld += S(line([[X1, Y1, ZB + 0.5], [X1, Y1, ZT]]), '#ffffff', 1, 0.85);
// corniche
bld += cube(X0 - 1.6, Y0 - 1.6, ZT, X1 - X0 + 3.2, Y1 - Y0 + 3.2, ZR - ZT, BAND);
bld += S(line([[X0 - 1.6, Y1 + 1.6, ZR], [X1 + 1.6, Y1 + 1.6, ZR], [X1 + 1.6, Y0 - 1.6, ZR]]), '#ffffff', 1);

/* ───────────── avant-corps : façade en retrait, porte, colonnes ───────────── */
let portico = '';
{
  // façade sous le portique (dans l'ombre de l'entablement)
  portico += F(L(R(PX0, PX1, ZB, ZE)), '#24305e', 0.07);
  // porte double cintrée bleu nuit + imposte vitrée (passage de 27,5 : un personnage fait ≈ 27,4 ;
  // au-delà, l'entablement — 13 unités devant le mur — masque à l'écran le haut de l'arc)
  const d0 = PXC - 5, d1 = PXC + 5, dz = ZB + 27.5;
  const arch = (u0, u1, z0, z1) => { const r = (u1 - u0) / 2, c = (u0 + u1) / 2, zs = z1 - r; return [[u0, z0], [u1, z0], [u1, zs], ...circ2(c, zs, r, 9, 0, 180).slice(1, -1), [u0, zs]]; };
  portico += F(L(arch(d0 - 2, d1 + 2, ZB, dz + 2)), '#e3e5ef');
  portico += F(L(arch(d0, d1, ZB, dz)), lin('door', [[0, '#3f4f93'], [1, '#2a376b']]));
  portico += F(L([...circ2(PXC, dz - 5, 4.2, 9, 0, 180), [PXC - 4.2, dz - 5]]), GL_L);
  portico += S(lnY(Y1)([[PXC, ZB], [PXC, dz - 5]]) + ' ' + lnY(Y1)([[d0, dz - 5], [d1, dz - 5]]), '#24305e', 0.8);
  portico += S(lnY(Y1)([[PXC - 1.6, 20], [PXC - 1.6, 23]]) + ' ' + lnY(Y1)([[PXC + 1.6, 20], [PXC + 1.6, 23]]), '#f6c95c', 0.9);
  // fenêtres entre les colonnes + attique (pas de fenêtre d'attique au-dessus de la porte : son
  // encadrement monte désormais à dz + 2)
  for (const c of [PX0 + 7.3, PX1 - 7.3]) { portico += winY(Y1, c - 3, c + 3, 14, 30); portico += winY(Y1, c - 3, c + 3, 35.5, 41.5, { cross: false }); }
}
// colonnes (fût cylindrique ombré, base et chapiteau carrés)
const COLY = PY1 - 2.6;
const colXs = [0, 1, 2, 3].map((i) => PX0 + 3.2 + ((PX1 - PX0 - 6.4) * i) / 3);
const COLG = cylGrad('col', '#ffffff', '#c9cedd');
let columns = '';
for (const cx of colXs) {
  columns += cube(cx - 3, COLY - 3, ZB, 6, 6, 1.8, STONE);
  const c = cylinder(cx, COLY, ZB + 1.8, 2.25, ZE - ZB - 3.6);
  columns += F(c.side, COLG);
  // cannelures discrètes
  const [a, b] = P(cx, COLY, ZB + 1.8), rx = 2.25 * Math.SQRT2 * 0.866, h = ZE - ZB - 3.6;
  let fl = '';
  for (const f of [-0.4, 0.15, 0.6]) fl += `M${r1(a + f * rx)} ${r1(b - h + 1.2)} L${r1(a + f * rx)} ${r1(b + 1.6 * Math.sqrt(1 - f * f) - 0.6)} `;
  columns += S(fl.trim(), '#c9cedd', 0.35, 0.8);
  columns += cube(cx - 3.2, COLY - 3.2, ZE - 1.8, 6.4, 6.4, 1.8, STONE);
}
// entablement + fronton (toit à deux pans d'ardoise, faîtage selon y, qui rejoint le grand toit)
let entab = cube(PX0 - 1, Y1, ZE, PX1 - PX0 + 2, PY1 - Y1, ZR - ZE, BAND);
entab += F(onY(PY1)(R(PX0 - 1, PX1 + 1, ZE + 1.6, ZE + 2.4)), '#dfe2ec');
entab += S(line([[PX0 - 1, PY1, ZR], [PX1 + 1, PY1, ZR], [PX1 + 1, Y1, ZR]]), '#ffffff', 0.9);
let ped = '';
{
  // pans du fronton (rejoignent le pan avant du grand toit le long des noues)
  const yb = yMeet(ZPA);
  ped += F(poly([[PXa, PYf, ZR], [PXC, PYf, ZPA], [PXC, yb, ZPA], [PXa, RY1, ZR]]), shade(SLATE, 0.78));
  ped += F(poly([[PXb, PYf, ZR], [PXC, PYf, ZPA], [PXC, yb, ZPA], [PXb, RY1, ZR]]), lin('ped-r', [[0, '#7f879d'], [1, SLATE_D]]));
  let rows = '';
  for (const t of [0.25, 0.5, 0.75]) rows += line([[PXb - (PXb - PXC) * t, PYf, ZR + PR * t], [PXb - (PXb - PXC) * t, RY1 - (RY1 - yb) * t, ZR + PR * t]]) + ' ';
  ped += S(rows.trim(), '#646c82', 0.55, 0.55);
  // tympan : triangle blanc, corniche rampante, médaillon violet
  const f = onY(PYf);
  ped += F(f([[PXa, ZR - 0.6], [PXb, ZR - 0.6], [PXb, ZR], [PXC, ZPA], [PXa, ZR]]), '#ffffff');
  ped += F(f([[PXa + 4.2, ZR + 0.9], [PXb - 4.2, ZR + 0.9], [PXC, ZPA - 2.2]]), '#eceef5');
  ped += F(f(circ2(PXC, ZR + 4.6, 3.1, 18)), '#ffffff') + F(f(circ2(PXC, ZR + 4.6, 2.3, 18)), VIOLET);
  ped += F(f(circ2(PXC, ZR + 5.5, 0.8, 10)), '#ffffff') + F(f([[PXC - 1.4, ZR + 3.1], [PXC + 1.4, ZR + 3.1], [PXC + 1.1, ZR + 4.3], [PXC - 1.1, ZR + 4.3]]), '#ffffff');
  ped += S(lnY(PYf + 0.1)([[PXa - 0.4, ZR - 0.2], [PXC, ZPA + 0.5], [PXb + 0.4, ZR - 0.2]]), tint(SLATE, 0.5), 1.4);
  ped += S(line([[PXC, PYf, ZPA + 0.3], [PXC, yb, ZPA + 0.3]]), tint(SLATE, 0.4), 1, 0.9);
}

/* ───────────── grand toit en croupe (ardoise) + lucarnes ───────────── */
let roof = '';
{
  const h = hip(RX0, RY0, ZR, RX1 - RX0, RD, RISE);
  roof += F(h.back, shade(SLATE, 0.75)) + F(h.left, shade(SLATE, 0.8));
  roof += F(h.front, lin('slate-f', [[0, '#9aa1b4'], [1, SLATE]])) + F(h.right, lin('slate-r', [[0, '#7c8499'], [1, SLATE_D]]));
  const a = [RX0 + RD / 2, RY0 + RD / 2, ZR + RISE], b = [RX1 - RD / 2, RY0 + RD / 2, ZR + RISE];
  // rangs d'ardoises sur les pans visibles
  let rows = '';
  for (let i = 1; i < 7; i++) {
    const t = i / 7, z = ZR + RISE * t, inset = (RD / 2) * t;
    rows += line([[RX0 + inset, RY1 - inset, z], [RX1 - inset, RY1 - inset, z], [RX1 - inset, RY0 + inset, z]]) + ' ';
  }
  roof += S(rows.trim(), '#6b7389', 0.55, 0.45);
  roof += S(line([[RX0, RY1, ZR], [RX1, RY1, ZR], [RX1, RY0, ZR]]), tint(SLATE, 0.45), 1.2, 0.95);
  // arête de croupe avant : elle se projette exactement à la verticale ; un liseré appuyé la faisait
  // lire comme un mât planté dans le toit à 0,555 — le contraste des deux pans suffit à la dessiner
  roof += S(line([[RX1, RY1, ZR], b]), tint(SLATE, 0.3), 0.7, 0.6);
  roof += S(line([[RX0, RY1, ZR], a, b, [RX1, RY0, ZR]]), tint(SLATE, 0.3), 0.9, 0.8);
}
/** Lucarne à fronton posée sur le pan avant (centre x = xd). */
function dormer(xd) {
  let s = '';
  const hw = 4.4, yf = Y1 + 1, z0 = zSlope(yf), zt = z0 + 9, zr = zt + 4.2, ov = 0.9;
  const ySide = yMeet(zt), yRidge = yMeet(zr);
  // joue +x (triangle visible au-dessus du toit) et pan +x de la lucarne, pan −x
  s += F(poly([[xd - hw - ov, yf + ov, zt], [xd, yf + ov, zr], [xd, yRidge, zr], [xd - hw - ov, ySide, zt]]), shade(SLATE, 0.78));
  s += F(poly([[xd + hw, yf, z0], [xd + hw, yf, zt], [xd + hw, ySide, zt]]), '#dfe2ee');
  s += F(poly([[xd + hw + ov, yf + ov, zt], [xd, yf + ov, zr], [xd, yRidge, zr], [xd + hw + ov, ySide, zt]]), SLATE_D);
  // façade de la lucarne + fenêtre
  s += F(onY(yf)(R(xd - hw, xd + hw, z0, zt)), '#ffffff');
  s += F(onY(yf)(R(xd - hw + 1.3, xd + hw - 1.3, z0 + 1, zt - 1.2)), GL_L);
  s += F(onY(yf)([[xd + 0.2, z0 + 1], [xd + 2, z0 + 1], [xd - 0.6, zt - 1.2], [xd - 2.4, zt - 1.2]]), '#ffffff', 0.3);
  s += S(lnY(yf)([[xd, z0 + 1], [xd, zt - 1.2]]), '#ffffff', 0.7);
  // petit fronton blanc
  s += F(onY(yf + ov)([[xd - hw - ov, zt], [xd + hw + ov, zt], [xd, zr]]), '#f6f7fb');
  s += S(lnY(yf + ov + 0.05)([[xd - hw - ov, zt], [xd, zr], [xd + hw + ov, zt]]), '#ffffff', 0.9);
  return s;
}
roof += dormer(-41.5) + dormer(24.5);

/* ───────────── drapeau tricolore sur mât ───────────── */
function flag(x, y) {
  let s = '';
  const zTop = 74;
  s += cube(x - 2.2, y - 2.2, 1.6, 4.4, 4.4, 2.2, STONE);
  const b = P(x, y, 3.8), t = P(x, y, zTop);
  s += S(scr([b, t], false), '#c3c9d6', 1.5) + S(scr([[b[0] - 0.4, b[1]], [t[0] - 0.4, t[1]]], false), '#eef1f6', 0.5);
  s += `<circle cx="${r1(t[0])}" cy="${r1(t[1] - 1)}" r="1.5" fill="#f6c95c"/>`;
  // toile : plan y = cte, flotte vers +x, ondulée
  const L0 = 20, H = 12.5, z1 = zTop - 2, z0 = z1 - H;
  const wave = (u) => 1.4 * Math.sin((u / L0) * Math.PI * 1.6);
  const pt = (u, v) => P(x + u, y, z0 + v + wave(u));
  const bandPts = (ua, ub, v0 = 0, v1 = H) => {
    const top = [], bot = [];
    for (let i = 0; i <= 6; i++) { const u = ua + ((ub - ua) * i) / 6; top.push(pt(u, v1)); bot.push(pt(u, v0)); }
    return [...top, ...bot.reverse()];
  };
  const band = (ua, ub, col) => F(scr(bandPts(ua, ub)), col);
  // fin bord gris-bleu autour de la toile : sans lui, la bande blanche se confond avec le fond clair
  // et le drapeau se lit comme deux morceaux (bleu, rouge) séparés par un vide
  s += S(scr(bandPts(0.4, L0)), '#c3c9da', 1.3) + band(0.4, L0, '#c3c9da');
  s += band(0.4, L0 / 3, '#3c5bd6') + band(L0 / 3, (2 * L0) / 3, '#eef0f6') + band((2 * L0) / 3, L0, '#ef4444');
  // ombre du creux de l'ondulation, bas de toile légèrement ombré, reflet de la bosse
  s += F(scr(bandPts(L0 * 0.5, L0 * 0.7)), '#1d2a5c', 0.13);
  s += F(scr(bandPts(0.4, L0, 0, 1.6)), '#1d2a5c', 0.1);
  s += F(scr(bandPts(L0 * 0.12, L0 * 0.24)), '#ffffff', 0.22);
  return { d: x + y, svg: s, box: bounds(s) };
}

/* ───────────── composition ───────────── */
const items = [
  { d: -1000, svg: ground },
  { d: -500, svg: base + bld + portico + columns + entab + roof + ped }, // tout le reste est devant (y ou x plus grands)
  { d: PXC + PYf + 2, svg: steps },
  // tout ce qui est sur le parvis est posé sur son dessus (z = ZS), pas dedans
  flag(-62, 26),
  treeRound(64, 22, { size: 1, z: ZS }),
  treeCone(58, -52, { size: 0.9, z: ZS }),
  bush(-44, 8.5, { w: 24, d: 6, h: 7, z: ZS }),
  bush(25, 8.5, { w: 24, d: 6, h: 7, z: ZS }),
  person(-6, 38, { facing: 'back-right', pose: 'walk', top: '#0ea5e9', hairStyle: 'short', z: ZS }),
];
const cs = contactShadow(`${ID}-cs`, 150, 66, 200, 304, 0.18);
defs.push(cs.defs);
const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// manifeste : labelY = sommet du toit (bout gauche du faîtage) ; hit = corps + toit + perron
const main = bounds(roof + F(box(X0 - 3, Y0 - 3, 0, X1 - X0 + 6, Y1 - Y0 + 6, ZT).left, '#000') + F(box(X0 - 3, Y0 - 3, 0, X1 - X0 + 6, Y1 - Y0 + 6, ZT).right, '#000') + steps);
const man = { id: ID, title: TITLE, labelY: Math.round(main.y), hit: { x: Math.floor(main.x - 2), y: Math.floor(main.y - 2), w: Math.ceil(main.w + 4), h: Math.ceil(main.h + 4) } };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man), { defs: defs.join('').length, ground: ground.length, base: base.length, bld: bld.length, roof: roof.length, portico: portico.length, columns: columns.length, ped: ped.length });
