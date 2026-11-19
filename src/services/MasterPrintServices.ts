import ApiService from './ApiService';
import type {
  MpAddress,
  MpCatalogItem,
  MpLineConfig,
  MpOrderView,
  MpPegProduct,
  MpPriceResult,
  MpProductMapping,
  MpProductView,
  MpProjectDraft,
  MpSendRequest,
  MpSimulateEvent,
  MpStatus,
} from '@/@types/masterPrint';

/**
 * Master Print — exécutant des projets (Strapi, routes REST /api/master-print/admin/*,
 * admin seulement : JWT + rôle vérifiés dans le contrôleur). Jamais GraphQL.
 * Le serveur ne renvoie jamais 401 pour un refus de Master Print (le front
 * déconnecterait l'admin) : 502/503 = Master Print, 4xx = configuration refusée.
 * Backend : peg_strapi `src/services/master-print.service.ts`.
 */

const enc = encodeURIComponent;

export const apiGetMasterPrintStatus = () =>
  ApiService.fetchData<MpStatus>({
    url: '/master-print/admin/status',
    method: 'get',
  });

export const apiGetMasterPrintProject = (documentId: string) =>
  ApiService.fetchData<MpProjectDraft>({
    url: `/master-print/admin/projects/${enc(documentId)}`,
    method: 'get',
  });

export const apiSearchMasterPrintCatalog = (q: string, category?: string) =>
  ApiService.fetchData<{ results: MpCatalogItem[]; total: number }>({
    url: '/master-print/admin/catalog',
    method: 'get',
    params: { q, ...(category ? { category } : {}) },
  });

export const apiGetMasterPrintProduct = (id: string) =>
  ApiService.fetchData<MpProductView>({
    url: `/master-print/admin/catalog/${enc(id)}`,
    method: 'get',
  });

/** Correspondance d'un produit PEG ; `productId` = produit Master Print que l'admin vient de choisir. */
export const apiGetMasterPrintMapping = (
  productDocumentId: string,
  productId?: string
) =>
  ApiService.fetchData<{
    pegProduct: MpPegProduct;
    mapping: MpProductMapping | null;
    proposed: boolean;
    product: MpProductView | null;
  }>({
    url: `/master-print/admin/mappings/${enc(productDocumentId)}`,
    method: 'get',
    params: productId ? { productId } : undefined,
  });

export const apiPriceMasterPrint = (
  documentId: string,
  lines: MpLineConfig[],
  shipping_address?: MpAddress
) =>
  ApiService.fetchData<MpPriceResult>({
    url: `/master-print/admin/projects/${enc(documentId)}/price`,
    method: 'post',
    data: { lines, shipping_address },
  });

/** Crée la commande ; les fichiers partent ensuite en arrière-plan (`order.uploading`). */
export const apiSendToMasterPrint = (documentId: string, data: MpSendRequest) =>
  ApiService.fetchData<{ order: MpOrderView; filesStarted: boolean }>({
    url: `/master-print/admin/projects/${enc(documentId)}/send`,
    method: 'post',
    data,
  });

export const apiRefreshMasterPrintOrder = (orderId: string) =>
  ApiService.fetchData<{ order: MpOrderView }>({
    url: `/master-print/admin/orders/${enc(orderId)}/refresh`,
    method: 'post',
  });

export const apiSendMasterPrintFiles = (
  orderId: string,
  files: Record<string, number>
) =>
  ApiService.fetchData<{ order: MpOrderView; filesStarted: boolean }>({
    url: `/master-print/admin/orders/${enc(orderId)}/files`,
    method: 'post',
    data: { files },
  });

export const apiCancelMasterPrintOrder = (orderId: string, reason: string) =>
  ApiService.fetchData<{ order: MpOrderView }>({
    url: `/master-print/admin/orders/${enc(orderId)}/cancel`,
    method: 'post',
    data: { reason },
  });

export const apiSimulateMasterPrintOrder = (
  orderId: string,
  event: MpSimulateEvent
) =>
  ApiService.fetchData<{ order: MpOrderView }>({
    url: `/master-print/admin/orders/${enc(orderId)}/simulate`,
    method: 'post',
    data: { event },
  });
