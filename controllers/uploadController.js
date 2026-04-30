// src/modules/uploads/upload.controller.js
const UploadService = require('../services/uploadServices')
const { UploadModel } = require('../models/uploadModel')
const { UserModel }= require('../models/userModel')
const AppError = require('../utils/AppError')
const { successResponse } = require('../utils/response')

// @desc     Upload user avatar
// @route    POST /api/uploads/avatar
// @access   Private
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please provide an image file', 400))
    }


    // Upload to Cloudinary
    const result = await UploadService.uploadAvatar({
      fileBuffer: req.file.buffer,
      userId: req.user.id,
    })

    // Save record to uploads table
    await UploadModel.create({
      userId: req.user.id,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: 'image',
      folder: 'avatars',
    })

    // Update user avatar_url in database
    await UserModel.updateAvatar(req.user.id, result.secure_url)

    return successResponse(res, {
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: result.secure_url,
      },
    })
  } catch (error) {
    next(error)
  }
}


// @desc     Upload image for a post
// @route    POST /api/uploads/post-image
// @access   Private
exports.uploadPostImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please provide an image file', 400))
    }

    const result = await UploadService.uploadPostImage({
      fileBuffer: req.file.buffer,
      userId: req.user.id,
    })

    // Save main image record
    await UploadModel.create({
      userId: req.user.id,
      url: result.url,
      publicId: result.publicId,
      resourceType: 'image',
      folder: 'posts',
    })

    return successResponse(res, {
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        publicId: result.publicId,
      },
      statusCode: 201,
    })
  } catch (error) {
    next(error)
  }
}

// @desc     Upload image for a message
// @route    POST /api/uploads/message-image
// @access   Private
exports.uploadMessageImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please provide an image file', 400))
    }

    const result = await UploadService.uploadMessageImage({
      fileBuffer: req.file.buffer,
      userId: req.user.id,
    })

    await UploadModel.create({
      userId: req.user.id,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: 'image',
      folder: 'messages',
    })

    return successResponse(res, {
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
      statusCode: 201,
    })
  } catch (error) {
    next(error)
  }
}

// @desc     Delete an uploaded file
// @route    DELETE /api/uploads
// @access   Private
exports.deleteFile = async (req, res, next) => {
  try {
    const { publicId } = req.body

    if (!publicId) {
      return next(new AppError('Public ID is required', 400))
    }

    // Check upload belongs to this user
    const upload = await UploadModel.findByPublicId(publicId)

    if (!upload) {
      return next(new AppError('File not found', 404))
    }

    if (upload.user_id !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You cannot delete this file', 403))
    }

    // Delete from Cloudinary
    await UploadService.deleteFile(publicId)

    // Delete from database
    await UploadModel.delete(publicId)

    return successResponse(res, {
      message: 'File deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

// @desc     Get a signed URL for a private file
// @route    GET /api/uploads/signed-url/:publicId
// @access   Private
exports.getSignedUrl = async (req, res, next) => {
  try {
    const { publicId } = req.params

    const upload = await UploadModel.findByPublicId(publicId)

    if (!upload) {
      return next(new AppError('File not found', 404))
    }

    // Only the owner can get a signed URL for their file
    if (upload.user_id !== req.user.id) {
      return next(new AppError('You cannot access this file', 403))
    }

    const signedUrl = UploadService.generateSignedUrl(publicId)

    return successResponse(res, {
      data: { signedUrl },
    })
  } catch (error) {
    next(error)
  }
}