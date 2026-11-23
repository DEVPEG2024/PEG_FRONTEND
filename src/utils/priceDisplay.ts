// Affichage des prix HT ou TTC selon le compte client (demande du 23/11/2026).
//
// Les associations (clubs sportifs…) ne récupèrent pas la TVA : elles doivent
// voir TOUS les prix de PEG directement en TTC. Règle :
//   - réglage de l'admin sur la fiche client (`customer.priceDisplay`) :
//     « ttc » ou « ht » l'emporte toujours ;
//   - vide (automatique) : TTC pour un secteur associatif (« Secteur associatif
//     et social », ou tout secteur dont le nom contient « associati… »), HT sinon.
// Seul l'AFFICHAGE change : prix, paliers, panier et paiement restent calculés
// en HT puis taxés une fois, comme avant (le montant débité est identique).
// ⚠️ Miroir de `services/price-display.ts` côté Strapi (chatbot) : garder les
// deux règles alignées.
import { fmtHT, fmtTTC, toTTC } from './priceHelpers';

/** Réglage de l'admin. `null`/absent = automatique (selon le secteur). */
export type PriceDisplayChoice = 'ttc' | 'ht';

export const PRICE_DISPLAY_CHOICES: PriceDisplayChoice[] = ['ttc', 'ht'];

const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Secteur dont les comptes voient le TTC d'office. */
export function isAssociationSector(sectorName?: string | null): boolean {
  return !!sectorName && normalize(sectorName).includes('associati');
}

export function customerSeesTTC(
  choice: PriceDisplayChoice | string | null | undefined,
  sectorName: string | null | undefined
): boolean {
  if (choice === 'ttc') return true;
  if (choice === 'ht') return false;
  return isAssociationSector(sectorName);
}

/**
 * Façon d'afficher un montant HT pour le compte connecté. Tous les écrans
 * reçoivent des montants HT (source de vérité) et passent par ici.
 */
export type PriceView = {
  ttc: boolean;
  /** « HT » ou « TTC » */
  label: 'HT' | 'TTC';
  /** Montant à afficher pour un montant HT (arrondi au centime). */
  amount: (ht: number) => number;
  /** « 12,00 € HT » ou « 14,40 € TTC » pour un montant HT. */
  fmt: (ht: number) => string;
};

const HT_VIEW: PriceView = {
  ttc: false,
  label: 'HT',
  amount: (ht) => ht,
  fmt: (ht) => fmtHT(ht),
};

const TTC_VIEW: PriceView = {
  ttc: true,
  label: 'TTC',
  amount: (ht) => toTTC(ht),
  fmt: (ht) => fmtTTC(toTTC(ht)),
};

export const priceView = (ttc: boolean): PriceView => (ttc ? TTC_VIEW : HT_VIEW);
