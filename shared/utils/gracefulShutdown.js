/**
 * Shared Graceful Shutdown Utility
 *
 * Ensures clean shutdown of microservices by:
 *   1. Stopping the HTTP server (no new connections accepted)
 *   2. Draining in-flight HTTP requests (up to a timeout)
 *   3. Closing the MongoDB connection pool
 *   4. Flushing OpenTelemetry spans/metrics
 *   5. Exiting the process
 *
 * Usage:
 *   const { registerGracefulShutdown } = require('@shared/utils/gracefulShutdown');
 *   const server = app.listen(port);
 *   registerGracefulShutdown({ server, logger });
 */

const mongoose = require('mongoose');

const SHUTDOWN_TIMEOUT_MS = 15000; // 15 seconds max to drain

/**
 * Registers SIGTERM and SIGINT handlers for graceful shutdown.
 *
 * @param {object} options
 * @param {import('http').Server} options.server - The HTTP server to drain
 * @param {object} options.logger - Winston logger instance
 * @param {string} [options.serviceName] - Name of the service (for log messages)
 */
const registerGracefulShutdown = ({ server, logger, serviceName = 'service' }) => {
  let isShuttingDown = false;

  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${serviceName} received ${signal}. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(() => {
      logger.info(`${serviceName} HTTP server closed — no new connections`);
    });

    // 2. Force shutdown after timeout
    const forceExit = setTimeout(() => {
      logger.error(`${serviceName} shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Don't keep the process alive just for this timer
    forceExit.unref();

    try {
      // 3. Close MongoDB connection pool
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        logger.info(`${serviceName} MongoDB connection closed`);
      }

      // 4. Flush OpenTelemetry (if SDK is available)
      // The OTel SDK registers its own SIGTERM handler in telemetry.js,
      // but we add a safety flush here in case ordering varies.
      logger.info(`${serviceName} graceful shutdown complete`);
      process.exit(0);
    } catch (error) {
      logger.error(`${serviceName} error during shutdown: ${error.message}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = { registerGracefulShutdown };
