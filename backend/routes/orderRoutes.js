import express from 'express';
const router = express.Router();
import {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderStatus,
  getMyOrders,
  getOrders,
  requestReturn,
  approveReturn,
  completeReturn,
  processRefund,
  assignDeliveryAgent,
} from '../controllers/orderController.js';
import { protect, seller } from '../middleware/authMiddleware.js';
import { validateIdParam } from '../middleware/validationMiddleware.js';
import { paymentLimiter } from '../middleware/securityMiddleware.js';

router.route('/')
  .post(protect, paymentLimiter, addOrderItems)
  .get(protect, seller, getOrders);

router.get('/myorders', protect, getMyOrders);

router.route('/:id')
  .get(protect, validateIdParam('id'), getOrderById);

router.put('/:id/pay', protect, paymentLimiter, validateIdParam('id'), updateOrderToPaid);
router.put('/:id/status', protect, seller, validateIdParam('id'), updateOrderStatus);
router.put('/:id/return', protect, validateIdParam('id'), requestReturn);
router.put('/:id/return/approve', protect, seller, validateIdParam('id'), approveReturn);
router.put('/:id/return/complete', protect, validateIdParam('id'), completeReturn);
router.put('/:id/return/refund', protect, seller, validateIdParam('id'), processRefund);
router.put('/:id/assign-agent', protect, seller, validateIdParam('id'), assignDeliveryAgent);

export default router;
