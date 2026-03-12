import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '@/utils/hooks/useAuth'
import { useEffect, useRef } from 'react'
import { getUser } from '@/services/UserService'
import { setOwnUser, useAppDispatch, useAppSelector } from '@/store'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
    const { authenticated } = useAuth()
    const dispatch = useAppDispatch()
    const token = useAppSelector((state) => state.auth.session.token)
    const refreshed = useRef(false)

    const location = useLocation()

    useEffect(() => {
        if (token && !refreshed.current) {
            refreshed.current = true
            getUser(token).then((user) => {
                if (user) dispatch(setOwnUser(user))
            }).catch(() => {/* session invalide, laisser useAuth gérer */})
        }
    }, [token, dispatch])

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
