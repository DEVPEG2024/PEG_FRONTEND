import { createSlice } from '@reduxjs/toolkit';
import { Product, SizeSelection } from '@/@types/product';
import { FormAnswer } from '@/@types/formAnswer';

export const SLICE_NAME = 'showOrder';

export type StateData = {
  loading: boolean;
  product: Product | null;
  formDialog: boolean;
  formAnswer: FormAnswer | null;
  sizesSelected: SizeSelection[];
};

const initialState: StateData = {
  loading: false,
  product: null,
  formDialog: false,
  formAnswer: null,
  sizesSelected: [],
};

const showOrderSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setFormDialog: (state, action) => {
      state.formDialog = action.payload;
    },
    setFormAnswer: (state, action) => {
      state.formAnswer = action.payload;
    },
    setProduct: (state, action) => {
      state.product = action.payload;
    },
    setSizesSelected: (state, action) => {
      state.sizesSelected = action.payload;
    },
    clearState: (state) => {
      state.formDialog = false;
      state.product = null;
      state.sizesSelected = [];
      state.formAnswer = null;
    },
  },
});

export const {
  clearState,
  setFormDialog,
  setFormAnswer,
  setProduct,
  setSizesSelected,
} = showOrderSlice.actions;

export default showOrderSlice.reducer;
