import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';
import { isSellerUser } from '../utils/userRoles.js';

// Helper to format Prisma Order models to match the MongoDB schema layout
const formatOrder = (order) => {
  if (!order) return null;
  return {
    ...order,
    _id: order.id,
    user: order.user ? { ...order.user, _id: order.user.id } : order.userId,
    orderItems: order.orderItems
      ? order.orderItems.map((item) => ({
          ...item,
          _id: item.id,
          product: item.productId,
        }))
      : [],
    payments: order.payments
      ? order.payments.map((p) => ({
          ...p,
          _id: p.id,
        }))
      : [],
  };
};

// @desc    Create a new order (final step of the checkout wizard)
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, shippingPrice: clientShippingPrice } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items provided');
  }

  // Recalculate prices server-side from the DB — never trust client-sent totals
  const itemsFromDb = await prisma.product.findMany({
    where: {
      id: { in: orderItems.map((item) => item.product) },
    },
  });

  let itemsPrice = 0;
  const validatedOrderItems = orderItems.map((item) => {
    const matchingProduct = itemsFromDb.find((p) => p.id === item.product);

    if (!matchingProduct) {
      res.status(400);
      throw new Error(`Product not found: ${item.product}`);
    }
    if (matchingProduct.countInStock < item.qty) {
      res.status(400);
      throw new Error(`Insufficient stock for ${matchingProduct.name}`);
    }

    itemsPrice += matchingProduct.price * item.qty;

    let image = matchingProduct.images[0];
    if (item.color && matchingProduct.colors && matchingProduct.colors.length > 0) {
      const colorIdx = matchingProduct.colors.indexOf(item.color);
      if (colorIdx !== -1 && colorIdx < matchingProduct.images.length) {
        image = matchingProduct.images[colorIdx];
      }
    }

    return {
      name: matchingProduct.name,
      qty: item.qty,
      image,
      price: matchingProduct.price,
      size: item.size,
      color: item.color,
      product: matchingProduct.id,
    };
  });

  const shippingPrice = clientShippingPrice !== undefined ? Number(clientShippingPrice) : (itemsPrice > 100 ? 0 : 10);
  const taxPrice = Number((0.03 * itemsPrice).toFixed(2)); // flat 3% tax
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

  // Create Order with nested OrderItems using Prisma Transaction
  const createdOrder = await prisma.order.create({
    data: {
      userId: req.user.id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      orderItems: {
        create: validatedOrderItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          image: item.image,
          price: item.price,
          size: item.size,
          color: item.color,
          productId: item.product,
        })),
      },
    },
    include: {
      orderItems: true,
    },
  });

  // Create corresponding Payment record
  await prisma.payment.create({
    data: {
      orderId: createdOrder.id,
      userId: req.user.id,
      amount: createdOrder.totalPrice,
      currency: 'INR',
      paymentMethod: createdOrder.paymentMethod,
      transactionId: createdOrder.paymentMethod === 'Cash on Delivery' ? `COD-${Date.now()}` : null,
      gateway: createdOrder.paymentMethod === 'Cash on Delivery' ? 'COD' : 'RAZORPAY',
      paymentStatus: 'PENDING',
    },
  });

  // Decrement stock now that the order is placed
  for (const item of validatedOrderItems) {
    await prisma.product.update({
      where: { id: item.product },
      data: {
        countInStock: {
          decrement: item.qty,
        },
      },
    });
  }

  res.status(201).json(formatOrder(createdOrder));
});

// @desc    Get a single order by id
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
const getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              userId: true,
            },
          },
        },
      },
      payments: {
        include: {
          refunds: true,
        },
      },
    },
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isCustomer = order.userId === req.user.id;
  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  
  // Find items in this order that belong to this seller/admin
  const sellerItems = order.orderItems.filter(
    (item) => item.product && item.product.userId === req.user.id
  );
  const isSeller = sellerItems.length > 0;

  // Customers, Super Admins, Admins, and Sellers who own at least one item can view the order.
  if (!isCustomer && !isSuperAdmin && !isAdmin && !isSeller) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  let formattedOrder = formatOrder(order);

  // If standard seller (but not admin, super admin, or customer), filter other sellers' items out
  if (!isCustomer && !isSuperAdmin && !isAdmin && isSeller) {
    formattedOrder.orderItems = formattedOrder.orderItems.filter((item) => {
      const rawItem = order.orderItems.find((ri) => ri.id === item._id || ri.id === item.id);
      return rawItem && rawItem.product && rawItem.product.userId === req.user.id;
    });

    // Recalculate price totals to reflect only this seller's products
    const sellerItemsPrice = formattedOrder.orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    formattedOrder.itemsPrice = sellerItemsPrice;
    formattedOrder.taxPrice = Number((0.08 * sellerItemsPrice).toFixed(2));
    formattedOrder.totalPrice = Number((sellerItemsPrice + formattedOrder.shippingPrice + formattedOrder.taxPrice).toFixed(2));
  }

  res.json(formattedOrder);
});

// @desc    Mark an order as paid — simulates a payment gateway callback
//          (mock Stripe/PayPal: client calls this once the mock charge "succeeds")
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      isPaid: true,
      paidAt: new Date(),
      status: 'Processing',
      paymentResult: {
        id: req.body.id || `MOCK-${Date.now()}`,
        status: req.body.status || 'COMPLETED',
        update_time: req.body.update_time || new Date().toISOString(),
        email_address: req.body.email_address || req.user.email,
      },
    },
    include: {
      orderItems: true,
    },
  });

  res.json(formatOrder(updatedOrder));
});

// @desc    Update delivery/shipping status (admin dashboard action)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
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
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Only Super Admins, Admins, and the specific seller(s) of items in this order can update its status
  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  const isSeller = order.orderItems.some(
    (item) => item.product && item.product.userId === req.user.id
  );

  if (!isSuperAdmin && !isAdmin && !isSeller) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  const dataUpdate = { status };
  if (status === 'Delivered') {
    dataUpdate.isDelivered = true;
    dataUpdate.deliveredAt = new Date();

    if (order.paymentMethod === 'Cash on Delivery') {
      dataUpdate.isPaid = true;
      dataUpdate.paidAt = new Date();
      dataUpdate.paymentResult = {
        id: `COD-PAID-${Date.now()}`,
        status: 'Paid on Delivery',
        update_time: new Date().toISOString(),
      };

      await prisma.payment.updateMany({
        where: { orderId: order.id },
        data: {
          paymentStatus: 'SUCCESS',
          paymentMethod: 'COD',
        },
      });
    }
  }

  const updatedOrder = await prisma.order.update({
    where: { id: req.params.id },
    data: dataUpdate,
    include: {
      orderItems: true,
    },
  });

  res.json(formatOrder(updatedOrder));
});

// @desc    Get the logged-in user's own orders (Order History page)
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItems: true,
      payments: true,
    },
  });

  const formattedOrders = orders.map((order) => formatOrder(order));
  res.json(formattedOrders);
});

// @desc    Get all orders (Admin Order Dashboard)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              userId: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  const isSuperAdmin = req.user.isSuperAdmin;
  const isAdmin = req.user.isAdmin;
  const filteredOrders = [];

  for (const order of orders) {
    if (isSuperAdmin || isAdmin) {
      filteredOrders.push(formatOrder(order));
      continue;
    }

    const sellerItems = order.orderItems.filter(
      (item) => item.product && item.product.userId === req.user.id
    );
    const isOrderSeller = sellerItems.length > 0;

    if (isOrderSeller) {
      let formatted = formatOrder(order);

      // Filter out other sellers' items from the order
      formatted.orderItems = formatted.orderItems.filter((item) => {
        const rawItem = order.orderItems.find((ri) => ri.id === item._id || ri.id === item.id);
        return rawItem && rawItem.product && rawItem.product.userId === req.user.id;
      });
      
      // Recalculate price details for this seller's scope
      const sellerItemsPrice = formatted.orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
      formatted.itemsPrice = sellerItemsPrice;
      formatted.taxPrice = Number((0.08 * sellerItemsPrice).toFixed(2));
      formatted.totalPrice = Number((sellerItemsPrice + formatted.shippingPrice + formatted.taxPrice).toFixed(2));

      filteredOrders.push(formatted);
    }
  }

  res.json(filteredOrders);
});

export {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderStatus,
  getMyOrders,
  getOrders,
};
