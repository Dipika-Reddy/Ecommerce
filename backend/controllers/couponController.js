import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';

// @desc    Get all active coupons
// @route   GET /api/coupons
// @access  Private (Registered Users)
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await prisma.coupon.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(coupons);
});

// @desc    Get all coupons (Admin/SuperAdmin)
// @route   GET /api/coupons/admin
// @access  Private (Admin/SuperAdmin)
const adminGetCoupons = asyncHandler(async (req, res) => {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(coupons);
});

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private (Admin/SuperAdmin)
const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, minPurchase, description } = req.body;

  if (!code || !discountType || discountValue === undefined) {
    res.status(400);
    throw new Error('Please enter code, discount type, and discount value');
  }

  const normalizedCode = code.toUpperCase().trim();

  const couponExists = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (couponExists) {
    res.status(400);
    throw new Error('A coupon with this code already exists');
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: normalizedCode,
      discountType,
      discountValue: Number(discountValue),
      minPurchase: minPurchase ? Number(minPurchase) : 0.0,
      description,
    },
  });

  res.status(201).json(coupon);
});

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Admin/SuperAdmin)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: req.params.id },
  });

  if (coupon) {
    await prisma.coupon.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Coupon removed successfully' });
  } else {
    res.status(404);
    throw new Error('Coupon not found');
  }
});

// @desc    Validate a coupon code
// @route   POST /api/coupons/validate
// @access  Private (Registered Users)
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;

  if (!code) {
    res.status(400);
    throw new Error('Coupon code is required');
  }

  const normalizedCode = code.toUpperCase().trim();
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.isActive) {
    res.status(400);
    throw new Error('Invalid or expired coupon code');
  }

  if (orderAmount < coupon.minPurchase) {
    res.status(400);
    throw new Error(`Minimum purchase of ₹${coupon.minPurchase.toFixed(2)} is required for this coupon`);
  }

  res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minPurchase: coupon.minPurchase,
    description: coupon.description,
  });
});

export {
  getCoupons,
  adminGetCoupons,
  createCoupon,
  deleteCoupon,
  validateCoupon,
};
