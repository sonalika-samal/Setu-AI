"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
// Ensure the encryption key is exactly 32 bytes
const getEncryptionKey = () => {
    const key = config_1.config.encryptionKey;
    if (!key) {
        throw new Error('Encryption key is not set in configuration.');
    }
    if (key.length === 32) {
        return Buffer.from(key, 'utf8');
    }
    // Pad or hash to get exactly 32 bytes
    return crypto_1.default.createHash('sha256').update(key).digest();
};
const encrypt = (text) => {
    if (!text)
        return '';
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Return iv + encrypted string separated by colon
        return `${iv.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        logger_1.logger.error(`Encryption failed: ${error.message}`);
        throw new Error('Failed to encrypt data.');
    }
};
exports.encrypt = encrypt;
const decrypt = (encryptedText) => {
    if (!encryptedText)
        return '';
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            // If it's not in our encrypted format, it might be unencrypted/legacy
            return encryptedText;
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = Buffer.from(parts[1], 'hex');
        const key = getEncryptionKey();
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        logger_1.logger.error(`Decryption failed: ${error.message}`);
        // If decryption fails, it might be unencrypted or key changed. Return original for safety.
        return encryptedText;
    }
};
exports.decrypt = decrypt;
