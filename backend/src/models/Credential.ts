import { Schema, model } from 'mongoose';

const CredentialSchema = new Schema(
  {
    orgId: { type: String, required: true, unique: true, default: 'default', index: true },
    key: { type: String, default: 'global_config' },
    
    // Meta WhatsApp settings
    metaAccessToken: { type: String, default: '' }, // encrypted
    metaPhoneNumberId: { type: String, default: '' },
    metaBusinessId: { type: String, default: '' },
    metaWabaId: { type: String, default: '' },
    metaAppId: { type: String, default: '' },
    metaAppSecret: { type: String, default: '' }, // encrypted

    // Sarvam AI settings
    sarvamApiKey: { type: String, default: '' }, // encrypted
    sarvamSpeechModel: { type: String, default: '' },
    sarvamTaskExtractionModel: { type: String, default: '' },
    sarvamClassificationModel: { type: String, default: '' },

    // Application Settings
    businessName: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    reminderOffset: { type: Number, default: 30 }, // in minutes
    reminderOffset1: { type: Number, default: 180 }, // default 3 hours
    reminderOffset2: { type: Number, default: 90 },  // default 1.5 hours
    reminderOffset3: { type: Number, default: 30 },  // default 30 mins
    language: { type: String, default: 'en' },
    googleClientId: { type: String, default: '' },
    taskAssignmentTemplate: {
      type: String,
      default: 'Hello {{worker_name}},\n\nYou have been assigned a new task.\n\nTask:\n{{task_msg}}\n\nLocation:\n{{location}}\n\nDeadline:\n{{deadline}}\n\nCompany:\n{{company_name}}\n\nPlease reply "got it" after reading the task. Reply "completed" after finishing the work.'
    },
  },
  { timestamps: true }
);

export const CredentialModel = model('Credential', CredentialSchema);
export default CredentialModel;
