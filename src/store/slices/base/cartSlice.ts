import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_CART_NAME } from './constants'
import { CartItem } from '@/@types/cart'
import { setFormAnswer, setFormCompleted, setProductEdition, setSizesSelected } from '@/views/app/customer/products/show/store'
import { RootState } from '@/store/rootReducer'
import { AppDispatch } from '@/store/storeSetup'

export type CartState = {
    cart: CartItem[]
}

export const initialState: CartState = {
    cart: [],
}

export const editItem = (productId: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    const itemToEdit = getState().base.cart.cart.find(({product}) => product._id === productId);

    if (itemToEdit) {
      dispatch(setFormAnswer(itemToEdit.formAnswer));
      dispatch(setFormCompleted(true));
      dispatch(setProductEdition(true));
      dispatch(setSizesSelected(itemToEdit.sizes));
    }
  };

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
