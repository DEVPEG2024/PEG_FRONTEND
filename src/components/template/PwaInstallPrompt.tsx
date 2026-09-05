import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MdClose, MdInstallMobile, MdIosShare, MdRefresh } from 'react-icons/md'
import useResponsive from '@/utils/hooks/useResponsive'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'peg_pwa_install_dismissed'
// Un refus met le bandeau en sommeil 90 jours : assez long pour ne pas harceler,
// assez court pour ne pas perdre definitivement l'acces a l'installation.
const DISMISS_DURATION = 1000 * 60 * 60 * 24 * 90
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 15

const isRecentlyDismissed = (): boolean => {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    return Date.now() - (Number(raw) || 0) < DISMISS_DURATION
  } catch {
    return false
  }
}

const rememberDismiss = () => {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* stockage indisponible (navigation privee) : on ne bloque pas */
  }
}

const isStandalone = (): boolean => {
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch {
    /* matchMedia indisponible */
  }
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

// Sur iOS, l'API beforeinstallprompt n'existe pas : seule une consigne visuelle
// est possible, et uniquement dans Safari (Chrome/Firefox iOS ne savent pas installer).
const isIosSafari = (): boolean => {
  const ua = window.navigator.userAgent
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Macintosh') && window.navigator.maxTouchPoints > 1)
  if (!ios) return false
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua)
}

const wrapStyle: CSSProperties = {
  position: 'fixed',
  left: '12px',
  bottom: 'calc(12px + var(--peg-safe-bottom, 0px))',
  width: 'min(420px, calc(100vw - 24px))',
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  fontFamily: 'Inter, sans-serif',
  pointerEvents: 'none',
}

const cardStyle: CSSProperties = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px',
  borderRadius: '14px',
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
  color: '#e8eefc',
}

const titleStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  lineHeight: 1.3,
}

const hintStyle: CSSProperties = {
  fontSize: '11.5px',
  lineHeight: 1.35,
  opacity: 0.72,
}

const actionStyle: CSSProperties = {
  flex: '0 0 auto',
  padding: '8px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(47,111,237,0.55)',
  background: 'rgba(47,111,237,0.28)',
  color: '#e8eefc',
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
}

const closeStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#e8eefc',
  opacity: 0.6,
  cursor: 'pointer',
}

const PwaInstallPrompt = () => {
  const { smaller } = useResponsive()
  const [canInstall, setCanInstall] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [updateHidden, setUpdateHidden] = useState(false)

  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadingRef = useRef(false)
  const lastCheckRef = useRef(0)

  // --- Invitation a installer -------------------------------------------------
  useEffect(() => {
    if (isStandalone() || isRecentlyDismissed()) return

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      deferredRef.current = event as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    const onInstalled = () => {
      deferredRef.current = null
      setCanInstall(false)
      setShowIosHint(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    if (isIosSafari()) setShowIosHint(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // --- Service worker : enregistrement + detection de nouvelle version --------
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    const watch = (registration: ServiceWorkerRegistration) => {
      // Un worker en attente alors qu'un worker controle deja la page
      // signifie qu'un nouveau build est pret a prendre la main.
      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true)
      }
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true)
          }
        })
      })
    }

    const onControllerChange = () => {
      if (!reloadingRef.current) return
      reloadingRef.current = false
      window.location.reload()
    }

    const checkForUpdate = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastCheckRef.current < UPDATE_CHECK_INTERVAL) return
      lastCheckRef.current = now
      registrationRef.current?.update().catch(() => {
        /* pas de reseau : on reessaiera */
      })
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (cancelled) return
        registrationRef.current = registration
        lastCheckRef.current = Date.now()
        watch(registration)
      })
      .catch(() => {
        /* worker indisponible : l'application fonctionne normalement */
      })

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', checkForUpdate)

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', checkForUpdate)
    }
  }, [])

  const install = useCallback(async () => {
    const event = deferredRef.current
    if (!event) return
    deferredRef.current = null
    setCanInstall(false)
    try {
      await event.prompt()
      await event.userChoice
    } catch {
      /* invitation deja consommee */
    }
  }, [])

  const dismissInstall = useCallback(() => {
    rememberDismiss()
    deferredRef.current = null
    setCanInstall(false)
    setShowIosHint(false)
  }, [])

  const applyUpdate = useCallback(() => {
    const registration = registrationRef.current
    reloadingRef.current = true
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      // Filet de securite si l'evenement controllerchange ne remonte pas.
      window.setTimeout(() => {
        if (reloadingRef.current) {
          reloadingRef.current = false
          window.location.reload()
        }
      }, 3000)
      return
    }
    reloadingRef.current = false
    window.location.reload()
  }, [])

  // Borné à < md comme le bandeau d'installation : le rendu desktop doit rester
  // rigoureusement identique à l'existant. Retirer « smaller.md » l'activerait
  // aussi sur ordinateur (utile contre les builds périmés, mais c'est un choix
  // produit à valider, pas un effet de bord du chantier mobile).
  const showUpdate = smaller.md && updateReady && !updateHidden
  const showInstall = smaller.md && (canInstall || showIosHint)

  if (!showUpdate && !showInstall) return null

  return (
    <div style={wrapStyle}>
      {showUpdate && (
        <div style={cardStyle} role="status">
          <MdRefresh size={20} style={{ flex: '0 0 auto', opacity: 0.85 }} />
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={titleStyle}>Nouvelle version disponible</div>
          </div>
          <button
            type="button"
            className="peg-tap-target"
            style={actionStyle}
            onClick={applyUpdate}
          >
            Recharger
          </button>
          <button
            type="button"
            className="peg-tap-target"
            style={closeStyle}
            aria-label="Fermer"
            onClick={() => setUpdateHidden(true)}
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      {showInstall && (
        <div style={cardStyle} role="status">
          <MdInstallMobile size={20} style={{ flex: '0 0 auto', opacity: 0.85 }} />
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={titleStyle}>Installer MyPEG</div>
            {canInstall ? (
              <div style={hintStyle}>Sur votre écran d&apos;accueil</div>
            ) : (
              <div style={hintStyle}>
                <MdIosShare size={13} style={{ verticalAlign: '-2px' }} /> Partager, puis
                «&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;»
              </div>
            )}
          </div>
          {canInstall && (
            <button
              type="button"
              className="peg-tap-target"
              style={actionStyle}
              onClick={install}
            >
              Installer
            </button>
          )}
          <button
            type="button"
            className="peg-tap-target"
            style={closeStyle}
            aria-label="Fermer"
            onClick={dismissInstall}
          >
            <MdClose size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default PwaInstallPrompt
