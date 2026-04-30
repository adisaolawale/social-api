const { pool, dbQuery } = require('../config/db')
const logger = require('../config/logger')

async function createUploadsTable() {

    const createTable = `
    CREATE TABLE IF NOT EXISTS uploads (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url           TEXT NOT NULL,
      public_id     TEXT NOT NULL UNIQUE,
      resource_type VARCHAR(20) DEFAULT 'image',
      folder        VARCHAR(100),
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `

    const createUserIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_uploads_user_id
    ON uploads(user_id)
  `

    const createPublicIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_uploads_public_id
    ON uploads(public_id)
  `

    try {
        await dbQuery(createTable)
        logger.info('Uploads table ready')

        await dbQuery(createUserIdIndex)
        logger.info('Uploads user_id index ready')

        await dbQuery(createPublicIdIndex)
        logger.info('Uploads public_id index ready')

    } catch (error) {
        logger.error('Uploads migration failed:', error)
        throw error
    }
}


const UploadModel = {

    // =====================
    // SAVE UPLOAD RECORD
    // Track every upload for audit and cleanup
    // =====================
    async create({ userId, url, publicId, resourceType, folder }) {
        const result = await dbQuery(
            `INSERT INTO uploads
             (user_id, url, public_id, resource_type, folder)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, url, publicId, resourceType, folder]
        )
        return result.rows[0]
    },

    // =====================
    // FIND BY PUBLIC ID
    // Used before deletion
    // =====================
    async findByPublicId(publicId) {
        const result = await dbQuery(
            `SELECT * FROM uploads WHERE public_id = $1`,
            [publicId]
        )
        return result.rows[0] || null
    },

    // =====================
    // DELETE UPLOAD RECORD
    // Called after Cloudinary deletion
    // =====================
    async delete(publicId) {
        await dbQuery(
            `DELETE FROM uploads WHERE public_id = $1`,
            [publicId]
        )
    },

}

module.exports = {
    createUploadsTable,
    UploadModel
}