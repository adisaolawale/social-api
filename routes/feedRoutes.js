const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTimeline, getExplore } = require('../models/feedModel');

const router = express.Router();

/**
 *  @swagger
 *  tags:
 *    name: Feed
 *    description: Timeline and explore feeds
 */

/**
 *  @swagger
 *  /api/feed/timeline:
 *    get:
 *      summary: Get all timeline feed - posts from followed users
 *      tags: [Feed]
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
 *            description: Timeline posts fetched successfully
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
 *                        posts:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Post'
 *                    meta:
 *                      type: object
 *                      properties:
 *                        pagination:
 *                          $ref: '#/components/schemas/Pagination'
 *          400:
 *            description: Limit cannot exceed 50
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/timeline', protect, getTimeline);


/**
 *  @swagger
 *  /api/feed/explore:
 *    get:
 *      summary: Get all explore feed - posts from followed users
 *      tags: [Feed]
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
 *            description: Explore posts fetched successfully
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
 *                      example: Explore posts fetched successfully
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
 *          400:
 *            description: Limit cannot exceed 50
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'  
 */
router.get('/explore', protect, getExplore);

module.exports = router