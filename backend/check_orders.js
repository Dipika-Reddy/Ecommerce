import connectDB, { prisma } from './config/db.js';
await connectDB();

const orders = await prisma.order.findMany({
  include: {
    user: true,
  }
});
console.log('ORDERS IN DB:', JSON.stringify(orders.map(o => ({ id: o.id, user: o.user?.name, status: o.status })), null, 2));
process.exit(0);
