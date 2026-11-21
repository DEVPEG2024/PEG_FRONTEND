/**
 * Prix d'achat Master Print des produits importés — textes et calculs de
 * l'écran admin (fonctions pures, testées : src/__tests__/masterPrintPrices.test.ts).
 * Le serveur décide (peg_strapi `master-print-prices-text.ts`) ; ici on présente.
 */
import type {
  MpPriceChange,
  MpPriceRun,
  MpPriceTier,
} from '@/@types/masterPrintPrices';
import type { Tone } from '@/utils/masterPrint';
import { fmtEur } from '@/utils/masterPrint';

export const PRICE_STATUS_LABELS: Record<string, string> = {
  applique: 'Appliqué',
  a_revoir: 'À revoir',
  ignore: 'Ignoré',
};

export const PRICE_SOURCE_LABELS: Record<string, string> = {
  webhook: 'avis de Master Print',
  nuit: 'vérification de la nuit',
  admin: 'à la demande',
};

const TONES: Record<string, Tone> = {
  applique: {
    color: '#86efac',
    background: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
  },
  a_revoir: {
    color: '#fcd34d',
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
  },
  ignore: {
    color: 'rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
  },
};

export const priceStatusTone = (status: string): Tone =>
  TONES[status] || TONES.ignore;

/** Prix du plus petit palier (le « à partir de »). */
export function firstTierPrice(
  tiers: MpPriceTier[] | null | undefined
): number | null {
  if (!tiers?.length) return null;
  const first = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)[0];
  return Number.isFinite(first.price) ? first.price : null;
}

const fmtNumber = (n: number, digits = 1) =>
  n.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** « +5,3 % », « −3,0 % », « 0,0 % » ; vide si inconnue. */
export function fmtVariation(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  if (Math.abs(v) < 0.05) return '0,0 %';
  return `${v > 0 ? '+' : '−'}${fmtNumber(Math.abs(v))} %`;
}

/** Couleur de la variation : hausse en ambre (le client paiera plus), baisse en vert. */
export const variationColor = (v: number | null | undefined): string =>
  v == null || Math.abs(v) < 0.05
    ? 'rgba(255,255,255,0.7)'
    : v > 0
      ? '#fcd34d'
      : '#86efac';

const fmtMarkup = (m: number) =>
  Number.isInteger(m) ? String(m) : fmtNumber(m);

/** « 1er palier : 37,94 € → 39,95 € (+5,3 %) ». */
export function priceLine(c: MpPriceChange): string {
  if (c.reason === 'retire')
    return 'Produit retiré de la vente par Master Print';
  if (c.reason === 'config_inconnue')
    return `1er palier actuel : ${fmtEur(firstTierPrice(c.oldTiers))} (prix non suivis)`;
  const before = firstTierPrice(c.oldTiers);
  const after = firstTierPrice(c.newTiers);
  if (after == null)
    return `1er palier : ${fmtEur(before)} (aucun prix proposé)`;
  const v = fmtVariation(c.variation);
  return `1er palier : ${fmtEur(before)} → ${fmtEur(after)}${v ? ` (${v})` : ''}`;
}

/** « Achat : 23,71 € → 24,90 € » quand le prix d'achat est connu des deux côtés et a changé. */
export function costLine(c: MpPriceChange): string | null {
  if (c.oldCost == null || c.newCost == null) return null;
  if (Math.abs(c.oldCost - c.newCost) < 0.005) return null;
  return `Achat : ${fmtEur(c.oldCost)} → ${fmtEur(c.newCost)}`;
}

/** Titre de l'alerte « à revoir » sur la fiche produit. */
export function reviewTitle(c: MpPriceChange): string {
  if (c.reason === 'retire')
    return 'Produit retiré par Master Print : à revoir';
  if (c.reason === 'config_inconnue')
    return 'Prix d’achat Master Print non suivis : à vérifier';
  return 'Prix d’achat Master Print modifié : à revoir';
}

/**
 * Pourquoi ce changement, en une phrase. Le texte suit le statut FINAL : une
 * proposition appliquée ou ignorée par un admin ne dit plus « rien n'a été écrasé ».
 */
export function reasonText(c: MpPriceChange): string {
  const m = c.markup != null ? `+${fmtMarkup(c.markup)} %` : null;
  if (c.status === 'applique' && c.reason !== 'auto')
    return `Nouveaux prix appliqués par un administrateur${m ? ` (majoration ${m})` : ''}.`;
  if (c.status === 'ignore')
    return c.reason === 'config_inconnue'
      ? 'Signalement clos : prix de la fiche gardés tels quels.'
      : 'Ignoré : les prix de la fiche ont été gardés.';
  switch (c.reason) {
    case 'auto':
      return `Mis à jour automatiquement, même majoration${m ? ` (${m})` : ''}.`;
    case 'retouche':
      return `Prix retouchés à la main : rien n’a été écrasé. Proposition à la même majoration${m ? ` (${m})` : ''}.`;
    case 'ancien_import':
      return m
        ? `Importé avant le suivi des prix : majoration supposée ${m} (1er palier ÷ prix de revient).`
        : 'Importé avant le suivi des prix : aucun prix ne peut être proposé, vérifiez la fiche.';
    case 'retire':
      return 'Vérifiez la fiche : produit à retirer du catalogue ou à relier à un autre produit Master Print.';
    case 'config_inconnue':
      return 'Format ou coloris acheté introuvable chez Master Print (importé avant le suivi des prix, ou options changées) : aucun prix proposé. Vérifiez les prix de la fiche, ou réimportez le produit pour qu’ils soient suivis.';
    default:
      return '';
  }
}

/** Les « à revoir » ont des boutons ; « Appliquer » seulement s'il y a des paliers proposés. */
export const canApply = (c: MpPriceChange) =>
  c.status === 'a_revoir' && !!c.newTiers?.length;
export const canDecide = (c: MpPriceChange) => c.status === 'a_revoir';

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `le ${day} à ${time}`;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

/**
 * Bilan de la dernière vérification, en une phrase. `pending` = changements encore
 * « à revoir » (trouvés par une vérification précédente) : une passe sans rien de
 * nouveau ne dit alors pas « aucun changement ».
 */
export function runLine(
  last: MpPriceRun | null | undefined,
  pending = 0
): string {
  if (!last)
    return 'Pas encore vérifiés : la première vérification a lieu cette nuit, ou maintenant avec le bouton.';
  const source = PRICE_SOURCE_LABELS[last.source] || last.source;
  const parts = [plural(last.checked, 'produit vérifié', 'produits vérifiés')];
  if (last.applied) parts.push(plural(last.applied, 'ajusté', 'ajustés'));
  if (last.review) parts.push(`${last.review} à revoir`);
  if (last.retired)
    parts.push(
      plural(last.retired, 'retiré de la vente', 'retirés de la vente')
    );
  if (!last.applied && !last.review && !last.retired && last.checked)
    parts.push(
      pending > 0
        ? `rien de nouveau (${pending} changement${pending > 1 ? 's' : ''} toujours à revoir)`
        : 'aucun changement'
    );
  const error = last.error ? ` Problème : ${last.error}` : '';
  return `Dernière vérification ${fmtDateTime(last.at)} (${source}) : ${parts.join(', ')}.${error}`;
}

/** Paliers avant / après, quantité par quantité (pour le détail d'un changement). */
export function compareTiers(
  before: MpPriceTier[] | null | undefined,
  after: MpPriceTier[] | null | undefined
): Array<{ minQuantity: number; before: number | null; after: number | null }> {
  const qs = new Set<number>();
  for (const t of before || []) qs.add(t.minQuantity);
  for (const t of after || []) qs.add(t.minQuantity);
  const at = (tiers: MpPriceTier[] | null | undefined, q: number) =>
    tiers?.find((t) => t.minQuantity === q)?.price ?? null;
  return [...qs]
    .sort((a, b) => a - b)
    .map((q) => ({
      minQuantity: q,
      before: at(before, q),
      after: at(after, q),
    }));
}

/** Les « à revoir » d'abord (tous), puis l'historique (5 derniers, ou tout). */
export function splitChanges(
  changes: MpPriceChange[],
  showAll: boolean,
  keep = 5
): { pending: MpPriceChange[]; history: MpPriceChange[]; hidden: number } {
  const pending = changes.filter((c) => c.status === 'a_revoir');
  const rest = changes.filter((c) => c.status !== 'a_revoir');
  const history = showAll ? rest : rest.slice(0, keep);
  return { pending, history, hidden: rest.length - history.length };
}
