import express from 'express';
import {
  getCoupons,
  adminGetCoupons,
  createCoupon,
  deleteCoupon,
  validateCoupon,
} from '../controllers/couponController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes (needs login)
router.route('/').get(protect, getCoupons);
router.route('/validate').post(protect, validateCoupon);

// Admin/SuperAdmin routes
router.route('/admin').get(protect, admin, adminGetCoupons);
router.route('/').post(protect, admin, createCoupon);
router.route('/:id').delete(protect, admin, deleteCoupon);

export default router;
