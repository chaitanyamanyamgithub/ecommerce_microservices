/**
 * Payment Controller
 * 
 * HTTP request/response handlers for payment endpoints.
 */

const paymentService = require('../services/paymentService');
const { sendSuccess, sendError, validateRequiredFields } = require('@shared/utils');

/**
 * POST /payment
 * Process a payment for an order.
 */
const processPayment = async (req, res, next) => {
  try {
    const { isValid, missing } = validateRequiredFields(req.body, [
      'orderId', 'userId', 'amount', 'method'
    ]);
    if (!isValid) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Attach request metadata for fraud analysis
    req.body.ipAddress = req.ip;
    req.body.userAgent = req.headers['user-agent'];

    const payment = await paymentService.processPayment(req.body);

    // Determine response based on payment outcome
    if (payment.status === 'completed') {
      return sendSuccess(res, 200, 'Payment processed successfully', payment);
    } else {
      return sendError(res, 402, 'Payment failed', {
        status: payment.status,
        reason: payment.failureReason
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /payment/status/:orderId
 * Get payment status for an order.
 */
const getPaymentStatus = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentStatus(req.params.orderId);
    return sendSuccess(res, 200, 'Payment status fetched', payment);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processPayment,
  getPaymentStatus
};
