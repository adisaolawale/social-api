const express = require('express');
const { getComment, getUserComments, updateComment, deleteComment, getPostComments, getCommentReplies, createComment, replyToComment } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();


// Comment routes

/**
 *  @swagger
 *  /api/comments/post/{postId}:
 *    get:
 *      summary: Get top level comments for a post
 *      tags: [Comments]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: postId
 *          required: true
 *          schema:
 *            type: string
 *            example: f47ac10b-58cc-4372-a567-0e02b2c3d479
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
 *            description: Comments fetched successfully
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
 *                      example: Comments fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        comments:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Comment'
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 *          404:
 *            description: Post not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/post/:postId', protect, getPostComments);


/**
 *  @swagger
 *  /api/comments/{commentId}/replies:
 *    get:
 *      summary: Get all replies for a comment (paginated)
 *      tags: [Comments]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: commentId
 *          required: true
 *          schema:
 *            type: string
 *            example: f47ac10b-58cc-4372-a567-0e02b2c3d479
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
 *            description: Comments fetched successfully
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
 *                      example: Replies fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        replies:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Comment'
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 *          404:
 *            description: Comment not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/:commentId/replies', getCommentReplies);

/**
 *  @swagger
 *  /api/comments/{commentId}:
 *    get:
 *      summary: Get a single comment
 *      tags: [Comments]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: commentId
 *          required: true
 *          schema:
 *            type: string
 *            example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *      responses:
 *          200:
 *            description: Comment fetched successfully
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
 *                      example: Comment fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        comment:
 *                          $ref: '#/components/schemas/Comment'
 *          404:
 *            description: Comment not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.get('/:commentId', getComment);


/**
 *  @swagger
 *  /api/comments/post/{postId}:
 *    post:
 *      summary: Create a top level comments on a post
 *      tags: [Comments]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: postId
 *          required: true
 *          schema:
 *            type: string
 *            example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *      responses:
 *          200:
 *            description: Comment added successfully
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
 *                      example: Comment added successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        comment:
 *                          $ref: '#/components/schemas/Comment'
 *          404:
 *            description: Post not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.post('/post/:postId', protect, createComment);



/**
 *  @swagger
 *  /api/comments/{commentId}/replies:
 *    post:
 *      summary: Reply to a comment
 *      tags: [Comments]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: commentId
 *          required: true
 *          schema:
 *            type: string
 *            example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *      responses:
 *          201:
 *            description: Reply added successfully
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
 *                      example: Reply added successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        reply:
 *                          $ref: '#/components/schemas/Comment'
 *          404:
 *            description: Comment not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.post('/:commentId/replies', protect, replyToComment);

/**
 *  @swagger
 *  /api/comments/{commentId}:
 *    patch:
 *      summary: Edit a comment - owner only
 *      tags: [Comments]
 *      security: 
 *        -bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: commentId
 *          required: true
 *          schema:
 *            type: string
 *            example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - content
 *              properties:
 *                content:
 *                  type: string
 *                  example: Updated comment content
 *      responses:
 *          200:
 *            description: Comment updated successfully
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
 *                      example: Comment updated successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        comment:
 *                          $ref: '#/components/schemas/Comment'
 *          403:
 *            description: Not authorized to edit this comment
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error' 
 *          404:
 *            description: Comment not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.patch('/:commentId', protect, updateComment);


/**
 *  @swagger
 *  /api/comments/{commentId}:
 *    delete:
 *      summary: Delete a comment
 *      tags: [Comments]
 *      security: 
 *        -bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: commentId
 *          required: true
 *          schema:
 *            type: string
 *            example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *      responses:
 *          200:
 *            description: Comment deleted successfully
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
 *                      example: Comment deleted successfully
 *          401:
 *            description: Not authorized
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          403:
 *            description: Not authorized to delete this comment
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          404:
 *            description: Comment not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.delete('/:commentId', protect, deleteComment);

module.exports = router;