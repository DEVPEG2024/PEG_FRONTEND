import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { RootState } from '@/store';
import { markAsRead, markAllAsRead } from '@/store/slices/base/notificationSlice';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/NotificationService';
import { HiBell } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import useNotifications from '@/utils/hooks/useNotifications';

const EVENT_ICONS: Record<string, string> = {
  new_order: '🛒',
  project_status_change: '📋',
  new_invoice: '🧾',
  new_ticket: '🎫',
  payment_received: '💳',
};

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useNotifications();

  const { unreadCount = 0, notifications = [] } = useAppSelector(
    (state: RootState) => state.base.notification ?? { unreadCount: 0, notifications: [] },
  );
  const userId = useAppSelector((state: RootState) => {
    const u = state.auth.user.user;
    return u?.documentId || u?.id || u?._id || null;
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      dispatch(markAsRead(id));
      markNotificationAsRead(id).catch(() => {});
    },
    [dispatch],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId) return;
    dispatch(markAllAsRead());
    markAllNotificationsAsRead(userId).catch(() => {});
  }, [dispatch, userId]);

  const handleClick = useCallback(
    (notif: any) => {
      if (!notif.read) handleMarkAsRead(notif._id);
      if (notif.link) navigate(notif.link);
      setOpen(false);
    },
    [handleMarkAsRead, navigate],
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notifications"
      >
        <HiBell className="text-xl text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Aucune notification
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => (
                <button
                  key={notif._id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                    !notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">
                    {EVENT_ICONS[notif.eventType] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
