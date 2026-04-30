const jwt = require('jsonwebtoken');

const { redisClient } = require('../config/redis');
const { UserModel } = require('../models/userModel');
const AppError = require('../utils/AppError');
const { SessionModel } = require('../models/sessionModel');
const { successResponse } = require('../utils/response');

const protect = async (req, res, next) => {
    try {
        let token;

        // Check if token exists in headers
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
            console.log(token)
        }

        console.log(token)
        // If no token
        if (!token) {
            return next(new AppError('Unauthorized', 401));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        //Check session
        const session = await SessionModel.getSessionById(decoded.sessionId);

        if (!session || !session.is_valid) {
            return next(new AppError('Session expired', 401));
        }


        // If not in cache get from database
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            return next(new AppError('Not authorized', 401));
        }


        // Set user in request
        req.user = { sessionId: decoded.sessionId, ...user };
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Not authorized', 401));
        }

        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Not authorized. Token expired', 401));
        }

        next(error)
    }
}


// Role based access control
const authorized = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError(`Role '${req.user.role}' is not authorized to access this route`, 401));
        }
    }
}

module.exports = { protect, authorized }