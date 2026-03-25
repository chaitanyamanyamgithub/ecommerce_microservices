/**
 * Shared Rate Limiter Middleware
 *
 * Provides application-level rate limiting using express-rate-limit.
 * Acts as a secondary defense layer behind the Nginx rate limiter.
 *
 * Usage:
 *   const { apiLimiter, authLimiter } = require('@shared/middleware/rateLimiter');
 *   app.use('/api/', apiLimiter);
 *   app.post('/api/login', authLimiter, controller.login);
 */

const rateLimit = require('express-rate-limit');

/**
 * Standard API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

/**
 * Stricter rate limiter for authentication routes (login, register).
 * 10 requests per hour per IP.
 * Prevents credential stuffing and brute force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per `window` (here, per hour)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after an hour'
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
