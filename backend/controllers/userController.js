import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phoneNumber, panNumber, gstNumber, licensePicture, isSellerRequested, isDeliveryAgent } = req.body;

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

  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (userExists) {
    res.status(400);
    throw new Error('A user with that email already exists');
  }

  // Hash password explicitly since there are no mongoose middleware hooks in Prisma
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // If a seller is requested, set status to PENDING and isAdmin to false until verified.
  const sellerStatus = isSellerRequested ? 'PENDING' : 'NONE';
  const isAdmin = false;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      isAdmin,
      phoneNumber,
      panNumber: isSellerRequested ? panNumber : null,
      gstNumber: isSellerRequested ? gstNumber : null,
      licensePicture: isSellerRequested ? licensePicture : null,
      sellerStatus,
      isDeliveryAgent: Boolean(isDeliveryAgent),
    },
  });

  if (user) {
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

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && (await bcrypt.compare(password, user.password))) {
    if (user.sellerStatus === 'PENDING') {
      res.status(403);
      throw new Error('Your seller account is pending approval by the system administrator.');
    }
    if (user.sellerStatus === 'REJECTED') {
      res.status(403);
      throw new Error('Your seller account application has been rejected.');
    }

    res.json({
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
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Logout user (client deletes token; server endpoint kept for symmetry / cookie clearing)
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
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
      sellerStatus: user.sellerStatus,
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
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.email) updateData.email = req.body.email;
  if (req.body.phoneNumber) updateData.phoneNumber = req.body.phoneNumber;
  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(req.body.password, salt);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
  });

  res.json({
    _id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    isSuperAdmin: updatedUser.isSuperAdmin,
    sellerStatus: updatedUser.sellerStatus,
    phoneNumber: updatedUser.phoneNumber,
    isDeliveryAgent: updatedUser.isDeliveryAgent,
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
      isDeliveryAgent: true,
      phoneNumber: true,
      panNumber: true,
      gstNumber: true,
      licensePicture: true,
      shippingAddress: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Map database ids to _id format for frontend compatibility
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
  // Only superadmin can delete admin accounts
  if (user.isAdmin && !req.user.isSuperAdmin) {
    res.status(403);
    throw new Error('Only superadmins can delete admin accounts');
  }

  await prisma.user.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'User removed' });
});

// @desc    Update any user's role/details (admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  // Role changes are restricted to superadmins only
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
    res.status(403);
    throw new Error('Only superadmins can modify user roles');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
  });

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

  res.json({
    _id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    isSuperAdmin: updatedUser.isSuperAdmin,
    sellerStatus: updatedUser.sellerStatus,
  });
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
};
