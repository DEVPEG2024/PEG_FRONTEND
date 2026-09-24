import type { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import type { CartItem } from '@/@types/cart';
import type { FormAnswer } from '@/@types/formAnswer';
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
 * ligne ne peut pas aller seule au panier : tailles/couleurs à répartir ou
 * dimensions manquantes (la personnalisation, elle, se complète depuis le panier).
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
  | { kind: 'ready'; line: ChatOfferLine; product: Product; sizeAndColors: SizeAndColorSelection[]; formAnswer: Partial<FormAnswer> | null }
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
  return missing;
};

// ── Personnalisation différée ────────────────────────────────────────────────
//
// Décision du 24/09/2026 : l'offre du chat entre DIRECTEMENT au panier, même
// quand le produit a un formulaire de personnalisation (logo, zones, texte). La
// ligne porte alors une réponse « en attente » (state 'pending') que le client
// complète depuis le panier (« Personnaliser »). Une réponse remplie par le
// formulaire a state 'submitted' (WizardShowForm).
// Le paiement n'est bloqué que si le formulaire a un champ OBLIGATOIRE : sinon
// PEG accepte déjà une commande sans fichier (8 formulaires sur 9 en prod).

const PENDING_STATE = 'pending';

/** Réponse de formulaire « à compléter », valide pour apiCreateFormAnswer. */
export const pendingFormAnswer = (product: Product): Partial<FormAnswer> | null =>
  product.form
    ? ({ form: product.form, answer: { data: {}, metadata: { source: 'assistant' }, state: PENDING_STATE } } as unknown as Partial<FormAnswer>)
    : null;

type FormioComponent = { type?: string; input?: boolean; required?: boolean; validate?: { required?: boolean }; components?: FormioComponent[]; columns?: { components?: FormioComponent[] }[] };

/** Le formulaire Form.io exige-t-il au moins un champ ? (fields : tableau, chaîne JSON ou { components }). */
export const formRequiresInput = (fields: unknown): boolean => {
  let data: unknown = fields;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return false; } }
  if (data && !Array.isArray(data)) {
    const o = data as { components?: unknown; fields?: unknown };
    data = o.components ?? o.fields ?? [];
  }
  if (!Array.isArray(data)) return false;
  const walk = (list: FormioComponent[], depth: number): boolean => list.some((c) => {
    if (!c || typeof c !== 'object') return false;
    if (c.input !== false && (c.validate?.required || c.required)) return true;
    if (depth < 4 && Array.isArray(c.components) && walk(c.components, depth + 1)) return true;
    return depth < 4 && Array.isArray(c.columns) && c.columns.some((col) => Array.isArray(col?.components) && walk(col.components, depth + 1));
  });
  return walk(data as FormioComponent[], 0);
};

export type PersonalizationStatus = 'none' | 'done' | 'optional' | 'required';

/**
 * État de la personnalisation d'une ligne de panier : sans formulaire, remplie,
 * à compléter (facultative) ou à compléter (obligatoire → paiement bloqué).
 */
export const personalizationStatus = (item: Pick<CartItem, 'product' | 'formAnswer'>): PersonalizationStatus => {
  if (!item.product?.form) return 'none';
  const answer = (item.formAnswer as Partial<FormAnswer> | null | undefined)?.answer as { state?: string } | undefined;
  if (answer && answer.state !== PENDING_STATE) return 'done';
  return formRequiresInput(item.product.form.fields) ? 'required' : 'optional';
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
      planned.push({ kind: 'ready', line, product, sizeAndColors: selection, formAnswer: pendingFormAnswer(product) });
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
