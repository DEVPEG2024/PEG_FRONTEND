import {
    configureStore,
    Action,
    Reducer,
    AnyAction,
    Store,
} from '@reduxjs/toolkit'
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { PERSIST_STORE_NAME } from '@/constants/app.constant'
import rootReducer, { RootState, AsyncReducers } from './rootReducer'
import RtkQueryService from '@/services/RtkQueryService'

/* eslint-disable @typescript-eslint/no-explicit-any */
const middlewares: any[] = [RtkQueryService.middleware]

const persistConfig = {
    key: PERSIST_STORE_NAME,
    keyPrefix: '',
    storage,
    whitelist: ['auth', 'locale', 'base'],
}

interface CustomStore extends Store<RootState, AnyAction> {
    asyncReducers?: AsyncReducers
}

const store: CustomStore = configureStore({
    reducer: persistReducer(persistConfig, rootReducer() as Reducer),
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: {
                ignoredActions: [
                    FLUSH,
                    REHYDRATE,
                    PAUSE,
                    PERSIST,
                    PURGE,
                    REGISTER,
                ],
            },
        }).concat(middlewares),
    devTools: process.env.NODE_ENV === 'development',
})

store.asyncReducers = {}

export const persistor = persistStore(store)

export function injectReducer<S>(key: string, reducer: Reducer<S, Action>) {
    if (store.asyncReducers) {
        // Skip if this key is already injected (same ref OR already present).
        // The strict-equality check alone misses cases where the module is
        // re-evaluated (HMR, lazy-import) — checking for key existence avoids
        // unnecessary replaceReducer calls and the REHYDRATE they trigger.
        if (store.asyncReducers[key]) {
            return false
        }
        store.asyncReducers[key] = reducer
        store.replaceReducer(
            persistReducer(
                persistConfig,
                rootReducer(store.asyncReducers) as Reducer
            )
        )
    }
    persistor.persist()
    return store
}

export type AppDispatch = typeof store.dispatch

export default store
