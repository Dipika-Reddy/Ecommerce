import express from 'express';
const router = express.Router();
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  refundPayment,
  getAllPayments,
  createSubscriptionOrder,
  verifySubscription,
} from '../controllers/paymentController.js';
import { protect, seller } from '../middleware/authMiddleware.js';

router.route('/').get(protect, seller, getAllPayments);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/webhook', handleWebhook);
router.post('/refund', protect, seller, refundPayment);
router.post('/create-subscription-order', protect, createSubscriptionOrder);
router.post('/verify-subscription', protect, verifySubscription);
router.route('/:paymentId').get(protect, getPaymentStatus);

export default router;
