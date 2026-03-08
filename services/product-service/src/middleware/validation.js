/**
 * Product Service - Validation Middleware
 * 
 * Request validation specific to product operations.
 */

const { sendError } = require('@shared/utils');

/**
 * Validates product price is a positive number.
 */
const validateProductData = (req, res, next) => {
  const { price, stock } = req.body;

  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    return sendError(res, 400, 'Price must be a non-negative number');
  }

  if (stock !== undefined && (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock))) {
    return sendError(res, 400, 'Stock must be a non-negative integer');
  }

  next();
};

module.exports = { validateProductData };
