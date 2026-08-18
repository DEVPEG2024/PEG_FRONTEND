import store from '@/store';
import { getPersistedAuthToken } from '@/store/tabSessionStorage';
import ApiService from './ApiService';
import { API_GRAPHQL_URL } from '@/configs/api.config';

const BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : '/peg-api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    // Store Redux d'abord (session de CET onglet), puis persistance par onglet.
    // L'ancien ordre lisait le localStorage PARTAGÉ en priorité : les
    // notifications pouvaient partir avec le token d'un autre onglet (admin).
    let token = store.getState().auth.session.token;
    if (!token) {
      token = getPersistedAuthToken();
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // no token available
  }
  return headers;
}

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
  const res = await fetch(
    `${BASE}/notifications/${encodeURIComponent(userId)}?${params}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchUnreadCount(userId: string) {
  const res = await fetch(
    `${BASE}/notifications/${encodeURIComponent(userId)}/unread-count`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.count as number;
}

export async function markNotificationAsRead(id: string) {
  const res = await fetch(`${BASE}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function markAllNotificationsAsRead(userId: string) {
  const res = await fetch(
    `${BASE}/notifications/${encodeURIComponent(userId)}/read-all`,
    { method: 'PATCH', headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteNotification(id: string) {
  const res = await fetch(`${BASE}/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAllNotifications(userId: string) {
  const res = await fetch(
    `${BASE}/notifications/${encodeURIComponent(userId)}/all`,
    { method: 'DELETE', headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPreferences(userId: string) {
  const res = await fetch(
    `${BASE}/notifications/preferences/${encodeURIComponent(userId)}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updatePreferences(userId: string, preferences: Record<string, { push: boolean; email: boolean }>) {
  const res = await fetch(
    `${BASE}/notifications/preferences/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
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
  const res = await fetch(`${BASE}/notifications/subscribe`, {
    method: 'POST',
    headers: getAuthHeaders(),
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
    const res = await fetch(`${BASE}/notifications/trigger`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('[triggerNotification] failed:', err);
  }
}
