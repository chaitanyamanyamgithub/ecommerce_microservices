/**
 * Product Service Layer
 * 
 * Business logic for product CRUD operations.
 * Supports pagination, filtering by category, and text search.
 */

const Product = require('../models/Product');
const { AppError } = require('@shared/utils');
const { createServiceLogger } = require('@shared/logger');
const { metrics } = require('@opentelemetry/api');
const { cacheGet, cacheSet, cacheDelPattern } = require('@shared/cache');

const logger = createServiceLogger('product-service');
const meter = metrics.getMeter('product-service');
const catalogRequestsCounter = meter.createCounter('catalog_requests', {
  description: 'Catalog and product detail requests handled by the product service.'
});
const stockOperationsCounter = meter.createCounter('stock_operations', {
  description: 'Inventory checks and stock decrements performed during checkout.'
});

/**
 * Get all products with optional filtering and pagination.
 * 
 * @param {object} query - Query parameters
 * @param {string} query.category - Filter by category
 * @param {string} query.search - Text search in name/description
 * @param {number} query.page - Page number (default: 1)
 * @param {number} query.limit - Items per page (default: 10)
 * @param {string} query.sort - Sort field (default: '-createdAt')
 * @returns {Promise<{ products: Array, pagination: object }>}
 * 
 * Example response:
 * {
 *   "products": [...],
 *   "pagination": { "total": 50, "page": 1, "pages": 5, "limit": 10 }
 * }
 */
const getAllProducts = async (query) => {
  const {
    category,
    search,
    page = 1,
    limit = 10,
    sort = '-createdAt',
    minPrice,
    maxPrice
  } = query;

  // Build cache key from query params
  const cacheKey = `products:list:${category || ''}:${search || ''}:${page}:${limit}:${sort}:${minPrice || ''}:${maxPrice || ''}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    catalogRequestsCounter.add(1, { route: 'list', cache: 'hit' });
    logger.info(`Catalog cache HIT for key ${cacheKey}`);
    return cached;
  }

  // Build filter object
  const filter = { isActive: true };

  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter)
  ]);

  const result = {
    products,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit)
    }
  };

  // Cache for 60 seconds
  await cacheSet(cacheKey, result, 60);
  catalogRequestsCounter.add(1, { route: 'list', cache: 'miss' });
  logger.info(`Catalog cache MISS — cached ${products.length} products for 60s`);

  return result;
};

/**
 * Get a single product by ID.
 * 
 * @param {string} productId - MongoDB ObjectId
 * @returns {Promise<object>} Product document
 * @throws {AppError} 404 if product not found
 */
const getProductById = async (productId) => {
  const cacheKey = `products:detail:${productId}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    catalogRequestsCounter.add(1, { route: 'detail', cache: 'hit' });
    return cached;
  }

  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw new AppError('Product not found', 404);
  }

  // Cache for 120 seconds
  await cacheSet(cacheKey, product, 120);
  catalogRequestsCounter.add(1, { route: 'detail', cache: 'miss' });

  return product;
};

/**
 * Create a new product.
 * 
 * @param {object} productData - Product fields
 * @returns {Promise<object>} Created product document
 * 
 * Example request body:
 * {
 *   "name": "Wireless Bluetooth Headphones",
 *   "description": "Premium noise-cancelling headphones with 30hr battery",
 *   "price": 79.99,
 *   "category": "electronics",
 *   "brand": "AudioMax",
 *   "stock": 150,
 *   "images": [{ "url": "https://example.com/headphones.jpg", "alt": "Headphones" }],
 *   "tags": ["wireless", "bluetooth", "noise-cancelling"]
 * }
 */
const createProduct = async (productData) => {
  const product = await Product.create(productData);
  logger.info(`Created product ${product.name} with SKU ${product.sku || 'n/a'}`);

  // Invalidate catalog list cache
  await cacheDelPattern('products:list:*');

  return product;
};

/**
 * Delete (soft-delete) a product by ID.
 * Sets isActive to false rather than removing the document.
 * 
 * @param {string} productId - MongoDB ObjectId
 * @returns {Promise<object>} Updated product document
 * @throws {AppError} 404 if product not found
 */
const deleteProduct = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  product.isActive = false;
  await product.save();

  // Invalidate caches
  await cacheDelPattern('products:list:*');
  await cacheDelPattern(`products:detail:${productId}`);

  return product;
};

/**
 * Check if all requested items have sufficient stock.
 * Uses a single query to fetch all products at once instead of N sequential queries.
 *
 * @param {Array<{ productId: string, quantity: number }>} items
 * @returns {Promise<{ available: boolean, insufficientItems: Array }>}
 */
const checkStock = async (items) => {
  const productIds = items.map((item) => item.productId);

  // Fetch all needed products in one query
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true
  });

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const insufficientItems = [];

  for (const item of items) {
    const product = productMap.get(item.productId.toString());

    if (!product) {
      insufficientItems.push({
        productId: item.productId,
        requested: item.quantity,
        available: 0,
        reason: 'Product not found'
      });
    } else if (product.stock < item.quantity) {
      insufficientItems.push({
        productId: item.productId,
        productName: product.name,
        requested: item.quantity,
        available: product.stock,
        reason: 'Insufficient stock'
      });
    }
  }

  stockOperationsCounter.add(1, {
    operation: 'check',
    result: insufficientItems.length === 0 ? 'available' : 'insufficient'
  });

  return {
    available: insufficientItems.length === 0,
    insufficientItems
  };
};

/**
 * Atomically decrement stock for a list of purchased items.
 *
 * Uses MongoDB findOneAndUpdate with:
 *   - $inc: { stock: -quantity }        → atomic decrement
 *   - stock: { $gte: quantity }         → stock guard (prevents going negative)
 *
 * This prevents the race condition where two concurrent orders both read
 * stock=1 and both succeed, resulting in stock=-1 (overselling).
 *
 * @param {Array<{ productId: string, quantity: number }>} items
 * @returns {Promise<{ success: boolean, failedItems: Array }>}
 */
const decrementStock = async (items) => {
  const failedItems = [];

  for (const item of items) {
    const result = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        isActive: true,
        stock: { $gte: item.quantity } // Stock guard — only decrement if enough stock
      },
      {
        $inc: { stock: -item.quantity } // Atomic decrement
      },
      { new: true }
    );

    if (!result) {
      failedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        reason: 'Insufficient stock or product not found'
      });
      logger.warn(`Atomic stock decrement failed for product ${item.productId}`);
    }
  }

  stockOperationsCounter.add(1, { operation: 'decrement' });
  logger.info(
    `Decremented stock for ${items.length - failedItems.length}/${items.length} line items`
  );

  return { success: failedItems.length === 0, failedItems };
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  deleteProduct,
  checkStock,
  decrementStock
};
