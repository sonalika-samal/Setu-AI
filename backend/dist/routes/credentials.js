"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const credential_1 = require("../controllers/credential");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const controller = new credential_1.CredentialController();
router.use(auth_1.authenticateJWT);
router.use((0, auth_1.requireRole)(['Owner']));
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
exports.default = router;
