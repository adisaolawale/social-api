const slidingLimiter = require("../config/slidingRateLimit");


// const apiLimiter = createRateLimiter({
//     windowMs: 15 * 60 * 1000,
//     max: 100,
//     prefix: 'rl:api',
// })

const apiLimiter = slidingLimiter({
    windowSeconds: 15 * 60,
    maxRequests: 100
})




// const loginLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 5, // 5 attempts
//     message: {
//         error: "Too many login attempts. Try again later."
//     },
//     standardHeaders: true,
//     legacyHeaders: false
// })

const loginLimiter = slidingLimiter({
    windowSeconds: 15 * 60,
    maxRequests: 5,
    message: "Too many login attempts. Try again later."
})

// wait for 1hr
const registerLimiter = slidingLimiter({
    windowSeconds: 60 * 60,
    maxRequests: 10,
    message: "Too many accounts created. Try later."
});

// const uploadRateLimiter = createRateLimiter({
//     windowMs: 60 * 60 * 1000,
//     max: 20,
//     prefix: "rl:upload",
//     message: "Upload limit reach. Try again in an hour."
// })


const uploadLimiter = slidingLimiter({
    windowSeconds: 60 * 60,
    maxRequests: 20,
    message: "Upload limit reach. Try again in an hour."
});

module.exports = {
    apiLimiter,
    loginLimiter,
    registerLimiter,
    uploadLimiter
}