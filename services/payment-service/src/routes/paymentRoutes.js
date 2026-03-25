/**
 * Payment Service - Route Definitions
 * 
 * Routes:
 *   POST /payment                 - Process a payment
 *   GET  /payment/status/:orderId - Get payment status
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validatePaymentData } = require('../middleware/validation');

router.post('/payment', validatePaymentData, paymentController.processPayment);
router.get('/payment/status/:orderId', paymentController.getPaymentStatus);

module.exports = router;
