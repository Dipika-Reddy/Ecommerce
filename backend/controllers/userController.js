import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '../config/db.js';
import generateToken from '../utils/generateToken.js';
import { logSecurity, logError, logInfo } from '../utils/logger.js';

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phoneNumber, panNumber, gstNumber, licensePicture, isSellerRequested, isDeliveryAgent, passportPhoto, drivingLicense, bikeNumberPlate, bikeRegistration } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email and password');
  }

  if (isSellerRequested) {
    if (!panNumber || !gstNumber || !licensePicture) {
      res.status(400);
      throw new Error('Please provide PAN card number, GST number, and license picture for seller registration');
    }
  }

  if (isDeliveryAgent) {
    if (!passportPhoto || !drivingLicense || !bikeNumberPlate || !bikeRegistration) {
      res.status(400);
      throw new Error('Please provide passport photo, driving license, bike number plate, and bike registration documents');
    }
  }

  const userExists = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (userExists) {
    logSecurity('REGISTRATION_ATTEMPT_DUPLICATE_EMAIL', { email });
    res.status(400);
    throw new Error('A user with that email already exists');
  }

  // Hash password with high work factor (12 rounds for production readiness)
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // If a seller is requested, set status to PENDING and isAdmin to false until verified.
  const sellerStatus = isSellerRequested ? 'PENDING' : 'NONE';
  const isAdmin = false;

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isAdmin,
      phoneNumber,
      panNumber: isSellerRequested ? panNumber : null,
      gstNumber: isSellerRequested ? gstNumber : null,
      licensePicture: isSellerRequested ? licensePicture : null,
      passportPhoto: isDeliveryAgent ? passportPhoto : null,
      drivingLicense: isDeliveryAgent ? drivingLicense : null,
      bikeNumberPlate: isDeliveryAgent ? bikeNumberPlate : null,
      bikeRegistration: isDeliveryAgent ? bikeRegistration : null,
      sellerStatus,
      isDeliveryAgent: Boolean(isDeliveryAgent),
    },
  });

  if (user) {
    logSecurity('USER_REGISTERED_SUCCESSFULLY', { userId: user.id, email: user.email });
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isDeliveryAgent: user.isDeliveryAgent,
      sellerStatus: user.sellerStatus,
      phoneNumber: user.phoneNumber,
      token: generateToken(user.id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    logSecurity('LOGIN_FAILED_USER_NOT_FOUND', { email: normalizedEmail });
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Account lockout check
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    logSecurity('LOGIN_BLOCKED_LOCKED_ACCOUNT', { email: normalizedEmail, lockoutUntil: user.lockoutUntil });
    res.status(403);
    throw new Error('Account is temporarily locked. Please try again after 15 minutes.');
  }

  // Progressive delay to prevent timing and brute-force attacks
  if (user.failedLoginAttempts > 0) {
    const delay = Math.min(user.failedLoginAttempts * 500, 5000); // progressive delay up to 5 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (isMatch) {
    // Reset lockout counters on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    if (user.sellerStatus === 'PENDING') {
      res.status(403);
      throw new Error('Your seller account is pending approval by the system administrator.');
    }
    if (user.sellerStatus === 'REJECTED') {
      res.status(403);
      throw new Error('Your seller account application has been rejected.');
    }
    if (user.isDeliveryAgent && user.deliveryStatus === 'PENDING') {
      res.status(403);
      throw new Error('Your delivery agent account is pending approval by the system administrator.');
    }
    if (user.isDeliveryAgent && user.deliveryStatus === 'REJECTED') {
      res.status(403);
      throw new Error('Your delivery agent account application has been rejected.');
    }

    logSecurity('USER_LOGIN_SUCCESS', { userId: user.id, email: user.email, roles: { isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin } });

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isDeliveryAgent: user.isDeliveryAgent,
      isSupport: user.isSupport,
      sellerStatus: user.sellerStatus,
      deliveryStatus: user.deliveryStatus,
      phoneNumber: user.phoneNumber,
      token: generateToken(user.id),
    });
  } else {
    // Increment failed login attempts
    const newFailedAttempts = user.failedLoginAttempts + 1;
    const updateData = { failedLoginAttempts: newFailedAttempts };

    if (newFailedAttempts >= 5) {
      updateData.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
      logSecurity('ACCOUNT_LOCKED_OUT', { userId: user.id, email: user.email });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    logSecurity('LOGIN_FAILED_WRONG_PASSWORD', { userId: user.id, email: user.email, attemptCount: newFailedAttempts });

    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  logSecurity('USER_LOGOUT', { userId: req.user?.id });
  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Get logged-in user's profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (user) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isDeliveryAgent: user.isDeliveryAgent,
      isSupport: user.isSupport,
      sellerStatus: user.sellerStatus,
      deliveryStatus: user.deliveryStatus,
      phoneNumber: user.phoneNumber,
      shippingAddress: user.shippingAddress,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update logged-in user's profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const updateData = {};
  if (req.body.name) updateData.name = req.body.name.trim();
  if (req.body.email) updateData.email = req.body.email.toLowerCase().trim();
  if (req.body.phoneNumber) updateData.phoneNumber = req.body.phoneNumber;
  if (req.body.password) {
    const salt = await bcrypt.genSalt(12);
    updateData.password = await bcrypt.hash(req.body.password, salt);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
  });

  logSecurity('USER_PROFILE_UPDATED', { userId: req.user.id });

  res.json({
    _id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    isSuperAdmin: updatedUser.isSuperAdmin,
    sellerStatus: updatedUser.sellerStatus,
    deliveryStatus: updatedUser.deliveryStatus,
    phoneNumber: updatedUser.phoneNumber,
    isDeliveryAgent: updatedUser.isDeliveryAgent,
    isSupport: updatedUser.isSupport,
    token: generateToken(updatedUser.id),
  });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
      sellerStatus: true,
      deliveryStatus: true,
      isDeliveryAgent: true,
      isSupport: true,
      phoneNumber: true,
      panNumber: true,
      gstNumber: true,
      licensePicture: true,
      passportPhoto: true,
      drivingLicense: true,
      bikeNumberPlate: true,
      bikeRegistration: true,
      shippingAddress: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const formattedUsers = users.map(user => ({
    ...user,
    _id: user.id,
  }));

  res.json(formattedUsers);
});

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.isSuperAdmin) {
    res.status(400);
    throw new Error('Cannot delete a superadmin user');
  }
  if (user.isAdmin && !req.user.isSuperAdmin) {
    logSecurity('ADMIN_DELETE_PREVENTED', { adminId: req.user.id, targetId: user.id });
    res.status(403);
    throw new Error('Only superadmins can delete admin accounts');
  }

  await prisma.user.delete({
    where: { id: req.params.id },
  });

  logSecurity('USER_DELETED', { adminId: req.user.id, targetId: user.id });
  res.json({ message: 'User removed' });
});

// @desc    Update any user's role/details (admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const updateData = {
    name: req.body.name ?? user.name,
    email: req.body.email ?? user.email,
  };

  if (req.user.isSuperAdmin) {
    if (req.body.isAdmin !== undefined) updateData.isAdmin = req.body.isAdmin;
    if (req.body.isSuperAdmin !== undefined) updateData.isSuperAdmin = req.body.isSuperAdmin;
    if (req.body.sellerStatus !== undefined) updateData.sellerStatus = req.body.sellerStatus;
    if (req.body.isDeliveryAgent !== undefined) updateData.isDeliveryAgent = req.body.isDeliveryAgent;
  } else if (
    req.body.isAdmin !== undefined ||
    req.body.isSuperAdmin !== undefined ||
    req.body.sellerStatus !== undefined ||
    req.body.isDeliveryAgent !== undefined
  ) {
    logSecurity('ROLE_MODIFICATION_BYPASS_ATTEMPT', { userId: req.user.id, targetId: user.id });
    res.status(403);
    throw new Error('Only superadmins can modify user roles');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
  });

  logSecurity('USER_ROLES_UPDATED_BY_ADMIN', { adminId: req.user.id, targetId: updatedUser.id, updates: updateData });

  res.json({
    _id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    isSuperAdmin: updatedUser.isSuperAdmin,
  });
});

// @desc    Verify seller documents (approve/reject)
// @route   PUT /api/users/:id/verify-seller
// @access  Private/SuperAdmin
const verifySeller = asyncHandler(async (req, res) => {
  const { approve } = req.body;
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.sellerStatus !== 'PENDING') {
    res.status(400);
    throw new Error('User is not a pending seller applicant');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      sellerStatus: approve ? 'APPROVED' : 'REJECTED',
      isAdmin: false,
      isSuperAdmin: false,
    },
  });

  logSecurity('SELLER_VERIFICATION_STATUS_CHANGED', { adminId: req.user.id, targetId: updatedUser.id, approved: approve });

  res.json({
    _id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    isSuperAdmin: updatedUser.isSuperAdmin,
    sellerStatus: updatedUser.sellerStatus,
  });
});

// @desc    Verify delivery agent documents (approve/reject)
// @route   PUT /api/users/:id/verify-delivery
// @access  Private/Admin
const verifyDeliveryAgent = asyncHandler(async (req, res) => {
  const { approve } = req.body;
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.deliveryStatus !== 'PENDING') {
    res.status(400);
    throw new Error('User is not a pending delivery agent applicant');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      deliveryStatus: approve ? 'APPROVED' : 'REJECTED',
    },
  });

  logSecurity('DELIVERY_VERIFICATION_STATUS_CHANGED', { adminId: req.user.id, targetId: updatedUser.id, approved: approve });

  res.json({
    _id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    isDeliveryAgent: updatedUser.isDeliveryAgent,
    deliveryStatus: updatedUser.deliveryStatus,
  });
});

// @desc    Initiate forgot password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  
  if (!user) {
    // Return a generic response to prevent user enumeration
    logSecurity('FORGOT_PASSWORD_NONEXISTENT_EMAIL', { email });
    res.json({ message: 'If a matching user account exists, a reset code has been sent.' });
    return;
  }

  // Generate secure 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { resetOtp: otp, resetOtpExpiry },
  });

  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Buybee Support" <support@buybee.com>',
      to: user.email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
    });

    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    console.log(`[DEVELOPMENT] OTP for ${user.email} is: ${otp}`);
    
    logSecurity('FORGOT_PASSWORD_OTP_SENT', { userId: user.id });
    res.json({ message: 'OTP sent to email' });
  } catch (error) {
    logError('Failed to send forgot password email', error);
    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!user || user.resetOtp !== otp) {
    logSecurity('INVALID_OTP_VERIFICATION_ATTEMPT', { email });
    res.status(400);
    throw new Error('Invalid OTP');
  }

  if (user.resetOtpExpiry < new Date()) {
    logSecurity('EXPIRED_OTP_VERIFICATION_ATTEMPT', { email });
    res.status(400);
    throw new Error('OTP expired');
  }

  res.json({ message: 'OTP verified successfully' });
});

// @desc    Reset password
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!user || user.resetOtp !== otp) {
    logSecurity('INVALID_PASSWORD_RESET_ATTEMPT', { email });
    res.status(400);
    throw new Error('Invalid OTP');
  }

  if (user.resetOtpExpiry < new Date()) {
    logSecurity('EXPIRED_PASSWORD_RESET_ATTEMPT', { email });
    res.status(400);
    throw new Error('OTP expired');
  }

  if (!newPassword || newPassword.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: {
      password: hashedPassword,
      resetOtp: null,
      resetOtpExpiry: null,
    },
  });

  logSecurity('PASSWORD_RESET_SUCCESS', { userId: user.id });

  res.json({ message: 'Password reset successful' });
});

// @desc    Get delivery agents
// @route   GET /api/users/delivery-agents
// @access  Private/Admin/Seller
const getDeliveryAgents = asyncHandler(async (req, res) => {
  const agents = await prisma.user.findMany({
    where: { isDeliveryAgent: true },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
  });
  res.json(agents);
});

export {
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
};
