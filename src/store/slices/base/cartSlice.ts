import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_CART_NAME } from './constants'
import { CartItem } from '@/@types/cart'
import { setCartItemId, setFormAnswer, setFormCompleted, setProductToShow, setSizesSelected } from '@/views/app/customer/products/show/store'
import { AppDispatch } from '@/store/storeSetup'
import { FormAnswer } from '@/@types/formAnswer'
import { SizeSelection } from '@/@types/product'

export type CartState = {
    cart: CartItem[]
}

export const initialState: CartState = {
    cart: [],
}

export type CartItemSizeEdition = {
    cartItemId: string
    formAnswer: FormAnswer
    sizes: SizeSelection[]
}

export type CartItemFormAnswerEdition = {
    cartItemId: string
    formAnswer: FormAnswer
}

export const editItem = (item: CartItem) => (dispatch: AppDispatch) => {
      dispatch(setCartItemId(item.id));
      dispatch(setProductToShow(item.product));
      dispatch(setFormAnswer(item.formAnswer));
      dispatch(setFormCompleted(true));
      dispatch(setSizesSelected(item.sizes));
  };

export const cartSlice = createSlice({
    name: `${SLICE_CART_NAME}/cart`,
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<CartItem>) => {
            state.cart.push({...action.payload});
        },
        editSizesCartItem: (state, action: PayloadAction<CartItemSizeEdition>) => {
            const cartItem = state.cart.find((item) => item.id === action.payload.cartItemId)
            if (cartItem) {
                cartItem.sizes = action.payload.sizes
            }
        },
        editFormAnswerCartItem: (state, action: PayloadAction<CartItemFormAnswerEdition>) => {
            const cartItem = state.cart.find((item) => item.id === action.payload.cartItemId)
            if (cartItem) {
                cartItem.formAnswer = action.payload.formAnswer
            }
        },
        removeFromCart: (state, action: PayloadAction<CartItem>) => {
            state.cart = state.cart.filter((item) => item.id !== action.payload.id)
            /*if (action.payload.product.form) {
                const fieldsWithFile: string[] = action.payload.product.form.fields.filter(({type}) => type === 'file').map(({id}) => id),
                    anwsersWithFile: IFieldAnswer[] = action.payload.formAnswer.answers.filter(({fieldId}) => fieldsWithFile.includes(fieldId))
            
                anwsersWithFile.forEach((answer) => {
                    apiDeleteFile(answer.value as string)
                })
            }*/
        },
        clearCart: (state) => {
            state.cart = []
        },
    },

})

export const { addToCart, removeFromCart, clearCart, editSizesCartItem, editFormAnswerCartItem } = cartSlice.actions

export default cartSlice.reducer
