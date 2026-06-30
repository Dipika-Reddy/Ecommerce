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
} from '../controllers/orderController.js';
import { protect, seller } from '../middleware/authMiddleware.js';

router.route('/').post(protect, addOrderItems).get(protect, seller, getOrders);
router.get('/myorders', protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/status', protect, seller, updateOrderStatus);
router.put('/:id/return', protect, requestReturn);
router.put('/:id/return/approve', protect, seller, approveReturn);
router.put('/:id/return/complete', protect, completeReturn);
router.put('/:id/return/refund', protect, seller, processRefund);

export default router;
