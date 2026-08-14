import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireOrgContext = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const orgId = req.user?.orgId || req.orgId;
  if (!orgId) {
    res.status(403).json({ message: 'No organisation context. Please log in again.' });
    return;
  }
  req.orgId = orgId;
  next();
};
