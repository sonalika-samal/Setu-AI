"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogController = void 0;
const LoggingService_1 = require("../services/LoggingService");
const loggingService = new LoggingService_1.LoggingService();
class LogController {
    async getWebhookLogs(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await loggingService.getWebhookLogs(limit);
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getMessageLogs(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await loggingService.getMessageLogs(limit);
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getAILogs(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await loggingService.getAILogs(limit);
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getActivityLogs(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await loggingService.getActivityLogs(limit);
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getErrorLogs(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await loggingService.getErrorLogs(limit);
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getErrorCount(req, res, next) {
        try {
            const count = await loggingService.getErrorCount();
            res.status(200).json({ count });
        }
        catch (error) {
            next(error);
        }
    }
    async clearErrorLogs(req, res, next) {
        try {
            await loggingService.clearErrorLogs();
            res.status(200).json({ message: 'Error logs cleared successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LogController = LogController;
exports.default = LogController;
