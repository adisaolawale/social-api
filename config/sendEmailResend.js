const dotenv = require('dotenv');
dotenv.config();

const { Resend } = require('resend');
const AppError = require('../utils/AppError'); // adjust path
const ErrorCodes = require('../constants/errorCodes'); // adjust path

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmailResend = async ({ to, subject, html }) => {
    const { data, error } = await resend.emails.send({
        from: 'Ayeo <info@ayeo.name.ng>',
        to: [to],
        subject,
        html
    });

    if (error) {
        throw new AppError(
            'Failed to send email',
            502,                          // 502 = upstream service (Resend) failed
            ErrorCodes.EMAIL_SEND_FAILED  // add this to your errorCodes constants if not there
        );
    }

    return data;
};

module.exports = sendEmailResend;