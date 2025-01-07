import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Project } from '@/@types/project';
import {
  GetProjectsResponse,
  apiGetCustomerProjects,
  apiGetProjects,
  DeleteProjectResponse,
  apiDeleteProject,
  apiUpdateProject,
  apiGetProducerProjects,
  apiCreateProject,
  CreateProjectRequest,
} from '@/services/ProjectServices';
import { PaginationRequest, unwrapData } from '@/utils/serviceHelper';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, CUSTOMER, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { apiCreateTransaction, CreateTransactionRequest } from '@/services/TransactionsServices';
import { Transaction } from '@/@types/transaction';

export const SLICE_NAME = 'projects';

export type ProjectsState = {
  projects: Project[];
  total: number;
  selectedProject: Project | null;
  newProjectDialog: boolean;
  loading: boolean;
};

export type GetProjectsRequest = {
    user: User;
    pagination: PaginationRequest;
    searchTerm: string;
  };

export const getProjects = createAsyncThunk(
  SLICE_NAME + '/getProjects',
  async (data: GetProjectsRequest): Promise<GetProjectsResponse> => {
    if (hasRole(data.user, [SUPER_ADMIN, ADMIN])) {
      const {projects_connection} : {projects_connection: GetProjectsResponse}= await unwrapData(apiGetProjects(data));
      return projects_connection
    } else if (hasRole(data.user, [CUSTOMER])) {
      const {projects_connection} : {projects_connection: GetProjectsResponse}= await unwrapData(apiGetCustomerProjects({...data, customerDocumentId: data.user.customer!.documentId}));
      return projects_connection
    } else if (hasRole(data.user, [PRODUCER])) {
      const {projects_connection} : {projects_connection: GetProjectsResponse}= await unwrapData(apiGetProducerProjects({...data, producerDocumentId: data.user.producer!.documentId}));
      return projects_connection
    }
    return {nodes: [], pageInfo: {page: 1, pageCount: 1, pageSize: 0, total: 0}}
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

export const createProject = createAsyncThunk(
  SLICE_NAME + '/createProject',
  async (data: CreateProjectRequest): Promise<Project> => {
    const {createProject} : {createProject: Project} = await unwrapData(apiCreateProject(data));
    return createProject;
  }
);

export type PayProducer = {
  transaction: Omit<Transaction, 'documentId'>;
  project: Project;
}

export const payProducer = createAsyncThunk(
  SLICE_NAME + '/payProducer',
  async (data: PayProducer) : Promise<Project> => {
    await apiCreateTransaction(data.transaction);
    const {updateProject} : {updateProject: Project} = await unwrapData(apiUpdateProject({documentId: data.project.documentId, producerPaidPrice: data.project.producerPaidPrice + data.transaction.amount}));
    return updateProject;
  }
);

const initialState: ProjectsState = {
  projects: [],
  selectedProject: null,
  newProjectDialog: false,
  loading: false,
  total: 0,
};

const projectListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setNewProjectDialog: (state, action) => {
      state.newProjectDialog = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProjects.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProjects.fulfilled, (state, action) => {
      state.projects = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    // DELETE PROJECT
    builder.addCase(deleteProject.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteProject.fulfilled, (state, action) => {
      state.loading = false;
      state.projects = state.projects.filter(
        (project) => project.documentId !== action.payload.documentId
      );
      state.total -= 1
    });
    builder.addCase(deleteProject.rejected, (state) => {
      state.loading = false;
    });

    // CREATE PROJECT
    builder.addCase(createProject.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createProject.fulfilled, (state, action) => {
      state.loading = false;
      state.projects.push(action.payload);
      state.total += 1
    });
    builder.addCase(createProject.rejected, (state) => {
      state.loading = false;
    });

    // PAY PRODUCER
    builder.addCase(payProducer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(payProducer.fulfilled, (state, action) => {
      state.loading = false;
      state.projects = state.projects.map((project) =>
        project.documentId === action.payload.documentId ? action.payload : project
      );
    });
    builder.addCase(payProducer.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setNewProjectDialog,
} = projectListSlice.actions;

export default projectListSlice.reducer;
