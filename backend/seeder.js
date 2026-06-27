import dotenv from 'dotenv';
import connectDB, { prisma } from './config/db.js';
import users from './data/users.js';
import products from './data/products.js';

dotenv.config();

// Ensure connection pool is established
await connectDB();

const importData = async () => {
  try {
    // Clean all tables in dependency order
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    console.log('Tables cleared successfully.');

    // Seed Users
    const createdUsers = [];
    for (const user of users) {
      const createdUser = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin || false,
          sellerStatus: user.sellerStatus || 'NONE',
        },
      });
      createdUsers.push(createdUser);
    }

    const sellerUser = createdUsers.find((u) => u.email === 'seller@buybee.com') || createdUsers[2];
    const sellerUserId = sellerUser.id;
    console.log(`Seeded ${createdUsers.length} users. Seller ID: ${sellerUserId}`);

    // Seed Products
    let productCount = 0;
    for (const prod of products) {
      await prisma.product.create({
        data: {
          name: prod.name,
          images: prod.images,
          brand: prod.brand,
          category: prod.category,
          description: prod.description,
          price: prod.price,
          countInStock: prod.countInStock,
          rating: prod.rating,
          numReviews: prod.numReviews,
          sizes: prod.sizes,
          colors: prod.colors,
          userId: sellerUserId,
        },
      });
      productCount++;
    }

    console.log(`Seeded ${productCount} products.`);
    console.log('Data imported successfully!');
    console.log('Customer login -> buyer@buybee.com / buyer123');
    console.log('Seller login   -> seller@buybee.com / seller123  (/seller)');
    console.log('Admin login    -> admin@buybee.com / admin123      (/admin)');
    console.log('Superadmin     -> superadmin@buybee.com / superadmin123 (/superadmin)');
    process.exit(0);
  } catch (error) {
    console.error(`Error importing data: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    console.log('Data destroyed!');
    process.exit(0);
  } catch (error) {
    console.error(`Error destroying data: ${error.message}`);
    process.exit(1);
  }
};

// Usage:  node seeder.js        -> import sample data
//         node seeder.js -d     -> wipe all collections
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
