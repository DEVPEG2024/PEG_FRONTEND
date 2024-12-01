import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Comment, IFile, IProject, ITask, Project, Task } from '@/@types/project';
import {
  apiChangeTaskStatus,
  apiCreateTask,
  apiGetInvoicesProject,
  apiGetProjects,
  apiCreateInvoice,
  apiDeleteInvoice,
  apiUpdateInvoice,
  apiGetProjectsCustomer,
  GetProjectsRequest,
  GetProjectsResponse,
  GetCustomerProjectsRequest,
  GetCustomerProjectsResponse,
  apiGetCustomerProjects,
  apiGetProjectById,
} from '@/services/ProjectServices';
import { WritableDraft } from 'immer';
import { Invoice } from '@/@types/invoice';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'customerProjects';

export type ProjectListState = {
  projects: Project[];
  invoices: Invoice[];
  total: number;
  result: boolean;
  message: string;
  selectedTask: ITask | null;
  selectedInvoice: Invoice | null;
  selectedProject: Project | null;
  newProjectDialog: boolean;
  editProjectDialog: boolean;
  newInvoiceDialog: boolean;
  editInvoiceDialog: boolean;
  newDialogTask: boolean;
  editDialogTask: boolean;
  selectedTab: string;
  loading: boolean;
};

export const getProjects = createAsyncThunk(
  SLICE_NAME + '/getProducts',
  async (data: GetCustomerProjectsRequest): Promise<GetCustomerProjectsResponse> => {
    const {projects_connection} : {projects_connection: GetProjectsResponse}= await unwrapData(apiGetCustomerProjects(data));
    return projects_connection
  }
);

export const getProjectById = createAsyncThunk(
  SLICE_NAME + '/getProject',
  async (documentId: string): Promise<{project: Project}> => {
    return await unwrapData(apiGetProjectById(documentId));
  }
);

type CreateTaskRequest = {
  task: ITask;
  projectId: string;
};

export const createTask = createAsyncThunk(
  SLICE_NAME + '/createTask',
  async (data: CreateTaskRequest) => {
    const response = await apiCreateTask(data);
    return response.data;
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

type CreateInvoiceRequest = {
  invoice: Invoice;
  customerId: string;
  projectId: string;
  sellerId: string;
};

export const createInvoice = createAsyncThunk(
  SLICE_NAME + '/createInvoice',
  async (data: CreateInvoiceRequest) => {
    const response = await apiCreateInvoice(data);
    return response.data;
  }
);

type DeleteInvoiceRequest = {
  invoiceId: string;
};

export const deleteInvoice = createAsyncThunk(
  SLICE_NAME + '/deleteInvoice',
  async (data: DeleteInvoiceRequest) => {
    const response = await apiDeleteInvoice(data);
    return response.data;
  }
);

type UpdateInvoiceRequest = {
  invoice: Invoice;
  invoiceId: string;
};

export const updateInvoice = createAsyncThunk(
  SLICE_NAME + '/updateInvoice',
  async (data: UpdateInvoiceRequest) => {
    const response = await apiUpdateInvoice(data);
    return response.data;
  }
);

type ChangeTaskStatusRequest = {
  taskId: string;
  status: string;
  projectId: string;
};

export const changeTaskStatus = createAsyncThunk(
  SLICE_NAME + '/changeTaskStatus',
  async (data: ChangeTaskStatusRequest) => {
    const response = await apiChangeTaskStatus(data);
    return response.data;
  }
);

const initialState: ProjectListState = {
  projects: [],
  invoices: [],
  selectedProject: null,
  newProjectDialog: false,
  editProjectDialog: false,
  newInvoiceDialog: false,
  selectedInvoice: null,
  editInvoiceDialog: false,
  newDialogTask: false,
  editDialogTask: false,
  selectedTask: null,
  loading: false,
  total: 0,
  result: false,
  message: '',
  selectedTab: 'Accueil',
};

const projectListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setProjectList: (state, action) => {
      state.projects = action.payload;
    },
    setSelectedProject: (state, action) => {
      state.selectedProject = action.payload;
    },
    setNewProjectDialog: (state, action) => {
      state.newProjectDialog = action.payload;
    },
    setEditProjectDialog: (state, action) => {
      state.editProjectDialog = action.payload;
    },
    setProject: (state, action) => {
      state.selectedProject = action.payload.projectList.find(
        (project: IProject) => project._id === action.payload.id
      );
    },

    setSelectedTab: (state, action) => {
      state.selectedTab = action.payload;
    },
    setAddComment: (state, action) => {
      if (state.selectedProject) {
        state.selectedProject.comments.push(action.payload);
      }
    },
    setDeleteComment: (state, action) => {
      if (state.selectedProject) {
        state.selectedProject.comments = state.selectedProject.comments.filter(
          (comment: Comment) => comment.documentId !== action.payload
        );
      }
    },
    setAddFile: (state, action) => {
      if (state.selectedProject) {
        state.selectedProject.files.push(action.payload);
      }
    },
    setDeleteFile: (state, action) => {
      if (state.selectedProject) {
        state.selectedProject.files = state.selectedProject.files.filter(
          (file: WritableDraft<IFile>) => file._id !== action.payload
        );
      }
    },
    setNewDialogTask: (state, action) => {
      state.newDialogTask = action.payload;
    },
    setEditDialogTask: (state) => {
      state.editDialogTask = true;
    },
    setCloseEditDialogTask: (state) => {
      state.editDialogTask = false;
    },
    setSelectedTask: (state, action) => {
      state.selectedTask = action.payload;
    },
    setAddTask: (state, action) => {
      if (state.selectedProject) {
        state.selectedProject.tasks.push(action.payload);
      }
    },
    setEditTaskSelected: (state, action) => {
      console.log('action.payload', action.payload);
      if (state.selectedProject) {
        state.selectedProject.tasks = state.selectedProject.tasks.map(
          (task: Task) =>
            task.documentId === action.payload.documentId ? action.payload : task
        );
        // Mise à jour de selectedTask
        state.selectedTask = action.payload;
      }
    },
    setDeleteTask: (state, action) => {
      if (state.selectedProject) {
        state.selectedProject.tasks = state.selectedProject.tasks.filter(
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
    builder.addCase(getProjects.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProjects.fulfilled, (state, action) => {
      state.projects = action.payload.nodes as Project[];
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    builder.addCase(getProjectById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProjectById.fulfilled, (state, action) => {
      state.selectedProject = action.payload.project;
      state.loading = false;
    });
    // CREATE TASK
    builder.addCase(createTask.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.loading = false;
      state.message = action.payload.message;
      state.result = action.payload.result;
      state.newDialogTask = false;
      state.projects = state.projects.map((project) => {
        if (project.documentId === action.payload.projectId) {
          return {
            ...project,
            tasks: [...project.tasks, action.payload.task],
          };
        }
        return project;
      });
      if (state.selectedProject) {
        state.selectedProject.tasks.push(action.payload.task as never);
      }
    });
    builder.addCase(createTask.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
    // CHANGE TASK STATUS
    builder.addCase(changeTaskStatus.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(changeTaskStatus.fulfilled, (state, action) => {
      console.log(action.payload);
      state.loading = false;
      state.message = action.payload.message;
      state.result = action.payload.result;
      state.newDialogTask = false;

      if (state.selectedProject) {
        state.selectedProject.tasks = state.selectedProject.tasks.map((task) =>
          task.documentId === action.payload.task._id ? action.payload.task : task
        );
      }
      state.projects = state.projects.map((project) => {
        if (project.documentId === action.payload.projectId) {
          return {
            ...project,
            tasks: project.tasks.map((task) =>
              task.documentId === action.payload.task.documentId ? action.payload.task : task
            ),
          };
        }
        return project;
      });
    });
    builder.addCase(changeTaskStatus.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
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
      ) as WritableDraft<Invoice>[];
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
        (invoice) => invoice._id !== action.payload.invoiceId
      );
    });
    builder.addCase(deleteInvoice.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
  },
});

export const {
  setProjectList,
  setSelectedProject,
  setNewProjectDialog,
  setEditProjectDialog,
  setProject,
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
  setCloseEditDialogTask,
  setNewInvoiceDialog,
  setEditInvoiceDialog,
  setSelectedInvoice,
} = projectListSlice.actions;

export default projectListSlice.reducer;
