import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/WebhookService';
import { OrganisationModel } from '../models/Organisation';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const webhookService = new WebhookService();

export class WebhookController {
  /**
   * Meta Webhook Verification challenge GET
   */
  async verifyWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      logger.info(`Verification challenge: Mode=${mode}, Token=${token}`);

      // Check against default .env verify token or any registered org verify token
      const expectedToken = config.meta.verifyToken || 'sahayak_verify_token';

      if (mode && token) {
        if (mode === 'subscribe') {
          if (token === expectedToken) {
            logger.info('Meta verification successful via default token.');
            res.status(200).send(challenge);
            return;
          }
          const org = await OrganisationModel.findOne({ metaVerifyToken: token });
          if (org) {
            logger.info(`Meta verification successful for org: ${org.orgId}`);
            res.status(200).send(challenge);
            return;
          }
        }
      }

      logger.warn(`Meta verification failed. Got: ${token}`);
      res.sendStatus(403);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Receive WhatsApp Webhooks POST
   */
  async receiveWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body;
      const io = req.app.get('io');

      // Resolve Organisation from phone_number_id
      const phoneNumberId = payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
      let orgId = 'default';
      if (phoneNumberId) {
        const org = await OrganisationModel.findOne({ metaPhoneNumberId: phoneNumberId, isActive: true });
        if (org) {
          orgId = org.orgId;
        }
      }

      // 1. Respond HTTP 200 immediately
      res.status(200).json({ status: 'received' });

      // 2. Delegate processing asynchronously to the service layer with orgId
      webhookService.processWebhook(payload, io, orgId).catch(err => {
        logger.error(`Async webhook ingestion error for org ${orgId}: ${(err as Error).message}`);
      });
    } catch (error) {
      next(error);
    }
  }
}
export default WebhookController;
