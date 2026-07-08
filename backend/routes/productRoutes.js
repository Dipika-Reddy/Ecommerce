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
import { validateIdParam } from '../middleware/validationMiddleware.js';

router.route('/')
  .get(optionalProtect, getProducts)
  .post(protect, seller, createProduct);

router.get('/categories', getProductCategories);
router.get('/top', getTopProducts);

router.route('/:id')
  .get(validateIdParam('id'), getProductById)
  .put(protect, seller, validateIdParam('id'), updateProduct)
  .delete(protect, seller, validateIdParam('id'), deleteProduct);

router.route('/:id/reviews')
  .post(protect, validateIdParam('id'), createProductReview);

export default router;
