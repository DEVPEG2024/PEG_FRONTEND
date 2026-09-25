import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import type { NotificationItem } from '@/store/slices/base/notificationSlice';

// Pastilles « du nouveau » : chaque section du menu écoute les notifications
// (state.base.notification, alimenté par le polling de la cloche) selon ses
// types d'événements. La pastille disparaît à la visite de la section
// (timestamp « vu » par chemin, stocké en localStorage).
export const NAV_ACTIVITY_EVENTS: Record<string, string[]> = {
  '/support': ['new_ticket'],
  '/common/projects': [
    'project_status_change',
    'new_comment',
    'new_file',
    'new_task',
    'task_status_change',
  ],
  '/admin/invoices': ['new_invoice', 'payment_received'],
  '/customer/invoices': ['new_invoice', 'payment_received'],
  '/admin/store/orders': ['new_order'],
  '/customer/files': ['new_file'],
  '/common/news': ['campaign'],
};
const ACTIVITY_SEEN_KEY = 'peg_nav_activity_seen';
// Plusieurs menus peuvent être montés en même temps (barre d'onglets + menu du
// téléphone) : chacun relit le stockage quand l'autre marque une section vue.
const ACTIVITY_SEEN_EVENT = 'peg:nav-activity-seen';
// Référence stable pour le sélecteur Redux (évite un re-rendu à chaque poll)
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

function getStoredActivitySeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_SEEN_KEY) || '{}');
  } catch {
    return {};
  }
}

const useNavActivity = () => {
  const location = useLocation();
  const notifications = useAppSelector(
    (state) => state.base?.notification?.notifications ?? EMPTY_NOTIFICATIONS
  );
  const [activitySeen, setActivitySeen] = useState<Record<string, string>>(
    getStoredActivitySeen
  );

  useEffect(() => {
    const sync = () => setActivitySeen(getStoredActivitySeen());
    window.addEventListener(ACTIVITY_SEEN_EVENT, sync);
    return () => window.removeEventListener(ACTIVITY_SEEN_EVENT, sync);
  }, []);

  const getActivityCount = (path: string): number => {
    const events = NAV_ACTIVITY_EVENTS[path];
    if (!events || notifications.length === 0) return 0;
    const lastSeen = activitySeen[path];
    return notifications.filter(
      (n) =>
        !n.read &&
        events.includes(n.eventType) &&
        (!lastSeen || n.createdAt > lastSeen)
    ).length;
  };

  const markActivitySeen = (path: string) => {
    if (!NAV_ACTIVITY_EVENTS[path]) return;
    const next = {
      ...activitySeen,
      ...getStoredActivitySeen(),
      [path]: new Date().toISOString(),
    };
    setActivitySeen(next);
    try {
      localStorage.setItem(ACTIVITY_SEEN_KEY, JSON.stringify(next));
    } catch {
      // stockage indisponible (navigation privée) : l'état en mémoire suffit
    }
    window.dispatchEvent(new Event(ACTIVITY_SEEN_EVENT));
  };

  // La section actuellement visitée est toujours considérée « vue »
  useEffect(() => {
    const path = Object.keys(NAV_ACTIVITY_EVENTS).find((p) =>
      location.pathname.startsWith(p)
    );
    if (path && getActivityCount(path) > 0) {
      markActivitySeen(path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, notifications]);

  return { getActivityCount, markActivitySeen };
};

export default useNavActivity;
