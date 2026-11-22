import ApiService from './ApiService';
import type { MpDashboard } from '@/@types/masterPrintDashboard';

/**
 * Tableau de bord Master Print : bilan des commandes (étapes, mois, marge, à
 * traiter) et du catalogue relié. Route REST admin (JWT + rôle vérifiés dans le
 * contrôleur). Backend : peg_strapi `src/services/master-print-dashboard.service.ts`.
 * L'état du compte, du service, du suivi automatique et des prix se lit sur leurs
 * routes existantes (MasterPrintServices, MasterPrintStatusServices,
 * MasterPrintOrdersServices, MasterPrintPricesServices).
 */
export const apiGetMasterPrintDashboard = () =>
  ApiService.fetchData<MpDashboard>({
    url: '/master-print/admin/dashboard',
    method: 'get',
    timeout: 45000,
  });
