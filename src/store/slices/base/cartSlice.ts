import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_CART_NAME } from './constants'
import { CartItem } from '@/@types/cart'

export type CartState = {
    cart: CartItem[]
}

export const initialState: CartState = {
    cart: [],
}

export const cartSlice = createSlice({
    name: `${SLICE_CART_NAME}/cart`,
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<CartItem>) => {
            state.cart.push({
                product: action.payload.product,
                formAnswer: action.payload.formAnswer,
                sizes: action.payload.sizes,
            });
        },
        removeFromCart: (state, action: PayloadAction<string>) => {
            state.cart = state.cart.filter((item) => item.product._id !== action.payload)
        },
        updateQuantity: (state, action: PayloadAction<{ id: string, quantity: number }>) => {
            const { id, quantity } = action.payload
            const item = state.cart.find((item) => item.product._id === id)
            if (item) {
                item.quantity = quantity
            }
        },
        clearCart: (state) => {
            state.cart = []
        },
    },

})

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions

export default cartSlice.reducer
