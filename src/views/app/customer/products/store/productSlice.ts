import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Product } from '@/@types/product';
import {
  apiGetCustomerProducts,
  CustomerProductsResponse,
} from '@/services/ProductServices';
import { unwrapData } from '@/utils/serviceHelper';

type Products = Product[];

export type StateData = {
  loading: boolean;
  products: Products;
  product: Product | null;
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
type Query = {
  page: number;
  pageSize: number;
  searchTerm: string;
  customerDocumentId: string;
  customerCategoryDocumentId: string;
};

type GetProductListRequest = Query;
export const SLICE_NAME = 'products';

export const getCustomerProducts = createAsyncThunk(
  SLICE_NAME + '/getCustomerProducts',
  async (data: GetProductListRequest): Promise<{ products: Product[] }> => {
    const {
      products_connection,
    }: { products_connection: CustomerProductsResponse } = await unwrapData(
      apiGetCustomerProducts(
        data.customerDocumentId,
        data.customerCategoryDocumentId,
        { page: data.page, pageSize: data.pageSize },
        data.searchTerm
      )
    );
    return { products: products_connection.nodes };
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

const productSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setProduct: (state, action) => {
      state.product =
        state.products.find(
          (product) => product.documentId === action.payload
        ) ?? null;
    },
    clearProducts: (state) => {
      state.products = []
    }
  },
  extraReducers: (builder) => {
    builder.addCase(getCustomerProducts.pending, (state) => {
      state.loading = true;
      clearProducts();
    });
    builder.addCase(getCustomerProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.products;
    });
    builder.addCase(getCustomerProducts.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setProduct, clearProducts } = productSlice.actions;

export default productSlice.reducer;
