const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const { UserModel } = require('../models/userModel')
const AppError = require('../utils/AppError')
const { successResponse } = require('../utils/response')
const { redis } = require('../config/redis');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../utils/token');
const { registerValidator, loginValidator, updateProfileValidator } = require('../validators/authValidator');
const getClientInfo = require('../utils/getClientInfo');
const { SessionModel } = require('../models/sessionModel');
const { logActivity } = require('../services/logService');
const userLogsAction = require('../constants/userLogsActions');
const { tokenModel } = require('../models/tokenModel');
const generateOTP = require('../utils/generateOTP');
const tokenType = require('../constants/tokenType');
const { verificationEmailTemplate, passwordResetEmailTemplate } = require('../utils/emailTemplate');
const transport = require('../config/sendMail');








// @desc   Register new user
// @route  POST /api/auth/register
// @access Public

const register = async (req, res, next) => {
    try {
        const { username, email, password, fullName } = req.body;

        // Validate request body
        const { error } = registerValidator(req.body)
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }

        // Check if user already exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return next(new AppError('User already exists', 400));
        }

        // Hash password
        const salt = await bcrypt.genSalt(
            parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
        );
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await UserModel.create({
            username,
            email,
            password: hashedPassword,
            fullName
        })

        // Generate verification token
        //const verificationToken = crypto.randomBytes(32).toString('hex')
        //const verificationToken = Math.floor(Math.random() * 1000000).toString();
        const verificationToken = generateOTP(6)


        const token = await tokenModel.createTokenTable({
            userId: user.id,
            tokenHash: hashToken(verificationToken),
            type: tokenType.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })


        // Store in Redis - expires in 24 hours
        await redis.set(
            `email_verify:${verificationToken}`,
            { userId: user.id, email: user.email, tokenId: token.id, tokenHash: token.token_hash },
            300
        )


        // Add welcome email to queue
        // await sendWelcomeEmail(user, verificationToken)

        await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: user.email,
            subject: 'Welcome to our app! Please verify your email',
            html: verificationEmailTemplate(user.fullName, verificationToken)
        })




        return successResponse(res, {
            statusCode: 201,
            message: 'User registered successfully',
            data: { user }
        });
    } catch (error) {
        next(error)
    }
};


// @desc   Verify email
// @route  POST /api/auth/verify-email/:token
// @access Public
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params
        // const { token } = req.body


        // Check token in Redis
        const data = await redis.get(`email_verify:${token}`)

        if (!data) {
            return next(new AppError('Invalid or expired verification token', 400));
        }

        const checkFinal = await tokenModel.verifyToken({ tokenHash: data.tokenHash, type: tokenType.EMAIL_VERIFICATION }, next)

        if (!checkFinal) {
            return next(new AppError('Invalid or expired verification token', 400));
        }

        // Mark email as verified in database
        await UserModel.verifyEmail(data.userId)

        // Delete token from Redis - one time use
        await redis.del(`email_verify:${token}`)

        const tokenHash = hashToken(token)

        // await tokenModel.deleteToken(tokenHash)

        return successResponse(res, {
            message: 'Email verified successfully'
        })
    } catch (error) {
        next(error)
    }
}



// @desc   Login user
// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate request body
        const { error } = loginValidator(req.body)
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }

        // Check if user exists
        const user = await UserModel.findByEmail(email);
        console.log(user)
        if (!user) {
            return next(new AppError('Invalid credentials', 400));
        }

        if (!user.is_verified) {
            return next(new AppError('Your contact is not verified', 404))
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return next(new AppError('Invalid credentials', 401));
        }


        // Create session for user
        //console.log(device)
        //console.log(req.ip)
        //console.log(sessionId)

        const { ip, userAgent, device } = getClientInfo(req)

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const session = await SessionModel.createSession({
            userId: user.id,
            device,
            ip,
            userAgent,
            expiresAt
        })

        // Generate token
        const accessToken = generateAccessToken(user.id, session.id);
        const refreshToken = generateRefreshToken(user.id, session.id)

        console.log(refreshToken)

        console.log(session)

        const hashedToken = hashToken(refreshToken)

        await SessionModel.updateSessionHashToken({ sessionId: session.id, hashedToken })


        await redis.set(
            `session:${session.id}`,
            {
                userId: user.id,
                device: session.device,
                ip: session.ip,
                lastUsedAt: session.last_used_at
            },
            7 * 24 * 60 * 60
        )



        await logActivity({
            userId: user.id,
            action: userLogsAction.AUTH_LOGIN,
            ip: req.ip,
            userAgent,
            metadata: {
                email: user.email
            }
        })

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            //secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Update last seen - fire and forget
        await UserModel.updateLastSeen(user.id)

        const { password: _, ...safeUser } = user


        return successResponse(res, {
            message: 'Login successful',
            data: {
                user: safeUser,
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        next(error)
    }
};




// @desc   Refresh Token
// @route  POST /api/auth/refresh-token
// @access Public
const refreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken

        // Check if all fields are provided
        if (!refreshToken) {
            return next(new AppError('Unauthorized', 401));
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

        const session = await SessionModel.getSessionByToken(refreshToken);
        if (!session || !session.is_valid) {
            // Token reuse detected
            await SessionModel.invalidateAllUserSession(decoded.id);
            return next(new AppError('Session compromised. Please login again', 403));
        }

        const accessToken = generateAccessToken(decoded.id, decoded.sessionId);
        const newRefreshToken = generateRefreshToken(decoded.id, decoded.sessionId);


        const newDecoded = jwt.verify(newRefreshToken, process.env.JWT_REFRESH_SECRET)

        const expiresAt = new Date(newDecoded.exp * 1000)
        await SessionModel.rotateSession({
            oldRefreshToken: refreshToken,
            newRefreshToken,
            expiresAt
        })



        return successResponse(res, {
            message: 'Successful',
            data: {
                accessToken,
                refreshToken: newRefreshToken
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token', 401));
        }

        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired please login again', 401));
        }
        next(error)
    }
};



// @desc   Forgot password
// @route  POST /api/auth/forgot-password
// @access Public
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body
        const user = await UserModel.findByEmail(email)

        // Always return same message - prevents email enumeration
        const message = `If an account with that email exists, a reset link has been sent`;

        if (!user) {
            return successResponse(res, {
                message,
            });
        }

        const resetToken = generateOTP(6)
        console.log(resetToken)

        const token = await tokenModel.createTokenTable({
            userId: user.id,
            tokenHash: hashToken(resetToken),
            type: tokenType.PASSWORD_RESET,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });


        // Store in Redis - expires in 10 minutes
        await redis.set(
            `password_reset:${resetToken}`,
            { userId: user.id, email: user.email, tokenId: token.id },
            600
        )

        // Send email - non blocking

        await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: user.email,
            subject: 'Password Reset Request',
            html: passwordResetEmailTemplate(user.fullName, resetToken)
        });

        return successResponse(res, {
            message
        })
    } catch (error) {
        next(error)
    }
}


// @desc   Reset password with token
// @route  POST /api/auth/reset-password/:token
// @access Public
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params
        const { password } = req.body

        // Check token in Redis
        const raw = await redis.get(`password_reset:${token}`)
        if (!raw) {
            return next(new AppError('Invalid or expired reset token', 400));
        }
        const data = JSON.parse(raw)


        const checkFinal = await tokenModel.findToken(data.tokenId, tokenType.PASSWORD_RESET)
        if (!checkFinal) {
            return next(new AppError('Invalid or expired reset token', 400));
        }

        if (checkFinal.token_hash !== hashToken(token)) {
            return next(new AppError('Invalid or expired reset token', 400));
        }


        // Hash password
        const salt = await bcrypt.genSalt(
            parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
        );
        const hashedPassword = await bcrypt.hash(password, salt);


        // Update password in database
        await UserModel.updatePassword(data.userId, hashedPassword)

        // Delete reset token - one time use
        await redis.del(`password_reset:${token}`)
        await tokenModel.deleteToken(data.tokenId)

        // Revoke all refresh tokens for this user
        // so they are forced to login again everywhere
        // We do this by storing a blacklist key in Redis with the user id and checking it in the auth middleware

        await redis.set(`blacklist:user:${data.userId}`, 'true', 7 * 24 * 60 * 60)

        await SessionModel.invalidateAllUserSession(data.userId)

        return successResponse(res, {
            message: 'Password reset successful'
        })
    } catch (error) {
        next(error)
    }
}

// End of auth



// @desc   Update user profile
// @route  POST /api/auth/profile
// @access Private
const updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        // Validate request body
        const { error } = updateProfileValidator(req.body)
        if (error) {
            return next(new AppError(error.details.map((err) => err.message).join(', '), 400));
        }

        // Update user in database
        const user = await UserModel.update(req.user.id, { name, email });


        return successResponse(res, {
            message: 'Profile updated successfully',
            data: { user },
        });
    } catch (error) {
        next(error)
    }
};




// @desc   Delete user 
// @route  DELETE /api/auth/profile
// @access Private
const deleteProfile = async (req, res, next) => {
    try {
        // Delete from database
        await UserModel.delete(req.user.id);
        return successResponse(res, {
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error)
    }
};


// @desc   Logout and revoke refresh token 
// @route  POST /api/auth/logout
// @access Private
const logout = async (req, res, next) => {
    const sessionId = req.user.sessionId

    if (!sessionId) {
        return next(new AppError('Unauthorized', 403));
    }

    try {

        await redis.del(`session:${sessionId}`)
        await SessionModel.invalidateSession(sessionId)

        res.clearCookie("refreshToken")
        return successResponse(res, {
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error)
    }
};


// @desc   Logout and revoke all refresh tokens and sessions
// @route  POST /api/auth/logout-all
// @access Private
const logoutAll = async (req, res, next) => {

    try {

        await SessionModel.invalidateAllUserSession(req.user.id);

        return successResponse(res, {
            message: 'Logged out from all devices'
        });
    } catch (error) {
        next(error)
    }
};


// @desc   Get all sessions of user
// @route  GET /api/auth/sessions
// @access Private
const getUserSessions = async (req, res, next) => {
    const userId = req.user.id

    try {
        const session = await SessionModel.getUserSessions(userId);

        // Identify current session
        const currentSessionId = req.user.sessionId

        const sessions = session.map((session) => ({
            id: session.id,
            device: session.device,
            ip_address: session.ip_address,
            created_at: session.created_at,
            last_used_at: session.last_used_at,
            is_current: currentSessionId === session.id
        }))
        return successResponse(res, {
            message: 'Sessions fetched successfully',
            data: { sessions }
        });
    } catch (error) {
        next(error)
    }
};



// @desc   Logout specific device
// @route  DELETE /api/auth/sessions/:sessionId
// @access Private
const LogoutSpecificDevice = async (req, res, next) => {
    const { sessionId } = req.params

    if (sessionId === req.user.sessionId) {
        return next(new AppError('Cannot logout current device from here', 403));
    }

    try {
        await redis.del(`session:${sessionId}`)
        await SessionModel.invalidateSession(sessionId)
        return successResponse(res, {
            message: 'Device logged out successfully'
        });
    } catch (error) {
        next(error)
    }
};


// @desc   Logout current device
// @route  DELETE /api/auth/sessions/:sessionId
// @access Private
const LogoutCurrentDevice = async (req, res, next) => {
    const { sessionId } = req.params

    if (sessionId === req.user.sessionId) {
        return next(new AppError('Cannot logout current device from here', 403));
    }

    try {
        await redis.del(`session:${sessionId}`)
        await SessionModel.invalidateSession(sessionId)
        return successResponse(res, {
            message: 'Device logged out successfully'
        });
    } catch (error) {
        next(error)
    }
};


module.exports = {
    register,
    login,
    refreshToken,
    verifyEmail,
    forgotPassword,
    resetPassword,
    updateProfile,
    deleteProfile,
    logout,
    logoutAll,
    LogoutSpecificDevice,
    LogoutCurrentDevice,
    getUserSessions
}