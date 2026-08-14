import { Router } from 'express';
import { LogController } from '../controllers/log';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();
const controller = new LogController();

router.use(authenticateJWT);

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

export default router;

