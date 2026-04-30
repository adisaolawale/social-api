const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { redisClient } = require('./redis')
const { MessageModel } = require('../models/messageModel')


let ioInstance;

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true,
        },
    })

    // Store io instance so other module can use it
    ioInstance = io;

    // ======================
    // AUTH MIDDLEWARE
    // Every socket connection must have a valid JWT
    // =======================
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token

            if (!token) {
                return next(new Error('Authentication required'))
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
            socket.userId = decoded.id
            next()
        } catch (error) {
            next(new Error('Invalid token'))
        }
    })

    io.on('connection', async (socket) => {
        const userId = socket.userId

        // Join personal room for private notifications
        socket.join(`user:${userId}`)
        console.log(`User connected: ${userId}`)

        // =======================
        // ONLINE STATUS
        // Store in Redis - auto expires if they disconnect
        // =======================
        await redisClient.set(`online:${userId}`, userId, { EX: 300 })

        // Notify others this user is online
        socket.broadcast.emit('user:online', { userId })

        // ============================
        // JOIN CONVERSATION ROOM
        // User must join a room to receive messages
        // ============================
        socket.on('conversation:join', async (conversationId) => {
            try {
                // Verify they are a participant
                const conversation = await MessageModel.findConversationById({
                    conversationId,
                    userId
                })

                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found' })
                    return
                }

                socket.join(conversationId)
                console.log(`User ${userId} joined conversation ${conversationId}`)

                // Mark messages as delivered when user joins
                await MessageModel.markDelivered({ conversationId, userId })

                // Emit delivered status to sender
                socket.to(conversationId).emit('messages:delivered', {
                    conversationId,
                    userId
                })
            } catch (error) {
                console.error('conversation:join error', error)
                socket.emit('error', { message: 'Failed to join conversation' })
            }
        })


        // ========================================
        // LEAVE CONVERSATION ROOM
        // ========================================
        socket.on('message:send', async ({ conversationId, content, messageType }) => {
            try {

                if (!content || content.trim().length === 0) {
                    socket.emit('error', { message: 'Message content is required' })
                    return
                }

                // Verify participant
                const conversation = await MessageModel.findConversationById({
                    conversationId,
                    userId
                })

                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found or access denied' })
                    return
                }

                // Save to database
                const message = await MessageModel.createMessage({
                    conversationId,
                    senderId: userId,
                    content: content.trim(),
                    messageType: messageType || 'text'
                })


                // Emit to everyone in the conversation room
                // including sender so they get the saved messages with its ID
                io.to(conversationId).emit('message:new', { message })

            } catch (error) {
                console.error('message:send error', error)
                socket.emit('error', { message: 'Failed to send message' })
            }
        })


        // ==========================================
        // TYPING INDICATOR
        // Not saved to DB - just broadcast instantly
        // ==========================================
        socket.on('typing:start', ({ conversationId }) => {
            socket.to(conversationId).emit('typing:start', { userId, conversationId })
        })

        socket.on('typing:stop', ({ conversationId }) => {
            socket.to(conversationId).emit('typing:stop', { userId, conversationId })
        })


        // ==========================================
        // MARK MESSAGES AS READ
        // ==========================================
        socket.on('messages:read', async ({ conversationId }) => {
            try {
                await MessageModel.markRead({ conversationId, userId })

                // Notify the other person their messages were read
                socket.to(conversationId).emit('messages:read', {
                    conversationId,
                    userId,
                    readAt: new Date()
                })
            } catch (error) {
                console.error('messages:read error', error)
            }
        })


        // ====================================
        // CHECK IF USER IS ONLINE
        // =====================================
        socket.on('user:status', async ({ targetUserId }) => {
            const isOnline = await redisClient.exists(`online:${targetUserId}`)
            socket.emit('user:status', {
                userId: targetUserId,
                isOnline: !!isOnline
            })
        })


        // ======================================
        // DISCONNECT
        // ======================================
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${userId}`)

            // Remove from online status
            await redisClient.del(`online:${userId}`)

            // Notify others this user went offline
            socket.broadcast.emit('user:offline', { userId })
        })
    })

    return io
}


// Export this so controllers can emit events
const getIO = () => {
    if (!ioInstance) {
        throw new Error('Socket.io not initialized')
    }
    return ioInstance
}


module.exports = { initSocket, getIO }