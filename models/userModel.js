const { pool, dbQuery } = require('../config/db');
const logger = require('../config/logger');

const createUserTable = async () => {
  const createTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(30) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        website VARCHAR(255),
        location VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        following_count INTEGER DEFAULT 0,
        followers_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        is_private BOOLEAN DEFAULT false,
        email_verified_at TIMESTAMP,
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `;

  const createUsernameIndex = `
      CREATE INDEX IF NOT EXISTS idx_users_username
      ON users(username)
    `;

  const createEmailIndex = `
      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email)
    `;

  const createActiveIndex = `
      CREATE INDEX IF NOT EXISTS idx_users_is_active
      ON users(is_active)
      WHERE is_active = true
    `;

  try {
    await dbQuery(createTable);
    logger.info('Users table ready')
    await dbQuery(createUsernameIndex)
    logger.info('Users username index ready')
    await dbQuery(createEmailIndex)
    logger.info('Users email index ready')
    await dbQuery(createActiveIndex)
    logger.info('Users active index ready')
  } catch (error) {
    logger.error('Error creating users table:', error);
    process.exit(1)
  }
}

const UserModel = {
  // Create new user
  create: async ({ username, email, password, fullName }) => {
    const createUserQuery = `
          INSERT INTO users (username, email, password, full_name)
          VALUES ($1, $2, $3, $4)
          RETURNING id, username, email, full_name, created_at
        `;
    const result = await dbQuery(createUserQuery, [username, email, password, fullName]);
    return result.rows[0]
  },

  // =============================
  // VERIFY EMAIL
  // =============================
  verifyEmail: async (userId) => {
    const verifyEmailQuery = `
      UPDATE users
      SET is_verified = true,
          email_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await dbQuery(verifyEmailQuery, [userId]);
  },

  // =============================
  // UPDATE PROFILE
  // =============================
  update: async ({ userId, fullName, bio, website, location }) => {
    const updateQuery = `
          UPDATE users
          SET full_name = COALESCE($1, full_name),
              bio       = COALESCE($2, bio),
              website   = COALESCE($3, website),
              location  = COALESCE($4, location),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING
            id,
            username,
            email,
            full_name,
            bio,
            website,
            location,
            avatar_url,
            is_verified,
            updated_at
        `;

    const result = await dbQuery(updateQuery, [fullName, bio, website, location, userId]);
    return result.rows[0] || null
  },

  // ================================
  // UPDATE AVATAR
  // ================================
  updateAvatar: async (userId, avatarUrl) => {
    const updateAvatarQuery = `
      UPDATE users
      SET avatar_url = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, avatar_url
    `
    const result = await dbQuery(updateAvatarQuery, [avatarUrl, userId])
    return result.rows[0] || null
  },

  // ===============================
  // UPDATE PASSWORD
  // ===============================
  updatePassword: async (userId, hashedPassword) => {
    const updatePasswordQuery = `
      UPDATE users
      SET password = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `
    await dbQuery(updatePasswordQuery, [hashedPassword, userId])
  },

  // ============================
  // UPDATE LAST SEEN
  // ============================
  updateLastSeen: async (id) => {
    const updateLastSeenQuery = `
      UPDATE users
      SET last_seen = CURRENT_TIMESTAMP
      WHERE id = $1
    `
    await dbQuery(updateLastSeenQuery, [id])
  },

  // ==========================
  // SEARCH BY USERNAME OR FULL NAME
  // ==========================
  search: async ({ searchTerm, page, limit }) => {
    const offset = (page - 1) * limit

    const searchQuery = `
      SELECT
       id,
       username,
       full_name,
       avatar_url,
       is_verified
      FROM users
      WHERE is_active = true
      AND (
        username ILIKE $1
        OR full_name ILIKE $1
      )
      ORDER BY
        CASE WHEN username = $2 THEN 0 ELSE 1 END,
        username ASC
      LIMIT $3 OFFSET $4
    `
    const countQuery = `
      SELECT COUNT(*) FROM users
      WHERE is_active = true
      AND (
        username ILIKE $1
        OR full_name ILIKE $1
      )
    `

    const [usersResult, countResult] = await Promise.all([
      dbQuery(searchQuery, [`%${searchTerm}%`, searchTerm, limit, offset]),
      dbQuery(countQuery, [`%${searchTerm}%`])
    ])

    const total = parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(total / limit)

    return {
      users: usersResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
  },

  // =============================
  // DEACTIVATE ACCOUNT
  // =============================
  deactivate: async (id) => {
    const deactivateQuery = `
      UPDATE users
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await dbQuery(deactivateQuery, [id])
  },

  // Find user by email
  findByEmail: async (email) => {
    const result = await dbQuery(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0]
  },

  // Find user by ID
  findById: async (id) => {
    const result = await dbQuery(
      `SELECT
         id,
         username,
         email,
         full_name,
         bio,
         avatar_url,
         website,
         location,
         role,
         is_active,
         is_verified,
         is_private,
         last_seen,
         created_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0]
  },

  // =================================
  // FIND BY ID WITH COUNTS
  // =================================
  findByIdWithCounts: async (id) => {
    const findByIdWithCountsQuery = `
      SELECT
       u.id,
       u.username,
       u.full_name,
       u.bio,
       u.avatar_url,
       u.website,
       u.location,
       u.is_verified,
       u.is_private,
       u.last_seen,
       u.created_at,
       (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_published = true) AS posts_count,
       (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count
      FROM users u
      WHERE u.id = $1
    `;

    const result = await dbQuery(findByIdWithCountsQuery, [id]);
    return result.rows[0]
  },

  // =================================
  // FIND BY USERNAME
  // =================================
  findByUsername: async (username) => {
    const findByUsernameQuery = `
     SELECT
       u.id,
       u.username,
       u.full_name,
       u.bio,
       u.avatar_url,
       u.website,
       u.location,
       u.is_verified,
       u.is_private,
       u.last_seen,
       u.created_at,
       (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_published = true) AS posts_count,
       (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count
      FROM users u
      WHERE u.username = $1
    `
    const result = await dbQuery(findByUsernameQuery, [username])
    return result.rows[0] || null
  },

  // ===================================
  // CHECK IF EMAIL OR USERNAME EXISTS
  // ===================================
  existsByEmailOrUsername: async (email, username) => {
    const result = await dbQuery(
      `SELECT id FROM users WHERE email = $1 OR username = $2`,
      [email, username]
    )
    return result.rows[0] || null
  },

  // Delete user
  delete: async (id) => {
    await dbQuery(`DELETE FROM users WHERE id = $1`, [id]);
  }
};

module.exports = { UserModel, createUserTable }