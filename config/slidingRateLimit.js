const AppError = require("../utils/AppError");
const logger = require("./logger");
const { redisClient } = require("./redis")

const slidingLimiter = ({
    windowSeconds = 60,
    maxRequests = 10,
    message = "Too many request"
} = {}) => {
    return async (req, res, next) => {
        const ip = req.ip;
        console.log(ip)
        const key = `rate_limit:${ip}`;
        const now = Date.now();
        const windowStart = now - windowSeconds * 1000;

        try {
            // remove old request
            await redisClient.zRemRangeByScore(key, 0, windowStart);

            // count requests
            const count = await redisClient.zCard(key);
            console.log(count)
            console.log(windowStart)

            if (count >= maxRequests) {
                return next(new AppError(message, 426))
            }

            // ass current request
            await redisClient.zAdd(key, [{ score: now, value: `${now}` }]);

            // set expiry
            await redisClient.expire(key, windowSeconds);

            next();
        } catch (err) {
            logger.error(err)
            next()
        }
    }


}


module.exports = slidingLimiter;