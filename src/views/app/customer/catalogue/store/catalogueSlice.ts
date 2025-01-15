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
import {
  apiGetProductCategories,
  apiGetProductCategoryById,
  GetProductCategoriesRequest,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';

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

export const getCatalogueProducts = createAsyncThunk(
  SLICE_NAME + '/getCatalogueProducts',
  async (data: GetProductsRequest): Promise<GetProductsResponse> => {
    const {
      products_connection,
    }: { products_connection: GetProductsResponse } = await unwrapData(
      apiGetProducts(data)
    );
    return products_connection;
  }
);

export const getCatalogueProductsByCategory = createAsyncThunk(
  SLICE_NAME + '/getCatalogueProductsByCategory',
  async (data: GetProductsByCategoryRequest): Promise<GetProductsResponse> => {
    const {
      products_connection,
    }: { products_connection: GetProductsResponse } = await unwrapData(
      apiGetProductsByCategory(data)
    );
    return products_connection;
  }
);

export const getCatalogueProductCategoryById = createAsyncThunk(
  SLICE_NAME + '/getCatalogueProductCategoryById',
  async (documentId: string): Promise<{ productCategory: ProductCategory }> => {
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

export const getCatalogueProductCategories = createAsyncThunk(
  SLICE_NAME + '/getCatalogueProductCategories',
  async (
    data: GetProductCategoriesRequest
  ): Promise<GetProductCategoriesResponse> => {
    const {
      productCategories_connection,
    }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories(data));
    return productCategories_connection;
  }
);

const catalogueSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    clearStateSpecificCategory: (state) => {
      state.products = [];
      state.productCategory = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getCatalogueProducts.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getCatalogueProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.nodes;
    });
    builder.addCase(getCatalogueProducts.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getCatalogueProductsByCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      getCatalogueProductsByCategory.fulfilled,
      (state, action) => {
        state.loading = false;
        state.products = action.payload.nodes;
        state.total = action.payload.pageInfo.total;
      }
    );
    builder.addCase(getCatalogueProductsByCategory.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getCatalogueProductCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      getCatalogueProductCategories.fulfilled,
      (state, action) => {
        state.productCategories = action.payload.nodes;
        state.total = action.payload.pageInfo.total;
        state.loading = false;
      }
    );
    builder.addCase(getCatalogueProductCategoryById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      getCatalogueProductCategoryById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.productCategory = action.payload.productCategory;
      }
    );
    builder.addCase(getCatalogueProductCategoryById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { clearStateSpecificCategory } = catalogueSlice.actions;

export default catalogueSlice.reducer;
