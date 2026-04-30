const { redis } = require("../config/redis");
const FeedModel = require("../models/feedModel");
const { PostModel } = require("../models/postModel");
const { postValidator, updatePostValidator } = require("../validators/postValidator");
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');


// @desc     Create post
// @route    POST /api/posts
// @access   Private
const createPost = async (req, res, next) => {
    try {
        const { error } = postValidator(req.body);
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }

        const { content, media_urls, thumbnail_url, media_type } = req.body;

        const post = await PostModel.create({
            user_id: req.user.id,
            content,
            media_urls,
            thumbnail_url
        });

        // Invalidate posts cache
        // TODO: Should be after success response
        await FeedModel.invalidateCache(req.user.id).catch(() => { })
        await FeedModel.invalidateExploreCache().catch(() => { })

        return successResponse(res, {
            statusCode: 201,
            message: 'Post created successfully',
            data: { post }
        })
    } catch (error) {
        next(error)
    }
};





// @desc     Get all posts
// @route    GET /api/posts
// @access   Public
const getAllPosts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check Redis cache
        const cacheKey = `posts:all:page:${page}:limit:${limit}`
        const cachedPosts = await redis.get(cacheKey)

        if (cachedPosts) {
            return successResponse(res, {
                message: 'Post fetched from cache',
                data: JSON.parse(cachedPosts)
            });
        }


        const data = await PostModel.findAll({ page, limit });

        // Cache for 5 minutes
        await redis.set(cacheKey, data, 300);

        return successResponse(res, {
            message: 'Post fetched successfully',
            data
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Get single posts
// @route    GET /api/posts/:postId
// @access   Public
const getPost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        // Check Redis cache
        const cachedPosts = await redis.get(`post:${postId}`)

        if (cachedPosts) {
            return successResponse(res, {
                message: 'Post fetched from cache',
                data: JSON.parse(cachedPosts)
            });
        }


        const post = await PostModel.findById(postId);
        if (!post) {
            return next(new AppError('Post not found', 404));
        }


        // Cache for 5 minutes
        await redis.set(`post:${postId}`, post, 300);

        return successResponse(res, {
            message: 'Post fetched successfully',
            data: { post }
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Get posts by user
// @route    PUT /api/posts/user/:userId
// @access   Public
const getUserPosts = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check Redis cache
        const cacheKey = `posts:user:${userId}:page:${page}:limit:${limit}`
        const cachedPosts = await redis.get(cacheKey)

        if (cachedPosts) {
            return successResponse(res, {
                message: 'Posts fetched from cache',
                data: JSON.parse(cachedPosts)
            });
        }


        const data = await PostModel.findByUser({
            user_id: userId,
            page,
            limit,
            requestedId: req.user?.id || null
        });

        // Cache for 5 minutes
        await redis.set(cacheKey, data, 300);

        return successResponse(res, {
            message: 'Post fetched successfully',
            data
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Update post
// @route    PUT /api/posts/:postId
// @access   Private
const updatePost = async (req, res, next) => {
    try {
        const { error } = updatePostValidator(req.body);
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }

        const { postId } = req.params;

        // Check if post exists
        const existingPost = await PostModel.findById(postId);
        if (!existingPost) {
            return next(new AppError('Post not found', 404));
        }

        // Check if user owns the post
        if (existingPost.user_id !== req.user.id) {
            return next(new AppError('Not authorized to update this post', 403));
        }

        const { content } = req.body;
        const post = await PostModel.update({ postId, content });


        // Invalidate cache
        await redis.del(`post:${postId}`);
        await redis.del(`posts:all`);


        return successResponse(res, {
            message: 'Post updated successfully',
            data: { post }
        });

    } catch (error) {
        next(error)
    }
}


// @desc     Delete post
// @route    DELETE /api/posts/:postId
// @access   Private
const deletePost = async (req, res, next) => {
    try {

        const { postId } = req.params;

        // Check if post exists
        const existingPost = await PostModel.findById(postId);
        if (!existingPost) {
            return next(new AppError('Post not found', 404));
        }

        // Check if user owns the post
        if (existingPost.user_id !== req.user.id) {
            return next(new AppError('Not authorized to delete this post', 403));
        }

        await PostModel.delete(postId);


        // Invalidate cache
        await redis.del(`post:${postId}`);
        await redis.del(`posts:all`);


        return successResponse(res, {
            message: 'Post deleted successfully',
        });

    } catch (error) {
        next(error)
    }
}


module.exports = {
    createPost,
    getAllPosts,
    getPost,
    getUserPosts,
    updatePost,
    deletePost
}