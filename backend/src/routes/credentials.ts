import { Router } from 'express';
import { CredentialController } from '../controllers/credential';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const controller = new CredentialController();

router.use(authenticateJWT);
router.use(requireRole(['Owner']));

/**
 * @swagger
 * /api/credentials/db-status:
 *   get:
 *     summary: Retrieve current MongoDB connection status and metadata
 *     tags: [Credentials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database status details retrieved
 */
router.get('/db-status', controller.getDbStatus.bind(controller));


/**
 * @swagger
 * /api/credentials:
 *   get:
 *     summary: Retrieve application credentials
 *     tags: [Credentials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credentials retrieved successfully
 */
router.get('/', controller.getCredentials.bind(controller));

/**
 * @swagger
 * /api/credentials:
 *   post:
 *     summary: Update application credentials
 *     tags: [Credentials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Credentials updated successfully
 */
router.post('/', controller.updateCredentials.bind(controller));

export default router;
