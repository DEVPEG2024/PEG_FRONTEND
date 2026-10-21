// Données du village : le résumé du serveur en un appel, puis les lectures
// qu'il ne couvre pas (toutes, s'il est indisponible), chacune isolée. On
// relit au retour sur l'onglet (au plus toutes les 2 minutes), peu après une
// nouvelle activité, et on suit le masquage des chiffres du tableau de bord
// (bouton œil de la vue classique).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '@/store';
import {
  DASHBOARD_FIGURES_EVENT,
  areDashboardFiguresHidden,
} from '../dashboardFigures';
import { buildVillageData, type RawVillage } from './villageData';
import { fetchVillageSummary, villageReaders } from './villageFetch';

const REFRESH_MS = 120_000;
/** Après une notification : relecture groupée, au plus une toutes les 20 s. */
const ACTIVITY_REFRESH_GAP_MS = 20_000;

const useVillageData = () => {
  const userDocumentId = useAppSelector(
    (state) => state.auth.user?.user?.documentId
  );
  const [raw, setRaw] = useState<RawVillage | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(areDashboardFiguresHidden);
  const lastLoad = useRef(0);
  const alive = useRef(true);
  const refreshTimer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    lastLoad.current = Date.now();
    // Un appel au serveur pour presque tout ; le reste (ou tout, si la route
    // n'existe pas encore) est relu ici, domaine par domaine.
    const summary = await fetchVillageSummary();
    const readers = villageReaders(userDocumentId).filter(
      (r) => !summary || r.keys.some((k) => summary[k] === undefined)
    );
    const results = await Promise.allSettled(readers.map((r) => r.read()));
    const merged: RawVillage = { ...summary };
    results.forEach((r) => {
      if (r.status === 'fulfilled') Object.assign(merged, r.value);
      else console.warn('[Village] lecture impossible :', r.reason);
    });
    if (!alive.current) return;
    setRaw(merged);
    setLoading(false);
  }, [userDocumentId]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      window.clearTimeout(refreshTimer.current);
    };
  }, [load]);

  /** Relit les données peu après une nouvelle activité (appels groupés). */
  const refresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current);
    const wait = Math.max(
      2_500,
      lastLoad.current + ACTIVITY_REFRESH_GAP_MS - Date.now()
    );
    refreshTimer.current = window.setTimeout(load, wait);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastLoad.current > REFRESH_MS
      )
        load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  useEffect(() => {
    const onFigures = () => setHidden(areDashboardFiguresHidden());
    window.addEventListener(DASHBOARD_FIGURES_EVENT, onFigures);
    return () => window.removeEventListener(DASHBOARD_FIGURES_EVENT, onFigures);
  }, []);

  const data = useMemo(
    () => (raw ? buildVillageData(raw, new Date(), hidden) : null),
    [raw, hidden]
  );
  return { data, loading, refresh };
};

export default useVillageData;
