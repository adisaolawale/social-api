const express = require('express');
const { getProfile, getMe, updateProfile, changePassword, searchUsers, getFollowers, getFollowing, getUserPosts, deactivateAccount } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router()


/**
 *  @swagger
 *  /api/users/search:
 *    get:
 *      summary: Search users
 *      tags: [User]
 *      security: []
 *      parameters:
 *        - in: query
 *          name: q
 *          required: true
 *          description: Search term (min 2 characters)
 *          schema:
 *            type: string
 *            example: wale
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
 *            description: Searched items fetched successfully
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
 *                      example: Searched items fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        users:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/User'
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 *          400:
 *            description: Search term is required
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.get('/search', searchUsers);


/**
 *  @swagger
 *  /api/users/me:
 *    get:
 *      summary: Get current user profile
 *      tags: [User]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *          200:
 *            description: Profile fetched successfully
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
 *                      example: Profile fetched successful
 *                    data:
 *                      type: object
 *                      properties:
 *                        user:
 *                          $ref: '#/components/schemas/User'   
 *          404:
 *            description: User not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.get('/me', protect, getMe);


/**
 *  @swagger
 *  /api/users/me:
 *    patch:
 *      summary: Update your profile
 *      tags: [User]
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                full_name:
 *                  type: string
 *                  example: Olawale Adisa
 *                bio:
 *                  type: string
 *                  example: Love reading
 *                website:
 *                  type: string
 *                  example: olawaleadisa.com
 *                location:
 *                  type: string
 *                  example: Lagos, Nigeria
 *      responses:
 *          200:
 *            description: Profile updated successfully
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
 *                      example: Profile fetched successful
 *                    data:
 *                      type: object
 *                      properties:
 *                        user:
 *                          $ref: '#/components/schemas/User'   
 *          404:
 *            description: User not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.patch('/me', protect, updateProfile);



/**
 *  @swagger
 *  /api/users/me/password:
 *    patch:
 *      summary: Change your password
 *      tags: [User]
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required: true
 *              properties:
 *                currentPassword:
 *                  type: string
 *                  example: Password@123
 *                newPassword:
 *                  type: string
 *                  example: newPassword@123
 *      responses:
 *          200:
 *            description: Profile updated successfully
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
 *                      example: Password changed successfully
 *          404:
 *            description: User not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'   
 *          400:
 *            description: New password cannot be the same as your current password
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          401:
 *            description: Current password is incorrect
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.patch('/me/password', protect, changePassword);


/**
 *  @swagger
 *  /api/users/me:
 *    delete:
 *      summary: Deactivate account
 *      tags: [User]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *          200:
 *            description: Account deactivated successfully
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
 *                      example: Password changed successfully  
 */
router.delete('/me', protect, deactivateAccount);


/**
 *  @swagger
 *  /api/users/{username}:
 *    get:
 *      summary: Get a user profile
 *      tags: [User]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: username
 *          required: true
 *          schema:
 *            type: string
 *      responses:
 *          200:
 *            description: Profile fetched successfully
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
 *                      example: Profile fetched successful
 *                    data:
 *                      type: object
 *                      properties:
 *                        user:
 *                          $ref: '#/components/schemas/User'   
 *          404:
 *            description: Not authorized
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.get('/:username', getProfile);


/**
 *  @swagger
 *  /api/users/{username}/posts:
 *    get:
 *      summary: Get all posts by a specific user
 *      tags: [User]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: username
 *          required: true
 *          schema:
 *            type: string
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
 *            description: Posts fetched successfully
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
 *                      example: Posts fetched successful
 *                    data:
 *                      type: object
 *                      properties:
 *                        posts:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Post'
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'   
 *          404:
 *            description: User not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *          403:
 *            description: This account is private
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'      
 */

/**
 *  @swagger
 *  /api/users/{username}/posts:
 *    get:
 *      summary: Get all posts by a specific user
 *      tags: [User]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: username
 *          required: true
 *          schema:
 *            type: string
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
 *                        posts:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Post'
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
 *          403:
 *            description: This account is private
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'   
 */
router.get('/:username/posts', getUserPosts);

/**
 *  @swagger
 *  /api/users/{username}/followers:
 *    get:
 *      summary: Get user followers
 *      tags: [User]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: username
 *          required: true
 *          schema:
 *            type: string
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
 *                            $ref: '#/components/schemas/Follow'
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
router.get('/:username/followers', getFollowers);



/**
 *  @swagger
 *  /api/users/{username}/following:
 *    get:
 *      summary: Get user following
 *      tags: [User]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: username
 *          required: true
 *          schema:
 *            type: string
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
 *                        user:
 *                          $ref: '#/components/schemas/Follow'   
 *          404:
 *            description: User not found
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.get('/:username/following', getFollowing);

module.exports = router;