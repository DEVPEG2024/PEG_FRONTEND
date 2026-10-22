/**
 * Détection des erreurs de « build périmé » : après un déploiement, un onglet ouvert réclame des
 * chunks JS hashés qui n'existent plus. Module sans dépendance (ni `import.meta`) pour être
 * partagé par appVersionGuard, l'ErrorBoundary et lazyWithRetry — et testable sous Jest.
 *
 * Voir aussi scripts/keep-previous-assets.mjs : chaque build de production republie les chunks
 * de la version précédente, un onglet resté ouvert ne tombe donc plus sur un fichier absent.
 */

const CHUNK_ERROR_RE =
  /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch dynamically|error loading dynamically imported module|Loading chunk|Loading CSS chunk|Unable to preload CSS/i;

// Un import dynamique résolu à `undefined` au lieu du module : React.lazy lit alors `.default`
// sur rien. C'est la signature d'un chunk périmé (voir le commentaire de `vite:preloadError`).
const LAZY_UNDEFINED_RE = /reading 'default'|undefined is not an object \(evaluating '[^']*\.default'\)/;

/**
 * Erreur due à un build périmé (chunk introuvable après un déploiement) — messages Chrome, Safari
 * et Firefox. Partagé par l'ErrorBoundary et lazyWithRetry : une seule définition.
 */
export function isChunkLoadError(error: unknown): boolean {
  const err = error as { message?: string; name?: string } | null | undefined;
  const message = String(err?.message ?? '');
  return err?.name === 'ChunkLoadError' || CHUNK_ERROR_RE.test(message) || LAZY_UNDEFINED_RE.test(message);
}

// ---------------------------------------------------------------------------
// Rechargement après un build périmé — UN SEUL garde partagé par appVersionGuard, lazyWithRetry
// et l'ErrorBoundary.
//
// Incident du 24/09/2026 (« Failed to fetch dynamically imported module … ModernLayout ») : chaque
// appelant avait son propre anti-boucle « une fois par 30 s ». Un second échec dans la fenêtre
// (mises en ligne rapprochées, réseau instable) n'était plus rechargé et l'utilisateur restait
// sur l'écran d'erreur. Désormais : jusqu'à MAX_STALE_RELOADS rechargements par fenêtre, et une
// même panne signalée par plusieurs appelants ne compte qu'une fois.
// ---------------------------------------------------------------------------

const STALE_RELOAD_LOG_KEY = 'peg_stale_build_reloads';
export const MAX_STALE_RELOADS = 4;
export const STALE_RELOAD_WINDOW_MS = 3 * 60_000;

/**
 * Attente avant chaque rechargement d'une même fenêtre. Le premier est immédiat : un onglet
 * resté sur l'ancienne version se répare en un rechargement. Les suivants s'espacent pour
 * couvrir la minute où, pendant une mise en ligne, la nouvelle version peut réclamer des
 * fichiers que le CDN ne sert pas encore. Incident du 22/10/2026 : trois rechargements
 * immédiats, tous dans cette minute, puis « Connexion instable » alors que la version en ligne
 * était saine quelques instants plus tard.
 */
export const STALE_RELOAD_BACKOFF_MS = [0, 4_000, 15_000, 40_000];

let reloadInFlight = false;

function readReloadLog(now: number): number[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STALE_RELOAD_LOG_KEY) || '[]');
    return Array.isArray(raw)
      ? raw.filter((t): t is number => typeof t === 'number' && now - t < STALE_RELOAD_WINDOW_MS)
      : [];
  } catch {
    return [];
  }
}

/**
 * Recharge la page pour récupérer le dernier build. Renvoie `false` seulement si le plafond de
 * rechargements est atteint (vraie panne, pas un build périmé) : l'appelant affiche alors un
 * message avec un bouton plutôt que de boucler.
 */
export function reloadForStaleBuild(): boolean {
  if (reloadInFlight) return true;
  const now = Date.now();
  const log = readReloadLog(now);
  if (log.length >= MAX_STALE_RELOADS) return false;
  const delay = STALE_RELOAD_BACKOFF_MS[log.length] ?? 0;
  log.push(now);
  try {
    sessionStorage.setItem(STALE_RELOAD_LOG_KEY, JSON.stringify(log));
  } catch {
    /* stockage indisponible (navigation privée) : on recharge quand même */
  }
  reloadInFlight = true;
  // Pendant l'attente, l'ErrorBoundary affiche « Mise à jour de l'application… ».
  if (delay > 0) window.setTimeout(() => window.location.reload(), delay);
  else window.location.reload();
  return true;
}
