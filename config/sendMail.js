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

const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS upgrade
  requireTLS: true,
  auth: {
    user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
    pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD,
  },
  tls: {
    family: 4, // 👈 FORCE IPv4 (CRITICAL)
  },
  connectionTimeout: 10000,
});

module.exports = transport;