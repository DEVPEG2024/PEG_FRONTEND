import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { unwrapData } from '@/utils/serviceHelper';
import { User } from '@/@types/user';
import { apiDeleteUser, apiGetUserForEditById, apiGetUsers, apiUpdateUser, DeleteUserResponse, GetUsersRequest, GetUsersResponse } from '@/services/UserService';

export const SLICE_NAME = 'users';

export type UsersStateData = {
  loading: boolean;
  users: User[];
  user: User | null;
  modalDelete: boolean;
  total: number;
};

export const getUsers = createAsyncThunk(
  SLICE_NAME + '/getUsers',
  async (data: GetUsersRequest): Promise<GetUsersResponse> => {
    const {usersPermissionsUsers_connection} : {usersPermissionsUsers_connection: GetUsersResponse}= await unwrapData(apiGetUsers(data));
    return usersPermissionsUsers_connection
  }
);

export const getUserById = createAsyncThunk(
  SLICE_NAME + '/getUserById',
  async (documentId: string): Promise<{usersPermissionsUser: User}> => {
    return await unwrapData(apiGetUserForEditById(documentId));
  }
);

export const updateUser = createAsyncThunk(
  SLICE_NAME + '/updateUser',
  async (data: Partial<User>): Promise<User> => {
    const {updateUsersPermissionsUser} : {updateUsersPermissionsUser: User} = await unwrapData(apiUpdateUser(data));
    return updateUsersPermissionsUser;
  }
);

export const deleteUser = createAsyncThunk(
  SLICE_NAME + '/deleteUser',
  async (documentId: string): Promise<DeleteUserResponse> => {
    const {deleteUsersPermissionsUser} : {deleteUsersPermissionsUser: DeleteUserResponse} = await unwrapData(apiDeleteUser(documentId));
    return deleteUsersPermissionsUser;
  }
);

const initialState: UsersStateData = {
  loading: false,
  users: [],
  user: null,
  modalDelete: false,
  total: 0,
};

const productSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setModalDeleteOpen: (state) => {
      state.modalDelete = true;
    },
    setModalDeleteClose: (state) => {
      state.modalDelete = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getUsers.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getUsers.fulfilled, (state, action) => {
      state.loading = false;
      state.users = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getUsers.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteUser.fulfilled, (state, action) => {
      state.loading = false;
      state.users = state.users.filter(
        (user) => user.documentId !== action.payload.documentId
      );
    });
    builder.addCase(deleteUser.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(updateUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateUser.fulfilled, (state, action) => {
      state.loading = false;
      state.users = state.users.map((user) => {
        if (user.documentId === action.payload.documentId) {
          return action.payload;
        }
        return user;
      });
    });
    builder.addCase(updateUser.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getUserById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getUserById.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.usersPermissionsUser;
    });
    builder.addCase(getUserById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setUser,
  setModalDeleteOpen,
  setModalDeleteClose,
} = productSlice.actions;

export default productSlice.reducer;
