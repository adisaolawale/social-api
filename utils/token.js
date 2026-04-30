const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT Token
const generateAccessToken = (id, sessionId) => {
    return jwt.sign({ id, sessionId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    });
} 

// Generate JWT Refresh Token 
const generateRefreshToken = (id, sessionId) => {
    return jwt.sign({ id, sessionId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
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