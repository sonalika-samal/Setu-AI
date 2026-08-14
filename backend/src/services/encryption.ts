import crypto from 'crypto';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16 bytes

// Ensure the encryption key is exactly 32 bytes
const getEncryptionKey = (): Buffer => {
  const key = config.encryptionKey;
  if (!key) {
    throw new Error('Encryption key is not set in configuration.');
  }
  
  if (key.length === 32) {
    return Buffer.from(key, 'utf8');
  }
  
  // Pad or hash to get exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
};

export const encrypt = (text: string): string => {
  if (!text) return '';
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv + encrypted string separated by colon
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error(`Encryption failed: ${(error as Error).message}`);
    throw new Error('Failed to encrypt data.');
  }
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // If it's not in our encrypted format, it might be unencrypted/legacy
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error(`Decryption failed: ${(error as Error).message}`);
    // If decryption fails, it might be unencrypted or key changed. Return original for safety.
    return encryptedText;
  }
};
