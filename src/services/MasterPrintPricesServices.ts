import ApiService from './ApiService';
import type {
  MpPriceChange,
  MpPricesOverview,
  MpProductPriceStatus,
} from '@/@types/masterPrintPrices';

/**
 * Prix d'achat Master Print des produits importés (Strapi REST, admin seulement :
 * JWT + rôle vérifiés dans le contrôleur). Jamais GraphQL.
 * Backend : peg_strapi `src/services/master-print-prices.service.ts`.
 */

const enc = encodeURIComponent;

/** Panneau « Prix d'achat » : dernière vérification, changements récents. */
export const apiGetMasterPrintPrices = () =>
  ApiService.fetchData<MpPricesOverview>({
    url: '/master-print/admin/prices',
    method: 'get',
  });

/** « Vérifier les prix maintenant » : la vérification tourne en arrière-plan. */
export const apiCheckMasterPrintPrices = () =>
  ApiService.fetchData<{ started: boolean; queued: boolean }>({
    url: '/master-print/admin/prices/check',
    method: 'post',
  });

/** Fiche produit admin : changement « à revoir » éventuel. */
export const apiGetMasterPrintProductPrices = (productDocumentId: string) =>
  ApiService.fetchData<MpProductPriceStatus>({
    url: `/master-print/admin/prices/products/${enc(productDocumentId)}`,
    method: 'get',
  });

export const apiApplyMasterPrintPriceChange = (id: number) =>
  ApiService.fetchData<{ change: MpPriceChange }>({
    url: `/master-print/admin/prices/changes/${enc(String(id))}/apply`,
    method: 'post',
  });

export const apiIgnoreMasterPrintPriceChange = (id: number) =>
  ApiService.fetchData<{ change: MpPriceChange }>({
    url: `/master-print/admin/prices/changes/${enc(String(id))}/ignore`,
    method: 'post',
  });
