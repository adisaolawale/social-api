const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, getUnreadCount, markAllRead, markOneRead, deleteOne } = require('../controllers/notificationController');

const router = express.Router();

/**
 *  @swagger 
 *  tags:
 *    name: Notifications
 *    description: User notifications
 */


/**
 *  @swagger
 *  /api/notifications:
 *    get:
 *      summary: Get all notifications for logged in user
 *      tags: [Notifications]
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
 *            description: List of notifications
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
 *                      example: Notifications fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        notifications:
 *                          type: array
 *                          items:
 *                            type: object
 *                            properties:
 *                              id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              enitty_id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              message: 
 *                                type: string
 *                                example: New post from danny
 *                              type: 
 *                                type: string
 *                                example: like_post
 *                              entity_type: 
 *                                type: string
 *                                example: post
 *                              is_read: 
 *                                type: boolean
 *                                example: false
 *                              created_at: 
 *                                type: string
 *                                example: 2026-03-01T00:00:00.000Z
 *                              sender_id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              sender_username: 
 *                                type: string
 *                                example: olawaleadisa
 *                              sender_full_name: 
 *                                type: string
 *                                example: Olawale Adisa
 *                              sender_avatar: 
 *                                type: string
 *                                example: www.image.com/1
 *                              sender_is_verified:
 *                                type: boolean
 *                                example: true
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination' 
 */
router.get('/', protect, getNotifications);



/**
 *  @swagger
 *  /api/notifications/unread-count:
 *    get:
 *      summary: Get unread notification count
 *      tags: [Notifications]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *          200:
 *            description: Unread count
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
 *                      example: Unread count fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        unreadCount:
 *                          type: integer
 *                          example: 10 
 */
router.get('/unread-count', protect, getUnreadCount);



/**
 *  @swagger
 *  /api/notifications/read-all:
 *    patch:
 *      summary: Mark all notifications as read
 *      tags: [Notifications]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *          200:
 *            description: All marked as read
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
 *                      example: All notifications marked as read 
 */
router.patch('/read-all', protect, markAllRead);



/**
 *  @swagger
 *  /api/notifications/{notificationId}/read:
 *    patch:
 *      summary: Mark one notification as read
 *      tags: [Notifications]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: notificationId
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Notification marked as read
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
 *                      example: Notification marked as read
 *                    data:
 *                      type: object
 *                      properties:
 *                        notification:
 *                          $ref: '#/components/schemas/Notification' 
 *          404:
 *            description: Notification not found
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error' 
 */
router.patch('/:notificationId/read', protect, markOneRead);




/**
 *  @swagger
 *  /api/notifications/{notificationId}:
 *    delete:
 *      summary: Delete a notification
 *      tags: [Notifications]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: notificationId
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Notification deleted
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
 *                      example: Notification deleted 
 *          404:
 *            description: Notification not found
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error' 
 */
router.delete('/:notificationId', protect, deleteOne);

module.exports = router