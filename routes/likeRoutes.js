const express = require('express');
const { getUserLikes, likePost, unlikePost, getPostLikes, likeComment, unlikeCommnent, unlikeComment, getCommentLikes } = require('../controllers/likeController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Like routes


/**
 *  @swagger
 *  /api/likes/posts/{postId}:
 *    get:
 *      summary: Like a post
 *      tags: [Likes]
 *      security: 
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: postId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Post liked successfully
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
 *                      example: Post liked successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        like:
 *                          $ref: '#/components/schemas/Like'
 *          404:
 *            description: Post not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          400:
 *            description: You have already liked this post
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.post('/posts/:postId', protect, likePost);


/**
 *  @swagger
 *  /api/likes/posts/{postId}:
 *    delete:
 *      summary: Unlike a post
 *      tags: [Likes]
 *      security: 
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: postId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Post unliked successfully
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
 *                      example: Post unliked successfully
 *          404:
 *            description: Post not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          400:
 *            description: You have not liked this post
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.delete('/posts/:postId', protect, unlikePost);


/**
 *  @swagger
 *  /api/likes/posts/{postId}/users:
 *    get:
 *      summary: Get all likes by post
 *      tags: [Likes]
 *      security: 
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: postId
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
 *            description: Likes fetched successfully
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
 *                      example: Likes fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        likes:
 *                          type: array
 *                          items:
 *                            type: object
 *                            properties:
 *                              id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              username: 
 *                                type: string
 *                                example: Olawale Adisa
 *                              avatar_url: 
 *                                type: string
 *                                example: www.image.com/1
 *                              is_verified:
 *                                type: boolean
 *                                example: true
 *                              liked_at:
 *                                type: string
 *                                example: 2026-03-01T00:00:00.000Z
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
router.get('/posts/:postId/users', protect, getPostLikes);


/**
 *  @swagger
 *  /api/likes/comments/{commentId}:
 *    post:
 *      summary: Like a comment
 *      tags: [Likes]
 *      security: 
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: commentId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Comment liked successfully
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
 *                      example: Comment liked successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        like:
 *                          $ref: '#/components/schemas/Comment'
 *          404:
 *            description: Comment not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          400:
 *            description: You have already liked this comment
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.post('/comments/:commentId', protect, likeComment);

/**
 *  @swagger
 *  /api/likes/comments/{commentId}:
 *    delete:
 *      summary: Unlike a comment
 *      tags: [Likes]
 *      security: 
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: commentId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Comment unliked successfully
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
 *                      example: Comment unliked successfully
 *          404:
 *            description: Comment not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          400:
 *            description: You have not liked this comment
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.delete('/comments/:commenttId', protect, unlikeComment);


/**
 *  @swagger
 *  /api/likes/comments/{commentId}/users:
 *    get:
 *      summary: Get all likes by comment
 *      tags: [Likes]
 *      security: 
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: commentId
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
 *            description: Likes fetched successfully
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
 *                      example: Likes fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        likes:
 *                          type: array
 *                          items:
 *                            type: object
 *                            properties:
 *                              id: 
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              username: 
 *                                type: string
 *                                example: Olawale Adisa
 *                              avatar_url: 
 *                                type: string
 *                                example: www.image.com/1
 *                              is_verified:
 *                                type: boolean
 *                                example: true
 *                              liked_at:
 *                                type: string
 *                                example: 2026-03-01T00:00:00.000Z
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
router.get('/comments/:commentId/users', protect, getCommentLikes)

/**
 *  @swagger
 *  /api/likes/users/{userId}:
 *    get:
 *      summary: Get all posts liked by user
 *      tags: [Likes]
 *      security: []
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
 *            description: Likes fetched successfully
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
 *                      example: User likes fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        likes:
 *                          type: array
 *                          items:
 *                            type: object
 *                            properties:
 *                              id:
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              post_id:
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              user_id:
 *                                type: string
 *                                example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                              username:
 *                                type: string
 *                                example: olawaleadisa
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 */
router.get('/users/:userId', getUserLikes);

module.exports = router;