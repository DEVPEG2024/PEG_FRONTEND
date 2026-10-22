// Réponse du client aux fichiers d'un projet (section Fichiers, 22/10/2026) :
// il valide ou refuse (motif obligatoire) chaque fichier déposé par PEG ;
// après un refus, l'admin le remplace par une nouvelle version, que le client
// valide à son tour. Stocké sur le projet (`fileReviews`, JSON indexé par l'id
// numérique du fichier) ; côté serveur, `mergeCustomerFileReviews`
// (peg_strapi/src/services/write-rules.ts) n'accepte d'un client que ces
// réponses-là, sur les fichiers du projet.

export type FileReviewStatus = 'pending' | 'approved' | 'rejected';

export type FileReview = {
  status: FileReviewStatus;
  comment?: string | null;
  at?: string | null;
  /** nom du fichier refusé que celui-ci remplace (posé par l'admin) */
  replaces?: string | null;
  /** motif du refus de la version précédente */
  previousComment?: string | null;
};

export type FileReviews = Record<string, FileReview>;

/** JSON du projet → réponses ; `undefined` = backend sans le champ (fonction masquée). */
export const readFileReviews = (raw: unknown): FileReviews | undefined => {
  if (raw === undefined) return undefined;
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = null; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as FileReviews) : {};
};

/** Statut affiché d'un fichier : sans réponse = en attente du client. */
export const fileReviewStatus = (reviews: FileReviews | undefined, fileId: string | number): FileReviewStatus =>
  reviews?.[String(fileId)]?.status ?? 'pending';

/** Réponse du client (le serveur date et vérifie). */
export const withClientAnswer = (
  reviews: FileReviews,
  fileId: string | number,
  status: 'approved' | 'rejected',
  comment: string | null
): FileReviews => ({
  ...reviews,
  [String(fileId)]: {
    ...(reviews[String(fileId)] ?? {}),
    status,
    comment: status === 'rejected' ? (comment ?? '').trim() : null,
  },
});

/** Admin : la nouvelle version prend la place du fichier refusé, en attente du client. */
export const withReplacement = (
  reviews: FileReviews,
  oldId: string | number,
  newId: string | number,
  oldName: string,
  now: string
): FileReviews => {
  const { [String(oldId)]: previous, ...rest } = reviews;
  return {
    ...rest,
    [String(newId)]: {
      status: 'pending',
      at: now,
      replaces: oldName,
      previousComment: previous?.comment ?? null,
    },
  };
};

/** Liste des fichiers : la nouvelle version à la place de l'ancienne (même rang). */
export const replaceInList = <T extends { id: string | number }>(files: T[], oldId: string | number, next: T): T[] =>
  files.map((f) => (String(f.id) === String(oldId) ? next : f));
