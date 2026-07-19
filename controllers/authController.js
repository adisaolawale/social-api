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
const { resolveUsername } = require('../utils/resolveUsername');
const ErrorCodes = require('../constants/errorCodes');




const sendVerificationCodeForUnverifiedUser = async (user) => {
    const identificationToken = crypto.randomBytes(32).toString('hex');
    const verificationToken = generateOTP(6);
    const tokenHash = hashToken(verificationToken);

    const tokenRecord = await tokenModel.createToken({
        userId: user.id,
        tokenHash,
        type: tokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await redis.set(
        `email_verify:${identificationToken}`,
        {
            userId: user.id,
            email: user.email,
            tokenId: tokenRecord.id,
            tokenHash
        },
        900
    );

    await transport.sendMail({
        from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
        to: user.email,
        subject: 'Verify your account',
        html: verificationEmailTemplate(user.fullName, verificationToken)
    });

    return identificationToken;
};


const sendVerificationCodeForLogin = async (user) => {
    const identificationToken = crypto.randomBytes(32).toString('hex');
    const otp = generateOTP(6);
    const tokenHash = hashToken(otp);

    const tokenRecord = await tokenModel.createToken({
        userId: user.id,
        tokenHash,
        type: tokenType.LOGIN_OTP,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await redis.set(
        `login_otp:${identificationToken}`,
        {
            userId: user.id,
            email: user.email,
            tokenId: tokenRecord.id,
            tokenHash
        },
        600 // 10 minutes
    );

    await transport.sendMail({
        from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
        to: user.email,
        subject: 'Your Login Code',
        html: verificationEmailTemplate(user.fullName || 'User', otp)
    });

    return identificationToken;
};


// @desc   Register new user
// @route  POST /api/auth/register
// @access Public

const register = async (req, res, next) => {
    try {
        const { email, password, fullName } = req.body;

        const { error } = registerValidator(req.body)
        if (error) {
            return next(new AppError(
                error.details.map((err) => err.message).join(', '), 
                400,
                ErrorCodes.VALIDATION_ERROR
            ));
        }

        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return next(new AppError('User already exists', 400, ErrorCodes.ACCOUNT_ALREADY_EXISTS));
        }

        // Hash password
        const salt = await bcrypt.genSalt(
            parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
        );
        const hashedPassword = await bcrypt.hash(password, salt);

        const username = await resolveUsername(fullName)

        console.log("2username:", username)

        // Create user
        const user = await UserModel.create({
            username,
            email,
            password: hashedPassword,
            fullName,
            provider: 'password',      // Explicit
            has_password: true
        });

        // Generate verification token
        const identificationToken = crypto.randomBytes(32).toString('hex')
        //const verificationToken = Math.floor(Math.random() * 1000000).toString();
        const verificationToken = generateOTP(6)
        console.log(verificationToken)


        const token = await tokenModel.createToken({
            userId: user.id,
            tokenHash: hashToken(verificationToken),
            type: tokenType.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })


        // Store in Redis - expires in 24 hours
        await redis.set(
            `email_verify:${identificationToken}`,
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
            data: { identificationToken }
        });
    } catch (error) {
        next(error)
    }
};


// @desc   Resend verification code
// @route  POST /api/auth/resend-verification-code/:identificationToken
// @access Public
const resendVerificationCode = async (req, res, next) => {
    try {
        const { identificationToken } = req.params;

        const redisData = await redis.get(`email_verify:${identificationToken}`);
        if (!redisData) {
            return next(new AppError(
                'Invalid or expired verification token', 
                400,
                ErrorCodes.LOGIN_CODE_EXPIRED
            ));
        }

        const user = await UserModel.findById(redisData.userId);
        if (!user) {
            return next(new AppError(
                'User not found', 
                404, 
                ErrorCodes.USER_NOT_FOUND
            ));
        }

        // Rate limiting (optional but strongly recommended)
        const resendCount = await redis.get(`resend_count:${identificationToken}`) || 0;
        if (parseInt(resendCount) >= 5) {
            return next(new AppError(
                'Too many resend attempts. Try again later.', 
                429,
                ErrorCodes.TOO_MANY_RESEND_ATTEMPTS
            ));
        }

        const newVerificationToken = generateOTP(6);

        const newTokenHash = hashToken(newVerificationToken);

        // Update DB token
        await tokenModel.updateToken({
            tokenHash: redisData.tokenHash,
            newTokenHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        // Update Redis
        await redis.del(`email_verify:${identificationToken}`);

        await redis.set(
            `email_verify:${identificationToken}`,
            {
                userId: user.id,
                email: user.email,
                tokenId: redisData.tokenId,
                tokenHash: newTokenHash
            },
            900   // 15 minutes
        );

        // Increment resend counter
        await redis.set(`resend_count:${identificationToken}`, parseInt(resendCount) + 1, 3600); // 1 hour

        // Send email
        await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: user.email,
            subject: 'Your new verification code',
            html: verificationEmailTemplate(user.fullName, newVerificationToken)
        });

        return successResponse(res, {
            message: 'Verification code resent successfully',
            data: { identificationToken }
        });

    } catch (error) {
        next(error);
    }
};


// @desc   Verify email
// @route  POST /api/auth/verify-email/:identificationToken
// @access Public
const verifyEmail = async (req, res, next) => {
    try {
        const { identificationToken } = req.params
        const { token } = req.body


        // Check token in Redis
        const data = await redis.get(`email_verify:${identificationToken}`)

        if (!data) {
            return next(new AppError(
                'Invalid or expired verification token', 
                400, 
                ErrorCodes.INVALID_TOKEN
            ));
        }

        const checkFinal = await tokenModel.verifyToken({ tokenHash: data.tokenHash, type: tokenType.EMAIL_VERIFICATION }, next)

        if (!checkFinal) {
            return next(new AppError(
                'Invalid or expired verification token', 
                400, 
                ErrorCodes.INVALID_TOKEN
            ));
        }

        // Mark email as verified in database
        await UserModel.verifyEmail(data.userId)

        // Delete token from Redis - one time use
        await redis.del(`email_verify:${identificationToken}`)

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

        const { error } = loginValidator(req.body);
        if (error) {
            return next(new AppError(
                error.details.map(err => err.message).join(', '), 
                400,
                ErrorCodes.VALIDATION_ERROR
            ));
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            return next(new AppError('Invalid credentials', 400, ErrorCodes.INVALID_CREDENTIALS));
        }

        if (user.provider === 'email_otp' && !user.has_password) {
            return next(new AppError(
                'This account uses passwordless login. Please use "Login with Code" instead.',
                403,
                ErrorCodes.PASSWORDLESS_ACCOUNT
            ));
        }

        if (!user.is_verified) {
            const identificationToken = await sendVerificationCodeForUnverifiedUser(user);
            return next(new AppError(
                'Account not verified. We have sent a new verification code to your email.',
                403,
                ErrorCodes.EMAIL_NOT_VERIFIED,
                { identificationToken }
            ));
        }

        if (!user.password) {
            return next(new AppError(
                'Invalid credentials', 
                401,
                ErrorCodes.INVALID_CREDENTIALS
            ));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new AppError(
                'Invalid credentials', 
                401,
                ErrorCodes.INVALID_CREDENTIALS
            ));
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


// @desc   Passwordless Login - Send OTP
// @route  POST /api/auth/login-passwordless
// @access Public
const loginPasswordless = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next(new AppError(
                'Email is required', 
                400, 
                ErrorCodes.EMAIL_REQUIRED
            ));
        }

        let user = await UserModel.findByEmail(email);
        const isNewUser = !user;

        if (isNewUser) {
            const tempName = email.split('@')[0];

            user = await UserModel.create({
                email,
                fullName: tempName,
                username: await resolveUsername(tempName),
                password: null,
                provider: 'email_otp',
                has_password: false,
                is_verified: false
            });
        }

        const identificationToken = await sendVerificationCodeForLogin(user);

        return successResponse(res, {
            message: "A login code has been sent to your email",
            data: {
                identificationToken,
                isNewUser
            }
        });

    } catch (error) {
        next(error);
    }
};



// @desc   Verify Passwordless Login OTP
// @route  POST /api/auth/verify-login-otp
// @access Public
const verifyLoginOTP = async (req, res, next) => {
    try {
        const { identificationToken, code } = req.body;

        if (!identificationToken || !code) {
            return next(new AppError(
                'Token and code are required', 
                400, 
                ErrorCodes.INVALID_TOKEN
            ));
        }

        const redisData = await redis.get(`login_otp:${identificationToken}`);
        if (!redisData) {
            return next(new AppError(
                'Invalid or expired code', 
                400, 
                ErrorCodes.INVALID_TOKEN
            ));
        }

        // Verify OTP
        await tokenModel.verifyToken(redisData.tokenHash, tokenType.LOGIN_OTP);

        // Mark user as verified
        await UserModel.verifyEmail(redisData.userId);

        const user = await UserModel.findById(redisData.userId);

        // Create session and tokens (reuse your existing logic)
        const { ip, userAgent, device } = getClientInfo(req);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const session = await SessionModel.createSession({
            userId: user.id,
            device,
            ip,
            userAgent,
            expiresAt
        });

        const accessToken = generateAccessToken(user.id, session.id);
        const refreshToken = generateRefreshToken(user.id, session.id);

        const hashedToken = hashToken(refreshToken);
        await SessionModel.updateSessionHashToken({ sessionId: session.id, hashedToken });

        await redis.set(`session:${session.id}`, {
            userId: user.id,
            device: session.device,
            ip: session.ip,
            lastUsedAt: session.last_used_at
        }, 7 * 24 * 60 * 60);

        await logActivity({
            userId: user.id,
            action: userLogsAction.AUTH_LOGIN,
            ip: req.ip,
            userAgent,
            metadata: { email: user.email, method: 'passwordless' }
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        await UserModel.updateLastSeen(user.id);

        const { password: _, ...safeUser } = user;

        return successResponse(res, {
            message: 'Login successful',
            data: {
                user: safeUser,
                accessToken,
                refreshToken,
                isNewUser: !user.is_verified // in case you need it
            }
        });

    } catch (error) {
        next(error);
    }
};

// ====================== SET PASSWORD FOR PASSWORDLESS USERS ======================

// @desc   Set password for passwordless user
// @route  POST /api/auth/set-password
// @access Private (must be logged in)
const setPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        const userId = req.user.id;

        const user = await UserModel.findById(userId);

        if (!user) {
            return next(new AppError(
                'User not found', 
                404,
                ErrorCodes.USER_NOT_FOUND
            ));
        }

        if (user.has_password) {
            return next(new AppError(
                'Password already set', 
                400,
                ErrorCodes.PASSWORD_ALREADY_SET
            ));
        }

        // Hash and save password
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await UserModel.updatePassword(userId, hashedPassword);

        // Update user flags
        // await UserModel.update(userId, { 
        //     provider: 'password', 
        //     has_password: true 
        // });

        return successResponse(res, {
            message: 'Password set successfully. You can now login with email and password.'
        });

    } catch (error) {
        next(error);
    }
};




// @desc   Refresh Token
// @route  POST /api/auth/refresh
// @access Public
const refreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken

        // Check if all fields are provided
        if (!refreshToken) {
            return next(new AppError(
                'Unauthorized', 
                401,
                ErrorCodes.UNAUTHORIZED
            ));
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

        console.log(refreshToken)
        const session = await SessionModel.getSessionByToken(refreshToken);
        if (!session || !session.is_valid) {
            // Token reuse detected
            await SessionModel.invalidateAllUserSession(decoded.id);
            return next(new AppError(
                'Session compromised. Please login again', 
                403,
                ErrorCodes.FORBIDDEN
            ));
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


        // After successful rotation
        await SessionModel.updateLastUsed(decoded.sessionId);  // Add this
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            //secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            // path: "/api/auth/refresh",
        });

        return successResponse(res, {
            message: 'Successful',
            data: {
                accessToken,
                refreshToken: newRefreshToken
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError(
                'Invalid token', 
                401,
                ErrorCodes.INVALID_TOKEN
            ));
        }

        if (error.name === 'TokenExpiredError') {
            return next(new AppError(
                'Token expired please login again', 
                401,
                ErrorCodes.TOKEN_EXPIRED
            ));
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

        const hashedToken = hashToken(resetToken)

        const token = await tokenModel.createTokenTable({
            userId: user.id,
            tokenHash: hashedToken,
            type: tokenType.PASSWORD_RESET,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });

        console.log(token)


        // Store in Redis - expires in 10 minutes
        await redis.set(
            `password_reset:${resetToken}`,
            { userId: user.id, email: user.email, tokenId: token.id, tokenHash: hashedToken },
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
const verifyPasswordEmail = async (req, res, next) => {
    try {
        const { token } = req.params

        console.log(token)
        // Check token in Redis
        const data = await redis.get(`password_reset:${token}`)
        if (!data) {
            return next(new AppError(
                'Invalid or expired reset token', 
                400,
                ErrorCodes.INVALID_TOKEN
            ));
        }
        console.log(data)


        console.log(token)
        const checkFinal = await tokenModel.findToken(data.tokenHash, tokenType.PASSWORD_RESET)
        if (!checkFinal) {
            return next(new AppError(
                'Invalid or expired reset token', 
                400,
                ErrorCodes.INVALID_TOKEN
            ));
        }

        console.log(hashToken(token))
        console.log(checkFinal)

        if (checkFinal.token_hash !== hashToken(token)) {
            return next(new AppError(
                'Invalid or expired reset token', 
                400,
                ErrorCodes.INVALID_TOKEN
            ));
        }
        console.log(token)

        // Delete reset token - one time use
        await redis.del(`password_reset:${token}`)
        await tokenModel.deleteToken(data.tokenId)

        console.log(token)
        // Revoke all refresh tokens for this user
        // so they are forced to login again everywhere
        // We do this by storing a blacklist key in Redis with the user id and checking it in the auth middleware

        await redis.set(`blacklist:user:${data.userId}`, 'true', 7 * 24 * 60 * 60)

        const verificationToken = crypto.randomBytes(32).toString('hex')
        console.log(verificationToken)

        await redis.set(
            `crypto:${verificationToken}`,
            { userId: data.userId, email: data.email },
            600
        )


        return successResponse(res, {
            message: 'Email verify successful',
            data: {
                crypto: verificationToken
            }
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
        const { cryptoToken } = req.params
        const { password } = req.body

        // Check token in Redis
        const data = await redis.get(`crypto:${cryptoToken}`)

        console.log(data)
        if (!data) {
            return next(new AppError(
                'Invalid or expired reset token', 
                400,
                ErrorCodes.INVALID_TOKEN
            ));
        }



        // const checkFinal = await tokenModel.findToken(data.tokenId, tokenType.PASSWORD_RESET)
        // if (!checkFinal) {
        //     return next(new AppError('Invalid or expired reset token', 400));
        // }

        // if (checkFinal.token_hash !== hashToken(token)) {
        //     return next(new AppError('Invalid or expired reset token', 400));
        // }


        // Hash password
        const salt = await bcrypt.genSalt(
            parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
        );
        const hashedPassword = await bcrypt.hash(password, salt);


        // Update password in database
        await UserModel.updatePassword(data.userId, hashedPassword)

        // Delete reset token - one time use
        await redis.del(`crypto:${cryptoToken}`)
        // await tokenModel.deleteToken(data.tokenId)

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
        return next(new AppError(
            'Unauthorized', 
            403,
            ErrorCodes.UNAUTHORIZED
        ));
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


const logoutWeb = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken
    const hashedToken = hashToken(refreshToken)

    if (!hashedToken) {
        return next(new AppError(
            'Unauthorized', 
            403,
            ErrorCodes.UNAUTHORIZED
        ));
    }

    try {
        await SessionModel.invalidateSessionByHashToken(hashedToken)

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
        return next(new AppError(
            'Cannot logout current device from here', 
            403,
            ErrorCodes.UNAUTHORIZED
        ));
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
        return next(new AppError(
            'Cannot logout current device from here', 
            403,
            ErrorCodes.UNAUTHORIZED
        ));
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
    loginPasswordless,
    verifyLoginOTP,
    setPassword,
    resendVerificationCode,
    refreshToken,
    verifyEmail,
    forgotPassword,
    verifyPasswordEmail,
    resetPassword,
    updateProfile,
    deleteProfile,
    logout,
    logoutWeb,
    logoutAll,
    LogoutSpecificDevice,
    LogoutCurrentDevice,
    getUserSessions
}