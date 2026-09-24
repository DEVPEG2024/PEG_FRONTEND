import { Component, ErrorInfo, ReactNode } from 'react'
import { isChunkLoadError, reloadForStaleBuild } from '@/utils/chunkLoadError'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string
  // Build périmé : rechargement en cours (true) ou plafond atteint (false)
  staleReloading: boolean
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: '', staleReloading: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log l'erreur dans la console pour le debug
    console.error('[ErrorBoundary] Erreur attrapée:', error)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
    this.setState({ errorInfo: info.componentStack || '' })

    // Build périmé (après une mise en ligne) : on recharge, anti-boucle partagé
    if (isChunkLoadError(error)) {
      this.setState({ staleReloading: reloadForStaleBuild() })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '', staleReloading: false })
  }

  render() {
    if (this.state.hasError && isChunkLoadError(this.state.error)) {
      // Jamais le message technique (« Failed to fetch dynamically imported module… ») :
      // c'est une mise à jour, pas une panne. Pendant le rechargement → écran d'attente ;
      // plafond atteint (réseau vraiment coupé) → message clair + bouton.
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8 max-w-md">
            {this.state.staleReloading ? (
              <>
                <h2 className="text-xl font-semibold mb-2">Mise à jour de l'application…</h2>
                <p className="text-gray-500">Une nouvelle version est disponible, chargement en cours.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">Connexion instable</h2>
                <p className="text-gray-500 mb-4">La page n'a pas pu se charger. Vérifiez votre connexion puis réessayez.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Réessayer
                </button>
              </>
            )}
          </div>
        </div>
      )
    }
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Une erreur est survenue</h2>
            <p className="text-gray-500 mb-4">Veuillez rafraîchir la page</p>
            {this.state.error && (
              <p className="text-xs text-red-400/60 mb-4 font-mono bg-red-500/5 rounded-lg p-3 text-left overflow-auto max-h-24">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { window.location.href = '/' }}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/15 transition text-sm"
              >
                Retour à l'accueil
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Rafraîchir la page
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
