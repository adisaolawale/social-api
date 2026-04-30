const logger = require('../utils/logger')
const { errorResponse } = require('../utils/response')

function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500
    let message = err.message || 'Something went wrong'

    // ===================================
    // POSTGRESQL ERRORS
    // These come from pg driver - err.code isa PostgreSQL error code
    // ===================================

    // Unique constraint violation
    // Example - email already exist, duplicate username
    if (err.code === '23505') {
        statusCode = 409
        message = 'A record with that value already exists'
    }


    // foreign key violation
    // Example - trying to create a post for a user that does not exist
    if (err.code === '23503') {
        statusCode = 400
        message = 'Referenced record does not exists'
    }

    // Not null violation
    // Example - Inserting a row without a required field
    if (err.code === '23502') {
        statusCode = 400
        message = 'A required field is missing'
    }


    // Invalid input syntax
    // Example - passing a string where a UUID is expected
    if (err.code === '22P02') {
        statusCode = 400
        message = 'Invalid ID format'
    }


    // Check constraint violation
    // Example - role not in allowed values, or liking both post and comment
    if (err.code === '23514') {
        statusCode = 400
        message = 'Invalid value provided'
    }


    // ====================================
    // JWT ERRORS
    // These come from jsonwebtoken
    // ====================================

    // Token is malformed or tampered with
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401
        message = 'Invalid token. Please log in again'
    }


    // Token is valid but expired
    if (err.name === 'TokenExpiredError') {
        statusCode = 401
        message = 'Your session has expired. Please log in again'
    }


    // Token not yet valid - iat is in the future
    if (err.name === 'NotBeforeError') {
        statusCode = 401
        message = 'Token not yet active'
    }



    // ===================================
    // MULTER ERRORS
    // These come from file upload middleware
    // ===================================

    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400
        message = 'File is too large. Maximum size is 5MB.'
    }


    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400
        message = 'Unexpected file field. Use the correct field name.'
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
        statusCode = 400
        message = 'Too many file uploads at once.'
    }


    // ================================
    // SYNTAX ERROR
    // Happens when client sends malformed JSON body
    // Example - { "email": "test" - missing closing brace
    // ================================
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        statusCode = 400
        message = 'Invalid JSON in request body'
    }


    // =================================
    // LOGGING
    // Only log server errors (500+)
    // Client errors are the client's fault, no need to fill your logs
    // ==================================

    if (statusCode >= 500) {
        logger.error('Server Error', {
            statusCode,
            message,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            stack: err.stack
        })
    } else {
        // log 4xx as warnings - useful for debugging without noise
        logger.warn('Client Error', {
            statusCode,
            message,
            url: req.originalUrl,
            method: req.method
        })
    }


    // ==============================
    // PRODUCTION SAFETY
    // Never expose internal error details to client in production
    // If it is not an error we created internationally with AppError
    // replace the message with a generic one
    // ===============================
    if (process.env.NODE_ENV === 'production' && !err.isOperational) {
        message = 'Something went wrong. Please try again later.'
    }

    return errorResponse(res, { message, statusCode })

}

module.exports = { errorHandler }