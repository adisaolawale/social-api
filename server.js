require("./config/loadEnv")

const http = require('http');




const app = require('./app');
const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { connectCloudinary } = require('./config/cloudinary');
const { initSocket } = require('./config/socket');
const logger = require('./config/logger');
// const emailWorker = require('./workers/emailWorker');

// Models (for table initialization)
const { createUserTable } = require('./models/userModel');
const { createPostTable } = require('./models/postModel');
const { createCommentTable } = require('./models/commentModel');
const { createLikeTable } = require('./models/likeModel');
const { createFollowTable } = require('./models/followModel');
const { createMessagesTable } = require('./models/messageModel');
const { createNotificationsTable } = require('./models/notificationModel');
const { createUploadsTable } = require('./models/uploadModel')
const { createSessionTable } = require('./models/sessionModel')

const { createLogTable } = require('./models/logModel');
const { createTokenTable } = require('./models/tokenModel');


const PORT = process.env.PORT || 3000;



const startServer = async () => {
    try {
        logger.info(process.env.NODE_ENV + ' environment initialized successfully');


        await connectDB();
        // await connectRedis();
        await connectCloudinary();

        require("./jobs/tokenCleanup")

        // Initialize tables
        await createUserTable();
        await createPostTable();
        await createCommentTable();
        await createLikeTable();
        await createFollowTable();
        await createMessagesTable();
        await createNotificationsTable();
        await createUploadsTable();
        await createSessionTable()
        await createLogTable()
        await createTokenTable()




        // Create HTTP server from Express app
        // Socket.io needs the raw HTTP server not just Express
        const httpServer = http.createServer(app);

        // Attach Socket.io to the HTTP server
        initSocket(httpServer);

        httpServer.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server: ', error);
        process.exit(1);
    }
};

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    if (err.code === '57P01') return;
    process.exit(1);
});

startServer();