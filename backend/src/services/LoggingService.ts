import { WebhookLogRepository } from '../repositories/WebhookLogRepository';
import { MessageLogRepository } from '../repositories/MessageLogRepository';
import { AILogRepository } from '../repositories/AILogRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { ErrorLogRepository } from '../repositories/ErrorLogRepository';
import { logger } from '../utils/logger';

export class LoggingService {
  private webhookRepo = new WebhookLogRepository();
  private messageRepo = new MessageLogRepository();
  private aiRepo = new AILogRepository();
  private activityRepo = new ActivityLogRepository();
  private errorRepo = new ErrorLogRepository();

  async logActivity(username: string, action: string, description?: string, orgId: string = 'default') {
    logger.info(`Activity logged [${orgId}]: ${username} - ${action} - ${description || ''}`);
    return this.activityRepo.create({ orgId, username, action, description });
  }

  async getWebhookLogs(limit?: number) {
    return this.webhookRepo.findAll(limit);
  }

  async getMessageLogs(limit?: number) {
    return this.messageRepo.findAll(limit);
  }

  async getAILogs(limit?: number) {
    return this.aiRepo.findAll(limit);
  }

  async getActivityLogs(limit?: number) {
    return this.activityRepo.findAll(limit);
  }

  async getErrorLogs(limit?: number) {
    return this.errorRepo.findAll(limit);
  }

  async getErrorCount(): Promise<number> {
    return this.errorRepo.countErrors();
  }

  async clearErrorLogs() {
    return this.errorRepo.clearAll();
  }
}

