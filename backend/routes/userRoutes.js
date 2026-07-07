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
import { protect, admin, seller, superAdmin } from '../middleware/authMiddleware.js';

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/delivery-agents').get(protect, seller, getDeliveryAgents);
router.route('/:id/verify-seller').put(protect, admin, verifySeller);
router.route('/:id/verify-delivery').put(protect, admin, verifyDeliveryAgent);
router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;
