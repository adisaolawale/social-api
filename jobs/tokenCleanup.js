const cron = require('node-cron');
const { pool, dbQuery } = require('../config/db');
const logger = require('../config/logger');

// delete all token that has expired 1 hours ago or still pending
cron.schedule('0 * * * *', async () => {
    logger.info("Running token cleanup job...");
    try {
        const result = await dbQuery(`
            DELETE FROM tokens
            WHERE status = 'PENDING' OR expires_at < NOW() - INTERVAL '1 hour'
        `);
        logger.info(`Token cleanup completed. Rows affected: ${result.rowCount}`);

    } catch (error) {
        logger.error("Error occurred while running token cleanup job:", error);
    }
});

