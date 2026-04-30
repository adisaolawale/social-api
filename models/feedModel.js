const { pool, dbQuery } = require('../config/db');
const { redis } = require('../config/redis');
const { FollowModel } = require('./followModel')
const FEED_CACHE_TTL = 300 // 5 minutes
const FEED_CACHE_LIMIT = 100 // cache up to 100 posts per user

const FeedModel = {
    // ========================
    // GET TIMELINE FEED
    // Posts from people the user follows + their own posts
    // ========================

    getTimeline: async ({ userId, page, limit }) => {
        const offset = (page - 1) * limit
        const cacheKey = `feed:timeline:${userId}:${page}:${limit}`

        // Check Redis cache first
        const cached = await redis.get(cacheKey);
        if (cached) return cached

        // Get IDs of everyone the user follows
        const followingIds = await FollowModel.getFollowingIds(userId)

        // Include the user's own posts in their feed
        const feedUserIds = [...followingIds, userId]

        // If user follows nobody just return empty
        if (feedUserIds.length === 0) {
            return { posts: [] }
        }

        // Build $1, $2, $3... for the IN clause
        // We start from $4 because $1 = userId, $2 = limit, $3 = offset
        const placeholders = feedUserIds.map((_, i) => `$${i + 4}`).join(', ')

        const timelineQuery = `
          SELECT
           p.id,
           p.user_id,
           p.content,
           p.media_urls,
           p.media_type,
           p.likes_count,
           p.comments_count,
           p.shares_count,
           p.views_count,
           p.created_at,
           p.updated_at,
           u.username,
           u.full_name,
           u.avatar_url,
           u.is_verified,
           EXISTS(
             SELECT 1 FROM likes
             WHERE post_id = p.id
             AND user_id = $1
           ) AS is_liked_by_me
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE p.user_id IN (${placeholders})
          AND p.is_published = true
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3
        `;

        // For the count query: $1, $2, $3... = feedUserIds
        const countPlaceholders = feedUserIds.map((_, i) => `$${i + 1}`).join(', ')
        const countQuery = `
          SELECT COUNT(*) FROM posts
          WHERE user_id IN (${countPlaceholders})
          AND is_published = true
        `

        const result = await dbQuery(timelineQuery, [userId, limit, offset, ...feedUserIds]);
        const countResult = await dbQuery(countQuery, [...feedUserIds]);

        const total = parseInt(countResult.rows[0].count);

        const finalResult = {
            posts: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            }
        }

        await redis.set(cacheKey, finalResult, FEED_CACHE_TTL)
        return finalResult
    },


    // ============================
    // GET EXPLORE FEED
    // Public posts from everyone - for discovery
    // Sorted by engagement score not just date
    // =============================
    getExplore: async ({ userId, page, limit }) => {
        const offset = (page - 1) * limit
        const cacheKey = `feed:explore:${page}:${limit}`

        const cached = await redis.get(cacheKey)
        if (cached) return cached

        const exploreQuery = `
          SELECT
           p.id,
           p.user_id,
           p.content,
           p.media_urls,
           p.media_type,
           p.likes_count,
           p.comments_count,
           p.shares_count,
           p.views_count,
           p.created_at,
           p.updated_at,
           u.username,
           u.full_name,
           u.avatar_url,
           u.is_verified,
           ${userId
                ? `EXISTS(
                 SELECT 1 FROM likes
                 WHERE post_id = p.id
                 AND user_id = $3
                ) AS is_liked_by_me`
                : `false AS is_liked_by_me`
            },
           (
             LOG(GREATEST(p.likes_count, 1)) +
             LOG(GREATEST(p.comments_count, 1)) +
             EXTRACT(EPOCH FROM p.created_at) / 86400
           ) AS score
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE p.is_published = true
          ORDER BY score DESC
          LIMIT $1 OFFSET $2
        `;

        const countQuery = `
          SELECT COUNT(*) FROM posts WHERE is_published = true
        `;

        const result = await dbQuery(exploreQuery, userId ? [limit, offset, userId] : [limit, offset])
        const countResult = await dbQuery(countQuery)

        const total = parseInt(countResult.rows[0].count);

        const finalResult = {
            posts: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            }
        }

        await redis.set(cacheKey, finalResult, 600)
        return finalResult
    },

    // ==============================
    // INVALIDATE USER FEED CACHE
    // Called when user creates or deletes a post
    // =============================
    invalidateCache: async (userId) => {
        const pagesToInvalidate = [1, 2, 3, 4, 5]
        const limits = [10, 20]

        const keys = []
        for (const page of pagesToInvalidate) {
            for (const limit of limits) {
                keys.push(`feed:timeline:${userId}:${page}:${limit}`)
            }
        }

        await Promise.all(keys.map((key) => redis.del(key)))
    },


    // ==============================
    // INVALIDATE EXPLORE CACHE
    // Called when any post is created or deleted
    // =============================
    invalidateExploreCache: async () => {
        const pagesToInvalidate = [1, 2, 3, 4, 5]
        const limits = [10, 20]

        const keys = []
        for (const page of pagesToInvalidate) {
            for (const limit of limits) {
                keys.push(`feed:explore:${page}:${limit}`)
            }
        }

        await Promise.all(keys.map((key) => redis.del(key)))
    },
}

module.exports = FeedModel;