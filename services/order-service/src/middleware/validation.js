/**
 * Order Service - Validation Middleware
 */

const { sendError } = require('@shared/utils');

/**
 * Validates that the shipping address contains all required fields.
 */
const validateOrderData = (req, res, next) => {
  const { shippingAddress } = req.body;

  if (shippingAddress) {
    const requiredAddressFields = ['street', 'city', 'state', 'zipCode', 'country'];
    const missingFields = requiredAddressFields.filter(field => !shippingAddress[field]);

    if (missingFields.length > 0) {
      return sendError(
        res,
        400,
        `Missing address fields: ${missingFields.join(', ')}`
      );
    }
  }

  next();
};

module.exports = { validateOrderData };
