import winston from 'winston';
import Transport from 'winston-transport';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
  )
);

// Custom Winston Transport to capture error logs in MongoDB
class DatabaseErrorTransport extends Transport {
  constructor(opts?: any) {
    super(opts);
  }


  log(info: any, callback: () => void) {
    const levelStr = String(info.level).toLowerCase().trim();
    // In winston, levels can be colored (containing ANSI escape codes) in some configurations,
    // but the raw level string is clean. Let's check for "error" substring to be safe.
    const isError = levelStr.includes('error');


    if (isError) {
      try {
        const { ErrorLogModel } = require('../models/ErrorLog');
        
        let status = 500;
        let code = 'INTERNAL_SERVER_ERROR';
        
        // Parse status code from request error message format: "[GET] /path - Status: 404 - Error: ..."
        const messageStr = String(info.message);
        const statusMatch = messageStr.match(/status:\s*(\d+)/i);
        if (statusMatch && statusMatch[1]) {
          status = parseInt(statusMatch[1]);
        }
        
        // Map HTTP status codes to standard error codes
        if (status === 400) code = 'BAD_REQUEST';
        else if (status === 401) code = 'UNAUTHORIZED';
        else if (status === 403) code = 'FORBIDDEN';
        else if (status === 404) code = 'RESOURCE_NOT_FOUND';
        else if (status === 422) code = 'VALIDATION_ERROR';

        if (info.code) {
          code = info.code;
        }

        ErrorLogModel.create({
          code,
          message: info.message,
          status,
          timestamp: new Date()
        }).catch(() => {
          // Suppress errors to prevent recursive log loops
        });
      } catch (err) {
        // Suppress
      }
    }

    callback();
  }
}

const transports: winston.transport[] = [
  new winston.transports.Console(),
  new DatabaseErrorTransport(),
];

export const logger = winston.createLogger({
  level: 'debug',
  levels,
  format,
  transports,
});

