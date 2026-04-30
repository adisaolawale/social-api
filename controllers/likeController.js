const { redis } = require("../config/redis");
const { getIO } = require("../config/socket");
const { CommentModel } = require("../models/commentModel");
const { LikeModel } = require("../models/likeModel");
const { NotificationModel } = require("../models/notificationModel");
const { PostModel } = require("../models/postModel");
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');


// @desc     Like a post
// @route    POST /api/likes/posts/:postId
// @access   Private
const likePost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        // Check if post exists
        const post = await PostModel.findById(postId)
        if (!post) {
            return next(new AppError('Post not found', 404));
        }

        // Check if user already liked the post
        const existingLike = await LikeModel.hasLikedPost({
            userId: req.user.id,
            postId
        })

        if (existingLike) {
            return next(new AppError('You have already liked this post', 400));
        }



        // Create like
        const like = await LikeModel.likePost({
            userId: req.user.id,
            postId
        });

        const notification = await NotificationModel.create({
            recipientId: post.user_id,
            senderId: req.user.id,
            type: 'like_post',
            entityType: 'post',
            entityId: postId,
            message: `${req.user.username} liked your post`
        })

        // Emit to recipient via socket if they are online
        if (notification) {
            const io = getIO()
            io.to(`user:${post.user_id}`).emit('notification:new', { notification })
        }


        return successResponse(res, {
            statusCode: 201,
            message: 'Post liked successfully',
            data: { like }
        })
    } catch (error) {
        next(error)
    }
};



// @desc     Unlike a post
// @route    DELETE /api/likes/posts/:postId
// @access   Private
const unlikePost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        // Check if post exists
        const post = await PostModel.findById(postId)
        if (!post) {
            return next(new AppError('Post not found', 404));
        }

        // Check if user already liked the post
        const existingLike = await LikeModel.hasLikedPost({
            userId: req.user.id,
            postId
        })

        if (!existingLike) {
            return next(new AppError('You have not liked this post', 400));
        }



        // Unlike the post
        await LikeModel.unlikePost({
            userId: req.user.id,
            postId
        });

        // Remove the notification when they unlike 
        await NotificationModel.deleteByEntity({
            recipientId: post.user_id,
            senderId: req.user.id,
            type: 'like_post',
            entityId: postId,
        })

        return successResponse(res, {
            message: 'Post unliked successfully'
        })
    } catch (error) {
        next(error)
    }
};


// @desc     Like a comment
// @route    POST /api/likes/comments/:commentId
// @access   Private
const likeComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;

        // Check if post exists
        const comment = await CommentModel.findById(commentId)
        if (!comment) {
            return next(new AppError('Comment not found', 404));
        }

        // Check if user already liked the post
        const existingLike = await LikeModel.hasLikedComment({
            userId: req.user.id,
            commentId
        })

        if (existingLike) {
            return next(new AppError('You have already liked this comment', 400));
        }



        // Create like
        const like = await LikeModel.likeComment({
            userId: req.user.id,
            commentId
        });


        return successResponse(res, {
            statusCode: 201,
            message: 'Comment liked successfully',
            data: { like }
        })
    } catch (error) {
        next(error)
    }
};




// @desc     Unlike a comment
// @route    DELETE /api/comments/:commentId/like
// @access   Private
const unlikeComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;

        // Check if comment exists
        const comment = await CommentModel.findById(commentId)
        if (!comment) {
            return next(new AppError('Comment not found', 404)); // fixed message to comment not found
        }

        // Check if user already liked the post
        const existingLike = await LikeModel.hasLikedComment({
            userId: req.user.id,
            commentId
        })

        if (!existingLike) {
            return next(new AppError('You have not liked this comment', 400));
        }



        // Unlike the post
        await LikeModel.unlikeCommnent({
            userId: req.user.id,
            commentId
        });

        return successResponse(res, {
            message: 'Comment unliked successfully'
        })
    } catch (error) {
        next(error)
    }
};





// @desc     Get all likes by post
// @route    GET /api/likes/posts/:postId/users
// @access   Public
const getPostLikes = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check if post exists
        const post = await PostModel.findById(postId)
        if (!post) {
            return next(new AppError('Post not found', 404));
        }




        const data = await LikeModel.getPostLikes({
            postId,
            page,
            limit
        })


        return successResponse(res, {
            message: 'Likes fetched successfully',
            data: { likes: data.users },
            meta: { pagination: data.pagination }
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Get all likes by comment
// @route    GET /api/posts/:commentId/likes
// @access   Public
const getCommentLikes = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check if post exists
        const post = await CommentModel.findById(commentId)
        if (!post) {
            return next(new AppError('Comment not found', 404));
        }




        const data = await LikeModel.getCommentLikes({
            commentId,
            page,
            limit
        })


        return successResponse(res, {
            message: 'Likes fetched successfully',
            data: { likes: data.users },
            meta: { pagination: data.pagination }
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Get all posts liked by user
// @route    GET /api/likes/users/:userId
// @access   Public
const getUserLikes = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check Redis cache
        const cacheKey = `likes:user:${userId}:page:${page}:limit:${limit}`
        const cachedLikes = await redis.get(cacheKey)

        if (cachedLikes) {
            return successResponse(res, {
                message: 'Likes fetched from cache',
                data: JSON.parse(cachedLikes)
            });
        }


        const data = await LikeModel.findByUser({
            user_id: userId,
            page,
            limit
        });

        // Cache for 5 minutes
        await redis.set(cacheKey, JSON.stringify(data), 300);

        return successResponse(res, {
            message: 'User likes fetched successfully',
            data
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Check if user liked a post
// @route    PUT /api/posts/:id/like/check
// @access   Private
const checkLike = async (req, res, next) => {
    try {
        const { id: post_id } = req.params;

        const like = await LikeModel.findLike({
            post_id,
            user_id: req.user.id
        });

        return successResponse(res, {
            message: 'Like status checked successfully',
            data: { liked: !!like }
        });

    } catch (error) {
        next(error)
    }
}


module.exports = {
    likePost,
    unlikePost,
    likeComment,
    unlikeComment,
    getPostLikes,
    getCommentLikes,
    getUserLikes,
    checkLike
}