import ApiService from './ApiService';
import type { DeliveryEstimate } from '@/utils/deliveryEstimate';

/**
 * Date d'expédition prévue d'un produit (Strapi REST, chemin client neutre).
 * 404 = produit non concerné : rien n'est affiché. 503 = service momentanément
 * indisponible. Backend : peg_strapi `src/services/master-print-delays.service.ts`.
 */
export const apiGetDeliveryEstimate = (productDocumentId: string) =>
  ApiService.fetchData<DeliveryEstimate>({
    url: `/configurator/${encodeURIComponent(productDocumentId)}/delivery`,
    method: 'get',
  });
