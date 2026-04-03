import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAppSelector, useAppDispatch } from '@/store';
import { RootState } from '@/store';
import {
  addNotification,
  setUnreadCount,
  setNotifications,
  appendNotifications,
  setConnectionStatus,
} from '@/store/slices/base/notificationSlice';
import {
  fetchNotifications,
  fetchUnreadCount,
  subscribePush,
} from '@/services/NotificationService';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

const BACKEND_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://peg-backend.vercel.app';

// Socket.io activé en dev uniquement — le backend Express est sur Vercel serverless (pas de WebSocket)
const SOCKET_ENABLED = import.meta.env.DEV;

const POLL_INTERVAL = 5_000;
const RECONNECT_DELAY = 5_000;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    gain.gain.value = 0.3;

    // Two-tone chime
    osc.frequency.value = 880;
    osc.start(ctx.currentTime);
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not supported or blocked by browser
  }
}

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

export default function useNotifications() {
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUnreadRef = useRef<number | null>(null);

  const user = useAppSelector((state: RootState) => state.auth.user.user);
  const userId = user?.documentId || user?.id || user?._id || null;

  const loadNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!userId) return;
    try {
      const [notifData, count] = await Promise.all([
        fetchNotifications(userId, page, limit),
        fetchUnreadCount(userId),
      ]);
      if (page === 1) {
        if (notifData.notifications) {
          dispatch(setNotifications(notifData.notifications));
        }
      } else {
        dispatch(appendNotifications({
          notifications: notifData.notifications || [],
          hasMore: notifData.notifications?.length === limit,
        }));
      }
      // Play sound when unread count increases (polling mode)
      if (lastUnreadRef.current !== null && count > lastUnreadRef.current) {
        playNotificationSound();
      }
      lastUnreadRef.current = count;
      dispatch(setUnreadCount(count));
    } catch (err) {
      console.warn('[useNotifications] Failed to load notifications:', err);
    }
  }, [userId, dispatch]);

  const loadMore = useCallback((page: number) => {
    return loadNotifications(page, 20);
  }, [loadNotifications]);

  // Socket.io + polling
  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    if (SOCKET_ENABLED) {
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: RECONNECT_DELAY,
      });

      socket.on('connect', () => {
        socket.emit('register', userId);
        dispatch(setConnectionStatus('connected'));
      });

      socket.on('notification', (notification) => {
        dispatch(addNotification(notification));
        playNotificationSound();
        const icon = EVENT_ICONS[notification.eventType] || '🔔';
        toast.info(`${icon} ${notification.title}`, {
          position: 'bottom-right',
          autoClose: 5000,
        });
      });

      socket.on('disconnect', () => {
        dispatch(setConnectionStatus('disconnected'));
      });

      socket.on('reconnect', () => {
        socket.emit('register', userId);
        dispatch(setConnectionStatus('connected'));
        loadNotifications();
      });

      socket.on('connect_error', () => {
        dispatch(setConnectionStatus('disconnected'));
      });

      socketRef.current = socket;
    } else {
      // Production: polling fallback
      dispatch(setConnectionStatus('polling'));
      pollRef.current = setInterval(() => loadNotifications(), POLL_INTERVAL);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      dispatch(setConnectionStatus('disconnected'));
    };
  }, [userId, dispatch, loadNotifications]);

  // Register service worker + Web Push subscription
  useEffect(() => {
    if (!userId || !VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

    let cancelled = false;

    async function registerPush() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          } as PushSubscriptionOptionsInit);
        }

        const subJson = subscription.toJSON();
        await subscribePush({
          userId: userId!,
          type: 'web',
          endpoint: subJson.endpoint!,
          keys: {
            p256dh: subJson.keys!.p256dh!,
            auth: subJson.keys!.auth!,
          },
        });
      } catch (err) {
        console.warn('[useNotifications] Push registration failed:', err);
      }
    }

    registerPush();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { loadNotifications, loadMore };
}
