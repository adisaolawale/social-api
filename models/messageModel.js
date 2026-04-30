const { pool, dbQuery } = require('../config/db');
const logger = require('../config/logger');

const createMessagesTable = async () => {
  const conversationTable = `
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

  const participantsTable = `
      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        last_read_at TIMESTAMP,
        PRIMARY KEY (conversation_id, user_id)
      )
    `;

  const messagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        media_url TEXT,
        message_type VARCHAR(20) DEFAULT 'text'
                     CHECK (message_type IN ('text', 'image', 'video')),
        is_deleted BOOLEAN DEFAULT false,
        delivered_at TIMESTAMP,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

  const createConversationParticipantIndex = `
      CREATE INDEX IF NOT EXISTS idx_participants_user_id
      ON conversation_participants(user_id)
    `;

  const createMessagesConversationIndex = `
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
      ON messages(conversation_id)
    `;

  const createMessagesSenderIndex = `
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id
      ON messages(sender_id)
    `;

  const createMessagesCreatedAtIndex = `
      CREATE INDEX IF NOT EXISTS idx_messages_created_at
      ON messages(conversation_id, created_at DESC)
    `;

  try {
    await dbQuery(conversationTable);
    logger.info('Messages conversation table ready')
    await dbQuery(participantsTable);
    logger.info('Messages participants table ready')
    await dbQuery(messagesTable);
    logger.info('Messages table ready')
    await dbQuery(createConversationParticipantIndex)
    logger.info('Participants user_id index ready')
    await dbQuery(createMessagesConversationIndex)
    logger.info('Messages conversation_id index ready')
    await dbQuery(createMessagesSenderIndex)
    logger.info('Messages sender_id index ready')
    await dbQuery(createMessagesCreatedAtIndex)
    logger.info('Messages created_at index ready')
  } catch (error) {
    logger.error('Error creating messages table:', error);
    process.exit(1)
  }
}

const MessageModel = {
  // =============================
  // FIND OR CREATE CONVERSATION
  // Transaction — atomic: check existing then create if needed
  // =============================
  findOrCreateConversation: async ({ userOneId, userTwoId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query(
        `SELECT cp1.conversation_id
         FROM conversation_participants cp1
         JOIN conversation_participants cp2
           ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = $1
         AND cp2.user_id = $2`,
        [userOneId, userTwoId]
      );

      if (existingResult.rows.length > 0) {
        await client.query('COMMIT');
        return existingResult.rows[0].conversation_id;
      }

      const convResult = await client.query(
        `INSERT INTO conversations DEFAULT VALUES RETURNING id`
      );
      const conversationId = convResult.rows[0].id;

      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ($1, $2), ($1, $3)`,
        [conversationId, userOneId, userTwoId]
      );

      await client.query('COMMIT');
      return conversationId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  // ==============================
  // GET ALL CONVERSATIONS FOR A USER
  // ==============================
  getUserConversations: async ({ userId, page, limit }) => {
    const offset = (page - 1) * limit

    const convsQuery = `
          SELECT
           c.id AS conversation_id,
           u.id AS other_user_id,
           u.username AS other_username,
           u.full_name AS other_full_name,
           u.avatar_url AS other_avatar_url,
           u.is_verified AS other_is_verified,
           m.id AS last_message_id,
           m.content AS last_message,
           m.message_type AS last_message_type,
           m.sender_id AS last_message_sender,
           m.created_at AS last_message_at,
           m.is_deleted AS last_message_deleted,
           (
             SELECT COUNT(*) FROM messages
             WHERE conversation_id = c.id
             AND sender_id != $1
             AND read_at IS NULL
             AND is_deleted = false
           ) AS unread_count,
           cp.last_read_at
          FROM conversations c
          JOIN conversation_participants cp
            ON cp.conversation_id = c.id
            AND cp.user_id = $1
          JOIN conversation_participants cp2
            ON cp2.conversation_id = c.id
            AND cp2.user_id != $1
          JOIN users u ON u.id = cp2.user_id
          LEFT JOIN LATERAL (
            SELECT * FROM messages
            WHERE conversation_id = c.id
            AND is_deleted = false
            ORDER BY created_at DESC
            LIMIT 1
          ) m ON true
          ORDER BY m.created_at DESC NULLS LAST
          LIMIT $2 OFFSET $3
        `;

    const countQuery = `
          SELECT COUNT(*) FROM conversation_participants
          WHERE user_id = $1
        `

    const [convsResult, countResult] = await Promise.all([
      dbQuery(convsQuery, [userId, limit, offset]),
      dbQuery(countQuery, [userId])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      conversations: convsResult.rows,
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


  // =====================================
  // GET SINGLE CONVERSATION
  // Verify user is a participant
  // ======================================
  findConversationById: async ({ conversationId, userId }) => {
    const findConvQuery = `
          SELECT c.id, cp.user_id
          FROM conversations c
          JOIN conversation_participants cp
            ON cp.conversation_id = c.id
            AND cp.user_id = $2
          WHERE c.id = $1
        `;

    const result = await dbQuery(findConvQuery, [conversationId, userId])
    return result.rows[0] || null
  },

  // =====================================
  // GET MESSAGES IN A CONVERSATION
  // ======================================
  getMessages: async ({ conversationId, page, limit }) => {
    const offset = (page - 1) * limit

    const messageQuery = `
          SELECT
           m.id,
           m.conversation_id,
           m.sender_id,
           m.content,
           m.media_url,
           m.message_type,
           m.is_deleted,
           m.delivered_at,
           m.read_at,
           m.created_at,
           u.username,
           u.full_name,
           u.avatar_url
          FROM messages m
          JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_id = $1
          ORDER BY m.created_at DESC
          LIMIT $2 OFFSET $3
        `;

    const countQuery = `
          SELECT COUNT(*) FROM messages
          WHERE conversation_id = $1
        `

    const [messageResult, countResult] = await Promise.all([
      dbQuery(messageQuery, [conversationId, limit, offset]),
      dbQuery(countQuery, [conversationId])
    ])

    const total = parseInt(countResult.rows[0].count);

    return {
      // Reverse so frontend gets oldest to newest order
      messages: messageResult.rows.reverse(),
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


  // =====================================
  // CREATE MESSAGE
  // ======================================
  createMessage: async ({ conversationId, senderId, content, mediaUrl, messageType }) => {
    const createMessageQuery = `
          INSERT INTO messages
           (conversation_id, sender_id, content, media_url, message_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;

    const result = await dbQuery(createMessageQuery, [
      conversationId, senderId, content, mediaUrl || null, messageType || 'text'
    ])

    return result.rows[0]
  },


  // =====================================
  // MARK MESSAGES AS DELIVERED
  // ======================================
  markDelivered: async ({ conversationId, userId }) => {
    const markDeliveredQuery = `
          UPDATE messages
          SET delivered_at = CURRENT_TIMESTAMP
          WHERE conversation_id = $1
          AND sender_id != $2
          AND delivered_at IS NULL
          AND is_deleted = false
        `;

    await dbQuery(markDeliveredQuery, [conversationId, userId])
  },


  // =====================================
  // MARK MESSAGES AS READ — transaction
  // ======================================
  markRead: async ({ conversationId, userId }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE messages
         SET read_at = CURRENT_TIMESTAMP
         WHERE conversation_id = $1
         AND sender_id != $2
         AND read_at IS NULL
         AND is_deleted = false`,
        [conversationId, userId]
      );

      await client.query(
        `UPDATE conversation_participants
         SET last_read_at = CURRENT_TIMESTAMP
         WHERE conversation_id = $1
         AND user_id = $2`,
        [conversationId, userId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  // =====================================
  // DELETE MESSAGE - soft delete
  // ======================================
  deleteMessage: async ({ messageId, senderId }) => {
    const deleteMessageQuery = `
          UPDATE messages
          SET is_deleted = true,
              content = null,
              media_url = null
          WHERE id = $1
          AND sender_id = $2
          RETURNING *
        `;

    const result = await dbQuery(deleteMessageQuery, [messageId, senderId])
    return result.rows[0] || null
  },

  // =====================================
  // GET OTHER PARTICIPANT IN CONVERSATION
  // ======================================
  getOtherParticipant: async ({ conversationId, userId }) => {
    const otherParticipantQuery = `
          SELECT user_id FROM conversation_participants
          WHERE conversation_id = $1
          AND user_id != $2
        `;

    const result = await dbQuery(otherParticipantQuery, [conversationId, userId])
    return result.rows[0]?.user_id || null
  },
}


module.exports = {
  MessageModel,
  createMessagesTable
}