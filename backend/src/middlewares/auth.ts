import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { UserRepository } from '../repositories/UserRepository';
import { logger } from '../utils/logger';

const userRepo = new UserRepository();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'Admin' | 'Owner' | 'Worker' | 'SuperAdmin';
    orgId: string;
  };
  orgId?: string;
}

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      username: string;
      role: 'Admin' | 'Owner' | 'Worker' | 'SuperAdmin';
      orgId?: string;
    };

    // Verify user still exists in DB
    const userExists = await userRepo.findById(decoded.id);
    if (!userExists) {
      res.status(401).json({ message: 'User no longer exists' });
      return;
    }

    // Check account status
    if ((userExists as any).account_status === 'Disabled') {
      res.status(403).json({ message: 'Access Denied: This account has been disabled.' });
      return;
    }

    // Check token version for Force Logout Session Management
    const tokenVersion = (decoded as any).token_version;
    if (tokenVersion !== undefined && tokenVersion !== (userExists as any).token_version) {
      res.status(401).json({ message: 'Session expired or invalidated. Please sign in again.' });
      return;
    }

    const resolvedOrgId = (userExists as any).orgId || decoded.orgId || 'default';

    (req as AuthRequest).user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      orgId: resolvedOrgId,
    };
    (req as AuthRequest).orgId = resolvedOrgId;

    next();
  } catch (error) {
    logger.warn(`JWT verification failed: ${(error as Error).message}`);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: Array<'Admin' | 'Owner' | 'Worker' | 'SuperAdmin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRoleLower = user.role ? user.role.toLowerCase() : '';
    const rolesLower = roles.map(r => r.toLowerCase());

    if (!rolesLower.includes(userRoleLower)) {
      res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
      return;
    }

    next();
  };
};
