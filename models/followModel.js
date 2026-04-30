const { pool, dbQuery } = require('../config/db')
const logger = require('../config/logger');

// Create follows table
const createFollowTable = async () => {
  const createTable = `
      CREATE TABLE IF NOT EXISTS follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        CHECK (follower_id != following_id)
      )
    `;

  const createFollowerIndex = `
      CREATE INDEX IF NOT EXISTS idx_follows_follower_id
      ON follows(follower_id)
    `;

  const createFollowingIndex = `
      CREATE INDEX IF NOT EXISTS idx_follows_following_id
      ON follows(following_id)
    `;

  const createCompositeIndex = `
      CREATE INDEX IF NOT EXISTS idx_follows_composite
      ON follows(follower_id, following_id)
    `;

  try {
    await dbQuery(createTable);
    logger.info('Follows table ready');

    await dbQuery(createFollowerIndex);
    logger.info('Follows follower_id index ready');

    await dbQuery(createFollowingIndex);
    logger.info('Follows following_id index ready');

    await dbQuery(createCompositeIndex);
    logger.info('Follows composite index ready');
  } catch (error) {
    logger.error('Error creating follows table:', error)
    process.exit(1);
  }
};

const FollowModel = {
  // Follow a user — transaction: insert follow + increment counts
  follow: async ({ followerId, followingId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2) RETURNING *`,
        [followerId, followingId]
      );

      await client.query(
        `UPDATE users SET following_count = following_count + 1 WHERE id = $1`,
        [followerId]
      );

      await client.query(
        `UPDATE users SET followers_count = followers_count + 1 WHERE id = $1`,
        [followingId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  // Unfollow a user — transaction: delete follow + decrement counts
  unfollow: async ({ followerId, followingId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `DELETE FROM follows
         WHERE follower_id = $1 AND following_id = $2
         RETURNING *`,
        [followerId, followingId]
      );

      await client.query(
        `UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1`,
        [followerId]
      );

      await client.query(
        `UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1`,
        [followingId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ===================================
  // GET FOLLOWERS OF A USER
  // ===================================
  getFollowers: async ({ userId, page, limit }) => {
    const offset = (page - 1) * limit;

    const followersQuery = `
        SELECT
         u.id,
         u.username,
         u.full_name,
         u.avatar_url,
         u.is_verified,
         f.created_at AS followed_at
        FROM follows f
        JOIN users u ON u.id = f.follower_id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
      `;

    const countQuery = `
        SELECT COUNT(*) FROM follows
        WHERE following_id = $1
      `;

    const [result, countResult] = await Promise.all([
      dbQuery(followersQuery, [userId, limit, offset]),
      dbQuery(countQuery, [userId])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      users: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      }
    }
  },


  // ===================================
  // GET FOLLOWING OF A USER
  // ===================================
  getFollowing: async ({ userId, page, limit }) => {
    const offset = (page - 1) * limit;

    const followingQuery = `
        SELECT
         u.id,
         u.username,
         u.full_name,
         u.avatar_url,
         u.is_verified,
         f.created_at AS followed_at
        FROM follows f
        JOIN users u ON u.id = f.following_id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
      `;

    const countQuery = `
        SELECT COUNT(*) FROM follows
        WHERE follower_id = $1
      `;

    const [result, countResult] = await Promise.all([
      dbQuery(followingQuery, [userId, limit, offset]),
      dbQuery(countQuery, [userId])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      users: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      }
    }
  },


  // ===================================
  // GET ALL FOLLOWING IDS
  // ===================================
  getFollowingIds: async (userId) => {
    const followingQuery = `
        SELECT following_id FROM follows
        WHERE follower_id = $1
      `;

    const result = await dbQuery(followingQuery, [userId])
    return result.rows.map((row) => row.following_id)
  },


  // ===================================
  // GET MULTIPLE FOLLOW RELATIONSHIPS AT ONCE
  // ===================================
  getFollowingMap: async ({ followerId, userIds }) => {
    if (userIds.length === 0) return {}

    const placeholders = userIds.map((_, i) => `$${i + 2}`).join(', ')
    const followingMapQuery = `
        SELECT following_id FROM follows
        WHERE follower_id = $1
        AND following_id IN (${placeholders})
      `;

    const result = await dbQuery(followingMapQuery, [followerId, ...userIds])

    const map = {}
    for (const row of result.rows) {
      map[row.following_id] = true
    }
    return map
  },


  // =====================================
  // CHECK IF FOLLOWING
  // =====================================
  isFollowing: async ({ followerId, followingId }) => {
    const isFollowingQuery = `
          SELECT id FROM follows
          WHERE follower_id = $1 AND following_id = $2
        `;
    const result = await dbQuery(isFollowingQuery, [followerId, followingId]);
    return result.rows.length > 0;
  },


  // Get followers count
  countFollowers: async (userId) => {
    const result = await dbQuery(
      `SELECT COUNT(*) FROM follows WHERE following_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count)
  },


  // Get following count
  countFollowing: async (userId) => {
    const result = await dbQuery(
      `SELECT COUNT(*) FROM follows WHERE follower_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count)
  }
}

module.exports = {
  FollowModel,
  createFollowTable
}