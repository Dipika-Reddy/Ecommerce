import dotenv from 'dotenv';
import connectDB, { prisma } from './config/db.js';

dotenv.config();

const newProducts = [
  {
    name: 'Wireless Noise-Canceling Headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    description: 'High-quality wireless headphones with active noise cancellation and 30-hour battery life.',
    brand: 'AudioTech',
    category: 'Electronics',
    subCategory: 'Headphones',
    price: 199.99,
    countInStock: 20,
    rating: 4.8,
    numReviews: 12,
  },
  {
    name: 'Smartphone 12 Pro',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    description: 'Latest smartphone with a stunning display and advanced camera system.',
    brand: 'TechBrand',
    category: 'Electronics',
    subCategory: 'Smartphones',
    price: 999.00,
    countInStock: 15,
    rating: 4.7,
    numReviews: 8,
  },
  {
    name: 'Elegant Summer Dress',
    image: 'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=800&auto=format&fit=crop&q=80',
    description: 'A beautiful, lightweight dress perfect for warm summer days.',
    brand: 'FashionNova',
    category: 'Fashion',
    subCategory: 'Dresses',
    price: 45.99,
    countInStock: 30,
    rating: 4.5,
    numReviews: 5,
  },
  {
    name: 'Leather Weekend Bag',
    image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&auto=format&fit=crop&q=80',
    description: 'Durable and stylish genuine leather weekend travel bag.',
    brand: 'TravelLux',
    category: 'Fashion',
    subCategory: 'Accessories',
    price: 120.00,
    countInStock: 10,
    rating: 4.9,
    numReviews: 18,
  },
  {
    name: 'Handcrafted Clay Vase',
    image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&auto=format&fit=crop&q=80',
    description: 'Unique, artisan-crafted clay vase for your living room.',
    brand: 'ArtisanCraft',
    category: 'Creative',
    subCategory: 'Home Decor',
    price: 35.50,
    countInStock: 8,
    rating: 4.6,
    numReviews: 4,
  },
  {
    name: 'Organic Clay Face Mask',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    description: 'Rejuvenating organic clay face mask for all skin types.',
    brand: 'PureBeauty',
    category: 'Beauty',
    subCategory: 'Skincare',
    price: 24.99,
    countInStock: 50,
    rating: 4.4,
    numReviews: 22,
  },
  {
    name: 'Hydrating Body Lotion',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    description: 'Deeply moisturizing body lotion with natural ingredients.',
    brand: 'PureBeauty',
    category: 'Beauty',
    subCategory: 'Body Care',
    price: 18.00,
    countInStock: 40,
    rating: 4.7,
    numReviews: 15,
  }
];

const seedProducts = async () => {
  try {
    await connectDB();

    // Get the seller user
    let sellerUser = await prisma.user.findFirst({
      where: { sellerStatus: 'APPROVED' },
    });

    if (!sellerUser) {
      console.log('No approved seller found, using any user');
      sellerUser = await prisma.user.findFirst();
    }

    if (!sellerUser) {
      console.log('No user found to attach products to.');
      process.exit(1);
    }

    let addedCount = 0;
    for (const p of newProducts) {
      await prisma.product.create({
        data: {
          name: p.name,
          images: [p.image],
          description: p.description,
          brand: p.brand,
          category: p.category,
          subCategory: p.subCategory,
          price: p.price,
          countInStock: p.countInStock,
          rating: p.rating,
          numReviews: p.numReviews,
          userId: sellerUser.id,
          sizes: p.category === 'Fashion' ? ['S', 'M', 'L'] : [],
          colors: ['Standard'],
        },
      });
      addedCount++;
    }

    console.log(`Successfully added ${addedCount} sample products without touching existing data!`);
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedProducts();
