import connectDB, { prisma } from './config/db.js';
await connectDB();

const user = await prisma.user.findFirst({
  where: { email: 'support@buybee.com' }
});

console.log('SUPPORT USER:', user);

const orders = await prisma.order.findMany({
  orderBy: { createdAt: 'desc' },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
      },
    },
    deliveryAgent: {
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
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

console.log('TOTAL DB ORDERS COUNT:', orders.length);

const isSuperAdmin = user.isSuperAdmin;
const isAdmin = user.isAdmin;
const isSupport = user.isSupport;
const filteredOrders = [];

for (const order of orders) {
  if (isSuperAdmin || isAdmin || isSupport) {
    // Format
    filteredOrders.push({
      ...order,
      _id: order.id,
    });
    continue;
  }
}

console.log('FILTERED ORDERS COUNT:', filteredOrders.length);
process.exit(0);
