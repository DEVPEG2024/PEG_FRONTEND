import { combineReducers } from '@reduxjs/toolkit'
import common, { CommonState } from './commonSlice'
import cart, { CartState } from './cartSlice'
const reducer = combineReducers({
    common,
    cart,
})


export type BaseState = {
    common: CommonState
    cart: CartState
}


export * from './commonSlice'

export default reducer
