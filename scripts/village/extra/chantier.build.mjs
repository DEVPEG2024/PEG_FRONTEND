// Chantier des projets (case derrière le bâtiment Projets) : une petite maison par projet, à son stade
// — fondations (BAT à valider), murs (en production), toit (prêt), livrée (drapeau) — et une grue.
// Voitures garées devant la Boutique (commandes du jour).
// Objets centrés sur l'ancre monde (0, 0) = point (200, 300) de la toile 400 × 400.
//   node extra/chantier.build.mjs && node tools/lint.mjs extra/chantier-*.svg extra/car-*.svg
import { writeFileSync } from 'node:fs';
import { P, box, gableX, line, onLeft, onRight, onTop, poly, svgDoc } from '../tools/iso.mjs';
import { bounds, car, crate, manifest, person, pottedPlant, bush } from '../tools/props.mjs';

const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${Math.round(o * 100) / 100}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const FE = (d, fill) => `<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`;
const S = (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
const solid = (b, c) => F(b.left, c.lit) + F(b.right, c.dark) + F(b.top, c.top);

const CONCRETE = { lit: '#d5d8e0', dark: '#bfc3cf', top: '#e6e8ee' };
const BLOCK = { lit: '#efe3d0', dark: '#dacbb2', top: '#f7eedf' };
const WALL = { lit: '#f7f7fb', dark: '#dfe2ee', top: '#ffffff' };
const WOOD = { lit: '#d9a066', dark: '#c08549', top: '#e8b77f' };
const BRICK = { lit: '#c9653f', dark: '#ad5233', top: '#dc805c' };
const YELLOW = { lit: '#f6c445', dark: '#d9a92e', top: '#ffd96b' };
const ROOF = { back: '#6352e6', front: '#7c6bff', ridge: '#a99cff' };
const REBAR = '#9a5b3c';
const SHADOW = '#5a4a3a';

// Emprise de la maison : x ∈ [X0, X1], y ∈ [Y0, Y1]. Faces visibles : +y (gauche, éclairée), +x (droite, ombrée).
const X0 = -22, X1 = 22, Y0 = -19, Y1 = 19, SLAB = 3.5, ZW = SLAB + 18;

/** Ombre portée douce vers la droite de l'écran. */
const shadow = (k = 16) => F(poly([[X0 - 2, Y0 - 2, 0], [X1 + 2 + k, Y0 - 2 - k, 0], [X1 + 2 + k, Y1 + 2 - k, 0], [X1 + 2, Y1 + 2, 0], [X0 - 2, Y1 + 2, 0]]), SHADOW, 0.12);
const slab = () => solid(box(X0 - 1, Y0 - 1, 0, X1 - X0 + 2, Y1 - Y0 + 2, SLAB), CONCRETE);
/** Joints horizontaux de parpaings sur les deux faces visibles. */
const mortar = (z0, z1) => {
  let d = '';
  for (let z = z0 + 4; z < z1 - 0.5; z += 4) d += line([[X0, Y1, z], [X1, Y1, z], [X1, Y0, z]]) + ' ';
  return S(d.trim(), '#cdbb9c', 0.5, 0.8);
};
/** Ouverture (fenêtre ou porte) sur la face +y ou +x : vide sombre, ou vitrée. */
const openingY = (x0, x1, z0, z1, glass = false) =>
  F(onLeft(Y1 + 0.05, x0, x1, z0, z1), glass ? '#8ab3f8' : '#5b6378') +
  (glass ? S(line([[x0, Y1 + 0.1, z0], [x1, Y1 + 0.1, z0], [x1, Y1 + 0.1, z1], [x0, Y1 + 0.1, z1], [x0, Y1 + 0.1, z0]]), '#ffffff', 0.8) + F(onLeft(Y1 + 0.12, x0 + 1, x0 + 2.6, z0 + 1, z1 - 1), '#ffffff', 0.35) : '');
const openingX = (y0, y1, z0, z1, glass = false) =>
  F(onRight(X1 + 0.05, y0, y1, z0, z1), glass ? '#6f9ef5' : '#4c5367') +
  (glass ? S(line([[X1 + 0.1, y0, z0], [X1 + 0.1, y1, z0], [X1 + 0.1, y1, z1], [X1 + 0.1, y0, z1], [X1 + 0.1, y0, z0]]), '#eef2fb', 0.8) : '');
/** Mât d'échafaudage (tube) et planche. */
const pole = (x, y, z0, z1) => S(line([[x, y, z0], [x, y, z1]]), '#6f7891', 1.1);
const plankY = (y, z) => solid(box(X0 - 2, y - 2, z, X1 - X0 + 4, 4, 1.1), WOOD);
const plankX = (x, z) => solid(box(x - 2, Y0 - 2, z, 4, Y1 - Y0 + 4, 1.1), WOOD);
/** Pile de briques sur palette. */
const bricks = (x, y) => solid(box(x - 7, y - 5, 0, 14, 10, 1.6), WOOD) + solid(box(x - 6, y - 4.2, 1.6, 12, 8.4, 6.5), BRICK) +
  S(line([[x - 6, y + 4.2, 3.8], [x + 6, y + 4.2, 3.8], [x + 6, y - 4.2, 3.8]]) + ' ' + line([[x - 6, y + 4.2, 6], [x + 6, y + 4.2, 6], [x + 6, y - 4.2, 6]]), '#f1c2a8', 0.45, 0.8);
const worker = (x, y, o) => person(x, y, { hair: '#f6c445', scale: 0.62, ...o }).svg;
/** Toit à deux pans (faîtage selon x) + pignon côté +x. */
const roof = () => {
  const g = gableX(X0 - 2.5, Y0 - 2.5, ZW, X1 - X0 + 5, Y1 - Y0 + 5, 15);
  return F(g.back, ROOF.back) + F(g.front, ROOF.front) + F(g.gable, WALL.dark) +
    S(line([[X0 - 2.5, 0, ZW + 15], [X1 + 2.5, 0, ZW + 15]]), ROOF.ridge, 1.2) +
    S(line([[X0 - 2.5, Y1 + 2.5, ZW], [X1 + 2.5, Y1 + 2.5, ZW]]), '#5a4bd6', 0.9);
};

const out = (id, title, body) => {
  writeFileSync(new URL(`./${id}.svg`, import.meta.url), svgDoc({ title, body }));
  writeFileSync(new URL(`./${id}.json`, import.meta.url), JSON.stringify(manifest(id, title, bounds(body)), null, 2) + '\n');
};

// ── Fondations : dalle, fers en attente, coffrage, palette de briques, ouvrier ──
{
  let b = shadow();
  const backRebar = [], frontRebar = [];
  for (const x of [-18, -9, 0, 9, 18]) { backRebar.push([x, Y0 + 1.5]); frontRebar.push([x, Y1 - 1.5]); }
  for (const y of [-9, 0, 9]) { backRebar.push([X0 + 1.5, y]); frontRebar.push([X1 - 1.5, y]); }
  b += slab();
  b += S(backRebar.map(([x, y]) => line([[x, y, SLAB], [x, y, SLAB + 9]])).join(' '), REBAR, 1.0);
  b += S(frontRebar.map(([x, y]) => line([[x, y, SLAB], [x, y, SLAB + 9]])).join(' '), REBAR, 1.0);
  b += S(line([[-18, Y1 - 1.5, SLAB + 6], [18, Y1 - 1.5, SLAB + 6]]) + ' ' + line([[X1 - 1.5, -9, SLAB + 6], [X1 - 1.5, 9, SLAB + 6]]), REBAR, 0.7, 0.9);
  b += solid(box(X0 - 2, Y1 + 1.2, 0, X1 - X0 + 4, 1.4, 5), WOOD) + solid(box(X1 + 1.2, Y0 - 2, 0, 1.4, Y1 - Y0 + 4.6, 5), WOOD);
  b += bricks(-30, 25);
  b += worker(14, 29, { facing: 'back-left', top: '#f97316' });
  out('chantier-fondations', 'Chantier : fondations', b);
}

// ── Murs : parpaings ouverts sur le dessus, échafaudage côté +y, ouvrier sur la planche ──
{
  let b = shadow();
  b += slab();
  const inner = 3;
  // intérieur vu par le haut : sol, faces intérieures des murs du fond
  b += F(onTop(SLAB, X0 + inner, Y0 + inner, X1 - inner, Y1 - inner), '#c4b59c');
  b += F(onLeft(Y0 + inner, X0 + inner, X1 - inner, SLAB, ZW), '#e4d7c1') + F(onRight(X0 + inner, Y0 + inner, Y1 - inner, SLAB, ZW), '#cdbda2');
  const walls = box(X0, Y0, SLAB, X1 - X0, Y1 - Y0, ZW - SLAB);
  b += F(walls.left, BLOCK.lit) + F(walls.right, BLOCK.dark);
  b += mortar(SLAB, ZW);
  b += FE(walls.top + ' ' + onTop(ZW, X0 + inner, Y0 + inner, X1 - inner, Y1 - inner), BLOCK.top);
  b += openingY(-15, -7, 9, 16.5) + openingY(-2, 4, SLAB, 17) + openingY(8, 15, 9, 16.5) + openingX(-9, -1, 9, 16.5) + openingX(5, 12, 9, 16.5);
  // échafaudage devant la face +y
  const ys = Y1 + 4;
  b += [-21, -6, 9, 21].map((x) => pole(x, ys, 0, 25)).join('');
  b += S(line([[-21, ys, 1], [-6, ys, 12]]) + ' ' + line([[-6, ys, 1], [9, ys, 12]]) + ' ' + line([[9, ys, 1], [21, ys, 12]]), '#8a92a8', 0.6, 0.85);
  b += plankY(ys, 11.5) + plankY(ys, 22);
  b += worker(2, ys, { z: 12.6, facing: 'back-right', top: '#0ea5e9' });
  b += bricks(31, 22);
  out('chantier-murs', 'Chantier : murs', b);
}

// ── Toit : maison fermée, toit posé, échafaudage côté +x, échelle, ouvrier ──
{
  let b = shadow();
  b += slab();
  const walls = box(X0, Y0, SLAB, X1 - X0, Y1 - Y0, ZW - SLAB);
  b += solid(walls, WALL);
  b += openingY(-15, -7, 9, 16.5, true) + openingY(-2, 4, SLAB, 17) + openingY(8, 15, 9, 16.5, true) + openingX(-9, -1, 9, 16.5, true) + openingX(5, 12, 9, 16.5, true);
  b += roof();
  const xs = X1 + 4.5;
  b += [-17, 0, 17].map((y) => pole(xs, y, 0, 26)).join('');
  b += plankX(xs, 11.5) + plankX(xs, 21.5);
  // échelle appuyée sur la face +y
  b += S(line([[-27, Y1 + 9, 0], [-27, Y1 + 0.6, ZW + 1]]) + ' ' + line([[-22.5, Y1 + 9, 0], [-22.5, Y1 + 0.6, ZW + 1]]), '#a8763f', 1.0);
  let rungs = '';
  for (let t = 0.12; t < 1; t += 0.16) rungs += line([[-27, Y1 + 9 - 8.4 * t, (ZW + 1) * t], [-22.5, Y1 + 9 - 8.4 * t, (ZW + 1) * t]]) + ' ';
  b += S(rungs.trim(), '#a8763f', 0.8);
  b += worker(-31, 18, { facing: 'right', top: '#16a34a' });
  out('chantier-toit', 'Chantier : toit', b);
}

// ── Livrée : maison finie, pelouse, porte au ruban, drapeau violet, plantes ──
{
  let b = F(onTop(0.2, X0 - 9, Y0 - 7, X1 + 9, Y1 + 11), '#cfe6b6') + S(line([[X0 - 9, Y1 + 11, 0.2], [X1 + 9, Y1 + 11, 0.2], [X1 + 9, Y0 - 7, 0.2]]), '#b2d394', 1.2);
  b += shadow();
  b += solid(box(X0 - 1, Y0 - 1, 0, X1 - X0 + 2, Y1 - Y0 + 2, 2.5), { lit: '#e3e5ef', dark: '#cfd3e2', top: '#eef0f6' });
  const walls = box(X0, Y0, 2.5, X1 - X0, Y1 - Y0, ZW - 2.5);
  b += solid(walls, WALL);
  b += openingY(-15, -7, 9, 16.5, true) + openingY(8, 15, 9, 16.5, true) + openingX(-9, -1, 9, 16.5, true) + openingX(5, 12, 9, 16.5, true);
  // porte en bois, ruban rouge et nœud
  b += F(onLeft(Y1 + 0.05, -2.5, 3.5, 2.5, 16), '#a0673f') + F(onLeft(Y1 + 0.1, -1.5, 2.5, 3.5, 15), '#b8794b');
  b += S(line([[-4.5, Y1 + 0.3, 10], [5.5, Y1 + 0.3, 10]]), '#ef4444', 1.4);
  b += F(poly([[0.5, Y1 + 0.4, 10], [-2.6, Y1 + 0.4, 12.4], [-2.6, Y1 + 0.4, 7.6]]), '#ef4444') + F(poly([[0.5, Y1 + 0.4, 10], [3.6, Y1 + 0.4, 12.4], [3.6, Y1 + 0.4, 7.6]]), '#dc2626');
  b += roof();
  // plantes de part et d'autre de la porte (devant la façade +y)
  b += pottedPlant(-9, Y1 + 3.5, { size: 0.6 }).svg + pottedPlant(11, Y1 + 3.5, { size: 0.6, pot: 'square' }).svg;
  b += bush(-17, Y1 + 5, { w: 10, d: 5, h: 6 }).svg;
  // drapeau vert « livré » au coin avant droit (le violet se perdait sur le toit)
  const fx = X1 + 6, fy = Y1 + 7;
  b += S(line([[fx, fy, 0], [fx, fy, 44]]), '#6f7891', 1.2);
  b += F(poly([[fx, fy, 43.5], [fx + 13, fy, 41], [fx + 15, fy, 37.5], [fx + 1.5, fy, 35.5]]), '#16a34a') + `<circle cx="${r1(P(fx + 7.5, fy, 39.6)[0])}" cy="${r1(P(fx + 7.5, fy, 39.6)[1])}" r="1.6" fill="#ffffff" fill-opacity="0.85"/>`;
  b += `<circle cx="${r1(P(fx, fy, 44.6)[0])}" cy="${r1(P(fx, fy, 44.6)[1])}" r="1.2" fill="#f6c445"/>`;
  out('chantier-livre', 'Maison livrée', b);
}

// ── Grue à tour : flèche vers +x au-dessus des maisons, contre-flèche et lest vers −x ──
{
  const ZT = 124, ZJ = 127;
  let b = F(poly([[-8, -8, 0], [30, -46, 0], [36, -40, 0], [8, 8, 0], [-8, 8, 0]]), SHADOW, 0.1);
  b += solid(box(-7, -7, 0, 14, 14, 4), CONCRETE);
  // contre-flèche et lest (derrière le mât)
  b += solid(box(-31, -1.6, ZJ, 28, 3.2, 3.2), YELLOW) + solid(box(-33, -4.5, ZJ - 8, 9, 9, 8), CONCRETE);
  // mât en treillis
  const mast = box(-3.2, -3.2, 4, 6.4, 6.4, ZT - 4);
  b += F(mast.left, YELLOW.lit) + F(mast.right, YELLOW.dark);
  let lat = '';
  for (let z = 4; z < ZT - 6; z += 8) {
    lat += line([[-3.2, 3.2, z], [3.2, 3.2, z + 8]]) + ' ' + line([[3.2, 3.2, z], [3.2, -3.2, z + 8]]) + ' ';
    lat += line([[-3.2, 3.2, z + 8], [3.2, 3.2, z + 8], [3.2, -3.2, z + 8]]) + ' ';
  }
  b += S(lat.trim(), '#b78a1d', 0.55, 0.9);
  // pivot et cabine
  b += solid(box(-4.6, -4.6, ZT, 9.2, 9.2, 3), { lit: '#4b5373', dark: '#363d58', top: '#5d6690' });
  b += solid(box(0.5, 2.2, ZT - 6, 7.5, 6, 7.5), YELLOW) + F(onLeft(8.25, 1.5, 7, ZT - 4, ZT), '#6f93dc');
  // tête de mât + tirants
  b += S(line([[0, 0, ZJ + 3.2], [0, 0, ZJ + 19]]), '#d9a92e', 1.6);
  b += S(line([[0, 0, ZJ + 19], [86, 0, ZJ + 3.2]]) + ' ' + line([[0, 0, ZJ + 19], [-30, 0, ZJ + 3.2]]), '#7d8499', 0.6);
  // flèche en treillis
  const jib = box(3, -1.6, ZJ, 84, 3.2, 3.6);
  b += F(jib.left, YELLOW.lit) + F(jib.right, YELLOW.dark) + F(jib.top, YELLOW.top);
  let jl = '';
  for (let x = 3; x < 86; x += 6) jl += line([[x, 1.6, ZJ], [x + 3, 1.6, ZJ + 3.6], [x + 6, 1.6, ZJ]]) + ' ';
  b += S(jl.trim(), '#b78a1d', 0.5, 0.9);
  // chariot, câble, crochet et charge (palette de cartons)
  const xt = 60;
  b += solid(box(xt - 2.5, -2, ZJ - 2, 5, 4, 2), { lit: '#4b5373', dark: '#363d58', top: '#5d6690' });
  b += S(line([[xt, 0, ZJ - 2], [xt, 0, 66]]), '#4b5373', 0.6);
  b += S(line([[xt, 0, 66], [xt - 5, 0, 61]]) + ' ' + line([[xt, 0, 66], [xt + 5, 0, 61]]), '#4b5373', 0.5);
  b += solid(box(xt - 6.5, -5, 58.6, 13, 10, 2.2), WOOD);
  b += crate(xt - 2.5, -2, 60.8, { size: 7, h: 6 }).svg + crate(xt + 3, 2, 60.8, { size: 6, h: 5 }).svg;
  out('chantier-grue', 'Grue du chantier', b);
}

// ── Voitures garées (le long des rues orientées selon y) ──
out('car-y-red', 'Voiture', car(0, 0, { facing: 'y', color: '#ef4444' }).svg);
out('car-y-blue', 'Voiture', car(0, 0, { facing: 'y', color: '#3b82f6' }).svg);
out('car-y-amber', 'Voiture', car(0, 0, { facing: 'y', color: '#f59e0b' }).svg);
console.log('ok chantier + voitures');
