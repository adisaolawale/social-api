const logger = require("../config/logger");

const errorMiddleware = (err, req, res, nest) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // PostgreSQL duplicate key error
    if (err.code === '23505') {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }

    // PostgreSQL invalid input error
    if (err.code === '22P02') {
        statusCode = 400;
        message = 'Duplicate input syntax';
    }

    // PostgreSQL foreign key violation
    if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record does not exist';
    }

    // JWT error
    if (err.name === 'JsonWebTokenError') {
        statusCode = 400;
        message = 'Invalid token';
    }


    if (err.name === 'TokenExpiredError') {
        statusCode = 400;
        message = 'Token expired';
    }


    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        logger.error({
            statusCode,
            message,
            stack: err.stack,
        })
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorMiddleware