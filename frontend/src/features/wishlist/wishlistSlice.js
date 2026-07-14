import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  wishlistItems: localStorage.getItem('wishlist') ? JSON.parse(localStorage.getItem('wishlist')) : [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const item = action.payload;
      const existItem = state.wishlistItems.find((x) => x._id === item._id);

      if (!existItem) {
        state.wishlistItems = [...state.wishlistItems, item];
      }
      localStorage.setItem('wishlist', JSON.stringify(state.wishlistItems));
    },
    removeFromWishlist: (state, action) => {
      state.wishlistItems = state.wishlistItems.filter((x) => x._id !== action.payload);
      localStorage.setItem('wishlist', JSON.stringify(state.wishlistItems));
    },
  },
});

export const { addToWishlist, removeFromWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;
