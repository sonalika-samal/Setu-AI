"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialController = void 0;
const CredentialService_1 = require("../services/CredentialService");
const LoggingService_1 = require("../services/LoggingService");
const credentialService = new CredentialService_1.CredentialService();
const loggingService = new LoggingService_1.LoggingService();
class CredentialController {
    async getCredentials(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const credentials = await credentialService.getCredentials(orgId);
            res.status(200).json(credentials);
        }
        catch (error) {
            next(error);
        }
    }
    async updateCredentials(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const updateData = req.body;
            const user = req.user;
            // 1. Validate Request
            if (!updateData.meta || !updateData.sarvam || !updateData.settings) {
                res.status(400).json({ message: 'Invalid configuration payload.' });
                return;
            }
            // 2. Call Service
            const updated = await credentialService.updateCredentials(updateData, orgId);
            // Log action
            await loggingService.logActivity(user?.username || 'system', 'Credentials Modified', 'Sensitive application credentials updated.', orgId);
            // 3. Return Response
            res.status(200).json({
                message: 'Credentials updated successfully',
                credentials: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getDbStatus(req, res, next) {
        try {
            const dbInfo = await credentialService.getDatabaseStatus();
            res.status(200).json(dbInfo);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CredentialController = CredentialController;
exports.default = CredentialController;
