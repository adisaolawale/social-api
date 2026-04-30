const { pool, dbQuery } = require('../config/db')
const logger = require('../config/logger');

// Create comments table
const createCommentTable = async () => {
  const createTable = `
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

  const createPostIdIndex = `
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id
      ON comments(post_id)
    `
  const createParentIdIndex = `
      CREATE INDEX IF NOT EXISTS idx_comments_user_id
      ON comments(user_id)
    `

  const createTopLevelIndex = `
      CREATE INDEX IF NOT EXISTS idx_comments_post_top_level
      ON comments(post_id)
      WHERE parent_id IS NULL
    `

  try {
    await dbQuery(createTable);
    logger.info('Comments table ready');
    await dbQuery(createPostIdIndex);
    logger.info('Post id index ready')
    await dbQuery(createParentIdIndex);
    logger.info('Parent id index ready')
    await dbQuery(createTopLevelIndex)
    logger.info('Top level index ready')
  } catch (error) {
    logger.error('Error creating comments table:', error)
    process.exit(1);
  }
};

const CommentModel = {
  // =================================
  // CREATE TOP LEVEL COMMENT
  // Transaction - comment insert + post count update together
  // =================================
  create: async ({ postId, userId, content }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO comments (post_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [postId, userId, content]
      );

      await client.query(
        `UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1`,
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

  // ===============================
  // CREATE REPLY
  // Transaction - insert reply + increment parent replies_count + post comments_count
  // ===============================
  createReply: async ({ postId, userId, parentId, content }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO comments (post_id, user_id, parent_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [postId, userId, parentId, content]
      );

      await client.query(
        `UPDATE comments SET replies_count = replies_count + 1 WHERE id = $1`,
        [parentId]
      );

      await client.query(
        `UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1`,
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

  // =========================
  // UPDATE COMMENT CONTENT
  // =========================
  update: async ({ commentId, content }) => {
    const updateQuery = `
          UPDATE comments
          SET content = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
    const result = await dbQuery(updateQuery, [content, commentId]);
    return result.rows[0] || null;
  },

  // ===========================
  // DELETE COMMENT
  // Transaction - delete + decrement counts
  // ===========================
  delete: async ({ commentId, postId, parentId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`DELETE FROM comments WHERE id = $1`, [commentId]);

      if (parentId) {
        await client.query(
          `UPDATE comments
           SET replies_count = GREATEST(replies_count - 1, 0)
           WHERE id = $1`,
          [parentId]
        );
      }

      await client.query(
        `UPDATE posts
         SET comments_count = GREATEST(comments_count - 1, 0)
         WHERE id = $1`,
        [postId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ======================================
  // INCREMENT LIKE COUNT
  // ======================================
  incrementLikes: async (commentId) => {
    await dbQuery(
      `UPDATE comments SET likes_count = likes_count + 1 WHERE id = $1`,
      [commentId]
    )
  },

  // =====================================
  // DECREMENT LIKE COUNT
  // =====================================
  decrementLikes: async (commentId) => {
    await dbQuery(
      `UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
      [commentId]
    )
  },

  // Get all comments by post with pagination
  findByPost: async ({ postId, page = 1, limit = 10, userId }) => {
    const offset = (page - 1) * limit;

    const findByPostQuery = `
          SELECT
            c.id,
            c.post_id,
            c.parent_id,
            c.content,
            c.likes_count,
            c.replies_count,
            c.created_at,
            c.updated_at,
            u.id AS user_id,
            u.username,
            u.full_name,
            u.avatar_url,
            u.is_verified,
            ${userId
        ? `EXISTS(
                   SELECT 1 FROM likes
                   WHERE comment_id = c.id
                   AND user_id = $4
                 ) AS is_liked_by_me`
        : `false AS is_liked_by_me`
      }
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.post_id = $1
          AND c.parent_id IS NULL
          ORDER BY c.created_at DESC
          LIMIT $2 OFFSET $3
        `;

    const countQuery = `SELECT COUNT(*) FROM comments WHERE post_id = $1 AND parent_id IS NULL`;

    const [result, countResult] = await Promise.all([
      dbQuery(findByPostQuery, userId ? [postId, limit, offset, userId] : [postId, limit, offset]),
      dbQuery(countQuery, [postId])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      comments: result.rows,
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

  // ==========================
  // FIND SINGLE COMMENT BY ID
  // ==========================
  findById: async (commentId) => {
    const findByIdQuery = `
          SELECT
            c.id,
            c.post_id,
            c.parent_id,
            c.content,
            c.likes_count,
            c.replies_count,
            c.created_at,
            c.updated_at,
            u.id AS user_id,
            u.username,
            u.full_name,
            u.avatar_url,
            u.is_verified
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.id = $1
        `;
    const result = await dbQuery(findByIdQuery, [commentId]);
    return result.rows[0] || null;
  },

  // ==============================
  // FIND REPLIES FOR A COMMENT (paginated)
  // ==============================
  findReplies: async ({ commentId, page, limit, userId }) => {
    const offset = (page - 1) * limit;

    const findRepliesQuery = `
          SELECT
            c.id,
            c.post_id,
            c.parent_id,
            c.content,
            c.likes_count,
            c.created_at,
            c.updated_at,
            u.id AS user_id,
            u.username,
            u.full_name,
            u.avatar_url,
            u.is_verified,
            ${userId
        ? `EXISTS(
                   SELECT 1 FROM likes
                   WHERE comment_id = c.id
                   AND user_id = $4
                 ) AS is_liked_by_me`
        : `false AS is_liked_by_me`
      }
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.parent_id = $1
          ORDER BY c.created_at ASC
          LIMIT $2 OFFSET $3
        `;

    const countQuery = `SELECT COUNT(*) FROM comments WHERE parent_id = $1`;

    const [result, countResult] = await Promise.all([
      dbQuery(findRepliesQuery, userId ? [commentId, limit, offset, userId] : [commentId, limit, offset]),
      dbQuery(countQuery, [commentId])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      replies: result.rows,
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

  // ====================================
  // FETCH REPLIES PREVIEW FOR MULTIPLE COMMENTS
  // Gets first 2 replies for every comment in ONE query
  // ====================================
  findRepliesPreview: async (commentIds) => {
    if (commentIds.length === 0) return {}

    const placeholders = commentIds.map((_, i) => `$${i + 1}`).join(', ')

    const findRepliesPreviewQuery = `
      SELECT
       r.id,
       r.post_id,
       r.parent_id,
       r.content,
       r.likes_count,
       r.created_at,
       u.id AS user_id,
       u.username,
       u.full_name,
       u.avatar_url,
       u.is_verified,
       ROW_NUMBER() OVER (
         PARTITION BY r.parent_id
         ORDER BY r.created_at ASC
       ) AS rn
      FROM comments r
      JOIN users u ON r.user_id = u.id
      WHERE r.parent_id IN (${placeholders})
    `

    const result = await dbQuery(findRepliesPreviewQuery, commentIds)

    const repliesMap = {}
    for (const reply of result.rows) {
      if (reply.rn <= 2) {
        if (!repliesMap[reply.parent_id]) repliesMap[reply.parent_id] = []
        repliesMap[reply.parent_id].push(reply)
      }
    }

    return repliesMap
  },

  // Get comments by user with pagination
  findByUser: async ({ user_id, page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const findByUserQuery = `
          SELECT
            c.*,
            u.username AS author_name,
            p.content AS post_content
          FROM comments c
          JOIN users u ON c.user_id = u.id
          JOIN posts p ON c.post_id = p.id
          WHERE c.user_id = $1
          ORDER BY c.created_at DESC
          LIMIT $2 OFFSET $3
        `;

    const countQuery = `SELECT COUNT(*) FROM comments WHERE user_id = $1`;

    const [result, countResult] = await Promise.all([
      dbQuery(findByUserQuery, [user_id, limit, offset]),
      dbQuery(countQuery, [user_id])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      comments: result.rows,
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
}


module.exports = {
  CommentModel,
  createCommentTable
}