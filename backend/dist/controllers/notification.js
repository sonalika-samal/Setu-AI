"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const Notification_1 = require("../models/Notification");
class NotificationController {
    async list(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const notifications = await Notification_1.NotificationModel.find({ orgId })
                .sort({ timestamp: -1 })
                .limit(10)
                .populate('related_task')
                .populate('related_worker');
            res.status(200).json(notifications);
        }
        catch (error) {
            next(error);
        }
    }
    async markAsRead(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const { ids } = req.body;
            if (Array.isArray(ids) && ids.length > 0) {
                await Notification_1.NotificationModel.updateMany({ orgId, _id: { $in: ids } }, { read_status: 'Read' });
            }
            else {
                // Fallback: mark all as read for this org
                await Notification_1.NotificationModel.updateMany({ orgId, read_status: 'Unread' }, { read_status: 'Read' });
            }
            // Socket.IO broadcast to sync read badge on dashboard session
            const io = req.app.get('io');
            if (io) {
                io.emit('notification:read_sync');
            }
            res.status(200).json({ message: 'Notifications marked as read.' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationController = NotificationController;
