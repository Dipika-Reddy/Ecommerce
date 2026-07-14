import express from 'express';
import {
  getCoupons,
  adminGetCoupons,
  createCoupon,
  deleteCoupon,
  validateCoupon,
} from '../controllers/couponController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateCoupon as validateCouponInput, validateIdParam } from '../middleware/validationMiddleware.js';

const router = express.Router();

// User routes (needs login)
router.route('/').get(protect, getCoupons);
router.route('/validate').post(protect, validateCoupon);

// Admin/SuperAdmin routes
router.route('/admin').get(protect, admin, adminGetCoupons);
router.route('/')
  .post(protect, admin, validateCouponInput, createCoupon);

router.route('/:id')
  .delete(protect, admin, validateIdParam('id'), deleteCoupon);

export default router;
