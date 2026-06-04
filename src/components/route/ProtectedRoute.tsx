import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '@/utils/hooks/useAuth'
import { useEffect, useRef, useState } from 'react'
import { getUser } from '@/services/UserService'
import { setOwnUser, useAppDispatch, useAppSelector } from '@/store'
import Loading from '@/components/shared/Loading'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
    const { authenticated } = useAuth()
    const dispatch = useAppDispatch()
    const token = useAppSelector((state) => state.auth.session.token)
    const refreshed = useRef(false)

    // Le serveur est la source de vérité du rôle. L'état persisté (redux-persist)
    // n'est PAS autoritaire au démarrage : il peut contenir un rôle périmé d'une
    // session précédente. On ne rend donc les routes protégées qu'une fois
    // l'utilisateur courant confirmé par /users/me — sinon un client pouvait
    // voir brièvement (puis rester sur) l'interface admin après un hard refresh.
    const [confirmed, setConfirmed] = useState(false)

    const location = useLocation()

    useEffect(() => {
        if (!token) return
        if (refreshed.current) return
        refreshed.current = true
        getUser(token)
            .then((user) => {
                if (user) dispatch(setOwnUser(user))
            })
            .catch(() => {
                /* session invalide / API indisponible : on lève le gate et on
                   rend avec l'état courant (déjà nettoyé au logout). */
            })
            .finally(() => setConfirmed(true))
    }, [token, dispatch])

    if (!authenticated) {
        return (
            <Navigate
                replace
                to={`${unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${location.pathname}`}
            />
        )
    }

    // Authentifié mais utilisateur pas encore reconfirmé → on attend.
    if (!confirmed) {
        return <Loading loading={true} />
    }

    return <Outlet />
}

export default ProtectedRoute
