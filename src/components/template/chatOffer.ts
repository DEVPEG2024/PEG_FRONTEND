import type { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import type { CartItem } from '@/@types/cart';
import type { FormAnswer } from '@/@types/formAnswer';
import { apiGetProductForShowById } from '@/services/ProductServices';
import { unwrapData } from '@/utils/serviceHelper';
import { getProductPackOptions, isProductM2Pricing, isProductPackPricing } from '@/utils/productHelpers';
import { DEFAULT_CHOICE } from '@/views/app/customer/products/show/SizeAndColorsChoice';
import { optionKey } from '@/utils/optionKey';

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
  /** Demandées dans le chat mais introuvables sur le produit (le serveur les transmet). */
  requestedSize?: string;
  requestedColor?: string;
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
 * Pré-remplissage transmis à la fiche produit (state de navigation) : depuis une
 * carte produit du chat (offre connue), ou quand une ligne ne peut pas aller seule
 * au panier (tailles à répartir, dimensions manquantes). La fiche résout les lignes
 * sur le produit chargé (selectionForLines) : quantité, tailles et couleurs dites
 * dans le chat se mettent toutes seules.
 */
export type ChatPrefill = {
  offerId: string;
  /** Quantité totale de ce produit dans l'offre. */
  quantity: number;
  /** Lignes de l'offre pour ce produit (une par taille/couleur en cas de répartition). */
  lines: ChatOfferLine[];
};

/** State de navigation posé par le chat : fiche pré-remplie ou pop-up logo du panier. */
export type ChatNavState = { chatOffer?: ChatPrefill; openPersonalization?: boolean };

export type PlannedLine =
  | { kind: 'ready'; line: ChatOfferLine; lines: ChatOfferLine[]; product: Product; sizeAndColors: SizeAndColorSelection[]; formAnswer: Partial<FormAnswer> | null }
  | { kind: 'complete'; line: ChatOfferLine; lines: ChatOfferLine[]; product: Product; prefill: ChatPrefill; missing: string[] };

const DEFAULT_SIZE = DEFAULT_CHOICE as Size;
const DEFAULT_COLOR = DEFAULT_CHOICE as Color;

/**
 * Produit vendu PAR PACKS (cartes de visite : 100, 500, 1 000…) : la quantité est
 * celle d'un pack. Une autre quantité est portée au plus petit pack qui la couvre —
 * jamais un pack plus petit (300 cartes au prix du pack de 100) ; au-delà du plus
 * grand pack, le plus grand. Même règle que le chat côté serveur (chatbot-packs).
 */
export const packQuantity = (product: Product, quantity: number): number => {
  if (!isProductPackPricing(product)) return quantity;
  const packs = getProductPackOptions(product);
  if (!packs.length) return quantity;
  return packs.find((p) => p >= quantity) ?? packs[packs.length - 1];
};

/**
 * Packs : un format (taille × couleur) = un pack = un article de panier — la fiche
 * n'en sélectionne qu'un à la fois. 500 vertical + 500 horizontal = deux packs de
 * 500, pas un pack de 1 000 au prix du pack de 1 000.
 */
export const splitPackLines = (lines: ChatOfferLine[]): ChatOfferLine[][] => {
  const byFormat = new Map<string, ChatOfferLine[]>();
  for (const l of lines) {
    const key = `${l.sizeDocumentId ?? l.sizeName ?? l.requestedSize ?? ''}|${l.colorDocumentId ?? l.colorName ?? l.requestedColor ?? ''}`;
    byFormat.set(key, [...(byFormat.get(key) ?? []), l]);
  }
  return [...byFormat.values()];
};

/**
 * Une dimension (taille ou couleur) est résolue si l'offre la précise, si le
 * produit n'en a pas (valeur DEFAULT, comme SizeAndColorsChoice) ou n'en a
 * qu'une seule. Sinon c'est au client de choisir sur la fiche.
 */
const norm = (v?: string) => (v ?? '').trim().toLowerCase();
/** « XXL » = « 2XL » (même règle que le serveur, chatbot-speed.ts) ; « bleu-marine » = « bleu marine ». */
export const canonOption = (v?: string): string => {
  const t = norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s.-]+/g, '');
  const x = /^(x{2,5})(s|l)$/.exec(t);
  return x ? `${x[1].length}x${x[2]}` : t;
};
const resolveOption = <T extends { documentId?: string; name?: string }>(
  options: T[] | undefined, wantedId: string | undefined, wantedName: string | undefined, fallback: T,
): T | null => {
  const list = options ?? [];
  if (wantedId || wantedName) {
    // Par identifiant, puis par nom : une fiche chargée sans documentId (ancienne
    // requête, données en cache) ne doit pas faire perdre la couleur « NOIR ».
    // Puis par nom équivalent : « XXL » demandé, « 2XL » sur la fiche.
    return list.find((o) => wantedId && o.documentId === wantedId)
      ?? list.find((o) => wantedName && norm(o.name) === norm(wantedName))
      ?? list.find((o) => wantedName && canonOption(o.name) === canonOption(wantedName))
      ?? null;
  }
  if (list.length === 0) return fallback;
  if (list.length === 1) return list[0];
  return null;
};

/**
 * Sélection tailles/couleurs reprise de l'offre, identique à celle que produirait la
 * fiche : une entrée par taille×couleur (« 5 M et 5 L » donne deux entrées, le palier
 * se calcule sur le total). PARTIELLE : les lignes dont la taille ou la couleur reste
 * à choisir sont rendues à part (`missing`) — avant, une seule ligne incomplète
 * (« 2 noirs XXL » sur une fiche qui dit « 2XL ») faisait perdre TOUTE la
 * pré-sélection, y compris les 5 blancs L connus (25/09/2026).
 */
export const prefillSelection = (product: Product, lines: ChatOfferLine[]): { selection: SizeAndColorSelection[]; missing: ChatOfferLine[] } => {
  if (isProductM2Pricing(product)) {
    const ok = lines.filter((l) => Number(l.width) > 0 && Number(l.height) > 0);
    // Même forme que ShowProduct.handleAddToCart pour le m² (dimensions en mètres).
    return {
      selection: ok.map((l) => ({ size: {} as Size, color: {} as Color, quantity: l.quantity, width: l.width, height: l.height })),
      missing: lines.filter((l) => !ok.includes(l)),
    };
  }
  const merged = new Map<string, SizeAndColorSelection>();
  const missing: ChatOfferLine[] = [];
  for (const l of lines) {
    const size = resolveOption(product.sizes, l.sizeDocumentId, l.sizeName ?? l.requestedSize, DEFAULT_SIZE);
    const color = resolveOption(product.colors, l.colorDocumentId, l.colorName ?? l.requestedColor, DEFAULT_COLOR);
    if (!size || !color) { missing.push(l); continue; }
    // Identité par documentId (optionKey) : deux couleurs peuvent partager le même
    // code hex (NOIR et HEATHER GREY du Bonnet, tous deux #000000).
    const key = `${optionKey(size)}|${optionKey(color)}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + l.quantity } : { size, color, quantity: l.quantity });
  }
  return { selection: [...merged.values()].map((sel) => ({ ...sel, quantity: packQuantity(product, sel.quantity) })), missing };
};

/** Sélection COMPLÈTE (prête pour le panier), ou null si une taille/couleur reste à choisir. */
export const selectionForLines = (product: Product, lines: ChatOfferLine[]): SizeAndColorSelection[] | null => {
  if (!lines.length) return null;
  const { selection, missing } = prefillSelection(product, lines);
  return missing.length || !selection.length ? null : selection;
};

/** Ce qu'il reste à choisir sur la fiche, lisible : « 2 NOIR : taille « XXL » introuvable ». */
export const describeMissing = (product: Product, lines: ChatOfferLine[]): string[] =>
  lines.map((l) => {
    if (isProductM2Pricing(product)) return `${l.quantity} pièce${l.quantity > 1 ? 's' : ''} : dimensions à indiquer`;
    const known = [l.sizeName, l.colorName].filter(Boolean).join(' ');
    const needSize = !resolveOption(product.sizes, l.sizeDocumentId, l.sizeName ?? l.requestedSize, DEFAULT_SIZE);
    const needColor = !resolveOption(product.colors, l.colorDocumentId, l.colorName ?? l.requestedColor, DEFAULT_COLOR);
    const what = [
      needSize ? (l.requestedSize ? `taille « ${l.requestedSize} » introuvable` : 'taille à choisir') : '',
      needColor ? (l.requestedColor ? `couleur « ${l.requestedColor} » introuvable` : 'couleur à choisir') : '',
    ].filter(Boolean).join(', ');
    return `${l.quantity}${known ? ` ${known}` : ''} : ${what}`;
  });

/** Sélection d'une seule ligne (cas simple). */
export const selectionForLine = (product: Product, line: ChatOfferLine): SizeAndColorSelection[] | null =>
  selectionForLines(product, [line]);

/** Ce qu'il reste à faire au client pour ces lignes (libellés affichés). */
export const missingSteps = (product: Product, lines: ChatOfferLine | ChatOfferLine[], selection: SizeAndColorSelection[] | null): string[] => {
  const list = Array.isArray(lines) ? lines : [lines];
  const missing: string[] = [];
  if (!selection) {
    if (isProductM2Pricing(product)) missing.push('les dimensions');
    else {
      if ((product.sizes?.length ?? 0) > 1 && list.some((l) => !l.sizeDocumentId)) missing.push('les tailles');
      if ((product.colors?.length ?? 0) > 1 && list.some((l) => !l.colorDocumentId)) missing.push('la couleur');
    }
    if (!missing.length) missing.push('votre sélection');
  }
  // Produit « BAT requis » : le client approuve le BAT sur la fiche avant l'ajout,
  // jamais d'entrée directe au panier.
  if (product.requiresBat && product.batFile?.url) missing.push('la validation du BAT');
  return missing;
};

/**
 * Résumé de l'offre sous la réponse du chat, AVEC tailles et couleurs : « 7 × T-shirt
 * ECO 150 g/m² — 5 M NOIR, 2 XL BLANC ». Avant : « 5 × T-shirt · 2 × T-shirt », sans
 * rien pour vérifier que la demande était respectée.
 */
export const describeOffer = (offer: ChatOffer): string => {
  const byProduct = new Map<string, ChatOfferLine[]>();
  for (const l of offer.lines) byProduct.set(l.productDocumentId, [...(byProduct.get(l.productDocumentId) ?? []), l]);
  return [...byProduct.values()].map((lines) => {
    const total = lines.reduce((n, l) => n + l.quantity, 0);
    const detail = describeLines(lines);
    return `${total} × ${lines[0].productName}${detail ? ` — ${detail}` : ''}`;
  }).join(' · ');
};

/** Pré-remplissage d'un produit de l'offre (null s'il n'y figure pas). */
export const prefillForProduct = (offer: ChatOffer, productDocumentId: string): ChatPrefill | null => {
  const lines = offer.lines.filter((l) => l.productDocumentId === productDocumentId);
  if (!lines.length) return null;
  return { offerId: offer.id, quantity: lines.reduce((n, l) => n + l.quantity, 0), lines };
};

/** Résumé lisible d'une répartition : « 5 M, 5 L » ou « NOIR ». */
export const describeLines = (lines: ChatOfferLine[]): string => {
  const label = (l: ChatOfferLine) => [l.sizeName ?? l.requestedSize, l.colorName ?? l.requestedColor].filter(Boolean).join(' ');
  if (lines.length === 1) return label(lines[0]);
  return lines.map((l) => `${l.quantity}${label(l) ? ` ${label(l)}` : ''}`).join(', ');
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
 * Prépare l'offre produit par produit (une répartition « 5 M et 5 L » = UNE ligne
 * de panier à deux sélections, comme sur la fiche) : prête à entrer telle quelle au
 * panier, ou à finaliser sur la fiche pré-remplie. Charge le produit complet, comme
 * la fiche, pour que la ligne de panier soit strictement identique.
 */
export const planOffer = async (offer: ChatOffer): Promise<PlannedLine[]> => {
  const byProduct = new Map<string, ChatOfferLine[]>();
  for (const line of offer.lines) byProduct.set(line.productDocumentId, [...(byProduct.get(line.productDocumentId) ?? []), line]);
  const planned: PlannedLine[] = [];
  for (const productLines of byProduct.values()) {
    const { product } = await unwrapData(apiGetProductForShowById(productLines[0].productDocumentId));
    if (!product) throw new Error(`Produit introuvable : ${productLines[0].productName}`);
    const parts = isProductPackPricing(product) ? splitPackLines(productLines) : [productLines];
    for (const lines of parts) {
      const line = lines[0];
      const selection = selectionForLines(product, lines);
      const missing = missingSteps(product, lines, selection);
      if (!missing.length && selection) {
        planned.push({ kind: 'ready', line, lines, product, sizeAndColors: selection, formAnswer: pendingFormAnswer(product) });
      } else {
        const prefill = parts.length > 1
          ? { offerId: offer.id, quantity: lines.reduce((n, l) => n + l.quantity, 0), lines }
          : prefillForProduct(offer, line.productDocumentId)!;
        planned.push({ kind: 'complete', line, lines, product, missing, prefill });
      }
    }
  }
  return planned;
};

/** Lecture tolérante du state de navigation de la fiche produit. */
export const readChatPrefill = (state: unknown): ChatPrefill | null => {
  const p = (state as { chatOffer?: ChatPrefill } | null)?.chatOffer;
  return p && typeof p.offerId === 'string' && Number(p.quantity) > 0 && Array.isArray(p.lines) && p.lines.length > 0 ? p : null;
};

/** Validation minimale d'une offre reçue du serveur (ou relue du sessionStorage). */
export const isChatOffer = (o: unknown): o is ChatOffer => {
  const x = o as ChatOffer | null;
  return !!x && typeof x.id === 'string' && Array.isArray(x.lines) && x.lines.length > 0
    && x.lines.every((l) => typeof l?.productDocumentId === 'string' && Number(l?.quantity) > 0);
};
