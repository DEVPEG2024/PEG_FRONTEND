// Village PEG — « Calendrier » : la tour de l'horloge, élancée, au milieu d'une petite place.
// Fût blanc à pilastres, grande page de calendrier en façade éclairée (en-tête rouge, anneaux, grille,
// deux jours colorés), porte cintrée, cadran blanc aux aiguilles bleu nuit sur les deux faces visibles,
// toit pointu en ardoise (rangs d'ardoises, liserés), épi doré. Cyprès, arbre rond, banc, lampadaire.
//   node buildings/calendrier.build.mjs && node tools/lint.mjs buildings/calendrier.svg
import { writeFileSync } from 'node:fs';
import { P, poly, line, box, hip, compose, contactShadow, svgDoc, shade, tint } from '../tools/iso.mjs';
import { person, treeRound, treeCone, bush, bench, lamp, bounds } from '../tools/props.mjs';

const ID = 'calendrier', TITLE = 'Calendrier';
const r1 = (n) => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };

/* ───────────── petits outils ───────────── */
const defs = [];
const seen = new Set();
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
const onY = (Y) => (pts) => poly(pts.map(([u, z]) => [u, Y, z])); // façade +y (éclairée), u = x
const onX = (X) => (pts) => poly(pts.map(([u, z]) => [X, u, z])); // façade +x (ombrée), u = y
const lnY = (Y) => (pts) => line(pts.map(([u, z]) => [u, Y, z]));
const lnX = (X) => (pts) => line(pts.map(([u, z]) => [X, u, z]));
const R = (u0, u1, z0, z1) => [[u0, z0], [u1, z0], [u1, z1], [u0, z1]];
const cube = (x, y, z, w, d, h, c) => { const b = box(x, y, z, w, d, h); return F(b.right, c.dark) + F(b.left, c.lit) + F(b.top, c.top); };
/** Cercle (ou arc) dans un plan de façade : points (u, z). */
const circ = (cu, cz, r, n = 28, a0 = 0, a1 = 2 * Math.PI) => {
  const pts = [];
  for (let i = 0; i < n; i++) { const t = a0 + ((a1 - a0) * i) / (a1 - a0 === 2 * Math.PI ? n : n - 1); pts.push([cu + r * Math.cos(t), cz + r * Math.sin(t)]); }
  return pts;
};
/** Ouverture cintrée (rectangle surmonté d'un demi-cercle), sens trigonométrique dans le plan (u, z). */
const arch = (u0, u1, z0, z1) => {
  const r = (u1 - u0) / 2, c = (u0 + u1) / 2, zs = z1 - r;
  return [[u0, z0], [u1, z0], [u1, zs], ...circ(c, zs, r, 11, 0, Math.PI).slice(1, -1), [u0, zs]];
};
/** Intersection d'un polygone (u, z) avec un polygone CONVEXE orienté dans le sens trigonométrique. */
const convexClip = (subject, clipper) => {
  let out = subject;
  for (let i = 0; i < clipper.length && out.length > 2; i++) {
    const a = clipper[i], b = clipper[(i + 1) % clipper.length];
    const side = (q) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    const src = out; out = [];
    for (let j = 0; j < src.length; j++) {
      const p = src[j], q = src[(j + 1) % src.length], sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const k = sp / (sp - sq); out.push([p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]); }
    }
  }
  return out;
};

/* ───────────── matières ───────────── */
const NAVY = '#2e3a6e';
const SLATE = '#8b93a8', SLATE_D = '#727a90';
const WALL_L = lin('wall-l', [[0, '#ffffff'], [1, '#f0f1f7']]);
const WALL_R = lin('wall-r', [[0, '#e8eaf3'], [1, '#d8dbe9']]);
const GL_L = lin('glass-l', [[0, '#b6d6ff'], [1, '#6f9ef5']]);
const GL_R = lin('glass-r', [[0, '#88b0f0'], [1, '#5579c6']]);
const EAVE = lin('eave', [[0, NAVY, 0.16], [1, NAVY, 0]]);
const STONE = { lit: '#e3e5ef', dark: '#cfd3e2', top: '#f4f5fa' };
const BAND = { lit: '#eef0f6', dark: '#d3d7e5', top: '#ffffff' };

/* ───────────── géométrie ───────────── */
const X0 = -25, X1 = 17, Y0 = -31, Y1 = 11;   // fût 42 × 42
const ZP = 2.5;                               // dessus de la place
const ZB = 12;                                // haut du socle
const ZS = 116;                               // haut du fût
const ZC0 = 120, ZC1 = 150;                   // étage de l'horloge
const PIL = 3.2;                              // pilastres d'angle
const SX0 = -60, SX1 = 58, SY0 = -66, SY1 = 52; // place pavée

const L = onY(Y1), Rt = onX(X1);
let tw = '';

/* socle de pierre */
tw += cube(X0 - 4, Y0 - 4, ZP, X1 - X0 + 8, Y1 - Y0 + 8, ZB - ZP, STONE);
tw += S(line([[X0 - 4, Y1 + 4, ZB], [X1 + 4, Y1 + 4, ZB], [X1 + 4, Y0 - 4, ZB]]), '#ffffff', 0.9);

/* fût, jusqu'à la corniche basse seulement. L'étage de l'horloge est monté APRÈS cette corniche : dessiné
   avant, il était repeint par le dessus de la corniche (losange blanc qui effaçait sa face ombrée). */
tw += F(L(R(X0, X1, ZB, ZS)), WALL_L) + F(Rt(R(Y0, Y1, ZB, ZS)), WALL_R);

/* façade +y : porte cintrée, page de calendrier */
{
  // porte : encadrement de pierre, battants bleu nuit, imposte vitrée
  tw += F(L(arch(-12.5, 4.5, ZB - 0.2, 44)), '#e3e5ef');
  tw += F(L(arch(-10.5, 2.5, ZB, 42)), '#d3d7e6');
  tw += F(L(arch(-9.2, 2.5, ZB + 1.3, 42)), lin('door', [[0, '#3f4f93'], [1, '#2a376b']]));
  tw += F(L(circ(-3.35, 35.85, 5.8, 13, 0, Math.PI).concat([[-9.15, 35.85]])), GL_L);
  tw += S(lnY(Y1)([[-3.35, ZB + 1.3], [-3.35, 35.4]]) + ' ' + lnY(Y1)([[-9.2, 35.6], [2.5, 35.6]]), '#24305c', 0.8);
  tw += S(lnY(Y1)([[-5.2, 22], [-5.2, 25]]) + ' ' + lnY(Y1)([[-1.5, 22], [-1.5, 25]]), '#f6c95c', 0.9);
}
const page = (() => {
  // cadre bleu nuit fixé au mur (épaisseur tb), page blanche posée dessus (épaisseur tp)
  const u0 = -20.4, u1 = 12.4, z0 = 53, z1 = 100, tb = 1.2, tp = 1.0, k = 1.9;
  const Yp = Y1 + tb + tp, M = onY(Yp);
  let s = '';
  s += F(L(R(u0 - k + 1.6, u1 + k + 1.8, z0 - k - 2.2, z1 + k - 1.4)), NAVY, 0.12);   // ombre portée sur le mur
  const fb = box(u0 - k, Y1, z0 - k, u1 - u0 + 2 * k, tb, z1 - z0 + 2 * k);
  s += F(fb.right, '#26315f') + F(fb.top, '#4b5ca5') + F(fb.left, lin('board', [[0, '#3f4f93'], [1, '#34427e']]));
  s += S(line([[u0 - k, Y1 + tb, z1 + k], [u1 + k, Y1 + tb, z1 + k], [u1 + k, Y1, z1 + k]]), '#6f7fc8', 0.7, 0.9);
  const pb = box(u0, Y1 + tb, z0, u1 - u0, tp, z1 - z0);
  s += F(pb.right, '#d9dce8') + F(pb.top, '#ffffff');
  s += F(M(R(u0, u1, z0, z1)), lin('page', [[0, '#ffffff'], [1, '#f1f2f8']]));
  // en-tête rouge + « mois » (barre blanche) + anneaux
  const zh = z1 - 13;
  s += F(M(R(u0, u1, zh, z1)), lin('head', [[0, '#f45c5c'], [0.45, '#ef4444'], [1, '#ef4444']]));
  s += F(M(R(u0, u1, zh - 0.7, zh)), '#c93030', 0.5);
  s += F(M(R(u0 + 8.2, u1 - 8.2, zh + 4.4, zh + 7.4)), '#ffffff', 0.95);
  for (const ur of [u0 + 7, u1 - 7]) {
    // anneau : boucle bleu nuit qui passe par-dessus le bord de la page
    s += S(onY(Yp + 0.3)([[ur - 1.1, z1 - 2.6], [ur + 1.1, z1 - 2.6], [ur + 1.1, z1 + 3.4], [ur - 1.1, z1 + 3.4]]), NAVY, 1.15);
    s += S(lnY(Yp + 0.35)([[ur - 1.1, z1 + 3.1], [ur - 1.1, z1 - 1.6]]), '#8f9bd6', 0.45, 0.9);
  }
  // grille des jours : 4 lignes × 5 colonnes, deux jours colorés
  const g0 = u0 + 2.6, g1 = u1 - 2.6, gz0 = z0 + 3.2, gz1 = zh - 2.6, nc = 5, nr = 4, gap = 1.2;
  const cw = (g1 - g0 - gap * (nc - 1)) / nc, ch = (gz1 - gz0 - gap * (nr - 1)) / nr;
  let cells = '';
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
    if (r === nr - 1 && c > 2) continue; // fin de mois
    const a = g0 + c * (cw + gap), b = gz1 - (r + 1) * ch - r * gap;
    const special = (r === 1 && c === 3) ? '#7c6bff' : (r === 2 && c === 1) ? '#f59e0b' : null;
    if (special) s += F(M(R(a, a + cw, b, b + ch)), special);
    else cells += M(R(a, a + cw, b, b + ch));
  }
  s += F(cells, '#dde0eb');
  // coin corné (bas droite) et liseré clair du bord
  const e = 4.6;
  s += F(onY(Y1 + tb)([[u1 - e, z0], [u1 + 0.2, z0 - 0.2], [u1, z0 + e]]), '#34427e');                 // coin replié : on voit le cadre
  s += F(M([[u1 - e, z0 + 0.4], [u1 - 0.4, z0 + e], [u1 - e + 0.2, z0 + e - 0.2]]), NAVY, 0.15);        // ombre du rabat
  s += F(M([[u1 - e, z0], [u1, z0 + e], [u1 - e, z0 + e]]), lin('fold', [[0, '#e9ebf3'], [1, '#d5d9e6']], [1, 0, 0, 1]));
  s += S(line([[u0, Yp, z1], [u1, Yp, z1], [u1, Y1 + tb, z1]]), '#ffffff', 0.8, 0.9);
  return s;
})();
/* pilastres d'angle (en saillie) : les deux du fond AVANT la page, qui est devant eux (plus grand x) ;
   dessiné après elle, le pilastre gauche mangeait la marge du cadre et le bord gauche de la page. */
const pil = (x, y, z0, z1) => cube(x, y, z0, PIL, PIL, z1 - z0, { lit: '#fbfbfe', dark: '#d6d9e7', top: '#ffffff' });
tw += pil(X0 - 1, Y1 - PIL + 1, ZB, ZS);         // angle gauche
tw += pil(X1 - PIL + 1, Y0 - 1, ZB, ZS);         // angle droit
tw += page;

/* façade +x : deux baies cintrées étroites. Vitrage en retrait de t (décalé de (+t, +t) dans le plan de
   façade) et découpé par l'ouverture : on voit l'embrasure qui suit le cintre et l'appui, comme en 3D. */
for (const [z0, z1] of [[48, 70], [80, 102]]) {
  const u0 = -14.6, u1 = -5.4, t = 1.6, uc = (u0 + u1) / 2, zs = z1 - (u1 - u0) / 2;
  const open = arch(u0, u1, z0, z1);
  const glass = convexClip(open.map(([u, z]) => [u + t, z + t]), open);
  tw += F(Rt(arch(u0 - 1.4, u1 + 1.4, z0 - 1.2, z1 + 1.4)), '#eceef5');          // chambranle
  tw += F(Rt(open), '#f2f3f8');                                                  // embrasure (face +y : éclairée)
  tw += F(Rt([[u0, z0], [u1, z0], [u1, z0 + t], [u0 + t, z0 + t]]), '#fbfbfe');  // appui
  tw += F(Rt(glass), GL_R);
  const cut = (pts) => { const c = convexClip(pts, glass); return c.length > 2 ? Rt(c) : ''; };
  tw += F(cut([[u0 + 4.6, z0], [u0 + 6.8, z0], [u0 + 2.6, z1], [u0 + 0.4, z1]]), '#ffffff', 0.3);
  // meneau jusqu'à l'imposte, traverse au départ du cintre (dans le plan du verre)
  tw += F(cut(R(uc + t - 0.4, uc + t + 0.4, z0, zs + t)) + cut(R(u0, u1 + t, zs + t - 0.4, zs + t + 0.4)), NAVY);
}

/* pilastre avant, devant la page et les baies */
tw += pil(X1 - PIL + 1, Y1 - PIL + 1, ZB, ZS);
// ombre sous la corniche basse, sur les murs et les pilastres
tw += F(L(R(X0, X1, ZS - 9, ZS)), EAVE) + F(Rt(R(Y0, Y1, ZS - 9, ZS)), EAVE);

/* corniches */
const cornice = (z, k, h) => cube(X0 - k, Y0 - k, z, X1 - X0 + 2 * k, Y1 - Y0 + 2 * k, h, BAND) +
  S(line([[X0 - k, Y1 + k, z + h], [X1 + k, Y1 + k, z + h], [X1 + k, Y0 - k, z + h]]), '#ffffff', 0.9);
tw += cornice(ZS, 2.6, 4);

/* étage de l'horloge, monté sur la corniche basse : murs, cadrans sur les deux faces, ombre de la corniche haute */
tw += F(L(R(X0, X1, ZC0, ZC1)), WALL_L) + F(Rt(R(Y0, Y1, ZC0, ZC1)), WALL_R);
const KH = 3.2;                               // saillie de la corniche haute : elle cache les KH unités sous elle
const DZ = (ZC0 + ZC1 - KH) / 2;              // centre de la bande réellement visible de l'étage
const dial = (map, mapL, cu, cz, lit) => {
  let s = '';
  const R0 = 11.2, R1 = 9.8;                  // tient dans la bande visible (ZC0 → ZC1 − KH) avec une marge
  s += F(map(circ(cu, cz, R0 + 1.1, 32)), lit ? '#e3e5ef' : '#cfd3e2');
  s += F(map(circ(cu, cz, R0, 32)), lit ? NAVY : '#26315f');
  s += F(map(circ(cu, cz, R1, 32)), lit ? lin('dial-l', [[0, '#ffffff'], [1, '#eef1f8']]) : lin('dial-r', [[0, '#eef0f7'], [1, '#dde1ec']]));
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI, k = R1 * (i % 3 === 0 ? 0.7 : 0.8);
    ticks += mapL([[cu + Math.cos(a) * k, cz + Math.sin(a) * k], [cu + Math.cos(a) * R1 * 0.89, cz + Math.sin(a) * R1 * 0.89]]) + ' ';
  }
  s += S(ticks.trim(), lit ? '#9aa2b4' : '#8e96aa', 0.9);
  // 10 h 10 : petite aiguille vers 10 h, grande vers 2 h (u croissant = vers la droite à l'écran sur +y, vers la gauche sur +x)
  const sgn = lit ? 1 : -1;
  const hand = (deg, len) => { const a = (deg * Math.PI) / 180; return [cu + sgn * Math.sin(a) * len, cz + Math.cos(a) * len]; };
  s += S(mapL([[cu, cz], hand(-60, R1 * 0.54)]), NAVY, 1.9) + S(mapL([[cu, cz], hand(60, R1 * 0.78)]), NAVY, 1.25);
  s += F(map(circ(cu, cz, 1.25, 10)), '#ef4444');
  // reflet sur le verre du cadran
  s += F(map([...circ(cu, cz, R1 - 0.9, 9, Math.PI * 0.55, Math.PI * 0.95), ...circ(cu, cz, R1 - 2.9, 9, Math.PI * 0.95, Math.PI * 0.55)]), '#ffffff', 0.55);
  return s;
};
tw += dial(onY(Y1 + 0.3), lnY(Y1 + 0.3), (X0 + X1) / 2, DZ, true);
tw += dial(onX(X1 + 0.3), lnX(X1 + 0.3), (Y0 + Y1) / 2, DZ, false);
tw += F(L(R(X0, X1, ZC1 - 8, ZC1)), EAVE) + F(Rt(R(Y0, Y1, ZC1 - 8, ZC1)), EAVE);
tw += S(line([[X1, Y1, ZC0], [X1, Y1, ZC1]]), '#ffffff', 0.9, 0.8);
tw += cornice(ZC1, KH, 4);

/* toit pointu en ardoise */
let roof = '';
{
  const k = 4.6, x0 = X0 - k, y0 = Y0 - k, w = X1 - X0 + 2 * k, zr = ZC1 + 4, rise = 54;
  const eb = box(x0, y0, zr, w, w, 1.6);
  roof += F(eb.right, shade(SLATE_D, 0.92)) + F(eb.left, SLATE_D);
  const zt = zr + 1.6, h = hip(x0, y0, zt, w, w, rise);
  roof += F(h.back, shade(SLATE, 0.75)) + F(h.left, shade(SLATE, 0.78)) + F(h.front, lin('slate-f', [[0, '#9aa1b4'], [1, SLATE]])) + F(h.right, lin('slate-r', [[0, '#7c8499'], [1, SLATE_D]]));
  const apex = [x0 + w / 2, y0 + w / 2, zt + rise];
  // rangs d'ardoises : horizontales sur les deux pans visibles
  let rows = '';
  for (let i = 1; i < 9; i++) {
    const f = i / 9, z = zt + rise * f, inset = (w / 2) * f;
    rows += line([[x0 + inset, y0 + w - inset, z], [x0 + w - inset, y0 + w - inset, z], [x0 + w - inset, y0 + inset, z]]) + ' ';
  }
  roof += S(rows.trim(), '#6b7389', 0.6, 0.45);
  roof += S(line([[x0, y0 + w, zt], [x0 + w, y0 + w, zt], [x0 + w, y0, zt]]), tint(SLATE, 0.45), 1.2, 0.95);
  roof += S(line([[x0 + w, y0 + w, zt], apex]), tint(SLATE, 0.4), 1.1, 0.95);
  roof += S(line([[x0, y0 + w, zt], apex, [x0 + w, y0, zt]]), tint(SLATE, 0.3), 0.8, 0.8);
  // lucarne ronde (œil-de-bœuf) sur le pan avant
  const lz = zt + rise * 0.3, lu = x0 + w / 2, ly = y0 + w - (w / 2) * 0.3;
  const ring = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * 2 * Math.PI; ring.push([lu + Math.cos(a) * 4.2, ly + 0.1, lz + 1.5 + Math.sin(a) * 4.2]); }
  roof += F(poly(ring.map(([u, y, z]) => [u, y + 0.6, z])), '#f4f5fa') + F(poly(ring.map(([u, y, z]) => [lu + (u - lu) * 0.7, y + 0.8, lz + 1.5 + (z - lz - 1.5) * 0.7])), GL_L);
  // épi : boule dorée + pointe
  const [ax, ay] = P(...apex);
  roof += S(`M${r1(ax)} ${r1(ay)} L${r1(ax)} ${r1(ay - 15)}`, NAVY, 1.2);
  roof += `<circle cx="${r1(ax)}" cy="${r1(ay - 6.5)}" r="3.1" fill="#f6c95c"/><circle cx="${r1(ax - 0.9)}" cy="${r1(ay - 7.4)}" r="1.1" fill="#fff6d6"/>`;
}

/* place pavée */
let ground = '';
{
  const sl = box(SX0, SY0, 0, SX1 - SX0, SY1 - SY0, ZP);
  ground += F(sl.right, '#d3d6e3') + F(sl.left, '#e5e7f0') + F(sl.top, lin('place', [[0, '#f7f7fa'], [1, '#f0f1f6']]));
  ground += S(line([[SX0, SY1, ZP], [SX1, SY1, ZP], [SX1, SY0, ZP]]), '#ffffff', 1);
  // pavage en anneaux autour de la tour
  let j = '';
  for (const k of [12, 24, 36]) j += line([[X0 - 4 - k, Y1 + 4 + k, ZP], [X1 + 4 + k, Y1 + 4 + k, ZP], [X1 + 4 + k, Y0 - 4 - k, ZP]]) + ' ';
  ground += S(j.trim(), '#e1e3eb', 0.6);
  // allée vers la porte
  ground += F(poly([[-11, Y1 + 4, ZP], [3, Y1 + 4, ZP], [3, SY1, ZP], [-11, SY1, ZP]]), '#e9ebf2');
  // ombre douce de la tour (vers la droite de l'écran)
  for (const [kk, o] of [[34, 0.04], [22, 0.05], [11, 0.06]]) {
    ground += F(poly([[X1 + 4, Y1 + 4, ZP], [X1 + 4 + kk, Y1 + 4 - kk, ZP], [X1 + 4 + kk, Y0 - 4 - kk, ZP], [X0 - 4 + kk, Y0 - 4 - kk, ZP], [X0 - 4, Y0 - 4, ZP], [X1 + 4, Y0 - 4, ZP]]), '#5a4a3a', o);
  }
}

/* perron : trois marches de la place jusqu'au palier du socle (seuil de la porte) */
let steps = '';
{
  const n = 3, sd = 2.8, ri = (ZB - ZP) / n, x0 = -12.5, w = 17;
  for (let i = 0; i < n; i++) { // de la plus haute (contre le socle) à la plus basse (devant)
    const y0 = Y1 + 4 + i * sd, h = ZB - ZP - i * ri;
    steps += cube(x0, y0, ZP, w, sd, h, STONE);
    steps += S(line([[x0, y0 + sd, ZP + h], [x0 + w, y0 + sd, ZP + h], [x0 + w, y0, ZP + h]]), '#ffffff', 0.7, 0.9);
  }
}

/* composition */
const items = [
  { d: -1000, svg: ground },
  // arbres et passant sont posés sur la place : ils partent de z = ZP, pas du sol de la parcelle
  treeRound(42, -52, { size: 1, z: ZP }),
  { d: (X0 + X1) / 2 + (Y0 + Y1) / 2, svg: tw + roof },
  { d: 14, svg: steps },
  treeCone(-48, 22, { size: 0.95, z: ZP }),
  bush(-30, 38, { w: 12, d: 10, h: 9, z: ZP }),
  person(-4, 44, { facing: 'back-right', pose: 'walk', top: '#0ea5e9', z: ZP }),
  bench(32, 31, { axis: 'x', z: ZP, len: 18, back: true, sitters: [{ at: 2.5, top: '#f59e0b', hairStyle: 'long', hair: '#6b4a2f' }] }),
  lamp(49, 8, { z: ZP }),
];
const cs = contactShadow(`${ID}-cs`, 132, 58, 200, 304, 0.18);
defs.push(cs.defs);
const body = cs.el + compose(items);
const svg = svgDoc({ title: TITLE, defs: defs.join(''), body });
writeFileSync(new URL(`./${ID}.svg`, import.meta.url), svg);

// manifeste : labelY = pointe du toit (épi exclu), hit = tour + socle
const roofBox = bounds(roof.replace(/<circle[^>]*>/g, '').replace(/<path d="M[\d.]+ [\d.]+ L[\d.]+ [\d.]+" fill="none" stroke="#2e3a6e" stroke-width="1.2"[^>]*\/>/, ''));
const towerBox = bounds(roof.replace(/<circle[^>]*>/g, '') + F(box(X0 - 4, Y0 - 4, 0, X1 - X0 + 8, Y1 - Y0 + 8, ZC1).left, '#000') + F(box(X0 - 4, Y0 - 4, 0, X1 - X0 + 8, Y1 - Y0 + 8, ZC1).right, '#000'));
const hit = { x: Math.floor(towerBox.x - 3), y: Math.floor(roofBox.y - 3), w: Math.ceil(towerBox.w + 6), h: Math.ceil(towerBox.y + towerBox.h - roofBox.y + 6) };
const man = { id: ID, title: TITLE, labelY: Math.round(roofBox.y), hit };
writeFileSync(new URL(`./${ID}.json`, import.meta.url), JSON.stringify(man, null, 2) + '\n');
console.log(`ok buildings/${ID}.svg`, svg.length, 'o', JSON.stringify(man));
