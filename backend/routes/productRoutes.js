import express from 'express';
const router = express.Router();
import {
  getProducts,
  getProductCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
} from '../controllers/productController.js';
import { protect, seller, optionalProtect } from '../middleware/authMiddleware.js';

// Public catalog browsing (search/filter/sort/pagination handled via query params)
router.route('/').get(optionalProtect, getProducts).post(protect, seller, createProduct);
router.get('/categories', getProductCategories);
router.get('/top', getTopProducts);
router
  .route('/:id')
  .get(getProductById)
  .put(protect, seller, updateProduct)
  .delete(protect, seller, deleteProduct);
router.route('/:id/reviews').post(protect, createProductReview);

export default router;
