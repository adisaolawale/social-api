const winston = require('winston')
const path = require('path')
const DailyRotateFile = require('winston-daily-rotate-file')

const { combine, timestamp, printf, colorize, errors } = winston.format

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`
})

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
    ),
    transports: [
        // console output
        new DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        }),

        // Error log file
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.printf(({
                timestamp, level, message
            }) => {
                return `[${timestamp}] ${level}: ${message}`
            })
        )
    }))
};

module.exports = logger
