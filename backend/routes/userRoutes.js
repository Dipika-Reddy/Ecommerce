import express from 'express';
const router = express.Router();
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  deleteUser,
  updateUser,
  verifySeller,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getDeliveryAgents,
  verifyDeliveryAgent,
} from '../controllers/userController.js';
import { protect, admin, seller } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middleware/securityMiddleware.js';
import { validateRegistration, validateLogin, validateIdParam } from '../middleware/validationMiddleware.js';

router.route('/')
  .post(authLimiter, validateRegistration, registerUser)
  .get(protect, admin, getUsers);

router.post('/login', authLimiter, validateLogin, loginUser);
router.post('/logout', protect, logoutUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/delivery-agents')
  .get(protect, seller, getDeliveryAgents);

router.route('/:id/verify-seller')
  .put(protect, admin, validateIdParam('id'), verifySeller);

router.route('/:id/verify-delivery')
  .put(protect, admin, validateIdParam('id'), verifyDeliveryAgent);

router.route('/:id')
  .put(protect, admin, validateIdParam('id'), updateUser)
  .delete(protect, admin, validateIdParam('id'), deleteUser);

router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/reset-password', otpLimiter, resetPassword);

export default router;
