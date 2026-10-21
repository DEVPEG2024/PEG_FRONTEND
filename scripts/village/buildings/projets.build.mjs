// Village PEG — « Projets » : le QG de PEG, monument central (réf. « Mes projets » de ref.png).
// Deux niveaux, toit violet en pavillon, grande baie vitrée sur deux étages, lettres « PEG » en relief
// sur la façade +x, pergola en bois (table, chaises, une collègue au portable) côté gauche, porte
// vitrée sous marquise, massif fleuri, buissons, plantes en pot, un visiteur qui arrive.
//   node buildings/projets.build.mjs && node tools/lint.mjs buildings/projets.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, hip, compose, contactShadow, svgDoc, shade, tint } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, pottedPlant, flowerBed, bounds, BENCH_SEAT } from '../tools/props.mjs';

const ID = 'projets', TITLE = 'Projets';
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };

/* ───────────── petits outils ───────────── */
const defs = [];
const seen = new Set();
/** Dégradé linéaire (objectBoundingBox, vertical par défaut) — id préfixé par le sprite. */
function lin(name, stops, dir = [0, 0, 0, 1]) {
  const id = `${ID}-${name}`;
  if (!seen.has(id)) {
    seen.add(id);
    defs.push(`<linearGradient id="${id}" x1="${dir[0]}" y1="${dir[1]}" x2="${dir[2]}" y2="${dir[3]}">` +
      stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('') +
      '</linearGradient>');
  }
  return `url(#${id})`;
}
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${o}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const S = (d, color, w, o) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;

// Coordonnées « de façade » (u le long du mur, z) → monde.
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z])); // façade +y (éclairée), u = x
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z])); // façade +x (ombrée), u = y
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];

/** Découpe d'un polygone 2D par un demi-plan (axe k, valeur v, côté s). */
function half(pts, k, v, s) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ia = (a[k] - v) * s >= -1e-9, ib = (b[k] - v) * s >= -1e-9;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (v - a[k]) / (b[k] - a[k]); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
  }
  return out;
}
const clip = (pts, u0, u1, z0, z1) => [[0, u0, 1], [0, u1, -1], [1, z0, 1], [1, z1, -1]].reduce((p, [k, v, s]) => (p.length ? half(p, k, v, s) : p), pts);
/** Pavé coloré (faces +x, +y, dessus). */
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + F(b.top, c.top); };

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const VIOLET = '#7c6bff';
const WALL_L = lin('wall-l', [[0, '#ffffff'], [1, '#f0f1f7']]);
const WALL_R = lin('wall-r', [[0, '#e8eaf3'], [1, '#d8dbe9']]);
const GL_L = lin('glass-l', [[0, '#b6d6ff'], [0.5, '#8fb9fb'], [1, '#6f9ef5']]);
const GL_R = lin('glass-r', [[0, '#88b0f0'], [1, '#5579c6']]);
const ROOF_F = lin('roof-f', [[0, '#9a8eff'], [1, '#8576fb']]);
const ROOF_R = lin('roof-r', [[0, shade(VIOLET, 0.9)], [1, shade(VIOLET, 0.83)]]);
const EAVE = lin('eave', [[0, NAVY, 0.18], [1, NAVY, 0]]);
const WOOD = { lit: '#d9a066', dark: '#c08549', top: '#e4b47f' };
const IRON = { lit: '#4b5373', dark: '#363d58', top: '#5d6690' };

/**
 * Vitrage encastré (coordonnées de façade). Le verre est en retrait de t : il apparaît décalé de
 * (+t, +t), ce qui dévoile l'embrasure (côté u0) et l'appui (en bas) — comme en 3D, sans clip-path.
 */
function glazing(map, lit, u0, u1, z0, z1, o = {}) {
  const t = o.t ?? 1.6, cols = o.cols ?? 1, rows = o.rows ?? 1, mw = o.mull ?? 0.9, mc = o.mullColor ?? NAVY;
  let s = '';
  s += F(map([[u0, z0], [u0 + t, z0 + t], [u0 + t, z1], [u0, z1]]), lit ? '#d3d7e6' : '#f0f1f7'); // embrasure
  s += F(map([[u0, z0], [u1, z0], [u1, z0 + t], [u0 + t, z0 + t]]), lit ? '#ffffff' : '#eceef5'); // appui
  const g = [u0 + t, u1, z0 + t, z1];
  s += F(map(R(...g)), o.glass ?? (lit ? GL_L : GL_R));
  if (o.inner) s += o.inner(map, ...g);
  // reflets : bandes obliques dans le plan du vitrage
  const m = (lit ? 0.62 : -0.62) * 1.6, zm = (z0 + z1) / 2;
  let rp = '';
  for (const [a, w] of o.streaks ?? [[0.18, 0.2], [0.47, 0.07]]) {
    const uc = u0 + (u1 - u0) * a, ww = (u1 - u0) * w;
    const band = [[uc - ww / 2 - m * (zm - z0), z0], [uc + ww / 2 - m * (zm - z0), z0], [uc + ww / 2 + m * (z1 - zm), z1], [uc - ww / 2 + m * (z1 - zm), z1]];
    const c = clip(band, ...g);
    if (c.length > 2) rp += map(c);
  }
  if (rp) s += F(rp, '#ffffff', o.streakO ?? 0.3);
  // meneaux (dans le plan du verre → décalés de +t, puis découpés par l'ouverture)
  let mp = '';
  for (let i = 0; i <= cols; i++) {
    const u = u0 + ((u1 - u0) * i) / cols + t;
    const a = i === 0 ? u : u - mw / 2, b = i === 0 ? u + mw : u + mw / 2;
    const c = clip(R(a, b, z0 + t, z1 + t), ...g);
    if (c.length > 2) mp += map(c);
  }
  for (let j = 0; j <= rows; j++) {
    const z = z0 + ((z1 - z0) * j) / rows + t, th = (o.rowW && o.rowW[j]) || mw;
    const a = j === 0 ? z : z - th / 2, b = j === 0 ? z + th : z + th / 2;
    const c = clip(R(u0 + t, u1 + t, a, b), ...g);
    if (c.length > 2) mp += map(c);
  }
  if (mp) s += F(mp, mc);
  return s;
}

/* ───────────── géométrie du QG ───────────── */
const X0 = -60, X1 = 54, Y0 = -63, Y1 = 10;
const ZG = 3;       // dessus de la terrasse
const ZT = 94;      // haut des murs
const ZF = 50;      // plancher de l'étage
const OH = 5.5, FT = 3.6, RISE = 40; // pente ≈ 44° : pans arrière réduits à un fin biseau (comme la référence)
const TX0 = -74, TX1 = 70, TY0 = -76, TY1 = 52; // terrasse blanche

const L = onY(Y1), Rt = onX(X1);
let bld = '';

/* murs, soubassement, bandeau d'étage, ombre de l'avant-toit */
bld += F(L(R(X0, X1, ZG, ZT)), WALL_L) + F(Rt(R(Y0, Y1, ZG, ZT)), WALL_R);
bld += F(L(R(X0, X1, ZG, ZG + 5)), '#e3e5ef') + F(Rt(R(Y0, Y1, ZG, ZG + 5)), '#cfd3e2');
bld += F(L(R(X0, X1, ZF - 0.9, ZF + 0.9)), '#e9ebf3') + F(Rt(R(Y0, Y1, ZF - 0.9, ZF + 0.9)), '#d0d4e3');
bld += S(line([[X0, Y1, ZG + 5], [X1, Y1, ZG + 5], [X1, Y0, ZG + 5]]) + ' ' + line([[X0, Y1, ZF + 0.9], [X1, Y1, ZF + 0.9], [X1, Y0, ZF + 0.9]]), '#ffffff', 0.8, 0.9);
bld += F(L(R(X0, X1, ZT - 13, ZT)), EAVE) + F(Rt(R(Y0, Y1, ZT - 13, ZT)), EAVE);

/* façade +y : deux fenêtres hautes, porte vitrée sous la pergola, grande baie sur deux niveaux */
bld += glazing(L, true, -51, -38, 60, 74, { streaks: [[0.3, 0.24]], streakO: 0.32 });
bld += glazing(L, true, -31, -18, 60, 74, { streaks: [[0.3, 0.24]], streakO: 0.32 });
bld += glazing(L, true, -46, -30, ZG, 35, { cols: 2, t: 1.4, streaks: [[0.3, 0.14]] });

const interior = (map, u0, u1, z0, z1) => {
  let s = '';
  // dalle d'étage vue à travers le verre + plafonniers
  s += F(map(R(u0, u1, ZF - 3.4, ZF + 1.4)), '#eaf2ff', 0.8);
  s += F(map(R(u0, u1, ZF - 4.8, ZF - 3.4)) + map(R(u0, u1, z1 - 2.4, z1 - 1)), '#fff3cf', 0.7);
  // rez : bureau, deux écrans allumés, un collègue
  s += F(map(R(u0 + 4, u0 + 33, 21, 22.6)), NAVY, 0.3);
  s += F(map(R(u0 + 6, u0 + 14, 23.2, 30.2)) + map(R(u0 + 17, u0 + 25, 23.2, 30.2)), NAVY, 0.4);
  s += F(map(R(u0 + 6.7, u0 + 13.3, 23.9, 29.5)), '#e6f5ff') + F(map(R(u0 + 17.7, u0 + 24.3, 23.9, 29.5)), '#9ad1ff');
  s += F(map(R(u0 + 28, u0 + 33, 22.6, 31)) + map([[u0 + 27.6, 31.4], [u0 + 33.4, 31.4], [u0 + 32.8, 34.6], [u0 + 28.2, 34.6]]), NAVY, 0.22);
  // étage : étagères de classeurs colorés
  for (const zz of [56, 65]) {
    s += F(map(R(u0 + 3, u1 - 3, zz - 0.7, zz)), NAVY, 0.25);
    let x = u0 + 4, k = 0;
    const cols = ['#7c6bff', '#f59e0b', '#0ea5e9', '#14b8a6', '#ef8aa0'];
    for (const w of [2.2, 1.6, 2.4, 1.8, 3, 2, 1.6, 2.6, 2, 1.8, 2.4]) {
      if (x + w > u1 - 4) break;
      s += F(map(R(x, x + w - 0.45, zz, zz + 6 - (k % 3) * 0.9)), cols[k % 5], 0.45);
      x += w + (zz === 56 ? 0.5 : 1.3); k++;
    }
  }
  return s;
};
bld += glazing(L, true, -10, 42, 12, 80, {
  cols: 3, rows: 2, t: 2, mull: 1.15, rowW: [1.3, 3.6, 1.3], inner: interior, streakO: 0.28,
  streaks: [[0.1, 0.13], [0.29, 0.05], [0.6, 0.17], [0.81, 0.05]],
});

/* façade +x : fenêtre basse, grandes lettres « PEG » en relief, double porte vitrée sous marquise */
bld += glazing(Rt, false, -28, -4, 15, 35, { cols: 2, t: 1.4, streaks: [[0.25, 0.14], [0.7, 0.07]], streakO: 0.24 });
const textOnX = (X, u, z, size, fill, o) => {
  const [ex, ey] = P(X, u, z);
  return `<text transform="matrix(0.866,-0.5,0,1,${r1(ex)},${r1(ey)})" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${size}" letter-spacing="1.2"${op(o)} fill="${fill}">PEG</text>`;
};
{
  const fs = 26.5, z = 55.5, u = (Y0 + Y1) / 2 + (fs * 2.112 + 3 * 1.2) / 2; // centré sur la façade
  bld += textOnX(X1, u - 2, z - 2.6, fs, NAVY, 0.12);   // ombre portée sur le mur
  bld += textOnX(X1 + 0.6, u, z, fs, '#7383cc');         // tranche éclairée (relief)
  bld += textOnX(X1 + 1.2, u, z, fs, '#5c6cb8');
  bld += textOnX(X1 + 1.8, u, z, fs, NAVY);              // face des lettres
}
bld += glazing(Rt, false, -58, -40, ZG, 33, { cols: 2, t: 1.4, mull: 1.0, streaks: [[0.3, 0.16], [0.75, 0.08]], streakO: 0.24 });
{
  // poignées : une par battant, de part et d'autre du meneau central, dans le plan du vitrage (retrait t)
  const t = 1.4, um = (-58 + -40) / 2 + t;
  bld += S(line([[X1, um + 1.2, 16.4], [X1, um + 1.2, 22.4]]) + ' ' + line([[X1, um - 1.2, 16.4], [X1, um - 1.2, 22.4]]), '#dfe3ec', 0.9);
}
{
  // marquise au-dessus de la porte (dalle blanche + ombre)
  bld += F(Rt(R(-60, -38, 32, 35.4)), NAVY, 0.1);
  bld += cube(X1, -60, 35, 8, 22, 2, { lit: '#eceef5', dark: '#d2d6e4', top: '#ffffff' });
  bld += S(line([[X1 + 8, -38, 37], [X1 + 8, -60, 37]]), '#ffffff', 0.7, 0.9);
}
// arête verticale claire (coin avant)
bld += S(line([[X1, Y1, ZG + 5], [X1, Y1, ZT]]), '#ffffff', 1, 0.9);

/* toit en pavillon : avant-toit épais, pans violets, liserés clairs */
const rx0 = X0 - OH, ry0 = Y0 - OH, rw = X1 - X0 + 2 * OH, rd = Y1 - Y0 + 2 * OH, zr = ZT + FT;
let roof = '';
{
  const fas = box(rx0, ry0, ZT, rw, rd, FT);
  roof += F(fas.right, shade('#6352e6', 0.86)) + F(fas.left, '#6352e6');
  const hp = hip(rx0, ry0, zr, rw, rd, RISE);
  roof += F(hp.back, shade(VIOLET, 0.75)) + F(hp.left, shade(VIOLET, 0.78)) + F(hp.front, ROOF_F) + F(hp.right, ROOF_R);
  const a = [rx0 + rd / 2, ry0 + rd / 2, zr + RISE], b = [rx0 + rw - rd / 2, ry0 + rd / 2, zr + RISE];
  const fl = [rx0, ry0 + rd, zr], fr = [rx0 + rw, ry0 + rd, zr], br = [rx0 + rw, ry0, zr];
  roof += S(line([fl, fr, br]), tint(VIOLET, 0.42), 1.3, 0.95);     // arête des avant-toits
  roof += S(line([fr, b]), tint(VIOLET, 0.35), 1.2, 0.9);           // arêtier avant
  roof += S(line([fl, a, b, br]), tint(VIOLET, 0.3), 0.9, 0.75);     // faîtage + arêtiers
  roof += S(line([[rx0, ry0 + rd, ZT + 0.3], [rx0 + rw, ry0 + rd, ZT + 0.3], [rx0 + rw, ry0, ZT + 0.3]]), shade('#6352e6', 0.75), 0.7, 0.7);
}

/* terrasse blanche, joints, ombre douce du bâtiment */
let ground = '';
{
  const ter = box(TX0, TY0, 0, TX1 - TX0, TY1 - TY0, ZG);
  ground += F(ter.right, '#d3d6e3') + F(ter.left, '#e5e7f0') + F(ter.top, lin('ter', [[0, '#f7f7fa'], [1, '#f0f1f6']]));
  ground += S(line([[TX0, TY1, ZG], [TX1, TY1, ZG], [TX1, TY0, ZG]]), '#ffffff', 1);
  let j = '';
  for (let x = TX0 + 18; x < TX1 - 2; x += 18) j += line([[x, Y1 + 0.5, ZG], [x, TY1, ZG]]) + ' ';
  for (let y = Y1 + 14; y < TY1 - 2; y += 14) j += line([[TX0, y, ZG], [TX1, y, ZG]]) + ' ';
  for (let y = TY0 + 18; y < Y1; y += 18) j += line([[X1 + 0.5, y, ZG], [TX1, y, ZG]]) + ' ';
  ground += S(j.trim(), '#e1e3eb', 0.55);
  const sh = (k, o) => {
    const c = clip([[X1, Y1], [X1 + k, Y1 - k], [X1 + k, Y0 - k], [X0 + k, Y0 - k], [X0, Y0], [X1, Y0]], TX0, TX1, TY0, TY1);
    return F(poly(c.map(([x, y]) => [x, y, ZG])), '#5a4a3a', o);
  };
  ground += sh(20, 0.045) + sh(13, 0.05) + sh(6, 0.06);
  ground += F(poly([[X0, Y1, ZG], [X1, Y1, ZG], [X1 + 2.4, Y1 + 2.4, ZG], [X0, Y1 + 2.4, ZG]]), '#5a4a3a', 0.06);
}

/* pergola en bois : poteaux, table, chaises, une collègue au portable, plateau de planches */
const PG = { x0: -59, x1: -13, y0: Y1, y1: 37, z: 39 };
let perg = '';
const post = (x, y) => cube(x - 1.1, y - 1.1, ZG, 2.2, 2.2, PG.z - ZG, WOOD);
// ombre du plateau au sol d'abord : elle passe SOUS les poteaux arrière, pas sur eux
perg += F(poly([[PG.x0, PG.y0, ZG], [PG.x1, PG.y0, ZG], [PG.x1 + 9, PG.y1 - 9, ZG], [PG.x1 + 9, PG.y1 - 3, ZG], [PG.x0 + 6, PG.y1 - 3, ZG]]), '#5a4a3a', 0.07);
perg += post(PG.x0 + 2.5, PG.y0 + 2) + post(PG.x1 - 2.5, PG.y0 + 2);
/** Chaise (assise à BENCH_SEAT) ; dossier du côté `back` ('+y' ou '+x' = côté spectateur, dessiné après l'assise). */
const chair = (x, y, back) => {
  let legs = '';
  for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]].sort((p, q) => p[0] + p[1] - q[0] - q[1])) legs += cube(x + dx - 0.4, y + dy - 0.4, ZG, 0.8, 0.8, BENCH_SEAT - 0.8, IRON);
  const seat = cube(x - 2.6, y - 2.6, ZG + BENCH_SEAT - 0.9, 5.2, 5.2, 0.9, WOOD);
  const zb = ZG + BENCH_SEAT;
  const bk = back === '+x' ? cube(x + 2.1, y - 2.6, zb, 0.7, 5.2, 6.5, WOOD) : cube(x - 2.6, y + 2.1, zb, 5.2, 0.7, 6.5, WOOD);
  return { base: legs + seat, back: bk };
};
// Table au premier plan de la pergola : tout ce qui est posé au fond (y < 20) passerait sous le plateau.
// La collègue est décalée à gauche → son portable (juste derrière elle) apparaît à droite de sa tête,
// entre elle et le poteau avant droit ; la seconde chaise est en bout de table, bien visible.
const TB = { x0: -46, x1: -26, y0: 18, y1: 25, z: ZG + 11.5 };
const CX = -38.5; // axe de la collègue et de son portable
{
  for (const [x, y] of [[TB.x0 + 1, TB.y0 + 1], [TB.x1 - 2, TB.y0 + 1], [TB.x0 + 1, TB.y1 - 2], [TB.x1 - 2, TB.y1 - 2]]) perg += cube(x, y, ZG, 1, 1, TB.z - ZG, IRON);
  perg += cube(TB.x0, TB.y0, TB.z, TB.x1 - TB.x0, TB.y1 - TB.y0, 1.3, { lit: '#f7f7fb', dark: '#dfe2ee', top: '#ffffff' });
  const z = TB.z + 1.3, a = CX - 3, b = CX + 3;
  // portable ouvert vers la collègue (écran allumé tourné vers nous) + tasse rose + carnet jaune
  perg += F(poly([[a, 20.6, z], [b, 20.6, z], [b, 24.2, z], [a, 24.2, z]]), '#c3c9d6');
  perg += F(poly([[a + 0.6, 21.4, z + 0.05], [b - 0.6, 21.4, z + 0.05], [b - 0.6, 23.2, z + 0.05], [a + 0.6, 23.2, z + 0.05]]), '#9aa2b4', 0.6);
  perg += F(poly([[a, 20.6, z], [b, 20.6, z], [b, 19.6, z + 5], [a, 19.6, z + 5]]), '#3d4466');
  perg += F(poly([[a + 0.5, 20.4, z + 0.6], [b - 0.5, 20.4, z + 0.6], [b - 0.5, 19.75, z + 4.5], [a + 0.5, 19.75, z + 4.5]]), '#9ad1ff');
  perg += F(poly([[a + 1.1, 20.3, z + 3.3], [a + 3.3, 20.3, z + 3.3], [a + 3.3, 20.05, z + 4.2], [a + 1.1, 20.05, z + 4.2]]), '#ffffff', 0.7);
  perg += cube(-34.6, 20.4, z, 1.8, 1.8, 2.2, { lit: '#ef8aa0', dark: '#e06f88', top: '#f7c1cd' });
  perg += F(poly([[-28.8, 18.8, z], [-26.4, 18.8, z], [-26.4, 21.2, z], [-28.8, 21.2, z]]), '#f6c95c');
  perg += S(line([[-28.3, 19.3, z + 0.05], [-28.3, 20.7, z + 0.05]]), '#e0ad3a', 0.4);
}
{
  const c = chair(CX, 29.5, '+y');
  perg += c.base;
  perg += person(CX, 28.5, { facing: 'back-right', pose: 'sit', z: ZG + BENCH_SEAT, top: '#14b8a6', hairStyle: 'bun', hair: '#5a3a26' }).svg;
  perg += c.back;
}
{
  const c = chair(-22.4, 21.5, '+x'); // chaise libre en bout de table, tournée vers la table
  perg += c.base + c.back;
}
perg += post(PG.x0 + 2.5, PG.y1 - 2) + post(PG.x1 - 2.5, PG.y1 - 2);
{
  perg += cube(PG.x0, PG.y0, PG.z - 2.2, PG.x1 - PG.x0, 1.8, 2.2, WOOD) + cube(PG.x0, PG.y1 - 1.8, PG.z - 2.2, PG.x1 - PG.x0, 1.8, 2.2, WOOD);
  const top = box(PG.x0 - 1.5, PG.y0, PG.z, PG.x1 - PG.x0 + 3, PG.y1 - PG.y0 + 1.5, 2.4);
  perg += F(top.right, WOOD.dark) + F(top.left, '#d39a5f') + F(top.top, lin('wood-top', [[0, '#ecbd88'], [1, '#e0aa6e']]));
  let g = '';
  for (let y = PG.y0 + 5.6; y < PG.y1 + 1; y += 5.6) g += line([[PG.x0 - 1.5, y, PG.z + 2.4], [PG.x1 + 1.5, y, PG.z + 2.4]]) + ' ';
  perg += S(g.trim(), '#c08549', 0.6, 0.7);
  perg += S(line([[PG.x0 - 1.5, PG.y1 + 1.5, PG.z + 2.4], [PG.x1 + 1.5, PG.y1 + 1.5, PG.z + 2.4], [PG.x1 + 1.5, PG.y0, PG.z + 2.4]]), '#f7d6ad', 0.9, 0.95);
}

/* abords de la porte +x : paillasson, applique */
let door = '';
door += F(poly([[X1 + 1.5, -57, ZG], [X1 + 8, -57, ZG], [X1 + 8, -41, ZG], [X1 + 1.5, -41, ZG]]), NAVY, 0.85);
door += S(line([[X1 + 2.6, -55.6, ZG], [X1 + 2.6, -42.4, ZG]]), '#5c6cb8', 0.5);
door += cube(X1, -37, 25, 1.2, 1.6, 3.2, { lit: '#4b5373', dark: '#363d58', top: '#5d6690' });
door += F(onX(X1 + 1.25)(R(-36.8, -35.6, 25.6, 27.8)), '#ffe9a8');
door += `<circle cx="${r1(P(X1 + 1.3, -36.2, 26.7)[0])}" cy="${r1(P(X1 + 1.3, -36.2, 26.7)[1])}" r="4.5" fill="#ffe9a8" fill-opacity="0.22"/>`;

/* composition (ordre du peintre : d = x + y au sol) */
const items = [
  { d: -1000, svg: ground },
  // tout ce qui est posé sur la terrasse part de z = ZG (pas du sol de la parcelle)
  treeCone(64, -72, { size: 0.85, z: ZG }),
  { d: (X0 + X1) / 2 + (Y0 + Y1) / 2, svg: bld + roof },
  { d: -10, svg: perg },
  { d: -5, svg: door },
  flowerBed(17, 18.5, 44, 7, { z: ZG, seed: 3 }),
  treeRound(-79, 53, { size: 0.95 }), // au sol, au coin de la terrasse (pas à cheval sur son arête)
  bush(-4, 44, { w: 13, d: 10, h: 10, z: ZG }),
  // pots et buisson de la façade +x : placés par rapport à X1 (s'ils restaient fixes, élargir le QG les ferait entrer dans le mur)
  pottedPlant(X1 + 7, -36, { z: ZG, pot: 'square' }),
  pottedPlant(X1 + 7, -62, { z: ZG, pot: 'square' }),
  bush(X1 + 8, 4, { w: 12, d: 15, h: 12, z: ZG }),
  treeCone(62, 32, { size: 0.84, z: ZG }),
  person(12, 36, { facing: 'right', pose: 'walk', top: VIOLET, z: ZG }),
];
const cs = contactShadow(`${ID}-cs`, 152, 68, 200, 304, 0.18);
defs.push(cs.defs);
const body = cs.el + compose(items);

const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// manifeste : sommet du toit, cadre du bâtiment principal (murs + toit + pergola)
const bb = bounds(roof + F(L(R(X0, X1, ZG, ZT)), '#000') + F(Rt(R(Y0, Y1, ZG, ZT)), '#000') + F(box(PG.x0 - 1.5, PG.y0, 0, PG.x1 - PG.x0 + 3, PG.y1 - PG.y0 + 1.5, PG.z + 2.4).left, '#000'));
const hit = { x: Math.floor(bb.x - 2), y: Math.floor(bb.y - 2), w: Math.ceil(bb.w + 4), h: Math.ceil(bb.h + 4) };
const man = { id: ID, title: TITLE, labelY: Math.round(bounds(roof).y), hit };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
