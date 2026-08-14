import { Router } from 'express';
import { WebhookController } from '../controllers/webhook';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();
const controller = new WebhookController();

/**
 * @swagger
 * /api/webhooks/whatsapp:
 *   get:
 *     summary: Meta WhatsApp webhook challenge verification
 *     tags: [Webhooks]
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: hub.verify_token
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: hub.challenge
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Webhook verified successfully (returns challenge)
 *       403:
 *         description: Verification failed
 */
router.get(
  '/whatsapp',
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  controller.verifyWebhook.bind(controller)
);

/**
 * @swagger
 * /api/webhooks/whatsapp:
 *   post:
 *     summary: Receive WhatsApp webhook events from Meta
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event received successfully
 */
router.post(
  '/whatsapp',
  rateLimit({ windowMs: 60 * 1000, max: 300 }),
  controller.receiveWebhook.bind(controller)
);

export default router;
