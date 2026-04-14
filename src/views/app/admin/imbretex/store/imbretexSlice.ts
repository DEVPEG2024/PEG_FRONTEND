import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ImbretexProduct,
  ImbretexPriceStock,
} from '@/@types/imbretex';
import {
  apiGetImbretexProducts,
  apiGetImbretexPriceStock,
  GetImbretexProductsParams,
} from '@/services/ImbretexService';

export const SLICE_NAME = 'imbretex';

export type StateData = {
  loading: boolean;
  loadingPrices: boolean;
  products: ImbretexProduct[];
  priceStockMap: Record<string, ImbretexPriceStock>;
  totalProducts: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  error: string | null;
};

// ─── Async thunks ───

export const fetchImbretexProducts = createAsyncThunk(
  SLICE_NAME + '/fetchProducts',
  async (params: GetImbretexProductsParams) => {
    const res = await apiGetImbretexProducts(params);
    return res;
  }
);

export const fetchImbretexPriceStock = createAsyncThunk(
  SLICE_NAME + '/fetchPriceStock',
  async (references: string[]) => {
    const res = await apiGetImbretexPriceStock(references);
    return res.products;
  }
);

// ─── Slice ───

const initialState: StateData = {
  loading: false,
  loadingPrices: false,
  products: [],
  priceStockMap: {},
  totalProducts: 0,
  totalPages: 0,
  currentPage: 1,
  perPage: 50,
  error: null,
};

const imbretexSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    clearPriceStock: (state) => {
      state.priceStockMap = {};
    },
  },
  extraReducers: (builder) => {
    // Products
    builder.addCase(fetchImbretexProducts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchImbretexProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.products;
      state.totalProducts = action.payload.productCount;
      state.totalPages = action.payload.totalNumberPage;
      state.currentPage = parseInt(action.payload.page, 10);
      state.perPage = action.payload.perPage;
    });
    builder.addCase(fetchImbretexProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Erreur lors du chargement';
    });

    // Price/Stock
    builder.addCase(fetchImbretexPriceStock.pending, (state) => {
      state.loadingPrices = true;
    });
    builder.addCase(fetchImbretexPriceStock.fulfilled, (state, action) => {
      state.loadingPrices = false;
      state.priceStockMap = { ...state.priceStockMap, ...action.payload };
    });
    builder.addCase(fetchImbretexPriceStock.rejected, (state) => {
      state.loadingPrices = false;
    });
  },
});

export const { setCurrentPage, clearPriceStock } = imbretexSlice.actions;
export default imbretexSlice.reducer;
