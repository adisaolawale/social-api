class AppError extends Error {
    constructor(message, statusCode, errorCode = null, details = null) {
        super(message);

        this.statusCode = statusCode;
        this.errorCode = errorCode;           // ← NEW: Error code for frontend
        this.details = details;               // ← NEW: Extra data (e.g. token)
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;