/**
 * Order Service - Configuration
 */

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3004,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_orders',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret'
  },
  services: {
    productService: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    cartService: process.env.CART_SERVICE_URL || 'http://localhost:3003',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005'
  }
};

module.exports = config;
