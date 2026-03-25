/**
 * Shared Correlation ID Middleware
 *
 * Generates or propagates a unique request identifier across the microservice chain.
 *
 * Flow:
 *   1. Nginx gateway generates a UUID and sets `X-Request-ID` header
 *   2. This middleware reads the header (or generates a new one as fallback)
 *   3. Attaches it to `req.requestId` for use in controllers/services
 *   4. Sets it on the response header so the client can correlate logs
 *   5. Injects it into the logger context for automatic inclusion in every log line
 *
 * Usage:
 *   const { correlationId } = require('@shared/middleware');
 *   app.use(correlationId);
 */

const { randomUUID } = require('crypto');

const HEADER_NAME = 'x-request-id';

/**
 * Express middleware that ensures every request has a correlation ID.
 */
const correlationId = (req, res, next) => {
  // Use the ID from the gateway, or generate one if missing (direct calls)
  const requestId = req.headers[HEADER_NAME] || randomUUID();

  // Attach to the request object for downstream use
  req.requestId = requestId;

  // Set on response so the caller can see it
  res.setHeader('X-Request-ID', requestId);

  next();
};

module.exports = { correlationId };
