const { Pool } = require('pg');
const logger = require('./logger');
const dotenv = require('dotenv');
dotenv.config();



const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "development" ? false : {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 50000
});

// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'socialapp_db',
//     password: 'Atunse@123',   // ← same password you just set
//     port: 5432,
// });

pool.on('error', (err) => {
    if (err.code === '57P01') {
        logger.warn('Neon suspended — pool will reconnect on next query');
        return;
    }
    logger.error('Unexpected pg pool error:', err.message);
});

// ✅ Wrap pool.query to auto-retry on Neon suspension
const dbQuery = async (text, params) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        if (err.code === '57P01') {
            logger.warn('Query failed due to Neon suspension, retrying in 3s...');
            await new Promise(res => setTimeout(res, 3000));
            return await pool.query(text, params); // one retry
        }
        throw err; // all other errors bubble up normally
    }
};

const connectDB = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            logger.info('PostgreSQL connected successful');
            client.release();
            return;
        } catch (error) {
            if (error.code === '57P01') {
                logger.warn(`Neon suspended, retrying... (${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, 3000));
                continue;
            }
            logger.error('PostgreSQL connection failed', error);
            process.exit(1);
        }
    }
    logger.error('PostgreSQL failed after all retries');
    process.exit(1);
};

module.exports = { pool, dbQuery, connectDB }
