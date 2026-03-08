/**
 * Shared Utility Functions
 * 
 * Common helper functions used across all microservices.
 * These utilities reduce code duplication and enforce consistency.
 */

/**
 * Wraps an async Express route handler to catch errors
 * and pass them to the Express error handler middleware.
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped handler with error catching
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Creates a standardized API success response.
 * 
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {*} data - Response data payload
 * @returns {object} JSON response
 * 
 * @example
 * sendSuccess(res, 200, 'User fetched successfully', user);
 * // Response: { success: true, message: '...', data: {...} }
 */
const sendSuccess = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Creates a standardized API error response.
 * 
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} errors - Optional validation errors or details
 * @returns {object} JSON response
 */
const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

/**
 * Custom AppError class for operational errors.
 * Extends the native Error with HTTP status codes and
 * an operational flag to distinguish from programming errors.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validates that all required fields are present in the request body.
 * 
 * @param {object} body - Express request body
 * @param {string[]} fields - Array of required field names
 * @returns {{ isValid: boolean, missing: string[] }}
 */
const validateRequiredFields = (body, fields) => {
  const missing = fields.filter(field => !body[field] && body[field] !== 0);
  return {
    isValid: missing.length === 0,
    missing
  };
};

module.exports = {
  asyncHandler,
  sendSuccess,
  sendError,
  AppError,
  validateRequiredFields
};
