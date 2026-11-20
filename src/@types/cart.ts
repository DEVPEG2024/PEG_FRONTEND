import { FormAnswer } from './formAnswer';
import { Product, SizeAndColorSelection } from './product';
import type { OfferClientConfig, OfferPrice, OfferUploadedFile } from './masterPrint';

/**
 * Article composé dans le formulaire d'une offre configurable : sa configuration,
 * ses visuels, et le prix CALCULÉ PAR LE SERVEUR (remise Premium comprise). La
 * ligne de commande est créée par le serveur au paiement, à son prix serveur.
 */
export type CartConfigurator = {
  config: OfferClientConfig;
  files: Record<string, OfferUploadedFile>;
  price: OfferPrice;
  summary: string;
};

export type CartItem = {
  id: string;
  product: Product;
  formAnswer: FormAnswer;
  sizeAndColors: SizeAndColorSelection[];
  orderItemDocumentId?: string;
  userDocumentId: string;
  /** BAT du produit approuvé sur la fiche avant l'ajout (produit « BAT requis »). */
  batApproved?: boolean;
  /** Conversation du chat d'où vient l'article (offre de l'assistant) → order-item, clôture du chat. */
  chatConversationId?: string;
  /** Offre configurable : prix et configuration venus du serveur (sizeAndColors = affichage seulement). */
  configurator?: CartConfigurator;
};
