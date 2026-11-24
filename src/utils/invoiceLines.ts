/**
 * Lignes de facture — désignation, détail, quantité, P.U. HT, total HT.
 *
 * Une facture porte ses lignes (`invoice.lines`), figées à l'émission par le
 * serveur (peg_strapi → src/services/invoice-lines.ts + invoice-lines.service.ts) :
 * commandes catalogue, devis, projet, saisie admin. Ce module en est le MIROIR
 * côté front — mêmes règles, garder les deux alignés :
 *   - le TOTAL de chaque ligne fait foi (P.U. arrondi au centime) ;
 *   - la somme des lignes = montant HT de la facture ; un écart devient une
 *     ligne explicite (« Livraison », « Remise », « Ajustement »).
 *
 * En plus : `resolveInvoiceLines` pour l'affichage d'une facture émise AVANT
 * les lignes (ou par un serveur pas encore à jour) — reconstituées depuis ses
 * commandes ou son projet, sans jamais modifier la facture.
 * Tests : src/__tests__/invoiceLines.test.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type InvoiceLineKind = 'product' | 'service' | 'shipping' | 'discount' | 'adjustment';

export type InvoiceLine = {
  /** Désignation (obligatoire) */
  label: string;
  /** Détail : tailles, coloris, dimensions, précisions… */
  details?: string;
  quantity: number;
  /** Prix unitaire HT (arrondi au centime — le total fait foi) */
  unitPrice: number;
  /** Total HT de la ligne */
  total: number;
  kind?: InvoiceLineKind;
};

export const MAX_INVOICE_LINES = 100;
const MAX_LABEL = 200;
const MAX_DETAILS = 1000;
const MAX_AMOUNT = 10_000_000;
const KINDS: InvoiceLineKind[] = ['product', 'service', 'shipping', 'discount', 'adjustment'];

export const round2 = (n: number): number => Math.round(n * 100) / 100;

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(',', '.'));
  return NaN;
};

/** Écart toléré entre le total d'une ligne et quantité × P.U. arrondi au centime. */
const lineTolerance = (quantity: number): number => Math.abs(quantity) * 0.005 + 0.01;

export const sumLines = (lines: InvoiceLine[]): number =>
  round2(lines.reduce((s, l) => s + (Number(l.total) || 0), 0));

/** Deux montants égaux au centime près. */
export const sameAmount = (a: number, b: number): boolean => Math.abs(round2(a) - round2(b)) < 0.005;

export type LinesValidation = { lines: InvoiceLine[]; error: string | null };

/**
 * Valide et normalise des lignes saisies (admin, NOVA…). Stricte : une ligne
 * incohérente est refusée avec un message lisible plutôt que corrigée en silence.
 */
export function validateInvoiceLines(raw: unknown): LinesValidation {
  if (!Array.isArray(raw)) return { lines: [], error: 'Les lignes de facture doivent être une liste.' };
  if (raw.length === 0) return { lines: [], error: 'Une facture doit comporter au moins une ligne.' };
  if (raw.length > MAX_INVOICE_LINES) {
    return { lines: [], error: `Une facture ne peut pas dépasser ${MAX_INVOICE_LINES} lignes.` };
  }
  const lines: InvoiceLine[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r: any = raw[i];
    const at = `Ligne ${i + 1}`;
    if (!r || typeof r !== 'object') return { lines: [], error: `${at} : ligne invalide.` };
    const label = String(r.label ?? '').replace(/\s+/g, ' ').trim();
    if (!label) return { lines: [], error: `${at} : la désignation est obligatoire.` };
    if (label.length > MAX_LABEL) return { lines: [], error: `${at} : désignation trop longue (${MAX_LABEL} caractères au plus).` };
    const details = r.details == null ? '' : String(r.details).trim();
    if (details.length > MAX_DETAILS) return { lines: [], error: `${at} : détail trop long (${MAX_DETAILS} caractères au plus).` };
    const quantity = toNumber(r.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return { lines: [], error: `${at} : la quantité doit être un nombre positif.` };
    if (quantity > 1_000_000) return { lines: [], error: `${at} : quantité hors limite.` };
    const unitPrice = toNumber(r.unitPrice);
    if (!Number.isFinite(unitPrice) || Math.abs(unitPrice) > MAX_AMOUNT) {
      return { lines: [], error: `${at} : prix unitaire HT invalide.` };
    }
    const expected = round2(quantity * unitPrice);
    const givenTotal = toNumber(r.total);
    let total = expected;
    if (r.total != null && r.total !== '') {
      if (!Number.isFinite(givenTotal)) return { lines: [], error: `${at} : total HT invalide.` };
      if (Math.abs(givenTotal - quantity * unitPrice) > lineTolerance(quantity)) {
        return { lines: [], error: `${at} : le total HT (${givenTotal}) ne correspond pas à quantité × prix unitaire (${expected}).` };
      }
      total = round2(givenTotal);
    }
    const kind = KINDS.includes(r.kind) ? (r.kind as InvoiceLineKind) : undefined;
    lines.push({
      label,
      ...(details ? { details } : {}),
      quantity: Math.round(quantity * 1000) / 1000,
      unitPrice: round2(unitPrice),
      total,
      ...(kind ? { kind } : {}),
    });
  }
  return { lines, error: null };
}

// ─── Construction depuis les données PEG ─────────────────────────────────────

/** Nom d'une taille / d'un coloris ; `DEFAULT` = produit sans taille ou sans coloris. */
const optionName = (opt: any): string | null => {
  if (!opt || typeof opt !== 'object' || opt.value === 'DEFAULT') return null;
  const name = String(opt.name ?? opt.value ?? '').trim();
  return name || null;
};

const fmtDim = (n: number): string => String(Math.round(n * 100) / 100).replace('.', ',');

/**
 * Détail lisible d'une sélection tailles / coloris / dimensions :
 *   un seul coloris → « Noir — M × 10, L × 5 »
 *   plusieurs       → « M (Noir) × 10, L (Blanc) × 5 »
 *   dimensions (m²) → « 1,2 × 0,8 m × 2 »
 */
export function selectionDetails(selections: unknown): string {
  if (!Array.isArray(selections)) return '';
  const entries = selections
    .filter((s: any) => s && (Number(s.quantity) || 0) > 0)
    .map((s: any) => ({
      size: optionName(s.size),
      color: optionName(s.color),
      dims: Number(s.width) > 0 && Number(s.height) > 0 ? `${fmtDim(Number(s.width))} × ${fmtDim(Number(s.height))} m` : null,
      qty: Number(s.quantity) || 0,
    }));
  if (entries.length === 0) return '';
  if (entries.every((e) => !e.size && !e.color && !e.dims)) return '';

  const colors = [...new Set(entries.map((e) => e.color).filter(Boolean))] as string[];
  const singleColor = colors.length === 1 && entries.every((e) => e.color === colors[0]);
  const parts = entries.map((e) => {
    const base = [e.dims, e.size].filter(Boolean).join(' ');
    const color = singleColor ? null : e.color;
    const label = base && color ? `${base} (${color})` : base || color || '';
    if (!label) return `× ${e.qty}`;
    return `${label} × ${e.qty}`;
  });
  // Un seul coloris, sans taille ni dimension : le coloris suffit.
  if (singleColor && entries.every((e) => !e.size && !e.dims)) return colors[0];
  return (singleColor ? `${colors[0]} — ` : '') + parts.join(', ');
}

const selectionQuantity = (selections: unknown): number =>
  Array.isArray(selections)
    ? selections.reduce((q: number, s: any) => q + (Number(s?.quantity) || 0), 0)
    : 0;

/** Une ligne de commande (produit du catalogue, offre) → une ligne de facture. */
export function lineFromOrderItem(orderItem: any): InvoiceLine {
  const total = round2(Number(orderItem?.price) || 0);
  const counted = selectionQuantity(orderItem?.sizeAndColorSelections);
  const quantity = counted > 0 ? counted : 1;
  const details = selectionDetails(orderItem?.sizeAndColorSelections);
  return {
    label: String(orderItem?.product?.name ?? '').trim() || 'Article',
    ...(details ? { details } : {}),
    quantity,
    unitPrice: round2(total / quantity),
    total,
    kind: 'product',
  };
}

/**
 * Quantité d'un devis : champ libre (« 50 », « 50 pièces », « 1 000 ex. »).
 * Seul un nombre suivi au plus d'une unité est retenu ; « entre 50 et 100 » ou
 * « 50 + 30 » restent en texte (forfait × 1) plutôt qu'un P.U. faux.
 */
export function parseQuoteQuantity(text: unknown): number | null {
  if (typeof text !== 'string' && typeof text !== 'number') return null;
  const m = String(text).trim().match(/^(\d{1,3}(?:[\s  ]\d{3})+|\d+)(?:[.,]\d+)?\s*([A-Za-zÀ-ÿ'’.\-]+(?:\s[A-Za-zÀ-ÿ'’.\-]+)?)?$/);
  if (!m) return null;
  const n = Number(m[1].replace(/[\s  ]/g, ''));
  return Number.isInteger(n) && n > 0 && n <= 1_000_000 ? n : null;
}

/** Un devis accepté → une ligne (son titre, sa quantité si elle est lisible). */
export function lineFromQuote(quote: any, amountHT: number): InvoiceLine {
  const total = round2(Number(amountHT) || 0);
  const title = String(quote?.title ?? '').trim();
  const type = String(quote?.projectType ?? '').trim();
  const label = title || type || 'Prestation sur devis';
  const qtyText = quote?.quantity == null ? '' : String(quote.quantity).trim();
  const parsed = parseQuoteQuantity(qtyText);
  const quantity = parsed ?? 1;
  const details = [
    type && type !== label ? type : '',
    !parsed && qtyText ? `Quantité : ${qtyText}` : '',
  ].filter(Boolean).join(' — ');
  return {
    label,
    ...(details ? { details } : {}),
    quantity,
    unitPrice: round2(total / quantity),
    total,
    kind: 'service',
  };
}

/** Projet sans commande ni devis → une ligne au nom du projet. */
export function lineFromProjectName(name: unknown, amountHT: number): InvoiceLine {
  const total = round2(Number(amountHT) || 0);
  return {
    label: String(name ?? '').trim() || 'Prestation',
    quantity: 1,
    unitPrice: total,
    total,
    kind: 'service',
  };
}

export const SHIPPING_LABEL = 'Livraison';

/**
 * Forfait livraison HT ajouté à toute commande catalogue — source unique,
 * lue par le checkout (checkout.ts) et par la construction des lignes.
 */
export const CATALOG_SHIPPING_HT = 9.9;

/** Ligne de livraison / remise / avoir (quantité 1). */
export function extraLine(label: string, amountHT: number, kind: InvoiceLineKind): InvoiceLine {
  const total = round2(amountHT);
  return { label, quantity: 1, unitPrice: total, total, kind };
}

/**
 * Fait retomber les lignes sur le montant HT de la facture : l'écart devient
 * une ligne explicite. Les lignes d'ajustement précédentes sont recalculées
 * (une facture dont le montant change ne cumule pas les ajustements).
 *   écart = forfait livraison → « Livraison » ; écart négatif → « Remise » ;
 *   sinon → « Ajustement ».
 */
export function reconcileLines(
  lines: InvoiceLine[],
  amountHT: number,
  opts: { shippingHT?: number } = {}
): InvoiceLine[] {
  const kept = lines.filter((l) => l.kind !== 'adjustment');
  const amount = Number(amountHT);
  if (!Number.isFinite(amount)) return kept;
  const diff = round2(amount - sumLines(kept));
  if (Math.abs(diff) < 0.005) return kept;
  const hasShipping = kept.some((l) => l.kind === 'shipping');
  if (!hasShipping && opts.shippingHT && sameAmount(diff, opts.shippingHT)) {
    return [...kept, extraLine(SHIPPING_LABEL, diff, 'shipping')];
  }
  if (diff < 0) return [...kept, extraLine('Remise', diff, 'adjustment')];
  return [...kept, extraLine('Ajustement', diff, 'adjustment')];
}

/**
 * Lignes d'une commande catalogue : produits, remise promo, avoir de
 * parrainage — puis réconciliation avec le montant réellement facturé :
 * l'écart égal au forfait devient la ligne « Livraison ». Elle n'est donc
 * jamais ajoutée d'office (un montant sans livraison n'en affiche pas).
 */
export function catalogInvoiceLines(params: {
  orderItems: any[];
  amountHT: number;
  shippingHT?: number;
  promoCode?: string | null;
  discountHT?: number;
  referralCreditHT?: number;
}): InvoiceLine[] {
  const lines = (params.orderItems || []).filter(Boolean).map(lineFromOrderItem);
  if (params.discountHT && params.discountHT > 0) {
    lines.push(extraLine(params.promoCode ? `Remise (code ${params.promoCode})` : 'Remise', -params.discountHT, 'discount'));
  }
  if (params.referralCreditHT && params.referralCreditHT > 0) {
    lines.push(extraLine('Avoir de parrainage', -params.referralCreditHT, 'discount'));
  }
  return reconcileLines(lines, params.amountHT, { shippingHT: params.shippingHT });
}

// ─── Affichage : lignes d'une facture, enregistrées ou reconstituées ─────────

type InvoiceForLines = {
  amount?: number | string | null;
  lines?: unknown;
  orderItems?: any[] | null;
  project?: { name?: string | null; orderItem?: any | null } | null;
};

export type ResolvedLines = {
  lines: InvoiceLine[];
  /** stored = lignes figées de la facture ; derived = reconstituées pour l'affichage */
  source: 'stored' | 'derived';
};

/**
 * Lignes à afficher / imprimer. Lignes enregistrées si elles existent ; sinon
 * reconstitution : commandes rattachées → commande du projet → nom du projet →
 * « Prestation ». Toujours ramenées au montant HT de la facture.
 */
export function resolveInvoiceLines(invoice: InvoiceForLines | null | undefined): ResolvedLines {
  const amountHT = Number(invoice?.amount) || 0;
  if (Array.isArray(invoice?.lines) && invoice!.lines.length > 0) {
    const { lines, error } = validateInvoiceLines(invoice!.lines);
    if (!error) return { lines, source: 'stored' };
  }
  const items = (invoice?.orderItems ?? []).filter(Boolean);
  let lines: InvoiceLine[];
  if (items.length > 0) lines = items.map(lineFromOrderItem);
  else if (invoice?.project?.orderItem) lines = [lineFromOrderItem(invoice.project.orderItem)];
  else lines = [lineFromProjectName(invoice?.project?.name || 'Prestation', amountHT)];
  return { lines: reconcileLines(lines, amountHT, { shippingHT: CATALOG_SHIPPING_HT }), source: 'derived' };
}

/** Brouillon de lignes pour facturer un projet : sa commande, son devis ou son nom. */
export function draftLinesForProject(
  project: { name?: string | null; price?: number | null; orderItem?: any | null },
  quote?: any | null
): InvoiceLine[] {
  const amountHT = round2(Number(project?.price) || 0);
  if (project?.orderItem) return reconcileLines([lineFromOrderItem(project.orderItem)], amountHT);
  if (quote) return [lineFromQuote(quote, amountHT)];
  return [lineFromProjectName(project?.name, amountHT)];
}

export type InvoiceTotals = { amount: number; vatAmount: number; totalAmount: number };

/** Totaux d'une facture depuis ses lignes et son taux de TVA (0 = exonérée / autoliquidée). */
export function totalsFromLines(lines: InvoiceLine[], vatRate: number): InvoiceTotals {
  const amount = sumLines(lines);
  const vatAmount = round2(amount * (Number(vatRate) || 0));
  return { amount, vatAmount, totalAmount: round2(amount + vatAmount) };
}

/** Taux de TVA réellement appliqué à une facture, déduit de ses montants (0 ou 20 % en pratique). */
export function appliedVatRate(invoice: { amount?: number | string | null; vatAmount?: number | string | null }): number {
  const amount = Number(invoice?.amount) || 0;
  const vat = Number(invoice?.vatAmount) || 0;
  if (amount <= 0 || vat <= 0) return 0;
  return Math.round((vat / amount) * 1000) / 1000;
}

export const PAID_PAYMENT_STATES = ['fulfilled', 'transfer_received'];

/** Facture encaissée : ses montants sont figés (seules les désignations se corrigent). */
export const isInvoicePaid = (invoice: { paymentState?: string | null } | null | undefined): boolean =>
  PAID_PAYMENT_STATES.includes(invoice?.paymentState ?? '');
