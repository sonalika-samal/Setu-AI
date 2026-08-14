import { Request, Response, NextFunction } from 'express';
import { WebhookLogModel } from '../models/WebhookLog';
import { MessageLogModel } from '../models/MessageLog';
import { AILogModel } from '../models/AILog';
import { ActivityLogModel } from '../models/ActivityLog';
import { ErrorLogModel } from '../models/ErrorLog';
import { AuthRequest } from '../middlewares/auth';

export class LogController {
  async getWebhookLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await WebhookLogModel.find({ orgId }).sort({ createdAt: -1 }).limit(limit).lean();
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async getMessageLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await MessageLogModel.find({ orgId }).sort({ timestamp: -1 }).limit(limit).lean();
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async getAILogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await AILogModel.find({ orgId }).sort({ createdAt: -1 }).limit(limit).lean();
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async getActivityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await ActivityLogModel.find({ orgId }).sort({ timestamp: -1 }).limit(limit).lean();
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async getErrorLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await ErrorLogModel.find({ orgId }).sort({ createdAt: -1 }).limit(limit).lean();
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async getErrorCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const count = await ErrorLogModel.countDocuments({ orgId });
      res.status(200).json({ count });
    } catch (error) {
      next(error);
    }
  }

  async clearErrorLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      await ErrorLogModel.deleteMany({ orgId });
      res.status(200).json({ message: 'Error logs cleared successfully.' });
    } catch (error) {
      next(error);
    }
  }
}
export default LogController;
