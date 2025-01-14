import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Form } from '@/@types/form';
import {
  apiCreateForm,
  apiDeleteForm,
  apiGetForms,
  apiUpdateForm,
  CreateFormRequest,
  DeleteFormResponse,
  GetFormsRequest,
  GetFormsResponse,
} from '@/services/FormServices';
import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';

export const SLICE_NAME = 'forms';

export type FormsStateData = {
  forms: Form[];
  form: Form | null;
  loading: boolean;
  total: number;
  newFormDialog: boolean;
};

const initialState: FormsStateData = {
  forms: [],
  form: null,
  loading: false,
  total: 0,
  newFormDialog: false,
};

/// forms
export const getForms = createAsyncThunk(
  SLICE_NAME + '/getForms',
  async (data: GetFormsRequest): Promise<GetFormsResponse> => {
    const { forms_connection }: { forms_connection: GetFormsResponse } =
      await unwrapData(apiGetForms(data));
    return forms_connection;
  }
);

// MODELE UPDATE
export const updateForm = createAsyncThunk(
  SLICE_NAME + '/updateForm',
  async (data: Partial<Form>): Promise<ApiResponse<{ updateForm: Form }>> => {
    const response: AxiosResponse<ApiResponse<{ updateForm: Form }>> =
      await apiUpdateForm(data);
    return response.data;
  }
);

// MODELE CREATE
export const createForm = createAsyncThunk(
  SLICE_NAME + '/createForm',
  async (
    data: CreateFormRequest
  ): Promise<ApiResponse<{ createForm: Form }>> => {
    const response: AxiosResponse<ApiResponse<{ createForm: Form }>> =
      await apiCreateForm(data);
    return response.data;
  }
);

export const deleteForm = createAsyncThunk(
  SLICE_NAME + '/deleteForm',
  async (documentId: string): Promise<DeleteFormResponse> => {
    const { deleteForm }: { deleteForm: DeleteFormResponse } = await unwrapData(
      apiDeleteForm(documentId)
    );
    return deleteForm;
  }
);

const formsSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setForm: (state, action) => {
      state.form = action.payload;
    },
    setNewFormDialog: (state, action) => {
      state.newFormDialog = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getForms.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getForms.fulfilled, (state, action) => {
      state.loading = false;
      state.forms = action.payload.nodes as Form[];
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getForms.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteForm.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteForm.fulfilled, (state, action) => {
      console.log(action.payload);
      state.loading = false;
      state.forms = state.forms.filter(
        (form) => form.documentId !== action.payload.documentId
      );
      state.total -= 1;
    });
    builder.addCase(updateForm.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateForm.fulfilled, (state, action) => {
      state.loading = false;
      state.forms = state.forms.map((form) =>
        form.documentId === action.payload.data.updateForm.documentId
          ? action.payload.data.updateForm
          : form
      );
    });
    builder.addCase(updateForm.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(createForm.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createForm.fulfilled, (state, action) => {
      state.loading = false;
      state.forms.push(action.payload.data.createForm);
      state.total += 1;
    });
    builder.addCase(createForm.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setForm, setNewFormDialog } = formsSlice.actions;

export default formsSlice.reducer;
