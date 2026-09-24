/**
 * appVersionGuard — évite à l'utilisateur d'avoir à faire un "hard refresh" après un déploiement.
 *
 * Problème résolu : sur une SPA Vite, après un nouveau build, un onglet déjà ouvert (ou un
 * index.html servi depuis le cache mémoire) référence d'anciens chunks JS hashés qui n'existent
 * plus sur Vercel. Le lazy-import échoue → écran cassé → l'utilisateur doit recharger à la main.
 *
 * Stratégie :
 *  1. Échec de chargement d'un chunk (build périmé) → rechargement automatique immédiat.
 *  2. Détection proactive d'une nouvelle version déployée (hash du script d'entrée dans /index.html)
 *     → rechargement quand l'onglet est en arrière-plan ou au retour sur l'onglet, sans interrompre
 *     un travail en cours.
 *
 * Garde anti-boucle : reloadForStaleBuild (chunkLoadError.ts), partagé avec l'ErrorBoundary.
 */

import { isChunkLoadError, reloadForStaleBuild } from './chunkLoadError';

const POLL_INTERVAL_MS = 60_000;

/** Hash du script d'entrée actuellement exécuté (la version que l'utilisateur fait tourner). */
function getLoadedEntry(): string | null {
  const el = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
  return el?.getAttribute('src') ?? null;
}

/** Hash du script d'entrée actuellement déployé (lu sur le réseau, sans cache). */
async function getDeployedEntry(): Promise<string | null> {
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

// Anti-boucle partagé (chunkLoadError.ts) : plafond de rechargements par fenêtre, dédoublonné.
function safeReload(): void {
  reloadForStaleBuild();
}

function isChunkError(message: unknown): boolean {
  return isChunkLoadError({ message: String(message ?? '') });
}

export function initAppVersionGuard(): void {
  // Inactif en dev (HMR, pas de déploiement) — uniquement utile en production.
  if (!import.meta.env.PROD) return;

  const loadedEntry = getLoadedEntry();

  // 1) Vite émet cet événement quand un import dynamique (lazy chunk) échoue → on recharge.
  // ⚠️ NE PAS appeler event.preventDefault() : pour Vite, cela signifie « erreur traitée » et
  // l'import dynamique se résout alors à `undefined` au lieu d'échouer. React.lazy plante sur
  // « Cannot read properties of undefined (reading 'default') » et, si l'anti-boucle bloque le
  // rechargement, l'utilisateur reste sur l'écran d'erreur. On laisse l'erreur remonter :
  // l'ErrorBoundary la reconnaît et recharge.
  window.addEventListener('vite:preloadError', () => {
    safeReload();
  });

  // 2) Filet de sécurité : erreurs/rejets de chargement de module non interceptés par Vite.
  window.addEventListener('error', (e) => {
    if (isChunkError((e as ErrorEvent)?.message)) safeReload();
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (isChunkError((e as PromiseRejectionEvent)?.reason?.message)) safeReload();
  });

  // 3) Détection proactive d'une nouvelle version.
  const checkVersion = async (reloadIfChanged: boolean) => {
    const deployed = await getDeployedEntry();
    if (loadedEntry && deployed && deployed !== loadedEntry && reloadIfChanged) {
      safeReload();
    }
    return loadedEntry && deployed ? deployed !== loadedEntry : false;
  };

  // Au retour sur l'onglet : si une nouvelle version est en ligne, on recharge (moment naturel).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersion(true);
  });

  // En tâche de fond : on ne recharge automatiquement que si l'onglet est masqué (pas d'interruption).
  setInterval(() => {
    if (document.hidden) checkVersion(true);
  }, POLL_INTERVAL_MS);
}
