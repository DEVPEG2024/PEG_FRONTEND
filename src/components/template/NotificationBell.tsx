import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { RootState } from '@/store';
import {
  markAsRead,
  markAllAsRead,
  removeNotification,
  removeAllNotifications,
} from '@/store/slices/base/notificationSlice';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/services/NotificationService';
import { HiBell } from 'react-icons/hi';
import { HiOutlineTrash, HiOutlineCheck, HiOutlineCheckCircle } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import useNotifications from '@/utils/hooks/useNotifications';
import { fmtPrice } from '@/utils/priceHelpers';

const EVENT_ICONS: Record<string, string> = {
  new_order: '🛒',
  project_status_change: '📋',
  new_invoice: '🧾',
  new_ticket: '🎫',
  payment_received: '💳',
  new_comment: '💬',
  new_file: '📎',
  new_task: '✅',
  task_status_change: '🔄',
};

const EVENT_COLORS: Record<string, string> = {
  new_order: 'bg-orange-100 dark:bg-orange-900/30',
  project_status_change: 'bg-blue-100 dark:bg-blue-900/30',
  new_invoice: 'bg-green-100 dark:bg-green-900/30',
  new_ticket: 'bg-purple-100 dark:bg-purple-900/30',
  payment_received: 'bg-emerald-100 dark:bg-emerald-900/30',
  new_comment: 'bg-indigo-100 dark:bg-indigo-900/30',
  new_file: 'bg-cyan-100 dark:bg-cyan-900/30',
  new_task: 'bg-teal-100 dark:bg-teal-900/30',
  task_status_change: 'bg-amber-100 dark:bg-amber-900/30',
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
  if (days < 30) return `Il y a ${days}j`;
  const months = Math.floor(days / 30);
  return `Il y a ${months} mois`;
}

function getMetadataPreview(notif: { eventType: string; metadata?: Record<string, any>; message: string }) {
  const meta = notif.metadata;
  if (!meta) return notif.message;

  switch (notif.eventType) {
    case 'payment_received':
    case 'new_order':
      if (meta.amount) return `${notif.message} — ${fmtPrice(Number(meta.amount))}`;
      return notif.message;
    case 'project_status_change':
      if (meta.newState) {
        const stateLabels: Record<string, string> = {
          pending: 'En attente', waiting: 'En cours', fulfilled: 'Terminé',
          canceled: 'Annulé', completed: 'Livré', sav: 'SAV',
        };
        return `${notif.message} → ${stateLabels[meta.newState] || meta.newState}`;
      }
      return notif.message;
    default:
      return notif.message;
  }
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { loadMore } = useNotifications();

  const {
    unreadCount = 0,
    notifications = [],
    hasMore = false,
    page = 1,
    connectionStatus = 'disconnected',
  } = useAppSelector(
    (state: RootState) => state.base.notification ?? {
      unreadCount: 0, notifications: [], hasMore: false, page: 1, connectionStatus: 'disconnected',
    },
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
        setConfirmDeleteAll(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el || !open) return;

    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && hasMore) {
        loadMore(page + 1);
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [open, hasMore, page, loadMore]);

  const handleMarkAsRead = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      dispatch(markAsRead(id));
      markNotificationAsRead(id).catch((err) =>
        console.warn('[NotificationBell] markAsRead failed:', err),
      );
    },
    [dispatch],
  );

  const handleMarkAllAsRead = useCallback(() => {
    if (!userId) return;
    dispatch(markAllAsRead());
    markAllNotificationsAsRead(userId).catch((err) =>
      console.warn('[NotificationBell] markAllAsRead failed:', err),
    );
  }, [dispatch, userId]);

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(removeNotification(id));
      deleteNotification(id).catch((err) =>
        console.warn('[NotificationBell] delete failed:', err),
      );
    },
    [dispatch],
  );

  const handleDeleteAll = useCallback(() => {
    if (!userId) return;
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      return;
    }
    dispatch(removeAllNotifications());
    deleteAllNotifications(userId).catch((err) =>
      console.warn('[NotificationBell] deleteAll failed:', err),
    );
    setConfirmDeleteAll(false);
  }, [dispatch, userId, confirmDeleteAll]);

  const handleClick = useCallback(
    (notif: any) => {
      if (!notif.read) {
        dispatch(markAsRead(notif._id));
        markNotificationAsRead(notif._id).catch(() => {});
      }
      if (notif.link) navigate(notif.link);
      setOpen(false);
    },
    [dispatch, navigate],
  );

  const connectionIndicator = connectionStatus === 'connected'
    ? 'bg-green-400'
    : connectionStatus === 'polling'
      ? 'bg-yellow-400'
      : 'bg-red-400';

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); setConfirmDeleteAll(false); }}
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notifications"
      >
        <HiBell className={`text-xl text-gray-600 dark:text-gray-300 transition-transform ${unreadCount > 0 ? 'animate-[bellShake_0.5s_ease-in-out]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* Connection status dot */}
        <span className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full ${connectionIndicator} border border-white dark:border-gray-800`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-[fadeInDown_0.15s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <HiOutlineCheckCircle className="text-sm" />
                  <span>Tout lu</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors ${
                    confirmDeleteAll
                      ? 'text-red-600 bg-red-50 dark:bg-red-900/20 font-medium'
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                  title={confirmDeleteAll ? 'Confirmer la suppression' : 'Tout supprimer'}
                >
                  <HiOutlineTrash className="text-sm" />
                  <span>{confirmDeleteAll ? 'Confirmer ?' : 'Tout supprimer'}</span>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div ref={listRef} className="max-h-[420px] overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm text-gray-400 dark:text-gray-500">Aucune notification</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                  Vous serez notifié des nouvelles activités ici
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleClick(notif)}
                  className={`group relative w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer transition-all duration-150 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
                    !notif.read
                      ? 'bg-blue-50/60 dark:bg-blue-900/15 hover:bg-blue-50 dark:hover:bg-blue-900/25'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {/* Icon badge */}
                  <span className={`text-lg mt-0.5 flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg ${EVENT_COLORS[notif.eventType] || 'bg-gray-100 dark:bg-gray-700'}`}>
                    {EVENT_ICONS[notif.eventType] || '🔔'}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {getMetadataPreview(notif)}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif._id, e)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Marquer comme lu"
                      >
                        <HiOutlineCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notif._id, e)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Supprimer"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Load more indicator */}
            {hasMore && (
              <div className="px-4 py-3 text-center">
                <span className="text-xs text-gray-400">Chargement...</span>
              </div>
            )}
          </div>

          {/* Footer — connection status */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connectionIndicator}`} />
              <span className="text-[10px] text-gray-400">
                {connectionStatus === 'connected' && 'Temps réel'}
                {connectionStatus === 'polling' && 'Actualisation auto (5s)'}
                {connectionStatus === 'disconnected' && 'Déconnecté'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
