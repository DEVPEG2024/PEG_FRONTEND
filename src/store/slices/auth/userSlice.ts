import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'
import { User } from '@/@types/user'
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
  id: string;
}

export const updateOwnUser = createAsyncThunk(
  SLICE_NAME + '/updateOwnUser',
  async (data: UpdateUser): Promise<User> => {
    const response: any = await apiUpdateUser(data.user, data.id);
    return response.data;
  }
);

export type UpdateUserPassword = {
  newPassword: string;
  id: string;
}

export const updateUserPassword = createAsyncThunk(
  SLICE_NAME + '/updateUserPassword',
  async (data: UpdateUserPassword): Promise<User> => {
    await apiUpdateUserPassword(data.newPassword, data.id);
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
