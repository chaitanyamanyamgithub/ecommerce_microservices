/**
 * Cart Controller
 * 
 * HTTP request/response handlers for cart endpoints.
 */

const cartService = require('../services/cartService');
const { sendSuccess, sendError, validateRequiredFields } = require('@shared/utils');

/**
 * POST /cart/add
 * Add an item to the user's cart.
 */
const addToCart = async (req, res, next) => {
  try {
    const { isValid, missing } = validateRequiredFields(req.body, [
      'userId', 'productId', 'productName', 'price'
    ]);
    if (!isValid) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    const cart = await cartService.addToCart(req.body);
    return sendSuccess(res, 200, 'Item added to cart', cart);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /cart/:userId
 * Get the cart for a specific user.
 */
const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCartByUserId(req.params.userId);
    return sendSuccess(res, 200, 'Cart fetched successfully', cart);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /cart/remove
 * Remove a specific item from the user's cart.
 */
const removeFromCart = async (req, res, next) => {
  try {
    const { isValid, missing } = validateRequiredFields(req.body, ['userId', 'productId']);
    if (!isValid) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    const { userId, productId } = req.body;
    const cart = await cartService.removeFromCart(userId, productId);
    return sendSuccess(res, 200, 'Item removed from cart', cart);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /cart/clear/:userId
 * Clear all items from a user's cart.
 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.params.userId);
    return sendSuccess(res, 200, 'Cart cleared successfully', cart);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  clearCart
};
