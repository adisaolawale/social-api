// const nodemailer = require('nodemailer')

// const transport = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
//         pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD
//     },
//     family: 4
// })


// module.exports = transport;

const dotenv = require('dotenv');
dotenv.config();
const { BrevoClient } = require('@getbrevo/brevo');

const client = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const transport = {
  sendMail: async ({ to, subject, html }) => {
    console.log('BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL);
    return client.transactionalEmails.sendTransacEmail({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || 'Vibe Hub',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
  },
};

module.exports = transport;