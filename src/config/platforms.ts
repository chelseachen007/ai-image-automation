export interface PlatformConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  enabled: boolean;
  build: {
    command: string;
    output: string;
  };
  deploy?: {
    command?: string;
    target: string;
  };
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  browser: {
    name: 'browser',
    displayName: '浏览器扩展',
    description: 'Chrome、Firefox、Edge 浏览器扩展',
    icon: '🌐',
    enabled: true,
    build: {
      command: 'plasmo build',
      output: 'build/chrome-mv3-prod',
    },
  },
  web: {
    name: 'web',
    displayName: 'Web 应用',
    description: '响应式 Web 应用',
    icon: '🌍',
    enabled: true,
    build: {
      command: 'react-scripts build',
      output: 'build',
    },
  },
  mobile: {
    name: 'mobile',
    displayName: '移动应用',
    description: 'React Native 移动应用',
    icon: '📱',
    enabled: false,
    build: {
      command: 'react-native run-android',
      output: 'android/app/build/outputs/apk',
    },
  },
  desktop: {
    name: 'desktop',
    displayName: '桌面应用',
    description: 'Electron 桌面应用',
    icon: '💻',
    enabled: false,
    build: {
      command: 'electron-builder',
      output: 'dist',
    },
  },
};

export const getEnabledPlatforms = (): PlatformConfig[] => {
  return Object.values(PLATFORMS).filter(p => p.enabled);
};

export const getPlatformConfig = (name: string): PlatformConfig | null => {
  return PLATFORMS[name] || null;
};