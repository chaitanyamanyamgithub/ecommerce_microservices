/**
 * Shared Middleware Index
 * 
 * Re-exports all shared middleware modules for convenient importing.
 */

const { errorHandler, notFoundHandler } = require('./errorHandler');
const { requestLogger } = require('./requestLogger');
const { authenticate, authorize, optionalAuth } = require('./auth');
const { correlationId } = require('./correlationId');
const { apiLimiter, authLimiter } = require('./rateLimiter');

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
  authenticate,
  authorize,
  optionalAuth,
  correlationId,
  apiLimiter,
  authLimiter
};
