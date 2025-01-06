import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Project } from '@/@types/project';
import {
  GetPoolProjectsResponse,
  apiGetPoolProjects,
  apiUpdateProject,
} from '@/services/ProjectServices';
import { PaginationRequest, unwrapData } from '@/utils/serviceHelper';
import { User } from '@/@types/user';

export const SLICE_NAME = 'poolProjects';

export type PoolProjectsState = {
  projects: Project[];
  total: number;
  selectedProject: Project | null;
  loading: boolean;
};

export type GetPoolProjectsRequest = {
    user: User;
    pagination: PaginationRequest;
    searchTerm: string;
  };

export const getPoolProjects = createAsyncThunk(
  SLICE_NAME + '/getPoolProjects',
  async (data: GetPoolProjectsRequest): Promise<GetPoolProjectsResponse> => {
    const {projects_connection} : {projects_connection: GetPoolProjectsResponse}= await unwrapData(apiGetPoolProjects(data));
    return projects_connection
  }
);

export const updatePoolProject = createAsyncThunk(
  SLICE_NAME + '/updatePoolProject',
  async (data: Partial<Project>): Promise<Project> => {
    const {updateProject} : {updateProject: Project} = await unwrapData(apiUpdateProject(data));
    return updateProject;
  }
);

const initialState: PoolProjectsState = {
  projects: [],
  selectedProject: null,
  loading: false,
  total: 0,
};

const poolProjectListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setProjectList: (state, action) => {
      state.projects = action.payload;
    },
    setSelectedProject: (state, action) => {
      state.selectedProject = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getPoolProjects.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getPoolProjects.fulfilled, (state, action) => {
      state.projects = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
  },
});

export const {
  setProjectList,
  setSelectedProject,
} = poolProjectListSlice.actions;

export default poolProjectListSlice.reducer;
