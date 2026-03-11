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

export const SLICE_NAME = 'dashboardCustomer';

export type StateData = {
  loading: boolean;
  customer: Customer | null;
  products: Product[];
  projects: Project[];
};

const initialState: StateData = {
  loading: false,
  customer: null,
  products: [],
  projects: [],
};

export const getDashboardCustomerInformations = createAsyncThunk(
  SLICE_NAME + '/getDashboardCustomerInformations',
  async (
    documentId: string
  ): Promise<{ products: Product[]; customer: Customer; projects: Project[] }> => {
    const { customer }: { customer: Customer } = await unwrapData(
      apiGetDashboardCustomerInformations(documentId)
    );

    let products: Product[] = [];
    if (customer?.customerCategory?.documentId) {
      const { products_connection }: { products_connection: CustomerProductsResponse } = await unwrapData(
        apiGetCustomerProducts(customer.documentId, customer.customerCategory.documentId)
      );
      products = products_connection.nodes;
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

    return { products, customer, projects };
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
        state.customer = action.payload.customer;
        state.products = action.payload.products;
        state.projects = action.payload.projects;
      }
    );
    builder.addCase(getDashboardCustomerInformations.rejected, (state) => {
      state.loading = false;
    });
  },
});

export default dashboardCustomerSlice.reducer;
