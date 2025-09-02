export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface NetworkAdapter {
  fetch(url: string, options?: RequestInit): Promise<Response>;
  upload(file: File, endpoint: string): Promise<string>;
  download(url: string, filename?: string): Promise<void>;
}

export interface UIAdapter {
  alert(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  confirm(message: string): Promise<boolean>;
  prompt(message: string, defaultValue?: string): Promise<string | null>;
  toast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  loading(show: boolean, message?: string): void;
}

export interface NativeFeatures {
  notifications: {
    requestPermission(): Promise<boolean>;
    send(title: string, body: string, icon?: string): Promise<void>;
  };
  filesystem: {
    saveFile(content: Blob | string, filename: string): Promise<void>;
    openFile(accept?: string): Promise<File | null>;
  };
  clipboard: {
    writeText(text: string): Promise<void>;
    readText(): Promise<string>;
  };
}

export interface PlatformAdapter {
  name: string;
  storage: StorageAdapter;
  network: NetworkAdapter;
  ui: UIAdapter;
  native: NativeFeatures;
  isBrowserExtension: boolean;
  isMobile: boolean;
  isDesktop: boolean;
}