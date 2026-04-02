const BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : '/peg-api';

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
  const res = await fetch(`${BASE}/notifications/${userId}?${params}`);
  return res.json();
}

export async function fetchUnreadCount(userId: string) {
  const res = await fetch(`${BASE}/notifications/${userId}/unread-count`);
  const data = await res.json();
  return data.count as number;
}

export async function markNotificationAsRead(id: string) {
  const res = await fetch(`${BASE}/notifications/${id}/read`, { method: 'PATCH' });
  return res.json();
}

export async function markAllNotificationsAsRead(userId: string) {
  const res = await fetch(`${BASE}/notifications/${userId}/read-all`, { method: 'PATCH' });
  return res.json();
}

export async function deleteNotification(id: string) {
  const res = await fetch(`${BASE}/notifications/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchPreferences(userId: string) {
  const res = await fetch(`${BASE}/notifications/preferences/${encodeURIComponent(userId)}`);
  return res.json();
}

export async function updatePreferences(userId: string, preferences: any) {
  const res = await fetch(`${BASE}/notifications/preferences/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences }),
  });
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
