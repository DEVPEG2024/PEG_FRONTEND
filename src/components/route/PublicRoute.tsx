import { Navigate, Outlet, useLocation } from 'react-router-dom'
import appConfig from '@/configs/app.config'
import useAuth from '@/utils/hooks/useAuth'

const { authenticatedEntryPath } = appConfig

const PublicRoute = () => {
    const { authenticated } = useAuth()
    const { pathname } = useLocation()

    // Lien « réinitialiser » de l'e-mail, ouvert sur un appareil encore connecté :
    // sans cette exception, le client retombait sur l'accueil sans voir le formulaire.
    if (authenticated && pathname !== '/reset-password') {
        return <Navigate to={authenticatedEntryPath} />
    }
    return <Outlet />
}

export default PublicRoute
