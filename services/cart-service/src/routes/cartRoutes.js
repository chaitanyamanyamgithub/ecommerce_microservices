/**
 * Cart Service - Route Definitions
 * 
 * Routes:
 *   POST   /cart/add       - Add item to cart
 *   GET    /cart/:userId   - Get user's cart
 *   DELETE /cart/remove    - Remove item from cart
 *   DELETE /cart/clear/:userId - Clear cart          (Internal — called by order-service)
 */

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { validateCartItem } = require('../middleware/validation');

// The storefront uses a fixed demo shopper and does not perform a login flow,
// so the public cart endpoints stay open for the demo purchase journey.
router.post('/cart/add', validateCartItem, cartController.addToCart);
router.get('/cart/:userId', cartController.getCart);
router.delete('/cart/remove', cartController.removeFromCart);
// Internal endpoint — called by order-service during checkout (no auth needed)
router.delete('/cart/clear/:userId', cartController.clearCart);

module.exports = router;
