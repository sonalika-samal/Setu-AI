"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CredentialRepository_1 = require("../repositories/CredentialRepository");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const credentialRepo = new CredentialRepository_1.CredentialRepository();
router.use(auth_1.authenticateJWT);
router.use((0, auth_1.requireRole)(['Admin', 'Owner']));
/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Retrieve general application settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application settings retrieved successfully
 */
router.get('/', async (req, res, next) => {
    try {
        const creds = await credentialRepo.getCredentials();
        res.status(200).json(creds.settings);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Update general application settings
 *     tags: [Settings]
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
 *         description: Settings updated successfully
 */
router.post('/', async (req, res, next) => {
    try {
        const newSettings = req.body;
        const creds = await credentialRepo.getCredentials();
        // Merge new settings into current settings sub-object
        creds.settings = {
            ...creds.settings,
            ...newSettings
        };
        const updated = await credentialRepo.updateCredentials(creds);
        res.status(200).json({
            message: 'Settings updated successfully',
            settings: updated.settings
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
