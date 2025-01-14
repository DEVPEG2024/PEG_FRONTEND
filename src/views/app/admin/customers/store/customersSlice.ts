import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { unwrapData } from '@/utils/serviceHelper';
import { Customer } from '@/@types/customer';
import {
  apiDeleteCustomer,
  apiGetCustomerForEditById,
  apiGetCustomers,
  DeleteCustomerResponse,
  GetCustomersRequest,
  GetCustomersResponse,
} from '@/services/CustomerServices';

export const SLICE_NAME = 'customers';

export type CustomersState = {
  customers: Customer[];
  total: number;
  loading: boolean;
  customer?: Customer;
};

const initialState: CustomersState = {
  customers: [],
  loading: false,
  total: 0,
  customer: undefined,
};

export const getCustomers = createAsyncThunk(
  SLICE_NAME + '/getCustomers',
  async (data: GetCustomersRequest): Promise<GetCustomersResponse> => {
    const {
      customers_connection,
    }: { customers_connection: GetCustomersResponse } = await unwrapData(
      apiGetCustomers(data)
    );
    return customers_connection;
  }
);

export const getCustomerById = createAsyncThunk(
  SLICE_NAME + '/getCustomerById',
  async (documentId: string): Promise<{ customer: Customer }> => {
    return await unwrapData(apiGetCustomerForEditById(documentId));
  }
);

export const deleteCustomer = createAsyncThunk(
  SLICE_NAME + '/deleteCustomer',
  async (documentId: string): Promise<DeleteCustomerResponse> => {
    const { deleteCustomer }: { deleteCustomer: DeleteCustomerResponse } =
      await unwrapData(apiDeleteCustomer(documentId));
    return deleteCustomer;
  }
);

const customersSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setCustomer: (state, action) => {
      state.customer = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getCustomers.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getCustomers.fulfilled, (state, action) => {
      state.customers = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    // DELETE CUSTOMER
    builder.addCase(deleteCustomer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteCustomer.fulfilled, (state, action) => {
      state.loading = false;
      state.customers = state.customers.filter(
        (customer: Customer) =>
          customer.documentId !== action.payload.documentId
      );
      state.total -= 1;
    });

    builder.addCase(getCustomerById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getCustomerById.fulfilled, (state, action) => {
      state.loading = false;
      state.customer = action.payload.customer;
    });
    builder.addCase(getCustomerById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setCustomer } = customersSlice.actions;

export default customersSlice.reducer;
