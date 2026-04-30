const { rateLimit } = require("express-rate-limit")
const { getRedisClient } = require("./redis")
const { RedisStore } = require("rate-limit-redis")

const redisClient = getRedisClient()

const createRateLimiter = (options) => {
    const {
        windowMs = 15 * 60 * 1000,
        max = 100,
        prefix = "rl:global",
        message = "Too many requests, please try again later.",
    } = options;

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message },
        store: new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            prefix,
        }),
    });
}


module.exports = createRateLimiter;