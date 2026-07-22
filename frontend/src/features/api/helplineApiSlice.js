import { apiSlice } from './apiSlice';

export const helplineApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createCallLog: builder.mutation({
      query: (data) => ({
        url: '/api/helpline/calls',
        method: 'POST',
        body: data,
      }),
    }),
    getCallHistory: builder.query({
      query: () => '/api/helpline/calls',
      keepUnusedDataFor: 5,
    }),
    searchCustomerByPhone: builder.query({
      query: (phone) => ({
        url: `/api/helpline/search-customer`,
        params: { phone },
      }),
      keepUnusedDataFor: 5,
    }),
    getSupportOrderActions: builder.query({
      query: () => '/api/helpline/order-actions',
      keepUnusedDataFor: 5,
    }),
  }),
});

export const {
  useCreateCallLogMutation,
  useGetCallHistoryQuery,
  useSearchCustomerByPhoneQuery,
  useLazySearchCustomerByPhoneQuery,
  useGetSupportOrderActionsQuery,
} = helplineApiSlice;
