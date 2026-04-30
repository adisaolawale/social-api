const { pool, dbQuery } = require("../config/db");
const logger = require('../config/logger');
const AppError = require("../utils/AppError");

const createTokenTable = async () => {
    const typeEnumQuery = `
      DO $$
      BEGIN
        CREATE TYPE token_type AS ENUM (
          'EMAIL_VERIFICATION',
          'PASSWORD_RESET',
          'LOGIN_OTP',
          'TWO_FACTOR_AUTH'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      `;

    const typeStatusEnumQuery = `
      DO $$
      BEGIN
        CREATE TYPE token_status AS ENUM (
          'PENDING',
          'USED',
          'EXPIRED'
      );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    const query = `
        CREATE TABLE IF NOT EXISTS tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          type token_type NOT NULL,
          status token_status NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL
        )
      `;

    try {
        await dbQuery('BEGIN')
        await dbQuery(typeEnumQuery)
        await dbQuery(typeStatusEnumQuery)
        await dbQuery(query)
        await dbQuery('COMMIT')
        logger.info('Tokens table created successfully')
    } catch (error) {
        await dbQuery('ROLLBACK')
        logger.error('Error creating tokens table:', error)
        throw error
    }

}

const tokenModel = {
    createTokenTable: async ({ userId, tokenHash, type, expiresAt }) => {
        try {
            const query = `
                INSERT INTO tokens (user_id, token_hash, type, expires_at)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `
            const values = [userId, tokenHash, type, expiresAt]
            const result = await dbQuery(query, values)
            return result.rows[0]
        } catch (error) {
            logger.error('Error creating token:', error)
            throw error
        }

    },

    deleteToken: async (tokenHash) => {
        try {
            const query = ` DELETE FROM tokens WHERE token_hash = $1`
            const values = [tokenHash]
            await dbQuery(query, values)
        } catch (error) {
            logger.error('Error deleting token:', error)
            throw error
        }
    },

    findToken: async (tokenHash, type) => {
        try {
            const query = ` SELECT * FROM tokens WHERE token_hash = $1 AND type = $2`
            const values = [tokenHash, type]
            const result = await dbQuery(query, values)
            return result.rows
        } catch (error) {
            logger.error('Error finding token:', error)
            throw error
        }
    },

    verifyToken: async ({ tokenHash, type }, next) => {
        const query = ` SELECT * FROM tokens WHERE token_hash = $1 AND type = $2`
        const values = [tokenHash, type]
        const { rows } = await dbQuery(query, values)

        if (rows.length === 0) {
            return next(new AppError("Invalid Token", 400))
        }

        const t = rows[0]
        if (t.status === 'USED' || t.expires_at < new Date()) {
            return next(new AppError("Invalid Token", 400))
        }

        if (new Date() > new Date(t.expires_at)) {
            return next(new AppError("Token Expired", 400))
        }

        await dbQuery(
            `UPDATE tokens
             SET status = 'USED'
             WHERE id = $1
        `, [t.id]
        );

        return true
    }

}




module.exports = {
    createTokenTable,
    tokenModel,
}
