const { URL } = require('url');

function getBullMQConnection() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        return { host: 'localhost', port: 6379 };
    }

    const parsed = new URL(redisUrl);
    const isTLS = parsed.protocol === 'rediss:';

    return {
        host: parsed.hostname,
        port: parseInt(parsed.port) || 6379,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        ...(isTLS ? {
            tls: {
                rejectUnauthorized: false,   // ← add this
                minVersion: 'TLSv1.2',       // ← and this
            }
        } : {}),
    };
}


// function getBullMQConnection() {
//     return {
//         host: process.env.REDIS_HOST || 'localhost',
//         port: parseInt(process.env.REDIS_PORT) || 6379,
//     };
// }

module.exports = { getBullMQConnection };