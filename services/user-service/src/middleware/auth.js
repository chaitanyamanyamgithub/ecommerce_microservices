/**
 * User Service - Authentication Middleware
 * 
 * Verifies JWT tokens from the Authorization header.
 * Attaches the decoded user payload to req.user for
 * downstream route handlers to use.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { sendError } = require('@shared/utils');

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 * 
 * Expected header format: Authorization: Bearer <token>
 * 
 * On success, attaches decoded token payload to req.user:
 * { id: '...', email: '...', role: '...' }
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user info to request for downstream use
    req.user = decoded;
    next();
  } catch (error) {
    next(error); // Will be caught by JWT error handlers in errorHandler
  }
};

/**
 * Middleware factory to restrict access to specific roles.
 * 
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'vendor')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, 'You do not have permission to perform this action');
    }
    next();
  };
};

module.exports = { authenticate, authorize };
