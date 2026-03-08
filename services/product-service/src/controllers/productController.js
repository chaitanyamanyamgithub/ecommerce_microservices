/**
 * Product Controller
 * 
 * HTTP request/response handling for product endpoints.
 */

const productService = require('../services/productService');
const { sendSuccess, sendError, validateRequiredFields } = require('@shared/utils');

/**
 * GET /products
 * Retrieve all products with optional filters and pagination.
 * 
 * Query params: category, search, page, limit, sort, minPrice, maxPrice
 */
const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    return sendSuccess(res, 200, 'Products fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /products/:id
 * Retrieve a single product by its ID.
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return sendSuccess(res, 200, 'Product fetched successfully', product);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /products
 * Create a new product listing.
 */
const createProduct = async (req, res, next) => {
  try {
    const { isValid, missing } = validateRequiredFields(req.body, [
      'name', 'description', 'price', 'category'
    ]);
    if (!isValid) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    const product = await productService.createProduct(req.body);
    return sendSuccess(res, 201, 'Product created successfully', product);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /products/:id
 * Soft-delete a product by setting isActive to false.
 */
const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    return sendSuccess(res, 200, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /products/check-stock
 * Check stock availability for a list of items.
 */
const checkStock = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Items array is required');
    }
    const result = await productService.checkStock(items);
    return sendSuccess(res, 200, 'Stock check completed', result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /products/decrement-stock
 * Decrement stock after a successful order.
 */
const decrementStock = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Items array is required');
    }
    await productService.decrementStock(items);
    return sendSuccess(res, 200, 'Stock decremented successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  deleteProduct,
  checkStock,
  decrementStock
};
