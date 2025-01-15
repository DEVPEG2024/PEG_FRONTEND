import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Invoice } from '@/@types/invoice';
import {
  apiGetCustomerInvoices,
  apiGetInvoices,
  apiUpdateInvoice,
  GetInvoicesRequest,
  GetInvoicesResponse,
} from '@/services/InvoicesServices';
import { unwrapData } from '@/utils/serviceHelper';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import {
  ADMIN,
  CUSTOMER,
  PRODUCER,
  SUPER_ADMIN,
} from '@/constants/roles.constant';

export const SLICE_NAME = 'invoices';

export type InvoiceListState = {
  invoices: Invoice[];
  total: number;
  selectedInvoice: Invoice | null;
  editInvoiceDialog: boolean;
  printInvoiceDialog: boolean;
  loading: boolean;
};

export type GetInvoices = {
  request: GetInvoicesRequest;
  user: User;
};

export const getInvoices = createAsyncThunk(
  SLICE_NAME + '/getInvoices',
  async (data: GetInvoices): Promise<GetInvoicesResponse> => {
    if (hasRole(data.user, [SUPER_ADMIN, ADMIN])) {
      const {
        invoices_connection,
      }: { invoices_connection: GetInvoicesResponse } = await unwrapData(
        apiGetInvoices(data.request)
      );
      return invoices_connection;
    } else if (hasRole(data.user, [CUSTOMER])) {
      const {
        invoices_connection,
      }: { invoices_connection: GetInvoicesResponse } = await unwrapData(
        apiGetCustomerInvoices({
          ...data.request,
          customerDocumentId: data.user.customer!.documentId,
        })
      );
      return invoices_connection;
    } else if (hasRole(data.user, [PRODUCER])) {
      const {
        projects_connection,
      }: { projects_connection: GetInvoicesResponse } = await unwrapData(
        apiGetProducerInvoices(data)
      ); // TODO: à corriger (est-ce nécessaire pour le producteur?)
      return projects_connection;
    }
    return {
      nodes: [],
      pageInfo: { page: 1, pageCount: 1, pageSize: 0, total: 0 },
    };
  }
);

export const updateInvoice = createAsyncThunk(
  SLICE_NAME + '/updateInvoice',
  async (data: Partial<Invoice>): Promise<Invoice> => {
    const { updateInvoice }: { updateInvoice: Invoice } = await unwrapData(
      apiUpdateInvoice(data)
    );
    return updateInvoice;
  }
);

const initialState: InvoiceListState = {
  invoices: [],
  selectedInvoice: null,
  editInvoiceDialog: false,
  printInvoiceDialog: false,
  loading: false,
  total: 0,
};

const invoiceListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setEditInvoiceDialog: (state, action) => {
      state.editInvoiceDialog = action.payload;
    },
    setPrintInvoiceDialog: (state, action) => {
      state.printInvoiceDialog = action.payload;
    },
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
  },
  extraReducers: (builder) => {
    // GET INVOICES
    builder.addCase(getInvoices.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getInvoices.fulfilled, (state, action) => {
      state.invoices = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    // UPDATE INVOICE
    builder.addCase(updateInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.invoices = state.invoices.map((invoice) =>
        invoice.documentId === action.payload.documentId
          ? action.payload
          : invoice
      );
      state.editInvoiceDialog = false;
      state.selectedInvoice = null;
    });
    builder.addCase(updateInvoice.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setEditInvoiceDialog,
  setPrintInvoiceDialog,
  setSelectedInvoice,
} = invoiceListSlice.actions;

export default invoiceListSlice.reducer;
