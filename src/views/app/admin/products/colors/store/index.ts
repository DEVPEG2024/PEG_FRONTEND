import { combineReducers } from '@reduxjs/toolkit';
import reducers, { SLICE_NAME, ColorsState } from './colorSlice';
import { useSelector } from 'react-redux';

import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '@/store';

const reducer = combineReducers({
  data: reducers,
});

export const useAppSelector: TypedUseSelectorHook<
  RootState & {
    [SLICE_NAME]: {
      data: ColorsState;
    };
  }
> = useSelector;

export * from './colorSlice';
export { useAppDispatch } from '@/store';
export default reducer;
