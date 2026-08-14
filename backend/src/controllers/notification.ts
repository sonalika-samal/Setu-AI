import { Request, Response, NextFunction } from 'express';
import { NotificationModel } from '../models/Notification';
import { AuthRequest } from '../middlewares/auth';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const notifications = await NotificationModel.find({ orgId })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('related_task')
        .populate('related_worker');

      res.status(200).json(notifications);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const { ids } = req.body;

      if (Array.isArray(ids) && ids.length > 0) {
        await NotificationModel.updateMany(
          { orgId, _id: { $in: ids } },
          { read_status: 'Read' }
        );
      } else {
        // Fallback: mark all as read for this org
        await NotificationModel.updateMany(
          { orgId, read_status: 'Unread' },
          { read_status: 'Read' }
        );
      }

      // Socket.IO broadcast to sync read badge on dashboard session
      const io = req.app.get('io');
      if (io) {
        io.emit('notification:read_sync');
      }

      res.status(200).json({ message: 'Notifications marked as read.' });
    } catch (error) {
      next(error);
    }
  }
}
