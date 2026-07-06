import { apiSlice } from './apiSlice';
import { USERS_URL } from '../../constants';

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: `${USERS_URL}/login`,
        method: 'POST',
        body: credentials,
      }),
    }),

    register: builder.mutation({
      query: (data) => ({
        url: USERS_URL,
        method: 'POST',
        body: data,
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/logout`,
        method: 'POST',
      }),
    }),

    profile: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/profile`,
        method: 'PUT',
        body: data,
      }),
    }),

    getUsers: builder.query({
      query: () => USERS_URL,
      providesTags: ['User'],
      keepUnusedDataFor: 5,
    }),

    getDeliveryAgents: builder.query({
      query: () => `${USERS_URL}/delivery-agents`,
      providesTags: ['User'],
      keepUnusedDataFor: 5,
    }),

    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `${USERS_URL}/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    updateUser: builder.mutation({
      query: ({ userId, data }) => ({
        url: `${USERS_URL}/${userId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    verifySeller: builder.mutation({
      query: ({ userId, approve }) => ({
        url: `${USERS_URL}/${userId}/verify-seller`,
        method: 'PUT',
        body: { approve },
      }),
      invalidatesTags: ['User'],
    }),

    forgotPassword: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/forgot-password`,
        method: 'POST',
        body: data,
      }),
    }),

    verifyOtp: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/verify-otp`,
        method: 'POST',
        body: data,
      }),
    }),

    resetPassword: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/reset-password`,
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useProfileMutation,
  useGetUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useVerifySellerMutation,
  useForgotPasswordMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation,
  useGetDeliveryAgentsQuery,
} = usersApiSlice;
