import { Schema, model } from 'mongoose';

const OrganisationSchema = new Schema(
  {
    orgId: { type: String, required: true, unique: true, index: true }, // e.g. 'bajaj_finance' or 'default'
    name: { type: String, required: true },
    plan: { type: String, enum: ['trial', 'starter', 'pro', 'enterprise'], default: 'trial' },
    isActive: { type: Boolean, default: true },
    trialEndsAt: { type: Date },
    adminEmail: { type: String, default: '' },

    // Per-org WhatsApp credentials (encrypted at rest)
    metaPhoneNumberId: { type: String, default: '' },
    metaAccessToken: { type: String, default: '' }, // AES-256 encrypted
    metaWabaId: { type: String, default: '' },
    metaAppId: { type: String, default: '' },
    metaAppSecret: { type: String, default: '' }, // AES-256 encrypted
    metaVerifyToken: { type: String, default: '' },
    metaBusinessId: { type: String, default: '' },

    // Per-org Sarvam credentials
    sarvamApiKey: { type: String, default: '' }, // AES-256 encrypted
    sarvamSpeechModel: { type: String, default: 'saaras:v3' },
    sarvamTaskExtractionModel: { type: String, default: 'sarvam-105b' },
    sarvamClassificationModel: { type: String, default: 'sarvam-30b' },

    // Per-org App settings
    businessName: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },
    reminderOffset: { type: Number, default: 30 },
    reminderOffset1: { type: Number, default: 180 },
    reminderOffset2: { type: Number, default: 90 },
    reminderOffset3: { type: Number, default: 30 },
    taskAssignmentTemplate: { type: String, default: '' },
  },
  { timestamps: true }
);

export const OrganisationModel = model('Organisation', OrganisationSchema);
export default OrganisationModel;
