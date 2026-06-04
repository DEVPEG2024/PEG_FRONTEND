import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '@/utils/hooks/useAuth'

const { unAuthenticatedEntryPath } = appConfig

/**
 * Borne d'authentification : redirige vers la connexion si pas de session.
 *
 * La confirmation d'identité (le profil affiché appartient bien au token
 * courant) est centralisée en amont dans le Layout (`useAuthBootstrap`), qui ne
 * monte la coquille authentifiée — donc ces routes — qu'une fois l'identité
 * confirmée. Inutile de la refaire ici.
 */
const ProtectedRoute = () => {
    const { authenticated } = useAuth()
    const location = useLocation()

    if (!authenticated) {
        return (
            <Navigate
                replace
                to={`${unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${location.pathname}`}
            />
        )
    }

    return <Outlet />
}

export default ProtectedRoute
