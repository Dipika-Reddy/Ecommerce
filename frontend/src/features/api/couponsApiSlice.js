import { apiSlice } from './apiSlice';
import { COUPONS_URL } from '../../constants';

export const couponsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCoupons: builder.query({
      query: () => COUPONS_URL,
      providesTags: ['Coupon'],
      keepUnusedDataFor: 5,
    }),

    getAdminCoupons: builder.query({
      query: () => `${COUPONS_URL}/admin`,
      providesTags: ['Coupon'],
      keepUnusedDataFor: 5,
    }),

    createCoupon: builder.mutation({
      query: (couponData) => ({
        url: COUPONS_URL,
        method: 'POST',
        body: couponData,
      }),
      invalidatesTags: ['Coupon'],
    }),

    deleteCoupon: builder.mutation({
      query: (couponId) => ({
        url: `${COUPONS_URL}/${couponId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Coupon'],
    }),

    validateCoupon: builder.mutation({
      query: ({ code, orderAmount }) => ({
        url: `${COUPONS_URL}/validate`,
        method: 'POST',
        body: { code, orderAmount },
      }),
    }),
  }),
});

export const {
  useGetCouponsQuery,
  useGetAdminCouponsQuery,
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useValidateCouponMutation,
} = couponsApiSlice;
