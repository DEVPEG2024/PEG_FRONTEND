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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
