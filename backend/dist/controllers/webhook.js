"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const WebhookService_1 = require("../services/WebhookService");
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
const webhookService = new WebhookService_1.WebhookService();
class WebhookController {
    /**
     * Meta Webhook Verification challenge GET
     */
    async verifyWebhook(req, res, next) {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            logger_1.logger.info(`Verification challenge: Mode=${mode}, Token=${token}`);
            // Read Verify Token from .env
            const expectedToken = config_1.config.meta.verifyToken || 'sahayak_verify_token';
            if (mode && token) {
                if (mode === 'subscribe' && token === expectedToken) {
                    logger_1.logger.info('Meta verification successful.');
                    res.status(200).send(challenge);
                    return;
                }
            }
            logger_1.logger.warn(`Meta verification failed. Expected: ${expectedToken}, Got: ${token}`);
            res.sendStatus(403);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Receive WhatsApp Webhooks POST
     */
    async receiveWebhook(req, res, next) {
        try {
            const payload = req.body;
            const io = req.app.get('io');
            // 1. Respond HTTP 200 immediately
            res.status(200).json({ status: 'received' });
            // 2. Delegate processing asynchronously to the service layer
            webhookService.processWebhook(payload, io).catch(err => {
                logger_1.logger.error(`Async webhook ingestion error: ${err.message}`);
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WebhookController = WebhookController;
exports.default = WebhookController;
