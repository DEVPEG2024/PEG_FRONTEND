import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ImbretexProduct,
  ImbretexPriceStock,
} from '@/@types/imbretex';
import {
  apiGetImbretexProducts,
  apiGetImbretexPriceStockByRef,
} from '@/services/ImbretexService';

export const SLICE_NAME = 'imbretex';

export type StateData = {
  loading: boolean;
  loadingProgress: number; // 0-100
  loadingPrices: boolean;
  allProducts: ImbretexProduct[];
  priceStockMap: Record<string, ImbretexPriceStock>;
  totalProducts: number;
  error: string | null;
};

// ─── Async thunks ───

// Load entire catalog: first page to get total, then remaining pages in parallel batches
export const fetchAllImbretexProducts = createAsyncThunk(
  SLICE_NAME + '/fetchAll',
  async (_, { dispatch }) => {
    // Page 1
    const first = await apiGetImbretexProducts({ page: 1, perPage: 50 });
    const totalPages = first.totalNumberPage;

    // Show first page immediately
    dispatch(appendProducts(first.products));
    dispatch(setLoadingProgress(Math.round(100 / totalPages)));

    // Remaining pages in small batches (3 parallel) to avoid rate limiting
    const BATCH_SIZE = 3;
    for (let start = 2; start <= totalPages; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, totalPages);
      const batch = [];
      for (let p = start; p <= end; p++) {
        batch.push(apiGetImbretexProducts({ page: p, perPage: 50 }));
      }
      const results = await Promise.all(batch);
      const newProducts: ImbretexProduct[] = [];
      for (const res of results) {
        newProducts.push(...res.products);
      }
      dispatch(appendProducts(newProducts));
      dispatch(setLoadingProgress(Math.round((end / totalPages) * 100)));
    }

    return { totalProducts: first.productCount };
  }
);

// Fetch price/stock by product reference (returns all variants)
export const fetchImbretexPriceStockByRef = createAsyncThunk(
  SLICE_NAME + '/fetchPriceStockByRef',
  async (productReference: string) => {
    const res = await apiGetImbretexPriceStockByRef(productReference);
    const map: Record<string, ImbretexPriceStock> = {};
    if (Array.isArray(res.products)) {
      for (const p of res.products) {
        map[p.code] = p;
      }
    }
    return map;
  }
);

// ─── Slice ───

const initialState: StateData = {
  loading: false,
  loadingProgress: 0,
  loadingPrices: false,
  allProducts: [],
  priceStockMap: {},
  totalProducts: 0,
  error: null,
};

const imbretexSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setLoadingProgress: (state, action: PayloadAction<number>) => {
      state.loadingProgress = action.payload;
    },
    appendProducts: (state, action: PayloadAction<ImbretexProduct[]>) => {
      state.allProducts.push(...action.payload);
    },
    clearPriceStock: (state) => {
      state.priceStockMap = {};
    },
  },
  extraReducers: (builder) => {
    // All products
    builder.addCase(fetchAllImbretexProducts.pending, (state) => {
      state.loading = true;
      state.loadingProgress = 0;
      state.allProducts = [];
      state.error = null;
    });
    builder.addCase(fetchAllImbretexProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.loadingProgress = 100;
      state.totalProducts = action.payload.totalProducts;
    });
    builder.addCase(fetchAllImbretexProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Erreur lors du chargement';
    });

    // Price/Stock by ref
    builder.addCase(fetchImbretexPriceStockByRef.pending, (state) => {
      state.loadingPrices = true;
    });
    builder.addCase(fetchImbretexPriceStockByRef.fulfilled, (state, action) => {
      state.loadingPrices = false;
      state.priceStockMap = { ...state.priceStockMap, ...action.payload };
    });
    builder.addCase(fetchImbretexPriceStockByRef.rejected, (state) => {
      state.loadingPrices = false;
    });
  },
});

export const { setLoadingProgress, appendProducts, clearPriceStock } = imbretexSlice.actions;
export default imbretexSlice.reducer;
