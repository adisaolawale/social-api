const { redis } = require("../config/redis");
const { getIO } = require("../config/socket");
const { FollowModel } = require("../models/followModel");
const { NotificationModel } = require("../models/notificationModel");
const { UserModel } = require("../models/userModel");
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');

// @desc    Follow a user
// @route   POST /api/follows/:userId/follow
// @access  Private
const follow = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const followerId = req.user.id;

        if (followerId === userId) {
            return next(new AppError("You cannot follow yourself", 400));
        }

        // Check if user to follow exists
        const userToFollow = await UserModel.findById(userId);
        if (!userToFollow) {
            return next(new AppError('User not found', 404));
        }

        // Check if already following
        const existingFollow = await FollowModel.isFollowing({
            followerId,
            followingId: userId
        });
        if (existingFollow) {
            return next(new AppError('You are already following this user', 400));
        }


        // Follow user
        const follow = await FollowModel.follow({
            followerId,
            followingId: userId
        })


        // Notify owner
        const notification = await NotificationModel.create({
            recipientId: userId,
            senderId: req.user.id,
            type: 'follow',
            entityType: 'user',
            entityId: req.user.id,
            message: `${req.user.username} started following you`
        })

        // Emit to recipient via socket if they are online
        if (notification) {
            const io = getIO()
            io.to(`user:${userId}`).emit('notification:new', { notification })
        }

        return successResponse(res, {
            statusCode: 201,
            message: `You are now following ${userToFollow.username}`,
            data: { follow }
        })
    } catch (error) {
        next(error)
    }
}


// @desc     Unfollow a user
// @route    DELETE /api/follows/:userId/follow
// @access   Private
const unfollow = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const followerId = req.user.id;

        // Check if user is tryimg to unfollow themselves
        if (followerId === userId) {
            return next(new AppError("You cannot unfollow yourself", 400));
        }

        // Check if user to unfollow exists
        const userToUnFollow = await UserModel.findById(userId);
        if (!userToUnFollow) {
            return next(new AppError('User not found', 404));
        }

        // Check if following
        const existingFollow = await FollowModel.isFollowing({
            followerId,
            followingId: userId
        });
        if (!existingFollow) {
            return next(new AppError('You are not following this user', 400));
        }


        // Follow user
        await FollowModel.unfollow({
            followerId,
            followingId: userId
        })

        return successResponse(res, {
            statusCode: 201,
            message: `You have unfollowed ${userToUnFollow.username}`
        })
    } catch (error) {
        next(error)
    }
}



// @desc     Get all followers of a user
// @route    GET /api/follows/:userId/followers
// @access   Public
const getFollowers = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check user exists
        const user = await UserModel.findById(userId)
        if (!user) {
            return next(new AppError('User not found', 404));
        }


        const data = await FollowModel.getFollowers({
            userId,
            page,
            limit
        })


        return successResponse(res, {
            message: 'Followers fetched successfully',
            data: { followers: data.users },
            meta: { pagination: data.pagination }
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Get all users a user is following
// @route    GET /api/follows/:userId/following
// @access   Public
const getFollowing = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check user exists
        const user = await UserModel.findById(userId)
        if (!user) {
            return next(new AppError('User not found', 404));
        }


        const data = await FollowModel.getFollowing({
            userId,
            page,
            limit
        })


        return successResponse(res, {
            message: 'Following fetched successfully',
            data: { following: data.users },
            meta: { pagination: data.pagination }
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Get followers and following count
// @route    GET /api/follows/:userId/follow/count
// @access   Public
const getFollowCount = async (req, res, next) => {
    try {
        const { userId } = req.params;


        // Check user exists
        const user = await UserModel.findById(userId)
        if (!user) {
            return next(new AppError('User not found', 404));
        }



        const [followersCount, followingCount] = await Promise.all([
            FollowModel.countFollowers(userId),
            FollowModel.countFollowing(userId)
        ]);

        const data = {
            user_id: userId,
            followersCount,
            followingCount
        }


        return successResponse(res, {
            message: 'Follow count fetched successfully',
            data
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Check if user is following another user
// @route    GET /api/follows/:userId/follow/check
// @access   Private
const checkFollow = async (req, res, next) => {
    try {
        const { id: following_id } = req.params;
        const follower_id = req.user.id

        const follow = await FollowModel.isFollowing({
            followerId: follower_id,
            followingId: following_id
        });


        return successResponse(res, {
            message: 'Follow status fetched successfully',
            data: { following: !!follow }
        });
    } catch (error) {
        next(error)
    }
}


module.exports = {
    follow,
    unfollow,
    getFollowers,
    getFollowing,
    getFollowCount,
    checkFollow
}