import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'ai-automation-secret';

export const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (encrypted: string): string => {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const secureStorage = {
  set: (key: string, value: any): void => {
    const encrypted = encryptData(JSON.stringify(value));
    localStorage.setItem(`secure_${key}`, encrypted);
  },
  
  get: <T>(key: string): T | null => {
    const encrypted = localStorage.getItem(`secure_${key}`);
    if (!encrypted) return null;
    
    try {
      const decrypted = decryptData(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(`secure_${key}`);
  },
  
  clear: (): void => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key);
      }
    });
  },
};