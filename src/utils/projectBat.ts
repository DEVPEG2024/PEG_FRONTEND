// BAT (bon à tirer) d'un projet — règle unique pour l'onglet BAT, l'écran BAT,
// la colonne de détail du projet et l'accueil client. Deux sources :
//
// - « product » : projet issu d'une COMMANDE dont le produit exige un BAT
//   (`product.requiresBat`). Fichier = `product.batFile`, statut =
//   `orderItem.batStatus`. Une offre dont le client a approuvé le BAT sur la
//   fiche avant l'ajout au panier arrive donc déjà « approved ».
// - « project » : tout autre projet — créé par un devis, par l'admin, ou
//   commande d'un produit sans BAT. Fichier, statut et motif sont portés par le
//   projet (`project.batFile` / `batStatus` / `batComment`, ajout 22/10/2026).
//
// Rétro-compatibilité : tant que Strapi n'a pas ces champs, la requête qui les
// lit échoue seule et ils restent `undefined` (jamais `null`) → pas de source
// « project », l'onglet se comporte comme avant.

export type BatStatus = 'pending' | 'approved' | 'rejected';
export type BatSource = 'product' | 'project';

export type BatFileLike = {
  url?: string | null;
  name?: string | null;
  mime?: string | null;
};

/** Champs BAT portés par le projet (null = vides ; absents = backend sans BAT de projet). */
export type ProjectBatFields = {
  batFile?: BatFileLike | null;
  batStatus?: BatStatus | null;
  batComment?: string | null;
};

type ProjectLike = ProjectBatFields & {
  orderItem?: {
    batStatus?: BatStatus | null;
    batComment?: string | null;
    product?: { requiresBat?: boolean | null; batFile?: BatFileLike | null } | null;
  } | null;
};

export type ProjectBat = {
  source: BatSource;
  /** Fichier déposé, ou null tant qu'aucun BAT n'a été envoyé. */
  file: BatFileLike | null;
  /** Statut sans valeur → « pending » (BAT attendu ou en attente du client). */
  status: BatStatus;
  comment: string | null;
};

const withUrl = (file: BatFileLike | null | undefined): BatFileLike | null =>
  file?.url ? file : null;

export const getProjectBat = (project: ProjectLike | null | undefined): ProjectBat | null => {
  if (!project) return null;
  const orderItem = project.orderItem;
  if (orderItem?.product?.requiresBat) {
    return {
      source: 'product',
      file: withUrl(orderItem.product.batFile),
      status: orderItem.batStatus ?? 'pending',
      comment: orderItem.batComment ?? null,
    };
  }
  if (project.batStatus === undefined && project.batFile === undefined) return null;
  return {
    source: 'project',
    file: withUrl(project.batFile),
    status: project.batStatus ?? 'pending',
    comment: project.batComment ?? null,
  };
};

/**
 * Onglet BAT : l'admin l'a sur tout projet qui peut porter un BAT, pour en
 * déposer un ; client et producteur dès qu'un BAT existe (ou que le produit
 * commandé en exige un, comme avant).
 */
export const showsBatTab = (bat: ProjectBat | null, isAdmin: boolean): boolean =>
  !!bat && (isAdmin || bat.source === 'product' || !!bat.file);

/** BAT déposé qui attend la réponse du client. */
export const isBatAwaitingClient = (bat: ProjectBat | null): boolean =>
  !!bat?.file && bat.status === 'pending';

/** Libellé court du BAT pour la colonne de détail ; null quand il n'y a rien à dire. */
export const batSummaryLabel = (bat: ProjectBat | null): string | null => {
  if (!bat) return null;
  if (bat.status === 'approved') return 'Validé par le client';
  if (bat.status === 'rejected') return 'Refusé par le client';
  if (bat.file) return 'En attente de validation';
  return bat.source === 'product' ? 'En préparation' : null;
};
