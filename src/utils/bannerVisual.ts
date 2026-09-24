// Bannières : quelle image montrer sur ordinateur, laquelle sur téléphone.
//
// Chaque bannière du module (client, catégorie, NEW CUSTOMER, catalogue,
// projets, offres) porte une image principale (`image`) et, depuis le
// 25/09/2026, une image dédiée au téléphone (`mobileImage`, facultative).

import type { StrapiImage } from './strapiImage';

export type BannerImage = StrapiImage & {
  documentId?: string;
  name?: string;
  height?: number | null;
};

export type BannerVisual = {
  documentId?: string;
  name?: string | null;
  image?: BannerImage | null;
  mobileImage?: BannerImage | null;
};

/**
 * Format conseillé de l'image téléphone. Une bannière client type fait
 * 2836 × 442 px : affichée entière sur un téléphone de 402 px, elle ne mesurait
 * que 63 px de haut. 1280 × 600, à la même largeur, est TROIS FOIS plus haute
 * (demande Nova du 25/09/2026).
 */
export const MOBILE_BANNER_WIDTH = 1280;
export const MOBILE_BANNER_HEIGHT = 600;
export const MOBILE_BANNER_FORMAT = `${MOBILE_BANNER_WIDTH} × ${MOBILE_BANNER_HEIGHT} px`;

const hasUrl = (img?: BannerImage | null): img is BannerImage => !!img?.url;

/**
 * Image affichée sur ordinateur : la première bannière de la chaîne (par ordre
 * de priorité) qui a une image principale.
 */
export function pickDesktopImage(
  chain: (BannerVisual | null | undefined)[]
): BannerImage | null {
  for (const banner of chain) {
    if (hasUrl(banner?.image)) return banner!.image!;
  }
  return null;
}

export type PhoneBannerImage = {
  image: BannerImage;
  /** true : image pensée pour le téléphone ; false : image d'ordinateur à caser. */
  dedicated: boolean;
};

/**
 * Image affichée sur téléphone : la première bannière de la chaîne qui a une
 * image, quelle qu'elle soit — sa version téléphone si elle existe, sinon son
 * image principale. On ne saute PAS la bannière propre d'un client au profit
 * d'une version téléphone générique plus bas dans la chaîne : son identité
 * visuelle prime.
 */
export function pickPhoneImage(
  chain: (BannerVisual | null | undefined)[]
): PhoneBannerImage | null {
  for (const banner of chain) {
    if (hasUrl(banner?.mobileImage)) return { image: banner!.mobileImage!, dedicated: true };
    if (hasUrl(banner?.image)) return { image: banner!.image!, dedicated: false };
  }
  return null;
}
