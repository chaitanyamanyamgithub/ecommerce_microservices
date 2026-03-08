/**
 * User Service Layer
 * 
 * Contains the business logic for user operations.
 * Separates concerns from the controller (HTTP) and model (data) layers.
 * This layer is framework-agnostic and can be tested independently.
 */

const User = require('../models/User');
const { AppError } = require('@shared/utils');

/**
 * Register a new user.
 * 
 * @param {object} userData - { name, email, password, phone, address }
 * @returns {Promise<{ user: object, token: string }>}
 * @throws {AppError} 409 if email already exists
 * 
 * Example request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "securePassword123",
 *   "phone": "+1234567890",
 *   "address": {
 *     "street": "123 Main St",
 *     "city": "New York",
 *     "state": "NY",
 *     "zipCode": "10001",
 *     "country": "US"
 *   }
 * }
 * 
 * Example response:
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "data": {
 *     "user": { "_id": "...", "name": "John Doe", "email": "john@example.com", ... },
 *     "token": "eyJhbGciOiJIUzI1NiIs..."
 *   }
 * }
 */
const registerUser = async (userData) => {
  const { email } = userData;

  // Check for existing user with same email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create new user (password is hashed in pre-save hook)
  const user = await User.create(userData);

  // Generate JWT token
  const token = user.generateAuthToken();

  return { user, token };
};

/**
 * Authenticate a user with email and password.
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's plain text password
 * @returns {Promise<{ user: object, token: string }>}
 * @throws {AppError} 401 if credentials are invalid
 * 
 * Example request body:
 * {
 *   "email": "john@example.com",
 *   "password": "securePassword123"
 * }
 * 
 * Example response:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "user": { "_id": "...", "name": "John Doe", ... },
 *     "token": "eyJhbGciOiJIUzI1NiIs..."
 *   }
 * }
 */
const loginUser = async (email, password) => {
  // Find user and explicitly include the password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated. Contact support.', 403);
  }

  // Compare provided password with stored hash
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = user.generateAuthToken();

  return { user, token };
};

/**
 * Retrieve a user by their ID.
 * 
 * @param {string} userId - MongoDB ObjectId string
 * @returns {Promise<object>} User document
 * @throws {AppError} 404 if user not found
 * 
 * Example response:
 * {
 *   "success": true,
 *   "message": "User fetched successfully",
 *   "data": {
 *     "_id": "64a1b2c3d4e5f6789012abcd",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "customer",
 *     "createdAt": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

module.exports = {
  registerUser,
  loginUser,
  getUserById
};
