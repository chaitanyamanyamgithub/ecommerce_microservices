/**
 * Shared Redis Cache Module
 *
 * Provides a simple cache-aside wrapper around Redis.
 * Any microservice can import this module to cache database query results.
 *
 * Features:
 *   - Lazy connection (connects on first use)
 *   - TTL-based expiry
 *   - Graceful fallback (cache miss → DB hit, Redis down → DB hit)
 *   - JSON serialization/deserialization
 *
 * Usage:
 *   const { cacheGet, cacheSet, cacheDel } = require('@shared/cache');
 *
 *   // Try cache first, fall back to DB
 *   let products = await cacheGet('products:list');
 *   if (!products) {
 *     products = await Product.find();
 *     await cacheSet('products:list', products, 60);
 *   }
 */

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

let client = null;
let isConnected = false;

/**
 * Returns a connected Redis client (lazy singleton).
 * If connection fails, returns null — all cache operations
 * will gracefully no-op so the service falls through to the DB.
 */
const getClient = async () => {
  if (client && isConnected) return client;

  try {
    client = createClient({ url: REDIS_URL });

    client.on('error', (err) => {
      console.error(`Redis client error: ${err.message}`);
      isConnected = false;
    });

    client.on('connect', () => {
      isConnected = true;
    });

    client.on('end', () => {
      isConnected = false;
    });

    await client.connect();
    isConnected = true;
    return client;
  } catch (error) {
    console.error(`Redis connection failed: ${error.message} — cache disabled`);
    isConnected = false;
    return null;
  }
};

/**
 * Retrieve a value from the cache.
 *
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed value, or null on miss / error
 */
const cacheGet = async (key) => {
  try {
    const redis = await getClient();
    if (!redis) return null;

    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Cache GET error for ${key}: ${error.message}`);
    return null;
  }
};

/**
 * Store a value in the cache with a TTL.
 *
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON-serialized)
 * @param {number} [ttlSeconds=60] - Time-to-live in seconds
 */
const cacheSet = async (key, value, ttlSeconds = 60) => {
  try {
    const redis = await getClient();
    if (!redis) return;

    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error(`Cache SET error for ${key}: ${error.message}`);
  }
};

/**
 * Delete a cache key (cache invalidation).
 *
 * @param {string} key - Cache key to delete
 */
const cacheDel = async (key) => {
  try {
    const redis = await getClient();
    if (!redis) return;

    await redis.del(key);
  } catch (error) {
    console.error(`Cache DEL error for ${key}: ${error.message}`);
  }
};

/**
 * Delete all keys matching a pattern (e.g., 'products:*').
 *
 * @param {string} pattern - Glob-style pattern
 */
const cacheDelPattern = async (pattern) => {
  try {
    const redis = await getClient();
    if (!redis) return;

    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error(`Cache DEL pattern error for ${pattern}: ${error.message}`);
  }
};

/**
 * Close the Redis connection (for graceful shutdown).
 */
const cacheClose = async () => {
  try {
    if (client && isConnected) {
      await client.quit();
      isConnected = false;
    }
  } catch (error) {
    console.error(`Cache close error: ${error.message}`);
  }
};

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheClose
};
