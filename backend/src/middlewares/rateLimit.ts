import { Request, Response, NextFunction } from 'express';
import { SecurityLogModel } from '../models/SecurityLog';
import { logger } from '../utils/logger';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitInfo>();

export const rateLimit = (options: { windowMs: number; max: number }) => {
  const { windowMs, max } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let clientLimit = memoryStore.get(ip);

    if (!clientLimit || now > clientLimit.resetTime) {
      clientLimit = {
        count: 1,
        resetTime: now + windowMs
      };
      memoryStore.set(ip, clientLimit);
    } else {
      clientLimit.count++;
    }

    if (clientLimit.count > max) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      
      // Log to Security Logs asynchronously
      SecurityLogModel.create({
        action: 'Rate Limit Exceeded',
        ip_address: ip,
        details: `IP ${ip} made ${clientLimit.count} requests within window (limit ${max})`
      }).catch(err => logger.error(`Failed to log security limit event: ${err.message}`));

      res.status(429).json({
        message: 'Too many requests from this IP, please try again later.'
      });
      return;
    }

    next();
  };
};

export default rateLimit;
