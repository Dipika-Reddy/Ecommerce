import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';

// @desc    Log a helpline call
// @route   POST /api/helpline/calls
// @access  Private/Support
const createCallLog = asyncHandler(async (req, res) => {
  const { customerPhone, customerName, notes } = req.body;

  if (!customerPhone) {
    res.status(400);
    throw new Error('Customer phone number is required');
  }

  // Find if customer is registered
  const registeredUser = await prisma.user.findFirst({
    where: {
      phoneNumber: customerPhone,
    },
  });

  const call = await prisma.helplineCall.create({
    data: {
      customerPhone,
      customerName: customerName || (registeredUser ? registeredUser.name : 'Unknown Customer'),
      customerId: registeredUser ? registeredUser.id : null,
      agentId: req.user.id,
      notes: notes || '',
    },
    include: {
      agent: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true, email: true, phoneNumber: true } },
    },
  });

  res.status(201).json(call);
});

// @desc    Get all call history
// @route   GET /api/helpline/calls
// @access  Private/Admin
const getCallHistory = asyncHandler(async (req, res) => {
  const calls = await prisma.helplineCall.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      agent: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true, email: true, phoneNumber: true } },
    },
  });

  res.json(calls);
});

// @desc    Search registered customer by phone
// @route   GET /api/helpline/search-customer
// @access  Private/Support
const searchCustomerByPhone = asyncHandler(async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    res.status(400);
    throw new Error('Phone query parameter is required');
  }

  const user = await prisma.user.findFirst({
    where: {
      phoneNumber: phone,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
  });

  res.json(user);
});

// @desc    Get all support order actions
// @route   GET /api/helpline/order-actions
// @access  Private/Admin
const getSupportOrderActions = asyncHandler(async (req, res) => {
  const actions = await prisma.supportActionLog.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      agent: { select: { id: true, name: true, email: true } },
      order: {
        select: {
          id: true,
          totalPrice: true,
          status: true,
          user: { select: { id: true, name: true, email: true } }
        }
      },
    },
  });

  res.json(actions);
});

export { createCallLog, getCallHistory, searchCustomerByPhone, getSupportOrderActions };
