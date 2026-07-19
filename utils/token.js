const dotenv = require('dotenv');
dotenv.config();

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT Token
// Better to add a safety check
const generateAccessToken = (id, sessionId) => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
    }
    console.log('JWT_ACCESS_SECRET loaded:', !!secret);
    return jwt.sign({ id, sessionId }, secret, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });
};

// Generate JWT Refresh Token 
const generateRefreshToken = (id, sessionId) => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }
    console.log('JWT_REFRESH_SECRET loaded:', !!secret);
    return jwt.sign({ id, sessionId }, secret, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    })
}

const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex")
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashToken
} 