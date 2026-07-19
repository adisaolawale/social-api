const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('redis');
const logger = require('../config/logger'); 

let redisClient;

// 1. Initialize the client configuration conditionally based on environment
if (process.env.NODE_ENV === 'production') {
  // Upstash requires secure websockets/tls protocol (rediss://)
  const redisUrl = (process.env.REDIS_URL || '').replace('redis://', 'rediss://');
  
  redisClient = createClient({ 
    url: redisUrl 
  });
  logger.info("Configured for Upstash Production Redis");
} else {
  // Local Development Redis configuration
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    },
  });
  logger.info("Configured for Local Development Redis");
}

// 2. Global event listeners for operational handling
redisClient.on('error', (err) => {
  logger.error('Redis runtime connection error:', err.message);
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

// 3. Clean startup execution flow
async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info("Redis connected successfully");
  } catch (err) {
    // Gracefully catch boot failures so the Express server doesn't crash on Render
    logger.error("Redis failed to initialize during server startup:", err.message);
  }
}

const redis = {
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis get error:', error.message);
      return null;
    }
  },

  async set(key, value, ttlSeconds = null) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      logger.error('Redis set error:', error.message);
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis del error:', error.message);
    }
  },

  async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Redis exists error:', error.message);
      return 0;
    }
  },

  async expire(key, ttlSeconds) {
    try {
      await redisClient.expire(key, ttlSeconds);
    } catch (error) {
      logger.error('Redis expire error:', error.message);
    }
  },
};

module.exports = { connectRedis, redisClient, redis };