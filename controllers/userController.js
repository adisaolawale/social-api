const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const { v4: uuidv4 } = require('uuid')
const { UserModel } = require('../models/userModel')
const AppError = require('../utils/AppError')
const { successResponse } = require('../utils/response')
const { redis } = require('../config/redis');
const { sendWelcomeEmail } = require('../queues/emailQueue');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const sendEmail = require('../utils/sendEmail');
const sendEmailResend = require('../utils/sendEmailResend');
const { registerValidator, loginValidator, updateProfileValidator } = require('../validators/authValidator');
const { PostModel } = require('../models/postModel');
const { FollowModel } = require('../models/followModel');



// @desc   Get my profile
// @route  GET /api/users/me
// @access Private
const getMe = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.user.id)
        if (!user) {
            return next(new AppError('User not found', 404))
        }

        console.log(user)

        return successResponse(res, {
            message: 'User fetched successfully',
            data: { user }
        })
    } catch (error) {
        next(error)
    }
}


// @desc   Get public profile by username 
// @route  GET /api/users/:username
// @access Public
const getProfile = async (req, res, next) => {
    try {

        const { username } = req.params

        const user = await UserModel.findByUsername(username)
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Check if logged in user follows this profile
        // FollowModel will be wired in once follow is built
        // For now is_folowing default to false
        user.is_following = false


        // If account is private and requester is not following
        // return only basic public info
        if (user.is_private && req.user?.id !== user.id) {
            return successResponse(res, {
                message: 'Profile fetched successfully',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        full_name: user.full_name,
                        avatar_url: user.avatar_url,
                        is_verified: user.is_verified,
                        is_private: user.is_private,
                        followers_count: user.followers_count,
                        following_count: user.following_count,
                        is_following: false
                    }
                }
            })
        }

        return successResponse(res, {
            message: 'Profile fetched successfully',
            data: { user }
        });
    } catch (error) {
        next(error)
    }
};



// @desc   Update profile 
// @route  PATCH /api/users/me
// @access Private
const updateProfile = async (req, res, next) => {
    try {

        const { full_name, bio, website, location } = req.body

        const { value, error } = updateProfileValidator(req.body)
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }
        const user = await UserModel.update({
            userId: req.user.id,
            fullName: full_name,
            bio,
            website,
            location
        })


        if (!user) {
            return next(new AppError('User not found', 404));
        }

        return successResponse(res, {
            message: 'Profile updated successfully',
            data: { user }
        });
    } catch (error) {
        next(error)
    }
};



// @desc   Change password 
// @route  PATCH /api/users/me/password
// @access Private
const changePassword = async (req, res, next) => {
    try {

        const { currentPassword, newPassword } = req.body

        // findByEmail returns password field unlike findById
        const user = await UserModel.findByEmail(req.user.email)



        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const isCorrect = await bcrypt.compare(currentPassword, user.password)
        if (!isCorrect) {
            return next(new AppError('Current password is incorrect', 401));
        }

        const isSame = await bcrypt.compare(newPassword, user.password)
        if (isSame) {
            return next(new AppError('New password cannot be the same as your current password', 400));
        }

        // Hash password
        const salt = await bcrypt.genSalt(
            parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
        );
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await UserModel.updatePassword(req.user.id, hashedPassword)

        return successResponse(res, {
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error)
    }
};


// @desc   Deactivate account 
// @route  DELETE /api/users/me
// @access Private
const deactivateAccount = async (req, res, next) => {
    try {

        await UserModel.deactivate(req.user.id)

        return successResponse(res, {
            message: 'Account deactivate successfully'
        });
    } catch (error) {
        next(error)
    }
};



// @desc   Search users 
// @route  GET /api/users/search
// @access Public
const searchUsers = async (req, res, next) => {
    try {

        const searchTerm = req.query.q?.trim()

        if (!searchTerm || searchTerm.length === 0) {
            return next(new AppError('Search term is required', 400));
        }

        if (searchTerm.length < 2) {
            return next(new AppError('Search term must be at least 2 characters', 400));
        }

        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10

        const { users, pagination } = await UserModel.search({
            searchTerm,
            page,
            limit
        })

        return successResponse(res, {
            message: 'Searched items fetched successfully',
            data: { users },
            meta: { pagination }
        });
    } catch (error) {
        next(error)
    }
};


// @desc     Get posts by user
// @route    PUT /api/users/:username/posts
// @access   Public
const getUserPosts = async (req, res, next) => {
    try {
        const { username } = req.params;

        const user = await UserModel.findByUsername(username)
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Block if private account requester is not the owner
        // Full follow check will be wired in when follow module is built
        if (user.is_private && req.user?.id !== user.id) {
            return next(new AppError('This account is private', 403));
        }


        const posts = await PostModel.findByUser({
            user_id: user.id,
            page,
            limit,
            requestedId: req.user?.id || null
        });

        return successResponse(res, {
            message: 'Post fetched successfully',
            data: { posts }
        });

    } catch (error) {
        next(error)
    }
}


// @desc   Get followers 
// @route  GET /api/users/:username/followers
// @access Public
const getFollowers = async (req, res, next) => {
    try {

        const { username } = req.params

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const user = await UserModel.findByUsername(username)
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const data = await FollowModel.getFollowers({
            userId: user.id,
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
};


// @desc   Get following 
// @route  GET /api/users/:username/following
// @access Public
const getFollowing = async (req, res, next) => {
    try {

        const { username } = req.params

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const user = await UserModel.findByUsername(username)
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const data = await FollowModel.getFollowing({
            userId: user.id,
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
};

module.exports = {
    getMe,
    getProfile,
    updateProfile,
    deactivateAccount,
    changePassword,
    searchUsers,
    getUserPosts,
    getFollowers,
    getFollowing
}