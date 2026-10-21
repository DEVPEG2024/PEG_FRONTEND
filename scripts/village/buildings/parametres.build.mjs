// Village PEG — « Paramètres » : la salle des machines. Halle blanche à toit d'ardoise à deux pans
// (pignon sur la face éclairée +y) portant un grand engrenage doré en relief et son petit pignon
// bleu nuit, porte roulante entrouverte sur une machine allumée, appentis côté +x avec tuyaux,
// vanne rouge et manomètre, cheminée d'extraction qui fume, armoire électrique, boîte à outils
// rouge, technicien casqué.
//   node buildings/parametres.build.mjs && node tools/lint.mjs buildings/parametres.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, cylinder, compose, contactShadow, svgDoc, shade, tint, mix } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, bounds } from '../tools/props.mjs';

const ID = 'parametres', TITLE = 'Paramètres';
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
const dot = (p, r, fill, o) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(r)}" fill="${fill}"${op(o)}/>`;
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z])); // face +y (éclairée), u = x
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z])); // face +x (ombrée), u = y
const lnY = (Y) => (pts) => line(pts.map(([u, z]) => [u, Y, z]));
const lnX = (X) => (pts) => line(pts.map(([u, z]) => [X, u, z]));
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + (c.top ? F(b.top, c.top) : ''); };
const circ2 = (cu, cv, r, n = 16) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return [cu + r * Math.cos(a), cv + r * Math.sin(a)]; });
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
/** Engrenage (points 2D) : rayon extérieur Ro, n dents, profondeur relative des dents. */
function gear(cu, cv, Ro, n, depth = 0.26, phase = 0) {
  const ri = Ro * (1 - depth), pts = [], st = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const a = phase + i * st;
    for (const [f, r] of [[-0.5, ri], [-0.3, ri], [-0.17, Ro], [0.17, Ro], [0.3, ri]]) pts.push([cu + r * Math.cos(a + f * st), cv + r * Math.sin(a + f * st)]);
  }
  return pts;
}

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const SLATE = '#8b93a8', SLATE_D = '#727a90';
const GOLD = '#f6c95c', GOLD_D = '#e0ad3a';
const WALL_L = lin('wall-l', [[0, '#ffffff'], [1, '#f0f1f7']]);
const WALL_R = lin('wall-r', [[0, '#e8eaf3'], [1, '#d8dbe9']]);
const GL_L = lin('glass-l', [[0, '#b6d6ff'], [0.5, '#8fb9fb'], [1, '#6f9ef5']]);
const GL_R = lin('glass-r', [[0, '#88b0f0'], [1, '#5579c6']]);
const METAL = { lit: '#c3c9d6', dark: '#9aa2b4', top: '#d6dbe5' };

/* ───────────── géométrie ───────────── */
const ZP = 2;                                   // dessus de la dalle
const X0 = -56, X1 = 14, Y0 = -50, Y1 = 10;     // halle
// Échelle (cahier des charges § 3) : étage ≈ 38–42, porte ≈ 28, personnage ≈ 27,4. Les murs à 34 et la
// porte roulante de 20 rendaient le technicien plus grand que la porte de son atelier.
const ZW = 40, RISE = 27, XR = (X0 + X1) / 2, HALF = (X1 - X0) / 2; // faîtage selon y, en x = XR
// Débord de rive (pignon) réduit : vu de (1,1,1), la rive cache le haut du pignon sur ≈ RISE·OG/HALF + OG
// à droite du faîtage ; à 3,2 elle mangeait les dents hautes droites de l'engrenage.
const T = 2.4, OV = 3.2, OG = 1.6;              // épaisseur du toit, débords (égouts / pignons)
const zRoof = (x) => ZW + RISE * (1 - Math.abs(x - XR) / HALF);
const AX0 = X1, AX1 = 40, AY0 = -44, AY1 = -4;  // appentis (côté +x)
const AOV = 2;                                   // débord du toit de l'appentis
const zA = (x) => 34.2 - ((x - X1) * 5) / (AX1 + AOV - X1);    // toit de l'appentis (pente vers +x)
const DX0 = -34, DX1 = -8, DZ = 30, DOPEN = 18;  // porte roulante (passage de 28, ouverte jusqu'à DOPEN)
const SX0 = -72, SX1 = 66, SY0 = -68, SY1 = 54;  // dalle

/* ───────────── sol ───────────── */
let ground = '';
{
  const t = box(SX0, SY0, 0, SX1 - SX0, SY1 - SY0, ZP);
  ground += F(t.right, '#d3d6e3') + F(t.left, '#e5e7f0') + F(t.top, lin('slab', [[0, '#f5f6f9'], [1, '#eceef4']]));
  ground += S(line([[SX0, SY1, ZP], [SX1, SY1, ZP], [SX1, SY0, ZP]]), '#ffffff', 1);
  let j = '';
  for (let x = SX0 + 17; x < SX1 - 3; x += 17) j += line([[x, (x > AX0 ? AY1 : Y1) + 1, ZP], [x, SY1, ZP]]) + ' ';
  for (let y = Y1 + 14; y < SY1 - 3; y += 14) j += line([[SX0, y, ZP], [SX1, y, ZP]]) + ' ';
  for (let y = SY0 + 16; y < AY1; y += 16) j += line([[AX1 + 1, y, ZP], [SX1, y, ZP]]) + ' ';
  ground += S(j.trim(), '#dfe2ea', 0.55);
  // zone de manœuvre devant la porte (marquage jaune) : bande de seuil à barreaux selon y.
  // (Des hachures selon la diagonale monde (1,1) se projettent en traits VERTICAUX à l'écran et se
  //  lisaient comme des piquets plantés dans la dalle.)
  ground += S(poly([[DX0 - 1, Y1 + 2, ZP], [DX1 + 1, Y1 + 2, ZP], [DX1 + 1, Y1 + 24, ZP], [DX0 - 1, Y1 + 24, ZP]]), GOLD, 1.1, 0.95);
  let hatch = '';
  for (let x = DX0 + 1.5; x < DX1 - 0.5; x += 3) hatch += poly([[x, Y1 + 2.6, ZP], [x + 1.3, Y1 + 2.6, ZP], [x + 1.3, Y1 + 5.4, ZP], [x, Y1 + 5.4, ZP]]) + ' ';
  ground += F(hatch.trim(), GOLD, 0.9);
  // ombres portées douces (vers la droite de l'écran)
  const shadowOf = (foot, k, o) => F(scr(hull([...foot.map(([x, y]) => P(x, y, ZP)), ...foot.map(([x, y]) => P(x + k, y - k, ZP))])), '#5a4a3a', o);
  const fm = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]], fa = [[AX0, AY0], [AX1, AY0], [AX1, AY1], [AX0, AY1]];
  for (const [k, o] of [[30, 0.035], [18, 0.04], [8, 0.05]]) ground += shadowOf(fm, k, o) + shadowOf(fa, k * 0.7, o);
}

/* ───────────── halle : murs, intérieur visible, engrenage ───────────── */
const L = onY(Y1), Rt = onX(X1);
let hall = '';
// intérieur vu par la porte roulante : fond sombre, sol, machine allumée.
// Vu de (1,1,1), tout rayon qui passe par l'ouverture (haute de DOPEN − ZP) touche le sol à moins de
// DOPEN − ZP du seuil : on voit donc le SOL de l'atelier (et la face avant de la machine), pas un mur
// du fond. Le sol se dessine après le fond (avant, il était entièrement recouvert).
{
  hall += F(L(R(DX0, DX1, ZP, DOPEN)), lin('in-back', [[0, '#1d2347'], [1, '#2b3363']]));
  hall += F(poly([[DX0, Y1 - 26, ZP], [DX1, Y1 - 26, ZP], [DX1, Y1, ZP], [DX0, Y1, ZP]]), lin('in-floor', [[0, '#1f2650'], [1, '#56608f']]));
  // machine : bâti bleu nuit, bande de sécurité, écran, voyants, volant doré — tout sur la face +y,
  // la seule que l'ouverture laisse voir (visible jusqu'à z = DOPEN − (Y1 − face avant))
  const mx = DX0 + 4, mw = 16, my = Y1 - 12, md = 6, fy = my + md;
  hall += F(scr(hull([[mx, my], [mx + mw, my], [mx + mw, my + md], [mx, my + md]].flatMap(([a, b]) => [P(a, b, ZP), P(a + 5, b - 5, ZP)]))), '#0c1030', 0.25);
  hall += cube(mx, my, ZP, mw, md, 11, { lit: '#46559b', dark: '#34427e', top: '#5869b3' });
  hall += F(onY(fy)(R(mx + 1, mx + mw - 1, ZP + 0.4, ZP + 2)), GOLD);
  let hz = '';
  for (let u = mx + 1.6; u < mx + mw - 1; u += 2.6) hz += lnY(fy)([[u, ZP + 0.5], [u + 1.1, ZP + 1.9]]) + ' ';
  hall += S(hz.trim(), '#2b2f45', 0.6);
  hall += F(onY(fy)(R(mx + 3, mx + 8.6, ZP + 4.2, ZP + 8.8)), '#9ad1ff');
  hall += F(onY(fy)(R(mx + 3.6, mx + 6, ZP + 7.1, ZP + 8.1)), '#ffffff', 0.6);
  for (const [v, c] of [[ZP + 8.2, '#4fb36d'], [ZP + 6, '#ef4444']]) hall += dot(P(mx + 1.5, fy, v), 0.75, c);
  // volant doré (dans le plan de la face avant)
  {
    const wu = mx + 12.4, wv = ZP + 6.6;
    hall += F(onY(fy + 0.2)(gear(wu, wv, 3.1, 8, 0.3)), GOLD_D) + F(onY(fy + 0.3)(circ2(wu, wv, 1.9, 12)), GOLD) + F(onY(fy + 0.35)(circ2(wu, wv, 0.8, 10)), NAVY);
  }
  // lumière d'atelier qui tombe du plafond
  hall += F(L(R(DX0, DX1, ZP, DOPEN)), lin('in-light', [[0, '#ffe9a8', 0.28], [1, '#ffe9a8', 0]]));
}
// murs : pignon +y (troué par la porte) et face +x
{
  const f = (u, z) => [u, Y1, z];
  const outer = [f(X0, ZP), f(X1, ZP), f(X1, ZW), f(XR, ZW + RISE), f(X0, ZW)];
  const hole = [f(DX0, ZP), f(DX0, DOPEN), f(DX1, DOPEN), f(DX1, ZP)];
  hall += `<path d="${poly(outer)} ${poly(hole)}" fill="${WALL_L}" fill-rule="evenodd"/>`;
  hall += F(Rt(R(Y0, Y1, ZP, ZW)), WALL_R);
  // soubassement
  hall += F(L(R(X0, DX0 - 2, ZP, ZP + 4.5)) + L(R(DX1 + 2, X1, ZP, ZP + 4.5)), '#e3e5ef') + F(Rt(R(Y0, Y1, ZP, ZP + 4.5)), '#cfd3e2');
  hall += S(lnY(Y1)([[X0, ZP + 4.5], [DX0 - 2, ZP + 4.5]]) + ' ' + lnY(Y1)([[DX1 + 2, ZP + 4.5], [X1, ZP + 4.5]]) + ' ' + lnX(X1)([[Y1, ZP + 4.5], [Y0, ZP + 4.5]]), '#ffffff', 0.7, 0.9);
}
// porte roulante : cadre bleu nuit à bandes de sécurité, rideau remonté
{
  hall += F(L([[DX0 - 2, ZP], [DX0, ZP], [DX0, DZ], [DX1, DZ], [DX1, ZP], [DX1 + 2, ZP], [DX1 + 2, DZ + 2], [DX0 - 2, DZ + 2]]), '#3f4f93');
  let st = '';
  for (let z = ZP + 1; z < DZ - 1; z += 3.2) st += lnY(Y1 + 0.05)([[DX0 - 1, z], [DX0 - 1, z + 1.4]]) + ' ' + lnY(Y1 + 0.05)([[DX1 + 1, z], [DX1 + 1, z + 1.4]]) + ' ';
  hall += S(st.trim(), GOLD, 1.5);
  hall += F(L(R(DX0, DX1, DOPEN, DZ)), lin('shutter', [[0, '#d6dbe6'], [1, '#b9c0d1']]));
  let sl = '';
  for (let z = DOPEN + 1.4; z < DZ; z += 1.5) sl += lnY(Y1 + 0.05)([[DX0 + 0.3, z], [DX1 - 0.3, z]]) + ' ';
  hall += S(sl.trim(), '#9ea6ba', 0.45, 0.9);
  hall += F(L(R(DX0, DX1, DOPEN, DOPEN + 1.3)), '#6f7896');
  // tableau gauche de l'ouverture (épaisseur du mur, tourné vers +x)
  hall += F(poly([[DX0, Y1 - 2.2, ZP], [DX0, Y1, ZP], [DX0, Y1, DOPEN], [DX0, Y1 - 2.2, DOPEN]]), '#c4c9da');
}
// fenêtres d'atelier (petits carreaux) de part et d'autre de la porte
for (const [u0, u1] of [[-52, -42.5], [2.5, 12]]) {
  const z0 = 11, z1 = 27;
  hall += F(L(R(u0 - 1.2, u1 + 1.2, z0 - 1.2, z1 + 1.2)), '#3f4f93');
  hall += F(L(R(u0, u1, z0, z1)), GL_L);
  hall += F(L([[u0 + 4.8, z0 + 0.5], [u0 + 7.3, z0 + 0.5], [u0 + 3.6, z1 - 0.5], [u0 + 1.1, z1 - 0.5]]), '#ffffff', 0.32);
  let mu = lnY(Y1)([[(u0 + u1) / 2, z0], [(u0 + u1) / 2, z1]]);
  for (const k of [1, 2, 3]) mu += ' ' + lnY(Y1)([[u0, z0 + ((z1 - z0) * k) / 4], [u1, z0 + ((z1 - z0) * k) / 4]]);
  hall += S(mu, '#3f4f93', 0.8);
  hall += cube(u0 - 1.8, Y1, z0 - 2.6, u1 - u0 + 3.6, 1.2, 1.2, { lit: '#ffffff', dark: '#dadde9', top: '#ffffff' }); // appui
}
// extincteur rouge à droite de la porte
{
  const e = cylinder(DX1 + 5.5, Y1 + 1.4, ZP + 7, 1.3, 6.5);
  hall += F(e.side, lin('ext', [[0, '#f87171'], [1, '#c92a2a']], [0, 0, 1, 0])) + `<ellipse cx="${e.top.cx}" cy="${e.top.cy}" rx="${e.top.rx}" ry="${e.top.ry}" fill="#fca5a5"/>`;
  hall += S(scr([P(DX1 + 5.5, Y1 + 1.4, ZP + 13.5), P(DX1 + 5.5, Y1 + 1.4, ZP + 15)], false), '#2b2f45', 0.9);
}
// grand engrenage doré en relief dans le pignon + petit pignon bleu nuit qui s'y engrène.
// Au-dessus du cadre de porte (DZ + 2), entièrement dans le triangle du pignon et hors de la bande que
// cache la rive à droite du faîtage.
const GC = [XR, ZW + 6.5], GR = 13.5;
{
  const f = (dep) => onY(Y1 + dep);
  const big = gear(GC[0], GC[1], GR, 12, 0.24, rad(7));
  const sc = [GC[0] + 17.3, GC[1] - 6], small = gear(sc[0], sc[1], 7, 8, 0.3, rad(-6));
  // ombres portées sur le mur
  hall += F(onY(Y1)(big.map(([u, v]) => [u + 1.4, v - 1.6])), '#1d2a5c', 0.12) + F(onY(Y1)(small.map(([u, v]) => [u + 1.2, v - 1.4])), '#1d2a5c', 0.1);
  // petit pignon (derrière, épaisseur puis face)
  hall += F(f(0.6)(small), '#24305e') + F(f(1.3)(small), '#2a376b') + F(f(2)(small), lin('sg', [[0, '#4b5ca5'], [1, '#34427e']]));
  hall += F(f(2.05)(circ2(sc[0], sc[1], 2.4, 14)), '#ffffff') + F(f(2.1)(circ2(sc[0], sc[1], 1.2, 10)), '#34427e');
  // grand engrenage : tranche (trois couches) puis face dégradée, moyeu, trous d'allègement
  hall += F(f(0.7)(big), '#b8861f') + F(f(1.4)(big), '#cf9a2d') + F(f(2.1)(big), '#dcaa3c');
  hall += F(f(2.8)(big), lin('gear', [[0, '#ffe08a'], [0.55, GOLD], [1, '#ecb646']]));
  let holes = '';
  for (let i = 0; i < 4; i++) { const a = rad(45 + 90 * i); holes += f(2.85)(circ2(GC[0] + Math.cos(a) * GR * 0.5, GC[1] + Math.sin(a) * GR * 0.5, GR * 0.15, 12)); }
  hall += F(holes, '#c7952a');
  hall += F(f(2.85)(circ2(GC[0], GC[1], GR * 0.32, 18)), GOLD_D) + F(f(2.9)(circ2(GC[0], GC[1], GR * 0.2, 16)), NAVY);
  hall += F(f(2.95)(circ2(GC[0] - GR * 0.06, GC[1] + GR * 0.07, GR * 0.08, 10)), '#ffffff', 0.5);
  // reflet le long du bord supérieur gauche
  const hl = [];
  for (let a = 100; a <= 190; a += 10) hl.push([GC[0] + Math.cos(rad(a)) * GR * 0.69, GC[1] + Math.sin(rad(a)) * GR * 0.69]);
  hall += S(lnY(Y1 + 2.9)(hl), '#fff3c4', 0.9, 0.85);
}
// ombre du débord de toit sur le pignon et la face +x, arête avant adoucie
{
  const shd = (dz) => onY(Y1)([[X0, ZW], [XR, ZW + RISE], [X1, ZW], [X1, ZW - dz], [XR, ZW + RISE - dz], [X0, ZW - dz]]);
  hall += F(shd(4.5), '#24305e', 0.06) + F(shd(2.2), '#24305e', 0.07);
  hall += F(Rt(R(Y0, Y1, ZW - 5, ZW)), '#24305e', 0.07);
  hall += S(line([[X1, Y1, ZP + 5], [X1, Y1, ZW]]), '#ffffff', 1, 0.85);
}

/* ───────────── appentis (+x) : murs, tuyaux, vanne, manomètre, toit ───────────── */
let annex = '';
{
  const LA = onY(AY1), RA = onX(AX1);
  annex += F(LA([[AX0, ZP], [AX1, ZP], [AX1, zA(AX1) - 0.4], [AX0, zA(AX0) - 0.4]]), WALL_L);
  annex += F(RA(R(AY0, AY1, ZP, zA(AX1) - 0.4)), WALL_R);
  annex += F(LA(R(AX0, AX1, ZP, ZP + 4.5)), '#e3e5ef') + F(RA(R(AY0, AY1, ZP, ZP + 4.5)), '#cfd3e2');
  annex += S(lnY(AY1)([[AX0, ZP + 4.5], [AX1, ZP + 4.5]]) + ' ' + lnX(AX1)([[AY1, ZP + 4.5], [AY0, ZP + 4.5]]), '#ffffff', 0.7, 0.9);
  // porte de service (face +y) avec hublot — passage de 28 (elle en faisait 18)
  annex += F(LA(R(AX0 + 2, AX0 + 11, ZP, ZP + 29)), '#e3e5ef');
  annex += F(LA(R(AX0 + 3, AX0 + 10, ZP, ZP + 28)), lin('sdoor', [[0, '#c3c9d6'], [1, '#aab2c4']]));
  annex += F(LA(circ2(AX0 + 6.5, ZP + 20.5, 2, 12)), GL_L);
  annex += S(lnY(AY1)([[AX0 + 8.5, ZP + 12], [AX0 + 8.5, ZP + 14.5]]), '#4b5373', 0.9);
  // ombre du débord de toit
  annex += F(RA(R(AY0, AY1, zA(AX1) - 4.5, zA(AX1) - 0.4)), '#24305e', 0.07);
  annex += S(line([[AX1, AY1, ZP + 5], [AX1, AY1, zA(AX1) - 0.4]]), '#ffffff', 1, 0.85);
}
// tuyaux sur la face +x (ombrée) : bleu et ambre, coudes, brides, vanne rouge, manomètre
const pipe = (pts, col, w = 2.8) => {
  const d = scr(pts.map(([x, y, z]) => P(x, y, z)), false);
  return S(d, shade(col, 0.72), w + 0.7) + S(d, col, w) + S(scr(pts.map(([x, y, z]) => { const p = P(x, y, z); return [p[0] - 0.25, p[1] - w * 0.28]; }), false), tint(col, 0.45), w * 0.32, 0.9);
};
{
  const XP = AX1 + 1.8;
  annex += pipe([[XP, AY1 - 2, ZP], [XP, AY1 - 2, 9.5], [XP, AY0 + 4, 9.5], [XP, AY0 + 4, zA(AX1) - 2], [AX1, AY0 + 4, zA(AX1) - 2]], '#3b8fd8', 2.6);
  annex += pipe([[XP, AY1 - 6, ZP], [XP, AY1 - 6, 15], [XP, AY0 + 9, 15], [XP, AY0 + 9, zA(AX1) - 4.5], [AX1, AY0 + 9, zA(AX1) - 4.5]], '#f59e0b', 2.6);
  // brides (colliers clairs)
  let fl = '';
  for (const y of [AY1 - 14, AY1 - 26]) for (const z of [9.5, 15]) { const a = P(XP, y, z - 1.8), b = P(XP, y, z + 1.8); fl += `M${r1(a[0])} ${r1(a[1])} L${r1(b[0])} ${r1(b[1])} `; }
  annex += S(fl.trim(), '#e8ebf3', 1.2);
  // vanne : volant rouge (dans le plan x = cte) sur le tuyau bleu
  {
    const yv = AY1 - 20, zv = 9.5, X = XP + 2.2, rr = 3.3;
    annex += S(scr([P(XP, yv, zv), P(X, yv, zv)], false), '#4b5373', 1.4);
    const ring = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 2 * Math.PI; return P(X, yv + rr * Math.cos(a), zv + rr * Math.sin(a)); });
    annex += S(scr(ring), '#c92a2a', 1.6) + S(scr(ring), '#ef4444', 0.9);
    let sp = '';
    for (const a of [0, 120, 240]) { const p = P(X, yv + rr * Math.cos(rad(a + 30)), zv + rr * Math.sin(rad(a + 30))), c = P(X, yv, zv); sp += `M${r1(c[0])} ${r1(c[1])} L${r1(p[0])} ${r1(p[1])} `; }
    annex += S(sp.trim(), '#ef4444', 0.8) + dot(P(X, yv, zv), 0.9, '#f87171');
  }
  // manomètre sur le tuyau ambre
  {
    const ym = AY1 - 32, c = P(XP + 1.2, ym, 19.6);
    annex += S(scr([P(XP, ym, 15), P(XP + 1.2, ym, 18)], false), '#4b5373', 0.9);
    const disc = (r) => Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 2 * Math.PI; return P(XP + 1.2, ym + r * Math.cos(a), 19.6 + r * Math.sin(a)); });
    annex += F(scr(disc(2.6)), '#4b5373') + F(scr(disc(2)), '#ffffff');
    annex += S(scr([c, P(XP + 1.2, ym - 1.2, 20.6)], false), '#ef4444', 0.6);
  }
}
// toit de l'appentis (ardoise, pente vers +x), tranches et liserés
{
  const xa = X1 + OV, xb = AX1 + AOV, ya = AY0 - AOV, yb = AY1 + AOV, t = 1.6;
  annex += F(poly([[xa, yb, zA(xa)], [xb, yb, zA(xb)], [xb, yb, zA(xb) + t], [xa, yb, zA(xa) + t]]), '#7d859a');
  annex += F(poly([[xb, ya, zA(xb)], [xb, yb, zA(xb)], [xb, yb, zA(xb) + t], [xb, ya, zA(xb) + t]]), '#5f667b');
  annex += F(poly([[xa, ya, zA(xa) + t], [xb, ya, zA(xb) + t], [xb, yb, zA(xb) + t], [xa, yb, zA(xa) + t]]), lin('annex-roof', [[0, '#9aa1b4'], [1, '#868ea3']], [0, 0, 1, 1]));
  let rows = '';
  for (let x = xa + 5; x < xb - 1; x += 5) rows += line([[x, ya + 0.4, zA(x) + t + 0.05], [x, yb - 0.3, zA(x) + t + 0.05]]) + ' ';
  annex += S(rows.trim(), '#6b7389', 0.5, 0.5);
  annex += S(line([[xa, yb, zA(xa) + t], [xb, yb, zA(xb) + t], [xb, ya, zA(xb) + t]]), tint(SLATE, 0.45), 1.1, 0.95);
}

/* ───────────── toit de la halle (ardoise, deux pans, faîtage selon y) ───────────── */
let roof = '';
{
  const xa = X0 - OV, xb = X1 + OV, ya = Y0 - OG, yb = Y1 + OG;
  const zt = (x) => zRoof(x) + T;
  roof += F(poly([[xa, ya, zt(xa)], [XR, ya, zt(XR)], [XR, yb, zt(XR)], [xa, yb, zt(xa)]]), lin('pane-b', [[0, '#6f778c'], [1, '#7a8297']], [0, 0, 1, 0.4]));
  roof += F(poly([[XR, ya, zt(XR)], [xb, ya, zt(xb)], [xb, yb, zt(xb)], [XR, yb, zt(XR)]]), lin('pane-f', [[0, '#858da2'], [1, '#757d92']], [0, 0, 1, 0.6]));
  // rangs d'ardoises (parallèles à l'égout)
  let rows = '';
  for (let k = 1; k < 5; k++) {
    const xL = XR - ((XR - xa) * k) / 5, xRr = XR + ((xb - XR) * k) / 5;
    rows += line([[xL, ya + 0.4, zt(xL) + 0.05], [xL, yb - 0.3, zt(xL) + 0.05]]) + ' ' + line([[xRr, ya + 0.4, zt(xRr) + 0.05], [xRr, yb - 0.3, zt(xRr) + 0.05]]) + ' ';
  }
  roof += S(rows.trim(), '#5f667b', 0.55, 0.55);
  // verrière le long du faîtage (pan +x)
  {
    const x0 = XR + 3, x1 = XR + 11, y0 = Y0 + 6, y1 = Y1 - 8;
    roof += F(poly([[x0, y0, zt(x0) + 0.3], [x1, y0, zt(x1) + 0.3], [x1, y1, zt(x1) + 0.3], [x0, y1, zt(x0) + 0.3]]), '#e3e6ef');
    roof += F(poly([[x0 + 0.8, y0 + 0.8, zt(x0 + 0.8) + 0.4], [x1 - 0.8, y0 + 0.8, zt(x1 - 0.8) + 0.4], [x1 - 0.8, y1 - 0.8, zt(x1 - 0.8) + 0.4], [x0 + 0.8, y1 - 0.8, zt(x0 + 0.8) + 0.4]]), lin('sky', [[0, '#cfe3ff'], [1, '#86aef0']], [0, 0, 1, 1]));
    let mu = '';
    for (let y = y0 + 9; y < y1 - 2; y += 9) mu += line([[x0 + 0.8, y, zt(x0 + 0.8) + 0.45], [x1 - 0.8, y, zt(x1 - 0.8) + 0.45]]) + ' ';
    roof += S(mu.trim(), '#e3e6ef', 0.8);
    roof += F(poly([[x0 + 1.5, y0 + 2, zt(x0 + 1.5) + 0.5], [x0 + 3.5, y0 + 2, zt(x0 + 3.5) + 0.5], [x0 + 3.5, y0 + 20, zt(x0 + 3.5) + 0.5], [x0 + 1.5, y0 + 20, zt(x0 + 1.5) + 0.5]]), '#ffffff', 0.35);
  }
  // faîtage, rive de pignon (tranche éclairée), égout +x (tranche ombrée), liserés clairs
  roof += S(line([[XR, ya + 0.3, zt(XR) + 0.2], [XR, yb - 0.2, zt(XR) + 0.2]]), '#c2c7d4', 1.2, 0.8);
  roof += F(poly([[xa, yb, zt(xa)], [XR, yb, zt(XR)], [xb, yb, zt(xb)], [xb, yb, zRoof(xb)], [XR, yb, zRoof(XR)], [xa, yb, zRoof(xa)]]), '#8f97ab');
  roof += F(poly([[xb, ya, zRoof(xb)], [xb, yb, zRoof(xb)], [xb, yb, zt(xb)], [xb, ya, zt(xb)]]), '#5f667b');
  roof += S(line([[xa, yb, zt(xa)], [XR, yb, zt(XR)], [xb, yb, zt(xb)]]), tint(SLATE, 0.5), 1.2, 0.95);
  roof += S(line([[xb, ya + 0.4, zt(xb)], [xb, yb, zt(xb)]]), tint(SLATE, 0.3), 1, 0.8);
}

/* ───────────── cheminée d'extraction + fumée ───────────── */
let stack = '';
{
  const sx = 30, sy = -30, z0 = zA(sx) + 1.6, h = 72 - z0, r = 3.4;
  const c = cylinder(sx, sy, z0 - 1, r, h + 1);
  stack += F(c.side, cylGrad('stack', '#dfe3ec', '#9aa2b4'));
  for (const zb of [z0 + h * 0.45, z0 + h * 0.75]) stack += F(cylinder(sx, sy, zb, r + 0.15, 2.2).side, cylGrad('stack-band', '#ef4444', '#b91c1c'));
  const cap = cylinder(sx, sy, z0 + h - 0.2, r + 0.9, 1.8);
  stack += F(cap.side, cylGrad('stack-cap', '#c3c9d6', '#7d8499')) + `<ellipse cx="${cap.top.cx}" cy="${cap.top.cy}" rx="${cap.top.rx}" ry="${cap.top.ry}" fill="#4b5373"/>`;
  // fumée : trois bouffées blanches translucides qui dérivent vers la droite
  const top = P(sx, sy, z0 + h + 1.6);
  for (const [dx, dy, rr, o] of [[1.5, -4.5, 3.6, 0.55], [5.2, -9.5, 4.6, 0.4], [9.8, -14, 5.4, 0.26]]) stack += dot([top[0] + dx, top[1] + dy], rr, '#ffffff', o);
  stack += dot([top[0] + 0.6, top[1] - 5], 1.6, '#ffffff', 0.5);
}

/* ───────────── accessoires sur mesure ───────────── */
/** Armoire électrique : caisson métal gris, deux portes, ouïes, triangle jaune « éclair ». */
function cabinet(x, y) {
  let s = '';
  const w = 9.6, d = 4.4, h = 19, x0 = x - w / 2, y0 = y - d / 2;
  for (const [k, o] of [[10, 0.05], [5, 0.06]]) s += F(scr(hull([[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]].flatMap(([a, b]) => [P(a, b, ZP), P(a + k, b - k, ZP)]))), '#5a4a3a', o);
  s += cube(x0, y0, ZP, w, d, 1.4, { lit: '#4b5373', dark: '#363d58', top: '#5d6690' });
  s += cube(x0, y0, ZP + 1.4, w, d, h, { lit: lin('cab', [[0, '#d4d9e4'], [1, '#bfc6d4']]), dark: '#9aa2b4', top: '#e3e7ef' });
  const fy = onY(y0 + d + 0.05), ly = lnY(y0 + d + 0.08);
  s += S(ly([[x, ZP + 2.6], [x, ZP + h]]) + ' ' + ly([[x0 + 0.5, ZP + 2.2], [x0 + w - 0.5, ZP + 2.2]]), '#9aa2b4', 0.5);
  s += S(ly([[x - 1.2, ZP + 9.5], [x - 1.2, ZP + 12]]) + ' ' + ly([[x + 1.2, ZP + 9.5], [x + 1.2, ZP + 12]]), '#4b5373', 0.8);
  for (let i = 0; i < 3; i++) s += F(fy(R(x0 + 1.4, x - 1.4, ZP + 3.6 + i * 1.3, ZP + 4.2 + i * 1.3)), '#8e96aa');
  // triangle « danger électrique » sur la porte droite
  const tc = [x + w / 4, ZP + 15.6];
  s += F(fy([[tc[0] - 2.7, tc[1] - 2.2], [tc[0] + 2.7, tc[1] - 2.2], [tc[0], tc[1] + 2.6]]), '#2b2f45');
  s += F(fy([[tc[0] - 2.1, tc[1] - 1.8], [tc[0] + 2.1, tc[1] - 1.8], [tc[0], tc[1] + 1.9]]), '#facc15');
  s += F(fy([[tc[0] + 0.3, tc[1] + 1.1], [tc[0] - 0.7, tc[1] - 0.3], [tc[0] + 0.2, tc[1] - 0.2], [tc[0] - 0.4, tc[1] - 1.4], [tc[0] + 0.7, tc[1] + 0.1], [tc[0] - 0.2, tc[1]]]), '#2b2f45');
  // voyant vert + câble qui rentre dans le mur
  s += dot(P(x - w / 4, y0 + d, ZP + 16.4), 0.8, '#4fb36d') + dot(P(x - w / 4 - 0.2, y0 + d, ZP + 16.6), 0.3, '#ffffff');
  return { d: x + y, svg: s, box: bounds(s) };
}
/** Boîte à outils rouge (anse bleu nuit, fermoirs) + clé plate posée au sol. */
function toolbox(x, y) {
  let s = '';
  const w = 9, d = 4.6, h = 4.6, x0 = x - w / 2, y0 = y - d / 2;
  s += F(scr(hull([[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]].flatMap(([a, b]) => [P(a, b, ZP), P(a + 3.5, b - 3.5, ZP)]))), '#5a4a3a', 0.1);
  s += cube(x0, y0, ZP, w, d, h, { lit: '#ef4444', dark: '#c92a2a', top: '#f87171' });
  s += cube(x0 - 0.3, y0 - 0.3, ZP + h - 1.4, w + 0.6, d + 0.6, 1.4, { lit: '#dc2626', dark: '#b91c1c', top: '#fb7185' });
  for (const u of [x0 + 2, x0 + w - 2.6]) s += F(onY(y0 + d + 0.35)(R(u, u + 0.9, ZP + h - 2.6, ZP + h - 0.8)), '#e8ebf3');
  s += S(line([[x0 + 2.2, y, ZP + h + 0.1], [x0 + 2.6, y, ZP + h + 2.4], [x0 + w - 2.6, y, ZP + h + 2.4], [x0 + w - 2.2, y, ZP + h + 0.1]]), '#2e3a6e', 0.9);
  // clé plate au sol
  const a = P(x + 4, y + 6, ZP + 0.2), b = P(x + 10, y + 4, ZP + 0.2);
  s += S(`M${r1(a[0])} ${r1(a[1])} L${r1(b[0])} ${r1(b[1])}`, '#9aa2b4', 1.2) + dot(b, 1.3, '#9aa2b4') + dot(a, 1, '#9aa2b4');
  return { d: x + y, svg: s, box: bounds(s) };
}
/** Casque de chantier jaune posé sur la tête d'un personnage debout (mêmes repères que props.person). */
function hardHat(x, y, z = ZP) {
  const hc = P(x, y, z + 13.2 + 11.0), R0 = 3.2;
  let s = '';
  s += `<path d="M${r1(hc[0] - R0 - 0.5)} ${r1(hc[1] - 0.4)} A${r1(R0 + 0.5)} ${r1(R0 + 0.6)} 0 0 1 ${r1(hc[0] + R0 + 0.5)} ${r1(hc[1] - 0.4)} Z" fill="#facc15"/>`;
  s += `<ellipse cx="${r1(hc[0] + 0.3)}" cy="${r1(hc[1] - 0.2)}" rx="${r1(R0 + 1.6)}" ry="0.9" fill="#eab308"/>`;
  s += `<path d="M${r1(hc[0] - 1.6)} ${r1(hc[1] - R0 + 0.4)} A2 1.6 0 0 1 ${r1(hc[0] + 0.6)} ${r1(hc[1] - R0 - 0.1)}" fill="none" stroke="#fff6c2" stroke-width="0.7" stroke-linecap="round" stroke-opacity="0.85"/>`;
  return s;
}

/* ───────────── composition ───────────── */
// personnage, casque et arbres posés sur la dalle (z = ZP) : le casque est calculé pour z = ZP, le
// technicien doit donc l'être aussi (sinon le casque flotte 2 unités au-dessus de sa tête)
const tech = person(-12, 30, { facing: 'right', pose: 'stand', top: '#f59e0b', pants: '#34427e', hairStyle: 'short', z: ZP });
const items = [
  { d: -1000, svg: ground },
  { d: -500, svg: hall + annex + roof + stack }, // tout le reste est devant (x ou y plus grands)
  cabinet(35, -1.6), // décalée vers +x : à 32,5 elle masquait à l'écran la porte de service et son hublot
  toolbox(-1, 27),
  { d: tech.d, svg: tech.svg + hardHat(-12, 30) },
  treeRound(-66, 22, { size: 1, z: ZP }),
  treeCone(58, -58, { size: 0.9, z: ZP }),
];
const cs = contactShadow(`${ID}-cs`, 150, 66, 200, 304, 0.18);
defs.push(cs.defs);
const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// manifeste : labelY = haut du faîtage (fumée et cheminée fine exclues) ; hit = halle + appentis
const main = bounds(roof + annex + F(box(X0, Y0, 0, X1 - X0, Y1 - Y0, ZW).left, '#000'));
const man = { id: ID, title: TITLE, labelY: Math.round(main.y), hit: { x: Math.floor(main.x - 2), y: Math.floor(main.y - 2), w: Math.ceil(main.w + 4), h: Math.ceil(main.h + 4) } };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man), { defs: defs.join('').length, ground: ground.length, hall: hall.length, annex: annex.length, roof: roof.length, stack: stack.length });
