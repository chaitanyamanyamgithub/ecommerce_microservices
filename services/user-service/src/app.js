require('./telemetry');
require('./bootstrapAliases');

/**
 * User Service - Application Entry Point
 * 
 * Bootstraps the Express server for the user-service:
 * 1. Loads environment variables
 * 2. Connects to MongoDB
 * 3. Configures middleware (CORS, Helmet, JSON parsing, logging)
 * 4. Mounts routes
 * 5. Registers error handlers
 * 6. Starts listening on the configured port
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { connectDB } = require('./config/db');
const { createServiceLogger } = require('@shared/logger');
const { errorHandler, notFoundHandler, requestLogger, correlationId } = require('@shared/middleware');
const { createHttpMetricsMiddleware, registerRuntimeMetrics } = require('@shared/observability');
const { registerGracefulShutdown } = require('@shared/utils/gracefulShutdown');
const userRoutes = require('./routes/userRoutes');

// Initialize logger for this service
const logger = createServiceLogger('user-service');

// Create Express application
const app = express();

registerRuntimeMetrics('user-service');

// ── Security Middleware ──────────────────────────────────────
app.use(helmet());                    // Set security-related HTTP headers
app.use(cors());                      // Enable Cross-Origin Resource Sharing

// ── Body Parsing Middleware ──────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(correlationId);
app.use(createHttpMetricsMiddleware('user-service'));

// ── Request Logging ──────────────────────────────────────────
app.use(requestLogger(logger));

// ── Health Check Endpoint ────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'user-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api', userRoutes);

// ── Error Handling ───────────────────────────────────────────
app.use(notFoundHandler);             // 404 handler for undefined routes
app.use(errorHandler);                // Global error handler (must be last)

// ── Start Server ─────────────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB(logger);

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`User Service running on port ${config.port} [${config.nodeEnv}]`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });

    // Register graceful shutdown handlers
    registerGracefulShutdown({ server, logger, serviceName: 'user-service' });
  } catch (error) {
    logger.error(`Failed to start User Service: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

startServer();

module.exports = app;
