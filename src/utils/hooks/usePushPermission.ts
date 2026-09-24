import { useEffect, useState } from 'react';
import { isPushSupported, PUSH_PERMISSION_EVENT } from '@/utils/webPush';

export type PushPermission = NotificationPermission | 'unsupported';

const readPermission = (): PushPermission =>
  isPushSupported() ? Notification.permission : 'unsupported';

/**
 * Autorisation de notifier sur cet appareil, tenue à jour : après une demande
 * depuis l'app, et au retour dans l'app (l'utilisateur a pu la changer dans
 * les réglages du téléphone).
 */
const usePushPermission = (): PushPermission => {
  const [permission, setPermission] = useState<PushPermission>(readPermission);

  useEffect(() => {
    const sync = () => setPermission(readPermission());
    window.addEventListener(PUSH_PERMISSION_EVENT, sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener(PUSH_PERMISSION_EVENT, sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return permission;
};

export default usePushPermission;
