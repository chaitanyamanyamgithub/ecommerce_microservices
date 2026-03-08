/**
 * Shared Error Handling Middleware
 * 
 * Centralized error handler used across all microservices.
 * Catches operational and programming errors, logs them,
 * and returns a standardized error response.
 */

const { sendError } = require('../utils');

/**
 * Global error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 * 
 * Handles:
 * - Mongoose validation errors (400)
 * - Mongoose duplicate key errors (409)
 * - Mongoose cast errors (400)
 * - JWT errors (401)
 * - Custom AppError instances
 * - Unknown/unhandled errors (500)
 * 
 * @param {Error} err - The error object
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    return sendError(res, statusCode, 'Validation Error', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT authentication errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // Log error in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  return sendError(res, statusCode, message);
};

/**
 * 404 Not Found handler.
 * Catches requests to undefined routes.
 */
const notFoundHandler = (req, res) => {
  return sendError(res, 404, `Route ${req.originalUrl} not found`);
};

module.exports = { errorHandler, notFoundHandler };
