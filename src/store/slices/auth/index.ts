import { combineReducers } from '@reduxjs/toolkit'
import session, { SessionState } from './sessionSlice'
import user, { UserState } from './userSlice'
import customer, { CustomerState } from './customerSlice'

const reducer = combineReducers({
    session,
    user,
    customer,
})

export type AuthState = {
    session: SessionState
    user: UserState
    customer: CustomerState
}

export * from './sessionSlice'
export * from './userSlice'
export * from './customerSlice'

export default reducer
