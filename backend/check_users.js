import connectDB, { prisma } from './config/db.js';
await connectDB();

const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    isAdmin: true,
    isSuperAdmin: true,
    isSupport: true,
    isDeliveryAgent: true
  }
});
console.log('USERS IN DB:', JSON.stringify(users, null, 2));
process.exit(0);
