import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { IForm, IFormList } from "@/@types/forms";
import {
  apiCreateForm,
  apiDeleteForm,
  apiGetForms,
  apiUpdateForm,
} from "@/services/FormServices";

export type StateData = {
  loading: boolean;
  forms: IFormList[];
  form: IFormList | null;
  modalDelete: boolean;
  total: number;
  result: boolean;
  message: string;
};

type Query = {
  page: number;
  pageSize: number;
  searchTerm: string;
};

type GetProductListRequest = Query;
export const SLICE_NAME = "forms";

/// forms

export const getForms = createAsyncThunk(
  SLICE_NAME + "/getForms",
  async (data: GetProductListRequest) => {
    const response = await apiGetForms(
      data.page,
      data.pageSize,
      data.searchTerm
    );
    return response.data;
  }
);

export const createForm = createAsyncThunk(
  SLICE_NAME + "/createForm",
  async (data: IFormList) => {
    const response = await apiCreateForm(data);
    return response.data;
  }
);

export const updateForm = createAsyncThunk(
  SLICE_NAME + "/updateForm",
  async (data: IFormList) => {
    const response = await apiUpdateForm(data);
    return response.data;
  }
);

// delete form
export const deleteForm = createAsyncThunk(
  SLICE_NAME + "/deleteForm",
  async (id: string) => {
     await apiDeleteForm(id);
    return id;
  }
);

const initialState: StateData = {
  loading: false,
  modalDelete: false,
  forms: [],
  form: null,
  total: 0,
  result: false,
  message: "",
};

const licencieSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setTableData: (state, action) => {
      state.forms = action.payload;
    },
    setForm: (state, action) => {
      state.form = action.payload;
    },
    setModalDeleteOpen: (state) => {
      state.modalDelete = true;
    },
    setModalDeleteClose: (state) => {
      state.modalDelete = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getForms.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getForms.fulfilled, (state, action) => {
      state.loading = false;
      state.forms = action.payload.forms as unknown as IFormList[];
      state.total = action.payload.total;
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
      state.forms = state.forms.filter((form) => form._id !== action.payload);
    })
  },
});

export const {
  setTableData,
  setForm,
  setModalDeleteOpen,
  setModalDeleteClose,
} = licencieSlice.actions;

export default licencieSlice.reducer;
