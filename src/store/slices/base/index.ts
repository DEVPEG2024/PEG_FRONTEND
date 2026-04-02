import { combineReducers } from '@reduxjs/toolkit'
import common, { CommonState } from './commonSlice'
import cart, { CartState } from './cartSlice'
import avatarUrl, { AvatarUrlState } from './avatarUrlSlice'
import notification, { NotificationState } from './notificationSlice'

const reducer = combineReducers({
    common,
    cart,
    avatarUrl,
    notification,
})


export type BaseState = {
    common: CommonState
    cart: CartState
    avatarUrl: AvatarUrlState
    notification: NotificationState
}


export * from './commonSlice'

export default reducer
