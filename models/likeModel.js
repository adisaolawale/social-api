const { pool, dbQuery } = require('../config/db');
const logger = require('../config/logger');
const { CommentModel } = require('./commentModel');
const { PostModel } = require('./postModel');

// Create likes table
const createLikeTable = async () => {
  const createTable = `
      CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        UNIQUE(user_id, comment_id),
        CHECK (
          (post_id IS NOT NULL AND comment_id IS NULL) OR
          (post_id IS NULL AND comment_id IS NOT NULL)
        )
      )
    `;

  const createUserIdIndex = `
      CREATE INDEX IF NOT EXISTS idx_likes_user_id
      ON likes(user_id)
    `;

  const createPostIdIndex = `
      CREATE INDEX IF NOT EXISTS idx_likes_post_id
      ON likes(post_id)
      WHERE post_id IS NOT NULL
    `;

  const createCommentIdIndex = `
      CREATE INDEX IF NOT EXISTS idx_likes_comment_id
      ON likes(comment_id)
      WHERE comment_id IS NOT NULL
    `;

  try {
    await dbQuery(createTable);
    logger.info('Likes table ready');

    await dbQuery(createUserIdIndex);
    logger.info('Likes user_id index ready')

    await dbQuery(createPostIdIndex)
    logger.info('Likes post_id index ready')

    await dbQuery(createCommentIdIndex)
    logger.info('Likes comment_id index ready')
  } catch (error) {
    logger.error('Error creating likes table:', error)
    process.exit(1);
  };
}


const LikeModel = {
  // ======================================
  // LIKE A POST — transaction: insert like + increment count
  // =======================================
  likePost: async ({ postId, userId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO likes (post_id, user_id) VALUES ($1, $2) RETURNING *`,
        [postId, userId]
      );

      await client.query(
        `UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1`,
        [postId]
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
  // UNLIKE A POST — transaction: delete like + decrement count
  // ====================================
  unlikePost: async ({ postId, userId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `DELETE FROM likes WHERE post_id = $1 AND user_id = $2 RETURNING *`,
        [postId, userId]
      );

      await client.query(
        `UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
        [postId]
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


  // ======================================
  // LIKE A COMMENT — transaction: insert like + increment count
  // =======================================
  likeComment: async ({ commentId, userId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO likes (comment_id, user_id) VALUES ($1, $2) RETURNING *`,
        [commentId, userId]
      );

      await client.query(
        `UPDATE comments SET likes_count = likes_count + 1 WHERE id = $1`,
        [commentId]
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
  // UNLIKE A COMMENT — transaction: delete like + decrement count
  // ====================================
  unlikeComment: async ({ commentId, userId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `DELETE FROM likes WHERE comment_id = $1 AND user_id = $2 RETURNING *`,
        [commentId, userId]
      );

      await client.query(
        `UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
        [commentId]
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

  // =============================
  // GET USERS WHO LIKED A POST
  // ===========================
  getPostLikes: async ({ postId, page, limit }) => {
    const offset = (page - 1) * limit

    const postLikesQuery = `
        SELECT
         u.id,
         u.username,
         u.full_name,
         u.avatar_url,
         u.is_verified,
         l.created_at AS liked_at
        FROM likes l
        JOIN users u ON u.id = l.user_id
        WHERE l.post_id = $1
        ORDER BY l.created_at DESC
        LIMIT $2 OFFSET $3
      `;

    const countQuery = `SELECT COUNT(*) FROM likes WHERE post_id = $1`;

    const [result, countResult] = await Promise.all([
      dbQuery(postLikesQuery, [postId, limit, offset]),
      dbQuery(countQuery, [postId])
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


  // =============================
  // GET USERS WHO LIKED A COMMENT
  // ===========================
  getCommentLikes: async ({ commentId, page, limit }) => {
    const offset = (page - 1) * limit

    const commentLikesQuery = `
        SELECT
         u.id,
         u.username,
         u.full_name,
         u.avatar_url,
         u.is_verified,
         l.created_at AS liked_at
        FROM likes l
        JOIN users u ON u.id = l.user_id
        WHERE l.comment_id = $1
        ORDER BY l.created_at DESC
        LIMIT $2 OFFSET $3
      `;

    const countQuery = `SELECT COUNT(*) FROM likes WHERE comment_id = $1`;

    const [result, countResult] = await Promise.all([
      dbQuery(commentLikesQuery, [commentId, limit, offset]),
      dbQuery(countQuery, [commentId])
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


  // =============================
  // CHECK IF USER LIKED A POST
  // ===========================
  hasLikedPost: async ({ userId, postId }) => {
    const result = await dbQuery(
      `SELECT id FROM likes WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    )
    return result.rows.length > 0
  },


  // =============================
  // CHECK IF USER LIKED A COMMENT
  // ===========================
  hasLikedComment: async ({ userId, commentId }) => {
    const result = await dbQuery(
      `SELECT id FROM likes WHERE user_id = $1 AND comment_id = $2`,
      [userId, commentId]
    )
    return result.rows.length > 0
  },


  // Get all likes by post with pagination
  findByPost: async ({ post_id, page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const findByPostQuery = `
          SELECT
            l.*,
            u.username AS author_name,
            u.email AS author_email
          FROM likes l
          JOIN users u ON l.user_id = u.id
          WHERE l.post_id = $1
          ORDER BY l.created_at DESC
          LIMIT $2 OFFSET $3
        `;

    const countQuery = `SELECT COUNT(*) FROM likes WHERE post_id = $1`;

    const [result, countResult] = await Promise.all([
      dbQuery(findByPostQuery, [post_id, limit, offset]),
      dbQuery(countQuery, [post_id])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      likes: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  },


  // Get all post likes by user with pagination
  findByUser: async ({ user_id, page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const findByUserQuery = `
          SELECT
            l.*,
            p.content AS post_content,
            u.username
          FROM likes l
          JOIN posts p on l.post_id = p.id
          JOIN users u ON p.user_id = u.id
          WHERE l.user_id = $1
          ORDER BY l.created_at DESC
          LIMIT $2 OFFSET $3
        `;

    const countQuery = `SELECT COUNT(*) FROM likes WHERE user_id = $1`;

    const [result, countResult] = await Promise.all([
      dbQuery(findByUserQuery, [user_id, limit, offset]),
      dbQuery(countQuery, [user_id])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      likes: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }
};

module.exports = {
  LikeModel,
  createLikeTable
}