import { apiSlice } from './apiSlice';
import { PRODUCTS_URL, UPLOAD_URL } from '../../constants';

export const productsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/products?keyword=&category=&sortBy=&pageNumber=&adminMode=
    getProducts: builder.query({
      query: ({ keyword = '', category = 'All', subCategory = 'All', sortBy = 'newest', pageNumber = 1, adminMode = false } = {}) => ({
        url: PRODUCTS_URL,
        params: { keyword, category, subCategory, sortBy, pageNumber, adminMode },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(({ _id }) => ({ type: 'Product', id: _id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),

    getProductCategories: builder.query({
      query: (category) => ({
        url: `${PRODUCTS_URL}/categories`,
        params: category ? { category } : {},
      }),
    }),

    getProductDetails: builder.query({
      query: (productId) => `${PRODUCTS_URL}/${productId}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
      keepUnusedDataFor: 300,
    }),

    getTopProducts: builder.query({
      query: () => `${PRODUCTS_URL}/top`,
      keepUnusedDataFor: 60,
    }),

    createProduct: builder.mutation({
      query: (productData) => ({
        url: PRODUCTS_URL,
        method: 'POST',
        body: productData,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    updateProduct: builder.mutation({
      query: ({ productId, ...data }) => ({
        url: `${PRODUCTS_URL}/${productId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Product', id: productId }],
    }),

    deleteProduct: builder.mutation({
      query: (productId) => ({
        url: `${PRODUCTS_URL}/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    createReview: builder.mutation({
      query: ({ productId, ...reviewData }) => ({
        url: `${PRODUCTS_URL}/${productId}/reviews`,
        method: 'POST',
        body: reviewData,
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Product', id: productId }],
    }),

    uploadProductImage: builder.mutation({
      query: (formData) => ({
        url: UPLOAD_URL,
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductCategoriesQuery,
  useGetProductDetailsQuery,
  useGetTopProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateReviewMutation,
  useUploadProductImageMutation,
} = productsApiSlice;
