import { createSlice } from '@reduxjs/toolkit';

// Read any previously logged-in user from localStorage so a page refresh
// doesn't silently log the user out.
const userInfoFromStorage = localStorage.getItem('userInfo')
  ? JSON.parse(localStorage.getItem('userInfo'))
  : null;

const initialState = {
  userInfo: userInfoFromStorage,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem('userInfo');
      // Cart is intentionally left untouched on logout so guests keep their cart
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
