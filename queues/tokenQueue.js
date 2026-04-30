const { Queue } = require('bullmq')
const { redisClient } = require('../config/redis')

const tokenQueue = new Queue('tokenQueue', {
    connection: redisClient,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            removeOnFail: false,
        },
    },
});

const tokenStatusUpdateQueue = async (tokenId, status) => {
    try {
        await tokenQueue.add('tokenStatusUpdate', { tokenId }, { delay: 10 * 60 * 1000 });
    } catch (error) {
        console.error('Error adding job to tokenStatusUpdateQueue:', error);
    }
};

module.exports = {
    tokenQueue,
    tokenStatusUpdateQueue
}