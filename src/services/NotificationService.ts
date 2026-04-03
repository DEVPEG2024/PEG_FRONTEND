import store from '@/store';
import { PERSIST_STORE_NAME } from '@/constants/app.constant';
import deepParseJson from '@/utils/deepParseJson';
import ApiService from './ApiService';
import { API_GRAPHQL_URL } from '@/configs/api.config';

const BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : '/peg-api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const rawPersistData = localStorage.getItem(PERSIST_STORE_NAME);
    const persistData = deepParseJson(rawPersistData);
    let token = (persistData as any)?.auth?.session?.token;
    if (!token) {
      token = store.getState().auth.session.token;
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
    cachedAdminIds = (res.data?.data?.usersPermissionsUsers_connection?.nodes || [])
      .map((n: any) => n.documentId)
      .filter(Boolean);
    return cachedAdminIds;
  } catch {
    return [];
  }
}

/** Trigger a notification from the frontend (for Strapi-based actions that bypass Express controllers) */
export async function triggerNotification(data: {
  eventType: string;
  recipients?: { userId: string; email?: string }[];
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  notifyAdmins?: boolean;
  senderId: string;
}) {
  try {
    const payload: any = { ...data };
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
