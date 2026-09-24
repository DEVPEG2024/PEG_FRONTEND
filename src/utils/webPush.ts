import { subscribePush } from '@/services/NotificationService';

// Notifications push (Web Push) de cet appareil : autorisation + abonnement.
// Utilisé par useNotifications (synchronisation silencieuse), le bandeau
// d'activation du téléphone (PwaInstallPrompt) et Réglages → Notifications.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/** Émis quand l'autorisation change depuis l'app (les écrans se remettent à jour). */
export const PUSH_PERMISSION_EVENT = 'peg:push-permission';

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

export const isPushSupported = (): boolean =>
  !!VAPID_PUBLIC_KEY &&
  'serviceWorker' in navigator &&
  'Notification' in window &&
  'PushManager' in window;

export const isAppleMobile = (): boolean => {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  );
};

/**
 * Safari (iPhone, iPad, Mac) n'ouvre la demande d'autorisation qu'à la suite
 * d'un geste de l'utilisateur : appelée au chargement de la page, elle est
 * ignorée sans rien afficher. Sur iPhone, les notifications n'arrivaient donc
 * jamais. Ailleurs (Chrome, Edge, Firefox, Android) la demande à l'ouverture
 * fonctionne et reste le comportement historique.
 */
export const permissionNeedsGesture = (): boolean => {
  const ua = navigator.userAgent;
  const safari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Android|FxiOS/.test(ua);
  return isAppleMobile() || safari;
};

/** Abonne cet appareil (autorisation déjà accordée) et l'enregistre côté serveur. */
export async function subscribeThisDevice(userId: string): Promise<void> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    } as PushSubscriptionOptionsInit);
  }
  const subJson = subscription.toJSON();
  await subscribePush({
    userId,
    type: 'web',
    endpoint: subJson.endpoint!,
    keys: {
      p256dh: subJson.keys!.p256dh!,
      auth: subJson.keys!.auth!,
    },
  });
}

/**
 * Demande l'autorisation puis abonne l'appareil. Sur iPhone, à appeler
 * DIRECTEMENT depuis un toucher : `requestPermission` part avant tout `await`.
 */
export async function enablePush(
  userId: string
): Promise<NotificationPermission> {
  const permission = await Notification.requestPermission();
  try {
    if (permission === 'granted') await subscribeThisDevice(userId);
  } finally {
    window.dispatchEvent(new Event(PUSH_PERMISSION_EVENT));
  }
  return permission;
}
