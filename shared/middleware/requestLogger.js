/**
 * Shared Request Logging Middleware
 * 
 * Logs incoming HTTP requests with method, URL, status code,
 * and response time. Uses Morgan for HTTP request logging
 * integrated with the shared Winston logger.
 */

const morgan = require('morgan');

/**
 * Creates a Morgan HTTP request logger middleware
 * that pipes output through the provided Winston logger.
 * 
 * @param {import('winston').Logger} logger - Winston logger instance
 * @returns {Function} Morgan middleware configured with Winston stream
 * 
 * @example
 * const logger = createServiceLogger('user-service');
 * app.use(requestLogger(logger));
 */
const requestLogger = (logger) => {
  // Create a writable stream that forwards to Winston
  const stream = {
    write: (message) => {
      logger.http(message.trim());
    }
  };

  return morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    { stream }
  );
};

module.exports = { requestLogger };
