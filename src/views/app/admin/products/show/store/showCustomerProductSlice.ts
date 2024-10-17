import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { IProduct, SizeSelection } from '@/@types/product';
import { apiGetProductById } from '@/services/ProductServices';
import { IFormAnswer } from '@/@types/formAnswer';

export const SLICE_NAME = 'showCustomerProduct'

export type StateData = {
    loading: boolean
    product: IProduct | null
    formDialog: boolean
    formAnswer: IFormAnswer | null
    sizesSelected: SizeSelection[]
}

const initialState: StateData = {
  loading: false,
  product: null,
  formDialog: false,
  formAnswer: null,
  sizesSelected: []
};

export const getProductById = createAsyncThunk(
    SLICE_NAME + '/getProduct',
    async (id: string) => {
        const response = await apiGetProductById(id)
        return response.data
    }
)

const productSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
        setFormDialog: (state, action) => {
            state.formDialog = action.payload
        },
        setFormAnswer: (state, action) => {
            state.formAnswer = action.payload
        },
        setSizesSelected: (state, action) => {
            state.sizesSelected = action.payload
        },
        clearState: (state) => {
            state.formDialog = false
            state.product = null
            state.sizesSelected = []
            state.formAnswer = null
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getProductById.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(getProductById.fulfilled, (state, action) => {
            state.loading = false;
            state.product = action.payload.product as unknown as IProduct;
        });
        builder.addCase(getProductById.rejected, (state) => {
            state.loading = false;
        });
    }
})

export const {
    clearState,
    setFormDialog,
    setFormAnswer,
    setSizesSelected
} = productSlice.actions

export default productSlice.reducer
