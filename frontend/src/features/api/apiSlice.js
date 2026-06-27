import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../../constants';

// This is the single source of truth for talking to the Express backend.
// Every feature-specific API slice (products, users, orders) injects its
// endpoints into this one, so they all share caching, auth headers, and
// re-fetch/invalidation behaviour.
const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    // Attach the JWT (if logged in) to every outgoing request
    const token = getState().auth.userInfo?.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Product', 'Order', 'User'],
  endpoints: () => ({}), // populated by injectEndpoints in the slices below
});
