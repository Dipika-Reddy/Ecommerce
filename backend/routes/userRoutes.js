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
} from '../controllers/userController.js';
import { protect, admin, superAdmin } from '../middleware/authMiddleware.js';

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id/verify-seller').put(protect, admin, verifySeller);
router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);

export default router;
