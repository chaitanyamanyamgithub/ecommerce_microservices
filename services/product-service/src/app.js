require('./telemetry');
require('module-alias/register');

/**
 * Product Service - Application Entry Point
 * 
 * Express server for the product catalog microservice.
 * Runs on port 3002 by default.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { connectDB } = require('./config/db');
const { createServiceLogger } = require('@shared/logger');
const { errorHandler, notFoundHandler, requestLogger } = require('@shared/middleware');
const productRoutes = require('./routes/productRoutes');

const logger = createServiceLogger('product-service');
const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger(logger));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'product-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api', productRoutes);

// ── Error Handling ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB(logger);
    app.listen(config.port, () => {
      logger.info(`Product Service running on port ${config.port} [${config.nodeEnv}]`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error(`Failed to start Product Service: ${error.message}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

startServer();

module.exports = app;
