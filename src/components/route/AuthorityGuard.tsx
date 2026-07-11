import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthority from '@/utils/hooks/useAuthority'

type AuthorityGuardProps = PropsWithChildren<{
    userAuthority?: string[]
    authority?: string[]
}>

const AuthorityGuard = (props: AuthorityGuardProps) => {
    const { userAuthority = [], authority = [], children } = props

    const roleMatched = useAuthority(userAuthority, authority)

    // Accès refusé : on renvoie vers l'accueil (route réelle, résolue par rôle)
    // plutôt que vers "/access-denied" qui n'existe pas (rebond silencieux).
    return <>{roleMatched ? children : <Navigate to="/home" replace />}</>
}

export default AuthorityGuard
