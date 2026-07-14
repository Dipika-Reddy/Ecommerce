import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB, { prisma } from './config/db.js';

dotenv.config();
await connectDB();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('support123', salt);
  
  await prisma.user.upsert({
    where: { email: 'support@buybee.com' },
    update: { isSupport: true, password },
    create: {
      name: 'Support Agent',
      email: 'support@buybee.com',
      password,
      isSupport: true,
      phoneNumber: '18005559999'
    }
  });
  console.log('Support agent created: support@buybee.com / support123');
  process.exit(0);
}

main().catch(console.error);
