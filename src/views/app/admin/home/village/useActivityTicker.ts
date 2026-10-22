// Le fil de la ville (PEG DISTRICTS) : toutes les quelques secondes, une
// activité récente de la cloche (48 h) apparaît au-dessus de son bâtiment,
// avec son âge. Le store est lu à chaque tour : le polling de la cloche ne
// redessine pas la ville.
import { useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import type { RootState } from '@/store';
import { recentActivity, type RecentActivity } from './villageActivity';

/** Une bulle toutes les … ms (elle s'efface juste avant la suivante). */
export const TICK_MS = 5_200;

const useActivityTicker = (enabled: boolean) => {
  const store = useStore<RootState>();
  const [shown, setShown] = useState<{
    item: RecentActivity;
    turn: number;
  } | null>(null);
  const turn = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setShown(null);
      return undefined;
    }
    const tick = () => {
      const list = store.getState().base.notification?.notifications ?? [];
      const recent = recentActivity(list, Date.now());
      if (!recent.length) {
        setShown(null);
        return;
      }
      turn.current += 1;
      setShown({
        item: recent[(turn.current - 1) % recent.length],
        turn: turn.current,
      });
    };
    const first = window.setTimeout(tick, 1_800);
    const every = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [enabled, store]);

  return shown;
};

export default useActivityTicker;
