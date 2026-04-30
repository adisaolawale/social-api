const { Worker } = require('bullmq');
const { redisClient } = require('../config/redis');
const { pool } = require('../config/db')

const worker = new Worker(
    'tokenStatusUpdate',
    async job => {
        const { tokenId } = job.data;

        await pool.query(
            `UPDATE tokens
             SET status = 'EXPIRED'
             WHERE id = $1
            `, [tokenId]
        );
    },
    { connection: redisClient }
)

module.exports = { worker }