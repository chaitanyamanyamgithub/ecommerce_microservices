/**
 * Product Service - Configuration
 */

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_products',
  logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = config;
