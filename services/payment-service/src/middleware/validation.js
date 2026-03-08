/**
 * Payment Service - Validation Middleware
 */

const { sendError } = require('@shared/utils');

/**
 * Validates payment amount and method.
 */
const validatePaymentData = (req, res, next) => {
  const { amount, method } = req.body;

  if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
    return sendError(res, 400, 'Amount must be a positive number');
  }

  const validMethods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'upi', 'crypto'];
  if (method && !validMethods.includes(method)) {
    return sendError(res, 400, `Invalid payment method. Allowed: ${validMethods.join(', ')}`);
  }

  next();
};

module.exports = { validatePaymentData };
