const { Worker } = require('bullmq');
const dotenv = require('dotenv');
const transport = require('../config/sendMail');
const { verificationEmailTemplate, passwordResetEmailTemplate } = require('../utils/emailTemplate');
const { redisClient } = require('../config/redis');
const { getBullMQConnection } = require('../config/bullmqConnection');

dotenv.config();


// Process email jobs
const emailWorker = new Worker(
    'emailQueue',
    async (job) => {
        console.log(`Processing job: ${job.name}`)
        switch (job.name) {
            case 'welcomeEmail':
                await processWelcomeEmail(job.data);
                break;
            case 'passwordResetEmail':
                await processPasswordResetEmail(job.data);
                break;
            case 'notificationEmail':
                await processNotificationEmail(job.data);
                break;
            default:
                console.log(`Unknown job type: ${job.name}`)
        }
    },
    {
        connection: getBullMQConnection(),
        concurrency: 5
    }
);

// Process welcome email
const processWelcomeEmail = async (data) => {
    try {
        // Replace this with your email provider
        // e.g Nodemailer, SendGrid, Mailgin etc
        console.log(`Sending welcome email to ${data.to}`);
        console.log(`Name: ${data.name}`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Template ${data.template}`);

        let info = await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: data.to,
            subject: data.subject,
            html: verificationEmailTemplate(data.name, data.token)
        })


        if (info.accepted.includes(data.to)) {
            console.log(`Welcome email sent to ${data.to}`)
        }

        // Simulate email sending
        // await new Promise((resolve) => setTimeout(resolve, 1000));

    } catch (error) {
        console.error(`Failed to sent email to ${data.to}`, error)
        throw error;
    }
}


// Process password reset email
const processPasswordResetEmail = async (data) => {
    try {
        console.log(`Sending password reset email to ${data.to}`);
        console.log(`Name: ${data.name}`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Reset Token ${data.resetToken}`);


        let info = await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: data.to,
            subject: data.subject,
            html: passwordResetEmailTemplate(data.name, data.resetToken)
        })


        if (info.accepted[0] === data.to) {  // ✅ use data.to instead
            console.log(`Password reset email sent to ${data.to}`)
        }

        // Simulate email sending
        // await new Promise((resolve) => setTimeout(resolve, 1000));

    } catch (error) {
        console.error(`Failed to send password reset email to ${data.to}`, error)
        throw error;
    }
}


// Process notification email
const processNotificationEmail = async (data) => {
    try {
        console.log(`Sending notification email to ${data.to}`);
        console.log(`Name: ${data.name}`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Message ${data.message}`);

        let info = await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: data.to,
            subject: data.subject,
            html: '<h1>' + data.message + '</h1>'
        })


        if (info.accepted[0] === data.to) {  // ✅ same fix
            console.log(`Notification email sent to ${data.to}`)
        }

        // Simulate email sending
        // await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
        console.error(`Failed to send notification email to ${data.to}`, error)
        throw error;
    }
};

// Worker event listeners
emailWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`)
});

emailWorker.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed`, error.message)
})

emailWorker.on('error', (error) => {
    console.error(`Worker error:`, error)
})

module.exports = emailWorker;