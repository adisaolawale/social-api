const logger = require("../config/logger")
const { LogsModel } = require("../models/logModel")

exports.logActivity = async ({ userId, action, ip, userAgent, metadata }) => {
    try {
        await LogsModel.create({ userId, action, ip, userAgent, metadata })
    } catch (error) {
        logger.error('DB logging failed', {
            error: error.message
        })
    };
}