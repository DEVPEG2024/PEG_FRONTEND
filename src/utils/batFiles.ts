/**
 * Formats acceptés pour un BAT (bon à tirer), partout où on en dépose : fiche
 * produit (admin) et projet. Demande du 25/09/2026 : plus seulement le PDF.
 * - PDF et images courantes : aperçu direct dans BatPreviewModal ;
 * - fichiers de travail (AI, PSD, EPS, ZIP) : lien pour les ouvrir.
 * Pas de SVG : il peut embarquer du script, ouvert tel quel depuis le stockage.
 * Le champ Strapi `product.batFile` accepte déjà fichiers et images.
 */
export const BAT_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'ai',
  'psd',
  'eps',
  'zip',
] as const;

/** Valeur de l'attribut `accept` des champs de fichier. */
export const BAT_ACCEPT = BAT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export const BAT_FORMATS_LABEL = 'PDF, JPG, PNG, WebP, AI, PSD, EPS ou ZIP';

/** Contrôle par extension : le type MIME des AI / PSD / EPS varie d'un système à l'autre. */
export const isAcceptedBatFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return (BAT_EXTENSIONS as readonly string[]).includes(ext);
};
