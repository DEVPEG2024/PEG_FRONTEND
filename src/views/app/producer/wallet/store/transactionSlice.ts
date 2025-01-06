import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { unwrapData } from '@/utils/serviceHelper';
import { User } from '@/@types/user';
import { Transaction } from '@/@types/transaction';
import { apiGetTransactions, GetTransactionsRequest, GetTransactionsResponse } from '@/services/TransactionsServices';
import { paymentAddTypes, paymentRemoveTypes } from '../constants';

export const SLICE_NAME = 'transactions';

export type TransactionListState = {
  transactions: Transaction[];
  amount: number;
  total: number;
  loading: boolean;
};

export type GetTransactions = {
  request: GetTransactionsRequest;
  user: User;
}

export const getOwnTransactions = createAsyncThunk(
  SLICE_NAME + '/getOwnTransactions',
  async (data: GetTransactions): Promise<GetTransactionsResponse> => {
    const {transactions_connection} : {transactions_connection: GetTransactionsResponse}= await unwrapData(apiGetTransactions(data.request, data.user.documentId));
    return transactions_connection
  }
);

const initialState: TransactionListState = {
  transactions: [],
  amount: 0,
  loading: false,
  total: 0,
};

const transactionListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // GET TRANSACTIONS
    builder.addCase(getOwnTransactions.pending, (state) => {
          state.loading = true;
        });
    builder.addCase(getOwnTransactions.fulfilled, (state, action) => {
      state.transactions = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
      state.amount = action.payload.nodes.reduce((acc, transaction) => {
        if (paymentAddTypes.map(({value}) => value).includes(transaction.type)) {
          acc += transaction.amount;
        }
        if (paymentRemoveTypes.map(({value}) => value).includes(transaction.type)) {
          acc -= transaction.amount;
        }
        return acc;
      }, 0);
    });
  },
});

export default transactionListSlice.reducer;
