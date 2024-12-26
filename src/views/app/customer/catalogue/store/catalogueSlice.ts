import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Product, ProductCategory } from '@/@types/product';
import {
  apiGetProducts,
  apiGetProductsByCategory,
  GetProductsByCategoryRequest,
  GetProductsRequest,
  GetProductsResponse,
} from '@/services/ProductServices';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetProductCategories, apiGetProductCategoryById, GetProductCategoriesRequest, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';

// TODO: Voir si cette slice est nécessaire: redondante avec productSlice
export const SLICE_NAME = 'catalogue';

export type StateData = {
  loading: boolean;
  products: Product[];
  total: number;
  result: boolean;
  message: string;
  stats: {
    depense: number;
    recette: number;
    bilan: number;
  };
  productCategories: ProductCategory[];
  productCategory?: ProductCategory;
};

export type StatsTypesResponses = {
  depense: number;
  recette: number;
  bilan: number;
};


export const getProducts = createAsyncThunk(
  SLICE_NAME + '/getProducts',
  async (data: GetProductsRequest): Promise<GetProductsResponse> => {
    const {products_connection} : {products_connection: GetProductsResponse}= await unwrapData(apiGetProducts(data));
    return products_connection
  }
);

export const getProductsByCategory = createAsyncThunk(
  SLICE_NAME + '/getProductsByCategory',
  async (data: GetProductsByCategoryRequest): Promise<GetProductsResponse> => {
    const {products_connection} : {products_connection: GetProductsResponse}= await unwrapData(apiGetProductsByCategory(data));
    return products_connection
  }
);

export const getProductCategoryById = createAsyncThunk(
  SLICE_NAME + '/getProductCategoryById',
  async (documentId: string): Promise<{productCategory: ProductCategory}> => {
    return await unwrapData(apiGetProductCategoryById(documentId));
  }
);

const initialState: StateData = {
  loading: false,
  products: [],
  total: 0,
  result: false,
  message: '',
  stats: {
    depense: 0,
    recette: 0,
    bilan: 0,
  },
  productCategories: [],
  productCategory: undefined,
};

export const getProductCategories = createAsyncThunk(
  SLICE_NAME + '/getProductCategories',
  async (data: GetProductCategoriesRequest) : Promise<GetProductCategoriesResponse> => {
    const {productCategories_connection} : {productCategories_connection: GetProductCategoriesResponse} = await unwrapData(apiGetProductCategories(data));
    return productCategories_connection;
  }
);

const catalogueSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    clearStateSpecificCategory: (state) => {
      state.products = []
      state.productCategory = undefined
    }
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
      state.products = action.payload.nodes;
      state.total = action.payload.pageInfo.total
    });
    builder.addCase(getProductsByCategory.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getProductCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductCategories.fulfilled, (state, action) => {
      state.productCategories = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    builder.addCase(getProductCategoryById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductCategoryById.fulfilled, (state, action) => {
      state.loading = false;
      state.productCategory = action.payload.productCategory;
    });
    builder.addCase(getProductCategoryById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setProduct,
  clearStateSpecificCategory,
} = catalogueSlice.actions;

export default catalogueSlice.reducer;
