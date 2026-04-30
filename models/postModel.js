const { pool, dbQuery } = require('../config/db')
const logger = require('../config/logger');


// Create posts table
const createPostTable = async () => {
  const createTable = `
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        media_urls TEXT[],
        thumbnail_url TEXT,
        media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', null)),
        is_published BOOLEAN DEFAULT true,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

  const createUserIdIndex = `
      CREATE INDEX IF NOT EXISTS idx_posts_user_id
      ON posts(user_id)
    `;

  const createCreatedAtIndex = `
      CREATE INDEX IF NOT EXISTS idx_posts_created_at
      ON posts(created_at DESC)
    `;

  const createPublishedIndex = `
      CREATE INDEX IF NOT EXISTS idx_posts_published
      ON posts(is_published)
      WHERE is_published = true
    `;

  const createUserPublishedIndex = `
      CREATE INDEX IF NOT EXISTS idx_posts_user_published
      ON posts(user_id, created_at DESC)
      WHERE is_published = true
    `

  try {
    await dbQuery(createTable);
    logger.info('Posts table ready');

    await dbQuery(createUserIdIndex);
    logger.info('Posts user_id index ready');

    await dbQuery(createCreatedAtIndex);
    logger.info('Posts created_at index ready');

    await dbQuery(createPublishedIndex);
    logger.info('Posts published index ready');

    await dbQuery(createUserPublishedIndex);
    logger.info('Posts user published index created')
  } catch (error) {
    logger.error('Error creating posts table:', error);
    process.exit(1)
  }
};

const PostModel = {
  // Create post
  create: async ({ user_id, content, media_urls, thumbnail_url, media_type }) => {
    const createPostQuery = `
          INSERT INTO posts (user_id, content, media_urls, thumbnail_url, media_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
    const result = await dbQuery(createPostQuery, [user_id, content, media_urls, thumbnail_url, media_type]);
    return result.rows[0]
  },

  // ================================
  // FIND ALL POSTS - paginated
  // =================================
  findAll: async ({ page = 1, limit = 10, id }) => {
    const offset = (page - 1) * limit;
    const findAllQuery = `
          SELECT
            p.id,
            p.user_id,
            p.content,
            p.media_urls,
            p.media_type,
            p.is_published,
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
            ${id
        ? `EXISTS(
                   SELECT 1 FROM likes
                   WHERE post_id = p.id
                   AND user_id = $3
                 ) AS is_liked_by_me`
        : `false AS is_liked_by_me`
      }
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE p.is_published = true
          ORDER BY p.created_at DESC
          LIMIT $1 OFFSET $2
        `;

    const countQuery = `SELECT COUNT(*) FROM posts WHERE is_published = true`;
    const [result, countResult] = await Promise.all([
      dbQuery(findAllQuery, id ? [limit, offset, id] : [limit, offset]),
      dbQuery(countQuery)
    ])
    const total = parseInt(countResult.rows[0].count)
    return {
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
  },

  // Get single post
  findById: async (id, userId = null) => {
    const findByIdQuery = `
          SELECT
            p.id,
            p.user_id,
            p.content,
            p.media_urls,
            p.media_type,
            p.is_published,
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
                   AND user_id = $2
                 ) AS is_liked_by_me`
        : `false AS is_liked_by_me`
      }
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
        AND p.is_published = true
        `;

    const result = await dbQuery(findByIdQuery, userId ? [id, userId] : [id]);
    return result.rows[0] || null;
  },

  // Get posts by user with pagination
  findByUser: async ({ user_id, page = 1, limit = 10, requestedId }) => {
    const offset = (page - 1) * limit
    const findByUserQuery = `
          SELECT
            p.id,
            p.user_id,
            p.content,
            p.media_urls,
            p.media_type,
            p.is_published,
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
            ${requestedId
        ? `EXISTS(
                   SELECT 1 FROM likes
                   WHERE post_id = p.id
                   AND user_id = $3
                 ) AS is_liked_by_me`
        : `false AS is_liked_by_me`
      }
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
        AND p.is_published = true
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET ${requestedId ? `$4` : `$3`}
        `;

    const countQuery = `SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_published = true`;

    const [result, countResult] = await Promise.all([
      dbQuery(findByUserQuery, requestedId ? [user_id, limit, requestedId, offset] : [user_id, limit, offset]),
      dbQuery(countQuery, [user_id])
    ]);

    const total = parseInt(countResult.rows[0].count);

    return {
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
  },

  // Update post
  update: async ({ postId, content }) => {
    const updateQuery = `
          UPDATE posts
          SET content = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
    const result = await dbQuery(updateQuery, [content, postId]);
    return result.rows[0];
  },

  // Delete post
  delete: async (postId) => {
    await dbQuery(`DELETE FROM posts WHERE id = $1`, [postId])
  },

  // ==============================
  // INCREMENT VIEW COUNT
  // Fire and forget
  // ==============================
  incrementViews: async (postId) => {
    await dbQuery(
      `UPDATE posts SET views_count = views_count + 1 WHERE id = $1`,
      [postId]
    )
  },

  // Increment likes count
  incrementLikes: async (id) => {
    const result = await dbQuery(
      `UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count`,
      [id]
    )
    return result.rows[0];
  },

  // Decrement likes count
  decrementLikes: async (id) => {
    const result = await dbQuery(
      `UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1 RETURNING likes_count`,
      [id]
    )
    return result.rows[0];
  },

  // Increment comments count
  incrementComments: async (id) => {
    const result = await dbQuery(
      `UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1 RETURNING comments_count`,
      [id]
    )
    return result.rows[0];
  },

  // Decrement comments count
  decrementComments: async (id) => {
    const result = await dbQuery(
      `UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1 RETURNING comments_count`,
      [id]
    )
    return result.rows[0];
  }
}

module.exports = {
  PostModel,
  createPostTable
};