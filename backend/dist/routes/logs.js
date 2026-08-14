"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const log_1 = require("../controllers/log");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const controller = new log_1.LogController();
router.use(auth_1.authenticateJWT);
/**
 * @swagger
 * /api/logs/webhooks:
 *   get:
 *     summary: Retrieve Meta WhatsApp webhook ingestion logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/webhooks', controller.getWebhookLogs.bind(controller));
/**
 * @swagger
 * /api/logs/messages:
 *   get:
 *     summary: Retrieve message logs (incoming/outgoing message history)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/messages', controller.getMessageLogs.bind(controller));
/**
 * @swagger
 * /api/logs/ai:
 *   get:
 *     summary: Retrieve AI call telemetry logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/ai', controller.getAILogs.bind(controller));
/**
 * @swagger
 * /api/logs/activity:
 *   get:
 *     summary: Retrieve user action activity logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/activity', controller.getActivityLogs.bind(controller));
/**
 * @swagger
 * /api/logs/errors:
 *   get:
 *     summary: Retrieve error logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/errors', controller.getErrorLogs.bind(controller));
/**
 * @swagger
 * /api/logs/errors/count:
 *   get:
 *     summary: Retrieve count of active error logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/errors/count', controller.getErrorCount.bind(controller));
/**
 * @swagger
 * /api/logs/errors:
 *   delete:
 *     summary: Clear all error logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/errors', controller.clearErrorLogs.bind(controller));
exports.default = router;
