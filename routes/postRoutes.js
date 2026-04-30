const express = require('express');
const { createPost, getAllPosts, getUserPosts, getPost, updatePost, deletePost } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { likePost, unlikePost, getPostLikes, checkLike } = require('../controllers/likeController');
const { addComment, getPostComments } = require('../controllers/commentController');
const router = express.Router()


// Post routes

/**
 *  @swagger
 *  /api/posts:
 *    post:
 *      summary: Create a new post
 *      tags: [Posts]
 *      security:
 *        - bearerAuth: []
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
 *                  example: This is my first post content
 *                media_urls:
 *                  type:  array
 *                  items:
 *                    type: string
 *                    example: [https://example.com/image.jpg]
 *                media_type:
 *                  type: string
 *                  example: image
 *      responses:
 *          201:
 *            description: Post created successfully
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
 *                      example: Post created successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        post:
 *                          $ref: '#/components/schemas/Post'    
 *          401:
 *            description: Not authorized
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error'     
 */
router.post('/', protect, createPost);

/**
 *  @swagger
 *  /api/posts:
 *    get:
 *      summary: Get all posts
 *      tags: [Posts]
 *      security: []
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
 *                      example: Posts fetched successfully
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
 */
router.get('/', getAllPosts);


/**
 *  @swagger
 *  /api/posts/user/{userId}:
 *    get:
 *      summary: Get all posts by a specific user
 *      tags: [Posts]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: userId
 *          required: true 
 *          schema:
 *            type: integer
 *            example: 1
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
 *                      example: Posts fetched successfully
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
 *             description: User not found
 *             content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error'     
 */
router.get('/user/:userId', getUserPosts);


/**
 *  @swagger
 *  /api/posts/{postId}:
 *    get:
 *      summary: Get a single post
 *      tags: [Posts]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: postId
 *          required: true
 *          schema:
 *            type: integer
 *            example: 1
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
 *                      example: Post fetched successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        post:
 *                          $ref: '#/components/schemas/Post'
 *          401:
 *            description: Post not found
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error'     
 */
router.get('/:postId', getPost);

/**
 *  @swagger
 *  /api/posts/{postId}:
 *    put:
 *      summary: Update a post
 *      tags: [Posts]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: postId
 *          required: true
 *          schema:
 *            type: integer
 *            example: 1
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                content:
 *                  type: string
 *                  example: This is my first post content
 *      responses:
 *          200:
 *            description: Posts updated successfully
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
 *                      example: Post updated successfully
 *                    data:
 *                      type: object
 *                      properties:
 *                        post:
 *                          $ref: '#/components/schemas/Post'
 *          403:
 *            description: Not authorized to update this post
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error'   
 *          404:
 *            description: Post not found
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error'   
 */
router.put('/:postId', protect, updatePost);

/**
 *  @swagger
 *  /api/posts/{postId}:
 *    delete:
 *      summary: Delete a post
 *      tags: [Posts]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: postId
 *          required: true
 *          schema:
 *            type: integer
 *            example: 1
 *      responses:
 *          200:
 *            description: Posts deleted successfully
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
 *                      example: Post deleted successfully
 *          403:
 *            description: Not authorized to delete this post
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error'   
 *          404:
 *            description: Post not found
 *            content:
 *               application/json:
 *                 schema:
 *                   $ref: '#/components/schemas/Error'   
 */
router.delete('/:postId', protect, deletePost);



module.exports = router;