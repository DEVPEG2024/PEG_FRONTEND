import { lazy, ComponentType } from 'react'

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
      const isChunkError =
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('Loading CSS chunk') ||
        error.name === 'ChunkLoadError'

      if (isChunkError) {
        const reloadKey = 'chunk-reload-' + window.location.pathname
        const lastReload = sessionStorage.getItem(reloadKey)
        const now = Date.now()

        // Avoid infinite reload loops: only reload once per path per 30s
        if (!lastReload || now - Number(lastReload) > 30_000) {
          sessionStorage.setItem(reloadKey, String(now))
          window.location.reload()
        }
      }

      throw error
    })
  )
}

export default lazyWithRetry
