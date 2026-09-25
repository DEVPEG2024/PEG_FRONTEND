import { useCallback, useEffect, useState } from 'react';
import {
  apiGetDashboardPhoto,
  apiRemoveDashboardPhoto,
  apiUploadDashboardPhoto,
} from '@/services/UserService';
import { shrinkImage } from '@/utils/imageShrink';
import { env } from '@/configs/env.config';

/*
 * Photo de fond de l'accueil téléphone, que l'utilisateur téléverse lui-même
 * (routes /auth/dashboard-photo, rattachée à son compte : elle le suit sur
 * tous ses appareils). Gardée aussi sur l'appareil pour s'afficher dès
 * l'ouverture, puis relue auprès du serveur.
 * Serveur sans ces routes (pas encore déployé) ou hors ligne : `available`
 * reste faux, le bouton photo ne s'affiche pas, rien d'autre ne change.
 */

const CACHE_PREFIX = 'peg:dashboardPhoto:';
// Même plafond que la bannière du tableau de bord admin : l'image est réduite
// dans le navigateur avant l'envoi (≈ 2 Mo), le serveur n'en voit jamais 30.
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

const absolute = (url: string) =>
  /^(https?:|blob:|data:)/.test(url)
    ? url
    : (env?.API_ENDPOINT_URL ?? '') + url;

// Attendre que la nouvelle photo soit chargée avant de l'afficher : pas de
// fond vide entre l'aperçu local et l'image enregistrée.
const preload = (url: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { error?: { message?: string } } } })?.response
    ?.data?.error?.message || fallback;

export type DashboardPhoto = {
  url: string | null;
  available: boolean;
  busy: boolean;
  error: string | null;
  choose: (file: File) => Promise<void>;
  remove: () => Promise<void>;
};

export default function useDashboardPhoto(userKey?: string): DashboardPhoto {
  const cacheKey = userKey ? CACHE_PREFIX + userKey : null;
  const [url, setUrl] = useState<string | null>(() => {
    try {
      return cacheKey ? localStorage.getItem(cacheKey) : null;
    } catch {
      return null;
    }
  });
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remember = useCallback(
    (next: string | null) => {
      setUrl(next);
      if (!cacheKey) return;
      try {
        if (next) localStorage.setItem(cacheKey, next);
        else localStorage.removeItem(cacheKey);
      } catch {
        // stockage plein ou indisponible : la photo s'affichera après la relecture
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    if (!cacheKey) return;
    let live = true;
    apiGetDashboardPhoto()
      .then((saved) => {
        if (!live) return;
        setAvailable(true);
        remember(saved ? absolute(saved) : null);
      })
      .catch(() => {
        // Route absente ou réseau coupé : on garde ce que l'appareil connaît
      });
    return () => {
      live = false;
    };
  }, [cacheKey, remember]);

  const choose = async (picked: File) => {
    if (picked.size > MAX_INPUT_BYTES) {
      setError('Image trop lourde : 30 Mo maximum.');
      return;
    }
    let file: File;
    try {
      file = await shrinkImage(picked);
    } catch {
      setError('Image illisible : choisissez une photo JPG, PNG ou WebP.');
      return;
    }
    setError(null);
    setBusy(true);
    const previous = url;
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    try {
      const saved = await apiUploadDashboardPhoto(file);
      if (saved) await preload(absolute(saved));
      remember(saved ? absolute(saved) : null);
    } catch (e) {
      setUrl(previous);
      setError(
        errorMessage(e, "La photo n'a pas pu être enregistrée. Réessayez.")
      );
    } finally {
      URL.revokeObjectURL(preview);
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      await apiRemoveDashboardPhoto();
      remember(null);
    } catch (e) {
      setError(errorMessage(e, "La photo n'a pas pu être retirée. Réessayez."));
    } finally {
      setBusy(false);
    }
  };

  return { url, available, busy, error, choose, remove };
}
