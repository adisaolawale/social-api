const UAParser = require('ua-parser-js');

const getClientInfo = (req) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || req.ip;

    const userAgent = req.headers["user-agent"];

    const parser = new UAParser(userAgent);
    const deviceInfo = parser.getResult();

    const device = `${deviceInfo.device.model || "Unkwown"} - ${deviceInfo.os.name || "Unknown OS"} (${deviceInfo.browser.name || "Unknown Browser"})`;

    return {
        ip,
        userAgent,
        device
    }
}

module.exports = getClientInfo