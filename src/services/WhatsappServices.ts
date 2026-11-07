import ApiService from './ApiService';
import type {
  WhatsappConversation,
  WhatsappMessage,
  WhatsappPayView,
  WhatsappStatus,
} from '@/@types/whatsapp';

/**
 * Agent WhatsApp (Strapi, routes /api/whatsapp/*).
 *  - /whatsapp/admin/* : admin (JWT + rôle vérifiés dans le contrôleur)
 *  - /whatsapp/pay/*   : page de paiement, sans compte (jeton du lien)
 * Backend : peg_strapi `src/api/whatsapp/`, `src/services/whatsapp*.ts`.
 */

export const apiGetWhatsappStatus = () =>
  ApiService.fetchData<WhatsappStatus>({
    url: '/whatsapp/admin/status',
    method: 'get',
  });

export const apiGetWhatsappConversations = () =>
  ApiService.fetchData<{ conversations: WhatsappConversation[] }>({
    url: '/whatsapp/admin/conversations',
    method: 'get',
  });

export const apiGetWhatsappConversation = (id: number) =>
  ApiService.fetchData<{
    conversation: WhatsappConversation;
    messages: WhatsappMessage[];
  }>({ url: `/whatsapp/admin/conversations/${id}`, method: 'get' });

/** `queued` : plus de 24 h, le texte partira quand le contact aura répondu au message de reprise. */
export const apiReplyWhatsapp = (id: number, text: string) =>
  ApiService.fetchData<{ queued: boolean }>({
    url: `/whatsapp/admin/conversations/${id}/reply`,
    method: 'post',
    data: { text },
  });

export const apiMarkWhatsappRead = (id: number) =>
  ApiService.fetchData<{ ok: boolean }>({
    url: `/whatsapp/admin/conversations/${id}/read`,
    method: 'post',
  });

export const apiTakeOverWhatsapp = (id: number) =>
  ApiService.fetchData<{ ok: boolean }>({
    url: `/whatsapp/admin/conversations/${id}/takeover`,
    method: 'post',
  });

export const apiReleaseWhatsapp = (id: number) =>
  ApiService.fetchData<{ ok: boolean }>({
    url: `/whatsapp/admin/conversations/${id}/release`,
    method: 'post',
  });

export const apiDeleteWhatsappTest = (id: number) =>
  ApiService.fetchData<{ ok: boolean }>({
    url: `/whatsapp/admin/conversations/${id}`,
    method: 'delete',
  });

/** Essai : écrit comme le ferait un contact. Même chemin qu'un vrai message, rien ne part vers WhatsApp. */
export const apiSimulateWhatsapp = (data: {
  phone?: string;
  name?: string;
  text?: string;
  replyId?: string;
  attachment?: { url: string; name: string; mime: string; fileId?: number };
}) =>
  ApiService.fetchData<{ conversationId: number; phone: string }>({
    url: '/whatsapp/admin/simulate',
    method: 'post',
    data,
  });

export const apiGetWhatsappPay = (token: string) =>
  ApiService.fetchData<WhatsappPayView>({
    url: `/whatsapp/pay/${encodeURIComponent(token)}`,
    method: 'get',
  });

export const apiCreateWhatsappPaySession = (token: string) =>
  ApiService.fetchData<{
    id: string;
    clientSecret: string;
    totalHT: number;
    totalTTC: number;
  }>({
    url: `/whatsapp/pay/${encodeURIComponent(token)}/session`,
    method: 'post',
  });
