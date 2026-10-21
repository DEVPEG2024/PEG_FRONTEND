// Village PEG — ACCESSOIRES PARTAGÉS (personnages, arbres, mobilier, camionnette).
//
//   import { person, treeRound, crate, … } from '../tools/props.mjs';
//
// Règles communes
// - Coordonnées MONDE (projection de iso.mjs) : (x, y) = centre de l'objet AU SOL ; option z = altitude
//   de pose (0 = dalle, BENCH_SEAT = assise d'un banc, PALLET_H = dessus d'une palette, etc.).
// - Chaque fonction renvoie { d, svg, box } :
//     d   = x + y (profondeur pour compose()),
//     svg = fragment SVG sans <defs>, sans id, sans dégradé (couleurs unies + reflets/ombres en
//           opacité) → appelable autant de fois qu'on veut dans un même fichier,
//     box = cadre écran { x, y, w, h } de l'objet, ombre portée exclue (→ labelY / hit d'un manifeste).
// - Lumière de l'avant-gauche : face +y = teinte de base, face +x = ombrée, dessus = éclairci.
//   Ombres portées douces vers la droite de l'écran (brun #5a4a3a, 10–20 %).
// - Poids indicatif d'un appel : personnage ≈ 6 Ko, arbre ≈ 4–6 Ko, buisson / carton / palette ≈ 2 Ko,
//   banc ≈ 5 Ko, pile de cartons ≈ 8 Ko, camionnette ≈ 8 Ko (un sprite doit rester sous 70 Ko).
//
// API
//   person(x, y, { top='#7c6bff', skin='#f2c7a5', hair='#3b2a20', pants='#2b2f45', shoes='#23263a',
//                  facing='right'|'left'|'back-right'|'back-left', pose='stand'|'walk'|'wave'|'sit',
//                  hairStyle='short'|'bun'|'long', z=0, scale=1, rim=true })
//       ≈ 28 unités de haut. facing : 'right' = regarde/marche vers le bas-droite (+x), 'left' = vers le
//       bas-gauche (+y), 'back-right' = de dos vers le haut-droite (−y), 'back-left' = de dos vers le
//       haut-gauche (−x). 'wave' lève le bras côté spectateur. 'sit' : préférer bench({ sitters }) ;
//       à la main : z = hauteur de l'assise, (x, y) = 1 unité devant les hanches dans le sens du regard,
//       pieds au sol, d un peu plus grand que celui du siège.
//   treeRound(x, y, { size=1, z=0 })   arbre rond « nuage » (≈ 50 × 34 px à size 1)
//   treeCone(x, y, { size=1, z=0 })    arbre conique / cyprès (≈ 56 de haut)
//   bush(x, y, { w=14, d=14, h=12, z=0, color='#4fb36d' })   buisson cubique aux arêtes adoucies
//   bench(x, y, { axis='x'|'y', z=0, len=18, back=false, sitters=[] })  banc en lattes (longueur selon
//       axis), assise à z + BENCH_SEAT ; dossier éventuel côté −y (axis 'x') ou −x (axis 'y').
//       sitters : personnes assises, ex. [{ at: -4, top: '#ef4444' }] (at = décalage le long du banc,
//       autres clés = options de person()) — déjà ordonnées, rien d'autre à composer.
//   crate(x, y, z=0, { size=12, w, d, h, tape=true })       carton scotché
//   crateStack(x, y, { z=0 })          pile de 3 cartons + un petit (emprise ≈ 20 × 26)
//   pallet(x, y, { z=0, axis='x', load=null|'crates'|'tshirts' })  palette 22 × 18, dessus à z + PALLET_H
//   foldedShirts(x, y, z=0, { colors=[bas → haut], w=8, d=7 })     pile de t-shirts pliés
//   pottedPlant(x, y, { z=0, pot='round'|'square', size=1, potColor='#f7f7fb' })  plante en pot
//   lamp(x, y, { z=0, h=40 })          lampadaire bleu nuit, lanterne allumée
//   flowerBed(x, y, w, d, { z=0, seed=1 })  massif fleuri en bordure de pierre claire
//   van(x, y, { facing='x'|'y' })      camionnette blanche à bande violette (≈ 52 × 22 × 34),
//                                      roule vers +x (bas-droite) ou vers +y (bas-gauche)
//   Utilitaires : bounds(svg) → cadre écran d'un fragment ; manifest(id, title, box) → manifeste de
//   décor { id, title, labelY, hit } ; PAL = palette ; BENCH_SEAT ; PALLET_H.
import { P, poly, line, box, ellipse, cylinder, shade, tint, mix } from './iso.mjs';

// box/cylinder : remplacés ici par flatBox/softBox/softCyl (mêmes faces, mais ombrées par facettes).
void box; void cylinder;

export const PAL = {
  wall: '#f7f7fb', wallShade: '#dfe2ee', wallTop: '#ffffff', plinth: '#e3e5ef', plinthShade: '#cfd3e2',
  navy: '#2e3a6e', violet: '#7c6bff', violetLight: '#8a7cff', violetDark: '#6352e6',
  night: '#34427e', nightLight: '#3f4f93', nightDark: '#2a376b',
  wood: '#d9a066', woodShade: '#c08549', carton: '#e0b07a', cartonShade: '#c9955c',
  metal: '#c3c9d6', metalShade: '#9aa2b4',
  leaf: '#5cc27a', leafLight: '#7bd393', leafDark: '#3f9d5c', bush: '#4fb36d',
  skin: '#f2c7a5', skinDark: '#c98f6a', hair: '#3b2a20', pants: '#2b2f45',
  tops: ['#7c6bff', '#f59e0b', '#0ea5e9', '#ef4444', '#14b8a6'],
  gold: '#f6c95c', pink: '#ef8aa0', shadow: '#5a4a3a',
};
const SHADOW = PAL.shadow;
export const BENCH_SEAT = 7.5;
export const PALLET_H = 4;

/* ───────────────────────── outils internes ───────────────────────── */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const r2 = (n) => String(Math.round(n * 100) / 100);
const q1 = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Encodage compact des chemins : premier point absolu, puis déplacements relatifs (l, c).
// Jamais d'espace devant un nombre négatif (le signe sert de séparateur) : le contrôle de
// coordonnées de lint.mjs ne voit ainsi que des positions absolues, toutes dans la toile.
const sep = (s, first) => (first || s[0] === '-' ? '' : ' ') + s;
function relNums(vals) { let d = ''; vals.forEach((v, i) => { d += sep(r1(v), i === 0); }); return d; }
/** Ligne brisée (points écran), fermée par défaut. */
function pathOf(pts, close = true) {
  const R = pts.map(q1);
  let d = 'M' + r1(R[0][0]) + ' ' + r1(R[0][1]);
  if (R.length > 1) {
    const v = [];
    for (let i = 1; i < R.length; i++) v.push(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]);
    d += 'l' + relNums(v);
  }
  return d + (close ? 'z' : '');
}

/** Courbe lisse (Catmull-Rom → Bézier) passant par des points écran. */
function smooth(pts, closed = true) {
  const n = pts.length, g = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  let cur = q1(pts[0]);
  let d = 'M' + r1(cur[0]) + ' ' + r1(cur[1]) + 'c';
  const v = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = q1([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]);
    const c2 = q1([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]), e = q1(p2);
    v.push(c1[0] - cur[0], c1[1] - cur[1], c2[0] - cur[0], c2[1] - cur[1], e[0] - cur[0], e[1] - cur[1]);
    cur = e;
  }
  return d + relNums(v) + (closed ? 'z' : '');
}

const fo = (o) => (o != null && o < 1 ? ` fill-opacity="${r2(o)}"` : '');
const so = (o) => (o != null && o < 1 ? ` stroke-opacity="${r2(o)}"` : '');
const E = {
  path: (d, fill, o) => `<path d="${d}" fill="${fill}"${fo(o)}/>`,
  // Face pleine (points écran) ; seam = léger trait de même couleur qui ferme les joints d'anticrénelage.
  face: (pts, fill, seam = 0, o) => `<path d="${pathOf(pts)}" fill="${fill}"${fo(o)}` +
    (seam && !(o < 1) ? ` stroke="${fill}" stroke-width="${seam}" stroke-linejoin="round"` : '') + '/>',
  circle: (c, r, fill, o) => `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}" fill="${fill}"${fo(o)}/>`,
  ellipse: (c, rx, ry, fill, o) => `<ellipse cx="${r1(c[0])}" cy="${r1(c[1])}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${fill}"${fo(o)}/>`,
  stroke: (d, color, w, o) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"${so(o)}/>`,
};

/** Enveloppe convexe de points écran. */
function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Cadre écran d'un fragment SVG (path M/L/C/A/Z absolus ou relatifs, circle, ellipse ; trait compris). */
export function bounds(svg) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y, p = 0) => { x0 = Math.min(x0, x - p); y0 = Math.min(y0, y - p); x1 = Math.max(x1, x + p); y1 = Math.max(y1, y + p); };
  for (const m of svg.matchAll(/<(path|circle|ellipse)\s([^>]*?)\/>/g)) {
    const a = m[2];
    const g = (k) => { const r = a.match(new RegExp('(?:^|\\s)' + k + '="([^"]*)"')); return r ? r[1] : null; };
    const st = g('stroke');
    const sw = st && st !== 'none' ? Number(g('stroke-width') || 1) / 2 : 0;
    if (m[1] === 'circle') { const cx = +g('cx'), cy = +g('cy'), r = +g('r'); add(cx - r, cy - r, sw); add(cx + r, cy + r, sw); continue; }
    if (m[1] === 'ellipse') { const cx = +g('cx'), cy = +g('cy'), rx = +g('rx'), ry = +g('ry'); add(cx - rx, cy - ry, sw); add(cx + rx, cy + ry, sw); continue; }
    const t = (g('d') || '').match(/[A-Za-z]|-?\d*\.?\d+/g) || [];
    let cmd = 'M', i = 0, cx = 0, cy = 0, sx = 0, sy = 0;
    while (i < t.length) {
      if (/[A-Za-z]/.test(t[i])) {
        cmd = t[i++];
        if (cmd === 'Z' || cmd === 'z') { cx = sx; cy = sy; continue; }
      }
      const relc = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = relc ? cx : 0, oy = relc ? cy : 0;
      if (C === 'A') {
        const rx = +t[i], ry = +t[i + 1], ex = ox + +t[i + 5], ey = oy + +t[i + 6]; i += 7;
        const mx = (cx + ex) / 2, my = (cy + ey) / 2; add(mx - rx, my - ry, sw); add(mx + rx, my + ry, sw);
        add(ex, ey, sw); cx = ex; cy = ey;
      } else if (C === 'C') {
        for (let k = 0; k < 3; k++) add(ox + +t[i + 2 * k], oy + +t[i + 2 * k + 1], sw);
        cx = ox + +t[i + 4]; cy = oy + +t[i + 5]; i += 6;
      } else {
        const px = ox + +t[i], py = oy + +t[i + 1]; i += 2; add(px, py, sw); cx = px; cy = py;
        if (C === 'M') { sx = cx; sy = cy; cmd = relc ? 'l' : 'L'; }
      }
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Manifeste d'un sprite de décor : labelY = sommet de l'objet, hit = son cadre (+ marge). */
export function manifest(id, title, b, pad = 2) {
  const x = Math.max(0, Math.floor(b.x - pad)), y = Math.max(0, Math.floor(b.y - pad));
  const x2 = Math.min(400, Math.ceil(b.x + b.w + pad)), y2 = Math.min(400, Math.ceil(b.y + b.h + pad));
  return { id, title, labelY: Math.round(b.y), hit: { x, y, w: x2 - x, h: y2 - y } };
}

/* Lumière : direction horizontale d'où vient la lumière (côté +y, un peu −x). */
const LIGHT = (() => { const l = Math.hypot(-0.3, 1); return [-0.3 / l, 1 / l]; })();
/** 0 = face +x (ombrée) … 1 = face +y (éclairée), pour une normale horizontale n. */
const lightT = (n) => clamp((n[0] * LIGHT[0] + n[1] * LIGHT[1] - LIGHT[0]) / (LIGHT[1] - LIGHT[0]), 0, 1);

/** Remet un contour (points monde xy) dans le sens trigonométrique vu de dessus. */
function ccw(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a < 0 ? pts.slice().reverse() : pts;
}

/** Rectangle aux coins arrondis (monde), toujours 4 × (n + 1) points, sens trigonométrique. */
function rrect(cx, cy, hw, hd, r, n = 3) {
  r = clamp(r, 0.001, Math.min(hw, hd));
  const pts = [];
  const cs = [[cx + hw - r, cy + hd - r, 0], [cx - hw + r, cy + hd - r, 90], [cx - hw + r, cy - hd + r, 180], [cx + hw - r, cy - hd + r, 270]];
  for (const [ox, oy, a0] of cs) for (let i = 0; i <= n; i++) {
    const a = ((a0 + (90 * i) / Math.max(n, 1)) * Math.PI) / 180; pts.push([ox + r * Math.cos(a), oy + r * Math.sin(a)]);
  }
  return pts;
}
/** Cercle (monde), n points, sens trigonométrique. */
function circ(cx, cy, r, n = 16) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

/**
 * Volume « lofté » : anneaux horizontaux { z, pts } (même nombre de points, sens trigo, bas → haut).
 * Facettes tournées vers le spectateur seulement, teintées selon leur normale (bands[k] = { lit, dark }
 * pour l'intervalle k) en `levels` paliers ; les facettes voisines de même palier sont fusionnées en
 * un seul polygone (fichier léger). Puis le dessus (top) s'il est demandé.
 */
function loft(rings, { bands, top = null, levels = 6, seam = 0.3 }) {
  const N = rings[0].pts.length;
  const pr = rings.map((r) => r.pts.map(([x, y]) => P(x, y, r.z)));
  let s = E.face(hull(pr.flat()), mix(bands[0].lit, bands[0].dark, 0.5), 0);
  for (let k = 0; k < rings.length - 1; k++) {
    if (Math.abs(rings[k + 1].z - rings[k].z) < 1e-6) continue;
    // Bord haut relevé de 0,25 px quand une bande ou le dessus le recouvre (ferme le joint).
    const lift = k + 1 < rings.length - 1 || top ? 0.25 : 0;
    const A = rings[k].pts, band = bands[Math.min(k, bands.length - 1)];
    const lv = new Array(N);
    let prev = -1;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, ex = A[j][0] - A[i][0], ey = A[j][1] - A[i][1], l = Math.hypot(ex, ey);
      if (l < 1e-9) { lv[i] = prev; continue; }
      const n = [ey / l, -ex / l];
      lv[i] = prev = n[0] + n[1] > 1e-3 ? Math.round(lightT(n) * (levels - 1)) : -1;
    }
    const i0 = lv.indexOf(-1);
    if (i0 < 0) continue;
    const runs = [];
    for (let t = 1; t <= N; t++) {
      const i = (i0 + t) % N;
      if (lv[i] < 0) continue;
      const last = runs[runs.length - 1];
      if (last && last.lv === lv[i] && last.end === (i - 1 + N) % N) last.end = i;
      else runs.push({ lv: lv[i], start: i, end: i });
    }
    runs.forEach((r, ri) => {
      // chaque bande déborde d'une facette sous la suivante : pas de joint visible entre paliers
      const end = ri < runs.length - 1 ? (r.end + 1) % N : r.end;
      const idx = [];
      for (let i = r.start; ; i = (i + 1) % N) { idx.push(i); if (i === (end + 1) % N) break; }
      const q = [...idx.map((i) => pr[k][i]), ...idx.slice().reverse().map((i) => [pr[k + 1][i][0], pr[k + 1][i][1] - lift])];
      s += E.face(q, mix(band.dark, band.lit, r.lv / (levels - 1)));
    });
  }
  if (top) s += E.face(pr[pr.length - 1], top, seam);
  return s;
}

/** Pavé net minuscule (pieds, lattes, montants) : hexagone ombré + face éclairée + dessus. */
function flatBox(cx, cy, z, w, d, h, { lit, dark, top }) {
  const x0 = cx - w / 2, y0 = cy - d / 2, x1 = cx + w / 2, y1 = cy + d / 2, z1 = z + h;
  const hex = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z), P(x0, y1, z1)];
  return E.face(hex, dark) + E.face([P(x0, y1, z), P(x1, y1, z), P(x1, y1, z1), P(x0, y1, z1)], lit) +
    E.face([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top);
}

/** Pavé aux arêtes adoucies (coins verticaux arrondis r, arête du dessus chanfreinée c). */
function softBox(cx, cy, z, w, d, h, { lit, dark, top, r = 2, c = 1.5, n = 3 }) {
  c = Math.min(c, h * 0.45, w / 2 - 0.01, d / 2 - 0.01);
  const rings = [{ z, pts: rrect(cx, cy, w / 2, d / 2, r, n) }];
  if (c > 0.05) {
    rings.push({ z: z + h - c, pts: rrect(cx, cy, w / 2, d / 2, r, n) });
    rings.push({ z: z + h, pts: rrect(cx, cy, w / 2 - c, d / 2 - c, Math.max(r - c, 0.001), n) });
  } else rings.push({ z: z + h, pts: rrect(cx, cy, w / 2, d / 2, r, n) });
  const bands = [{ lit, dark }, { lit: mix(lit, top, 0.6), dark: mix(dark, top, 0.45) }];
  return loft(rings, { bands, top, levels: n > 1 ? 6 : 4 });
}

/** Cylindre vertical ombré (r0 en bas, r1 en haut). */
function softCyl(cx, cy, z, r0, h, { lit, dark, top = null, r1: rt = r0, n = 16 }) {
  return loft([{ z, pts: circ(cx, cy, r0, n) }, { z: z + h, pts: circ(cx, cy, rt, n) }], { bands: [{ lit, dark }], top });
}

/** Ombre portée douce au sol : enveloppe de l'empreinte et de sa translation vers la droite de l'écran. */
function castShadow(foot, z, h, o = 0.13) {
  const k = 0.42 * h;
  const hp = hull([...foot.map(([x, y]) => P(x, y, z)), ...foot.map(([x, y]) => P(x + k, y - k, z))]);
  const c = hp.reduce((a, p) => [a[0] + p[0] / hp.length, a[1] + p[1] / hp.length], [0, 0]);
  return E.path(smooth(hp), SHADOW, o * 0.55) + E.path(smooth(hp.map((p) => lerp2(c, p, 0.82))), SHADOW, o * 0.55);
}
/** Petite ombre elliptique adoucie en couches concentriques (dégradé sans <defs>). */
function softEllipse(c, rx, ry, o = 0.16, n = 4) {
  let g = '';
  for (let i = 0; i < n; i++) { const t = 1 - (i / n) * 0.62; g += E.ellipse(c, rx * t, ry * t, SHADOW, (o * 1.15) / n); }
  return g;
}

/** Liseré clair (silhouette « autocollant » de la référence) à partir de primitives de silhouette. */
function rimOf(sil, color = '#fffdf8', w = 0.8, o = 0.88) {
  const out = [];
  for (const m of sil.matchAll(/<(path|circle|ellipse)\s([^>]*?)\/>/g)) {
    const a = m[2], g = (k) => (a.match(new RegExp('(?:^|\\s)' + k + '="([^"]*)"')) || [])[1];
    if (m[1] === 'circle') out.push(`<circle cx="${g('cx')}" cy="${g('cy')}" r="${g('r')}"/>`);
    else if (m[1] === 'ellipse') out.push(`<ellipse cx="${g('cx')}" cy="${g('cy')}" rx="${g('rx')}" ry="${g('ry')}"/>`);
    else if (g('fill') === 'none') out.push(`<path d="${g('d')}" fill="none" stroke-width="${r1(Number(g('stroke-width') || 1) + 2 * w)}"/>`);
    else out.push(`<path d="${g('d')}"/>`);
  }
  // remplissage et contour communs portés par le groupe (fichier plus léger)
  return `<g opacity="${o}" fill="${color}" stroke="${color}" stroke-width="${r1(2 * w)}" stroke-linecap="round" stroke-linejoin="round">${out.join('')}</g>`;
}

const item = (x, y, shadowSvg, body, extra = '') => ({ d: x + y, svg: shadowSvg + body + extra, box: bounds(body) });

/* ───────────────────────── personnage ───────────────────────── */

export function person(x, y, o = {}) {
  const top = o.top ?? '#7c6bff', skin = o.skin ?? '#f2c7a5', hair = o.hair ?? '#3b2a20';
  const pants = o.pants ?? '#2b2f45', shoes = o.shoes ?? '#23263a';
  const facing = o.facing ?? 'right', pose = o.pose ?? 'stand', hs = o.hairStyle ?? 'short';
  const z = o.z ?? 0, s = o.scale ?? 1;
  const F = { right: [1, 0], left: [0, 1], 'back-right': [0, -1], 'back-left': [-1, 0] }[facing] ?? [1, 0];
  const Sd = [-F[1], F[0]]; // gauche du personnage
  const back = facing.startsWith('back');
  const wx = (u, v) => x + (u * F[0] + v * Sd[0]) * s, wy = (u, v) => y + (u * F[1] + v * Sd[1]) * s;
  const Q = (u, v, h) => P(wx(u, v), wy(u, v), z + h * s);
  const depth = (u, v) => u * (F[0] + F[1]) + v * (Sd[0] + Sd[1]);
  const near = Sd[0] + Sd[1] > 0 ? 1 : -1; // côté (v) tourné vers le spectateur
  const sit = pose === 'sit', walk = pose === 'walk', wave = pose === 'wave';
  const hipZ = sit ? 1.2 : 13.2;
  const sil = []; // primitives de silhouette → liseré

  // Jambes : [hanche, genou, cheville, pointe du pied] en (u avant, v gauche, h)
  const leg = (side) => {
    const v = 1.32 * side;
    if (sit) return [[-1.0, v, hipZ], [5.6, v * 1.06, hipZ + 0.3], [6.0, v * 1.1, 1.3 - BENCH_SEAT], [8.0, v * 1.1, 0.8 - BENCH_SEAT]];
    if (walk) return side === 1
      ? [[0.3, v, hipZ], [2.0, v, 7.3], [3.1, v, 1.3], [5.2, v, 0.8]]
      : [[-0.3, v, hipZ], [-1.0, v, 6.9], [-2.9, v, 2.2], [-1.1, v, 0.7]];
    return [[0, v, hipZ], [0.15, v * 1.03, 7.0], [0.05, v * 1.06, 1.3], [2.1, v * 1.06, 0.8]];
  };
  // Bras : [épaule, coude, main]
  const arm = (side) => {
    const v = 2.95 * side, sh = [0, v, hipZ + 6.6];
    if (wave && side === near) return [sh, [0.4, v * 1.75, hipZ + 9.0], [0.7, v * 2.1, hipZ + 13.0]];
    if (sit) return [sh, [1.1, v * 1.12, hipZ + 3.2], [3.1, v * 0.92, hipZ + 1.4]];
    if (walk) return side === -1
      ? [sh, [1.1, v * 1.12, hipZ + 3.3], [2.2, v * 1.08, hipZ + 0.2]]
      : [sh, [-1.2, v * 1.12, hipZ + 3.4], [-2.2, v * 1.08, hipZ + 0.1]];
    return [sh, [-0.15, v * 1.16, hipZ + 3.2], [0.1, v * 1.12, hipZ - 0.5]];
  };

  const pantsFar = shade(pants, 0.8), topDark = shade(top, 0.8), skinDark = shade(skin, 0.88);
  const drawLeg = (side, far) => {
    const [hp, kn, an, toe] = leg(side);
    const lp = pathOf([Q(...hp), Q(...kn), Q(...an)], false), sp = pathOf([Q(an[0] - 0.4, an[1], an[2] - 0.2), Q(...toe)], false);
    sil.push(E.stroke(lp, '#000', 3.0 * s), E.stroke(sp, '#000', 2.3 * s));
    let g = E.stroke(lp, far ? pantsFar : pants, 3.0 * s);
    // assis : dessus de cuisse éclairé (fait lire la flexion du genou)
    if (sit) g += E.stroke(pathOf([Q(hp[0] + 0.6, hp[1], hp[2] + 0.5), Q(kn[0] - 0.3, kn[1], kn[2] + 0.5)], false), tint(far ? pantsFar : pants, 0.16), 1.6 * s);
    return g + E.stroke(sp, far ? shade(shoes, 0.85) : shoes, 2.3 * s);
  };
  const drawArm = (side, far) => {
    const [sh, el, hd] = arm(side);
    const a = Q(...sh), b = Q(...el), c = Q(...hd), sk = far ? skinDark : skin;
    const ap = pathOf([a, b, c], false), sl = pathOf([Q(sh[0], sh[1] * 0.8, sh[2] + 0.4), lerp2(a, b, 0.5)], false);
    sil.push(E.stroke(ap, '#000', 1.85 * s), E.circle(c, 1.02 * s, '#000'), E.stroke(sl, '#000', 2.6 * s));
    // manche courte : part de l'intérieur de l'épaule pour se fondre dans le torse
    return E.stroke(ap, sk, 1.85 * s) + E.circle(c, 1.02 * s, sk) + E.stroke(sl, far ? topDark : top, 2.6 * s);
  };

  // Torse : section elliptique (a = demi-largeur, b = demi-épaisseur), du bassin aux épaules arrondies.
  const lean = walk ? 0.35 : 0;
  const ring = (h, a, b, du = 0) => {
    const pts = [];
    for (let i = 0; i < 16; i++) { const t = (i / 16) * 2 * Math.PI; const u = du + b * Math.sin(t), v = a * Math.cos(t); pts.push([wx(u, v), wy(u, v)]); }
    return { z: z + h * s, pts };
  };
  let rings = [ring(hipZ - 0.8, 2.8, 1.8), ring(hipZ + 6.6, 3.25, 1.9, lean), ring(hipZ + 7.7, 2.6, 1.55, lean)];
  if (ccw(rings[0].pts) !== rings[0].pts) rings = rings.map((r) => ({ z: r.z, pts: r.pts.slice().reverse() }));
  const torso = loft(rings, { bands: [{ lit: top, dark: topDark }, { lit: tint(top, 0.05), dark: shade(top, 0.85) }], top: tint(top, 0.1), levels: 5, seam: 0.25 });
  sil.push(E.path(pathOf(hull(rings.flatMap((r) => r.pts.map(([a, b]) => P(a, b, r.z))))), '#000'));

  // Tête : crâne + calotte de cheveux qui suit le crâne (visage du côté du regard).
  const R = 3.2 * s, Hc = Q(lean, 0, hipZ + 11.0);
  const fv = [(F[0] - F[1]) * 0.866, (F[0] + F[1]) * 0.5]; // direction écran du regard
  const mir = fv[0] < 0; // angles donnés pour un regard vers la droite, en miroir sinon
  const at = (deg, rr) => { const a = ((mir ? 180 - deg : deg) * Math.PI) / 180; return [Hc[0] + Math.cos(a) * rr, Hc[1] + Math.sin(a) * rr]; };
  const hairHi = tint(hair, 0.25), hv = R + 0.35 * s;
  let headBack = '', head = '';
  sil.push(E.circle(Hc, R, '#000'));
  if (!back) {
    if (hs === 'long') { const lp = pathOf([Q(lean - 1.0, 0, hipZ + 10.8), Q(lean - 1.4, 0, hipZ + 5.9)], false); headBack += E.stroke(lp, hair, 2 * R * 0.88); sil.push(E.stroke(lp, '#000', 2 * R * 0.88)); }
    if (hs === 'bun') { headBack += E.circle(at(-142, R * 0.98), R * 0.46, hair); sil.push(E.circle(at(-142, R * 0.98), R * 0.46, '#000')); }
    head += E.circle(Hc, R, skinDark) + E.circle([Hc[0] - (mir ? -0.3 : 0.3) * s, Hc[1] - 0.25 * s], R - 0.32 * s, skin);
    const cap = [];
    for (let a = -20; a >= -212; a -= 12) cap.push(at(a, hv));
    cap.push(at(150, R * 0.62), at(178, R * 0.14), at(-90, R * 0.06), at(-38, R * 0.56));
    head += E.path(smooth(cap), hair);
    sil.push(E.path(smooth(cap), '#000'));
    head += E.path(smooth([at(-150, R * 0.86), at(-112, R * 0.92), at(-88, R * 0.62), at(-128, R * 0.5)]), hairHi, 0.55);
  } else {
    head += E.circle(Hc, R, skinDark) + E.circle([Hc[0], Hc[1] - R * 0.14], hv, hair);
    sil.push(E.circle([Hc[0], Hc[1] - R * 0.14], hv, '#000'));
    head += E.path(smooth([[Hc[0] - R * 0.7, Hc[1] - R * 0.5], [Hc[0] - R * 0.2, Hc[1] - R * 1.0], [Hc[0] + R * 0.1, Hc[1] - R * 0.7], [Hc[0] - R * 0.45, Hc[1] - R * 0.25]]), hairHi, 0.5);
    if (hs === 'bun') { const bc = [Hc[0] - fv[0] * R * 0.62, Hc[1] - fv[1] * R * 0.62 - R * 0.3]; head += E.circle(bc, R * 0.46, hair); sil.push(E.circle(bc, R * 0.46, '#000')); }
    if (hs === 'long') { const lp = pathOf([[Hc[0] - fv[0] * R * 0.2, Hc[1] + R * 0.1], Q(lean - 1.0, 0, hipZ + 5.9)], false); head += E.stroke(lp, hair, 2 * R * 0.82); sil.push(E.stroke(lp, '#000', 2 * R * 0.82)); }
  }
  const np = pathOf([Q(lean * 0.5, 0, hipZ + 7.0), Q(lean, 0, hipZ + 8.5)], false);
  const neck = E.stroke(np, skinDark, 1.8 * s);

  // Ordre du peintre interne
  const legs = [1, -1].sort((a, b) => depth(leg(a)[2][0], leg(a)[2][1]) - depth(leg(b)[2][0], leg(b)[2][1]));
  const legsSvg = drawLeg(legs[0], true) + drawLeg(legs[1], false);
  const lap = sit && !back; // assis face au spectateur : les cuisses passent devant le torse
  let body = headBack + drawArm(-near, true);
  if (!lap) body += legsSvg;
  body += torso;
  if (lap) body += legsSvg;
  if (!wave) body += drawArm(near, false);
  body += neck + head;
  if (wave) body += drawArm(near, false);

  const foot = P(x, y, z);
  const sh = sit ? '' : softEllipse([foot[0] + 1.6 * s, foot[1] + 0.2], 6.4 * s, 2.7 * s, 0.2);
  const rim = o.rim === false ? '' : rimOf(sil.join(''), '#fffdf8', 0.75 * s, 0.85);
  return { d: x + y, svg: sh + rim + body, box: bounds(body) };
}

/* ───────────────────────── végétation ───────────────────────── */

const BARK = { lit: '#c8874a', dark: '#9c6537' };

/**
 * Houppier « nuage » d'un seul tenant (comme la référence) :
 * 1. silhouette = union des lobes, ton sombre ; 2. lobes éclairés (sauf 'shade' ; 'half' = à moitié) légèrement
 * décalés vers la lumière → grand côté gauche clair, côté droit sombre, frontière festonnée ;
 * 3. ombre douce sous les lobes hauts (bande translucide) ; 4. reflets doux.
 * list : [dx, dy, r, 'shade'|'half'|'', [deg0, deg1] arc d'ombre sous le lobe] en px écran (× k).
 */
function canopy(c, list, k, { leaf, light, dark }, hl = [], sil = null) {
  let g = '';
  const at = (dx, dy) => [c[0] + dx * k, c[1] + dy * k];
  for (const [dx, dy, r] of list) { g += E.circle(at(dx, dy), r * k, dark); if (sil) sil.push(E.circle(at(dx, dy), r * k, '#000')); }
  for (const [dx, dy, r, kind] of list) {
    if (kind === 'half') g += E.circle(at(dx - 0.34 * r, dy - 0.14 * r), r * 0.74 * k, leaf);
    else if (kind !== 'shade') g += E.circle(at(dx - 0.13 * r, dy - 0.1 * r), r * 0.93 * k, leaf);
  }
  for (const [dx, dy, r, kind, sep] of list) {
    if (!sep) continue;
    const pts = [];
    for (let a = sep[0]; a <= sep[1]; a += 15) { const t = (a * Math.PI) / 180; pts.push(at(dx - 0.1 * r + Math.cos(t) * r * 0.9, dy - 0.05 * r + Math.sin(t) * r * 0.9)); }
    const col = kind === 'shade' ? shade(dark, 0.82) : dark, d = smooth(pts, false);
    g += E.stroke(d, col, 2.6 * k, 0.13) + E.stroke(d, col, 1.2 * k, 0.18);
  }
  for (const [dx, dy, r, o = 0.45] of hl) g += E.circle(at(dx, dy), r * k, light, o);
  return g;
}

/** Tronc : cylindre légèrement effilé, plus sa silhouette pour le liseré. */
function trunk(x, y, z, r, h, sil) {
  sil.push(E.stroke(line([[x, y, z + r * 0.4], [x, y, z + h]]), '#000', 2 * r * 1.15));
  return softCyl(x, y, z, r, h, { ...BARK, r1: r * 0.82, n: 12 });
}

export function treeRound(x, y, o = {}) {
  const k = o.size ?? 1, z = o.z ?? 0;
  const col = { leaf: o.leaf ?? PAL.leaf, light: o.light ?? PAL.leafLight, dark: o.dark ?? PAL.leafDark };
  const base = P(x, y, z), th = 12 * k, sil = [];
  let body = trunk(x, y, z, 2.1 * k, th + 6 * k, sil);
  const c = [base[0], base[1] - th - 16.6 * k];
  body += E.ellipse([base[0] + 0.4 * k, base[1] - th + 0.5 * k], 2.9 * k, 1.5 * k, '#3a2a1a', 0.22);
  // trois étages de lobes + une tête : silhouette en œuf, plus haute que large (comme la référence)
  const L = [
    [7.2, 10.4, 8.4, 'shade'], [-7.2, 10.0, 8.6], [0, 12.0, 8.6, 'half'],
    [6.6, -0.2, 8.0, 'shade', [40, 120]], [-6.8, -0.6, 8.2, '', [50, 135]], [0.6, 1.5, 7.6, 'half'],
    [3.6, -9.8, 6.8, 'shade', [40, 120]], [-3.8, -10.4, 7.2, '', [45, 140]],
    [-0.4, -15.6, 6.0, '', [40, 140]],
  ];
  body += canopy(c, L, k, col, [[-9.0, 6.2, 4.6, 0.2], [-8.4, -3.4, 4.0, 0.22], [-5.2, -12.8, 3.4, 0.2], [-2.6, -17.6, 2.6, 0.16]], sil);
  const sh = softEllipse([base[0] + 11 * k, base[1] - 1.5 * k], 16 * k, 5.8 * k, 0.15) + softEllipse([base[0] + 0.8 * k, base[1]], 4.4 * k, 2.1 * k, 0.2);
  const rim = o.rim === false ? '' : rimOf(sil.join(''), '#fffdf8', 0.8, 0.8);
  return { d: x + y, svg: sh + rim + body, box: bounds(body) };
}

export function treeCone(x, y, o = {}) {
  const k = o.size ?? 1, z = o.z ?? 0;
  const leaf = o.leaf ?? PAL.leaf, light = o.light ?? PAL.leafLight, dark = o.dark ?? PAL.leafDark;
  const base = P(x, y, z), th = 11 * k, Hc = 46 * k, Wc = 10.4 * k, sil = [];
  let body = trunk(x, y, z, 1.6 * k, th + 6 * k, sil);
  const yb = base[1] - th + 2.5 * k, yt = yb - Hc, cx = base[0];
  const prof = (t) => (t < 0.64 ? Math.pow(Math.sin((Math.PI / 2) * (t / 0.64)), 0.62) : Math.sqrt(Math.max(0, 1 - ((t - 0.64) / 0.36) ** 2)));
  const N = 12, Lft = [], Rgt = [];
  for (let i = 0; i <= N; i++) { const t = i / N, w = Wc * prof(t), yy = yt + t * Hc; Lft.push([cx - w, yy]); Rgt.push([cx + w, yy]); }
  const shape = smooth([...Rgt, ...Lft.slice(1, -1).reverse()]);
  body += E.path(shape, dark);
  sil.push(E.path(shape, '#000'));
  // Partie éclairée : bord gauche + frontière ondulée qui remonte un peu à droite du centre.
  const bnd = [];
  for (let i = N - 1; i >= 1; i--) { const t = i / N, w = Wc * prof(t); bnd.push([cx + w * (0.16 + 0.2 * Math.sin(t * Math.PI * 2.6 + 0.4) * Math.sin(t * Math.PI)), yt + t * Hc]); }
  body += E.path(smooth([...Lft, ...bnd]), leaf);
  // Masse de feuillage plus claire le long du bord éclairé, lisière de masse plus bas,
  // et une ombre de masse sur le côté droit.
  const hlp = [];
  for (let i = 2; i <= 7; i++) { const t = i / N; hlp.push([cx - Wc * prof(t) * 0.8, yt + t * Hc]); }
  for (let i = 6; i >= 2; i--) { const t = i / N; hlp.push([cx - Wc * prof(t) * 0.28, yt + t * Hc + 1.6 * k]); }
  body += E.path(smooth(hlp), light, 0.4);
  const lis = smooth([[cx - Wc * 0.84, yt + Hc * 0.6], [cx - Wc * 0.5, yt + Hc * 0.675], [cx - Wc * 0.14, yt + Hc * 0.635]], false);
  body += E.stroke(lis, dark, 2.4 * k, 0.15) + E.stroke(lis, dark, 1.1 * k, 0.2);
  body += E.path(smooth([[cx + Wc * 0.42, yt + Hc * 0.56], [cx + Wc * 0.82, yt + Hc * 0.66], [cx + Wc * 0.62, yt + Hc * 0.86], [cx + Wc * 0.3, yt + Hc * 0.8]]), '#2f8a4c', 0.35);
  const sh = softEllipse([base[0] + 8 * k, base[1] - 1.2 * k], 12 * k, 4.6 * k, 0.15) + softEllipse([base[0] + 0.8 * k, base[1]], 3.6 * k, 1.8 * k, 0.18);
  const rim = o.rim === false ? '' : rimOf(sil.join(''), '#fffdf8', 0.8, 0.8);
  return { d: x + y, svg: sh + rim + body, box: bounds(body) };
}

export function bush(x, y, o = {}) {
  const w = o.w ?? 14, d = o.d ?? 14, h = o.h ?? 12, z = o.z ?? 0, col = o.color ?? PAL.bush;
  const r = Math.min(3, w / 4, d / 4), c = Math.min(2.4, h / 4);
  let body = softBox(x, y, z, w, d, h, { lit: col, dark: shade(col, 0.86), top: tint(col, 0.2), r, c });
  // Pied légèrement assombri (faux dégradé vertical) pour l'ancrer au sol.
  for (const [hh, op] of [[h * 0.5, 0.04], [h * 0.34, 0.045], [h * 0.18, 0.05]]) {
    body += E.path(poly([[x - w / 2 + r, y + d / 2, z], [x + w / 2 - r, y + d / 2, z], [x + w / 2 - r, y + d / 2, z + hh], [x - w / 2 + r, y + d / 2, z + hh]]), '#1f5a33', op);
    body += E.path(poly([[x + w / 2, y - d / 2 + r, z], [x + w / 2, y + d / 2 - r, z], [x + w / 2, y + d / 2 - r, z + hh], [x + w / 2, y - d / 2 + r, z + hh]]), '#1f5a33', op);
  }
  const sh = castShadow(rrect(x, y, w / 2, d / 2, r, 1), z, h, 0.14);
  return item(x, y, sh, body);
}

/* ───────────────────────── mobilier ───────────────────────── */

export function bench(x, y, o = {}) {
  const axis = o.axis ?? 'x', z = o.z ?? 0, len = o.len ?? 18, back = o.back ?? false;
  const along = axis === 'x';
  const at = (a, b) => (along ? [x + a, y + b] : [x + b, y + a]);
  const dims = (la, lb) => (along ? [la, lb] : [lb, la]);
  const iron = { lit: '#4b5373', dark: '#363d58', top: '#5d6690' };
  const wood = { lit: PAL.wood, dark: PAL.woodShade, top: tint(PAL.wood, 0.2) };
  const seatZ = z + BENCH_SEAT - 1.4;
  const ends = [-len / 2 + 2, len / 2 - 2];
  let body = '';
  if (back) { // dossier, côté arrière (−b) : montants + deux lattes
    for (const a of ends) { const [cx, cy] = at(a, -2.6), [w, d] = dims(1, 0.9); body += flatBox(cx, cy, z, w, d, BENCH_SEAT + 7, iron); }
    for (const zz of [seatZ + 3.4, seatZ + 6.2]) { const [cx, cy] = at(0, -2.9), [w, d] = dims(len, 0.8); body += flatBox(cx, cy, zz, w, d, 2.2, wood); }
  }
  const legs = [];
  for (const a of ends) for (const b of [-1.9, 1.9]) legs.push([a, b]);
  legs.sort((p, q) => (at(...p)[0] + at(...p)[1]) - (at(...q)[0] + at(...q)[1]));
  for (const [a, b] of legs) { const [cx, cy] = at(a, b), [w, d] = dims(1, 1); body += flatBox(cx, cy, z, w, d, BENCH_SEAT - 1.4, iron); }
  for (const a of ends) { const [cx, cy] = at(a, 0), [w, d] = dims(1, 5.4); body += flatBox(cx, cy, seatZ - 0.9, w, d, 0.9, iron); }
  for (const b of [-2.05, 0, 2.05]) { const [cx, cy] = at(0, b), [w, d] = dims(len, 1.75); body += softBox(cx, cy, seatZ, w, d, 1.4, { ...wood, r: 0.45, c: 0.35, n: 2 }); }
  // Personnes assises (dos au dossier, face au spectateur), dans le bon ordre de dessin.
  if (o.sitters) {
    body += o.sitters
      .map((p) => { const a = p.at ?? 0; const [px, py] = along ? [x + a, y + 1] : [x + 1, y + a]; return person(px, py, { facing: along ? 'left' : 'right', ...p, pose: 'sit', z: z + BENCH_SEAT }); })
      .sort((p, q) => p.d - q.d).map((p) => p.svg).join('');
  }
  const sh = castShadow(rrect(x, y, ...dims(len / 2, 3.2), 1, 1), z, 5, 0.12);
  return item(x, y, sh, body);
}

export function crate(x, y, z = 0, o = {}) {
  const size = o.size ?? 12, w = o.w ?? size, d = o.d ?? size, h = o.h ?? size;
  const top = tint(PAL.carton, 0.22), c = Math.min(0.6, h * 0.1);
  let body = softBox(x, y, z, w, d, h, { lit: PAL.carton, dark: PAL.cartonShade, top, r: 0.7, c, n: 2 });
  if (o.tape !== false) {
    const tw = Math.max(0.8, d * 0.085), tape = '#f4e2c2';
    const x0 = x - w / 2 + c, x1 = x + w / 2 - c, zt = z + h;
    body += E.path(poly([[x0, y - tw, zt], [x1, y - tw, zt], [x1, y + tw, zt], [x0, y + tw, zt]]), tape);
    body += E.path(poly([[x1, y - tw, zt], [x + w / 2, y - tw, zt - c], [x + w / 2, y + tw, zt - c], [x1, y + tw, zt]]), mix(tape, shade(tape, 0.88), 0.5));
    body += E.path(poly([[x + w / 2, y - tw, zt - c], [x + w / 2, y + tw, zt - c], [x + w / 2, y + tw, zt - c - h * 0.42], [x + w / 2, y - tw, zt - c - h * 0.42]]), shade(tape, 0.86));
    // fente des rabats, perpendiculaire au ruban
    body += E.stroke(line([[x, y - d / 2 + c + 0.3, zt], [x, y - tw, zt]]) + ' ' + line([[x, y + tw, zt], [x, y + d / 2 - c - 0.3, zt]]), shade(top, 0.86), 0.35);
    // pictogramme « haut » imprimé sur la face éclairée
    if (Math.min(w, h) >= 7) {
      const fy = y + d / 2, ax = x - w * 0.22, az = z + h * 0.42, sc = Math.min(w, h) / 12;
      let d2 = '';
      for (const dx of [-0.9 * sc, 0.9 * sc]) d2 += line([[ax + dx, fy, az - 1.6 * sc], [ax + dx, fy, az + 1.4 * sc]]) + ' ' + line([[ax + dx - 0.75 * sc, fy, az + 0.6 * sc], [ax + dx, fy, az + 1.5 * sc], [ax + dx + 0.75 * sc, fy, az + 0.6 * sc]]) + ' ';
      body += E.stroke(d2.trim(), '#b07a45', 0.45, 0.7);
    }
  }
  const sh = z > 0.01 ? '' : castShadow(rrect(x, y, w / 2, d / 2, 0.7, 1), z, h, 0.13);
  return item(x, y, sh, body);
}

export function crateStack(x, y, o = {}) {
  const z = o.z ?? 0;
  const parts = [
    crate(x - 0.6, y - 6.3, z, { size: 12 }),
    crate(x + 0.6, y + 6.3, z, { size: 12 }),
    crate(x - 0.4, y - 4.2, z + 12, { w: 10, d: 10, h: 9 }),
    crate(x + 11.5, y - 1, z, { w: 7, d: 7, h: 6.5 }),
  ];
  const foot = [...rrect(x, y, 6.6, 12.6, 0.7, 1), ...rrect(x + 11.5, y - 1, 3.5, 3.5, 0.7, 1)];
  return item(x, y, castShadow(foot, z, 12, 0.13), parts.map((p) => p.svg).join(''));
}

/** Pile de t-shirts pliés posée en z ; colors du bas vers le haut. */
export function foldedShirts(x, y, z = 0, o = {}) {
  const colors = o.colors ?? ['#2b2f45', '#f7f7fb', '#7c6bff', '#f7f7fb'];
  const w = o.w ?? 8, d = o.d ?? 7, t = 1.45;
  const off = (i) => [i % 2 ? 0.25 : -0.2, i % 3 === 1 ? -0.3 : 0.2];
  let body = '';
  colors.forEach((col, i) => {
    const [ox, oy] = off(i);
    const sideLine = line([[x + ox - w / 2 + 0.5, y + oy + d / 2, z + i * t + t * 0.5], [x + ox + w / 2 - 0.5, y + oy + d / 2, z + i * t + t * 0.5]]);
    body += flatBox(x + ox, y + oy, z + i * t, w, d, t * 0.94, { lit: col, dark: shade(col, 0.86), top: tint(col, 0.16) }) + E.stroke(sideLine, shade(col, 0.8), 0.3, 0.8);
  });
  // encolure (demi-disque creusé au bord avant du t-shirt du dessus) et pli central
  const i = colors.length - 1, col = colors[i], [ox, oy] = off(i), zt = z + colors.length * t - t * 0.06;
  const ex = x + ox + w / 2, u = [];
  for (let a = 90; a <= 270; a += 22.5) { const r = (a * Math.PI) / 180; u.push(P(ex + 1.7 * Math.cos(r), y + oy + 1.7 * Math.sin(r), zt)); }
  body += E.path(pathOf(u), shade(col, 0.72)) + E.stroke(pathOf(u.slice(1, -1), false), tint(col, 0.3), 0.35, 0.8);
  body += E.stroke(line([[x + ox - w * 0.12, y + oy - d / 2 + 0.8, zt], [x + ox - w * 0.12, y + oy + d / 2 - 0.8, zt]]), shade(col, 0.82), 0.35, 0.7);
  return { d: x + y, svg: body, box: bounds(body) };
}

export function pallet(x, y, o = {}) {
  const z = o.z ?? 0, axis = o.axis ?? 'x', L = o.len ?? 22, Wd = o.wid ?? 18;
  const along = axis === 'x';
  const at = (a, b) => (along ? [x + a, y + b] : [x + b, y + a]);
  const dims = (la, lb) => (along ? [la, lb] : [lb, la]);
  const wood = { lit: '#e2b47e', dark: '#c79560', top: '#ebc595' };
  const runner = { lit: '#c99a63', dark: '#ab7d4c', top: '#d6a872' };
  let body = '';
  for (const b of [-Wd / 2 + 1.4, 0, Wd / 2 - 1.4]) { const [cx, cy] = at(0, b), [w, d] = dims(L, 2.8); body += flatBox(cx, cy, z, w, d, 2.6, runner); }
  const n = 5, bw = 3.2, gap = (L - n * bw) / (n - 1);
  for (let i = 0; i < n; i++) {
    const a = -L / 2 + bw / 2 + i * (bw + gap), [cx, cy] = at(a, 0), [w, d] = dims(bw, Wd);
    body += flatBox(cx, cy, z + 2.6, w, d, PALLET_H - 2.6, wood);
  }
  const parts = [];
  if (o.load === 'crates') {
    for (const [a, b] of [[-5.2, -4.4], [-5.2, 4.4], [5.2, -4.4], [5.2, 4.4]]) { const [cx, cy] = at(a, b); parts.push(crate(cx, cy, z + PALLET_H, { size: 8.6, h: 8 })); }
    parts.sort((p, q) => p.d - q.d);
    const [cx, cy] = at(-2, -2); parts.push(crate(cx, cy, z + PALLET_H + 8, { size: 8, h: 7 }));
  } else if (o.load === 'tshirts') {
    const sets = [['#2b2f45', '#f7f7fb', '#7c6bff'], ['#f7f7fb', '#7c6bff', '#f7f7fb'], ['#7c6bff', '#2b2f45', '#2b2f45'], ['#ef8aa0', '#0ea5e9', '#f7f7fb']];
    [[-5.4, -4.2], [-5.4, 4.2], [5.4, -4.2], [5.4, 4.2]].map(([a, b], i) => { const [cx, cy] = at(a, b); return foldedShirts(cx, cy, z + PALLET_H, { colors: sets[i] }); })
      .sort((p, q) => p.d - q.d).forEach((p) => parts.push(p));
  }
  body += parts.map((p) => p.svg).join('');
  const sh = castShadow(rrect(x, y, ...dims(L / 2, Wd / 2), 0.5, 1), z, o.load ? 12 : 4, 0.13);
  return item(x, y, sh, body);
}

export function pottedPlant(x, y, o = {}) {
  const z = o.z ?? 0, k = o.size ?? 1, pot = o.pot ?? 'round';
  const pc = o.potColor ?? '#f7f7fb';
  const potC = { lit: pc, dark: pc === '#f7f7fb' ? '#dfe2ee' : shade(pc, 0.86), top: tint(pc, 0.35) };
  let body = '', zt;
  if (pot === 'square') {
    const s = 8.4 * k; zt = z + 6.6 * k;
    body += softBox(x, y, z, s, s, 6.6 * k, { ...potC, r: 0.9 * k, c: 0.6 * k, n: 2 });
    body += E.path(pathOf(rrect(x, y, s / 2 - 1.1 * k, s / 2 - 1.1 * k, 0.6, 1).map(([a, b]) => P(a, b, zt))), '#7a5a40');
  } else {
    zt = z + 7.2 * k;
    body += softCyl(x, y, z, 3.0 * k, 6 * k, { lit: potC.lit, dark: potC.dark, r1: 3.8 * k, n: 14 });
    body += softCyl(x, y, z + 6 * k, 4.3 * k, 1.2 * k, { lit: potC.lit, dark: potC.dark, top: potC.top, n: 14 });
    const e = ellipse(x, y, zt, 3.3 * k); body += E.ellipse([+e.cx, +e.cy], +e.rx, +e.ry, '#7a5a40');
  }
  const lb = [[3.3, -3.0, 4.1, 'shade'], [-3.0, -3.4, 4.4], [0.2, -2.0, 4.2], [-0.4, -7.4, 4.3, '', [45, 135]], [2.2, -6.6, 3.2, 'shade']];
  body += canopy(P(x, y, zt), lb, k, { leaf: PAL.leaf, light: PAL.leafLight, dark: PAL.leafDark }, [[-3.4, -5.2, 1.8, 0.4], [-1.8, -9.4, 1.5, 0.4]]);
  return item(x, y, castShadow(circ(x, y, (pot === 'square' ? 4.6 : 4.0) * k, 8), z, 9 * k, 0.13), body);
}

export function lamp(x, y, o = {}) {
  const z = o.z ?? 0, h = o.h ?? 40;
  const met = { lit: PAL.nightLight, dark: PAL.nightDark }, cap = '#4b5ca5';
  const zl = z + h - 8.2; // bas de la lanterne
  let body = '';
  body += softCyl(x, y, z, 2.3, 1.6, { ...met, top: cap, n: 10 });
  body += softCyl(x, y, z + 1.6, 1.5, 1.6, { ...met, top: cap, r1: 1.1, n: 8 });
  body += softCyl(x, y, z + 3.2, 0.72, zl - z - 3.2, { ...met, n: 6 });
  body += softCyl(x, y, zl - 0.6, 1.0, 0.8, { ...met, top: cap, r1: 1.6, n: 8 });
  body += softCyl(x, y, zl + 0.2, 1.7, 0.6, { ...met, top: cap, n: 10 });
  body += softCyl(x, y, zl + 0.8, 1.9, 4.6, { lit: '#fff3c8', dark: '#f6cf6a', r1: 2.3, n: 10 });
  let posts = '';
  for (const [a, b] of [[1, 1], [-1, 1], [1, -1]]) {
    const q = Math.SQRT2, ux = a / q, uy = b / q;
    posts += line([[x + ux * 1.95, y + uy * 1.95, zl + 0.8], [x + ux * 2.35, y + uy * 2.35, zl + 5.4]]) + ' ';
  }
  body += E.stroke(posts.trim(), PAL.nightDark, 0.5);
  body += loft([{ z: zl + 5.4, pts: circ(x, y, 3.2, 12) }, { z: zl + 6.4, pts: circ(x, y, 2.6, 12) }, { z: zl + 7.6, pts: circ(x, y, 0.5, 12) }],
    { bands: [{ lit: '#46569c', dark: PAL.nightDark }, { lit: '#4f60aa', dark: '#2f3c74' }], top: '#5566b0' });
  body += E.circle(P(x, y, zl + 8.3), 0.75, '#4f60aa');
  const glow = E.circle(P(x, y, zl + 3.1), 6.8, '#ffe9a8', 0.16) + E.circle(P(x, y, zl + 3.1), 4.4, '#fff4cc', 0.22);
  const sh = softEllipse(P(x + 0.9, y - 0.9, z), 4.2, 2.1, 0.2) + castShadow(circ(x, y, 1.2, 6), z, 10, 0.07);
  return { d: x + y, svg: sh + body + glow, box: bounds(body) };
}

export function flowerBed(x, y, w, d, o = {}) {
  const z = o.z ?? 0, h = 3, t = 1.3;
  let seed = ((o.seed ?? 1) * 9301 + Math.round(Math.abs(x * 13 + y * 7))) % 2147483647 || 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };
  // bordure de pierre claire, terre, massif de feuillage arrondi
  let body = softBox(x, y, z, w, d, h, { lit: PAL.plinth, dark: PAL.plinthShade, top: '#f2f3f8', r: 1.4, c: 0.5, n: 2 });
  body += E.path(pathOf(rrect(x, y, w / 2 - t, d / 2 - t, 0.8, 1).map(([a, b]) => P(a, b, z + h))), '#8f6a48');
  const mw = w - 2 * t - 0.8, md = d - 2 * t - 0.8, mz = z + h - 0.6, mh = 4.2;
  body += softBox(x, y, mz, mw, md, mh, { lit: PAL.leaf, dark: shade(PAL.leaf, 0.84), top: tint(PAL.leaf, 0.2), r: 1.8, c: 1.6, n: 2 });
  // fleurs : sur le dessus et sur les deux faces visibles
  const cols = ['#ef8aa0', '#f6c95c', '#ffffff', '#8a7cff', '#e06f88'];
  const spots = [];
  const nx = Math.max(2, Math.round(mw / 3.4)), ny = Math.max(2, Math.round(md / 3.4));
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (rnd() < 0.22) continue;
    spots.push(P(x - mw / 2 + 1.6 + ((i + 0.2 + rnd() * 0.6) * (mw - 3.2)) / nx, y - md / 2 + 1.6 + ((j + 0.2 + rnd() * 0.6) * (md - 3.2)) / ny, mz + mh));
  }
  for (let i = 0; i < Math.round(mw / 4); i++) spots.push(P(x - mw / 2 + 2 + ((i + rnd()) * (mw - 4)) / Math.round(mw / 4), y + md / 2, mz + mh * (0.35 + rnd() * 0.35)));
  for (let j = 0; j < Math.round(md / 4); j++) spots.push(P(x + mw / 2, y - md / 2 + 2 + ((j + rnd()) * (md - 4)) / Math.round(md / 4), mz + mh * (0.35 + rnd() * 0.35)));
  spots.sort((a, b) => a[1] - b[1]);
  for (const p of spots) {
    const fc = cols[Math.floor(rnd() * cols.length)];
    body += E.circle(p, 1.1, fc) + E.circle([p[0] - 0.2, p[1] - 0.2], 0.42, fc === '#ffffff' ? '#f6c95c' : '#fff6dc');
  }
  return item(x, y, castShadow(rrect(x, y, w / 2, d / 2, 1.4, 1), z, 5, 0.1), body);
}

/* ───────────────────────── camionnette ───────────────────────── */

/** Arrondit les sommets d'un polygone 2D (quadratiques échantillonnées). */
function roundPoly(pts, r, n = 3) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length], p = pts[i], b = pts[(i + 1) % pts.length];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, da / 2, db / 2), p1 = lerp2(p, a, rr / da), p2 = lerp2(p, b, rr / db);
    for (let k = 0; k <= n; k++) { const t = k / n; out.push([(1 - t) ** 2 * p1[0] + 2 * (1 - t) * t * p[0] + t * t * p2[0], (1 - t) ** 2 * p1[1] + 2 * (1 - t) * t * p[1] + t * t * p2[1]]); }
  }
  return out;
}

export function van(x, y, o = {}) {
  const facing = o.facing ?? 'x';
  const F = facing === 'y' ? [0, 1] : [1, 0];
  const S = facing === 'y' ? [1, 0] : [0, 1]; // côté visible
  const L = 52, Wd = 22, sw = Wd / 2;
  const wpt = (u, s) => [x + u * F[0] + s * S[0], y + u * F[1] + s * S[1]];
  const Q = (u, s, h) => { const [a, b] = wpt(u, s); return P(a, b, h); };
  const dimsW = (lu, ls) => (facing === 'y' ? [ls, lu] : [lu, ls]);
  const sideLit = S[1] === 1, frontLit = F[1] === 1;
  const WH = { lit: '#f7f7fb', dark: '#dfe2ee', top: '#ffffff' };
  const sideC = (c) => (sideLit ? c : shade(c, 0.88)), frontC = (c) => (frontLit ? c : shade(c, 0.88));
  const onSide = (pts, s0 = sw) => pts.map(([u, h]) => Q(u, s0, h));
  let body = '';

  // Roues : disque dans le plan (F, z), essieu selon S.
  const R = 4.5, wheelsU = [-L / 2 + 9.5, L / 2 - 9.5];
  const disc = (u, s, r, n = 14) => { const pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI; pts.push(Q(u + r * Math.cos(t), s, R + r * Math.sin(t))); } return pts; };
  const wheel = (u, sIn, sOut, visible) => {
    let g = E.face(hull([...disc(u, sIn, R), ...disc(u, sOut, R)]), '#262a3d', 0.3);
    if (visible) {
      g += E.face(disc(u, sOut, R), '#33384f', 0) + E.face(disc(u, sOut + 0.05, R * 0.56, 12), '#c3c9d6', 0) + E.face(disc(u, sOut + 0.1, R * 0.3, 10), '#9aa2b4', 0);
      g += E.circle(Q(u - R * 0.18, sOut + 0.12, R + R * 0.18), R * 0.12, '#ffffff', 0.7);
    }
    return g;
  };
  for (const u of wheelsU) body += wheel(u, -sw + 0.6, -sw + 3.4, false);

  // Châssis
  { const [cx, cy] = wpt(-0.5, 0), [w, d] = dimsW(L - 4, Wd - 3); body += flatBox(cx, cy, 2.4, w, d, 4.4, { lit: '#40465f', dark: '#30354a', top: '#4a5070' }); }

  // Caisse
  const ub0 = -L / 2, ub1 = L / 2 - 17, zb0 = 6, zb1 = 34;
  { const [cx, cy] = wpt((ub0 + ub1) / 2, 0), [w, d] = dimsW(ub1 - ub0, Wd); body += softBox(cx, cy, zb0, w, d, zb1 - zb0, { ...WH, r: 1.6, c: 1.6, n: 2 }); }
  // Bande violette (+ filet clair) et pastille PEG sur le flanc visible
  body += E.face(onSide([[ub0 + 1.7, 7.4], [ub1 - 1.7, 7.4], [ub1 - 1.7, 10.6], [ub0 + 1.7, 10.6]]), sideC('#7c6bff'), 0.2);
  body += E.face(onSide([[ub0 + 1.7, 11.5], [ub1 - 1.7, 11.5], [ub1 - 1.7, 12.4], [ub0 + 1.7, 12.4]]), sideC('#a99cff'), 0.15);
  {
    const uc = (ub0 + ub1) / 2 - 1, hc = 22.5, pts = [];
    for (let i = 0; i < 20; i++) { const t = (i / 20) * 2 * Math.PI; pts.push([uc + 4.6 * Math.cos(t), hc + 4.6 * Math.sin(t)]); }
    body += E.face(onSide(pts), sideC('#7c6bff'), 0.2);
    const hi = pts.filter((_, i) => i >= 7 && i <= 13).map(([u, h]) => [uc + (u - uc) * 0.72, hc + (h - hc) * 0.72]);
    body += E.stroke(pathOf(onSide(hi), false), '#ffffff', 0.7, 0.55);
    let txt = ''; // trois « lignes de texte » discrètes à droite de la pastille
    for (const [hh, len] of [[24.6, 9], [22, 11], [19.4, 7]]) txt += pathOf(onSide([[uc + 7.2, hh], [uc + 7.2 + len, hh]]), false) + ' ';
    body += E.stroke(txt.trim(), sideC('#c9cde0'), 1.1);
  }

  // Cabine : profil (u, h) arrondi, extrudé selon S ; bandes voisines de même teinte fusionnées.
  const cs = sw - 0.5, u0 = ub1, u1 = L / 2;
  const prof = roundPoly([[u0, 6], [u1, 6], [u1, 15.6], [u1 - 5.2, 25.6], [u0, 25.6]], 1.6, 3);
  const strips = [];
  for (let i = 0; i < prof.length; i++) {
    const a = prof[i], b = prof[(i + 1) % prof.length];
    const du = b[0] - a[0], dh = b[1] - a[1], l = Math.hypot(du, dh);
    if (l < 1e-6) continue;
    const nu = dh / l, nh = -du / l;
    if (nu + nh <= 1e-3) continue;
    const lvl = Math.round(clamp(nh, 0, 1) * 4) / 4, last = strips[strips.length - 1];
    if (last && last.lvl === lvl && last.pts[last.pts.length - 1] === a) last.pts.push(b);
    else strips.push({ lvl, pts: [a, b] });
  }
  for (const st of strips) body += E.face([...st.pts.map(([u, h]) => Q(u, -cs, h)), ...st.pts.slice().reverse().map(([u, h]) => Q(u, cs, h))], mix(frontC(WH.lit), WH.top, st.lvl), 0.3);
  body += E.face(onSide(prof, cs), sideC(WH.lit), 0.3);
  // Vitres
  const win = [[u0 + 2.2, 16.4], [u1 - 1.5, 16.4], [u1 - 5.6, 24.0], [u0 + 2.2, 24.0]];
  body += E.face(onSide(roundPoly(win, 0.8, 2), cs), sideLit ? '#5f86d6' : '#4d69b3', 0.2);
  body += E.face(onSide([[u0 + 4.5, 16.6], [u0 + 7.5, 16.6], [u0 + 10.5, 23.8], [u0 + 7.5, 23.8]], cs + 0.02), '#ffffff', 0, 0.28);
  const ws = (t, s) => { const a = [u1 - 0.3, 16.2], b = [u1 - 4.7, 24.8]; return Q(a[0] + (b[0] - a[0]) * t, s, a[1] + (b[1] - a[1]) * t); };
  body += E.face([ws(0, -cs + 1.1), ws(0, cs - 1.1), ws(1, cs - 1.1), ws(1, -cs + 1.1)], '#3f5492', 0.2);
  body += E.face([ws(0.05, -cs + 6), ws(0.05, -cs + 9.5), ws(0.95, -cs + 4.8), ws(0.95, -cs + 1.3)], '#ffffff', 0, 0.22);
  // Portière, poignée
  body += E.stroke(pathOf(onSide([[u0 + 1.3, 7.6], [u0 + 1.3, 24.6]], cs + 0.02), false), sideC('#c9cde0'), 0.45);
  body += E.stroke(pathOf(onSide([[u0 + 3.0, 14.4], [u0 + 5.0, 14.4]], cs + 0.02), false), '#7d8499', 0.8);
  // Face avant : calandre, phares, pare-chocs
  const onFront = (pts, du = 0.02) => pts.map(([s, h]) => Q(u1 + du, s, h));
  body += E.face(onFront(roundPoly([[-cs + 5.4, 8.9], [cs - 5.4, 8.9], [cs - 5.4, 12.6], [-cs + 5.4, 12.6]], 0.7, 2)), '#3d4466', 0.2);
  body += E.stroke(pathOf(onFront([[-cs + 6.2, 10.1], [cs - 6.2, 10.1]]), false) + ' ' + pathOf(onFront([[-cs + 6.2, 11.4], [cs - 6.2, 11.4]]), false), '#5a6287', 0.4);
  for (const sgn of [-1, 1]) {
    const a = sgn > 0 ? [cs - 4.4, cs - 1.3] : [-cs + 1.3, -cs + 4.4];
    body += E.face(onFront(roundPoly([[a[0], 9.4], [a[1], 9.4], [a[1], 11.8], [a[0], 11.8]], 0.6, 2)), '#ffd27a', 0.2);
    body += E.circle(lerp2(Q(u1 + 0.05, a[0], 10.6), Q(u1 + 0.05, a[1], 10.6), 0.4), 0.55, '#ffffff', 0.8);
  }
  { const [cx, cy] = wpt(u1 + 0.1, 0), [w, d] = dimsW(1.6, Wd - 1.4); body += softBox(cx, cy, 4.6, w, d, 3.2, { lit: '#c3c9d6', dark: '#a3abbd', top: '#d6dbe5', r: 0.6, c: 0.4, n: 1 }); }
  // Liseré clair sur l'arête haute de la cabine (adoucit le volume)
  body += E.stroke(pathOf(onSide([[u0 + 0.3, 25.6], [u1 - 5.6, 25.6], [u1 - 0.4, 16.2], [u1, 14.8]], cs), false), '#ffffff', 0.8, 0.9);
  // Rétroviseur
  { const [cx, cy] = wpt(u1 - 3.2, cs + 1.5), [w, d] = dimsW(1.1, 2.2); body += flatBox(cx, cy, 16.6, w, d, 3.2, { lit: '#3d4466', dark: '#2b2f45', top: '#4b5375' }); }
  // Passages de roue + roues visibles
  for (const u of wheelsU) {
    const arch = []; for (let i = 0; i <= 8; i++) { const t = Math.PI * (i / 8); arch.push([u + (R + 1.1) * Math.cos(t), R + (R + 1.1) * Math.sin(t)]); }
    body += E.face(onSide(arch, (u > u0 ? cs : sw) + 0.03), '#3a3f55', 0.2);
    body += wheel(u, sw - 3.0, sw + 0.2, true);
  }
  const sh = castShadow(rrect(x, y, ...dimsW(L / 2, sw), 3, 1), 0, 12, 0.14) +
    E.path(pathOf(rrect(x, y, ...dimsW(L / 2 - 2, sw - 1.5), 2, 1).map(([a, b]) => P(a, b, 0))), SHADOW, 0.12);
  return item(x, y, sh, body);
}
