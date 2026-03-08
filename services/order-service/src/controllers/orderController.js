/**
 * Order Controller
 * 
 * HTTP request/response handlers for order endpoints.
 */

const orderService = require('../services/orderService');
const { sendSuccess, sendError, validateRequiredFields } = require('@shared/utils');

/**
 * POST /orders
 * Place a new order.
 */
const createOrder = async (req, res, next) => {
  try {
    const { isValid, missing } = validateRequiredFields(req.body, [
      'userId', 'items', 'shippingAddress'
    ]);
    if (!isValid) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Validate items array is not empty
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return sendError(res, 400, 'Order must contain at least one item');
    }

    const order = await orderService.createOrder(req.body);
    return sendSuccess(res, 201, 'Order created successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /orders/:userId
 * Get all orders for a user.
 */
const getOrdersByUserId = async (req, res, next) => {
  try {
    const result = await orderService.getOrdersByUserId(req.params.userId);
    return sendSuccess(res, 200, 'Orders fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrdersByUserId
};
