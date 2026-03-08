import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
dotenv.config();

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-change-in-production-32ch';

export function encryptPassword(password) {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
}

export function decryptPassword(encrypted) {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
