import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';
import { canManageCatalog } from '../utils/userRoles.js';
import { sanitizeString } from '../middleware/validationMiddleware.js';
import { logSecurity } from '../utils/logger.js';

const PAGE_SIZE = 12;

// @desc    Fetch products with search, category filter, sorting and pagination
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || PAGE_SIZE;
  const page = Number(req.query.pageNumber) || 1;

  if (pageSize <= 0 || pageSize > 100) {
    res.status(400);
    throw new Error('Invalid page size');
  }
  if (page <= 0) {
    res.status(400);
    throw new Error('Invalid page number');
  }

  const where = {};

  if (req.query.adminMode === 'true') {
    if (!req.user || !canManageCatalog(req.user)) {
      res.status(403);
      throw new Error('Not authorized to access seller product view');
    }
  }

  if (req.query.keyword) {
    // Sanitize search keyword to prevent injection
    const cleanKeyword = req.query.keyword.trim();
    where.OR = [
      { name: { contains: cleanKeyword, mode: 'insensitive' } },
      { brand: { contains: cleanKeyword, mode: 'insensitive' } },
      { description: { contains: cleanKeyword, mode: 'insensitive' } },
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
      distinct: ['name'],
      take: pageSize,
      skip: pageSize * (page - 1),
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    },
  });

  const count = allProducts.length;
  const startIndex = pageSize * (page - 1);
  const products = allProducts.slice(startIndex, startIndex + pageSize);

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

  const numPrice = Number(price);
  const numStock = Number(countInStock);

  if (isNaN(numPrice) || numPrice < 0) {
    res.status(400);
    throw new Error('Product price cannot be negative');
  }
  if (isNaN(numStock) || numStock < 0) {
    res.status(400);
    throw new Error('Inventory count cannot be negative');
  }

  // Validate images array to ensure only strings (avoid XSS / malformed URLs)
  const cleanImages = (images && Array.isArray(images)) 
    ? images.map(img => typeof img === 'string' ? img.replace(/[<>'"&]/g, '') : '').filter(Boolean)
    : [];

  const createdProduct = await prisma.product.create({
    data: {
      name: name.trim(),
      price: numPrice,
      userId: req.user.id,
      images: cleanImages,
      brand: brand.trim(),
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : null,
      countInStock: numStock,
      numReviews: 0,
      description: description.trim(),
      sizes: sizes || [],
      colors: colors || [],
    },
  });

  logSecurity('PRODUCT_CREATED', { productId: createdProduct.id, userId: req.user.id });

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
    logSecurity('UNAUTHORIZED_PRODUCT_UPDATE_ATTEMPT', { userId: req.user.id, productId: product.id });
    res.status(403);
    throw new Error('Not authorized to manage this product. You can only edit your own products.');
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (price !== undefined) {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      res.status(400);
      throw new Error('Product price cannot be negative');
    }
    updateData.price = numPrice;
  }
  if (countInStock !== undefined) {
    const numStock = Number(countInStock);
    if (isNaN(numStock) || numStock < 0) {
      res.status(400);
      throw new Error('Inventory count cannot be negative');
    }
    updateData.countInStock = numStock;
  }
  if (images !== undefined) {
    updateData.images = Array.isArray(images)
      ? images.map(img => typeof img === 'string' ? img.replace(/[<>'"&]/g, '') : '').filter(Boolean)
      : [];
  }
  if (brand !== undefined) updateData.brand = brand.trim();
  if (category !== undefined) updateData.category = category.trim();
  if (subCategory !== undefined) updateData.subCategory = subCategory ? subCategory.trim() : null;
  if (description !== undefined) updateData.description = description.trim();
  if (sizes !== undefined) updateData.sizes = sizes;
  if (colors !== undefined) updateData.colors = colors;

  const updatedProduct = await prisma.product.update({
    where: { id: req.params.id },
    data: updateData,
  });

  logSecurity('PRODUCT_UPDATED', { productId: updatedProduct.id, userId: req.user.id });

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
    logSecurity('UNAUTHORIZED_PRODUCT_DELETE_ATTEMPT', { userId: req.user.id, productId: product.id });
    res.status(403);
    throw new Error('Not authorized to manage this product. You can only delete your own products.');
  }

  await prisma.product.delete({
    where: { id: req.params.id },
  });

  logSecurity('PRODUCT_DELETED', { productId: product.id, userId: req.user.id });

  res.json({ message: 'Product removed' });
});

// @desc    Create a new review for a product
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment, image } = req.body;

  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
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

  // Sanitize review comment to prevent Stored XSS
  const sanitizedComment = sanitizeString(comment || '');
  const cleanImage = image ? image.replace(/[<>'"&]/g, '') : null;

  await prisma.review.create({
    data: {
      name: req.user.name,
      rating: numRating,
      comment: sanitizedComment,
      image: cleanImage,
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

  logSecurity('REVIEW_ADDED', { productId: req.params.id, userId: req.user.id });

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
    distinct: ['name'],
    take: 5,
  });

  const distinctProducts = [];
  const seenNames = new Set();
  
  for (const product of products) {
    if (!seenNames.has(product.name)) {
      seenNames.add(product.name);
      distinctProducts.push({
        ...product,
        _id: product.id,
        user: product.userId,
      });
      if (distinctProducts.length === 5) break;
    }
  }

  res.json(distinctProducts);
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
