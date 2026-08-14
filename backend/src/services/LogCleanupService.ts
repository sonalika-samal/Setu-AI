import { WebhookLogModel } from '../models/WebhookLog';
import { MessageLogModel } from '../models/MessageLog';
import { AILogModel } from '../models/AILog';
import { ActivityLogModel } from '../models/ActivityLog';
import { ErrorLogModel } from '../models/ErrorLog';
import { logger } from '../utils/logger';

export class LogCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Deletes all logs older than 7 days from the database.
   */
  static async pruneOldLogs(): Promise<void> {
    logger.info('[LogCleanupService]: Starting log pruning process...');
    
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      logger.info(`[LogCleanupService]: Cutoff timestamp for pruning is: ${sevenDaysAgo.toISOString()}`);

      // Perform deletions on all 5 log models
      const webhookPrune = await WebhookLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
      const messagePrune = await MessageLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
      const aiPrune = await AILogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
      const activityPrune = await ActivityLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
      const errorPrune = await ErrorLogModel.deleteMany({ timestamp: { $lt: sevenDaysAgo } });

      logger.info(
        `[LogCleanupService]: Log pruning completed successfully. ` +
        `Deleted counts - WebhookLogs: ${webhookPrune.deletedCount}, ` +
        `MessageLogs: ${messagePrune.deletedCount}, ` +
        `AILogs: ${aiPrune.deletedCount}, ` +
        `ActivityLogs: ${activityPrune.deletedCount}, ` +
        `ErrorLogs: ${errorPrune.deletedCount}.`
      );
    } catch (error) {
      logger.error(`[LogCleanupService]: Failed to prune old logs: ${(error as Error).message}`);
    }
  }

  /**
   * Starts a background interval to run log pruning daily (every 24 hours).
   */
  static startCleanupScheduler(): void {
    logger.info('[LogCleanupService]: Initializing logs cleanup daily scheduler...');
    
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    this.cleanupInterval = setInterval(async () => {
      await this.pruneOldLogs();
    }, TWENTY_FOUR_HOURS_MS);
  }

  /**
   * Stops the daily cleanup scheduler.
   */
  static stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info('[LogCleanupService]: Stopped logs cleanup scheduler.');
  }
}
