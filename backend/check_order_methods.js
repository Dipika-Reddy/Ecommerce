import connectDB, { prisma } from './config/db.js';
await connectDB();

const orders = await prisma.order.findMany({
  select: {
    id: true,
    paymentMethod: true,
    isPaid: true,
    status: true
  }
});
console.log('ORDERS PAYMENT METHODS:', JSON.stringify(orders, null, 2));
process.exit(0);
