const express = require('express');
const { register, login, getProfile, updateProfile, deleteProfile, logout, refreshToken, verifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const slidingLimiter = require('../config/slidingRateLimit');
const { registerLimiter, loginLimiter } = require('../middleware/rateLimiterMiddleware');

const router = express.Router();



// Public 
/**
 *  @swagger
 *  tags:
 *    name: Auth
 *    description: Authentication endpoints
 */

/**
 *  @swagger
 *  /api/auth/register:
 *    post:
 *      summary: Register a new user
 *      tags: [Auth]
 *      security: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - username
 *                - fullName
 *                - email
 *                - password
 *              properties:
 *                username:
 *                  type: string
 *                  example: olawaleadisa
 *                fullName:
 *                  type: string
 *                  example: Olawale Adisa
 *                email:
 *                  type: string
 *                  example: adisaolawale10@gmail.com
 *                password:
 *                  type: string
 *                  example: Password@123
 *      responses:
 *          201:
 *            description: User registered successfully 
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
 *                      example: successful
 *                    data:
 *                      type: object
 *                      properties:
 *                        user:
 *                          $ref: '#/components/schemas/User'
 *
 *          401:
 *            description: Invalid or expired token
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *  */
router.post('/register',
    registerLimiter,
    register
);


/**
 *  @swagger
 *  /api/auth/login:
 *    post:
 *      summary: Login user
 *      tags: [Auth]
 *      security: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - email
 *                - password
 *              properties:
 *                email:
 *                  type: string
 *                  example: adisaolawale10@gmail.com
 *                password:
 *                  type: string
 *                  example: Password@123
 *      responses:
 *          200:
 *            description: Login Successfully
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
 *                      example: successful
 *                    data:
 *                      type: object
 *                      properties:
 *                        user:
 *                          $ref: '#/components/schemas/User'
 *                        accessToken:
 *                          type: string
 *                          example: eyjhGciJiUzI1NiIs...
 *                        refreshToken:
 *                          type: string
 *                          example: eyjhGciJiUzI1NiIs...    
 *          401:
 *            description: Invalid credentials
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, login); // add LoginLimiter

/**
 *  @swagger
 *  /api/auth/refresh:
 *    post:
 *      summary: Refresh JWT token
 *      tags: [Auth]
 *      security: 
 *        - bearerAuth: []
 *      responses:
 *          200:
 *            description: Token refreshed successfully
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
 *                      example: successful
 *                    data:
 *                      type: object
 *                      properties:
 *                        accessToken:
 *                          type: string
 *                          example: eyjhGciJiUzI1NiIs...
 *                        refreshToken:
 *                          type: string
 *                          example: eyjhGciJiUzI1NiIs...
 *          401:
 *            description: Invalid or expired token
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.post('/refresh', refreshToken)




/**
 *  @swagger
 *  /api/auth/verify-email/{token}:
 *    post:
 *      summary: Verify email address
 *      tags: [Auth]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: token
 *          required: true
 *          schema:
 *            type: string
 *      responses:
 *          200:
 *            description: Email verification successfully
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
 *                      example: successful
 *          400:
 *            description: Invalid or expired verification token
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 */
router.post('/verify-email/:token', verifyEmail)

/**
 *  @swagger
 *  /api/auth/forgot-password:
 *    post:
 *      summary: Request password reset email
 *      tags: [Auth]
 *      security: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - email
 *              properties:
 *                email:
 *                  type: string
 *                  example: adisaolawale10@gmail.com
 *      responses:
 *          200:
 *            description: Reset email sent if account exists   
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
 *                      example: Reset email sent if account exists     
 */
router.post('/forgot-password', forgotPassword);


/**
 *  @swagger
 *  /api/auth/reset-password/{token}:
 *    post:
 *      summary: Reset password with token
 *      tags: [Auth]
 *      security: []
 *      parameters:
 *        - in: path
 *          name: token
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - password
 *              properties:
 *                password:
 *                  type: string
 *                  example: Password@123
 *      responses:
 *          200:
 *            description: Password reset successfully   
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
 *                      example: Password reset successfully
 *          400:
 *            description: Invalid or expired verification token
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.post('/reset-password/:token', resetPassword);

/**
 *  @swagger
 *  /api/auth/profile:
 *    delete:
 *      summary: Delete user account
 *      tags: [Auth]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *          200:
 *            description: User deleted successfully
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
 *                      example: User deleted successfully  
 *          401:
 *            description: Not authorized
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.delete('/profile', protect, deleteProfile);

/**
 *  @swagger
 *  /api/auth/logout:
 *    post:
 *      summary: Logout and revoke refresh token
 *      tags: [Auth]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *          200:
 *            description: Logged out successfully
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
 *                      example: Logged out successfully    
 *          401:
 *            description: Not authorized
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'     
 */
router.post('/logout', protect, logout);

module.exports = router;