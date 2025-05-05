import { combineReducers } from '@reduxjs/toolkit'
import common, { CommonState } from './commonSlice'
import cart, { CartState } from './cartSlice'
import avatarUrl, { AvatarUrlState } from './avatarUrlSlice'
const reducer = combineReducers({
    common,
    cart,
    avatarUrl,
})


export type BaseState = {
    common: CommonState
    cart: CartState
    avatarUrl: AvatarUrlState
}


export * from './commonSlice'

export default reducer
