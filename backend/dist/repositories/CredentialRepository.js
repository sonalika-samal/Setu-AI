"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialRepository = void 0;
const Credential_1 = require("../models/Credential");
const encryption_1 = require("../services/encryption");
const logger_1 = require("../utils/logger");
class CredentialRepository {
    async getCredentials(orgId = 'default') {
        try {
            const { config } = require('../config/config');
            const doc = await Credential_1.CredentialModel.findOne({ orgId }) || await Credential_1.CredentialModel.findOne({ key: 'global_config' });
            const defaultTemplate = 'Task ID: *```{{task_id}}```*\n\nHello {{worker_name}},\n\nYou have been assigned a new task.\n\nTask:\n{{task_msg}}\n\nLocation:\n{{location}}\n\nDeadline:\n{{deadline}}\n\nPlease reply using the Task ID.\n\nExamples:\n{{task_id}} Started\n{{task_id}} Completed\n{{task_id}} Need more details';
            if (!doc) {
                return {
                    meta: {
                        accessToken: config.meta.accessToken || '',
                        phoneNumberId: config.meta.phoneNumberId || '',
                        businessId: config.meta.businessAccountId || '',
                        wabaId: config.meta.wabaId || '',
                        appId: config.meta.appId || '',
                        appSecret: config.meta.appSecret || '',
                    },
                    sarvam: {
                        apiKey: config.sarvam.apiKey || '',
                        speechModel: config.sarvam.speechModel || '',
                        taskExtractionModel: config.sarvam.taskExtractionModel || '',
                        classificationModel: config.sarvam.classificationModel || '',
                    },
                    settings: {
                        businessName: 'Setu AI by DotnLott',
                        timezone: 'Asia/Kolkata',
                        reminderOffset: 30,
                        reminderOffset1: 180,
                        reminderOffset2: 90,
                        reminderOffset3: 30,
                        language: 'en',
                        taskAssignmentTemplate: defaultTemplate,
                    },
                    google: {
                        clientId: config.google?.clientId || '1234567890-placeholder.apps.googleusercontent.com',
                    },
                };
            }
            return {
                meta: {
                    accessToken: (0, encryption_1.decrypt)(doc.metaAccessToken),
                    phoneNumberId: doc.metaPhoneNumberId || '',
                    businessId: doc.metaBusinessId || '',
                    wabaId: doc.metaWabaId || '',
                    appId: doc.metaAppId || '',
                    appSecret: (0, encryption_1.decrypt)(doc.metaAppSecret),
                },
                sarvam: {
                    apiKey: (0, encryption_1.decrypt)(doc.sarvamApiKey),
                    speechModel: doc.sarvamSpeechModel || '',
                    taskExtractionModel: doc.sarvamTaskExtractionModel || '',
                    classificationModel: doc.sarvamClassificationModel || '',
                },
                settings: {
                    businessName: doc.businessName || 'Setu AI by DotnLott',
                    timezone: doc.timezone || 'Asia/Kolkata',
                    reminderOffset: doc.reminderOffset ?? 30,
                    reminderOffset1: doc.reminderOffset1 ?? 180,
                    reminderOffset2: doc.reminderOffset2 ?? 90,
                    reminderOffset3: doc.reminderOffset3 ?? 30,
                    language: doc.language || 'en',
                    taskAssignmentTemplate: doc.taskAssignmentTemplate || defaultTemplate,
                },
                google: {
                    clientId: doc.googleClientId || config.google?.clientId || '1234567890-placeholder.apps.googleusercontent.com',
                },
            };
        }
        catch (error) {
            logger_1.logger.error(`Error loading credentials for org ${orgId}: ${error.message}`);
            throw error;
        }
    }
    async updateCredentials(data, orgId = 'default') {
        try {
            const updateData = {
                orgId,
                metaAccessToken: (0, encryption_1.encrypt)(data.meta.accessToken),
                metaPhoneNumberId: data.meta.phoneNumberId,
                metaBusinessId: data.meta.businessId,
                metaWabaId: data.meta.wabaId,
                metaAppId: data.meta.appId,
                metaAppSecret: (0, encryption_1.encrypt)(data.meta.appSecret),
                sarvamApiKey: (0, encryption_1.encrypt)(data.sarvam.apiKey),
                sarvamSpeechModel: data.sarvam.speechModel,
                sarvamTaskExtractionModel: data.sarvam.taskExtractionModel,
                sarvamClassificationModel: data.sarvam.classificationModel,
                businessName: data.settings.businessName,
                timezone: data.settings.timezone,
                reminderOffset: data.settings.reminderOffset,
                reminderOffset1: data.settings.reminderOffset1,
                reminderOffset2: data.settings.reminderOffset2,
                reminderOffset3: data.settings.reminderOffset3,
                language: data.settings.language,
                googleClientId: data.google?.clientId || '',
                taskAssignmentTemplate: data.settings.taskAssignmentTemplate,
            };
            await Credential_1.CredentialModel.findOneAndUpdate({ orgId }, { $set: updateData }, { new: true, upsert: true });
            return data;
        }
        catch (error) {
            logger_1.logger.error(`Error updating credentials for org ${orgId}: ${error.message}`);
            throw error;
        }
    }
}
exports.CredentialRepository = CredentialRepository;
