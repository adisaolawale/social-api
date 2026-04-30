const crypto = require('crypto');

function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';

    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % 10];
    }
    return otp;
}

module.exports = generateOTP;