import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('FATAL ERROR: ENCRYPTION_KEY is not defined in the .env file.');
}

const ALGORITHM = 'aes-256-cbc';
// The key must be 32 bytes for aes-256-cbc. We slice the env var to ensure this.
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex').slice(0, 32);
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a piece of text.
 * @param {string} text The text to encrypt.
 * @returns {string} The encrypted text, with the IV prepended, in hex format.
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a piece of text.
 * @param {string} text The encrypted text (IV:encryptedData).
 * @returns {string} The decrypted text.
 */
export function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}