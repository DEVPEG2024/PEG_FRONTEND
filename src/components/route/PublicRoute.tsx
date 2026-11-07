import { Navigate, Outlet, useLocation } from 'react-router-dom'
import appConfig from '@/configs/app.config'
import useAuth from '@/utils/hooks/useAuth'

const { authenticatedEntryPath } = appConfig

const PublicRoute = () => {
    const { authenticated } = useAuth()
    const { pathname } = useLocation()

    // Lien « réinitialiser » de l'e-mail, ouvert sur un appareil encore connecté :
    // sans cette exception, le client retombait sur l'accueil sans voir le formulaire.
    // Même chose pour le lien de paiement reçu sur WhatsApp : il s'ouvre connecté ou non.
    if (authenticated && pathname !== '/reset-password' && !pathname.startsWith('/paiement/')) {
        return <Navigate to={authenticatedEntryPath} />
    }
    return <Outlet />
}

export default PublicRoute
