// Données du village : toutes les lectures en parallèle, chacune isolée. On
// relit au retour sur l'onglet (au plus toutes les 2 minutes) et on suit le
// masquage des chiffres du tableau de bord (bouton œil de la vue classique).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '@/store';
import {
  DASHBOARD_FIGURES_EVENT,
  areDashboardFiguresHidden,
} from '../dashboardFigures';
import { buildVillageData, type RawVillage } from './villageData';
import { villageReaders } from './villageFetch';

const REFRESH_MS = 120_000;

const useVillageData = () => {
  const userDocumentId = useAppSelector(
    (state) => state.auth.user?.user?.documentId
  );
  const [raw, setRaw] = useState<RawVillage | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(areDashboardFiguresHidden);
  const lastLoad = useRef(0);
  const alive = useRef(true);

  const load = useCallback(async () => {
    lastLoad.current = Date.now();
    const results = await Promise.allSettled(
      villageReaders(userDocumentId).map((read) => read())
    );
    const merged: RawVillage = {};
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
    };
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
  return { data, loading };
};

export default useVillageData;
