const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getFollowers, getFollowing, getFollowCount, checkFollow, follow, unfollow } = require('../controllers/followController');
const router = express.Router();


// Follow routes

/**
 *  @swagger
 *  /api/follows/{userId}/follow:
 *    post:
 *      summary: Follow a user
 *      tags: [Follows]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: userId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          201:
 *            description: User followed successfully
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
 *                      example: You are now following Ola
 *                    data:
 *                      type: object
 *                      properties:
 *                        follow:
 *                          $ref: '#/components/schemas/Follow'
 *          400:
 *            description: Already following or cannot follow yourself  
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
router.post('/:userId/follow', protect, follow);


/**
 *  @swagger
 *  /api/follows/{userId}/follow:
 *    delete:
 *      summary: Unfollow a user
 *      tags: [Follows]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: userId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: User unfollowed successfully
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
 *                      example: You have unfollowed Ola
 *          400:
 *            description: Not following or cannot unfollow yourself  
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
router.delete('/:userId/follow', protect, unfollow);

/**
 *  @swagger
 *  /api/users/{userId}/followers:
 *    get:
 *      summary: Get all followers
 *      tags: [Follows]
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
 *            description: Followers fetched successfully
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
 *                      example: Followers fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        followers:
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
 *                              followed_at:
 *                                type: string
 *                                example: 2026-03-01T00:00:00.000Z
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 *          404:
 *            description: User not found 
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/:userId/followers', getFollowers);

/**
 *  @swagger
 *  /api/users/{userId}/following:
 *    get:
 *      summary: Get all users a user is following
 *      tags: [Follows]
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
 *            description: Following fetched successfully
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
 *                      example: Following fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        following:
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
 *                              followed_at:
 *                                type: string
 *                                example: 2026-03-01T00:00:00.000Z
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 *          404:
 *            description: User not found 
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/:userId/following', getFollowing);

/**
 *  @swagger
 *  /api/follows/{userId}/count:
 *    get:
 *      summary: Get all followers and following count
 *      tags: [Follows]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: userId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Follow count fetched successfully
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
 *                      example: Follow count fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        user_id: 
 *                          type: string
 *                          example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *                        followersCount: 
 *                          type: integer
 *                          example: 100
 *                        followingCount: 
 *                          type: integer
 *                          example: 10
 *          404:
 *            description: User not found 
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/:userId/count', getFollowCount);


/**
 *  @swagger
 *  /api/follows/{userId}/check:
 *    get:
 *      summary: Check if current user is following another user
 *      tags: [Follows]
 *      security: 
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: userId
 *          required: true
 *          schema:
 *            type: string
 *            example: b6727d34-e1d8-4bb4-a603-ba366a405b1f
 *      responses:
 *          200:
 *            description: Follow check successfully
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    success:
 *                      type: boolean
 *                      example: true
 *                    data:
 *                      type: object
 *                      properties:
 *                        following: 
 *                          type: boolean
 *                          example: true
 *          401:
 *            description: Not authorized 
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/:userId/check', protect, checkFollow);


module.exports = router;