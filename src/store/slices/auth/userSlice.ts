import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'
import { User } from '@/@types/user'
import { apiUpdateUser, apiUpdateUserPassword, apiUpdateOwnProfile } from '@/services/UserService';

export const SLICE_NAME = 'userAuth';

export type UserState = {
    user: User;
}

const initialState: UserState = {
    user: {
        id: 0,
        documentId: '',
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        authority: ['public'],
        blocked: false,
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
    const response: any = await apiUpdateOwnProfile(data.user);
    return response.data;
  }
);

export type UpdateUserPassword = {
  newPassword: string;
  id: string;
}

export const updateUserPassword = createAsyncThunk(
  SLICE_NAME + '/updateUserPassword',
  async (data: UpdateUserPassword): Promise<void> => {
    await apiUpdateUserPassword(data.newPassword, data.id);
  }
);

const userSlice = createSlice({
    name: `${SLICE_BASE_NAME}/user`,
    initialState,
    reducers: {
      setOwnUser(state, action: PayloadAction<Partial<User>>) {
          // Merge (et non remplacement) pour accepter aussi bien un User complet
          // (sign-in) qu'une réinitialisation partielle (sign-out).
          // Object.assign mute le draft Immer sans déclencher l'inférence
          // WritableDraft profonde du spread (relations imbriquées) -> évite TS2589.
          Object.assign(state.user, action.payload)
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
