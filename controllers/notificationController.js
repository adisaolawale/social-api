const { NotificationModel } = require("../models/notificationModel");


// @desc     Get all notifications
// @route    GET /api/notifications
// @access   Private

const getNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const data = await NotificationModel.findByUserId({
            userId: req.user.id,
            page,
            limit
        })

        return successResponse(res, {
            message: 'Notifications fetched successfully',
            data: { notifications: data.notifications },
            meta: { pagination: data.pagination }
        });
    } catch (error) {
        next(error)
    }
}



// @desc     Get unread count
// @route    GET /api/notifications/unread-count
// @access   Private

const getUnreadCount = async (req, res, next) => {
    try {

        const count = await NotificationModel.getUnreadCount(req.user.id)

        return successResponse(res, {
            message: 'Unread count fetched successfully',
            data: { unreadCount: count },
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Mark one as read
// @route    PATCH /api/notifications/:notificationId/read
// @access   Private

const markOneRead = async (req, res, next) => {
    try {

        const { notificationId } = req.params
        const notification = await NotificationModel.markOneRead({
            notificationId,
            userId: req.user.id
        })

        if (!notification) {
            return next(new AppError('Notification not found', 404));
        }

        return successResponse(res, {
            message: 'Notification marked as read',
            data: { notification },
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Mark all as read
// @route    PATCH /api/notifications/read-all
// @access   Private

const markAllRead = async (req, res, next) => {
    try {

        const notification = await NotificationModel.markAllRead(req.user.id)


        return successResponse(res, {
            message: 'All notifications marked as read'
        });
    } catch (error) {
        next(error)
    }
}


// @desc     Delete a notification
// @route    GET /api/notifications/:notificationId
// @access   Private

const deleteOne = async (req, res, next) => {
    try {

        const { notificationId } = req.params
        const deleted = await NotificationModel.deleteOne({
            notificationId,
            userId: req.user.id
        })

        if (!deleted) {
            return next(new AppError('Notification not found', 404));
        }

        return successResponse(res, {
            message: 'Notification deleted'
        });
    } catch (error) {
        next(error)
    }
}


module.exports = {
    getNotifications,
    getUnreadCount,
    markOneRead,
    markAllRead,
    deleteOne
}