import ApiService from './ApiService';
import type { MpCatalogStock, OfferStock } from '@/@types/offerStock';

/**
 * Stock du textile (Strapi REST, jamais GraphQL) — ajout 20/11/2026.
 *  - client : `/configurator/:productDocumentId/stock` (chemin neutre)
 *  - admin  : `/master-print/admin/catalog/:id/stock` (fiche du Catalogue Master Print)
 * Backend : peg_strapi `src/services/master-print-stock.service.ts`.
 */

const enc = encodeURIComponent;

export const apiGetConfiguratorStock = (productDocumentId: string) =>
  ApiService.fetchData<OfferStock>({
    url: `/configurator/${enc(productDocumentId)}/stock`,
    method: 'get',
  });

export const apiGetMasterPrintCatalogStock = (id: string) =>
  ApiService.fetchData<MpCatalogStock>({
    url: `/master-print/admin/catalog/${enc(id)}/stock`,
    method: 'get',
  });
