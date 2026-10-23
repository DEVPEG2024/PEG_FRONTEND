/*
 * Copier les offres d'un client vers un autre (demande du 23/10/2026 : partir
 * des offres d'ESDL DOUVAINE pour un nouveau club de foot).
 *
 * Trois étapes : choisir les offres, renommer (« ESDL » → nom du nouveau club),
 * changer les photos puis publier. Les copies naissent CACHÉES (inactives) :
 * le nouveau client ne les voit qu'après « Publier ».
 */
import { Product } from '@/@types/product';
import type { ProductBadge } from '@/utils/productBadges';
import {
  buildDuplicateProductInput,
  DuplicateProductInput,
} from '../store/productDuplicate';

const WORD = '[\\p{L}\\p{N}]';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wordRegExp = (token: string, flags: string) =>
  new RegExp(`(?<!${WORD})${escapeRegExp(token.trim())}(?!${WORD})`, flags);

/** Le mot du nom du client qui revient le plus dans ses offres (« ESDL »). */
export function suggestNameToken(
  clientName: string,
  offerNames: string[]
): string {
  const words = (clientName.match(/[\p{L}\p{N}&'’-]+/gu) ?? []).filter(
    (w) => w.length >= 2
  );
  let best = '';
  let bestCount = 0;
  for (const word of words) {
    const re = wordRegExp(word, 'iu');
    const count = offerNames.filter((n) => re.test(n)).length;
    if (count > bestCount) {
      best = word;
      bestCount = count;
    }
  }
  return best;
}

/** Remplace le mot entier `token` (sans tenir compte de la casse). */
export function replaceToken(
  name: string,
  token: string,
  replacement: string
): string {
  if (!token.trim()) return name;
  return name.replace(wordRegExp(token, 'giu'), replacement.trim());
}

export const countTokenMatches = (names: string[], token: string): number =>
  token.trim()
    ? names.filter((n) => wordRegExp(token, 'iu').test(n)).length
    : 0;

/**
 * Copie d'une offre pour un autre client : mêmes réglages que « Dupliquer »,
 * mais réservée au seul nouveau client, hors catalogue public et cachée.
 */
export function buildOfferCopyInput(
  product: Product,
  imageIds: string[],
  { name, customerDocumentId, badges }: { name: string; customerDocumentId: string; badges?: ProductBadge[] | null }
): DuplicateProductInput {
  return {
    ...buildDuplicateProductInput(product, imageIds, badges),
    name: name.trim() || product.name,
    customers: [customerDocumentId],
    customerCategories: [],
    inCatalogue: false,
    active: false,
  };
}

// ─── État des photos ─────────────────────────────────────────────────────────
// Une copie partage d'abord les fichiers de l'offre d'origine : une photo dont
// le fichier est encore celui du client d'origine porte son logo (« à changer »).
// Une photo remplacée ou tamponnée est un NOUVEAU fichier (« changée »).

export type PhotoStatus = 'todo' | 'done' | 'kept' | 'unknown';

export function photoStatus(
  imageDocumentId: string,
  sourceImageIds: Set<string> | null,
  kept: Set<string>,
  productDocumentId: string
): PhotoStatus {
  if (kept.has(keptKey(productDocumentId, imageDocumentId))) return 'kept';
  if (!sourceImageIds) return 'unknown';
  return sourceImageIds.has(imageDocumentId) ? 'todo' : 'done';
}

export const offerIsReady = (statuses: PhotoStatus[]): boolean =>
  statuses.every((s) => s !== 'todo');

export const keptKey = (productDocumentId: string, imageDocumentId: string) =>
  `${productDocumentId}:${imageDocumentId}`;

// ─── Mémoire de la copie (cet appareil) ──────────────────────────────────────
// Pour reprendre l'étape Photos plus tard : QUELLES offres cachées sont des
// copies à publier, de quel client elles viennent, et quelles photos l'admin
// a choisi de garder. Les autres offres inactives d'un client ont pu être
// désactivées exprès (GROPPI, NICOMATIC) : jamais montrées ni publiées ici.
// Sur un autre appareil, les copies restent dans Produits (« Inactif »).

const STORAGE_KEY = 'peg_offer_copy_v1';

type CopyMemory = Record<
  string,
  { from: string; kept: string[]; copies: string[] }
>;

const readMemory = (): CopyMemory => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeMemory = (memory: CopyMemory) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* stockage indisponible : l'étape Photos fonctionne sans */
  }
};

export function rememberCopy(
  targetDocumentId: string,
  sourceDocumentId: string,
  copyDocumentIds: string[]
) {
  const memory = readMemory();
  const previous = memory[targetDocumentId];
  memory[targetDocumentId] = {
    from: sourceDocumentId,
    kept: previous?.kept ?? [],
    copies: [...new Set([...(previous?.copies ?? []), ...copyDocumentIds])],
  };
  writeMemory(memory);
}

export const copySourceOf = (targetDocumentId: string): string | null =>
  readMemory()[targetDocumentId]?.from || null;

export const copiesOf = (targetDocumentId: string): Set<string> =>
  new Set(readMemory()[targetDocumentId]?.copies ?? []);

/** Copies encore cachées, par client : `hidden` = offres inactives de chaque client. */
export function pendingCopyCounts(
  hidden: { documentId: string; customers?: { documentId: string }[] | null }[]
): Record<string, number> {
  const memory = readMemory();
  const counts: Record<string, number> = {};
  for (const product of hidden) {
    for (const c of product.customers ?? []) {
      if (memory[c.documentId]?.copies?.includes(product.documentId)) {
        counts[c.documentId] = (counts[c.documentId] ?? 0) + 1;
      }
    }
  }
  return counts;
}

export const keptPhotosOf = (targetDocumentId: string): Set<string> =>
  new Set(readMemory()[targetDocumentId]?.kept ?? []);

export function setPhotoKept(
  targetDocumentId: string,
  key: string,
  kept: boolean
) {
  const memory = readMemory();
  const entry = memory[targetDocumentId] ?? { from: '', kept: [], copies: [] };
  const set = new Set(entry.kept);
  if (kept) set.add(key);
  else set.delete(key);
  memory[targetDocumentId] = { ...entry, kept: [...set] };
  writeMemory(memory);
}

export const forgetCopy = (targetDocumentId: string) => {
  const memory = readMemory();
  delete memory[targetDocumentId];
  writeMemory(memory);
};
