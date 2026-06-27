import { apiSlice } from './apiSlice';
import { ORDERS_URL } from '../../constants';

export const ordersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (order) => ({
        url: ORDERS_URL,
        method: 'POST',
        body: order,
      }),
      invalidatesTags: ['Order'],
    }),

    getOrderDetails: builder.query({
      query: (orderId) => `${ORDERS_URL}/${orderId}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
      keepUnusedDataFor: 5,
    }),

    // Simulates the payment gateway's "success" callback
    payOrder: builder.mutation({
      query: ({ orderId, details }) => ({
        url: `${ORDERS_URL}/${orderId}/pay`,
        method: 'PUT',
        body: details,
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    updateOrderStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: `${ORDERS_URL}/${orderId}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),

    getMyOrders: builder.query({
      query: () => `${ORDERS_URL}/myorders`,
      providesTags: ['Order'],
      keepUnusedDataFor: 5,
    }),

    getOrders: builder.query({
      query: () => ORDERS_URL,
      providesTags: [{ type: 'Order', id: 'LIST' }],
      keepUnusedDataFor: 5,
    }),

    createPaymentOrder: builder.mutation({
      query: (orderId) => ({
        url: '/api/payments/create-order',
        method: 'POST',
        body: { orderId },
      }),
    }),

    verifyPaymentSignature: builder.mutation({
      query: (paymentDetails) => ({
        url: '/api/payments/verify',
        method: 'POST',
        body: paymentDetails,
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    getPaymentDetails: builder.query({
      query: (paymentId) => `/api/payments/${paymentId}`,
      keepUnusedDataFor: 5,
    }),

    refundPayment: builder.mutation({
      query: (refundData) => ({
        url: '/api/payments/refund',
        method: 'POST',
        body: refundData,
      }),
      invalidatesTags: ['Order'],
    }),

    getAllPayments: builder.query({
      query: () => '/api/payments',
      keepUnusedDataFor: 5,
    }),

    createSubscriptionOrder: builder.mutation({
      query: (plan) => ({
        url: '/api/payments/create-subscription-order',
        method: 'POST',
        body: { plan },
      }),
    }),

    verifySubscriptionSignature: builder.mutation({
      query: (details) => ({
        url: '/api/payments/verify-subscription',
        method: 'POST',
        body: details,
      }),
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderDetailsQuery,
  usePayOrderMutation,
  useUpdateOrderStatusMutation,
  useGetMyOrdersQuery,
  useGetOrdersQuery,
  useCreatePaymentOrderMutation,
  useVerifyPaymentSignatureMutation,
  useGetPaymentDetailsQuery,
  useRefundPaymentMutation,
  useGetAllPaymentsQuery,
  useCreateSubscriptionOrderMutation,
  useVerifySubscriptionSignatureMutation,
} = ordersApiSlice;
