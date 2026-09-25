/**
 * Expédition d'un projet — format de la route Strapi dédiée
 * `/api/shipping/projects/:documentId` (peg_strapi `src/services/shipping-text.ts`).
 * Le résumé (« Expédié le 2 oct. · Colissimo »), le lien de suivi et la liste des
 * transporteurs sont fournis par le serveur : une seule source.
 */
export type ShippingCarrier =
  | 'colissimo'
  | 'chronopost'
  | 'dpd'
  | 'gls'
  | 'ups'
  | 'dhl'
  | 'fedex_tnt'
  | 'peg_delivery'
  | 'pickup';

export type ProjectShipping = {
  shipped: boolean;
  shippedAt: string | null;
  carrier: ShippingCarrier | null;
  carrierLabel: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  pickup: boolean;
  summary: string | null;
};

export type ShippingCarrierOption = {
  value: ShippingCarrier;
  label: string;
  tracking: boolean;
};

export type ShippingDelivery =
  | 'sent'
  | 'failed'
  | 'sandbox'
  | 'skipped'
  | 'noemail';

export type GetProjectShippingResponse = {
  result: true;
  shipping: ProjectShipping;
  canEdit: boolean;
  carriers?: ShippingCarrierOption[];
};

export type MarkProjectShippedRequest = {
  carrier: ShippingCarrier;
  trackingNumber?: string | null;
  shippedAt?: string | null; /* AAAA-MM-JJ */
};

export type MarkProjectShippedResponse = {
  result: true;
  shipping: ProjectShipping;
  notified: { bell: ShippingDelivery; email: ShippingDelivery };
};
