import { apiSignIn } from '@/services/AuthService'
import {
    setOwnUser,
    signInSuccess,
    signOutSuccess,
    useAppSelector,
    useAppDispatch,
} from '@/store'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useNavigate } from 'react-router-dom'
import useQuery from './useQuery'
import type { SignInCredential, SignUpCredential } from '@/@types/auth'
import { ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant'
import { getUser } from '@/services/UserService'
import { User } from '@/@types/user'

type Status = 'success' | 'failed'

function useAuth() {
    const dispatch = useAppDispatch()

    const navigate = useNavigate()

    const query = useQuery()

    const { token, signedIn } = useAppSelector((state) => state.auth.session)

    const signIn = async (
        values: SignInCredential
    ): Promise<
        | {
              status: Status
              message: string
          }
        | undefined
    > => {
        try {
            const resp = await apiSignIn(values)
            if (resp.data) {
                const { jwt: token } = resp.data
                // ⚠️ Établir le token de CETTE session AVANT tout appel
                // authentifié : l'intercepteur BaseService lit le token du store.
                // Si getUser() partait avant, il utilisait le token persisté de
                // la session précédente → /users/me renvoyait le mauvais profil
                // (ex: admin) et le client atterrissait sur l'interface admin.
                dispatch(signInSuccess(token))
                sessionStorage.setItem('token', token)

                const user: User = await getUser(token)
                if (user) {
                    dispatch(setOwnUser(user))
                    const userRole = user.authority[0]
                    if ([ADMIN, CUSTOMER, PRODUCER].includes(userRole)) {
                        navigate("/home")
                    } else {
                        navigate("/")
                    }
                    return {
                        status: 'success',
                        message: '',
                    }
                }
                // getUser n'a pas renvoyé d'utilisateur → ne pas laisser une
                // session à moitié ouverte.
                dispatch(signOutSuccess())
                sessionStorage.removeItem('token')
                return {
                    status: 'failed',
                    message: 'Utilisateur introuvable',
                }
            }
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        } catch (errors: any) {
            // Échec d'authentification : purger toute session partielle.
            dispatch(signOutSuccess())
            sessionStorage.removeItem('token')
            // 429 = trop de tentatives → message explicite plutôt que le brut
            // "AxiosError: Request failed with status code 429".
            if (errors?.response?.status === 429) {
                return {
                    status: 'failed',
                    message: 'Trop de tentatives de connexion. Patientez une minute puis réessayez.',
                }
            }
            return {
                status: 'failed',
                message:
                    errors?.response?.data?.error?.message ||
                    errors?.response?.data?.message ||
                    errors.toString(),
            }
        }
    }

    const handleSignOut = () => {
        dispatch(signOutSuccess())
        dispatch(
            // Réinitialisation COMPLÈTE de l'identité : on purge aussi `role`,
            // `customer` et `producer`. Sinon le rôle (ex: admin) reste en
            // localStorage via redux-persist et « fuit » sur la session
            // suivante → un client pouvait atterrir sur l'interface admin après
            // un hard refresh.
            setOwnUser({
                avatar: undefined,
                username: '',
                email: '',
                firstName: '',
                lastName: '',
                authority: [],
                customer: undefined,
                producer: undefined,
                role: { documentId: '', description: 'public', name: 'public', type: 'public' },
            })
        )
        sessionStorage.removeItem('token')
        navigate(appConfig.unAuthenticatedEntryPath)
    }

    const signOut = async () => {
        // await apiSignOut()
        sessionStorage.removeItem('token')
        handleSignOut()
    }

    return {
        authenticated: token && signedIn,
        signIn,
        signOut,
    }
}

export default useAuth
