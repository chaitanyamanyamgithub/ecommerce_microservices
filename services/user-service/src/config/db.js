/**
 * User Service - Database Configuration
 * 
 * Establishes and manages the MongoDB connection for the user-service.
 * Uses Mongoose ODM with connection retry logic and event listeners.
 */

const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the connection string from environment variables.
 * Implements retry logic with exponential backoff for production resilience.
 * 
 * @param {import('winston').Logger} logger - Logger instance for connection events
 * @returns {Promise<void>}
 */
const connectDB = async (logger) => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        // Mongoose 8.x uses these options by default, but we set them explicitly
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });

      logger.info(`MongoDB connected: ${conn.connection.host}`);

      // Connection event listeners
      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected successfully');
      });

      return; // Connection successful, exit retry loop
    } catch (error) {
      retries++;
      logger.error(
        `MongoDB connection attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached. Exiting process.');
        process.exit(1);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.pow(2, retries) * 1000;
      logger.info(`Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = { connectDB };
