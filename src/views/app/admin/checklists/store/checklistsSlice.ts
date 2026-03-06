import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Checklist } from '@/@types/checklist';
import {
  apiCreateChecklist,
  apiDeleteChecklist,
  apiGetChecklists,
  apiUpdateChecklist,
  CreateChecklistRequest,
  DeleteChecklistResponse,
  GetChecklistsRequest,
  GetChecklistsResponse,
} from '@/services/ChecklistServices';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'checklists';

export type ChecklistsStateData = {
  checklists: Checklist[];
  checklist: Checklist | null;
  loading: boolean;
  total: number;
  dialogOpen: boolean;
};

const initialState: ChecklistsStateData = {
  checklists: [],
  checklist: null,
  loading: false,
  total: 0,
  dialogOpen: false,
};

export const getChecklists = createAsyncThunk(
  SLICE_NAME + '/getChecklists',
  async (data: GetChecklistsRequest): Promise<GetChecklistsResponse> => {
    const { checklists_connection }: { checklists_connection: GetChecklistsResponse } =
      await unwrapData(apiGetChecklists(data));
    return checklists_connection;
  }
);

export const createChecklist = createAsyncThunk(
  SLICE_NAME + '/createChecklist',
  async (data: CreateChecklistRequest): Promise<Checklist> => {
    const { createChecklist }: { createChecklist: Checklist } =
      await unwrapData(apiCreateChecklist(data));
    return createChecklist;
  }
);

export const updateChecklist = createAsyncThunk(
  SLICE_NAME + '/updateChecklist',
  async (data: Partial<Checklist>): Promise<Checklist> => {
    const { updateChecklist }: { updateChecklist: Checklist } =
      await unwrapData(apiUpdateChecklist(data));
    return updateChecklist;
  }
);

export const deleteChecklist = createAsyncThunk(
  SLICE_NAME + '/deleteChecklist',
  async (documentId: string): Promise<DeleteChecklistResponse> => {
    const { deleteChecklist }: { deleteChecklist: DeleteChecklistResponse } =
      await unwrapData(apiDeleteChecklist(documentId));
    return deleteChecklist;
  }
);

export const duplicateChecklist = createAsyncThunk(
  SLICE_NAME + '/duplicateChecklist',
  async (checklist: Checklist) => {
    const { documentId, ...duplicated } = checklist;
    const { createChecklist }: { createChecklist: Checklist } = await unwrapData(
      apiCreateChecklist(duplicated)
    );
    return createChecklist;
  }
);

const checklistsSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setChecklist: (state, action) => {
      state.checklist = action.payload;
    },
    setDialogOpen: (state, action) => {
      state.dialogOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getChecklists.pending, (state) => { state.loading = true; });
    builder.addCase(getChecklists.fulfilled, (state, action) => {
      state.loading = false;
      state.checklists = action.payload.nodes as Checklist[];
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getChecklists.rejected, (state) => { state.loading = false; });

    builder.addCase(createChecklist.pending, (state) => { state.loading = true; });
    builder.addCase(createChecklist.fulfilled, (state, action) => {
      state.loading = false;
      state.checklists.push(action.payload);
      state.total += 1;
    });
    builder.addCase(createChecklist.rejected, (state) => { state.loading = false; });

    builder.addCase(updateChecklist.pending, (state) => { state.loading = true; });
    builder.addCase(updateChecklist.fulfilled, (state, action) => {
      state.loading = false;
      state.checklists = state.checklists.map((c) =>
        c.documentId === action.payload.documentId ? action.payload : c
      );
    });
    builder.addCase(updateChecklist.rejected, (state) => { state.loading = false; });

    builder.addCase(deleteChecklist.pending, (state) => { state.loading = true; });
    builder.addCase(deleteChecklist.fulfilled, (state, action) => {
      state.loading = false;
      state.checklists = state.checklists.filter(
        (c) => c.documentId !== action.payload.documentId
      );
      state.total -= 1;
    });

    builder.addCase(duplicateChecklist.pending, (state) => { state.loading = true; });
    builder.addCase(duplicateChecklist.fulfilled, (state, action) => {
      state.loading = false;
      state.checklists.push(action.payload);
      state.total += 1;
    });
    builder.addCase(duplicateChecklist.rejected, (state) => { state.loading = false; });
  },
});

export const { setChecklist, setDialogOpen } = checklistsSlice.actions;
export default checklistsSlice.reducer;
