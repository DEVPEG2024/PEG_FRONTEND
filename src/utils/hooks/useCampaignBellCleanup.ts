import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { removeNotification } from '@/store/slices/base/notificationSlice';
import { deleteNotification } from '@/services/NotificationService';
import { apiKnownCampaigns } from '@/services/CampaignServices';

/**
 * Cloche : retire les notifications de campagnes supprimées ou retirées par
 * l'admin. Les notifications vivent dans peg-backend (propres à chaque compte) :
 * c'est le navigateur de chaque client qui fait le ménage, à l'affichage, via la
 * suppression qu'il a déjà le droit de faire sur SES notifications.
 * Chaque notification n'est vérifiée qu'une fois ; rien n'est retiré si la
 * vérification échoue.
 */
export default function useCampaignBellCleanup() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((s) => s.base.notification?.notifications ?? []);
  const checked = useRef(new Set<string>());
  const unavailable = useRef(false);

  useEffect(() => {
    if (unavailable.current) return;
    const pending = notifications.filter(
      (n) => n.eventType === 'campaign' && !checked.current.has(n._id) && Number(n.metadata?.campaignId) > 0,
    );
    if (!pending.length) return;
    const t = setTimeout(async () => {
      const ids = Array.from(new Set(pending.map((n) => Number(n.metadata.campaignId))));
      try {
        const res = await apiKnownCampaigns(ids);
        const existing = new Set((res.data.existing || []).map(Number));
        for (const n of pending) {
          checked.current.add(n._id);
          if (existing.has(Number(n.metadata.campaignId))) continue;
          dispatch(removeNotification(n._id));
          deleteNotification(n._id).catch(() => { /* réessayé à la prochaine visite */ });
        }
      } catch (e: any) {
        // Serveur sans cette route : on n'insiste pas. Autre erreur : nouvel essai au prochain rendu.
        if ([404, 405].includes(e?.response?.status)) unavailable.current = true;
      }
    }, 800);
    return () => clearTimeout(t);
  }, [notifications, dispatch]);
}
