import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CustomerCategory } from '@/@types/customer'
import { SLICE_BASE_NAME } from './constants'

export type CustomerState = {
    documentId?: string
    companyName?: string
    customerCategory: CustomerCategory
}

const initialState: CustomerState = {
    documentId: '',
    companyName: '',
    customerCategory: {documentId: ''}
}

const customerSlice = createSlice({
    name: `${SLICE_BASE_NAME}/customer`,
    initialState,
    reducers: {
        setCustomer(state, action: PayloadAction<CustomerState>) {
            state.documentId = action.payload?.documentId
            state.companyName = action.payload?.companyName
            state.customerCategory = action.payload?.customerCategory
        },
    },
})

export const { setCustomer } = customerSlice.actions
export default customerSlice.reducer
