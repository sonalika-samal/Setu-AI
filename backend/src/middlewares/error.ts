import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  let code = err.code || 'INTERNAL_SERVER_ERROR';
  if (!err.code) {
    if (statusCode === 400) code = 'BAD_REQUEST';
    else if (statusCode === 401) code = 'UNAUTHORIZED';
    else if (statusCode === 403) code = 'FORBIDDEN';
    else if (statusCode === 404) code = 'RESOURCE_NOT_FOUND';
    else if (statusCode === 422) code = 'VALIDATION_ERROR';
  }

  logger.error(`[${req.method}] ${req.path} - Status: ${statusCode} - Error: ${message}\nStack: ${err.stack}`);

  res.status(statusCode).json({
    error: {
      code,
      message: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : message,
      status: statusCode,
      timestamp: new Date().toISOString(),
    }
  });
};

