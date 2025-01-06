import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'
import { User } from '@/@types/user'
import { unwrapData } from '@/utils/serviceHelper';
import { apiUpdateUser, apiUpdateUserPassword } from '@/services/UserService';

export const SLICE_NAME = 'userAuth';

export type UserState = {
    user: User;
}

const initialState: UserState = {
    user: {
        documentId: '',
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        authority: ['public'],
        role: {
            documentId: '',
            description: 'public',
            name: 'public',
            type: 'public'
        }
    },
}

export type UpdateUser = {
  user: Partial<User>;
  id: number;
}

export const updateOwnUser = createAsyncThunk(
  SLICE_NAME + '/updateOwnUser',
  async (data: UpdateUser): Promise<User> => {
    const {updateUsersPermissionsUser} : {updateUsersPermissionsUser: {data: User}} = await unwrapData(apiUpdateUser(data.user, data.id));
    return updateUsersPermissionsUser.data
  }
);

export type UpdateUserPassword = {
  newPassword: string;
  id: number;
}

export const updateUserPassword = createAsyncThunk(
  SLICE_NAME + '/updateUserPassword',
  async (data: UpdateUserPassword): Promise<User> => {
    const {updateUsersPermissionsUser} : {updateUsersPermissionsUser: {data: User}} = await unwrapData(apiUpdateUserPassword(data.newPassword, data.id));
    return updateUsersPermissionsUser.data
  }
);

const userSlice = createSlice({
    name: `${SLICE_BASE_NAME}/user`,
    initialState,
    reducers: {
      setOwnUser(state, action: PayloadAction<User>) {
          state.user = action.payload
      },
    },
    extraReducers: (builder) => {
      builder.addCase(updateOwnUser.fulfilled, (state, action) => {
        state.user.avatar = action.payload.avatar;
        state.user.username = action.payload.username;
        state.user.firstName = action.payload.firstName;
        state.user.lastName = action.payload.lastName;
        state.user.email = action.payload.email;
      });
    }
})

export const { setOwnUser } = userSlice.actions
export default userSlice.reducer
