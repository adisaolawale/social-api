// src/config/multer.js
const multer = require('multer')
const AppError = require('../utils/AppError')

// Store in memory not disk
// Sharp will process it before sending to Cloudinary
const storage = multer.memoryStorage()

function fileFilter(req, file, cb) {
  // Only allow images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new AppError('Only image files are allowed', 400), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
})

module.exports = upload