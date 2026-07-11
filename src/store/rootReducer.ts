import { combineReducers, CombinedState, AnyAction, Reducer } from 'redux'
import { persistReducer } from 'redux-persist'
import auth, { AuthState } from './slices/auth'
import base, { BaseState } from './slices/base'
import locale, { LocaleState } from './slices/locale/localeSlice'
import theme, { ThemeState } from './slices/theme/themeSlice'
import RtkQueryService from '@/services/RtkQueryService'
import tabSessionStorage from './tabSessionStorage'

export type RootState = CombinedState<{
    auth: CombinedState<AuthState>
    base: CombinedState<BaseState>
    locale: LocaleState
    theme: ThemeState
    /* eslint-disable @typescript-eslint/no-explicit-any */
    [RtkQueryService.reducerPath]: any
}>

export interface AsyncReducers {
    [key: string]: Reducer<any, AnyAction>
}

// Session persistée PAR ONGLET (sessionStorage d'abord, repli localStorage) :
// permet d'être connecté admin dans un onglet et client dans un autre sans
// qu'un hard refresh fasse basculer l'un vers la session de l'autre.
const authPersistConfig = {
    key: 'peg_auth',
    keyPrefix: '',
    storage: tabSessionStorage,
}

const staticReducers = {
    auth: persistReducer(authPersistConfig, auth as any) as unknown as typeof auth,
    base,
    locale,
    theme,
    [RtkQueryService.reducerPath]: RtkQueryService.reducer,
}

const rootReducer =
    (asyncReducers?: AsyncReducers) =>
    (state: RootState, action: AnyAction) => {
        const combinedReducer = combineReducers({
            ...staticReducers,
            ...asyncReducers,
        })
        return combinedReducer(state, action)
    }

export default rootReducer
