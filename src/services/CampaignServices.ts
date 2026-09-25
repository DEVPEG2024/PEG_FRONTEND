import ApiService from './ApiService';
import type {
  AudienceDirectory,
  AudiencePreview,
  Campaign,
  CampaignAudience,
  CampaignInput,
  CampaignListItem,
  CampaignRecipient,
  CampaignsOverview,
  CampaignStats,
  CampaignTimeline,
  ClientCampaign,
  OpenChannel,
} from '@/@types/campaign';

/**
 * Campagnes clients (Strapi, routes /api/campaigns/*).
 *  - /campaigns/admin/* : admin (JWT + rôle vérifiés dans le contrôleur)
 *  - /campaigns/me/*    : compte connecté (ses campagnes reçues uniquement)
 * Backend : peg_strapi `src/api/campaign/`, `src/services/campaign.service.ts`.
 */

type Ok<T> = { result: boolean; message?: string } & T;

// ── Admin ────────────────────────────────────────────────────────────────────

export const apiGetCampaigns = () =>
  ApiService.fetchData<Ok<{ campaigns: CampaignListItem[]; overview: CampaignsOverview; sandbox: boolean; emailConfigured: boolean }>>({
    url: '/campaigns/admin',
    method: 'get',
  });

export const apiGetCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}`, method: 'get' });

export const apiCreateCampaign = (data: CampaignInput) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: '/campaigns/admin', method: 'post', data });

export const apiUpdateCampaign = (id: number, data: CampaignInput) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}`, method: 'put', data });

export const apiDeleteCampaign = (id: number) =>
  ApiService.fetchData<Ok<object>>({ url: `/campaigns/admin/${id}`, method: 'delete' });

/** `sendAt` futur → programmée ; sinon envoi immédiat (en tâche de fond). */
export const apiSendCampaign = (id: number, sendAt: string | null) =>
  ApiService.fetchData<Ok<{ scheduled: boolean; recipients: number; campaign: Campaign }>>({
    url: `/campaigns/admin/${id}/send`,
    method: 'post',
    data: { sendAt },
  });

export const apiUnscheduleCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/unschedule`, method: 'post' });

export const apiSendCampaignTest = (id: number) =>
  ApiService.fetchData<Ok<{ test: { bell: boolean; email: 'sent' | 'failed' | 'skipped' | 'noemail'; emailError: string | null; to: string | null } }>>({
    url: `/campaigns/admin/${id}/test`,
    method: 'post',
  });

/** `unopened` : relance ciblée sur les comptes qui n'ont pas ouvert la campagne. */
export const apiDuplicateCampaign = (id: number, mode: 'copy' | 'unopened' = 'copy') =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/duplicate`, method: 'post', data: { mode } });

export const apiArchiveCampaign = (id: number, archived: boolean) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/archive`, method: 'post', data: { archived } });

/** Retire une campagne envoyée des pop-ups et des Actualités des clients. */
export const apiWithdrawCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/withdraw`, method: 'post' });

export const apiGetCampaignStats = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign; stats: CampaignStats; timeline: CampaignTimeline | null; sandbox: boolean }>>({
    url: `/campaigns/admin/${id}/stats`,
    method: 'get',
  });

export const apiGetCampaignRecipients = (id: number) =>
  ApiService.fetchData<Ok<{ recipients: CampaignRecipient[] }>>({ url: `/campaigns/admin/${id}/recipients`, method: 'get' });

export const apiGetAudienceDirectory = () =>
  ApiService.fetchData<Ok<AudienceDirectory>>({ url: '/campaigns/admin/directory', method: 'get' });

export const apiPreviewAudience = (audience: CampaignAudience) =>
  ApiService.fetchData<Ok<{ audience: AudiencePreview }>>({ url: '/campaigns/admin/audience', method: 'post', data: { audience } });

export const apiPreviewCampaignEmail = (data: CampaignInput) =>
  ApiService.fetchData<Ok<{ html: string }>>({ url: '/campaigns/admin/preview-email', method: 'post', data });

// ── Compte connecté ──────────────────────────────────────────────────────────

export const apiGetMyCampaigns = () =>
  ApiService.fetchData<Ok<{ campaigns: ClientCampaign[]; popups: ClientCampaign[]; unread: number }>>({
    url: '/campaigns/me',
    method: 'get',
  });

export const apiGetMyCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: ClientCampaign }>>({ url: `/campaigns/me/${id}`, method: 'get' });

export const apiTrackCampaign = (id: number, kind: 'open' | 'click' | 'dismiss', channel: OpenChannel) =>
  ApiService.fetchData<Ok<object>>({ url: `/campaigns/me/${id}/track`, method: 'post', data: { kind, channel } });
