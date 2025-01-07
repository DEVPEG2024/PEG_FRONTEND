import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Product, SizeSelection } from '@/@types/product';
import { apiGetProductForShowById } from '@/services/ProductServices';
import { FormAnswer } from '@/@types/formAnswer';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'showProduct';

export type StateData = {
  loading: boolean;
  product: Product | null;
  formCompleted: boolean;
  formDialog: boolean;
  formAnswer: Partial<FormAnswer> | null;
  sizesSelected: SizeSelection[];
  cartItemId: string;
};

const initialState: StateData = {
  loading: false,
  product: null,
  formCompleted: false,
  formDialog: false,
  formAnswer: null,
  sizesSelected: [],
  cartItemId: '',
};

export const getProductToShow = createAsyncThunk(
  SLICE_NAME + '/getProductToShow',
  async (documentId: string): Promise<{product: Product}> => {
    return await unwrapData(apiGetProductForShowById(documentId));
  }
);

const productSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setFormCompleted: (state, action) => {
      state.formCompleted = action.payload;
    },
    setFormDialog: (state, action) => {
      state.formDialog = action.payload;
    },
    setFormAnswer: (state, action) => {
      state.formAnswer = action.payload;
    },
    setSizesSelected: (state, action) => {
      state.sizesSelected = action.payload;
    },
    setCartItemId: (state, action) => {
      state.cartItemId = action.payload;
    },
    setProductToShow: (state, action) => {
      state.product = action.payload;
    },
    clearState: (state) => {
      state.formCompleted = false;
      state.formDialog = false;
      state.product = null;
      state.sizesSelected = [];
      state.formAnswer = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProductToShow.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductToShow.fulfilled, (state, action) => {
      state.loading = false;
      state.product = action.payload.product;
    });
    builder.addCase(getProductToShow.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  clearState,
  setFormCompleted,
  setFormDialog,
  setFormAnswer,
  setSizesSelected,
  setCartItemId,
  setProductToShow,
} = productSlice.actions;

export default productSlice.reducer;
