import type { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { apiGetProductForShowById } from '@/services/ProductServices';
import { unwrapData } from '@/utils/serviceHelper';
import { isProductM2Pricing } from '@/utils/productHelpers';
import { DEFAULT_CHOICE } from '@/views/app/customer/products/show/SizeAndColorsChoice';

/**
 * Offre chiffrée par l'assistant, prête à passer au panier. Construite par le
 * serveur (peg_strapi chatbot.ts → `CartOffer`) à partir de preparer_offre :
 * produits visibles du client, taille/couleur vérifiées sur le produit. Le prix
 * n'est qu'indicatif — le checkout le recalcule côté serveur.
 */
export type ChatOfferLine = {
  productDocumentId: string;
  productName: string;
  quantity: number;
  width?: number;
  height?: number;
  sizeDocumentId?: string;
  sizeName?: string;
  colorDocumentId?: string;
  colorName?: string;
  totalHT: number;
};

export type ChatOffer = {
  id: string;
  lines: ChatOfferLine[];
  totalHT: number;
  totalTTC: number;
  /** Suivi local du bouton : ajoutée au panier, ou envoyée vers la fiche à compléter. */
  status?: 'added' | 'completing';
  /** Produits encore à finaliser sur leur fiche. */
  pendingIds?: string[];
  /** Lignes du panier existant au départ vers la fiche : une ligne NOUVELLE du même produit = finalisée. */
  cartIdsBefore?: string[];
};

/**
 * Pré-remplissage transmis à la fiche produit (state de navigation) quand une
 * ligne ne peut pas aller seule au panier : formulaire de personnalisation à
 * remplir, tailles à répartir ou dimensions manquantes.
 */
export type ChatPrefill = {
  offerId: string;
  quantity: number;
  /** Sélection complète (taille ET couleur résolues), sinon vide. */
  sizeAndColors: SizeAndColorSelection[];
  width?: number;
  height?: number;
  sizeName?: string;
  colorName?: string;
};

export type PlannedLine =
  | { kind: 'ready'; line: ChatOfferLine; product: Product; sizeAndColors: SizeAndColorSelection[] }
  | { kind: 'complete'; line: ChatOfferLine; product: Product; prefill: ChatPrefill; missing: string[] };

const DEFAULT_SIZE = DEFAULT_CHOICE as Size;
const DEFAULT_COLOR = DEFAULT_CHOICE as Color;

/**
 * Une dimension (taille ou couleur) est résolue si l'offre la précise, si le
 * produit n'en a pas (valeur DEFAULT, comme SizeAndColorsChoice) ou n'en a
 * qu'une seule. Sinon c'est au client de choisir sur la fiche.
 */
const resolveOption = <T extends { documentId: string }>(options: T[] | undefined, wantedId: string | undefined, fallback: T): T | null => {
  const list = options ?? [];
  if (wantedId) return list.find((o) => o.documentId === wantedId) ?? null;
  if (list.length === 0) return fallback;
  if (list.length === 1) return list[0];
  return null;
};

/** Sélection tailles/couleurs d'une ligne, identique à celle que produirait la fiche produit. */
export const selectionForLine = (product: Product, line: ChatOfferLine): SizeAndColorSelection[] | null => {
  if (isProductM2Pricing(product)) {
    if (!(Number(line.width) > 0 && Number(line.height) > 0)) return null;
    // Même forme que ShowProduct.handleAddToCart pour le m² (dimensions en mètres).
    return [{ size: {} as Size, color: {} as Color, quantity: line.quantity, width: line.width, height: line.height }];
  }
  const size = resolveOption(product.sizes, line.sizeDocumentId, DEFAULT_SIZE);
  const color = resolveOption(product.colors, line.colorDocumentId, DEFAULT_COLOR);
  if (!size || !color) return null;
  return [{ size, color, quantity: line.quantity }];
};

/** Ce qu'il reste à faire au client pour cette ligne (libellés affichés). */
export const missingSteps = (product: Product, line: ChatOfferLine, selection: SizeAndColorSelection[] | null): string[] => {
  const missing: string[] = [];
  if (!selection) {
    if (isProductM2Pricing(product)) missing.push('les dimensions');
    else {
      if ((product.sizes?.length ?? 0) > 1 && !line.sizeDocumentId) missing.push('les tailles');
      if ((product.colors?.length ?? 0) > 1 && !line.colorDocumentId) missing.push('la couleur');
    }
    if (!missing.length) missing.push('votre sélection');
  }
  if (product.form) missing.push('votre personnalisation (logo, texte…)');
  return missing;
};

/**
 * Prépare chaque ligne de l'offre : prête à entrer telle quelle au panier, ou à
 * finaliser sur la fiche produit (pré-remplie). Charge le produit complet, comme
 * la fiche, pour que la ligne de panier soit strictement identique.
 */
export const planOffer = async (offer: ChatOffer): Promise<PlannedLine[]> => {
  const planned: PlannedLine[] = [];
  for (const line of offer.lines) {
    const { product } = await unwrapData(apiGetProductForShowById(line.productDocumentId));
    if (!product) throw new Error(`Produit introuvable : ${line.productName}`);
    const selection = selectionForLine(product, line);
    const missing = missingSteps(product, line, selection);
    if (!missing.length && selection) {
      planned.push({ kind: 'ready', line, product, sizeAndColors: selection });
    } else {
      planned.push({
        kind: 'complete',
        line,
        product,
        missing,
        prefill: {
          offerId: offer.id,
          quantity: line.quantity,
          sizeAndColors: selection ?? [],
          width: line.width,
          height: line.height,
          sizeName: line.sizeName,
          colorName: line.colorName,
        },
      });
    }
  }
  return planned;
};

/** Lecture tolérante du state de navigation de la fiche produit. */
export const readChatPrefill = (state: unknown): ChatPrefill | null => {
  const p = (state as { chatOffer?: ChatPrefill } | null)?.chatOffer;
  return p && typeof p.offerId === 'string' && Number(p.quantity) > 0 && Array.isArray(p.sizeAndColors) ? p : null;
};

/** Validation minimale d'une offre reçue du serveur (ou relue du sessionStorage). */
export const isChatOffer = (o: unknown): o is ChatOffer => {
  const x = o as ChatOffer | null;
  return !!x && typeof x.id === 'string' && Array.isArray(x.lines) && x.lines.length > 0
    && x.lines.every((l) => typeof l?.productDocumentId === 'string' && Number(l?.quantity) > 0);
};
