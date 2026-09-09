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
    const { identityConfirmed, authRejected, unreachable, retry } =
        useAuthBootstrap()

    useDirection()
    useLocale()

    // Identité REFUSÉE par le serveur (401/403, token croisé, rôle absent) :
    // on déconnecte plutôt que de risquer d'afficher un mauvais rôle.
    // Une simple panne de transport (4G coupée, 5xx, timeout) ne déclenche PLUS
    // de déconnexion — c'est le cas nominal sur téléphone, et le hook a déjà
    // retenté trois fois. Voir useAuthBootstrap pour l'invariant de sécurité.
    useEffect(() => {
        if (authenticated && authRejected && !identityConfirmed) {
            dispatch(signOutSuccess())
            sessionStorage.removeItem('token')
        }
    }, [authenticated, authRejected, identityConfirmed, dispatch])

    const AppLayout = useMemo(() => {
        if (authenticated) {
            return layouts[layoutType]
        }
        return lazy(() => import('./AuthLayout'))
    }, [layoutType, authenticated])

    const isCustomer = authenticated && authority?.includes(CUSTOMER)

    // Coquille authentifiée en attente de confirmation d'identité → plein écran.
    // Le profil du store n'a pas pu être rattaché au token : on ne monte pas
    // l'application (on afficherait un rôle non vérifié). Si la cause est une
    // panne réseau, la session est conservée et on propose de relancer.
    if (authenticated && !identityConfirmed) {
        return (
            <div className="flex flex-auto flex-col h-screen">
                <Loading loading={true} />
                {unreachable && (
                    <div className="flex flex-col items-center gap-3 pb-16 px-6 text-center">
                        {/* Message volontairement factuel : la relance automatique
                            n'a lieu qu'au retour du réseau (événement « online »).
                            Une fois les tentatives épuisées alors que le navigateur
                            se croit connecté, plus rien ne se passe — annoncer une
                            « nouvelle tentative… » serait faux. */}
                        <p className="text-gray-600 dark:text-gray-300">
                            Connexion au serveur impossible. Votre session est conservée.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                                type="button"
                                className="peg-tap-target px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600"
                                onClick={retry}
                            >
                                Réessayer
                            </button>
                            {/* Porte de sortie : sans elle, un serveur durablement
                                injoignable laisserait l'utilisateur sur cet écran
                                sans aucun moyen d'en partir. */}
                            <button
                                type="button"
                                className="peg-tap-target px-4 py-2 rounded-md text-gray-500 dark:text-gray-400"
                                onClick={() => dispatch(signOutSuccess())}
                            >
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                )}
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
