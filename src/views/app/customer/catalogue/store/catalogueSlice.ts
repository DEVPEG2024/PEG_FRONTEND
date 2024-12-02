import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { IProduct, Product } from '@/@types/product';
import {
  apiGetProducts,
  apiGetProductsByCategory,
  GetProductsRequest,
  GetProductsResponse,
} from '@/services/ProductServices';
import { unwrapData } from '@/utils/serviceHelper';

// TODO: Voir si cette slice est nécessaire: redondante avec productSlice
export const SLICE_NAME = 'products';

export type StateData = {
  loading: boolean;
  products: Product[];
  product: IProduct | null;
  total: number;
  result: boolean;
  message: string;
  stats: {
    depense: number;
    recette: number;
    bilan: number;
  };
};

export type StatsTypesResponses = {
  depense: number;
  recette: number;
  bilan: number;
};


export const getProducts = createAsyncThunk(
  SLICE_NAME + '/getProducts',
  async (data: GetProductsRequest): Promise<GetProductsResponse> => {
    const {forms_connection} : {forms_connection: GetProductsResponse}= await unwrapData(apiGetProducts(data));
    return forms_connection
  }
);

export const getProductsByCategory = createAsyncThunk(
  SLICE_NAME + '/getProductsByCategory',
  async (id: string) => {
    const response = await apiGetProductsByCategory(id);
    return response.data;
  }
);

const initialState: StateData = {
  loading: false,
  products: [],
  product: null,
  total: 0,
  result: false,
  message: '',
  stats: {
    depense: 0,
    recette: 0,
    bilan: 0,
  },
};

const catalogueSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setTableData: (state, action) => {
      state.products = action.payload;
    },
    setProduct: (state, action) => {
      state.product =
        state.products.find((product) => product._id === action.payload) ??
        null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProducts.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.nodes as Product;
    });
    builder.addCase(getProducts.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getProductsByCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductsByCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.products;
    });
    builder.addCase(getProductsByCategory.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setTableData,
  setProduct,
} = catalogueSlice.actions;

export default catalogueSlice.reducer;
