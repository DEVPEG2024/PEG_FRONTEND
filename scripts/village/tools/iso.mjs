// Village PEG — géométrie isométrique commune à TOUS les sprites.
// Ne pas modifier sans prévenir : la scène place chaque sprite en supposant
// exactement cette projection, cette taille de toile et ce point d'ancrage.
//
// Toile : 400 × 400 px. Ancre au sol (centre de la parcelle) : (200, 300).
// Monde : x vers le bas-droite, y vers le bas-gauche, z vers le haut.
// La parcelle complète est le carré monde [-86.6, 86.6]², soit le losange
// (50,300) (200,213.4) (350,300) (200,386.6) à l'écran.
//
// Faces visibles d'un volume : le dessus, la face +y (tournée vers le
// bas-gauche, ÉCLAIRÉE) et la face +x (tournée vers le bas-droite, OMBRÉE).

export const W = 400;
export const H = 400;
export const AX = 200;
export const AY = 300;
export const COS = Math.cos(Math.PI / 6); // 0.866
export const SIN = 0.5;
export const HALF = 86.6; // demi-côté monde de la parcelle

const r1 = (n) => (Math.round(n * 10) / 10).toString();

/** Projection monde → écran */
export const P = (x, y, z = 0) => [AX + (x - y) * COS, AY + (x + y) * SIN - z];

/** Chemin SVG fermé passant par des points monde [[x,y,z], …] */
export const poly = (pts) =>
  'M' + pts.map(([x, y, z]) => { const [a, b] = P(x, y, z); return r1(a) + ' ' + r1(b); }).join(' L') + ' Z';

/** Chemin ouvert (ligne brisée) passant par des points monde */
export const line = (pts) =>
  'M' + pts.map(([x, y, z]) => { const [a, b] = P(x, y, z); return r1(a) + ' ' + r1(b); }).join(' L');

/** Pavé : origine (x,y,z) = coin arrière, dimensions w (x) × d (y) × h (z) */
export const box = (x, y, z, w, d, h) => ({
  top: poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]),
  left: poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]),
  right: poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]),
});

/** Toit à deux pans, faîtage parallèle à x. Dessiner back, puis front, puis gable. */
export const gableX = (x, y, z, w, d, r) => ({
  back: poly([[x, y, z], [x + w, y, z], [x + w, y + d / 2, z + r], [x, y + d / 2, z + r]]),
  front: poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d / 2, z + r], [x, y + d / 2, z + r]]),
  gable: poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d / 2, z + r]]),
});

/** Toit à deux pans, faîtage parallèle à y. Dessiner back, puis front, puis gable. */
export const gableY = (x, y, z, w, d, r) => ({
  back: poly([[x, y, z], [x, y + d, z], [x + w / 2, y + d, z + r], [x + w / 2, y, z + r]]),
  front: poly([[x + w, y, z], [x + w, y + d, z], [x + w / 2, y + d, z + r], [x + w / 2, y, z + r]]),
  gable: poly([[x, y + d, z], [x + w, y + d, z], [x + w / 2, y + d, z + r]]),
});

/**
 * Toit à quatre pans. Faîtage le long du plus grand côté (ou pointe si carré).
 * Dessiner dans l'ordre : back, left, front, right.
 */
export const hip = (x, y, z, w, d, r) => {
  if (w >= d) {
    const i = d / 2;
    const a = [x + i, y + d / 2, z + r], b = [x + w - i, y + d / 2, z + r];
    return {
      back: poly([[x, y, z], [x + w, y, z], b, a]),
      left: poly([[x, y, z], [x, y + d, z], a]),
      front: poly([[x, y + d, z], [x + w, y + d, z], b, a]),
      right: poly([[x + w, y, z], [x + w, y + d, z], b]),
    };
  }
  const i = w / 2;
  const a = [x + w / 2, y + i, z + r], b = [x + w / 2, y + d - i, z + r];
  return {
    back: poly([[x, y, z], [x + w, y, z], a]),
    left: poly([[x, y, z], [x, y + d, z], b, a]),
    front: poly([[x, y + d, z], [x + w, y + d, z], b]),
    right: poly([[x + w, y, z], [x + w, y + d, z], b, a]),
  };
};

/** Quadrilatère posé sur un plan y = constante (face éclairée, +y) */
export const onLeft = (y, x0, x1, z0, z1) => poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);
/** Quadrilatère posé sur un plan x = constante (face ombrée, +x) */
export const onRight = (x, y0, y1, z0, z1) => poly([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]);
/** Quadrilatère horizontal à la hauteur z */
export const onTop = (z, x0, y0, x1, y1) => poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);

/** Cercle horizontal (rayon monde r) projeté : ellipse alignée à l'écran */
export const ellipse = (cx, cy, z, r) => {
  const [a, b] = P(cx, cy, z);
  return { cx: r1(a), cy: r1(b), rx: r1(r * Math.SQRT2 * COS), ry: r1(r * Math.SQRT2 * SIN) };
};

/** Cylindre vertical : { side: chemin du flanc, top: ellipse du dessus } */
export const cylinder = (cx, cy, z, r, h) => {
  const [a, b] = P(cx, cy, z);
  const rx = r * Math.SQRT2 * COS, ry = r * Math.SQRT2 * SIN;
  const yb = b, yt = b - h;
  const side = `M${r1(a - rx)} ${r1(yt)} L${r1(a - rx)} ${r1(yb)} A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(a + rx)} ${r1(yb)} L${r1(a + rx)} ${r1(yt)} Z`;
  return { side, top: { cx: r1(a), cy: r1(yt), rx: r1(rx), ry: r1(ry) } };
};

/** Couleurs */
const hx = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (h, k) => toHex(hx(h).map((v) => v * k));
export const tint = (h, k) => toHex(hx(h).map((v) => v + (255 - v) * k));
export const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

/** Ombre de contact douce (dégradé radial) — renvoie { defs, el } */
export const contactShadow = (id, rx = 150, ry = 70, cx = AX, cy = AY + 6, opacity = 0.2) => ({
  defs: `<radialGradient id="${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5a4a3a" stop-opacity="${opacity}"/><stop offset="1" stop-color="#5a4a3a" stop-opacity="0"/></radialGradient>`,
  el: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`,
});

/**
 * Ordre du peintre : chaque élément porte une profondeur d = x + y de sa base
 * (centre au sol, coordonnées monde). Les plus petits d sont dessinés d'abord.
 *   compose([{ d: 10, svg: '<path …/>' }, { d: -40, svg: '…' }])
 */
export const compose = (items) => [...items].sort((a, b) => a.d - b.d).map((i) => i.svg).join('');

/** Document SVG final (aucun <style>, aucun script, aucune image externe) */
export const svgDoc = ({ title = '', defs = '', body = '' }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  (title ? `<title>${title}</title>` : '') +
  (defs ? `<defs>${defs}</defs>` : '') +
  body +
  `</svg>\n`;
