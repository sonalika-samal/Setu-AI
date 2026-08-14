import { Request, Response, NextFunction } from 'express';
import { OwnerAIService } from '../services/ai/OwnerAIService';
import { AuthRequest } from '../middlewares/auth';

const ownerAIService = new OwnerAIService();

export class AIController {
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, history } = req.body;
      const user = (req as AuthRequest).user;
      const orgId = (req as AuthRequest).orgId || 'default';

      if (!message) {
        res.status(400).json({ message: 'Message is required.' });
        return;
      }

      const reply = await ownerAIService.chat(message, history || [], user?.username || 'system', orgId);
      res.status(200).json({ reply });
    } catch (error) {
      next(error);
    }
  }
}
