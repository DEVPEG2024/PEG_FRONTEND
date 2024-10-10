import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_CART_NAME } from './constants'
import { CartItem } from '@/@types/cart'
import { setCartItemId, setFormAnswer, setFormCompleted, setProduct, setSizesSelected } from '@/views/app/customer/products/show/store'
import { RootState } from '@/store/rootReducer'
import { AppDispatch } from '@/store/storeSetup'
import { IFormAnswer } from '@/@types/formAnswer'
import { SizeSelection } from '@/@types/product'

export type CartState = {
    cart: CartItem[]
}

export const initialState: CartState = {
    cart: [],
}

export type CartItemEdition = {
    cartItemId: string
    formAnswer: IFormAnswer
    sizes: SizeSelection[]
}

export const editItem = (productId: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    const itemToEdit = getState().base.cart.cart.find(({product}) => product._id === productId);

    if (itemToEdit) {
      dispatch(setCartItemId(itemToEdit.id));
      dispatch(setProduct(itemToEdit.product));
      dispatch(setFormAnswer(itemToEdit.formAnswer));
      dispatch(setFormCompleted(true));
      dispatch(setSizesSelected(itemToEdit.sizes));
    }
  };

export const cartSlice = createSlice({
    name: `${SLICE_CART_NAME}/cart`,
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<CartItem>) => {
            state.cart.push({
                id: Math.random().toString(16).slice(2),
                product: action.payload.product,
                formAnswer: action.payload.formAnswer,
                sizes: action.payload.sizes,
            });
        },
        editCartItem: (state, action: PayloadAction<CartItemEdition>) => {
            const cartItem = state.cart.find((item) => item.id = action.payload.cartItemId)
            if (cartItem) {
                cartItem.formAnswer = action.payload.formAnswer
                cartItem.sizes = action.payload.sizes
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
            }
        },
        clearCart: (state) => {
            state.cart = []
        },
    },

})

export const { addToCart, removeFromCart, updateQuantity, clearCart, editCartItem } = cartSlice.actions

export default cartSlice.reducer
