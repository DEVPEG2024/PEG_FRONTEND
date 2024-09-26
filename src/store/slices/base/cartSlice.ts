import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_CART_NAME } from './constants'
import { CartItem } from '@/@types/cart'

export type CartState = {
    cart: {
        product: CartItem
        total: number
        quantity: number
    }[]
}

export const initialState: CartState = {
    cart: [],
}

export const cartSlice = createSlice({
    name: `${SLICE_CART_NAME}/cart`,
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<CartItem>) => {
            const existingItem = state.cart.find(item => item.product._id === action.payload._id);
            if (existingItem) {
                existingItem.quantity += 1;
                existingItem.total = existingItem.product.amount * existingItem.quantity;
            } else {
                state.cart.push({
                    product: action.payload,
                    total: action.payload.amount,
                    quantity: 1,
                });
            }
        },
        removeFromCart: (state, action: PayloadAction<string>) => {
            state.cart = state.cart.filter((item) => item.product._id !== action.payload)
        },
        updateQuantity: (state, action: PayloadAction<{ id: string, quantity: number }>) => {
            const { id, quantity } = action.payload
            const item = state.cart.find((item) => item.product._id === id)
            if (item) {
                item.quantity = quantity
                item.total = item.product.amount * quantity
            }
        },
        clearCart: (state) => {
            state.cart = []
        },
    },

})

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions

export default cartSlice.reducer
