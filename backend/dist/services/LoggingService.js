"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingService = void 0;
const WebhookLogRepository_1 = require("../repositories/WebhookLogRepository");
const MessageLogRepository_1 = require("../repositories/MessageLogRepository");
const AILogRepository_1 = require("../repositories/AILogRepository");
const ActivityLogRepository_1 = require("../repositories/ActivityLogRepository");
const ErrorLogRepository_1 = require("../repositories/ErrorLogRepository");
const logger_1 = require("../utils/logger");
class LoggingService {
    webhookRepo = new WebhookLogRepository_1.WebhookLogRepository();
    messageRepo = new MessageLogRepository_1.MessageLogRepository();
    aiRepo = new AILogRepository_1.AILogRepository();
    activityRepo = new ActivityLogRepository_1.ActivityLogRepository();
    errorRepo = new ErrorLogRepository_1.ErrorLogRepository();
    async logActivity(username, action, description, orgId = 'default') {
        logger_1.logger.info(`Activity logged [${orgId}]: ${username} - ${action} - ${description || ''}`);
        return this.activityRepo.create({ orgId, username, action, description });
    }
    async getWebhookLogs(limit) {
        return this.webhookRepo.findAll(limit);
    }
    async getMessageLogs(limit) {
        return this.messageRepo.findAll(limit);
    }
    async getAILogs(limit) {
        return this.aiRepo.findAll(limit);
    }
    async getActivityLogs(limit) {
        return this.activityRepo.findAll(limit);
    }
    async getErrorLogs(limit) {
        return this.errorRepo.findAll(limit);
    }
    async getErrorCount() {
        return this.errorRepo.countErrors();
    }
    async clearErrorLogs() {
        return this.errorRepo.clearAll();
    }
}
exports.LoggingService = LoggingService;
