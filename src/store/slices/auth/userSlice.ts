import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'
import { User } from '@/@types/user'

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

const userSlice = createSlice({
    name: `${SLICE_BASE_NAME}/user`,
    initialState,
    reducers: {
        setUser(state, action: PayloadAction<User>) {
            state.user = action.payload
        },
    },
})

export const { setUser } = userSlice.actions
export default userSlice.reducer
