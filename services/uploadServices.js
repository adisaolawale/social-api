const sharp = require('sharp')
const { cloudinary } = require('../config/cloudinary')
const AppError = require('../utils/AppError')

const UploadService = {

  // =====================
  // UPLOAD AVATAR
  // Compress + resize to 400x400
  // Then upload to Cloudinary
  // =====================
  async uploadAvatar ({ fileBuffer, userId }) {
  try {
    // 1. Process with Sharp
    console.log(userId)
    const processedBuffer = await sharp(fileBuffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

      console.log('good1')

    // 2. Wrap the stream in a Promise
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          // Ensure the folder path is clean
          folder: `social-api/avatars/${userId}`,
          // Cloudinary often handles unique IDs automatically, 
          // but if you want custom ones:
          public_id: `avatar_${Date.now()}`, 
          resource_type: 'image',
          // You already resized with Sharp, but Cloudinary can 
          // do a final optimization pass here
          // transformation: [{ width: 400, height: 400, crop: 'fill' }],
        },
        (error, result) => {
          if (error) {
            return reject(new AppError(`Cloudinary Upload Error: ${error.message}`, 500));
          }
          resolve(result);
        }
      );

      console.log(processedBuffer)

      // Handle stream-specific errors (network timeouts, etc.)
      uploadStream.on('error', (err) => {
        reject(new AppError(`Stream Error: ${err.message}`, 500));
      });

      console.log('good2')

      // Send the buffer
      uploadStream.end(processedBuffer);

      console.log('finally')
    });
  } catch (err) {
    // Catch Sharp errors or unexpected crashes
    throw new AppError(err.message || 'Image processing failed', 400);
  }
},

  // =====================
  // UPLOAD COVER PHOTO
  // Resize to 1500x500 — banner dimensions
  // =====================
  async uploadCover({ fileBuffer, userId }) {
    const processedBuffer = await sharp(fileBuffer)
      .resize(1500, 500, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `social-api/covers/${userId}`,
          public_id: `cover_${Date.now()}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(new AppError('Upload failed', 500))
          else resolve(result)
        }
      ).end(processedBuffer)
    })
  },

  // =====================
  // UPLOAD POST IMAGE
  // Max 1080px wide — standard social media size
  // Also generate a thumbnail
  // =====================
  async uploadPostImage({ fileBuffer, userId }) {
    // Main image
    const mainBuffer = await sharp(fileBuffer)
      .resize(1080, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Thumbnail — 300px wide
    const thumbBuffer = await sharp(fileBuffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 70 })
      .toBuffer()

    const folder = `social-api/posts/${userId}`
    const publicId = `post_${Date.now()}`

    // Upload both in parallel
    const [mainResult, thumbResult] = await Promise.all([
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(new AppError('Upload failed', 500))
            else resolve(result)
          }
        ).end(mainBuffer)
      }),

      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `${folder}/thumbnails`,
            public_id: `${publicId}_thumb`,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(new AppError('Thumbnail upload failed', 500))
            else resolve(result)
          }
        ).end(thumbBuffer)
      }),
    ])

    return {
      url: mainResult.secure_url,
      thumbnailUrl: thumbResult.secure_url,
      publicId: mainResult.public_id,
      thumbPublicId: thumbResult.public_id,
    }
  },

  // =====================
  // UPLOAD MESSAGE IMAGE
  // =====================
  async uploadMessageImage({ fileBuffer, userId }) {
    const processedBuffer = await sharp(fileBuffer)
      .resize(800, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `social-api/messages/${userId}`,
          public_id: `msg_${Date.now()}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(new AppError('Upload failed', 500))
          else resolve(result)
        }
      ).end(processedBuffer)
    })
  },

  // =====================
  // DELETE FROM CLOUDINARY
  // Called when user changes avatar or deletes a post
  // =====================
  async deleteFile(publicId) {
    const result = await cloudinary.uploader.destroy(publicId)
    return result
  },

  // =====================
  // GENERATE SIGNED URL
  // For private or time-limited access to files
  // =====================
  generateSignedUrl(publicId, expiresInSeconds = 3600) {
    const timestamp = Math.round(Date.now() / 1000) + expiresInSeconds

    const signedUrl = cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      type: 'authenticated',
      expiration: timestamp,
    })

    return signedUrl
  },

}

module.exports = UploadService