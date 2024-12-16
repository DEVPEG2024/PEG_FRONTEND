import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Comment, IFile, Project, Task } from '@/@types/project';
import {
  apiGetInvoicesProject,
  apiUpdateInvoice,
  apiGetProjectById,
  DeleteProjectResponse,
  apiDeleteProject,
  apiUpdateProject,
} from '@/services/ProjectServices';
import { WritableDraft } from 'immer';
import { Invoice, InvoiceOld } from '@/@types/invoice';
import { unwrapData } from '@/utils/serviceHelper';
import { apiCreateTask, apiDeleteTask, apiUpdateTask, CreateTaskRequest, DeleteTaskResponse } from '@/services/TaskService';
import { apiCreateInvoice, apiDeleteInvoice, CreateInvoiceRequest, DeleteInvoiceResponse } from '@/services/InvoicesServices';

export const SLICE_NAME = 'projectDetails';

export type ProjectDetailsState = {
  project: Project;
  tasks: Task[];
  invoices: Invoice[];
  selectedTask: Task | null;
  selectedInvoice: InvoiceOld | null;
  editProjectDialog: boolean;
  newInvoiceDialog: boolean;
  editInvoiceDialog: boolean;
  newDialogTask: boolean;
  editDialogTask: boolean;
  selectedTab: string;
  editDescription: boolean;
  loading: boolean;
};

export const getProjectById = createAsyncThunk(
  SLICE_NAME + '/getProject',
  async (documentId: string): Promise<{project: Project}> => {
    return await unwrapData(apiGetProjectById(documentId));
  }
);

export const deleteProject = createAsyncThunk(
  SLICE_NAME + '/deleteProject',
  async (documentId: string): Promise<DeleteProjectResponse> => {
    const {deleteProject} : {deleteProject: DeleteProjectResponse} = await unwrapData(apiDeleteProject(documentId));
    //TODO: à remettre
    //apiDeleteFiles(data.project.images.map(({ fileNameBack }) => fileNameBack));
    return deleteProject;
  }
);

export const updateProject = createAsyncThunk(
  SLICE_NAME + '/updateProject',
  async (data: Partial<Project>): Promise<Project> => {
    const {updateProject} : {updateProject: Project} = await unwrapData(apiUpdateProject(data));
    return updateProject;
  }
);

export type CreateTask = {
  task: CreateTaskRequest;
  project: Project;
}

export const createTask = createAsyncThunk(
  SLICE_NAME + '/createTask',
  async (data: CreateTask) : Promise<Task> => {
    const {createTask} : {createTask: Task} = await unwrapData(apiCreateTask(data.task));
    await apiUpdateProject({documentId: data.project.documentId, tasks: [...data.project.tasks.map(({documentId}) => documentId), createTask.documentId]})
    return createTask;
  }
);

export const deleteTask = createAsyncThunk(
  SLICE_NAME + '/deleteTask',
  async (documentId: string): Promise<DeleteTaskResponse> => {
    const {deleteTask} : {deleteTask: DeleteTaskResponse} = await unwrapData(apiDeleteTask(documentId));
    return deleteTask;
  }
);

export const updateTask = createAsyncThunk(
  SLICE_NAME + '/updateTask',
  async (data: Partial<Task>): Promise<Task> => {
    const {updateTask} : {updateTask: Task} = await unwrapData(apiUpdateTask(data));
    return updateTask;
  }
);

export const createInvoice = createAsyncThunk(
  SLICE_NAME + '/createInvoice',
  async (data: CreateInvoiceRequest) : Promise<Invoice> => {
    const {createInvoice} : {createInvoice: Invoice} = await unwrapData(apiCreateInvoice(data));
    return createInvoice;
  }
);

export const deleteInvoice = createAsyncThunk(
  SLICE_NAME + '/deleteInvoice',
  async (documentId: string): Promise<DeleteInvoiceResponse> => {
    const {deleteInvoice} : {deleteInvoice: DeleteInvoiceResponse} = await unwrapData(apiDeleteInvoice(documentId));
    return deleteInvoice;
  }
);

type GetInvoicesProjectRequest = {
  projectId: string;
};

export const getInvoicesProject = createAsyncThunk(
  SLICE_NAME + '/getInvoicesProject',
  async (data: GetInvoicesProjectRequest) => {
    const response = await apiGetInvoicesProject(data);
    return response.data;
  }
);

type UpdateInvoiceRequest = {
  invoice: InvoiceOld;
  invoiceId: string;
};

export const updateInvoice = createAsyncThunk(
  SLICE_NAME + '/updateInvoice',
  async (data: UpdateInvoiceRequest) => {
    const response = await apiUpdateInvoice(data);
    return response.data;
  }
);

const initialState: ProjectDetailsState = {
  invoices: [],
  tasks: [],
  project: undefined,
  editProjectDialog: false,
  newInvoiceDialog: false,
  selectedInvoice: null,
  editInvoiceDialog: false,
  newDialogTask: false,
  editDialogTask: false,
  selectedTask: null,
  loading: false,
  selectedTab: 'Accueil',
  editDescription: false,
};

const projectListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setEditDescription: (state, action) => {
      state.editDescription = action.payload;
    },
    setEditProjectDialog: (state, action) => {
      state.editProjectDialog = action.payload;
    },

    setSelectedTab: (state, action) => {
      state.selectedTab = action.payload;
    },
    setAddComment: (state, action) => {
      if (state.project) {
        state.project.comments.push(action.payload);
      }
    },
    setDeleteComment: (state, action) => {
      if (state.project) {
        state.project.comments = state.project.comments.filter(
          (comment: Comment) => comment.documentId !== action.payload
        );
      }
    },
    setAddFile: (state, action) => {
      if (state.project) {
        state.project.files.push(action.payload);
      }
    },
    setDeleteFile: (state, action) => {
      if (state.project) {
        state.project.files = state.project.files.filter(
          (file: WritableDraft<IFile>) => file._id !== action.payload
        );
      }
    },
    setNewDialogTask: (state, action) => {
      state.newDialogTask = action.payload;
    },
    setEditDialogTask: (state, action) => {
      state.editDialogTask = action.payload;
    },
    setSelectedTask: (state, action) => {
      state.selectedTask = action.payload;
    },
    setAddTask: (state, action) => {
      if (state.project) {
        state.project.tasks.push(action.payload);
      }
    },
    setEditTaskSelected: (state, action) => {
      console.log('action.payload', action.payload);
      if (state.project) {
        state.project.tasks = state.project.tasks.map(
          (task: Task) =>
            task.documentId === action.payload.documentId ? action.payload : task
        );
        // Mise à jour de selectedTask
        state.selectedTask = action.payload;
      }
    },
    setDeleteTask: (state, action) => {
      if (state.project) {
        state.project.tasks = state.project.tasks.filter(
          (task: Task) => task.documentId !== action.payload
        );
      }
    },
    setNewInvoiceDialog: (state, action) => {
      state.newInvoiceDialog = action.payload;
    },
    setEditInvoiceDialog: (state, action) => {
      state.editInvoiceDialog = action.payload;
    },
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProjectById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProjectById.fulfilled, (state, action) => {
      state.project = action.payload.project;
      state.tasks = action.payload.project.tasks
      state.invoices = action.payload.project.invoices
      state.loading = false;
    });
    // UPDATE PROJECT
    builder.addCase(updateProject.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateProject.fulfilled, (state, action) => {
      state.loading = false;
      state.project = action.payload;
      state.editDescription = false;
    });
    builder.addCase(updateProject.rejected, (state) => {
      state.loading = false;
    });
    // CREATE TASK
    builder.addCase(createTask.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.loading = false;
      if (state.project) {
        state.project.tasks.push(action.payload);
      }
      state.newDialogTask = false;
    });
    builder.addCase(createTask.rejected, (state) => {
      state.loading = false;
    });
    // UPDATE TASK
    builder.addCase(updateTask.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateTask.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks = state.tasks.map((task) =>
        task.documentId === action.payload.documentId ? action.payload : task
      );
      state.project!.tasks = state.tasks
      state.editDialogTask = false
    });
    builder.addCase(updateTask.rejected, (state) => {
      state.loading = false;
    });
    // GET INVOICES PROJECT
    builder.addCase(getInvoicesProject.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getInvoicesProject.fulfilled, (state, action) => {
      state.invoices = action.payload.invoices as never;
      state.loading = false;
    });
    builder.addCase(getInvoicesProject.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
    // CREATE INVOICE
    builder.addCase(createInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.newInvoiceDialog = false;
      state.invoices.push(action.payload.invoice as never);
    });
    builder.addCase(createInvoice.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
    // UPDATE INVOICE
    builder.addCase(updateInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.editInvoiceDialog = false;
      state.invoices = state.invoices.map((invoice) =>
        invoice._id === action.payload.invoice._id
          ? action.payload.invoice
          : invoice
      ) as WritableDraft<InvoiceOld>[];
    });
    builder.addCase(updateInvoice.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
    // DELETE INVOICE
    builder.addCase(deleteInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.invoices = state.invoices.filter(
        (invoice) => invoice.documentId !== action.payload.documentId
      );
    });
    builder.addCase(deleteInvoice.rejected, (state, action) => {
      state.loading = false;
    });
  },
});

export const {
  setEditProjectDialog,
  setSelectedTab,
  setAddComment,
  setDeleteComment,
  setAddFile,
  setDeleteFile,
  setNewDialogTask,
  setEditDialogTask,
  setAddTask,
  setEditTaskSelected,
  setDeleteTask,
  setSelectedTask,
  setNewInvoiceDialog,
  setEditInvoiceDialog,
  setSelectedInvoice,
  setEditDescription,
} = projectListSlice.actions;

export default projectListSlice.reducer;
