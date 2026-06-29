import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('123456', salt);
  
  await prisma.user.upsert({
    where: { email: 'delivery@example.com' },
    update: { isDeliveryAgent: true },
    create: {
      name: 'Delivery Agent',
      email: 'delivery@example.com',
      password,
      isDeliveryAgent: true
    }
  });
  console.log('Delivery agent created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
