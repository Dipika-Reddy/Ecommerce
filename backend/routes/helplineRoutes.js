import express from 'express';
const router = express.Router();
import {
  createCallLog,
  getCallHistory,
  searchCustomerByPhone,
  getSupportOrderActions,
} from '../controllers/helplineController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Middleware to restrict history strictly to Admin and Superadmin (excluding support)
const adminOrSuperAdminOnly = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.isSuperAdmin)) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an admin or superadmin');
  }
};

router.route('/calls')
  .post(protect, admin, createCallLog) // Any staff (including support) can log calls
  .get(protect, adminOrSuperAdminOnly, getCallHistory); // Only admin/superadmin can view history

router.get('/order-actions', protect, adminOrSuperAdminOnly, getSupportOrderActions);

router.get('/search-customer', protect, admin, searchCustomerByPhone);

export default router;
