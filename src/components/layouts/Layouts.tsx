import { useEffect, useMemo, Suspense } from 'react'
import lazy from '@/utils/lazyWithRetry'
import Loading from '@/components/shared/Loading'
import { signOutSuccess, useAppDispatch, useAppSelector } from '@/store'
import useAuthBootstrap from '@/utils/hooks/useAuthBootstrap'
import {
    LAYOUT_TYPE_CLASSIC,
    LAYOUT_TYPE_MODERN,
    LAYOUT_TYPE_SIMPLE,
    LAYOUT_TYPE_STACKED_SIDE,
    LAYOUT_TYPE_DECKED,
    LAYOUT_TYPE_BLANK,
} from '@/constants/theme.constant'
import useAuth from '@/utils/hooks/useAuth'
import useDirection from '@/utils/hooks/useDirection'
import useLocale from '@/utils/hooks/useLocale'
import ChatWidget from '@/components/template/ChatWidget'
import ScrollToTop from '@/components/shared/ScrollToTop'
import { CUSTOMER } from '@/constants/roles.constant'

const layouts = {
    [LAYOUT_TYPE_CLASSIC]: lazy(() => import('./ClassicLayout')),
    [LAYOUT_TYPE_MODERN]: lazy(() => import('./ModernLayout')),
    [LAYOUT_TYPE_STACKED_SIDE]: lazy(() => import('./StackedSideLayout')),
    [LAYOUT_TYPE_SIMPLE]: lazy(() => import('./SimpleLayout')),
    [LAYOUT_TYPE_DECKED]: lazy(() => import('./DeckedLayout')),
    [LAYOUT_TYPE_BLANK]: lazy(() => import('./BlankLayout')),
}

const Layout = () => {
    const layoutType = useAppSelector((state) => state.theme.layout.type)
    const authority = useAppSelector((state) => state.auth.user.user.authority) as string[]
    const dispatch = useAppDispatch()

    const { authenticated } = useAuth()
    // Confirme auprès du serveur que le profil en store appartient bien au token
    // courant. Tant que ce n'est pas confirmé, on ne rend AUCUNE partie de
    // l'interface authentifiée (ni sidebar, ni contenu) → impossible d'afficher
    // le rôle d'une autre session (ex: admin pour un client).
    const { identityConfirmed, failed } = useAuthBootstrap()

    useDirection()
    useLocale()

    // Identité impossible à confirmer (token invalide/croisé, /users/me KO) :
    // on déconnecte plutôt que de risquer d'afficher un mauvais rôle.
    useEffect(() => {
        if (authenticated && failed && !identityConfirmed) {
            dispatch(signOutSuccess())
            sessionStorage.removeItem('token')
        }
    }, [authenticated, failed, identityConfirmed, dispatch])

    const AppLayout = useMemo(() => {
        if (authenticated) {
            return layouts[layoutType]
        }
        return lazy(() => import('./AuthLayout'))
    }, [layoutType, authenticated])

    const isCustomer = authenticated && authority?.includes(CUSTOMER)

    // Coquille authentifiée en attente de confirmation d'identité → plein écran.
    if (authenticated && !identityConfirmed) {
        return (
            <div className="flex flex-auto flex-col h-screen">
                <Loading loading={true} />
            </div>
        )
    }

    return (
        <Suspense
            fallback={
                <div className="flex flex-auto flex-col h-screen">
                    <Loading loading={true} />
                </div>
            }
        >
            <AppLayout />
            {isCustomer && <ChatWidget />}
            <ScrollToTop />
        </Suspense>
    )
}

export default Layout
