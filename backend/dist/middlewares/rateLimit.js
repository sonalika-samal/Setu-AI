"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = void 0;
const SecurityLog_1 = require("../models/SecurityLog");
const logger_1 = require("../utils/logger");
const memoryStore = new Map();
const rateLimit = (options) => {
    const { windowMs, max } = options;
    return async (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        let clientLimit = memoryStore.get(ip);
        if (!clientLimit || now > clientLimit.resetTime) {
            clientLimit = {
                count: 1,
                resetTime: now + windowMs
            };
            memoryStore.set(ip, clientLimit);
        }
        else {
            clientLimit.count++;
        }
        if (clientLimit.count > max) {
            logger_1.logger.warn(`Rate limit exceeded for IP: ${ip}`);
            // Log to Security Logs asynchronously
            SecurityLog_1.SecurityLogModel.create({
                action: 'Rate Limit Exceeded',
                ip_address: ip,
                details: `IP ${ip} made ${clientLimit.count} requests within window (limit ${max})`
            }).catch(err => logger_1.logger.error(`Failed to log security limit event: ${err.message}`));
            res.status(429).json({
                message: 'Too many requests from this IP, please try again later.'
            });
            return;
        }
        next();
    };
};
exports.rateLimit = rateLimit;
exports.default = exports.rateLimit;
