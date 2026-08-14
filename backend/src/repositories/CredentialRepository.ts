import { CredentialModel } from '../models/Credential';
import { encrypt, decrypt } from '../services/encryption';
import { logger } from '../utils/logger';

export interface AppCredentials {
  meta: {
    accessToken: string;
    phoneNumberId: string;
    businessId: string;
    wabaId: string;
    appId: string;
    appSecret: string;
  };
  sarvam: {
    apiKey: string;
    speechModel: string;
    taskExtractionModel: string;
    classificationModel: string;
  };
  settings: {
    businessName: string;
    timezone: string;
    reminderOffset: number;
    reminderOffset1: number;
    reminderOffset2: number;
    reminderOffset3: number;
    language: string;
    taskAssignmentTemplate: string;
  };
}

export class CredentialRepository {
  async getCredentials(orgId: string = 'default'): Promise<AppCredentials> {
    try {
      const doc = await CredentialModel.findOne({ orgId }) || await CredentialModel.findOne({ key: 'global_config' });
      
      const defaultTemplate = 'Task ID: *```{{task_id}}```*\n\nHello {{worker_name}},\n\nYou have been assigned a new task.\n\nTask:\n{{task_msg}}\n\nLocation:\n{{location}}\n\nDeadline:\n{{deadline}}\n\nPlease reply using the Task ID.\n\nExamples:\n{{task_id}} Started\n{{task_id}} Completed\n{{task_id}} Need more details';

      if (!doc) {
        const { config } = require('../config/config');
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
        };
      }

      return {
        meta: {
          accessToken: decrypt(doc.metaAccessToken),
          phoneNumberId: doc.metaPhoneNumberId || '',
          businessId: doc.metaBusinessId || '',
          wabaId: doc.metaWabaId || '',
          appId: doc.metaAppId || '',
          appSecret: decrypt(doc.metaAppSecret),
        },
        sarvam: {
          apiKey: decrypt(doc.sarvamApiKey),
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
      };
    } catch (error) {
      logger.error(`Error loading credentials for org ${orgId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateCredentials(data: AppCredentials, orgId: string = 'default'): Promise<AppCredentials> {
    try {
      const updateData = {
        orgId,
        metaAccessToken: encrypt(data.meta.accessToken),
        metaPhoneNumberId: data.meta.phoneNumberId,
        metaBusinessId: data.meta.businessId,
        metaWabaId: data.meta.wabaId,
        metaAppId: data.meta.appId,
        metaAppSecret: encrypt(data.meta.appSecret),

        sarvamApiKey: encrypt(data.sarvam.apiKey),
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
        taskAssignmentTemplate: data.settings.taskAssignmentTemplate,
      };

      await CredentialModel.findOneAndUpdate(
        { orgId },
        { $set: updateData },
        { new: true, upsert: true }
      );

      return data;
    } catch (error) {
      logger.error(`Error updating credentials for org ${orgId}: ${(error as Error).message}`);
      throw error;
    }
  }
}
