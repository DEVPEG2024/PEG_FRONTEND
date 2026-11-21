import ApiService from './ApiService';
import type {
  MpOrdersFilter,
  MpOrdersPage,
  MpWebhooksOverview,
} from '@/@types/masterPrintOrders';

/**
 * Page admin « Commandes Master Print » : liste fusionnée (Master Print + PEG),
 * facture d'achat PDF, suivi automatique. Routes REST admin (JWT + rôle vérifiés
 * dans le contrôleur) ; jamais 401 pour un refus de Master Print.
 * Backend : peg_strapi `src/services/master-print-orders.service.ts`.
 */

const enc = encodeURIComponent;

export const apiGetMasterPrintOrders = (params: {
  filter: MpOrdersFilter;
  q?: string;
  offset?: number;
  limit?: number;
  refresh?: boolean;
}) =>
  ApiService.fetchData<MpOrdersPage>({
    url: '/master-print/admin/orders',
    method: 'get',
    params: {
      filter: params.filter,
      ...(params.q ? { q: params.q } : {}),
      offset: params.offset ?? 0,
      limit: params.limit ?? 25,
      ...(params.refresh ? { refresh: 1 } : {}),
    },
  });

/** Facture d'achat Master Print d'une commande (PDF, relayé par le serveur). */
export const apiGetMasterPrintInvoice = (orderId: string) =>
  ApiService.fetchData<Blob>({
    url: `/master-print/admin/orders/${enc(orderId)}/invoice`,
    method: 'get',
    responseType: 'blob',
    timeout: 45000,
  });

export const apiGetMasterPrintWebhooks = () =>
  ApiService.fetchData<MpWebhooksOverview>({
    url: '/master-print/admin/webhooks',
    method: 'get',
  });

/**
 * (Ré)abonne CE serveur aux notifications Master Print (route existante) : seul
 * l'abonnement de la même adresse est remplacé, les autres serveurs ne bougent pas.
 */
export const apiSubscribeMasterPrintWebhook = () =>
  ApiService.fetchData<{ url: string; created: boolean }>({
    url: '/master-print/admin/webhook',
    method: 'post',
    data: { force: true },
  });
