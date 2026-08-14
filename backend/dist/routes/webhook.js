"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_1 = require("../controllers/webhook");
const rateLimit_1 = require("../middlewares/rateLimit");
const router = (0, express_1.Router)();
const controller = new webhook_1.WebhookController();
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
router.get('/whatsapp', (0, rateLimit_1.rateLimit)({ windowMs: 60 * 1000, max: 60 }), controller.verifyWebhook.bind(controller));
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
router.post('/whatsapp', (0, rateLimit_1.rateLimit)({ windowMs: 60 * 1000, max: 300 }), controller.receiveWebhook.bind(controller));
exports.default = router;
