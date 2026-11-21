/**
 * Master Print — devis d'achat (prix bloqué 15 jours) et catégories du
 * catalogue : règles d'affichage pures, testées par
 * src/__tests__/masterPrintQuote.test.ts. Le serveur décide (peg_strapi
 * `master-print-quotes-text.ts`) ; ici on le dit clairement à l'admin.
 */
import type {
  MpCategory,
  MpPriceChange,
  MpQuoteCheck,
  MpQuoteView,
  MpSendQuoteOutcome,
} from '@/@types/masterPrintQuote';
import { fmtEur } from '@/utils/masterPrint';

const PARIS = 'Europe/Paris';

/** « 5 décembre », « 1er décembre » ; l'année seulement si ce n'est pas celle en cours. */
export function fmtDayMonth(
  iso: string | null | undefined,
  now: Date = new Date()
): string {
  const d = iso ? new Date(iso) : null;
  if (!d || !Number.isFinite(d.getTime())) return '—';
  const year = (x: Date) =>
    x.toLocaleDateString('fr-FR', { year: 'numeric', timeZone: PARIS });
  const text = d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    ...(year(d) === year(now) ? {} : { year: 'numeric' }),
    timeZone: PARIS,
  });
  return text.replace(/^1 /, '1er ');
}

/** « Devis Q-2026-000123 · 152,40 € HT · valable jusqu’au 5 décembre » */
export function quoteLabel(q: MpQuoteView, now: Date = new Date()): string {
  const when = q.used
    ? `utilisé${q.orderId ? ` pour la commande ${q.orderId}` : ''}`
    : q.expired
      ? `expiré le ${fmtDayMonth(q.validUntil, now)}`
      : `valable jusqu’au ${fmtDayMonth(q.validUntil, now)}`;
  return `Devis ${q.quoteId} · ${fmtEur(q.totalExclTax)} HT · ${when}`;
}

export type QuoteNote = { tone: 'ok' | 'warn' | 'info'; text: string };

/** Ce que l'envoi fera du devis, avec les lignes actuelles du formulaire. */
export function quoteDecisionNote(check: MpQuoteCheck): QuoteNote | null {
  if (!check.quote) return null;
  const d = check.decision;
  if (!d)
    return {
      tone: 'info',
      text: 'Complétez les lignes pour savoir si ce devis s’applique.',
    };
  if (d.use)
    return {
      tone: 'ok',
      text: 'L’envoi reprendra ce prix d’achat : les lignes sont celles du devis.',
    };
  switch (d.reason) {
    case 'changed':
      return {
        tone: 'warn',
        text: 'Les lignes ont changé depuis ce devis : l’envoi se fera au prix du jour. Bloquez à nouveau le prix si besoin.',
      };
    case 'expired':
      return {
        tone: 'warn',
        text: 'Devis expiré : l’envoi se fera au prix du jour.',
      };
    case 'used':
      return {
        tone: 'info',
        text: 'Ce devis a déjà servi : un nouvel envoi se fera au prix du jour.',
      };
    default:
      return null;
  }
}

/** Bouton « Bloquer le prix d'achat » utile : pas de devis, ou devis qui ne s'appliquerait pas. */
export const canLockPrice = (check: MpQuoteCheck | null): boolean =>
  !check?.decision?.use;

const num = (v: unknown): number | null =>
  v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))
    ? Number(v)
    : null;

/** Erreur d'envoi `409 price_changed` → données du bouton « Confirmer le nouveau prix ». */
export function priceChangeOf(err: unknown): MpPriceChange | null {
  const res = (
    err as {
      response?: {
        status?: number;
        data?: { error?: unknown; code?: unknown; details?: unknown };
      };
    }
  )?.response;
  if (res?.status !== 409 || res.data?.code !== 'price_changed') return null;
  const d = (
    res.data.details && typeof res.data.details === 'object'
      ? res.data.details
      : {}
  ) as Record<string, unknown>;
  return {
    message:
      typeof res.data.error === 'string' && res.data.error
        ? res.data.error
        : 'Le prix d’achat Master Print a changé.',
    quoteId: typeof d.quoteId === 'string' ? d.quoteId : null,
    oldTotalExclTax: num(d.oldTotalExclTax),
    newTotalExclTax: num(d.newTotalExclTax),
  };
}

/** « 79,98 € → 85,50 € HT », ou null si un des deux montants manque. */
export function priceChangeAmounts(change: MpPriceChange): string | null {
  if (change.oldTotalExclTax === null || change.newTotalExclTax === null)
    return null;
  return `${fmtEur(change.oldTotalExclTax)} → ${fmtEur(change.newTotalExclTax)} HT`;
}

/** Suite du message de succès de l'envoi : « au prix du devis Q-… ». */
export function sendQuoteNote(outcome?: MpSendQuoteOutcome | null): string {
  return outcome?.used && outcome.quoteId
    ? ` au prix du devis ${outcome.quoteId}`
    : '';
}

// ── Catégories du catalogue ─────────────────────────────────────────────────

/** Catégories de Master Print (libellés à jour) ; à défaut, la liste connue. */
export function categoryEntries(
  api: MpCategory[] | null | undefined,
  fallback: Record<string, string>
): MpCategory[] {
  if (api && api.length) return api;
  return Object.entries(fallback).map(([code, label]) => ({
    code,
    label,
    products: null,
  }));
}

export function categoryLabel(
  api: MpCategory[] | null | undefined,
  code: string,
  fallback: Record<string, string>
): string {
  return api?.find((c) => c.code === code)?.label || fallback[code] || code;
}

/**
 * Catégorie PEG proposée à l'import : celle choisie la dernière fois pour cette
 * catégorie Master Print (si elle existe toujours), sinon la suggestion par le nom.
 */
export function pickImportCategory(
  pegCategories: Array<{ documentId: string }>,
  remembered: string | null | undefined,
  suggested: string
): string {
  return remembered && pegCategories.some((c) => c.documentId === remembered)
    ? remembered
    : suggested;
}
