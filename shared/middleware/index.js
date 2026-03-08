/**
 * Shared Middleware Index
 * 
 * Re-exports all shared middleware modules for convenient importing.
 */

const { errorHandler, notFoundHandler } = require('./errorHandler');
const { requestLogger } = require('./requestLogger');

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger
};
