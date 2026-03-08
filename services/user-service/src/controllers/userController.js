/**
 * User Controller
 * 
 * Handles HTTP request/response logic for user endpoints.
 * Delegates business logic to the service layer and uses
 * shared utilities for standardized responses.
 */

const userService = require('../services/userService');
const { sendSuccess, sendError, validateRequiredFields } = require('@shared/utils');

/**
 * POST /signup
 * Register a new user account.
 */
const signup = async (req, res, next) => {
  try {
    // Validate required fields
    const { isValid, missing } = validateRequiredFields(req.body, ['name', 'email', 'password']);
    if (!isValid) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    const { user, token } = await userService.registerUser(req.body);
    return sendSuccess(res, 201, 'User registered successfully', { user, token });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /login
 * Authenticate a user and return a JWT token.
 */
const login = async (req, res, next) => {
  try {
    const { isValid, missing } = validateRequiredFields(req.body, ['email', 'password']);
    if (!isValid) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    const { email, password } = req.body;
    const { user, token } = await userService.loginUser(email, password);
    return sendSuccess(res, 200, 'Login successful', { user, token });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /users/:id
 * Retrieve a user's profile by their ID.
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, 200, 'User fetched successfully', user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getUserById
};
