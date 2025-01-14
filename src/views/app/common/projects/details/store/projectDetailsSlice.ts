import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Comment, Project, Task } from '@/@types/project';
import {
  apiGetProjectById,
  DeleteProjectResponse,
  apiDeleteProject,
  apiUpdateProject,
} from '@/services/ProjectServices';
import { Invoice } from '@/@types/invoice';
import { unwrapData } from '@/utils/serviceHelper';
import { apiCreateTask, apiDeleteTask, apiUpdateTask, CreateTaskRequest, DeleteTaskResponse } from '@/services/TaskService';
import { apiUpdateInvoice } from '@/services/InvoicesServices';
import { apiCreateComment, apiDeleteComment, CreateCommentRequest } from '@/services/CommentServices';

export const SLICE_NAME = 'projectDetails';

export type ProjectDetailsState = {
  project: Project;
  tasks: Task[];
  invoices: Invoice[];
  comments: Comment[];
  selectedTask: Task | null;
  selectedProjectInvoice: Invoice | null;
  editCurrentProjectDialog: boolean;
  editProjectInvoiceDialog: boolean;
  printProjectInvoiceDialog: boolean;
  newDialogTask: boolean;
  editDialogTask: boolean;
  selectedTab: string;
  editDescription: boolean;
  loading: boolean;
};



// TODO: Voir pour filtrer dès la requête par la visibilité --> implique d'ajouter un resolver côté backend
// Ce qui donnerait côté frontend ce qui est en commentaire ci-dessous
/*export type GetIProjectById = {
  documentId: string;
  user: User;
}

export const getProjectById = createAsyncThunk(
  SLICE_NAME + '/getProjectById',
  async (data: GetIProjectById): Promise<{project: Project}> => {
    if (hasRole(data.user, [CUSTOMER])) {
      return await unwrapData(apiGetProjectById(data.documentId, ['all', CUSTOMER]));
    } else if (hasRole(data.user, [PRODUCER])) {
      return await unwrapData(apiGetProjectById(data.documentId, ['all', PRODUCER]));
    }
    return await unwrapData(apiGetProjectById(data.documentId, ['all', SUPER_ADMIN, ADMIN, CUSTOMER, PRODUCER]));
  }
);*/

export const getProjectById = createAsyncThunk(
  SLICE_NAME + '/getProjectById',
  async (documentId: string): Promise<{project: Project}> => {
    return await unwrapData(apiGetProjectById(documentId));
  }
);

export const deleteCurrentProject = createAsyncThunk(
  SLICE_NAME + '/deleteCurrentProject',
  async (documentId: string): Promise<DeleteProjectResponse> => {
    const {deleteProject} : {deleteProject: DeleteProjectResponse} = await unwrapData(apiDeleteProject(documentId));
    //TODO: à remettre et voir pour autrer part la suppression de fichiers
    //apiDeleteFiles(data.project.images.map(({ fileNameBack }) => fileNameBack));
    return deleteProject;
  }
);

export const updateCurrentProject = createAsyncThunk(
  SLICE_NAME + '/updateCurrentProject',
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
  async (data: CreateTask) : Promise<Project> => {
    const {createTask} : {createTask: Task} = await unwrapData(apiCreateTask(data.task));
    const {updateProject} : {updateProject: Project} = await unwrapData(apiUpdateProject({documentId: data.project.documentId, tasks: [...data.project.tasks, createTask]}))
    return updateProject;
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

export const updateProjectInvoice = createAsyncThunk(
  SLICE_NAME + '/updateProjectInvoice',
  async (data: Partial<Invoice>): Promise<Invoice> => {
    const {updateInvoice} : {updateInvoice: Invoice} = await unwrapData(apiUpdateInvoice(data));
    return updateInvoice;
  }
);

export type CreateComment = {
  comment: CreateCommentRequest;
  project: Project;
}

export const createComment = createAsyncThunk(
  SLICE_NAME + '/createComment',
  async (data: CreateComment) : Promise<Comment> => {
    const {createComment} : {createComment: Comment} = await unwrapData(apiCreateComment(data.comment));
    await apiUpdateProject({documentId: data.project.documentId, comments: [...data.project.comments, createComment]})
    return createComment;
  }
);

export const deleteComment = createAsyncThunk(
  SLICE_NAME + '/deleteComment',
  async (documentId: string): Promise<DeleteTaskResponse> => {
    const {deleteComment} : {deleteComment: DeleteTaskResponse} = await unwrapData(apiDeleteComment(documentId));
    return deleteComment;
  }
);

const initialState: ProjectDetailsState = {
  invoices: [],
  tasks: [],
  comments: [],
  project: undefined,
  editCurrentProjectDialog: false,
  selectedProjectInvoice: null,
  editProjectInvoiceDialog: false,
  newDialogTask: false,
  editDialogTask: false,
  printProjectInvoiceDialog: false,
  selectedTask: null,
  loading: false,
  selectedTab: 'Accueil',
  editDescription: false,
};

const projectListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setProject: (state, action) => {
      state.project = action.payload;
    },
    setEditDescription: (state, action) => {
      state.editDescription = action.payload;
    },
    setEditCurrentProjectDialog: (state, action) => {
      state.editCurrentProjectDialog = action.payload;
    },

    setSelectedTab: (state, action) => {
      state.selectedTab = action.payload;
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
    setEditProjectInvoiceDialog: (state, action) => {
      state.editProjectInvoiceDialog = action.payload;
    },
    setPrintProjectInvoiceDialog: (state, action) => {
      state.printProjectInvoiceDialog = action.payload;
    },
    setSelectedProjectInvoice: (state, action) => {
      state.selectedProjectInvoice = action.payload;
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
      state.comments = action.payload.project.comments
      state.loading = false;
    });
    // UPDATE PROJECT
    builder.addCase(updateCurrentProject.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateCurrentProject.fulfilled, (state, action) => {
      state.loading = false;
      state.project = action.payload;
      state.editDescription = false;
    });
    builder.addCase(updateCurrentProject.rejected, (state) => {
      state.loading = false;
    });
    // CREATE TASK
    builder.addCase(createTask.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.loading = false;
      state.project = action.payload;
      state.tasks = action.payload.tasks
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
    // CREATE COMMENT
    builder.addCase(createComment.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createComment.fulfilled, (state, action) => {
      state.loading = false;
      state.comments.push(action.payload);
      state.project!.comments = state.comments
    });
    // DELETE COMMENT
    builder.addCase(deleteComment.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteComment.fulfilled, (state, action) => {
      state.loading = false;
      state.comments = state.comments.filter(
        (comment) => comment.documentId !== action.payload.documentId
      );
      state.project!.comments = state.comments
    });
    builder.addCase(deleteComment.rejected, (state, action) => {
      state.loading = false;
    });
    // UPDATE INVOICE
    builder.addCase(updateProjectInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateProjectInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.invoices = state.invoices.map((invoice) =>
        invoice.documentId === action.payload.documentId ? action.payload : invoice
      );
      state.editProjectInvoiceDialog = false
      state.selectedProjectInvoice = null
    });
    builder.addCase(updateProjectInvoice.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setProject,
  setLoading,
  setEditCurrentProjectDialog,
  setSelectedTab,
  setNewDialogTask,
  setEditDialogTask,
  setEditTaskSelected,
  setSelectedTask,
  setEditProjectInvoiceDialog,
  setPrintProjectInvoiceDialog,
  setSelectedProjectInvoice,
  setEditDescription,
} = projectListSlice.actions;

export default projectListSlice.reducer;
