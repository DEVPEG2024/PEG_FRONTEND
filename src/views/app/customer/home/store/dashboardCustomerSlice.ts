import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Customer } from '@/@types/customer';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetDashboardCustomerInformations } from '@/services/DashboardCustomerService';
import {
  CustomerProductsResponse,
  apiGetCustomerProducts,
} from '@/services/ProductServices';
import { Product } from '@/@types/product';
import { Project } from '@/@types/project';
import { apiGetCustomerProjects } from '@/services/ProjectServices';
import { HOME_OFFERS } from '../offerShowcase';

export const SLICE_NAME = 'dashboardCustomer';

export type StateData = {
  loading: boolean;
  customer: Customer | null;
  products: Product[];
  /** Nombre total d'offres (products n'en porte que la première page) */
  offersTotal: number;
  projects: Project[];
};

const initialState: StateData = {
  loading: false,
  customer: null,
  products: [],
  offersTotal: 0,
  projects: [],
};

export const getDashboardCustomerInformations = createAsyncThunk(
  SLICE_NAME + '/getDashboardCustomerInformations',
  async (
    documentId: string
  ): Promise<{ products: Product[]; offersTotal: number; customer: Customer; projects: Project[] }> => {
    const { customer }: { customer: Customer } = await unwrapData(
      apiGetDashboardCustomerInformations(documentId)
    );

    let products: Product[] = [];
    let offersTotal = 0;
    if (customer?.customerCategory?.documentId) {
      const { products_connection }: { products_connection: CustomerProductsResponse } = await unwrapData(
        apiGetCustomerProducts(customer.documentId, customer.customerCategory.documentId, {
          page: 1,
          pageSize: HOME_OFFERS,
        })
      );
      products = products_connection.nodes;
      offersTotal = Math.max(products_connection.pageInfo?.total ?? 0, products.length);
    }

    let projects: Project[] = [];
    if (customer?.documentId) {
      const { projects_connection } = await unwrapData(
        apiGetCustomerProjects({
          customerDocumentId: customer.documentId,
          pagination: { page: 1, pageSize: 1000 },
          searchTerm: '',
        })
      );
      projects = projects_connection.nodes;
    }

    return { products, offersTotal, customer, projects };
  }
);

const dashboardCustomerSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getDashboardCustomerInformations.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      getDashboardCustomerInformations.fulfilled,
      (state, action) => {
        state.loading = false;
        // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
        state.customer = action.payload.customer as any;
        state.products = action.payload.products as any;
        state.offersTotal = action.payload.offersTotal;
        state.projects = action.payload.projects as any;
      }
    );
    builder.addCase(getDashboardCustomerInformations.rejected, (state) => {
      state.loading = false;
    });
  },
});

export default dashboardCustomerSlice.reducer;
