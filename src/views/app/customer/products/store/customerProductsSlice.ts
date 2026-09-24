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
  /** « Voir plus » en cours : la grille reste affichée (pas de squelettes). */
  loadingMore: boolean;
  /** Dernier chargement en échec — distinct d'une liste vide. */
  error: boolean;
  /** Échec d'un « Voir plus » : la grille déjà chargée reste affichée. */
  loadMoreError: boolean;
  /**
   * Identifiant de la DERNIÈRE requête envoyée. Une réponse plus ancienne
   * (recherche lente, « Voir plus » doublé par une recherche) est ignorée :
   * sans ce garde, elle écrasait la liste courante.
   */
  requestId: string | null;
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
  /** « Voir plus » : même page 1 avec un pageSize agrandi. */
  loadMore?: boolean;
};

type GetProductListRequest = Query;
export const SLICE_NAME = 'customerProducts';

export const getCustomerProducts = createAsyncThunk(
  SLICE_NAME + '/getCustomerProducts',
  async (
    data: GetProductListRequest
  ): Promise<{ products: Product[]; total: number }> => {
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
    const nodes = products_connection?.nodes ?? [];
    return {
      products: nodes,
      total: products_connection?.pageInfo?.total ?? nodes.length,
    };
  }
);

const initialState: StateData = {
  loading: false,
  loadingMore: false,
  error: false,
  loadMoreError: false,
  requestId: null,
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
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.product =
        ((state.products as unknown as Product[]).find(
          (product) => product.documentId === action.payload
        ) ?? null) as any;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getCustomerProducts.pending, (state, action) => {
      state.requestId = action.meta.requestId;
      state.error = false;
      state.loadMoreError = false;
      // « Voir plus » : on garde la grille affichée au lieu de la remplacer
      // par des squelettes.
      state.loadingMore =
        !!action.meta.arg.loadMore && state.products.length > 0;
      state.loading = !state.loadingMore;
    });
    builder.addCase(getCustomerProducts.fulfilled, (state, action) => {
      if (action.meta.requestId !== state.requestId) return; // réponse périmée
      state.loading = false;
      state.loadingMore = false;
      state.error = false;
      state.loadMoreError = false;
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.products = action.payload.products as any;
      state.total = action.payload.total;
    });
    builder.addCase(getCustomerProducts.rejected, (state, action) => {
      if (action.meta.requestId !== state.requestId) return; // réponse périmée
      // Un « Voir plus » en échec ne masque pas les offres déjà affichées.
      if (state.loadingMore) state.loadMoreError = true;
      else state.error = true;
      state.loading = false;
      state.loadingMore = false;
    });
  },
});

export const { setProduct } = productSlice.actions;

export default productSlice.reducer;
