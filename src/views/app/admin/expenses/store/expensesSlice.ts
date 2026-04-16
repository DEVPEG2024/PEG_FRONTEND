import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Expense } from '@/@types/expense';
import {
  apiGetExpenses,
  apiCreateExpense,
  apiUpdateExpense,
  apiDeleteExpense,
  CreateExpenseRequest,
  DeleteExpenseResponse,
  GetExpensesRequest,
  GetExpensesResponse,
} from '@/services/ExpenseServices';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'expenses';

export type ExpensesState = {
  expenses: Expense[];
  total: number;
  selectedExpense: Expense | null;
  editDialog: boolean;
  loading: boolean;
};

export const getExpenses = createAsyncThunk(
  SLICE_NAME + '/getExpenses',
  async (data: GetExpensesRequest): Promise<GetExpensesResponse> => {
    const { expenses_connection }: { expenses_connection: GetExpensesResponse } =
      await unwrapData(apiGetExpenses(data));
    return expenses_connection;
  }
);

export const createExpense = createAsyncThunk(
  SLICE_NAME + '/createExpense',
  async (data: CreateExpenseRequest): Promise<Expense> => {
    const { createExpense }: { createExpense: Expense } = await unwrapData(
      apiCreateExpense(data)
    );
    return createExpense;
  }
);

export const updateExpense = createAsyncThunk(
  SLICE_NAME + '/updateExpense',
  async (data: Partial<Expense>): Promise<Expense> => {
    const { updateExpense }: { updateExpense: Expense } = await unwrapData(
      apiUpdateExpense(data)
    );
    return updateExpense;
  }
);

export const deleteExpense = createAsyncThunk(
  SLICE_NAME + '/deleteExpense',
  async (documentId: string): Promise<DeleteExpenseResponse> => {
    const { deleteExpense }: { deleteExpense: DeleteExpenseResponse } =
      await unwrapData(apiDeleteExpense(documentId));
    return deleteExpense;
  }
);

const initialState: ExpensesState = {
  expenses: [],
  total: 0,
  selectedExpense: null,
  editDialog: false,
  loading: false,
};

const expensesSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setEditDialog: (state, action) => {
      state.editDialog = action.payload;
    },
    setSelectedExpense: (state, action) => {
      state.selectedExpense = action.payload;
    },
  },
  extraReducers: (builder) => {
    // GET
    builder.addCase(getExpenses.pending, (state) => { state.loading = true; });
    builder.addCase(getExpenses.fulfilled, (state, action) => {
      state.loading = false;
      state.expenses = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getExpenses.rejected, (state) => { state.loading = false; });
    // CREATE
    builder.addCase(createExpense.pending, (state) => { state.loading = true; });
    builder.addCase(createExpense.fulfilled, (state, action) => {
      state.loading = false;
      state.expenses = [action.payload, ...state.expenses];
      state.total += 1;
      state.editDialog = false;
      state.selectedExpense = null;
    });
    builder.addCase(createExpense.rejected, (state) => { state.loading = false; });
    // UPDATE
    builder.addCase(updateExpense.pending, (state) => { state.loading = true; });
    builder.addCase(updateExpense.fulfilled, (state, action) => {
      state.loading = false;
      state.expenses = state.expenses.map((e) =>
        e.documentId === action.payload.documentId ? action.payload : e
      );
      state.editDialog = false;
      state.selectedExpense = null;
    });
    builder.addCase(updateExpense.rejected, (state) => { state.loading = false; });
    // DELETE
    builder.addCase(deleteExpense.pending, (state) => { state.loading = true; });
    builder.addCase(deleteExpense.fulfilled, (state, action) => {
      state.loading = false;
      state.expenses = state.expenses.filter(
        (e) => e.documentId !== action.payload.documentId
      );
      state.total -= 1;
    });
    builder.addCase(deleteExpense.rejected, (state) => { state.loading = false; });
  },
});

export const { setEditDialog, setSelectedExpense } = expensesSlice.actions;
export default expensesSlice.reducer;
