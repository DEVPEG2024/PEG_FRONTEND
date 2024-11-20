import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Form, IForm } from '@/@types/form';
import {
  apiDeleteForm,
  apiGetForms,
  apiUpdateForm,
  DeleteFormResponse,
  GetFormsRequest,
  GetFormsResponse,
} from '@/services/FormServices';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'forms';

export type FormsStateData = {
  forms: Form[];
  form: Form | null;
  loading: boolean;
  modalDelete: boolean;
  total: number;
  newFormDialog: boolean;
  formComponents: any[]
};

const initialState: FormsStateData = {
  forms: [],
  form: null,
  loading: false,
  modalDelete: false,
  total: 0,
  newFormDialog: false,
  formComponents: []
};

/// forms
export const getForms = createAsyncThunk(
  SLICE_NAME + '/getForms',
  async (data: GetFormsRequest): Promise<GetFormsResponse> => {
    const {forms_connection} : {forms_connection: GetFormsResponse}= await unwrapData(apiGetForms(data));
    return forms_connection
  }
);

export const updateForm = createAsyncThunk(
  SLICE_NAME + '/updateForm',
  async (data: IForm) => {
    const response = await apiUpdateForm(data);
    return response.data;
  }
);

// delete form
export const deleteForm = createAsyncThunk(
  SLICE_NAME + '/deleteForm',
  async (documentId: string): Promise<DeleteFormResponse> => {
    const {deleteForm} : {deleteForm: DeleteFormResponse} = await unwrapData(apiDeleteForm(documentId));
    return deleteForm;
  }
);

const formsSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setTableData: (state, action) => {
      state.forms = action.payload;
    },
    setForm: (state, action) => {
      state.form = action.payload;
    },
    setNewFormDialog: (state, action) => {
      state.newFormDialog = action.payload;
    },
    setModalDeleteOpen: (state) => {
      state.modalDelete = true;
    },
    setModalDeleteClose: (state) => {
      state.modalDelete = false;
    },
    setFormComponents: (state, action) => {
      state.formComponents = action.payload;
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
      state.forms = state.forms.filter((form) => form.documentId !== action.payload.documentId);
    });
  },
});

export const {
  setTableData,
  setForm,
  setModalDeleteOpen,
  setModalDeleteClose,
  setNewFormDialog,
  setFormComponents
} = formsSlice.actions;

export default formsSlice.reducer;
