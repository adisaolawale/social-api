// src/utils/AppError.js

class AppError extends Error {
    constructor(message, statusCode) {
        // Call the parent Error class with the message
        super(message)

        this.statusCode = statusCode

        // This flag lets us distinguish between errors we created intentionally
        // versus unexpected errors like database crashes or null references
        // In errorHandler.js we use this to decide what to log
        this.isOperational = true

        // Captures the stack trace excluding the constructor call itself
        // Makes debugging cleaner — stack points to where error was thrown
        // not to this file
        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = AppError