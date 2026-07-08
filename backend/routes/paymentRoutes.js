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
import { paymentLimiter } from '../middleware/securityMiddleware.js';
import { validateIdParam } from '../middleware/validationMiddleware.js';

router.route('/')
  .get(protect, seller, getAllPayments);

router.post('/create-order', protect, paymentLimiter, createOrder);
router.post('/verify', protect, paymentLimiter, verifyPayment);
router.post('/webhook', handleWebhook);
router.post('/refund', protect, seller, paymentLimiter, refundPayment);
router.post('/create-subscription-order', protect, paymentLimiter, createSubscriptionOrder);
router.post('/verify-subscription', protect, paymentLimiter, verifySubscription);

router.route('/:paymentId')
  .get(protect, validateIdParam('paymentId'), getPaymentStatus);

export default router;
