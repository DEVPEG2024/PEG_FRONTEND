import ApiService from './ApiService';
import type { MpLineConfig } from '@/@types/masterPrint';
import type {
  MpCategoriesResponse,
  MpQuoteCheck,
  MpQuoteView,
} from '@/@types/masterPrintQuote';

/**
 * Master Print — devis d'achat (prix bloqué 15 jours) et catégories du
 * catalogue. Routes REST admin (JWT + rôle vérifiés dans le contrôleur).
 * Backend : peg_strapi `master-print-quotes.service.ts`,
 * `master-print-categories.service.ts`.
 */

const enc = encodeURIComponent;

/** Dernier devis d'achat du projet (environnement de la clé en service). */
export const apiGetMasterPrintQuote = (projectDocumentId: string) =>
  ApiService.fetchData<{ quote: MpQuoteView | null }>({
    url: `/master-print/admin/projects/${enc(projectDocumentId)}/quote`,
    method: 'get',
  });

/** « Bloquer le prix d'achat (15 jours) » : devis Master Print sur ces lignes. */
export const apiCreateMasterPrintQuote = (
  projectDocumentId: string,
  lines: MpLineConfig[]
) =>
  ApiService.fetchData<MpQuoteCheck>({
    url: `/master-print/admin/projects/${enc(projectDocumentId)}/quote`,
    method: 'post',
    data: { lines },
  });

/** Le devis s'appliquerait-il à ces lignes ? (aucun appel à Master Print) */
export const apiCheckMasterPrintQuote = (
  projectDocumentId: string,
  lines: MpLineConfig[]
) =>
  ApiService.fetchData<MpQuoteCheck>({
    url: `/master-print/admin/projects/${enc(projectDocumentId)}/quote/check`,
    method: 'post',
    data: { lines },
  });

/** Catégories du catalogue Master Print (libellés, nombre de produits) et rangement mémorisé. */
export const apiGetMasterPrintCategories = () =>
  ApiService.fetchData<MpCategoriesResponse>({
    url: '/master-print/admin/mp-categories',
    method: 'get',
  });
