import { lazy, ComponentType } from 'react'
import { isChunkLoadError, reloadForStaleBuild } from './chunkLoadError'

/**
 * Wrapper around React.lazy that auto-reloads the page once
 * when a dynamic import fails (stale chunk after deploy).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(() =>
    importFn().catch((error: Error) => {
      // Anti-boucle partagé : plafond par fenêtre, une panne ne compte qu'une fois
      if (isChunkLoadError(error)) reloadForStaleBuild()

      throw error
    })
  )
}

export default lazyWithRetry
