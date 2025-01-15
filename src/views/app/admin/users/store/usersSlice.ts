import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { unwrapData } from '@/utils/serviceHelper';
import { User } from '@/@types/user';
import {
  apiDeleteUser,
  apiGetAllCustomers,
  apiGetAllProducers,
  apiGetAllRoles,
  apiGetAllUsers,
  apiGetUserForEditById,
  apiGetUsers,
  apiUpdateUser,
  DeleteUserResponse,
  GetUsersRequest,
  GetUsersResponse,
} from '@/services/UserService';

export const SLICE_NAME = 'users';

export type UsersStateData = {
  loading: boolean;
  users: User[];
  user: User | null;
  modalDeleteUser: boolean;
  total: number;
  usersId: { id: number; documentId: string }[];
  rolesId: { id: number; documentId: string }[];
  customersId: { id: number; documentId: string }[];
  producersId: { id: number; documentId: string }[];
};

export const getUsers = createAsyncThunk(
  SLICE_NAME + '/getUsers',
  async (data: GetUsersRequest): Promise<GetUsersResponse> => {
    const {
      usersPermissionsUsers_connection,
    }: { usersPermissionsUsers_connection: GetUsersResponse } =
      await unwrapData(apiGetUsers(data));
    return usersPermissionsUsers_connection;
  }
);

export const getUsersIdTable = createAsyncThunk(
  SLICE_NAME + '/getUsersIdTable',
  async (): Promise<{ id: number; documentId: string }[]> => {
    const users = await apiGetAllUsers();
    return users.map(({ id, documentId }) => ({ id, documentId }));
  }
);

export const getRolesIdTable = createAsyncThunk(
  SLICE_NAME + '/getRolesIdTable',
  async (): Promise<{ id: number; documentId: string }[]> => {
    const roles = await apiGetAllRoles();
    return roles.roles.map(({ id, documentId }) => ({ id, documentId }));
  }
);

export const getCustomersIdTable = createAsyncThunk(
  SLICE_NAME + '/getCustomersIdTable',
  async (): Promise<{ id: number; documentId: string }[]> => {
    const customers = await apiGetAllCustomers();
    return customers.data.map(({ id, documentId }) => ({ id, documentId }));
  }
);

export const getProducersIdTable = createAsyncThunk(
  SLICE_NAME + '/getProducersIdTable',
  async (): Promise<{ id: number; documentId: string }[]> => {
    const producers = await apiGetAllProducers();
    return producers.data.map(({ id, documentId }) => ({ id, documentId }));
  }
);

export const getUserById = createAsyncThunk(
  SLICE_NAME + '/getUserById',
  async (documentId: string): Promise<{ usersPermissionsUser: User }> => {
    return await unwrapData(apiGetUserForEditById(documentId));
  }
);

export type UserRequest = {
  user: Partial<User>;
  id: number;
};

export const updateUser = createAsyncThunk(
  SLICE_NAME + '/updateUser',
  async (data: UserRequest): Promise<User> => {
    const {
      updateUsersPermissionsUser,
    }: { updateUsersPermissionsUser: { data: User } } = await unwrapData(
      apiUpdateUser(data.user, data.id)
    );
    return updateUsersPermissionsUser.data;
  }
);

export const deleteUser = createAsyncThunk(
  SLICE_NAME + '/deleteUser',
  async (id: number): Promise<DeleteUserResponse> => {
    const {
      deleteUsersPermissionsUser,
    }: { deleteUsersPermissionsUser: { data: DeleteUserResponse } } =
      await unwrapData(apiDeleteUser(id));
    return deleteUsersPermissionsUser.data;
  }
);

const initialState: UsersStateData = {
  loading: false,
  users: [],
  user: null,
  modalDeleteUser: false,
  total: 0,
  usersId: [],
  rolesId: [],
  customersId: [],
  producersId: [],
};

const productSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setModalDeleteUserOpen: (state) => {
      state.modalDeleteUser = true;
    },
    setModalDeleteUserClose: (state) => {
      state.modalDeleteUser = false;
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

    builder.addCase(getUsersIdTable.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getUsersIdTable.fulfilled, (state, action) => {
      state.loading = false;
      state.usersId = action.payload;
    });
    builder.addCase(getUsersIdTable.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(getRolesIdTable.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getRolesIdTable.fulfilled, (state, action) => {
      state.loading = false;
      state.rolesId = action.payload;
    });
    builder.addCase(getRolesIdTable.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(getCustomersIdTable.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getCustomersIdTable.fulfilled, (state, action) => {
      state.loading = false;
      state.customersId = action.payload;
    });
    builder.addCase(getCustomersIdTable.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(getProducersIdTable.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducersIdTable.fulfilled, (state, action) => {
      state.loading = false;
      state.producersId = action.payload;
    });
    builder.addCase(getProducersIdTable.rejected, (state) => {
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
      state.total -= 1;
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

export const { setUser, setModalDeleteUserOpen, setModalDeleteUserClose } =
  productSlice.actions;

export default productSlice.reducer;
