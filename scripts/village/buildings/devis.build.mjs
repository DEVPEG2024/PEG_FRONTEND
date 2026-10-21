// Village PEG — sprite « Devis » : le bureau d'études, un ATELIER VITRÉ.
// Murs blancs, toit à deux pans bleu #2f6fed au faîtage parallèle à y (en x = −10) : le pignon regarde la
// face éclairée (+y) et il est vitré — grande baie d'atelier à menuiseries bleu nuit et vitrage triangulaire
// sous la pointe. Derrière la baie : table à dessin inclinée vers le spectateur, plan bleu, lampe
// d'architecte, l'architecte. Porte sous marquise à gauche de la baie. Long pan +x : enseigne
// « document + crayon », fenêtre (étagère de classeurs derrière), deux fenêtres de toit sur le pan +x.
// Abords : panier de rouleaux de plans, jardinière, plante en pot, buisson.
// (Avant : faîtage selon x, pignon +x à oculus et panneau — la même maisonnette que Clients et Attributs.)
//   node buildings/devis.build.mjs && node tools/lint.mjs buildings/devis.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, onTop, ellipse, compose, contactShadow, svgDoc, shade, tint } from '../tools/iso.mjs';
import { person, bush, pottedPlant, flowerBed } from '../tools/props.mjs';

const ID = 'devis', TITLE = 'Devis';

/* ───────────── petits outils SVG ───────────── */
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const op = (o, k = 'fill') => (o != null && o < 1 ? ` ${k}-opacity="${Math.round(o * 100) / 100}"` : '');
const F = (d, fill, o) => `<path d="${d}" fill="${fill}"${op(o)}/>`;
const S = (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"${op(o, 'stroke')}/>`;
const scr = (pts) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L') + ' Z';
const defs = [];
const lg = (name, stops, [x1, y1, x2, y2] = [0, 0, 0, 1]) => {
  const id = `${ID}-${name}`;
  defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return `url(#${id})`;
};
/**
 * Dégradé aligné sur un plan du monde (userSpaceOnUse) : offset 0 en A3, offset 1 en B3, isolignes
 * parallèles à la direction monde U3. Un dégradé « boîte englobante » sur une face en biais court le
 * long de la face au lieu de la traverser : celui-ci la traverse vraiment.
 */
const pg = (name, stops, A3, B3, U3) => {
  const A = P(...A3), B = P(...B3), O = P(0, 0, 0), Uv = P(...U3);
  const u = [Uv[0] - O[0], Uv[1] - O[1]], l = Math.hypot(u[0], u[1]), n = [-u[1] / l, u[0] / l];
  const t = (B[0] - A[0]) * n[0] + (B[1] - A[1]) * n[1];
  const id = `${ID}-${name}`;
  defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${r1(A[0])}" y1="${r1(A[1])}" x2="${r1(A[0] + t * n[0])}" y2="${r1(A[1] + t * n[1])}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>');
  return `url(#${id})`;
};
const hull = (points) => {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const castShadow = (foot, z, h, o = 0.06, layers = [1, 0.66, 0.36]) => {
  let s = '';
  for (const t of layers) {
    const k = 0.42 * h * t;
    s += F(scr(hull([...foot.map(([a, b]) => P(a, b, z)), ...foot.map(([a, b]) => P(a + k, b - k, z))])), '#5a4a3a', o);
  }
  return s;
};
/** Rectangle à coins arrondis en 2D (u, v), sens trigo */
const rrect2 = (u0, v0, u1, v1, r, n = 4) => {
  const pts = [];
  const cs = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]];
  for (const [cu, cv, a0] of cs) for (let i = 0; i <= n; i++) { const a = ((a0 + (90 * i) / n) * Math.PI) / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  return pts;
};
/** Polygones posés sur un plan vertical : y = cte (points [x, z]) ou x = cte (points [y, z]) */
const onY = (y) => (pts) => poly(pts.map(([x, z]) => [x, y, z]));
const onX = (x) => (pts) => poly(pts.map(([y, z]) => [x, y, z]));
const lnY = (y) => (pts) => line(pts.map(([x, z]) => [x, y, z]));
const lnX = (x) => (pts) => line(pts.map(([y, z]) => [x, y, z]));
const R2 = (a0, a1, z0, z1) => [[a0, z0], [a1, z0], [a1, z1], [a0, z1]];

/* ───────────── palette ───────────── */
const BLUE = '#2f6fed';
const ROOF_X = shade(BLUE, 0.85);   // pan +x (#285ec9)
const ROOF_B = shade(BLUE, 0.75);   // pan arrière −x (#2353b2)
const EDGE = tint(BLUE, 0.35);      // liserés de rive et de faîtage (#78a1f3)
const NAVY = '#2e3a6e';
const PLINTH = '#e3e5ef', PLINTH_SH = '#cfd3e2';

/* ───────────── géométrie ───────────── */
const X0 = -44, X1 = 24, Y0 = -52, Y1 = 26;        // murs : 68 (x) × 78 (y)
const XR = (X0 + X1) / 2, HALF = (X1 - X0) / 2;   // faîtage en x = −10 ; demi-portée 34
const ZW = 44, RISE = 20, SL = RISE / HALF;       // égout à 44, faîtage +20 (pente ≈ 0,59)
const ZA = ZW + RISE;                             // pointe du pignon (sous-face du toit)
// Débords réduits : vu de (1,1,1), le débord d'égout +x masque OV·(1 + SL) du haut du long pan (l'enseigne
// doit rester entière) et la rive +y masque OG·(1 + SL) du pignon à droite du faîtage (le vitrage aussi).
const TH = 3, OV = 3, OG = 2.5, PL = 5;
const zu = (x) => ZW + SL * (HALF - Math.abs(x - XR));   // sous-face du toit (= haut des murs-pignons)
const zt = (x) => zu(x) + TH;                             // dessus de la couverture
const xa = X0 - OV, xb = X1 + OV, ya = Y0 - OG, yb = Y1 + OG;
// dalle
const SH = 1.6, SX0 = -60, SX1 = 48, SY0 = -64, SY1 = 42;
// ouvertures du pignon (+y)
const DX0 = -41, DX1 = -31, DZ = 28;             // porte
const BX0 = -28, BX1 = 18, BZ0 = 6, BZ1 = 36;    // baie d'atelier
// Montants et traverse placés d'après ce qu'on voit derrière (un point intérieur (x, y, z) se voit sur le
// pignon en (x + 26 − y, z + 26 − y)) : l'architecte dans le carreau gauche, tout le plateau dans le carreau
// central, l'imposte au-dessus des têtes.
const BM = [-17, 9], BT = 31.5;                   // montants, traverse (imposte au-dessus)
// Vitrage triangulaire, côtés parallèles aux rives. Pointe à 59 (5 sous celle du pignon) : à droite du
// faîtage, la rive masque OG·(1 + SL) ≈ 4 du haut du pignon.
const TZ0 = 47, TZ1 = 59, TW = (TZ1 - TZ0) / SL;
const TRI = [[XR - TW, TZ0], [XR + TW, TZ0], [XR, TZ1]];
// fenêtre du long pan (+x)
const WY0 = -47, WY1 = -35, WZ0 = 11, WZ1 = 33;

const items = [];
let ground = '';

/* ── ombre de contact + dalle ── */
{
  const c = P(XR, (Y0 + Y1) / 2, 0);
  const cs = contactShadow(`${ID}-cs`, 124, 54, c[0], c[1] + 8, 0.22);
  defs.push(cs.defs);
  ground += cs.el;
  const b = box(SX0, SY0, 0, SX1 - SX0, SY1 - SY0, SH);
  ground += F(b.left, '#e6e1d8') + F(b.right, '#d8d1c4') + F(b.top, lg('slab', [[0, '#f7f5f1'], [1, '#efebe4']]));
  ground += S(line([[SX0, SY1, SH], [SX1, SY1, SH], [SX1, SY0, SH]]), '#ffffff', 0.9, 0.8);
  // joints de dallage : devant le pignon (selon y) et devant le long pan (selon x)
  let j = '';
  for (let x = SX0 + 15; x < SX1 - 4; x += 15) j += line([[x, SY1 - 0.4, SH], [x, x > X1 ? SY0 + 0.4 : Y1 + 0.5, SH]]) + ' ';
  for (let y = SY0 + 15; y < SY1 - 4; y += 15) j += line([[SX1 - 0.4, y, SH], [y > Y1 ? SX0 + 0.4 : X1 + 0.5, y, SH]]) + ' ';
  ground += S(j.trim(), '#ddd6ca', 0.5, 0.7);
  // pas japonais clairs de la porte au bord de la dalle
  for (const [cx, cy] of [[-36.5, 33.5], [-35.5, 38.8]]) {
    ground += F(poly([[cx - 4, cy - 2.1, SH + 0.05], [cx + 4, cy - 2.1, SH + 0.05], [cx + 4, cy + 2.1, SH + 0.05], [cx - 4, cy + 2.1, SH + 0.05]]), '#fbfaf7');
    ground += S(line([[cx - 4, cy + 2.1, SH + 0.05], [cx + 4, cy + 2.1, SH + 0.05], [cx + 4, cy - 2.1, SH + 0.05]]), '#ddd6ca', 0.5, 0.9);
  }
  // ombre portée du volume (murs + toit) vers la droite de l'écran
  ground += castShadow([[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]], SH, (ZA + TH) * 0.8, 0.05);
}

/* ───────────── intérieur (vu par la baie, le vitrage du pignon et la fenêtre du long pan) ───────────── */
const fx0 = X0 + 1.5, fx1 = X1 - 1.5, fy0 = Y0 + 1.5, fy1 = Y1 - 1.5;
let inside = '';
{
  // Tons gris-bleu frais : vus à travers la vitre bleue ils restent bleus (un parquet beige donne une vitre grise).
  inside += F(onTop(0.6, fx0, fy0, fx1, fy1), '#d6ddee');
  let pl = '';
  for (let x = fx0 + 4.5; x < fx1; x += 4.5) pl += line([[x, fy0, 0.6], [x, fy1, 0.6]]) + ' ';
  inside += S(pl.trim(), '#c3cce3', 0.45, 0.85);
  // Murs du fond : gauche (x = fx0, vu par la baie et le vitrage du pignon) ; arrière (y = fy0, vu par la
  // fenêtre du long pan). Vu de (1,1,1), un rayon qui entre par le pignon à la hauteur z touche le sol à
  // moins de z de la façade : par le vitrage du haut, on voit donc le mur gauche, pas le toit.
  inside += F(onX(fx0)(R2(fy0, fy1, 0.6, ZW)), '#dde3f1');
  inside += F(onY(fy0)(R2(fx0, fx1, 0.6, ZW)), '#e8ecf6');
  // mur gauche : grand tirage de plan épinglé + étagère de rouleaux (visibles par le vitrage triangulaire)
  inside += F(onX(fx0 + 0.1)(R2(-14, 6, 17, 33)), '#3d78ee');
  inside += S(lnX(fx0 + 0.15)([[-12.4, 18.6], [4.4, 18.6], [4.4, 31.4], [-12.4, 31.4], [-12.4, 18.6]]) + ' ' +
    lnX(fx0 + 0.15)([[-9, 21], [-9, 29], [-1, 29], [-1, 24], [2.5, 24]]) + ' ' + lnX(fx0 + 0.15)([[-10.5, 20], [1, 20]]), '#ffffff', 0.6, 0.85);
  for (const [y, z] of [[-13.6, 32.6], [5.6, 32.6]]) inside += F(onX(fx0 + 0.2)(R2(y - 0.6, y + 0.6, z - 0.6, z + 0.6)), '#ef4444');
  inside += F(onX(fx0 + 0.1)(R2(-30, -16, 10.2, 11.4)), '#c08549');
  for (const [y, c, h] of [[-28.5, '#f4f6fb', 7], [-26.2, BLUE, 8.5], [-23.8, '#cfe0ff', 6], [-21.2, '#f4f6fb', 9], [-18.6, BLUE, 7]]) {
    inside += S(lnX(fx0 + 1.2)([[y, 11.6], [y + 0.6, 11.6 + h]]), c, 1.8);
  }
  // mur du fond : étagère de classeurs colorés, face aux vitres du long pan
  {
    const kx0 = 8, kx1 = 21, ky0 = fy0, ky1 = fy0 + 4, kz = 30;
    const k = box(kx0, ky0, 0.6, kx1 - kx0, ky1 - ky0, kz);
    inside += F(k.right, '#c9d0e2') + F(k.left, '#eef1f8') + F(k.top, '#ffffff');
    const cols = [BLUE, '#f6c95c', '#ef8aa0', '#7c6bff', '#2bb5a5', NAVY, '#f6c95c', BLUE];
    for (const [z0, n0] of [[3, 0], [11, 3], [19, 5]]) {
      inside += F(onY(ky1 + 0.05)(R2(kx0 + 0.8, kx1 - 0.8, z0 + 6.6, z0 + 7.4)), '#c9d0e2');
      for (let i = 0; i < 5; i++) {
        const x = kx0 + 1.4 + i * 2.2, h = 5.2 + ((i + n0) % 3) * 0.5;
        inside += F(onY(ky1 + 0.1)(R2(x, x + 1.7, z0, z0 + h)), cols[(i + n0) % cols.length]);
      }
    }
  }
  // suspension allumée (vue par le vitrage triangulaire)
  {
    const lx = -22, ly = 14, lz = 44;
    inside += S(line([[lx, ly, zu(lx) - 0.5], [lx, ly, lz + 2.6]]), '#3b4677', 0.5);
    const rimPts = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * 2 * Math.PI; return P(lx + 3 * Math.cos(a), ly + 3 * Math.sin(a), lz); });
    inside += F(scr(hull([P(lx, ly, lz + 2.8), ...rimPts])), NAVY);
    inside += F(scr(hull([P(lx, ly, lz + 2.8), ...rimPts.filter((p) => p[0] <= P(lx, ly, lz)[0])])), '#3f4f93');
    const g = P(lx, ly, lz - 0.6);
    inside += `<circle cx="${r1(g[0])}" cy="${r1(g[1])}" r="5.5" fill="#ffe9a8" fill-opacity="0.35"/><circle cx="${r1(g[0])}" cy="${r1(g[1])}" r="1.6" fill="#fff6d6"/>`;
  }
  // L'architecte, debout à gauche de la table, tourné vers le plan (dessiné avant la table : plus au fond).
  // Près de la vitre (y = 21,8, épaule à 24,8 = nu intérieur du mur) : sommet du crâne vu à z ≈ 30,6, sous la
  // traverse de l'imposte (31,5).
  inside += person(-26.5, 21.8, { facing: 'right', pose: 'stand', z: 0.6, scale: 0.93, top: '#ef4444', hairStyle: 'short', rim: false }).svg;
  // Table à dessin tout contre la baie : tréteaux bleu nuit, plateau incliné VERS LE SPECTATEUR (bord haut au
  // fond, bord bas côté vitre). Placée pour que tout le plateau se lise dans le grand carreau central.
  const tx0 = -17, tx1 = 1, yLo = 23.3, zLo = 12.4, yHi = 18.6, zHi = 20.4, L = tx1 - tx0;
  const B = (a, b, lift = 0) => [tx0 + a, yLo + (yHi - yLo) * b, zLo + (zHi - zLo) * b + lift];
  let legs = '';
  for (const x of [tx0 + 2.2, tx1 - 2.2]) {
    legs += line([[x, yLo - 0.6, 0.6], [x, yLo - 0.9, zLo - 0.6]]) + ' ' + line([[x, yHi - 1.2, 0.6], [x, yHi + 0.4, zHi - 0.8]]) + ' ';
    legs += line([[x, yLo - 0.7, 5.5], [x, yHi - 0.9, 5.5]]) + ' ';
  }
  legs += line([[tx0 + 2.2, (yLo + yHi) / 2 - 0.4, 5.5], [tx1 - 2.2, (yLo + yHi) / 2 - 0.4, 5.5]]);
  inside += S(legs, '#3b4677', 1.3);
  // plateau : tranche puis dessus
  inside += F(poly([B(0, 0), B(L, 0), B(L, 0, -1.4), B(0, 0, -1.4)]), '#c08549');
  inside += F(poly([B(0, 0), B(L, 0), B(L, 1), B(0, 1)]), '#f2e3cc');
  // plan bleu : grande feuille #2f6fed, quatre traits blancs de 0,8 (cadre, patron de t-shirt, cote, cartouche)
  const pa = (a, b) => B(a, b, 0.05);
  inside += F(poly([pa(1.1, 0.07), pa(L - 1.1, 0.07), pa(L - 1.1, 0.95), pa(1.1, 0.95)]), BLUE);
  const cx = 7.2;
  let bp = line([pa(2.2, 0.2), pa(L - 2.2, 0.2), pa(L - 2.2, 0.83), pa(2.2, 0.83), pa(2.2, 0.2)]) + ' ';
  bp += line([pa(cx - 2.6, 0.3), pa(cx + 2.6, 0.3), pa(cx + 2.6, 0.55), pa(cx + 4.6, 0.5), pa(cx + 5.3, 0.66), pa(cx + 2.8, 0.75),
    pa(cx + 1.1, 0.72), pa(cx, 0.66), pa(cx - 1.1, 0.72), pa(cx - 2.8, 0.75), pa(cx - 5.3, 0.66), pa(cx - 4.6, 0.5), pa(cx - 2.6, 0.55), pa(cx - 2.6, 0.3)]) + ' ';
  bp += line([pa(L - 5.4, 0.28), pa(L - 5.4, 0.72)]) + ' ' + line([pa(L - 4.2, 0.36), pa(L - 3, 0.36)]);
  inside += S(bp, '#ffffff', 0.8, 0.95);
  // Lampe d'architecte : pince au coin haut-gauche, bras articulé, abat-jour conique doré (cône vertical, sommet
  // à l'articulation, moitié gauche tournée vers la lumière éclairée), flaque de lumière dans le plan du plateau.
  const base = B(0.9, 0.98, 0.3), j1 = [tx0 + 1.3, yHi + 1.4, zHi + 3.6], j2 = [tx0 + 5.6, yHi + 3.4, zHi + 2.3];
  const ring = (f, n = 16) => Array.from({ length: n }, (_, i) => f((i / n) * 2 * Math.PI));
  inside += F(poly(ring((t) => B(6.2 + 4.2 * Math.cos(t), 0.45 + 0.34 * Math.sin(t), 0.1))), '#fff3c4', 0.22);
  inside += S(line([base, j1, j2]), '#3b4677', 0.9);
  const rc = [j2[0] + 0.3, j2[1] + 0.3, j2[2] - 2.3], rr = 2.2, apex = P(...j2), ctr = P(...rc);
  const rimPts = ring((t) => P(rc[0] + rr * Math.cos(t), rc[1] + rr * Math.sin(t), rc[2]));
  inside += F(scr(hull([apex, ...rimPts])), '#e0ad3a');
  inside += F(scr(hull([apex, ...rimPts.filter((p) => p[0] <= ctr[0] + 0.01)])), '#f6c95c');
  inside += F(scr(hull([apex, ...rimPts.filter((p) => p[0] <= ctr[0] - rr * 0.9)])), '#fbe3a0');
  // tabouret haut à droite de la table
  {
    const sx = tx1 + 4, sy = 21, sz = 11;
    let st = '';
    for (const [dx, dy] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) st += line([[sx + dx * 1.3, sy + dy * 1.3, 0.6], [sx + dx * 0.7, sy + dy * 0.7, sz]]) + ' ';
    inside += S(st.trim(), '#3b4677', 0.9);
    const e = ellipse(sx, sy, sz, 2.6);
    inside += `<ellipse cx="${e.cx}" cy="${+e.cy + 0.7}" rx="${e.rx}" ry="${e.ry}" fill="#c08549"/><ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="#d9a066"/>`;
  }
  // plante d'intérieur dans l'angle : vue en (x + 26 − y) ≈ 16 → carreau droit de la baie, sous l'imposte
  inside += pottedPlant(11.5, 21.5, { pot: 'square', z: 0.6, size: 0.95 }).svg;
}

/* ───────────── le bâtiment ───────────── */
let bld = inside;

// 1. Pignon (+y, éclairé) percé de la baie et du vitrage triangulaire ; long pan (+x, ombré) percé de sa fenêtre
const gL = lg('wallL', [[0, '#ffffff'], [1, '#f1f1f7']]);
const gR = lg('wallR', [[0, '#e8eaf3'], [1, '#d9dce9']]);
const gable = [[X0, 0], [X1, 0], [X1, ZW], [XR, ZA], [X0, ZW]];
bld += `<path d="${onY(Y1)(gable)} ${onY(Y1)(R2(BX0, BX1, BZ0, BZ1))} ${onY(Y1)(TRI)}" fill="${gL}" fill-rule="evenodd"/>`;
bld += `<path d="${onX(X1)(R2(Y0, Y1, 0, ZW))} ${onX(X1)(R2(WY0, WY1, WZ0, WZ1))}" fill="${gR}" fill-rule="evenodd"/>`;
// soubassement
bld += F(onY(Y1)(R2(X0, X1, 0, PL)), PLINTH) + F(onX(X1)(R2(Y0, Y1, 0, PL)), PLINTH_SH);
bld += S(line([[X0, Y1, PL], [X1, Y1, PL], [X1, Y0, PL]]), '#f4f5f9', 0.7, 0.9);
// arête verticale avant adoucie
bld += S(line([[X1, Y1, PL + 0.5], [X1, Y1, ZW - 0.5]]), '#ffffff', 1.1, 0.75);

// 2. Baie d'atelier : ébrasement, vitre teintée translucide, reflets, menuiseries bleu nuit, appui
{
  const REC = 2, yg = Y1 - REC * 0.5;
  bld += F(poly([[BX0, Y1, BZ0], [BX0, Y1 - REC, BZ0], [BX0, Y1 - REC, BZ1], [BX0, Y1, BZ1]]), '#d3d8e6');
  bld += F(poly([[BX0, Y1 - REC, BZ0], [BX1, Y1 - REC, BZ0], [BX1, Y1, BZ0], [BX0, Y1, BZ0]]), '#eef0f6');
  bld += F(onY(yg)(R2(BX0, BX1, BZ0, BZ1)), pg('glass', [[0, '#c4ddff', 0.64], [0.4, '#a9cdff', 0.4], [1, '#6f9ef5', 0.34]], [0, Y1, BZ1], [0, Y1, BZ0], [1, 0, 0]));
  const refl = (x0, w, z0, z1, a) => F(onY(yg + 0.05)([[x0, z0], [x0 + w, z0], [x0 + w + (z1 - z0) * 0.62, z1], [x0 + (z1 - z0) * 0.62, z1]]), '#ffffff', a);
  bld += refl(BX0 + 1.5, 4.5, BZ0 + 1, BT - 1, 0.3) + refl(BX0 + 7.5, 1.8, BZ0 + 1, BT - 1, 0.24);
  bld += refl(BM[1] + 1, 3.2, BZ0 + 1, BT - 1.5, 0.3) + refl(BX0 + 3, 2.5, BT + 1, BZ1 - 1, 0.3) + refl(BM[0] + 6, 2.2, BT + 1, BZ1 - 1, 0.26);
  // menuiseries : cadre, deux montants, traverse et petits bois de l'imposte (verrière d'atelier)
  let fr = lnY(yg)([[BX0 + 0.5, BZ0 + 0.5], [BX1 - 0.5, BZ0 + 0.5], [BX1 - 0.5, BZ1 - 0.5], [BX0 + 0.5, BZ1 - 0.5], [BX0 + 0.5, BZ0 + 0.5]]) + ' ';
  for (const x of BM) fr += lnY(yg)([[x, BZ0], [x, BZ1]]) + ' ';
  fr += lnY(yg)([[BX0, BT], [BX1, BT]]) + ' ';
  for (const x of [(BX0 + BM[0]) / 2, BM[0] + (BM[1] - BM[0]) / 3, BM[0] + (2 * (BM[1] - BM[0])) / 3, (BM[1] + BX1) / 2]) fr += lnY(yg)([[x, BT], [x, BZ1]]) + ' ';
  bld += S(fr.trim(), NAVY, 1.15);
  const b = box(BX0 - 1.4, Y1 - 0.4, BZ0 - 1.6, BX1 - BX0 + 2.8, 2.2, 1.6);
  bld += F(b.left, '#eceef5') + F(b.right, '#d8dce8') + F(b.top, '#ffffff');
}

// 3. Vitrage triangulaire sous la pointe du pignon
{
  const REC = 1.6, yg = Y1 - REC * 0.5, [A, Bp, C] = TRI;
  bld += F(poly([[A[0], Y1 - REC, TZ0], [Bp[0], Y1 - REC, TZ0], [Bp[0], Y1, TZ0], [A[0], Y1, TZ0]]), '#eef0f6');
  bld += F(onY(yg)(TRI), pg('glassT', [[0, '#c4ddff', 0.6], [1, '#8fb6f6', 0.38]], [0, Y1, TZ1], [0, Y1, TZ0], [1, 0, 0]));
  // reflet diagonal (penché comme ceux de la baie), arrêté contre le rampant gauche
  const band = (xs, w, a) => {
    const z0 = TZ0 + 0.8, A0 = XR - TW + 1.3, k = 1 / SL - 0.62;
    const top = (x) => { const dz = (x - A0 - 0.8 * (1 / SL)) / k; return [x + 0.62 * dz, z0 + dz]; };
    return F(onY(yg + 0.05)([[xs, z0], [xs + w, z0], top(xs + w), top(xs)]), '#ffffff', a);
  };
  bld += band(XR - TW + 5, 4.2, 0.3) + band(XR - TW + 11, 1.6, 0.24);
  let fr = lnY(yg)([[A[0] + 0.9, A[1] + 0.5], [Bp[0] - 0.9, Bp[1] + 0.5], [C[0], C[1] - 0.6], [A[0] + 0.9, A[1] + 0.5]]) + ' ';
  for (const k of [-0.5, 0, 0.5]) { const x = XR + k * TW; fr += lnY(yg)([[x, TZ0], [x, TZ1 - SL * Math.abs(x - XR) - 0.3]]) + ' '; }
  bld += S(fr.trim(), NAVY, 1.05);
}

// 4. Porte d'entrée (à gauche de la baie) sous une marquise bleue, seuil
{
  bld += F(onY(Y1)(R2(DX0 - 1.2, DX1 + 1.2, 0, DZ + 1.2)), '#e6e8f1');
  bld += F(poly([[DX0, Y1, 0], [DX0, Y1 - 1.6, 0], [DX0, Y1 - 1.6, DZ], [DX0, Y1, DZ]]), '#d3d8e6');
  bld += F(onY(Y1 - 0.8)(R2(DX0, DX1, 0, DZ)), NAVY);
  bld += F(onY(Y1 - 0.75)(R2(DX0 + 1.4, DX1 - 1.4, 2.2, DZ - 1.4)), lg('door', [[0, '#bcd6ff'], [1, '#7ea6ee']]));
  bld += F(onY(Y1 - 0.7)([[DX0 + 2, 4], [DX0 + 4, 4], [DX0 + 7.6, DZ - 2], [DX0 + 5.6, DZ - 2]]), '#ffffff', 0.3);
  bld += S(lnY(Y1 - 0.5)([[DX1 - 2.6, 12.5], [DX1 - 2.6, 16.5]]), '#e0ad3a', 1.1);
  // seuil + paillasson
  const st = box(DX0 - 0.6, Y1, 0, DX1 - DX0 + 1.2, 3.2, SH + 0.8);
  bld += F(st.left, '#e3e5ef') + F(st.right, '#cfd3e2') + F(st.top, '#f4f5f9');
  bld += F(onTop(SH + 0.85, DX0 + 1, Y1 + 0.5, DX1 - 1, Y1 + 2.7), '#3f4f93');
  // marquise : dalle bleue en saillie, ombre portée sur le mur, deux tirants bleu nuit
  const mx0 = DX0 - 2.2, mx1 = DX1 + 1.4, mz = DZ + 2.6, md = 6.5, mt = 1.6;
  bld += F(onY(Y1 + 0.03)(R2(mx0, mx1, mz - 4, mz)), pg('mqSh', [[0, '#5a6386', 0.2], [1, '#5a6386', 0]], [0, Y1, mz], [0, Y1, mz - 4], [1, 0, 0]));
  const m = box(mx0, Y1, mz, mx1 - mx0, md, mt);
  bld += F(m.left, BLUE) + F(m.right, shade(BLUE, 0.86)) + F(m.top, tint(BLUE, 0.2));
  bld += S(line([[mx0, Y1 + md, mz + mt], [mx1, Y1 + md, mz + mt], [mx1, Y1, mz + mt]]), EDGE, 0.8);
  bld += S(line([[mx0 + 1.6, Y1, mz + 8.5], [mx0 + 1.6, Y1 + md - 0.8, mz + mt]]) + ' ' + line([[mx1 - 1.6, Y1, mz + 8.5], [mx1 - 1.6, Y1 + md - 0.8, mz + mt]]), NAVY, 0.6);
  // platines d'ancrage des tirants dans le mur
  for (const x of [mx0 + 1.6, mx1 - 1.6]) bld += F(onY(Y1 + 0.05)(R2(x - 0.8, x + 0.8, mz + 7.7, mz + 9.3)), NAVY);
}

// 5. Ombres du débord de rive sur le pignon (le haut du vitrage compris) et de l'égout sur le long pan
{
  const shd = (dz) => onY(Y1 + 0.04)([[X0, ZW], [XR, ZA], [X1, ZW], [X1, ZW - dz], [XR, ZA - dz], [X0, ZW - dz]]);
  bld += F(shd(5), '#5a6386', 0.06) + F(shd(2.6), '#5a6386', 0.08);
  bld += F(onX(X1 + 0.02)(R2(Y0, Y1, ZW - 9, ZW)), pg('eaveSh', [[0, '#5a6386', 0.18], [0.45, '#5a6386', 0.07], [1, '#5a6386', 0]], [X1, 0, ZW], [X1, 0, ZW - 9], [0, 1, 0]));
}

// 6. Long pan (+x) : fenêtre (étagère de classeurs derrière), enseigne « document + crayon »
{
  const REC = 1.6, xg = X1 - REC * 0.5;
  // ébrasement visible (côté y = WY0, tourné vers +y) et tablette basse
  bld += F(poly([[X1, WY0, WZ0], [X1 - REC, WY0, WZ0], [X1 - REC, WY0, WZ1], [X1, WY0, WZ1]]), '#e3e7f1');
  bld += F(poly([[X1 - REC, WY0, WZ0], [X1 - REC, WY1, WZ0], [X1, WY1, WZ0], [X1, WY0, WZ0]]), '#e9ecf4');
  bld += F(onX(xg)(R2(WY0, WY1, WZ0, WZ1)), pg('glassR', [[0, '#9dbcf0', 0.62], [1, '#5579c6', 0.46]], [X1, 0, WZ1], [X1, 0, WZ0], [0, 1, 0]));
  bld += F(onX(xg + 0.05)([[WY1 - 1.5, WZ0 + 1], [WY1 - 4.5, WZ0 + 1], [WY1 - 4.5 - (WZ1 - WZ0 - 2) * 0.45, WZ1 - 1], [WY1 - 1.5 - (WZ1 - WZ0 - 2) * 0.45, WZ1 - 1]]), '#ffffff', 0.28);
  const ym = (WY0 + WY1) / 2;
  let fr = lnX(xg)([[WY0 + 0.4, WZ0 + 0.4], [WY1 - 0.4, WZ0 + 0.4], [WY1 - 0.4, WZ1 - 0.4], [WY0 + 0.4, WZ1 - 0.4], [WY0 + 0.4, WZ0 + 0.4]]) + ' ';
  fr += lnX(xg)([[ym, WZ0], [ym, WZ1]]) + ' ' + lnX(xg)([[WY0, 26], [WY1, 26]]);
  bld += S(fr, NAVY, 1.05);
  const b = box(X1 - 0.4, WY0 - 1.3, WZ0 - 1.5, 2.2, WY1 - WY0 + 2.6, 1.5);
  bld += F(b.left, '#eceef5') + F(b.right, '#d3d7e4') + F(b.top, '#ffffff');
}
{
  // enseigne : panneau blanc arrondi à liseré bleu, en saillie (32 × 30), centrée sur le long pan. Centre à
  // z = 23,5 (et non 26) : au-dessus de z ≈ 39,2 le débord d'égout masque le mur, l'enseigne reste entière.
  const yc = -14, zc = 23.5, hw = 16, hh = 15, ks = 1.18;
  const Q = (u, v, e) => [X1 + e, yc - u, zc + v];
  const shape = (pts, e) => poly(pts.map(([u, v]) => Q(u, v, e)));
  const outer = rrect2(-hw, -hh, hw, hh, 3.6), inner = rrect2(-hw + 1.9, -hh + 1.9, hw - 1.9, hh - 1.9, 2);
  // ombre portée vers le bas-droite de l'écran, comme toutes les ombres du village
  bld += `<g transform="translate(1.6 1.5)">${F(shape(outer, 0), '#4a5277', 0.14)}</g>`;
  bld += F(shape(outer, 0), '#c9d4f2') + F(shape(outer, 0.8), '#b7c6ef');
  bld += F(shape(outer, 1.6), BLUE) + F(shape(inner, 1.65), '#f7f9ff');
  // document : page claire, coin plié, lignes de texte (coordonnées du pictogramme × ks)
  const e = 1.7, K = (pts) => pts.map(([u, v]) => [u * ks, v * ks]);
  const page = K([[-8.5, -9], [3.5, -9], [3.5, 5.2], [-0.8, 9.5], [-8.5, 9.5]]);
  bld += F(shape(page, e), '#e3ecff');
  bld += S(line([...page, page[0]].map(([u, v]) => Q(u, v, e))), BLUE, 1.4);
  const fold = K([[3.5, 5.2], [-0.8, 5.2], [-0.8, 9.5]]);
  bld += F(shape(fold, e), '#b9cdf7');
  bld += S(line(fold.map(([u, v]) => Q(u, v, e))), BLUE, 1);
  let tx = '';
  for (const [v, l] of [[4.2, 5.4], [1.2, 8.6], [-1.8, 8.6], [-4.8, 6]]) tx += line([Q(-6.4 * ks, v * ks, e), Q((-6.4 + l) * ks, v * ks, e)]) + ' ';
  bld += S(tx.trim(), BLUE, 1.15);
  // crayon en diagonale (pointe en bas à gauche du crayon, gomme en haut à droite)
  const dir = [0.56, 0.83], nrm = [-dir[1], dir[0]], w = 1.7 * ks;
  const at = (s, k) => [(1.8 + dir[0] * s) * ks + nrm[0] * k, (-9.4 + dir[1] * s) * ks + nrm[1] * k];
  const seg = (s0, s1, col, k0 = -w, k1 = w) => F(shape([at(s0, k0), at(s1, k0), at(s1, k1), at(s0, k1)], e + 0.1), col);
  bld += F(shape([at(0, 0), at(3.6, -w), at(3.6, w)], e + 0.1), '#f2d2a4');
  bld += F(shape([at(0, 0), at(1.3, -w * 0.36), at(1.3, w * 0.36)], e + 0.1), NAVY);
  bld += seg(3.6, 11.2, '#f6c95c', -w, 0) + seg(3.6, 11.2, '#e0ad3a', 0, w);
  bld += seg(11.2, 12.8, '#c3c9d6');
  bld += F(shape([0, 1, 2, 3, 4, 5, 6].map((i) => { const a = -Math.PI / 2 + (i / 6) * Math.PI; return at(12.8 + Math.cos(a) * 1.7, Math.sin(a) * w); }), e + 0.1), '#ef8aa0');
}

// 7. Toit à deux pans (faîtage selon y) : pan arrière (−x), pan +x en dégradé, joints debout, fenêtres de toit,
//    faîtage, bandeau d'égout +x et gouttière, rive du pignon (épaisseur de couverture) et liserés clairs.
{
  const RX = (x, y, dz = 0) => [x, y, zt(x) + dz];
  // pan arrière : bande sombre à gauche du faîtage
  bld += F(poly([RX(xa, ya), RX(XR, ya), RX(XR, yb), RX(xa, yb)]), ROOF_B);
  let sb = '';
  for (let y = ya + 8.4; y < yb - 2; y += 8.4) sb += line([RX(xa + 0.6, y, 0.05), RX(XR - 0.3, y, 0.05)]) + ' ';
  bld += S(sb.trim(), shade(BLUE, 0.68), 0.6, 0.7);
  // pan +x : dégradé du faîtage (plus clair) à l'égout, isolignes parallèles au faîtage
  bld += F(poly([RX(XR, ya), RX(xb, ya), RX(xb, yb), RX(XR, yb)]),
    pg('roofX', [[0, tint(ROOF_X, 0.16)], [0.55, tint(ROOF_X, 0.05)], [1, ROOF_X]], RX(XR, 0), RX(xb, 0), [0, 1, 0]));
  // joints debout (tôle) : arêtes sombres + filet clair, de l'égout au faîtage
  let sj = '', sl = '';
  for (let y = ya + 8.4; y < yb - 2; y += 8.4) { sj += line([RX(XR + 0.3, y, 0.05), RX(xb, y, 0.05)]) + ' '; sl += line([RX(XR + 0.3, y + 0.9, 0.05), RX(xb, y + 0.9, 0.05)]) + ' '; }
  bld += S(sj.trim(), shade(BLUE, 0.72), 0.7, 0.75) + S(sl.trim(), EDGE, 0.45, 0.45);
  // fenêtres de toit : costière (face +y éclairée, face aval +x ombrée), cadre clair, verre bleu nuit, reflet
  for (const [vy0, vy1, nm] of [[-35, -25.5, 'A'], [-0.5, 9, 'B']]) {
    const vx0 = -2.5, vx1 = 8, k = 0.9;
    bld += F(poly([RX(vx0, vy1), RX(vx1, vy1), RX(vx1, vy1, k), RX(vx0, vy1, k)]), '#dfe6f6');
    bld += F(poly([RX(vx1, vy0), RX(vx1, vy1), RX(vx1, vy1, k), RX(vx1, vy0, k)]), '#aebddf');
    bld += F(poly([RX(vx0, vy0, k), RX(vx1, vy0, k), RX(vx1, vy1, k), RX(vx0, vy1, k)]), '#f4f6fb');
    bld += F(poly([RX(vx0 + 1, vy0 + 1, k + 0.05), RX(vx1 - 1, vy0 + 1, k + 0.05), RX(vx1 - 1, vy1 - 1.1, k + 0.05), RX(vx0 + 1, vy1 - 1.1, k + 0.05)]),
      lg(`velux${nm}`, [[0, '#5a7bd0'], [1, '#2c438f']]));
    bld += F(poly([RX(vx0 + 1.6, vy1 - 3.2, k + 0.1), RX(vx1 - 1.6, vy1 - 1.6, k + 0.1), RX(vx1 - 1.6, vy1 - 3.6, k + 0.1), RX(vx0 + 1.6, vy1 - 5.2, k + 0.1)]), '#ffffff', 0.3);
  }
  // faîtage : liseré clair
  bld += S(line([RX(XR, ya + 0.3, 0.15), RX(XR, yb, 0.15)]), EDGE, 1.4);
  // bandeau d'égout (+x, ombré), liseré discret au bord du pan, gouttière blanche
  bld += F(poly([[xb, ya, zu(xb)], [xb, yb, zu(xb)], [xb, yb, zt(xb)], [xb, ya, zt(xb)]]), shade(BLUE, 0.7));
  bld += S(line([RX(xb, ya + 0.4), RX(xb, yb)]), EDGE, 1, 0.7);
  // rive du pignon : épaisseur de couverture (tranche tournée vers +y, éclairée), liseré clair sur l'arête
  bld += F(onY(yb)([[xa, zu(xa)], [XR, zu(XR)], [xb, zu(xb)], [xb, zt(xb)], [XR, zt(XR)], [xa, zt(xa)]]), BLUE);
  bld += S(lnY(yb)([[xa, zu(xa) + 0.9], [XR, zu(XR) + 0.9], [xb, zu(xb) + 0.9]]), shade(BLUE, 0.9), 0.5, 0.6);
  bld += S(lnY(yb)([[xa, zt(xa)], [XR, zt(XR)], [xb, zt(xb)]]), EDGE, 1.2);
  const gz = zu(xb) + 0.2;
  bld += S(line([[xb + 0.6, ya + 0.4, gz], [xb + 0.6, yb + 0.2, gz]]), '#c9cedd', 2) + S(line([[xb + 0.6, ya + 0.4, gz], [xb + 0.6, yb + 0.2, gz]]), '#f4f5fa', 1.3);
  // descente d'eau pluviale blanche à l'angle avant du long pan
  const dy = Y1 - 2.5;
  const pipe = line([[xb + 0.6, dy, gz], [X1 + 1.1, dy, gz - 3.4], [X1 + 1.1, dy, SH + 1.6], [X1 + 2.6, dy, SH + 0.4]]);
  bld += S(pipe, '#c9cedd', 2.1) + S(pipe, '#f4f5fa', 1.3);
}
items.push({ d: XR + (Y0 + Y1) / 2, svg: bld });

/* ───────────── abords : panier de plans, jardinière, plante en pot, buisson ───────────── */
// panier en osier rempli de rouleaux de plans (bleus et blancs)
// Ordre : intérieur sombre (vu par l'ouverture) → moitié arrière du bord → rouleaux → paroi avant →
// moitié avant du bord.
function planBasket(x, y) {
  const r = 5, h = 7.5, rt = r * 1.05;
  let s = castShadow([[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]], SH, 12, 0.05, [1, 0.6]);
  const z0 = SH;
  // arc du bord (angles monde ; la moitié tournée vers le spectateur va de −45° à 135°)
  const rimArc = (a0, a1, n = 14) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (a1 - a0); pts.push(P(x + Math.cos(a) * rt, y + Math.sin(a) * rt, z0 + h)); }
    return 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L');
  };
  const ein = ellipse(x, y, z0 + h, rt);
  s += `<ellipse cx="${ein.cx}" cy="${ein.cy}" rx="${ein.rx}" ry="${ein.ry}" fill="#a06a39"/>`;
  s += S(rimArc((3 * Math.PI) / 4, (7 * Math.PI) / 4), '#e8b67f', 1.1);
  const roll = (dx, dy, len, tilt, col, end) => {
    const a = [x + dx, y + dy, z0 + 2], b = [x + dx + tilt[0], y + dy + tilt[1], z0 + 2 + len];
    const pa = P(...a), pb = P(...b);
    let g = S(`M${r1(pa[0])} ${r1(pa[1])} L${r1(pb[0])} ${r1(pb[1])}`, col, 3.2);
    g += S(`M${r1(pa[0] - 0.9)} ${r1(pa[1])} L${r1(pb[0] - 0.9)} ${r1(pb[1])}`, '#ffffff', 0.7, 0.45);
    const eo = ellipse(...b, 1.3), ei = ellipse(...b, 0.5);
    g += `<ellipse cx="${eo.cx}" cy="${eo.cy}" rx="${eo.rx}" ry="${eo.ry}" fill="${end}"/><ellipse cx="${ei.cx}" cy="${ei.cy}" rx="${ei.rx}" ry="${ei.ry}" fill="${shade(end, 0.8)}"/>`;
    return g;
  };
  s += roll(-2, -1.5, 15, [-2.2, -1], BLUE, '#9cbcf8');
  s += roll(1.5, -2, 17, [1, -2.5], '#f4f6fb', '#ffffff');
  s += roll(-0.5, 0.5, 13, [-0.6, 1.8], '#cfe0ff', '#eaf2ff');
  s += roll(2, 1.5, 11.5, [2.2, 0.8], BLUE, '#9cbcf8');
  s += roll(-1, 2.6, 9, [-1.6, 2], '#f4f6fb', '#ffffff');
  const N = 18, top = [], bot = [];
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 4 + (i / N) * Math.PI; top.push(P(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, z0 + h)); bot.push(P(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, z0)); }
  s += F(scr([...top, ...bot.reverse()]), '#d9a066');
  for (let k = 1; k < 4; k++) {
    const t = k / 4, row = [];
    for (let i = 0; i <= N; i++) { const a = -Math.PI / 4 + (i / N) * Math.PI, rr = r * (0.86 + 0.19 * t); row.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr, z0 + h * t)); }
    s += S('M' + row.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L'), '#b47a42', 0.55, 0.85);
  }
  const sh2 = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 4 + (i / 6) * (Math.PI / 2.6); sh2.push(P(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, z0 + h)); }
  for (let i = 6; i >= 0; i--) { const a = -Math.PI / 4 + (i / 6) * (Math.PI / 2.6); sh2.push(P(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, z0)); }
  s += F(scr(sh2), '#9c6537', 0.28);
  s += S(rimArc(-Math.PI / 4, (3 * Math.PI) / 4), '#e8b67f', 1.1);
  return { d: x + y, svg: s };
}
items.push(planBasket(33, 12));
items.push(flowerBed(-6, 31.5, 34, 6, { z: SH, seed: 3 }));
// Plus d'arbre rond ni de cyprès (le duo répété de parcelle en parcelle) : un grand pot à l'entrée et un
// buisson au coin arrière, assez volumineux pour tenir les deux bords de la parcelle.
items.push(pottedPlant(-49.5, 32, { pot: 'round', z: SH, size: 1.3 }));
items.push(bush(41, -46, { z: SH, w: 12, d: 18, h: 12 }));

/* ───────────── sortie ───────────── */
const body = ground + compose(items);
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svgDoc({ title: TITLE, defs: defs.join(''), body }));
// Manifeste : sommet = bout arrière du faîtage ; hit = toit (rives et égout compris) + murs jusqu'au pied avant.
const topY = P(XR, ya, zt(XR))[1];
const left = Math.min(P(xa, yb, zu(xa))[0], P(X0, Y1, 0)[0]), right = P(xb, ya, zu(xb))[0], bottom = P(X1, Y1, 0)[1];
const hit = { x: Math.floor(left - 2), y: Math.floor(topY - 2), w: Math.ceil(right - left + 4), h: Math.ceil(bottom - topY + 4) };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify({ id: ID, title: TITLE, labelY: Math.round(topY), hit }, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, body.length, 'o');
