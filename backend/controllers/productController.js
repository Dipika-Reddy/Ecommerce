import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';
import { canManageCatalog } from '../utils/userRoles.js';

const PAGE_SIZE = 12;

// @desc    Fetch products with search, category filter, sorting and pagination
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || PAGE_SIZE;
  const page = Number(req.query.pageNumber) || 1;

  const where = {};

  // If in admin Mode, require catalog management access
  if (req.query.adminMode === 'true') {
    if (!req.user || !canManageCatalog(req.user)) {
      res.status(403);
      throw new Error('Not authorized to access seller product view');
    }
  }

  if (req.query.keyword) {
    where.OR = [
      { name: { contains: req.query.keyword, mode: 'insensitive' } },
      { brand: { contains: req.query.keyword, mode: 'insensitive' } },
      { description: { contains: req.query.keyword, mode: 'insensitive' } },
    ];
  }

  if (req.query.category && req.query.category !== 'All') {
    where.category = req.query.category;
  }

  if (req.query.subCategory && req.query.subCategory !== 'All') {
    where.subCategory = req.query.subCategory;
  }

  let orderBy = { createdAt: 'desc' }; // default: newest first
  switch (req.query.sortBy) {
    case 'price_asc':
      orderBy = { price: 'asc' };
      break;
    case 'price_desc':
      orderBy = { price: 'desc' };
      break;
    case 'rating_desc':
      orderBy = { rating: 'desc' };
      break;
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' };
  }

  const [count, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: pageSize * (page - 1),
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  // Map database ids to _id format for frontend compatibility
  const formattedProducts = products.map((product) => ({
    ...product,
    _id: product.id,
    user: product.userId,
    sellerName: product.user?.name || 'N/A',
  }));

  res.json({
    products: formattedProducts,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc    Fetch a list of distinct categories (or subcategories if category is specified)
// @route   GET /api/products/categories
// @access  Public
const getProductCategories = asyncHandler(async (req, res) => {
  const { category } = req.query;
  if (category && category !== 'All') {
    const subCategories = await prisma.product.findMany({
      where: { category },
      distinct: ['subCategory'],
      select: {
        subCategory: true,
      },
    });
    res.json(subCategories.map((s) => s.subCategory).filter(Boolean));
  } else {
    const categories = await prisma.product.findMany({
      distinct: ['category'],
      select: {
        category: true,
      },
    });
    res.json(categories.map((c) => c.category));
  }
});

// @desc    Fetch a single product by id
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      reviews: true,
    },
  });

  if (product) {
    res.json({
      ...product,
      _id: product.id,
      user: product.userId,
      reviews: product.reviews.map((rev) => ({
        ...rev,
        _id: rev.id,
        user: rev.userId,
      })),
    });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a new product (admin)
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const { name, price, images, brand, category, subCategory, countInStock, description, sizes, colors } =
    req.body;

  if (!name || !brand || !category || !description) {
    res.status(400);
    throw new Error('Please fill in all required product fields');
  }

  const createdProduct = await prisma.product.create({
    data: {
      name,
      price: price ? Number(price) : 0,
      userId: req.user.id,
      images: images && images.length ? images : [],
      brand,
      category,
      subCategory: subCategory || null,
      countInStock: countInStock ? Number(countInStock) : 0,
      numReviews: 0,
      description,
      sizes: sizes || [],
      colors: colors || [],
    },
  });

  res.status(201).json({
    ...createdProduct,
    _id: createdProduct.id,
    user: createdProduct.userId,
  });
});

// @desc    Update an existing product (admin)
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, images, brand, category, subCategory, countInStock, description, sizes, colors } =
    req.body;

  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check ownership or admin/superadmin role
  if (!req.user.isAdmin && !req.user.isSuperAdmin && product.userId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to manage this product. You can only edit your own products.');
  }

  const updatedProduct = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      name: name ?? product.name,
      price: price !== undefined ? Number(price) : product.price,
      images: images && images.length ? images : product.images,
      brand: brand ?? product.brand,
      category: category ?? product.category,
      subCategory: subCategory !== undefined ? subCategory : product.subCategory,
      countInStock: countInStock !== undefined ? Number(countInStock) : product.countInStock,
      description: description ?? product.description,
      sizes: sizes ?? product.sizes,
      colors: colors ?? product.colors,
    },
  });

  res.json({
    ...updatedProduct,
    _id: updatedProduct.id,
    user: updatedProduct.userId,
  });
});

// @desc    Delete a product (admin)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check ownership or admin/superadmin role
  if (!req.user.isAdmin && !req.user.isSuperAdmin && product.userId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to manage this product. You can only delete your own products.');
  }

  await prisma.product.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Product removed' });
});

// @desc    Create a new review for a product
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const alreadyReviewed = await prisma.review.findFirst({
    where: {
      productId: req.params.id,
      userId: req.user.id,
    },
  });

  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  await prisma.review.create({
    data: {
      name: req.user.name,
      rating: Number(rating),
      comment,
      userId: req.user.id,
      productId: req.params.id,
    },
  });

  // Aggregate and update parent product rating & review count
  const productReviews = await prisma.review.findMany({
    where: { productId: req.params.id },
  });

  const numReviews = productReviews.length;
  const averageRating =
    productReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

  await prisma.product.update({
    where: { id: req.params.id },
    data: {
      numReviews,
      rating: averageRating,
    },
  });

  res.status(201).json({ message: 'Review added' });
});

// @desc    Get top rated products (for homepage carousel)
// @route   GET /api/products/top
// @access  Public
const getTopProducts = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    orderBy: {
      rating: 'desc',
    },
    take: 5,
  });

  const formattedProducts = products.map((product) => ({
    ...product,
    _id: product.id,
    user: product.userId,
  }));

  res.json(formattedProducts);
});

export {
  getProducts,
  getProductCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
};
