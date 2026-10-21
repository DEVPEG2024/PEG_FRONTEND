// Bulles d'activité du village. Ne relance pas la cloche : on suit seulement
// l'identifiant de la notification la plus récente (une valeur simple, pour ne
// pas redessiner le village à chaque passage du polling) et on relit la liste
// quand il change.
import { useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { useAppSelector, type RootState } from '@/store';
import {
  activityBubbles,
  liveNotifications,
  maxNotificationId,
  type VillageActivity,
} from './villageActivity';

/** Durée d'affichage d'une bulle. */
const BUBBLE_MS = 9_000;
/** Écart d'horloge toléré entre l'appareil et le serveur. */
const CLOCK_MARGIN_MS = 120_000;
const MAX_BUBBLES = 4;

const useVillageActivity = (onActivity?: () => void) => {
  const store = useStore<RootState>();
  const newestId = useAppSelector((s) =>
    String(s.base.notification?.notifications?.[0]?._id ?? '')
  );
  const [bubbles, setBubbles] = useState<VillageActivity[]>([]);
  const lastId = useRef<number | null>(null);
  const openedAt = useRef(Date.now());
  const timers = useRef<number[]>([]);
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  useEffect(() => {
    const list = store.getState().base.notification?.notifications ?? [];
    const top = maxNotificationId(list);
    if (lastId.current === null) {
      lastId.current = top;
      return;
    }
    const fresh = liveNotifications(
      list,
      lastId.current,
      openedAt.current - CLOCK_MARGIN_MS
    );
    lastId.current = Math.max(lastId.current, top);
    const next = activityBubbles(fresh, MAX_BUBBLES);
    if (!next.length) return;
    setBubbles((cur) =>
      [...next, ...cur.filter((b) => !next.some((n) => n.id === b.id))].slice(
        0,
        MAX_BUBBLES
      )
    );
    next.forEach((b) => {
      timers.current.push(
        window.setTimeout(
          () => setBubbles((cur) => cur.filter((x) => x.key !== b.key)),
          BUBBLE_MS
        )
      );
    });
    onActivityRef.current?.();
  }, [newestId, store]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    []
  );

  return bubbles;
};

export default useVillageActivity;
