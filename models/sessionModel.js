const { pool, dbQuery } = require('../config/db')
const logger = require('../config/logger');
const { hashToken } = require('../utils/token');

// Create follows table
const createSessionTable = async () => {
  const query = `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT,
        is_valid BOOLEAN DEFAULT TRUE,
        device TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        last_used_at TIMESTAMP
      )
    `;

  const createUserIndex = ` 
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id)
    `;

  const createIsValidIndex = `
      CREATE INDEX IF NOT EXISTS idx_sessions_is_valid
      ON sessions(is_valid)
    `;

  const createTokenHashIndex = `
    CREATE INDEX IF NOT EXISTS idx_session_token_hash
    ON sessions(token_hash)
  `

  try {
    await dbQuery(query);
    logger.info('Session table ready');

    await dbQuery(createUserIndex);
    logger.info('Sessions user_id index ready');

    await dbQuery(createIsValidIndex);
    logger.info('Sessions is_valid index ready');

    await dbQuery(createTokenHashIndex);
    logger.info('Sessions token_hash index ready');
  } catch (error) {
    logger.error('Error creating sessions table:', error)
    process.exit(1);
  }
};

const SessionModel = {

  // ===================
  // CREATE NEW SESSION (LOGIN)
  // ===================
  createSession: async ({ userId, device, ip, userAgent, expiresAt }) => {
    const query = `
          INSERT INTO sessions (
           user_id,
           device,
           ip_address,
           user_agent,
           expires_at
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
    const values = [userId, device, ip, userAgent, expiresAt];

    const { rows } = await dbQuery(query, values);
    return rows[0];
  },



  // ===============================
  // GET SESSION BY REFRESH TOKEN
  // ===============================
  getSessionById: async (sessionId) => {
    const query = `
      SELECT * FROM sessions
      WHERE id = $1
      LIMIT 1
    `;
    const { rows } = await dbQuery(query, [sessionId])
    return rows[0]
  },


  // ===============================
  // GET SESSION BY REFRESH TOKEN
  // ===============================
  getSessionByToken: async (refreshToken) => {
    const hashed = hashToken(refreshToken);
    const query = `
      SELECT * FROM sessions
      WHERE token_hash = $1
      LIMIT 1
    `;
    const { rows } = await dbQuery(query, [hashed])
    return rows[0]
  },


  // ===============================
  // UPDATE LAST USED TIME
  // ===============================
  updateLastUsed: async (sessionId) => {
    const query = `
      UPDATE sessions
      SET last_used_at = NOW()
      WHERE id = $1
    `;

    await dbQuery(query, [sessionId]);
  },


  updateSessionHashToken: async ({ sessionId, hashedToken }) => {

    const query = `
      UPDATE sessions
      SET token_hash = $2
      WHERE id = $1
    `;

    await dbQuery(query, [sessionId, hashedToken]);
  },


  // ============================
  // INVALIDATE ONE SESSION
  // logut device
  // ============================
  invalidateSession: async (sessionId) => {
    const query = `
      UPDATE sessions
      SET is_valid = FALSE
      WHERE id = $1
    `;

    await dbQuery(query, [sessionId]);
  },


  // ============================
  // INVALIDATE ALL SESSION
  // global logut
  // ============================
  invalidateAllUserSession: async (userId) => {
    const query = `
      UPDATE sessions
      SET is_valid = FALSE
      WHERE user_id = $1
    `;

    await dbQuery(query, [userId]);
  },


  // =====================================
  // ROTATE SESSION (IMPORTANT)
  // =====================================
  rotateSession: async ({ oldRefreshToken, newRefreshToken, expiresAt }) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const oldHashed = hashToken(oldRefreshToken);

      // 1. Find old session
      const oldSessionRes = await client.query(
        `SELECT * FROM sessions 
         WHERE token_hash = $1
         LIMIT 1
        `, [oldHashed]
      );

      const oldSession = oldSessionRes.rows[0];

      if (!oldSession || !oldSession.is_valid) {
        throw new Error("Invalid or reused refresh token");
      }

      // 2. Invalidate old session
      await client.query(
        `UPDATE sessions
         SET is_valid = FALSE
         WHERE id = $1
        `, [oldSession.id]
      );

      // 3. Create new session
      const newHashed = hashToken(newRefreshToken);
      const newSessionRes = await client.query(
        `INSERT INTO sessions (
          user_id,
          token_hash,
          device,
          ip_address,
          user_agent,
          expires_at
         ) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *
        `,
        [
          oldSession.user_id,
          newHashed,
          oldSession.device,
          oldSession.ip_address,
          oldSession.user_agent,
          expiresAt
        ]
      );

      await client.query("COMMIT");

      return newSessionRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error
    } finally {
      client.release()
    }
  },


  // =================================
  // DEVICE LIST
  // get all sessions for a user
  // =================================
  getUserSessions: async (userId) => {
    const query = `
      SELECT id, device, ip_address, user_agent, created_at, last_used_at, is_valid
      FROM sessions
      WHERE user_id = $1 AND is_valid = TRUE
      ORDER BY created_at DESC
    `;

    const { rows } = await dbQuery(query, [userId]);
    return rows
  },


  // ==================================
  // CRON JOB
  // delete expired sessions
  // ===================================
  deleteExpiredToken: async () => {
    const query = `
      DELETE FROM sessions
      WHERE expires_at < NOW()
    `;

    await dbQuery(query)
  }
}

module.exports = {
  createSessionTable,
  SessionModel
}