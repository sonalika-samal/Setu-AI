"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogController = void 0;
const WebhookLog_1 = require("../models/WebhookLog");
const MessageLog_1 = require("../models/MessageLog");
const AILog_1 = require("../models/AILog");
const ActivityLog_1 = require("../models/ActivityLog");
const ErrorLog_1 = require("../models/ErrorLog");
class LogController {
    async getWebhookLogs(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await WebhookLog_1.WebhookLogModel.find({ orgId }).sort({ createdAt: -1 }).limit(limit).lean();
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getMessageLogs(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await MessageLog_1.MessageLogModel.find({ orgId }).sort({ timestamp: -1 }).limit(limit).lean();
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getAILogs(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await AILog_1.AILogModel.find({ orgId }).sort({ createdAt: -1 }).limit(limit).lean();
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getActivityLogs(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await ActivityLog_1.ActivityLogModel.find({ orgId }).sort({ timestamp: -1 }).limit(limit).lean();
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getErrorLogs(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const logs = await ErrorLog_1.ErrorLogModel.find({ orgId }).sort({ createdAt: -1 }).limit(limit).lean();
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getErrorCount(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const count = await ErrorLog_1.ErrorLogModel.countDocuments({ orgId });
            res.status(200).json({ count });
        }
        catch (error) {
            next(error);
        }
    }
    async clearErrorLogs(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            await ErrorLog_1.ErrorLogModel.deleteMany({ orgId });
            res.status(200).json({ message: 'Error logs cleared successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LogController = LogController;
exports.default = LogController;
