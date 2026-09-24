/**
 * Détection des erreurs de « build périmé » : après un déploiement, un onglet ouvert réclame des
 * chunks JS hashés qui n'existent plus. Module sans dépendance (ni `import.meta`) pour être
 * partagé par appVersionGuard, l'ErrorBoundary et lazyWithRetry — et testable sous Jest.
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
