import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB, { prisma } from './config/db.js';

dotenv.config();
await connectDB();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('delivery123', salt);
  
  await prisma.user.upsert({
    where: { email: 'delivery@buybee.com' },
    update: { isDeliveryAgent: true, password },
    create: {
      name: 'Delivery Agent',
      email: 'delivery@buybee.com',
      password,
      isDeliveryAgent: true
    }
  });
  console.log('Delivery agent created: delivery@buybee.com / delivery123');
  process.exit(0);
}

main().catch(console.error);
