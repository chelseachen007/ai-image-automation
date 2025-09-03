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

// AI引擎适配器接口
export interface EngineAdapter {
  generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; usage?: any }>;

  generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
  }): Promise<{ url: string; revisedPrompt?: string }>;

  generateVideo(params: {
    prompt: string;
    model?: string;
    image?: string;
    duration?: number;
  }): Promise<{ url: string; thumbnailUrl?: string }>;
}