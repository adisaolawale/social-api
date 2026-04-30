const express = require('express');
const { sendMessageValidator } = require('../validators/messageValidator');
const { protect } = require('../middleware/authMiddleware');
const { getConversations, getOrCreateConversation, getMessages, sendMessage, deleteMessage } = require('../controllers/messageController');
const router = express.Router();


/**
 *  @swagger
 *  tags:
 *    name: Messages
 *    description: Direct messaging
 */


/**
 *  @swagger
 *  /api/messages/conversations:
 *    get:
 *      summary: Get all conversations for logged in user
 *      tags: [Messages]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: query
 *          name: page
 *          schema:
 *            type: integer
 *            example: 1
 *        - in: query
 *          name: limit
 *          schema:
 *            type: integer
 *            example: 10
 *      responses:
 *          200:
 *            description: List of conversation with last message preview
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    success:
 *                      type: boolean
 *                      example: true
 *                    message:
 *                      type: string
 *                      example: Timeline posts fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        conversations:
 *                          type: array
 *                          items:
 *                            type: object
 *                            properties:
 *                              conversation_id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              other_user_id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              other_username: 
 *                                type: string
 *                                example: olawaleadisa
 *                              other_full_name: 
 *                                type: string
 *                                example: Olawale Adisa
 *                              other_avatar_url: 
 *                                type: string
 *                                example: www.image.com/1
 *                              other_is_verified: 
 *                                type: boolean
 *                                example: true
 *                              last_message_id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              last_message: 
 *                                type: string
 *                                example: Text me back
 *                              last_message_type: 
 *                                type: string
 *                                example: text
 *                              sender_id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              last_message_at: 
 *                                type: string
 *                                example: 2026-03-01T00:00:00.000Z
 *                              last_message_deleted: 
 *                                type: boolean
 *                                example: false
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 */
router.get('/conversations', protect, getConversations);



/**
 *  @swagger
 *  /api/messages/conversations/user/{userId}:
 *    post:
 *      summary: Get or create conversation with user
 *      tags: [Messages]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: userId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *        - in: query
 *          name: page
 *          schema:
 *            type: integer
 *            example: 1
 *        - in: query
 *          name: limit
 *          schema:
 *            type: integer
 *            example: 10
 *      responses:
 *          200:
 *            description: Conversation ID returned
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    success:
 *                      type: boolean
 *                      example: true
 *                    message:
 *                      type: string
 *                      example: Conversation created or fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        conversationId:
 *                          type: string
 *                          example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *          400:
 *            description: You cannot message yourself
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          404:
 *            description: User not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'   
 */
router.post('/conversations/user/:userId', protect, getOrCreateConversation);



/**
 *  @swagger
 *  /api/messages/conversations/{conversationId}:
 *    get:
 *      summary: Get messages in a conversation
 *      tags: [Messages]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: conversationId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *        - in: query
 *          name: page
 *          schema:
 *            type: integer
 *            example: 1
 *        - in: query
 *          name: limit
 *          schema:
 *            type: integer
 *            example: 10
 *      responses:
 *          200:
 *            description: List of messages
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    success:
 *                      type: boolean
 *                      example: true
 *                    message:
 *                      type: string
 *                      example: Messages fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        messages:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Message'
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 *          400:
 *            description: Conversation not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'           
 */
router.get('/conversations/:conversationId', protect, getMessages);



/**
 *  @swagger
 *  /api/messages/conversations/{conversationId}:
 *    post:
 *      summary: Send a message - REST fallback
 *      tags: [Messages]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: conversationId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *        - in: query
 *          name: page
 *          schema:
 *            type: integer
 *            example: 1
 *        - in: query
 *          name: limit
 *          schema:
 *            type: integer
 *            example: 10
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required: [content]
 *              properties:
 *                content:
 *                  type: string
 *                  example: Text me back
 *                messageType:
 *                  type: string
 *                  enum: [text, image, video]
 *      responses:
 *          201:
 *            description: Message sent
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    success:
 *                      type: boolean
 *                      example: true
 *                    message:
 *                      type: string
 *                      example: Messages sent
 *                    data:
 *                      type: object
 *                      properties:
 *                        message:
 *                          $ref: '#/components/schemas/Message'
 *          400:
 *            description: Conversation not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'           
 */
router.post('/conversations/:conversationId', protect, sendMessage);



/**
 *  @swagger
 *  /api/messages/{messageId}:
 *    delete:
 *      summary: Delete a message you sent
 *      tags: [Messages]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: messageId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          201:
 *            description: Message sent
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    success:
 *                      type: boolean
 *                      example: true
 *                    message:
 *                      type: string
 *                      example: Messages deleted 
 *          400:
 *            description: Message not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'           
 */
router.delete('/:messageId', protect, deleteMessage);


module.exports = router;
