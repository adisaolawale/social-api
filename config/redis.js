const { createClient } = require('redis');

// src/config/redis.js
const logger = require('../config/logger')

const redisClient = createClient({
  url: process.env.REDIS_URL,
})

redisClient.on('error', (err) => {
  // Only log — do not crash the app on Redis errors
  logger.error('Redis connection error:', err.message)
})

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting...')
})

async function connectRedis() {
  // const isUpstash = process.env.REDIS_URL &&
  //   process.env.REDIS_URL.includes('upstash.io') &&
  //   process.env.NODE_ENV === 'production'

  // const isLocal = process.env.NODE_ENV === 'development'



  // if (isUpstash) {
  //   // Upstash requires rediss:// not redis://
  //   // Replace redis:// with rediss:// automatically
  //   const redisUrl = process.env.REDIS_URL.replace(
  //     'redis://',
  //     'rediss://'
  //   )

  //   redisClient = createClient({ url: redisUrl })
  //   logger.info("Connected to upstash Redis")

  // } else if (isLocal) {
  //   // Local Redis — no TLS, simple connection
  //   redisClient = createClient({
  //     socket: {
  //       host: process.env.REDIS_HOST || 'localhost',
  //       port: parseInt(process.env.REDIS_PORT) || 6379,
  //     },
  //   })
  //   logger.info("Connected to local Redis")

  // } else {
  //   // Other hosted Redis — use URL as is
  //   redisClient = createClient({
  //     url: process.env.REDIS_URL,
  //   })
  // }

  // redisClient = createClient({
  //   url: process.env.REDIS_URL,
  // })

  // redisClient.on('error', (err) => {
  //   // Only log — do not crash the app on Redis errors
  //   logger.error('Redis connection error:', err.message)
  // })

  // redisClient.on('reconnecting', () => {
  //   logger.warn('Redis reconnecting...')
  // })

  await redisClient.connect()
  logger.info("Redis connected successfully")
  // return redisClient
}

// function getRedisClient() {
//   if (!redisClient) {
//     throw new Error('Redis not connected. Call connectRedis first.')
//   }
//   return redisClient
// }

const redis = {
  async get(key) {
    try {
      const data = await redisClient.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      logger.error('Redis get error:', error.message)
      return null
    }
  },

  async set(key, value, ttlSeconds = null) {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, serialized)
      } else {
        await redisClient.set(key, serialized)
      }
    } catch (error) {
      logger.error('Redis set error:', error.message)
    }
  },

  async del(key) {
    try {
      await redisClient.del(key)
    } catch (error) {
      logger.error('Redis del error:', error.message)
    }
  },

  async exists(key) {
    try {
      return await redisClient.exists(key)
    } catch (error) {
      logger.error('Redis exists error:', error.message)
      return 0
    }
  },

  async expire(key, ttlSeconds) {
    try {
      await redisClient.expire(key, ttlSeconds)
    } catch (error) {
      logger.error('Redis expire error:', error.message)
    }
  },
}


module.exports = { connectRedis, redisClient, redis }