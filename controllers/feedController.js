const FeedModel = require("../models/feedModel");
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');

// @desc     Get timeline feed - posts from people the logged in user follows
// @route    DELETE /api/feed/timeline
// @access   Private
const getTimeline = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Cap limit to prevent abuse
        if (limit > 50) {
            return next(new AppError('Limit cannot exceed 50', 400));
        }

        const data = await FeedModel.getTimeline({
            userId: req.user.id,
            page,
            limit
        })

        return successResponse(res, {
            message: 'Timeline posts fetched successfully',
            data: { posts: data.posts },
            meta: { pagination: data.pagination }
        });
    } catch (error) {
        next(error)
    }
}

// @desc     Get Explore feed - public posts ranked by engagement score
// @route    GET /api/feed/explore
// @access   Private
const getExplore = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Cap limit to prevent abuse
        if (limit > 50) {
            return next(new AppError('Limit cannot exceed 50', 400));
        }

        const data = await FeedModel.getExplore({
            userId: req.user.id,
            page,
            limit
        })

        return successResponse(res, {
            message: 'Explore posts fetched successfully',
            data: { posts: data.posts },
            meta: { pagination: data.pagination }
        });
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getTimeline,
    getExplore
}