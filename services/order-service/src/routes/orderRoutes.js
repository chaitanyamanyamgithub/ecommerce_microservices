/**
 * Order Service - Route Definitions
 * 
 * Routes:
 *   POST /orders          - Place a new order
 *   GET  /orders/:userId  - Get all orders for a user
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateOrderData } = require('../middleware/validation');

router.post('/orders', validateOrderData, orderController.createOrder);
router.get('/orders/:userId', orderController.getOrdersByUserId);

module.exports = router;
