"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
exports.config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'sahayak_jwt_secret_token_123!',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    encryptionKey: process.env.ENCRYPTION_KEY || 'sahayak_aes_key_32_chars_secret_!!',
    defaultAdmin: {
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminSecure2026#SetuAI_!$',
    },
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb+srv://sonalikactc29_db_user:by7BWqHiWnDDVDPX@cluster0.dqu8svm.mongodb.net/?appName=Cluster0',
        dbName: process.env.MONGO_DB_NAME || 'n8ndb',
    },
    meta: {
        phoneNumberId: process.env.META_PHONE_NUMBER_ID || '1220196504503672',
        businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID || '1296189799169172',
        wabaId: process.env.META_WABA_ID || '1726889611647688',
        appId: process.env.META_APP_ID || '1321806523466616',
        verifyToken: process.env.META_VERIFY_TOKEN || 'sahayak_verify_token',
        accessToken: process.env.META_ACCESS_TOKEN || '',
        appSecret: process.env.META_APP_SECRET || '',
    },
    sarvam: {
        apiKey: process.env.SARVAM_API_KEY || '',
        speechModel: process.env.SARVAM_SPEECH_MODEL || 'saaras:v3',
        taskExtractionModel: process.env.SARVAM_TASK_EXTRACTION_MODEL || 'sarvam-105b',
        classificationModel: process.env.SARVAM_CLASSIFICATION_MODEL || 'sarvam-30b',
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '1234567890-placeholder.apps.googleusercontent.com',
    }
};
