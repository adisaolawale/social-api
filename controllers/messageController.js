const { MessageModel } = require("../models/messageModel");
const { getIO } = require('../config/socket');
const { UserModel } = require("../models/userModel");
const { sendMessageValidator } = require("../validators/messageValidator");
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');




// @desc     Get all conversations
// @route    GET /api/messages/conversations
// @access   Private
const getConversations = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const data = await MessageModel.getUserConversations({
            userId: req.user.id,
            page,
            limit
        })

        return successResponse(res, {
            message: 'Conversations fetched successfully',
            data: { conversations: data.conversations },
            meta: { pagination: data.pagination }
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Get or create conversation with a user
// @route    GET /api/messages/conversations/user/:userId
// @access   Private
const getOrCreateConversation = async (req, res, next) => {
    try {

        const { userId } = req.params

        // Cannot message yourself
        if (userId === req.user.id) {
            return next(new AppError('You cannot message yourself', 400));
        }

        // Check target user exists
        const targetUser = await UserModel.findById(userId)
        if (!targetUser) {
            return next(new AppError('User not found', 404));
        }

        const conversationId = await MessageModel.findOrCreateConversation({
            userOneId: req.user.id,
            userTwoId: userId
        })

        return successResponse(res, {
            message: 'Conversation created or fetched successfully',
            data: { conversationId }
        });
    } catch (error) {
        next(error)
    }
}



// @desc     Get messages in a conversation
// @route    GET /api/messages/conversations/:conversationId
// @access   Private
const getMessages = async (req, res, next) => {
    try {

        const { conversationId } = req.params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Verify user is a participant
        const conversation = await MessageModel.findConversationById({
            conversationId,
            userId: req.user.id
        })
        if (!conversation) {
            return next(new AppError('Conversation not found', 400));
        }


        const data = await MessageModel.getMessages({
            conversationId,
            page,
            limit
        })


        // Mark messages as read when user fetches them
        await MessageModel.markRead({
            conversationId,
            userId: req.user.id
        })

        try {
            // Notify other users in the room
            getIO().to(conversationId).emit('messages:read', {
                conversationId,
                userId: req.user.id,
                readAt: new Date()
            })
        } catch (e) {
            // Socket not initialized 
        }

        return successResponse(res, {
            message: 'Messages fetched successfully',
            data: { messages: data.conversations },
            meta: { pagination: data.pagination }
        });
    } catch (error) {
        next(error)
    }
}



// @desc     send message - rest fallback
// @route    POST /api/messages/conversations/:conversationId
// @access   Private
const sendMessage = async (req, res, next) => {
    try {

        const { conversationId } = req.params
        const { content, messageType } = req.body

        // Change latter to joi validation
        const { error } = sendMessageValidator(content)
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }


        // Verify user is a participant
        const conversation = await MessageModel.findConversationById({
            conversationId,
            userId: req.user.id
        })
        if (!conversation) {
            return next(new AppError('Conversation not found', 400));
        }


        const message = await MessageModel.createMessage({
            conversationId,
            senderId: req.user.id,
            content,
            messageType
        })

        try {
            getIO().to(conversationId).emit('message:new', { message })
        } catch (e) {}


        return successResponse(res, {
            statusCode: 201,
            message: 'Message sent',
            data: { message }
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Delete message 
// @route    DELETE /api/messages/:messageId
// @access   Private
const deleteMessage = async (req, res, next) => {
    try {

        const { messageId } = req.params



        const message = await MessageModel.deleteMessage({
            messageId,
            senderId: req.user.id,
        })

        if (!message) {
            return next(new AppError('Message not found or you cannot delete it', 404));
        }

        try {
            getIO().to(message.conversation_id).emit('message:deleted', { 
                messageId, 
                conversationId: message.conversation_id 
            })
        } catch (e) {}


        return successResponse(res, {
            message: 'Message deleted'
        });
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getConversations,
    getOrCreateConversation,
    getMessages,
    sendMessage,
    deleteMessage
}