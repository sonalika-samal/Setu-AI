"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogCleanupService = void 0;
const WebhookLog_1 = require("../models/WebhookLog");
const MessageLog_1 = require("../models/MessageLog");
const AILog_1 = require("../models/AILog");
const ActivityLog_1 = require("../models/ActivityLog");
const ErrorLog_1 = require("../models/ErrorLog");
const logger_1 = require("../utils/logger");
class LogCleanupService {
    static cleanupInterval = null;
    /**
     * Deletes all logs older than 7 days from the database.
     */
    static async pruneOldLogs() {
        logger_1.logger.info('[LogCleanupService]: Starting log pruning process...');
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            logger_1.logger.info(`[LogCleanupService]: Cutoff timestamp for pruning is: ${sevenDaysAgo.toISOString()}`);
            // Perform deletions on all 5 log models
            const webhookPrune = await WebhookLog_1.WebhookLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
            const messagePrune = await MessageLog_1.MessageLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
            const aiPrune = await AILog_1.AILogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
            const activityPrune = await ActivityLog_1.ActivityLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
            const errorPrune = await ErrorLog_1.ErrorLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
            logger_1.logger.info(`[LogCleanupService]: Log pruning completed successfully. ` +
                `Deleted counts - WebhookLogs: ${webhookPrune.deletedCount}, ` +
                `MessageLogs: ${messagePrune.deletedCount}, ` +
                `AILogs: ${aiPrune.deletedCount}, ` +
                `ActivityLogs: ${activityPrune.deletedCount}, ` +
                `ErrorLogs: ${errorPrune.deletedCount}.`);
        }
        catch (error) {
            logger_1.logger.error(`[LogCleanupService]: Failed to prune old logs: ${error.message}`);
        }
    }
    /**
     * Starts a background interval to run log pruning daily (every 24 hours).
     */
    static startCleanupScheduler() {
        logger_1.logger.info('[LogCleanupService]: Initializing logs cleanup daily scheduler...');
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        this.cleanupInterval = setInterval(async () => {
            await this.pruneOldLogs();
        }, TWENTY_FOUR_HOURS_MS);
    }
    /**
     * Stops the daily cleanup scheduler.
     */
    static stopCleanupScheduler() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        logger_1.logger.info('[LogCleanupService]: Stopped logs cleanup scheduler.');
    }
}
exports.LogCleanupService = LogCleanupService;
