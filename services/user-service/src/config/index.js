/**
 * User Service - Configuration Index
 * 
 * Centralizes all configuration values, reading from
 * environment variables with sensible defaults.
 */

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_users',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = config;
