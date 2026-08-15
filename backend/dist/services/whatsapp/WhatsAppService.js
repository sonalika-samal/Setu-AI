"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const CredentialRepository_1 = require("../../repositories/CredentialRepository");
const MessageLogRepository_1 = require("../../repositories/MessageLogRepository");
const logger_1 = require("../../utils/logger");
class WhatsAppService {
    credentialRepo = new CredentialRepository_1.CredentialRepository();
    messageLogRepo = new MessageLogRepository_1.MessageLogRepository();
    /**
     * Helper to make requests to the Meta Graph API.
     * Credentials are loaded dynamically per org.
     */
    async makeMetaRequest(endpoint, options, orgId = 'default') {
        const creds = await this.credentialRepo.getCredentials(orgId);
        const token = creds.meta.accessToken;
        const phoneId = creds.meta.phoneNumberId;
        if (!token || !phoneId) {
            throw new Error(`Meta WhatsApp credentials are not configured for organisation: ${orgId}`);
        }
        if (token.toLowerCase().includes('mock') || phoneId.toLowerCase().includes('mock')) {
            logger_1.logger.info(`[WhatsAppService][${orgId}]: Mock WABA Request to endpoint: ${endpoint}`);
            return {
                messages: [{ id: `wamid.mock_${Math.random().toString(36).substring(2, 15)}` }]
            };
        }
        const url = `https://graph.facebook.com/v19.0/${phoneId}/${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const errorText = await res.text();
            logger_1.logger.error(`Meta WhatsApp API call failed for org ${orgId}: ${errorText}`);
            throw new Error(`Meta WhatsApp API error: ${errorText}`);
        }
        return res.json();
    }
    /**
     * Send a standard text message
     */
    async sendMessage(to, content, orgId = 'default') {
        logger_1.logger.info(`WhatsApp Service [${orgId}]: Sending text message to ${to}`);
        try {
            const response = await this.makeMetaRequest('messages', {
                method: 'POST',
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'text',
                    text: { body: content }
                })
            }, orgId);
            const messageId = response.messages?.[0]?.id || `out_${Date.now()}`;
            // Log outgoing message to database
            await this.messageLogRepo.create({
                orgId,
                message_id: messageId,
                sender: 'system',
                receiver: to,
                direction: 'outgoing',
                type: 'text',
                message: content,
                status: 'sent',
                timestamp: new Date()
            });
            return response;
        }
        catch (err) {
            logger_1.logger.error(`Failed to send WhatsApp message for org ${orgId}: ${err.message}`);
            throw err;
        }
    }
    /**
     * Send a template message
     */
    async sendTemplate(to, templateName, languageCode = 'en', components = [], orgId = 'default') {
        logger_1.logger.info(`WhatsApp Service [${orgId}]: Sending template ${templateName} to ${to}`);
        try {
            const response = await this.makeMetaRequest('messages', {
                method: 'POST',
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components
                    }
                })
            }, orgId);
            const messageId = response.messages?.[0]?.id || `out_${Date.now()}`;
            await this.messageLogRepo.create({
                orgId,
                message_id: messageId,
                sender: 'system',
                receiver: to,
                direction: 'outgoing',
                type: 'template',
                message: `[Template: ${templateName}]`,
                status: 'sent',
                timestamp: new Date()
            });
            return response;
        }
        catch (err) {
            logger_1.logger.error(`Failed to send WhatsApp template for org ${orgId}: ${err.message}`);
            throw err;
        }
    }
    /**
     * Send an image message
     */
    async sendImage(to, imageUrl, caption, orgId = 'default') {
        logger_1.logger.info(`WhatsApp Service [${orgId}]: Sending image ${imageUrl} to ${to}`);
        try {
            const response = await this.makeMetaRequest('messages', {
                method: 'POST',
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'image',
                    image: {
                        link: imageUrl,
                        caption: caption || ''
                    }
                })
            }, orgId);
            const messageId = response.messages?.[0]?.id || `out_${Date.now()}`;
            await this.messageLogRepo.create({
                orgId,
                message_id: messageId,
                sender: 'system',
                receiver: to,
                direction: 'outgoing',
                type: 'image',
                message: caption || `[Image: ${imageUrl}]`,
                status: 'sent',
                timestamp: new Date()
            });
            return response;
        }
        catch (err) {
            logger_1.logger.error(`Failed to send WhatsApp image for org ${orgId}: ${err.message}`);
            throw err;
        }
    }
    /**
     * Send a document message
     */
    async sendDocument(to, documentUrl, filename, caption, orgId = 'default') {
        logger_1.logger.info(`WhatsApp Service [${orgId}]: Sending document ${filename} to ${to}`);
        try {
            const response = await this.makeMetaRequest('messages', {
                method: 'POST',
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'document',
                    document: {
                        link: documentUrl,
                        filename,
                        caption: caption || ''
                    }
                })
            }, orgId);
            const messageId = response.messages?.[0]?.id || `out_${Date.now()}`;
            await this.messageLogRepo.create({
                orgId,
                message_id: messageId,
                sender: 'system',
                receiver: to,
                direction: 'outgoing',
                type: 'document',
                message: caption || `[Document: ${filename}]`,
                status: 'sent',
                timestamp: new Date()
            });
            return response;
        }
        catch (err) {
            logger_1.logger.error(`Failed to send WhatsApp document for org ${orgId}: ${err.message}`);
            throw err;
        }
    }
    /**
     * Download a media file using Media ID from Meta Graph API
     */
    async downloadMedia(mediaId, orgId = 'default') {
        logger_1.logger.info(`WhatsApp Service [${orgId}]: Downloading media ID: ${mediaId}`);
        try {
            const creds = await this.credentialRepo.getCredentials(orgId);
            const token = creds.meta.accessToken;
            if (!token) {
                throw new Error(`Meta WhatsApp Access Token not configured for org: ${orgId}`);
            }
            if (token.toLowerCase().includes('mock') || mediaId.toLowerCase().includes('mock')) {
                logger_1.logger.info(`[WhatsAppService]: Mock media download for ID: ${mediaId}`);
                return Buffer.from('mock_image_data_binary');
            }
            // 1. Get media URL metadata
            const metaUrl = `https://graph.facebook.com/v19.0/${mediaId}`;
            const metadataRes = await fetch(metaUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!metadataRes.ok) {
                throw new Error(`Failed to fetch media metadata: ${await metadataRes.text()}`);
            }
            const metadata = await metadataRes.json();
            const downloadUrl = metadata.url;
            if (!downloadUrl) {
                throw new Error('Media download URL not resolved by Meta.');
            }
            // 2. Fetch the file binaries
            const fileRes = await fetch(downloadUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!fileRes.ok) {
                throw new Error(`Failed to download binary: ${await fileRes.text()}`);
            }
            const arrayBuffer = await fileRes.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (err) {
            logger_1.logger.error(`WhatsApp Service: Download media failed: ${err.message}`);
            throw err;
        }
    }
    /**
     * Upload media file to Meta Graph API
     */
    async uploadMedia(filePath, mimeType) {
        logger_1.logger.info(`WhatsApp Service: Uploading media at ${filePath}`);
        // Foundation placeholder. In production, this reads local files and sends form-data to Facebook media upload endpoint.
        return 'mock_media_id_12345';
    }
}
exports.WhatsAppService = WhatsAppService;
exports.default = WhatsAppService;
