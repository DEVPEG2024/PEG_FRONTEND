import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { IProduct } from '@/@types/product';
import { apiGetProductById } from '@/services/ProductServices';

export const SLICE_NAME = 'showProduct'

export type StateData = {
    loading: boolean
    product: IProduct | null
    formCompleted: boolean
    formDialog: boolean
}

const initialState: StateData = {
  loading: false,
  product: null,
  formCompleted: false,
  formDialog: false
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
        setFormCompleted: (state, action) => {
            state.formCompleted = action.payload
        },
        setFormDialog: (state, action) => {
            state.formDialog = action.payload
        },
        clearState: (state) => {
            state.formCompleted = false
            state.formDialog = false
            state.product = null
            // Ajouter suppression des valeurs du form
        }
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
    setFormCompleted,
    setFormDialog
} = productSlice.actions

export default productSlice.reducer