const { pool, dbQuery } = require('../config/db');
const logger = require('../config/logger');

const createNotificationsTable = async () => {

    const createTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL CHECK (
               type IN (
                 'like_post',
                 'like_comment',
                 'comment_post',
                 'reply_comment',
                 'follow',
                 'mention'
               )
             ),
        entity_type VARCHAR(50) CHECK (
                      entity_type IN ('post', 'comment', 'user')
                    ),
        entity_id UUID,
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createRecipientIndex = `
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id
      ON notifications(recipient_id)
    `;

    const createUnreadIndex = `
      CREATE INDEX IF NOT EXISTS idx_notifications_unread
      ON notifications(recipient_id, is_read)
      WHERE is_read = false
    `;

    const createCreatedAtIndex = `
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at
      ON notifications(recipient_id, created_at DESC)
    `;

    try {
        await dbQuery(createTable);
        logger.info('Notifications table ready')

        await dbQuery(createRecipientIndex)
        logger.info('Notifications recipient index ready')
        await dbQuery(createUnreadIndex)
        logger.info('Notifications unread index ready')
        await dbQuery(createCreatedAtIndex)
        logger.info('Notifications created_at index ready')
    } catch (error) {
        logger.error('Error creating notification table:', error);
        process.exit(1)
    }
}


const NotificationModel = {

    // =================================
    // CREATE NOTIFICATION
    // =================================
    create: async ({ recipientId, senderId, type, entityType, entityId, message }) => {
        if (recipientId === senderId) return null

        const existing = await dbQuery(
            `SELECT id FROM notifications
             WHERE recipient_id = $1
             AND sender_id = $2
             AND type = $3
             AND entity_id = $4`,
            [recipientId, senderId, type, entityId]
        )

        if (existing.rows.length > 0) return null

        const result = await dbQuery(
            `INSERT INTO notifications
              (recipient_id, sender_id, type, entity_type, entity_id, message)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [recipientId, senderId, type, entityType, entityId, message]
        )

        return result.rows[0]
    },

    // ===================================
    // GET NOTIFICATIONS FOR A USER
    // ===================================
    findByUserId: async ({ userId, page, limit }) => {
        const offset = (page - 1) * limit

        const [notifResult, countResult] = await Promise.all([
            dbQuery(
                `SELECT
                  n.id,
                  n.type,
                  n.entity_type,
                  n.entity_id,
                  n.message,
                  n.is_read,
                  n.created_at,
                  u.id AS sender_id,
                  u.username AS sender_username,
                  u.full_name AS sender_full_name,
                  u.avatar_url AS sender_avatar,
                  u.is_verified AS sender_is_verified
                 FROM notifications n
                 LEFT JOIN users u ON u.id = n.sender_id
                 WHERE n.recipient_id = $1
                 ORDER BY n.created_at DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            ),
            dbQuery(
                `SELECT COUNT(*) FROM notifications WHERE recipient_id = $1`,
                [userId]
            )
        ])

        const total = parseInt(countResult.rows[0].count);
        return {
            notifications: notifResult.rows,
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

    // ====================================
    // GET UNREAD COUNT
    // ====================================
    getUnreadCount: async (userId) => {
        const result = await dbQuery(
            `SELECT COUNT(*) FROM notifications
             WHERE recipient_id = $1
             AND is_read = false`,
            [userId]
        )
        return parseInt(result.rows[0].count)
    },

    // ================================
    // MARK ONE AS READ
    // ================================
    markOneRead: async ({ notificationId, userId }) => {
        const result = await dbQuery(
            `UPDATE notifications
             SET is_read = true
             WHERE id = $1
             AND recipient_id = $2
             RETURNING *`,
            [notificationId, userId]
        )
        return result.rows[0] || null
    },

    // =====================================
    // MARK ALL AS READ
    // =====================================
    markAllRead: async (userId) => {
        await dbQuery(
            `UPDATE notifications
             SET is_read = true
             WHERE recipient_id = $1
             AND is_read = false`,
            [userId]
        )
    },

    // ==========================================
    // DELETE ONE NOTIFICATION
    // ==========================================
    deleteOne: async ({ notificationId, userId }) => {
        const result = await dbQuery(
            `DELETE FROM notifications
             WHERE id = $1
             AND recipient_id = $2
             RETURNING id`,
            [notificationId, userId]
        )
        return result.rows[0] || null
    },

    // ========================================
    // DELETE NOTIFICATION ON UNLIKE / UNFOLLOW
    // ========================================
    deleteByEntity: async ({ senderId, recipientId, type, entityId }) => {
        await dbQuery(
            `DELETE FROM notifications
             WHERE sender_id = $1
             AND recipient_id = $2
             AND type = $3
             AND entity_id = $4`,
            [senderId, recipientId, type, entityId]
        )
    }
}

module.exports = {
    createNotificationsTable,
    NotificationModel
}