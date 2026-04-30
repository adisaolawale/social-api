const { pool, dbQuery } = require('../config/db');
const logger = require('../config/logger');

const createLogTable = async () => {
  const client = await pool.connect()

  const actionEnumQuery = `
      DO $$
      BEGIN
        CREATE TYPE action_type AS ENUM (
          'AUTH_LOGIN',
          'AUTH_LOGOUT',
          'AUTH_REGISTER',
          'AUTH_FAILED_LOGIN',
          'USER_UPDATE_PROFILE',
          'POST_CREATE',
          'POST_DELETE',
          'TOKEN_INVALID',
          'UNAUTHORIZED_ACCESS'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

  const createTable = `
      CREATE TABLE IF NOT EXISTS user_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action action_type,
        ip VARCHAR(50),
        device_id VARCHAR(100),
        location VARCHAR(100),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

  try {
    await client.query('BEGIN')
    await client.query(actionEnumQuery)
    await client.query(createTable)
    await client.query('COMMIT')
    logger.info('Logs table created successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Error creating user logs table:', error)
    process.exit(1)
  } finally {
    client.release()
  }
}


const LogsModel = {
  create: async (data) => {
    const { userId, action, ip, userAgent, metadata } = data
    const createLogQuery = `
          INSERT INTO user_logs (user_id, action, ip, user_agent, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `;
    const values = [userId, action, ip, userAgent, metadata]
    await dbQuery(createLogQuery, values)
  }
}

module.exports = {
  createLogTable,
  LogsModel
}