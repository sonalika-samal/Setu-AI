import { Request, Response, NextFunction } from 'express';
import { CredentialService } from '../services/CredentialService';
import { LoggingService } from '../services/LoggingService';
import { AuthRequest } from '../middlewares/auth';

const credentialService = new CredentialService();
const loggingService = new LoggingService();

export class CredentialController {
  async getCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const credentials = await credentialService.getCredentials(orgId);
      res.status(200).json(credentials);
    } catch (error) {
      next(error);
    }
  }

  async updateCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const updateData = req.body;
      const user = (req as AuthRequest).user;

      // 1. Validate Request
      if (!updateData.meta || !updateData.sarvam || !updateData.settings) {
        res.status(400).json({ message: 'Invalid configuration payload.' });
        return;
      }

      // 2. Call Service
      const updated = await credentialService.updateCredentials(updateData, orgId);

      // Log action
      await loggingService.logActivity(
        user?.username || 'system',
        'Credentials Modified',
        'Sensitive application credentials updated.',
        orgId
      );

      // 3. Return Response
      res.status(200).json({
        message: 'Credentials updated successfully',
        credentials: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDbStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dbInfo = await credentialService.getDatabaseStatus();
      res.status(200).json(dbInfo);
    } catch (error) {
      next(error);
    }
  }
}
export default CredentialController;
