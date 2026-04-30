const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmailResend = async ({ to, subject, html }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: [to],
            subject,
            html
        })

        if (error) return { error }


        return { cool: data }
    } catch (error) {
        return error
    }

}

module.exports = sendEmailResend;