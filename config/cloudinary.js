// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2; // Add .v2 here

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test connection on startup
async function connectCloudinary() {
  try {
    await cloudinary.api.ping()
    console.log('Cloudinary connected successfully')
  } catch (error) {
    console.error('Cloudinary connection failed:', error)
    throw error
  }
}

module.exports = { cloudinary, connectCloudinary }