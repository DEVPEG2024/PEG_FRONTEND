/**
 * Référence vers l'image d'ORIGINE (sans logo) encodée dans le NOM du fichier
 * tamponné, au format : `visuel__pegorig-<id>-<documentId>.png`.
 *
 * Pourquoi le nom ? L'endpoint d'upload (`/upload-single`) ne transporte pas
 * de métadonnées (caption/alternativeText), mais conserve le nom du fichier.
 * L'image d'origine n'est jamais supprimée de la médiathèque Strapi quand on
 * enregistre une version tamponnée (le produit pointe simplement vers le
 * nouveau fichier) — on peut donc la retrouver par son documentId et la
 * remettre sur le produit, p.ex. pour personnaliser la même offre pour un
 * autre client.
 */

const MARKER_RE = /__pegorig-([A-Za-z0-9]+)-([A-Za-z0-9]+)(?=\.[^.]*$|$)/;

export type PegOrigRef = { id: string; documentId: string };

export function parsePegOrigRef(name?: string): PegOrigRef | null {
  if (!name) return null;
  const m = name.match(MARKER_RE);
  return m ? { id: m[1], documentId: m[2] } : null;
}

export function stripPegOrigMarker(name: string): string {
  return name.replace(MARKER_RE, '');
}

export function buildPegOrigName(
  originalName: string,
  ref: PegOrigRef
): string {
  const clean = stripPegOrigMarker(originalName);
  const dot = clean.lastIndexOf('.');
  const base = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot) : '';
  return `${base}__pegorig-${ref.id}-${ref.documentId}${ext}`;
}
