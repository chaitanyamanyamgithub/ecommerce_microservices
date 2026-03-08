/**
 * Cart Service - Route Definitions
 * 
 * Routes:
 *   POST   /cart/add       - Add item to cart
 *   GET    /cart/:userId   - Get user's cart
 *   DELETE /cart/remove    - Remove item from cart
 */

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { validateCartItem } = require('../middleware/validation');

router.post('/cart/add', validateCartItem, cartController.addToCart);
router.get('/cart/:userId', cartController.getCart);
router.delete('/cart/remove', cartController.removeFromCart);
router.delete('/cart/clear/:userId', cartController.clearCart);

module.exports = router;
