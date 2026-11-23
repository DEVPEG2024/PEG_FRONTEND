import { combineReducers } from '@reduxjs/toolkit'
import session, { SessionState } from './sessionSlice'
import user, { UserState } from './userSlice'
import priceDisplay, { PriceDisplayState } from './priceDisplaySlice'

const reducer = combineReducers({
    session,
    user,
    priceDisplay,
})

export type AuthState = {
    session: SessionState
    user: UserState
    priceDisplay: PriceDisplayState
}

export * from './sessionSlice'
export * from './userSlice'
export * from './priceDisplaySlice'

export default reducer
