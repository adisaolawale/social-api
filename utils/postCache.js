// utils/postCache.js
const { redis } = require('../config/redis');

const PAGES = [1, 2, 3, 4, 5];
const LIMITS = [10, 20];

// Clears every cached view of a post: its single-post cache,
// every paginated "all posts" page, and every paginated "user posts" page
const invalidatePostCaches = async (postId, userId = null) => {
    const keys = [`post:${postId}`];

    for (const page of PAGES) {
        for (const limit of LIMITS) {
            keys.push(`posts:all:page:${page}:limit:${limit}`);
            if (userId) {
                keys.push(`posts:user:${userId}:page:${page}:limit:${limit}`);
            }
        }
    }

    await Promise.all(keys.map((key) => redis.del(key).catch(() => {})));
};

module.exports = { invalidatePostCaches };