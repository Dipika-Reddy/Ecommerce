import Razorpay from 'razorpay';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';

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

  if (order.userId !== req.user.id && !req.user.isSuperAdmin) {
    res.status(403);
    throw new Error('Not authorized to make payment for this order');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  const amountInPaise = Math.round(order.totalPrice * 100);

  // If Razorpay client is initialized
  if (razorpay) {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.id,
      });

      // Upsert Payment Record
      const payment = await prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          userId: req.user.id,
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
        userId: req.user.id,
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

  // Handle Mock Payment Verification
  if (razorpay_order_id.startsWith('mock_order_') || !razorpay) {
    const transactionId = razorpay_payment_id || `mock_pay_${Date.now()}`;

    // Update payment record
    await prisma.payment.update({
      where: { orderId: orderId },
      data: {
        paymentStatus: 'SUCCESS',
        transactionId: transactionId,
      },
    });

    // Mark order as paid
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

  // Update local payment record
  await prisma.payment.update({
    where: { orderId: orderId },
    data: {
      paymentStatus: 'SUCCESS',
      transactionId: razorpay_payment_id,
      paymentMethod: method,
    },
  });

  // Mark order as paid
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
      res.status(400);
      throw new Error('Invalid webhook signature');
    }
  }

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const paymentEntity = payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    // Find local payment record by Razorpay order ID (transactionId during pending state)
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

      // Upsert Refund log
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          refundAmount: refundEntity.amount / 100,
          refundReason: refundEntity.notes?.reason || 'Webhook processed refund',
          refundStatus: 'SUCCESS',
        },
      });
    }
  }

  res.status(200).json({ status: 'ok' });
});

// @desc    Get Payment details
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
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
      refunds: true,
    },
  });

  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  const isCustomer = payment.userId === req.user.id;
  const isSeller = payment.order?.orderItems?.some(
    (item) => item.product && item.product.userId === req.user.id
  );

  if (!isSuperAdmin && !isAdmin && !isCustomer && !isSeller) {
    res.status(403);
    throw new Error('Not authorized to view this payment');
  }

  res.json(formatPayment(payment));
});

// @desc    Process refund (Admin dashboard action)
// @route   POST /api/payments/refund
// @access  Private/Admin
const refundPayment = asyncHandler(async (req, res) => {
  const { paymentId, amount, reason } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { 
      refunds: true,
      order: {
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  userId: true,
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
    throw new Error('Payment record not found');
  }

  // Check authorization
  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  const isSeller = payment.order?.orderItems?.some(
    (item) => item.product && item.product.userId === req.user.id
  );

  if (!isSuperAdmin && !isAdmin && !isSeller) {
    res.status(403);
    throw new Error('Not authorized to process refund for this payment');
  }

  if (payment.paymentStatus !== 'SUCCESS' && payment.paymentStatus !== 'PARTIALLY_REFUNDED') {
    res.status(400);
    throw new Error('Only successful payments can be refunded');
  }

  // If order is cancelled, limit refund to MRP (itemsPrice)
  let maxRefundLimit = payment.amount;
  if (payment.order && payment.order.status === 'Cancelled') {
    maxRefundLimit = payment.order.itemsPrice;
  }

  const refundAmt = amount !== undefined ? Number(amount) : maxRefundLimit;

  // Calculate already refunded amount
  const totalAlreadyRefunded = payment.refunds
    .filter(r => r.refundStatus === 'SUCCESS')
    .reduce((acc, r) => acc + r.refundAmount, 0);

  const remainingRefundable = maxRefundLimit - totalAlreadyRefunded;

  if (refundAmt > remainingRefundable) {
    res.status(400);
    throw new Error(
      payment.order && payment.order.status === 'Cancelled'
        ? `Refund amount exceeds remaining refundable MRP limit of ₹${remainingRefundable.toFixed(2)} (excluding tax & shipping).`
        : `Refund amount exceeds remaining payment balance of ₹${remainingRefundable.toFixed(2)}.`
    );
  }

  // If Razorpay client is initialized
  if (razorpay && payment.gateway === 'RAZORPAY') {
    try {
      const refund = await razorpay.payments.refund(payment.transactionId, {
        amount: Math.round(refundAmt * 100),
        notes: { reason: reason || 'Customer requested refund' },
      });

      // Update database status
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: 'REFUNDED',
        },
      });

      const refundRecord = await prisma.refund.create({
        data: {
          paymentId: paymentId,
          refundAmount: refundAmt,
          refundReason: reason || 'Customer requested refund',
          refundStatus: 'SUCCESS',
        },
      });

      res.status(201).json({ success: true, refund: refundRecord });
    } catch (err) {
      res.status(500);
      throw new Error(`Razorpay Refund Failed: ${err.message}`);
    }
  } else {
    // Mock Mode Refund
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'REFUNDED',
      },
    });

    const refundRecord = await prisma.refund.create({
      data: {
        paymentId: paymentId,
        refundAmount: refundAmt,
        refundReason: reason || 'Mock refund processed',
        refundStatus: 'SUCCESS',
      },
    });

    res.status(201).json({ success: true, refund: refundRecord, isMock: true });
  }
});

const getAllPayments = asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      order: {
        select: {
          id: true,
          totalPrice: true,
          itemsPrice: true,
          taxPrice: true,
          shippingPrice: true,
          status: true,
          orderItems: {
            include: {
              product: {
                include: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (isSuperAdmin || isAdmin) {
    res.json(payments.map(formatPayment));
    return;
  }

  // Otherwise, the requester is a seller. Filter payments that contain their products.
  const filteredPayments = payments.filter((payment) => {
    return payment.order?.orderItems?.some(
      (item) => item.product && item.product.userId === req.user.id
    );
  });

  res.json(filteredPayments.map(formatPayment));
});

// @desc    Create Razorpay Order for Buzz Subscription
// @route   POST /api/payments/create-subscription-order
// @access  Private
const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const price = plan === 'Yearly' ? 1499 : 179;
  const amountInPaise = price * 100;

  if (razorpay) {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `sub_${req.user.id}_${Date.now()}`,
      });

      res.status(201).json({
        plan,
        razorpayOrderId: razorpayOrder.id,
        amount: price,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      res.status(500);
      throw new Error(`Razorpay Subscription Order Creation Failed: ${err.message}`);
    }
  } else {
    // Mock Fallback Mode
    const mockOrderId = `mock_sub_order_${Date.now()}`;
    res.status(201).json({
      plan,
      razorpayOrderId: mockOrderId,
      amount: price,
      currency: 'INR',
      keyId: 'mock_key_id',
    });
  }
});

// @desc    Verify Buzz Subscription Payment
// @route   POST /api/payments/verify-subscription
// @access  Private
const verifySubscription = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

  if (razorpay) {
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      res.status(400);
      throw new Error('Invalid payment signature');
    }
  }

  res.status(200).json({ success: true, message: 'Subscription payment verified' });
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
