// src/modules/uploads/upload.routes.js
const express = require('express')
const router = express.Router()
const uploadController = require('../controllers/uploadController')
const { protect } = require('../middleware/authMiddleware')

const upload = require('../config/multer')
const { uploadLimiter } = require('../middleware/rateLimiterMiddleware')

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: File upload management
 */

/**
 * @swagger
 * api/uploads/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Uploads]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema: 
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded, returns new URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Avatar uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatarUrl:
 *                       type: string
 */
router.post(
    '/avatar',
    protect,
    uploadLimiter,
    upload.single('image'),
    uploadController.uploadAvatar
)



/**
 * @swagger
 * api/uploads/post-image:
 *   post:
 *     summary: Upload image for a post
 *     tags: [Uploads]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded, returns URL and thumbnail URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Image uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     thumbnailUrl:
 *                       type: string
 *                     publicId:
 *                       type: string
 */
router.post(
    '/post-image',
    protect,
    uploadLimiter,
    upload.single('image'),
    uploadController.uploadPostImage
)

/**
 * @swagger
 * api/uploads/message-image:
 *   post:
 *     summary: Upload image for a message
 *     tags: [Uploads]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded, returns URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Image uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     publicId:
 *                       type: string
 */
router.post(
    '/message-image',
    protect,
    uploadLimiter,
    upload.single('image'),
    uploadController.uploadMessageImage
)

/**
 * @swagger
 * api/uploads:
 *   delete:
 *     summary: Delete an uploaded file
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publicId]
 *             properties:
 *               publicId:
 *                 type: string
 *     responses:
 *       200:
 *         description: File deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: File deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: File not found
 */
router.delete('/', protect, uploadController.deleteFile)

/**
 * @swagger
 * api/uploads/signed-url/{publicId}:
 *   get:
 *     summary: Get a signed URL for a private file
 *     tags: [Uploads]
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Signed URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     signedUrl:
 *                       type: string
 */
router.get(
    '/signed-url/:publicId',
    protect,
    uploadController.getSignedUrl
)

module.exports = router