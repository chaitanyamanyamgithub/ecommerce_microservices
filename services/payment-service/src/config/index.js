/**
 * Payment Service - Configuration
 */

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3005,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_payments',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret'
  },
  paymentGateway: {
    key: process.env.PAYMENT_GATEWAY_KEY || '',
    secret: process.env.PAYMENT_GATEWAY_SECRET || ''
  }
};

module.exports = config;
