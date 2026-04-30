const { redis } = require("../config/redis");
const { getIO } = require("../config/socket");
const { CommentModel } = require("../models/commentModel");
const { NotificationModel } = require("../models/notificationModel");
const { PostModel } = require("../models/postModel");
const { commentValidator, updateCommentValidator } = require("../validators/commentValidator");
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');


// @desc     Add comment to post
// @route    POST /api/comments/post/:postId
// @access   Private
const createComment = async (req, res, next) => {
    try {
        const { error } = commentValidator(req.body);
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }

        const { postId } = req.params;

        // Check if post exists
        const post = await PostModel.findById(postId)
        if (!post) {
            return next(new AppError('Post not found', 404));
        }

        const { content } = req.body;

        // Create comment
        const comment = await CommentModel.create({
            postId,
            userId: req.user.id,
            content
        });

        // Fetch full comment with user data to return
        //const comment = await CommentModel.findById(newComment.id)


        // Notify post owner
        const notification = await NotificationModel.create({
            recipientId: post.user_id,
            senderId: req.user.id,
            type: 'comment_post',
            entityType: 'post',
            entityId: postId,
            message: `${req.user.username} commented on your post`
        })

        // Emit to recipient via socket if they are online
        if (notification) {
            const io = getIO()
            io.to(`user:${post.user_id}`).emit('notification:new', { notification })
        }


        return successResponse(res, {
            statusCode: 201,
            message: 'Comment added successfully',
            data: { comment }
        })
    } catch (error) {
        next(error)
    }
};


// @desc     Get top level comments for a post
// @route    GET /api/comments/post/:postId
// @access   Private
const getPostComments = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check if post exists
        const post = await PostModel.findById(postId)
        if (!post) {
            return next(new AppError('Post not found', 404));
        }


        const data = await CommentModel.findByPost({
            postId,
            page,
            limit,
            userId: req.user?.id || null
        })

        // Attach 2 reply preview to each comment
        if (data.comments.length > 0) {
            const commentIds = data.comments.map((c) => c.id)
            const repliesMap = await CommentModel.findRepliesPreview(commentIds)
            for (const comment of data.comments) {
                comment.replies_preview = repliesMap[comment.id] || []
            }
        }

        return successResponse(res, {
            message: 'Comments fetched successfully',
            data: data.comments,
            meta: data.pagination
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Get all replies for a comment (paginated)
// @route    GET /api/comments/:commentId/replies
// @access   Public
const getCommentReplies = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check if post exists
        const comment = await CommentModel.findById(commentId)
        if (!comment) {
            return next(new AppError('Comment not found', 404));
        }

        const replies = await CommentModel.findReplies({
            commentId,
            page,
            limit,
            userId: req.user?.id || null
        })

        return successResponse(res, {
            message: 'Replies fetched successfully',
            data: replies.replies,
            meta: replies.pagination
        });
    } catch (error) {
        next(error)
    }
}



// @desc     Get single comment
// @route    GET /api/comments/:commentId
// @access   Public
const getComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;


        const comment = await CommentModel.findById(commentId);
        if (!comment) {
            return next(new AppError('Comment not found', 404));
        }

        return successResponse(res, {
            message: 'Comment fetched successfully',
            data: { comment }
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Reply to a comment
// @route    GET /api/comments/:commentId/replies
// @access   Private
const replyToComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;

        const parentCommnet = await CommentModel.findById(commentId);

        if (!parentCommnet) {
            return next(new AppError('Comment not found', 404));
        }

        // Never go deeper than 2 levels
        // If the comment being replied to already has a path
        // attach to the top level parent instead
        const targetParentId = parentCommnet.parent_id ? parentCommnet.parent_id : commentId

        const newReply = await CommentModel.createReply({
            postId: parentCommnet.post_id,
            userId: req.user.id,
            parentId: targetParentId,
            content
        })

        const reply = await CommentModel.findById(newReply.id)


        // Notify post owner
        const notification = await NotificationModel.create({
            recipientId: parentCommnet.user_id,
            senderId: req.user.id,
            type: 'reply_comment',
            entityType: 'comment',
            entityId: commentId,
            message: `${req.user.username} replied to your comment`
        })

        // Emit to recipient via socket if they are online
        if (notification) {
            const io = getIO()
            io.to(`user:${parentCommnet.user_id}`).emit('notification:new', { notification })
        }


        return successResponse(res, {
            statusCode: 201,
            message: 'Reply added successfully',
            data: { reply }
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Edit comment - owner only
// @route    PATCH /api/comments/:commentId
// @access   Private
const updateComment = async (req, res, next) => {
    try {
        const { error } = updateCommentValidator(req.body);
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }

        const { commentId } = req.params;
        const { content } = req.body;

        // Check if comment exists
        const existingComment = await CommentModel.findById(commentId);
        if (!existingComment) {
            return next(new AppError('Comment not found', 404));
        }

        // Check if user owns the comment
        if (existingComment.user_id !== req.user.id) {
            return next(new AppError('Not authorized to update this comment', 403));
        }

        const comment = await CommentModel.update({ commentId, content });


        return successResponse(res, {
            message: 'Comment updated successfully',
            data: { comment }
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Delete comment
// @route    DELETE /api/comments/:commentId
// @access   Private
const deleteComment = async (req, res, next) => {
    try {

        const { commentId } = req.params;

        // Check if post exists
        const existingComment = await CommentModel.findById(commentId);
        if (!existingComment) {
            return next(new AppError('Comment not found', 404));
        }

        // Check if user owns the post
        if (existingComment.user_id !== req.user.id) {
            return next(new AppError('Not authorized to delete this comment', 403));
        }

        await CommentModel.delete({
            commentId,
            postId: existingComment.post_id,
            parentId: existingComment.parent_id
        });


        return successResponse(res, {
            message: 'Comment deleted successfully',
        });

    } catch (error) {
        next(error)
    }
}




module.exports = {
    createComment,
    getPostComments,
    getComment,
    updateComment,
    deleteComment,
    replyToComment,
    getCommentReplies
}