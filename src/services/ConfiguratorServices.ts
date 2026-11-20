import ApiService from './ApiService';
import type {
  MpOfferAdmin,
  OfferClientConfig,
  OfferConfig,
  OfferOrderItemResult,
  OfferPriceResult,
  OfferSpec,
} from '@/@types/masterPrint';
import type { ShippingAddress } from '@/@types/checkout';

/**
 * Offres configurables (Strapi REST, JAMAIS GraphQL) — le prix est calculé par
 * le serveur à chaque changement, et la ligne de commande est créée par le
 * serveur au prix serveur : le navigateur ne fixe aucun montant.
 *  - client : `/configurator/:productDocumentId` (404 = produit ordinaire)
 *  - admin  : `/master-print/admin/offers/:productDocumentId` (réglages du formulaire)
 * Backend : peg_strapi `src/services/master-print-offer.service.ts`.
 */

const enc = encodeURIComponent;

export const apiGetConfigurator = (productDocumentId: string) =>
  ApiService.fetchData<{ productDocumentId: string; spec: OfferSpec }>({
    url: `/configurator/${enc(productDocumentId)}`,
    method: 'get',
  });

export const apiPriceConfigurator = (productDocumentId: string, config: OfferClientConfig) =>
  ApiService.fetchData<OfferPriceResult>({
    url: `/configurator/${enc(productDocumentId)}/price`,
    method: 'post',
    data: { config },
  });

export const apiCreateConfiguratorOrderItem = (
  productDocumentId: string,
  body: { config: OfferClientConfig; files: Record<string, number>; shipping?: ShippingAddress; chatConversationId?: string },
) =>
  ApiService.fetchData<OfferOrderItemResult>({
    url: `/configurator/${enc(productDocumentId)}/order-item`,
    method: 'post',
    data: body,
  });

export const apiGetMasterPrintOffer = (productDocumentId: string) =>
  ApiService.fetchData<MpOfferAdmin>({
    url: `/master-print/admin/offers/${enc(productDocumentId)}`,
    method: 'get',
  });

export const apiSaveMasterPrintOffer = (
  productDocumentId: string,
  body: { enabled: boolean; offer?: OfferConfig; productId?: string },
) =>
  ApiService.fetchData<MpOfferAdmin>({
    url: `/master-print/admin/offers/${enc(productDocumentId)}`,
    method: 'put',
    data: body,
  });
