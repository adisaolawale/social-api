const { Queue } = require('bullmq');
const { redisClient } = require('../config/redis');
const { getBullMQConnection } = require('../config/bullmqConnection');

// Create email queue
const emailQueue = new Queue('emailQueue', {
    connection: getBullMQConnection(),
    defaultJobOptions: {
        attempts: 3,
        removeOnFail: false,       // ← sibling to backoff
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});


// Add welcome email job to queue 
const sendWelcomeEmail = async (user, verificationToken) => {
    try {
        await emailQueue.add('welcomeEmail', {
            to: user.email,
            name: user.username,
            subject: 'Welcome to Production REST API',
            template: 'welcome',
            token: verificationToken
        });
        console.log(`Welcome email job added for ${user.email}`);
    } catch (error) {
        console.error('Failed to add welcome email job:', error)
    }
}


// Add password reset email job to queue 
const sendPasswordResetEmail = async (user, resetToken) => {
    try {
        await emailQueue.add('passwordResetEmail', {
            to: user.email,
            name: user.username,
            subject: 'Password Reset Request',
            template: 'passwordReset',
            resetToken
        });
        console.log(`Password reset email job added for ${user.email}`);
    } catch (error) {
        console.error('Failed to add password email job:', error)
    }
}


// Add notification email job to queue 
const sendNotificationEmail = async (user, resetToken) => {
    try {
        await emailQueue.add('notificationResetEmail', {
            to: user.email,
            name: user.username,
            subject: 'Notification',
            template: 'notification',
            resetToken
        });
        console.log(`Notification email job added for ${user.email}`);
    } catch (error) {
        console.error('Failed to add notification email job:', error)
    }
}

module.exports = {
    emailQueue,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendNotificationEmail
}
