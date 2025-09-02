import { PlatformAdapter } from './types';

export class BrowserExtensionAdapter implements PlatformAdapter {
  name = 'browser-extension';
  isBrowserExtension = true;
  isMobile = false;
  isDesktop = false;

  constructor(
    public storage: any,
    public network: any,
    public ui: any,
    public native: any
  ) {}
}

export class WebAdapter implements PlatformAdapter {
  name = 'web';
  isBrowserExtension = false;
  isMobile = false;
  isDesktop = false;

  constructor(
    public storage: any,
    public network: any,
    public ui: any,
    public native: any
  ) {}
}

export class MobileAdapter implements PlatformAdapter {
  name = 'mobile';
  isBrowserExtension = false;
  isMobile = true;
  isDesktop = false;

  constructor(
    public storage: any,
    public network: any,
    public ui: any,
    public native: any
  ) {}
}

export class DesktopAdapter implements PlatformAdapter {
  name = 'desktop';
  isBrowserExtension = false;
  isMobile = false;
  isDesktop = true;

  constructor(
    public storage: any,
    public network: any,
    public ui: any,
    public native: any
  ) {}
}

export function createPlatformAdapter(): PlatformAdapter {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new BrowserExtensionAdapter(
      new BrowserStorageAdapter(),
      new BrowserNetworkAdapter(),
      new BrowserUIAdapter(),
      new BrowserNativeAdapter()
    );
  }
  
  if (typeof window !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) {
      return new MobileAdapter(
        new LocalStorageAdapter(),
        new BrowserNetworkAdapter(),
        new MobileUIAdapter(),
        new MobileNativeAdapter()
      );
    }
    return new WebAdapter(
      new LocalStorageAdapter(),
      new BrowserNetworkAdapter(),
      new BrowserUIAdapter(),
      new BrowserNativeAdapter()
    );
  }
  
  throw new Error('Unsupported platform');
}

class BrowserStorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }

  async keys(): Promise<string[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        resolve(Object.keys(items));
      });
    });
  }
}

class LocalStorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage);
  }
}

class BrowserNetworkAdapter {
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  async upload(file: File, endpoint: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    return result.url;
  }

  async download(url: string, filename?: string): Promise<void> {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || url.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

class BrowserUIAdapter {
  alert(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  async confirm(message: string): Promise<boolean> {
    return window.confirm(message);
  }

  async prompt(message: string, defaultValue?: string): Promise<string | null> {
    return window.prompt(message, defaultValue);
  }

  toast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    console.log(`[TOAST:${type.toUpperCase()}] ${message}`);
  }

  loading(show: boolean, message?: string): void {
    console.log(`[LOADING] ${show ? 'SHOW' : 'HIDE'} - ${message}`);
  }
}

class MobileUIAdapter extends BrowserUIAdapter {
  toast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if ('Notification' in window) {
      new Notification(message, {
        body: message,
        icon: type === 'error' ? '/icons/error.png' : '/icons/default.png'
      });
    }
  }
}

class BrowserNativeAdapter {
  notifications = {
    async requestPermission(): Promise<boolean> {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    },
    
    async send(title: string, body: string, icon?: string): Promise<void> {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon });
      }
    }
  };

  filesystem = {
    async saveFile(content: Blob | string, filename: string): Promise<void> {
      if (content instanceof Blob) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    
    async openFile(accept?: string): Promise<File | null> {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (accept) input.accept = accept;
        
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          resolve(files?.[0] || null);
        };
        
        input.click();
      });
    }
  };

  clipboard = {
    async writeText(text: string): Promise<void> {
      await navigator.clipboard.writeText(text);
    },
    
    async readText(): Promise<string> {
      return navigator.clipboard.readText();
    }
  };
}

class MobileNativeAdapter extends BrowserNativeAdapter {
  filesystem = {
    ...super.filesystem,
    async saveFile(content: Blob | string, filename: string): Promise<void> {
      if ('share' in navigator) {
        if (content instanceof Blob) {
          const file = new File([content], filename);
          await (navigator as any).share({
            files: [file]
          });
        }
      } else {
        await super.filesystem.saveFile(content, filename);
      }
    }
  };
}