import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAppSelector, useAppDispatch } from '@/store';
import { RootState } from '@/store';
import {
  addNotification,
  setUnreadCount,
  setNotifications,
} from '@/store/slices/base/notificationSlice';
import {
  fetchNotifications,
  fetchUnreadCount,
  subscribePush,
} from '@/services/NotificationService';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Express backend URL (without /api suffix)
const getBackendUrl = () => {
  const env = import.meta.env.VITE_API_ENDPOINT_URL;
  if (import.meta.env.DEV) return 'http://localhost:57002';
  return env ? `${env}` : 'https://peg-backend.vercel.app';
};

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

export default function useNotifications() {
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);

  const user = useAppSelector((state: RootState) => state.auth.user.user);
  const userId = user?._id ?? user?.id ?? user?.documentId ?? null;

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const [notifData, count] = await Promise.all([
        fetchNotifications(userId, 1, 20),
        fetchUnreadCount(userId),
      ]);
      if (notifData.notifications) {
        dispatch(setNotifications(notifData.notifications));
      }
      dispatch(setUnreadCount(count));
    } catch {
      // silent fail
    }
  }, [userId, dispatch]);

  // Connect Socket.io
  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    const socket = io(getBackendUrl(), {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('register', userId);
    });

    socket.on('notification', (notification) => {
      dispatch(addNotification(notification));
      toast.info(notification.title, {
        position: 'bottom-right',
        autoClose: 5000,
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, dispatch, loadNotifications]);

  // Register service worker + Web Push subscription
  useEffect(() => {
    if (!userId || !VAPID_PUBLIC_KEY || !('serviceWorker' in navigator)) return;

    async function registerPush() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userPushNotificationService: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          } as any);
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
        console.error('[useNotifications] Push registration failed:', err);
      }
    }

    registerPush();
  }, [userId]);

  return { loadNotifications };
}
