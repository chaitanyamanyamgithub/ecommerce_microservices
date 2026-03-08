/**
 * Order Service - Database Configuration
 */

const mongoose = require('mongoose');

const connectDB = async (logger) => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
      logger.info(`MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });
      return;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`);
      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached. Exiting process.');
        process.exit(1);
      }
      const delay = Math.pow(2, retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = { connectDB };
