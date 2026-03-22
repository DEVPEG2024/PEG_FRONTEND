import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: '' }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log l'erreur dans la console pour le debug
    console.error('[ErrorBoundary] Erreur attrapée:', error)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
    this.setState({ errorInfo: info.componentStack || '' })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' })
  }

  render() {
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
                onClick={this.handleRetry}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/15 transition text-sm"
              >
                Réessayer
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
