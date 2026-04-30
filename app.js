const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const likeRoutes = require('./routes/likeRoutes');
const followRoutes = require('./routes/followRoutes');
const userRoutes = require('./routes/userRoutes');
const feedRoutes = require('./routes/feedRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const errorMiddleware = require('./middleware/errorMiddleware');

const swaggerSpec = require('./config/swagger');
const logger = require('./config/logger');



const app = express();

// Middleware
app.use(cors());
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) }
    }));
}

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Social API Docs'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/follows', followRoutes); // Also fixed the missing '/' from 'api/follows' here!
app.use('/api/users', userRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Production REST API is running',
        version: '1.0.0'
    });
});

// Error Middleware
app.use(errorMiddleware);

module.exports = app;
