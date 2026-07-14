import Razorpay from 'razorpay';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';
import { logSecurity } from '../utils/logger.js';

// Setup Razorpay client
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// Helper to format Prisma Payment model
const formatPayment = (payment) => {
  if (!payment) return null;
  const sellerNames = payment.order?.orderItems
    ? Array.from(new Set(payment.order.orderItems.map(item => item.product?.user?.name).filter(Boolean)))
    : [];
  return {
    ...payment,
    _id: payment.id,
    sellerNames,
  };
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Authorization Check
  if (order.userId !== req.user.id && !req.user.isSuperAdmin && !req.user.isAdmin) {
    logSecurity('UNAUTHORIZED_PAYMENT_CREATION_ATTEMPT', { userId: req.user.id, orderId: order.id });
    res.status(403);
    throw new Error('Not authorized to make payment for this order');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  const amountInPaise = Math.round(order.totalPrice * 100);

  if (razorpay) {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.id,
      });

      // Upsert Payment Record
      await prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          userId: order.userId,
          amount: order.totalPrice,
          currency: 'INR',
          paymentMethod: order.paymentMethod,
          transactionId: razorpayOrder.id,
          gateway: 'RAZORPAY',
          paymentStatus: 'PENDING',
        },
        update: {
          transactionId: razorpayOrder.id,
          paymentStatus: 'PENDING',
        },
      });

      res.status(201).json({
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: order.totalPrice,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      res.status(500);
      throw new Error(`Razorpay Order Creation Failed: ${err.message}`);
    }
  } else {
    // Mock Fallback Mode
    const mockOrderId = `mock_order_${Date.now()}`;

    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        userId: order.userId,
        amount: order.totalPrice,
        currency: 'INR',
        paymentMethod: order.paymentMethod,
        transactionId: mockOrderId,
        gateway: 'MOCK',
        paymentStatus: 'PENDING',
      },
      update: {
        transactionId: mockOrderId,
        paymentStatus: 'PENDING',
      },
    });

    res.status(201).json({
      orderId: order.id,
      razorpayOrderId: mockOrderId,
      amount: order.totalPrice,
      currency: 'INR',
      keyId: 'MOCK_KEY_ID',
      isMock: true,
    });
  }
});

// @desc    Verify Razorpay Signature & complete payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Authorization Check: Only order owner or admin/superadmin can verify
  if (order.userId !== req.user.id && !req.user.isSuperAdmin && !req.user.isAdmin) {
    logSecurity('UNAUTHORIZED_PAYMENT_VERIFICATION_ATTEMPT', { userId: req.user.id, orderId: order.id });
    res.status(403);
    throw new Error('Not authorized to verify payment for this order');
  }

  // Handle Mock Payment Verification
  if (razorpay_order_id.startsWith('mock_order_') || !razorpay) {
    const transactionId = razorpay_payment_id || `mock_pay_${Date.now()}`;

    await prisma.payment.update({
      where: { orderId: orderId },
      data: {
        paymentStatus: 'SUCCESS',
        transactionId: transactionId,
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        status: 'Processing',
        paymentResult: {
          id: transactionId,
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: req.user.email,
        },
      },
    });

    logSecurity('MOCK_PAYMENT_SUCCESS', { orderId, userId: req.user.id });
    res.json({ success: true, message: 'Mock payment verified successfully', order: updatedOrder });
    return;
  }

  // Live Razorpay Verification
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    logSecurity('RAZORPAY_SIGNATURE_VERIFICATION_FAILED', { orderId, userId: req.user.id });
    res.status(400);
    throw new Error('Payment signature verification failed');
  }

  // Fetch actual payment details from Razorpay to get the payment method used
  let method = order.paymentMethod;
  try {
    const paymentInfo = await razorpay.payments.fetch(razorpay_payment_id);
    method = paymentInfo.method || method;
  } catch (err) {
    // Fail gracefully and use default paymentMethod
  }

  await prisma.payment.update({
    where: { orderId: orderId },
    data: {
      paymentStatus: 'SUCCESS',
      transactionId: razorpay_payment_id,
      paymentMethod: method,
    },
  });

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      isPaid: true,
      paidAt: new Date(),
      status: 'Processing',
      paymentResult: {
        id: razorpay_payment_id,
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: req.user.email,
      },
    },
  });

  logSecurity('RAZORPAY_PAYMENT_SUCCESS', { orderId, userId: req.user.id, transactionId: razorpay_payment_id });

  res.json({ success: true, message: 'Payment verified successfully', order: updatedOrder });
});

// @desc    Razorpay Webhooks
// @route   POST /api/payments/webhook
// @access  Public
const handleWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'MOCK_SECRET';
  const signature = req.headers['x-razorpay-signature'];

  if (razorpay && signature) {
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      logSecurity('WEBHOOK_SIGNATURE_VERIFICATION_FAILED', { signature });
      res.status(400);
      throw new Error('Invalid webhook signature');
    }
  }

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const paymentEntity = payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    const payment = await prisma.payment.findFirst({
      where: { transactionId: razorpayOrderId },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'SUCCESS',
          transactionId: paymentId,
          paymentMethod: paymentEntity.method,
        },
      });

      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          isPaid: true,
          paidAt: new Date(),
          status: 'Processing',
          paymentResult: {
            id: paymentId,
            status: 'COMPLETED',
            update_time: new Date().toISOString(),
            email_address: paymentEntity.email,
          },
        },
      });
      logSecurity('WEBHOOK_PAYMENT_CAPTURED', { orderId: payment.orderId, transactionId: paymentId });
    }
  } else if (event === 'payment.failed') {
    const paymentEntity = payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;

    const payment = await prisma.payment.findFirst({
      where: { transactionId: razorpayOrderId },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'FAILED',
        },
      });
      logSecurity('WEBHOOK_PAYMENT_FAILED', { orderId: payment.orderId });
    }
  } else if (event === 'refund.processed') {
    const refundEntity = payload.refund.entity;
    const paymentId = refundEntity.payment_id;

    const payment = await prisma.payment.findFirst({
      where: { transactionId: paymentId },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'REFUNDED',
        },
      });
      logSecurity('WEBHOOK_REFUND_PROCESSED', { paymentId });
    }
  }

  res.json({ status: 'ok' });
});

// @desc    Get payment status by payment ID
// @route   GET /api/payments/:paymentId
// @access  Private
const getPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.paymentId },
    include: {
      order: {
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  // Authorization Check: Only owner, admin/superadmin, or seller of item can read payment status
  const isCustomer = payment.userId === req.user.id;
  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  const isSeller = payment.order?.orderItems?.some(
    item => item.product?.userId === req.user.id
  );

  if (!isCustomer && !isSuperAdmin && !isAdmin && !isSeller) {
    logSecurity('UNAUTHORIZED_PAYMENT_STATUS_ACCESS', { userId: req.user.id, paymentId: payment.id });
    res.status(403);
    throw new Error('Not authorized to access this payment record');
  }

  res.json(formatPayment(payment));
});

// @desc    Refund payment
// @route   POST /api/payments/refund
// @access  Private (Admin/Seller)
const refundPayment = asyncHandler(async (req, res) => {
  const { paymentId, amount, reason } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: {
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  // Authorization Check: Only admin, superadmin, or seller of the products in the order can refund
  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  const isSeller = payment.order?.orderItems?.some(
    item => item.product?.userId === req.user.id
  );

  if (!isSuperAdmin && !isAdmin && !isSeller) {
    logSecurity('UNAUTHORIZED_REFUND_REQUEST_ATTEMPT', { userId: req.user.id, paymentId: payment.id });
    res.status(403);
    throw new Error('Not authorized to request refund for this payment');
  }

  const refundAmount = Number(amount);
  if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > payment.amount) {
    res.status(400);
    throw new Error('Invalid refund amount');
  }

  if (razorpay && payment.gateway === 'RAZORPAY') {
    try {
      const razorpayRefund = await razorpay.payments.refund(payment.transactionId, {
        amount: Math.round(refundAmount * 100),
        notes: { reason: reason || 'Customer request' },
      });

      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          refundAmount,
          refundReason: reason || 'Customer request',
          refundStatus: 'SUCCESS',
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'REFUNDED',
        },
      });

      res.status(201).json({ success: true, refundId: razorpayRefund.id });
    } catch (err) {
      res.status(500);
      throw new Error(`Razorpay Refund Failed: ${err.message}`);
    }
  } else {
    // Mock refund
    await prisma.refund.create({
      data: {
        paymentId: payment.id,
        refundAmount,
        refundReason: reason || 'Mock refund',
        refundStatus: 'SUCCESS',
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: 'REFUNDED',
      },
    });

    logSecurity('MOCK_REFUND_PROCESSED', { paymentId, amount });
    res.status(201).json({ success: true, message: 'Mock refund successfully processed' });
  }
});

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Seller
const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      order: {
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  const filtered = [];

  for (const payment of payments) {
    if (isSuperAdmin || isAdmin) {
      filtered.push(formatPayment(payment));
      continue;
    }

    const isSeller = payment.order?.orderItems?.some(
      item => item.product?.userId === req.user.id
    );

    if (isSeller) {
      filtered.push(formatPayment(payment));
    }
  }

  res.json(filtered);
});

// @desc    Create subscription (simulated Razorpay order creation for subscription plans)
// @route   POST /api/payments/create-subscription-order
// @access  Private
const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const { planName, price } = req.body;
  if (!planName || isNaN(Number(price))) {
    res.status(400);
    throw new Error('Invalid plan name or price');
  }

  const orderAmount = Number(price);

  if (razorpay) {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(orderAmount * 100),
        currency: 'INR',
        receipt: `sub_${Date.now()}`,
      });
      res.status(201).json({
        razorpayOrderId: razorpayOrder.id,
        amount: orderAmount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      res.status(500);
      throw new Error(`Razorpay Subscription Order Failed: ${err.message}`);
    }
  } else {
    res.status(201).json({
      razorpayOrderId: `mock_sub_${Date.now()}`,
      amount: orderAmount,
      currency: 'INR',
      keyId: 'MOCK_KEY_ID',
      isMock: true,
    });
  }
});

// @desc    Verify subscription (mocks update user role status to seller APPROVED on successful payment verify)
// @route   POST /api/payments/verify-subscription
// @access  Private
const verifySubscription = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (razorpay && !razorpay_order_id.startsWith('mock_sub_')) {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      logSecurity('SUBSCRIPTION_SIGNATURE_VERIFICATION_FAILED', { userId: req.user.id });
      res.status(400);
      throw new Error('Subscription signature verification failed');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      sellerStatus: 'APPROVED',
    },
  });

  logSecurity('SELLER_SUBSCRIPTION_VERIFIED', { userId: req.user.id });

  res.json({ success: true, sellerStatus: updatedUser.sellerStatus });
});

export {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  refundPayment,
  getAllPayments,
  createSubscriptionOrder,
  verifySubscription,
};
