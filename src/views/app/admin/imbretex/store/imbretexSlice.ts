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

export const fetchAllImbretexProducts = createAsyncThunk(
  SLICE_NAME + '/fetchAll',
  async (_, { dispatch }) => {
    // Page 1
    const first = await apiGetImbretexProducts({ page: 1, perPage: 50 });
    const totalPages = first.totalNumberPage;
    const totalProducts = first.productCount;

    dispatch(appendProducts(first.products));
    dispatch(setTotalProducts(totalProducts));
    dispatch(setLoadingProgress(Math.round(100 / totalPages)));

    // Remaining pages — batches of 3, with error tolerance
    const BATCH_SIZE = 3;
    for (let start = 2; start <= totalPages; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, totalPages);
      const batch = [];
      for (let p = start; p <= end; p++) {
        batch.push(
          apiGetImbretexProducts({ page: p, perPage: 50 })
            .catch(() => null) // skip failed pages
        );
      }
      const results = await Promise.all(batch);
      const newProducts: ImbretexProduct[] = [];
      for (const res of results) {
        if (res?.products) {
          newProducts.push(...res.products);
        }
      }
      if (newProducts.length > 0) {
        dispatch(appendProducts(newProducts));
      }
      dispatch(setLoadingProgress(Math.round((end / totalPages) * 100)));
    }

    return true;
  }
);

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
    setTotalProducts: (state, action: PayloadAction<number>) => {
      state.totalProducts = action.payload;
    },
    appendProducts: (state, action: PayloadAction<ImbretexProduct[]>) => {
      state.allProducts.push(...action.payload);
    },
    clearPriceStock: (state) => {
      state.priceStockMap = {};
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAllImbretexProducts.pending, (state) => {
      state.loading = true;
      state.loadingProgress = 0;
      state.allProducts = [];
      state.totalProducts = 0;
      state.error = null;
    });
    builder.addCase(fetchAllImbretexProducts.fulfilled, (state) => {
      state.loading = false;
      state.loadingProgress = 100;
    });
    builder.addCase(fetchAllImbretexProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Erreur lors du chargement';
    });

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

export const { setLoadingProgress, setTotalProducts, appendProducts, clearPriceStock } = imbretexSlice.actions;
export default imbretexSlice.reducer;
