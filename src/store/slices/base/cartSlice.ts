import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_CART_NAME } from './constants'
import { CartItem } from '@/@types/cart'
import { setCartItemId, setFormAnswer, setFormCompleted, setProductToShow, setSizeAndColorsSelected } from '@/views/app/customer/products/show/store'
import { AppDispatch } from '@/store/storeSetup'
import { FormAnswer } from '@/@types/formAnswer'
import { SizeAndColorSelection } from '@/@types/product'

export type CartState = {
    cart: CartItem[]
}

export const initialState: CartState = {
    cart: [],
}

export type CartItemSizeAndColorEdition = {
    cartItemId: string
    formAnswer: FormAnswer
    sizeAndColors: SizeAndColorSelection[]
}

export type CartItemFormAnswerEdition = {
    cartItemId: string
    formAnswer: FormAnswer
}

export type CartItemOrderItemDocumentIdEdition = {
    cartItemId: string
    orderItemDocumentId: string
}

export const editItem = (item: CartItem) => (dispatch: AppDispatch) => {
      dispatch(setCartItemId(item.id));
      dispatch(setProductToShow(item.product));
      dispatch(setFormAnswer(item.formAnswer));
      dispatch(setFormCompleted(true));
      dispatch(setSizeAndColorsSelected(item.sizeAndColors));
  };

export const cartSlice = createSlice({
    name: `${SLICE_CART_NAME}/cart`,
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<CartItem>) => {
            state.cart.push({...action.payload});
        },
        editSizeAndColorsCartItem: (state, action: PayloadAction<CartItemSizeAndColorEdition>) => {
            const cartItem = state.cart.find((item) => item.id === action.payload.cartItemId)
            if (cartItem) {
                cartItem.sizeAndColors = action.payload.sizeAndColors
            }
        },
        editFormAnswerCartItem: (state, action: PayloadAction<CartItemFormAnswerEdition>) => {
            const cartItem = state.cart.find((item) => item.id === action.payload.cartItemId)
            if (cartItem) {
                cartItem.formAnswer = action.payload.formAnswer
            }
        },
        editOrderItemDocumentIdCartItem: (state, action: PayloadAction<CartItemOrderItemDocumentIdEdition>) => {
            const cartItem = state.cart.find((item) => item.id === action.payload.cartItemId)
            if (cartItem) {
                cartItem.orderItemDocumentId = action.payload.orderItemDocumentId
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
        removeFromCartItemOfOrderItem: (state, action: PayloadAction<string>) => {
            state.cart = state.cart.filter((item) => item.orderItemDocumentId !== action.payload)
        }
    },

})

export const { addToCart, removeFromCart, editSizeAndColorsCartItem, editFormAnswerCartItem, editOrderItemDocumentIdCartItem, removeFromCartItemOfOrderItem } = cartSlice.actions

export default cartSlice.reducer
