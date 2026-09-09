/* eslint-disable import/default */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')
import './index.css'
import { initAppVersionGuard } from './utils/appVersionGuard'

// Recharge l'app automatiquement après un nouveau déploiement (plus de hard refresh manuel).
initAppVersionGuard()

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Le navigateur émet « beforeinstallprompt » très tôt, souvent alors que
// l'utilisateur est sur /sign-in où PwaInstallPrompt n'est pas monté, et ne le
// rejoue jamais. Sans cette mémorisation au démarrage, le bouton « Installer »
// n'apparaissait plus jamais dès la deuxième visite.
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event as BeforeInstallPromptEvent
})
window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
})

export const getDeferredInstallPrompt = (): BeforeInstallPromptEvent | null =>
    deferredInstallPrompt

export const clearDeferredInstallPrompt = () => {
    deferredInstallPrompt = null
}

// Le service worker n'était enregistré que par des écrans réservés aux
// utilisateurs connectés : l'écran de connexion, le plus lourd, n'avait donc ni
// cache d'assets ni repli hors-ligne. register() sur le même scope est
// idempotent — le flux push de useNotifications continue de fonctionner.
if ('serviceWorker' in navigator) {
    const registerServiceWorker = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            /* worker indisponible : l'application fonctionne normalement */
        })
    }
    if (document.readyState === 'complete') {
        registerServiceWorker()
    } else {
        // Après « load » : ne pas disputer la bande passante au premier rendu.
        window.addEventListener('load', registerServiceWorker, { once: true })
    }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
