/**
 * User Service - Route Definitions
 * 
 * Defines all HTTP routes for the user-service.
 * Maps endpoints to their respective controller handlers.
 * 
 * Routes:
 *   POST /signup    - Register a new user
 *   POST /login     - Authenticate and get JWT token
 *   GET  /users/:id - Get user profile by ID (authenticated)
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/signup', userController.signup);
router.post('/login', userController.login);

// Protected routes (requires valid JWT)
router.get('/users/:id', authenticate, userController.getUserById);

module.exports = router;
