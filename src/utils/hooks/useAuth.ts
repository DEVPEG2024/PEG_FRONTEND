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
                const user: User = await getUser(token)
                dispatch(signInSuccess(token))
                localStorage.setItem('token', token)
                if (user) {
                    dispatch(setOwnUser(user))
                    const userRole = user.authority[0]
                    if ([ADMIN, CUSTOMER, PRODUCER].includes(userRole)) {
                        navigate("/home")
                    } else {
                        navigate("/")
                    }
                }
                // navigate(
                //     redirectUrl ? redirectUrl : appConfig.authenticatedEntryPath
                // )
                return {
                    status: 'success',
                    message: '',
                }
            }
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }

    const handleSignOut = () => {
        dispatch(signOutSuccess())
        dispatch(
            setOwnUser({
                avatar: undefined,
                userName: '',
                email: '',
                authority: [],
            })
        )
        localStorage.removeItem('token')
        navigate(appConfig.unAuthenticatedEntryPath)
    }

    const signOut = async () => {
        // await apiSignOut()
        localStorage.removeItem('token')
        handleSignOut()
    }

    return {
        authenticated: token && signedIn,
        signIn,
        signOut,
    }
}

export default useAuth
