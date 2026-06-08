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
 * Garde anti-boucle : on ne recharge pas plus d'une fois toutes les 10 s.
 */

const RELOAD_GUARD_KEY = 'peg_version_reload_ts';
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

function safeReload(): void {
  const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
  if (Date.now() - last < 10_000) return; // évite les boucles de rechargement
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  window.location.reload();
}

function isChunkError(message: unknown): boolean {
  const msg = String(message ?? '');
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch dynamically|error loading dynamically imported module/i.test(
    msg,
  );
}

export function initAppVersionGuard(): void {
  // Inactif en dev (HMR, pas de déploiement) — uniquement utile en production.
  if (!import.meta.env.PROD) return;

  const loadedEntry = getLoadedEntry();

  // 1) Vite émet cet événement quand un import dynamique (lazy chunk) échoue → on recharge.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault?.();
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
