/**
 * Cart Service - Validation Middleware
 */

const { sendError } = require('@shared/utils');

const validateCartItem = (req, res, next) => {
  const { quantity, price } = req.body;

  if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity))) {
    return sendError(res, 400, 'Quantity must be a positive integer');
  }

  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    return sendError(res, 400, 'Price must be a non-negative number');
  }

  next();
};

module.exports = { validateCartItem };
