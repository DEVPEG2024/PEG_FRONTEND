import ApiService from './ApiService';

/** État de Master Print vu par le serveur (sonde /status + vrais appels récents). Admin seulement. */
export type MpServiceStatus = {
  ok: boolean;
  degraded: boolean;
  configured: boolean;
  message: string;
  checkedAt: string;
  lastFailureAt: string | null;
};

/** Backend : peg_strapi `src/services/master-print-status.service.ts`. */
export const apiGetMasterPrintServiceStatus = () =>
  ApiService.fetchData<MpServiceStatus>({
    url: '/master-print/admin/service-status',
    method: 'get',
  });
