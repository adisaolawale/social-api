const dotenv = require("dotenv");
const logger = require("./logger");

const env = process.env.NODE_ENV || "development";

dotenv.config({
    path: `.env.${env}`
});

logger.info(`Loaded environment: ${env}`)
