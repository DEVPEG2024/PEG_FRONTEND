import ApiService from './ApiService';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { pegBackendFetch } from './PegBackendClient';

// Toutes les routes /notifications/* de peg-backend exigent le JWT Strapi :
// `pegBackendFetch` l'ajoute (store Redux de l'onglet, puis persistance par onglet).

export async function fetchNotifications(
  userId: string,
  page = 1,
  limit = 20,
  unreadOnly = false,
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(unreadOnly ? { unreadOnly: 'true' } : {}),
  });
  const res = await pegBackendFetch(
    `/notifications/${encodeURIComponent(userId)}?${params}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchUnreadCount(userId: string) {
  const res = await pegBackendFetch(
    `/notifications/${encodeURIComponent(userId)}/unread-count`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.count as number;
}

export async function markNotificationAsRead(id: string) {
  const res = await pegBackendFetch(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function markAllNotificationsAsRead(userId: string) {
  const res = await pegBackendFetch(
    `/notifications/${encodeURIComponent(userId)}/read-all`,
    { method: 'PATCH' },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteNotification(id: string) {
  const res = await pegBackendFetch(`/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAllNotifications(userId: string) {
  const res = await pegBackendFetch(
    `/notifications/${encodeURIComponent(userId)}/all`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPreferences(userId: string) {
  const res = await pegBackendFetch(
    `/notifications/preferences/${encodeURIComponent(userId)}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updatePreferences(userId: string, preferences: Record<string, { push: boolean; email: boolean }>) {
  const res = await pegBackendFetch(
    `/notifications/preferences/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function subscribePush(data: {
  userId: string;
  type: 'web' | 'expo';
  endpoint?: string;
  keys?: { p256dh: string; auth: string };
  expoPushToken?: string;
}) {
  const res = await pegBackendFetch('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Fetch admin documentIds from Strapi (cached for the session) */
let cachedAdminIds: string[] | null = null;
async function getAdminIds(): Promise<string[]> {
  if (cachedAdminIds) return cachedAdminIds;
  try {
    const res = await ApiService.fetchData<any>({
      url: API_GRAPHQL_URL,
      method: 'post',
      data: {
        query: `{
          usersPermissionsUsers_connection(
            pagination: { limit: 100 }
            filters: { role: { name: { in: ["admin", "super_admin"] } } }
          ) {
            nodes { documentId }
          }
        }`
      }
    });
    if (res.data?.errors?.length) {
      console.error('[Notifications] Erreurs GraphQL getAdminIds:', res.data.errors);
    }
    const nodes = res.data?.data?.usersPermissionsUsers_connection?.nodes || [];
    const ids = nodes.map((n: any) => n.documentId).filter(Boolean);
    // Ne pas mettre en cache un résultat vide : sinon les admins ne seraient
    // jamais notifiés du reste de la session après un échec ponctuel.
    if (ids.length === 0) return [];
    cachedAdminIds = ids;
    return ids;
  } catch (error) {
    console.error('[Notifications] Échec récupération des admins:', error);
    return [];
  }
}

/** Résout une fiche client (customer.documentId) vers les documentId des
 * users rattachés. Les notifications sont stockées et pollées par
 * user.documentId : une notification adressée au customer.documentId ne
 * serait jamais lue. Cache par client, résultat vide non mis en cache. */
const cachedCustomerUserIds = new Map<string, string[]>();
async function getCustomerUserIds(customerDocumentId: string): Promise<string[]> {
  const cached = cachedCustomerUserIds.get(customerDocumentId);
  if (cached) return cached;
  try {
    const res = await ApiService.fetchData<any>({
      url: API_GRAPHQL_URL,
      method: 'post',
      data: {
        query: `query CustomerUsers($documentId: ID!) {
          usersPermissionsUsers_connection(
            pagination: { limit: 100 }
            filters: { customer: { documentId: { eq: $documentId } } }
          ) {
            nodes { documentId }
          }
        }`,
        variables: { documentId: customerDocumentId },
      },
    });
    if (res.data?.errors?.length) {
      console.error('[Notifications] Erreurs GraphQL getCustomerUserIds:', res.data.errors);
    }
    const nodes = res.data?.data?.usersPermissionsUsers_connection?.nodes || [];
    const ids = nodes.map((n: any) => n.documentId).filter(Boolean);
    if (ids.length === 0) return [];
    cachedCustomerUserIds.set(customerDocumentId, ids);
    return ids;
  } catch (error) {
    console.error('[Notifications] Échec résolution des users du client:', error);
    return [];
  }
}

/** Trigger a notification from the frontend (for Strapi-based actions that bypass Express controllers) */
export async function triggerNotification(data: {
  eventType: string;
  recipients?: { userId: string; email?: string }[];
  /** documentId de la fiche client à notifier — résolu en user.documentId
   * des comptes rattachés (repli : la fiche brute si la résolution échoue). */
  customerRecipient?: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  notifyAdmins?: boolean;
  senderId: string;
}) {
  try {
    const { customerRecipient, ...rest } = data;
    const payload: any = { ...rest };
    if (customerRecipient) {
      const userIds = await getCustomerUserIds(customerRecipient);
      const customerRecipients = (userIds.length > 0 ? userIds : [customerRecipient])
        .map((userId) => ({ userId }));
      payload.recipients = [...(rest.recipients ?? []), ...customerRecipients];
    }
    if (data.notifyAdmins) {
      payload.adminIds = await getAdminIds();
    }
    const res = await pegBackendFetch('/notifications/trigger', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('[triggerNotification] failed:', err);
  }
}
