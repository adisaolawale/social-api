const { Pool } = require('pg');
const logger = require('./logger');


// const pool = new Pool({
//     host: process.env.PG_HOST,
//     port: process.env.PG_PORT,
//     user: process.env.PG_USER,
//     password: process.env.PG_PASSWORD,
//     database: process.env.PG_DATABASE,
// });


// ssl: process.env.NODE_ENV === "development" ? false : {
//         regectUnauthorized: false
//     },

// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,

//     ssl: process.env.NODE_ENV === "development" ? false : {
//         rejectUnauthorized: false  // ✅ fixed
//     },
//     max: 20,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 50000
// });


// // ✅ Add this — prevents Neon suspension from crashing the process
// pool.on('error', (err) => {
//     logger.error('Unexpected pg pool error:', err.message);
// });



// const connectDB = async () => {

//     try {
//         const client = await pool.connect();
//         logger.info('PostgreSQL connected successful');
//         console.log('PostgreSQL connected successful')
//         client.release();
//     } catch (error) {
//         logger.error('PostgreSQL connection failed', error);
//         console.error('PostgreSQL connection failed', error);
//         process.exit(1);
//     }
// };


// const connectDB = async (retries = 3) => {
//     for (let i = 0; i < retries; i++) {
//         try {
//             const client = await pool.connect();
//             logger.info('PostgreSQL connected successful');
//             client.release();
//             return; // ✅ success, stop retrying
//         } catch (error) {
//             // Neon suspension — wait and retry
//             if (error.code === '57P01') {
//                 logger.warn(`Neon suspended, retrying... (${i + 1}/${retries})`);
//                 await new Promise(res => setTimeout(res, 3000)); // wait 3 seconds
//                 continue;
//             }
//             // Real connection error — exit
//             logger.error('PostgreSQL connection failed', error);
//             process.exit(1);
//         }
//     }
//     logger.error('PostgreSQL failed after all retries');
//     process.exit(1);
// };




const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "development" ? false : {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 50000
});

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
