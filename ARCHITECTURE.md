# AI Image Automation - 架构改进文档

## 概述

本项目已进行了全面的架构改进，支持多平台部署（浏览器扩展、Web、移动端、桌面端），并提供了更好的状态管理、性能和安全性。

## 新架构特性

### 1. 平台抽象层

位置：`src/adapters/`

- **PlatformAdapter 接口**：统一的平台抽象
- **BrowserExtensionAdapter**：浏览器扩展适配器
- **WebAdapter**：Web 应用适配器
- **MobileAdapter**：移动端适配器
- **DesktopAdapter**：桌面端适配器

### 2. 状态管理

位置：`src/stores/`

- **Zustand 全局状态管理**：替代本地状态
- **持久化存储**：自动保存用户配置
- **类型安全**：完整的 TypeScript 支持

### 3. 响应式 UI 组件

位置：`components/ui/` 和 `components/layout/`

- **ResponsiveLayout**：自适应布局组件
- **ResponsiveTabs**：响应式标签页
- **移动端支持**：React Native 组件准备

### 4. 性能优化

位置：`src/utils/cache.ts`

- **智能缓存系统**：TTL 过期机制
- **React Hook 封装**：简化缓存使用
- **自动清理**：防止内存泄漏

### 5. 安全增强

位置：`src/utils/security.ts`

- **API 密钥加密**：AES 加密存储
- **安全存储工具**：统一的数据保护
- **环境变量支持**：可配置的加密密钥

## 使用指南

### 1. 使用平台适配器

```typescript
import { createPlatformAdapter } from './src/adapters';

const platform = createPlatformAdapter();

// 使用平台功能
await platform.storage.set('key', value);
const data = await platform.storage.get('key');

// 显示通知
await platform.native.notifications.send('标题', '内容');

// 保存文件
await platform.native.filesystem.saveFile(content, 'filename.txt');
```

### 2. 使用状态管理

```typescript
import { useAppStore, useAISources, useChat, useUI } from './src/hooks';

// 管理 AI 源
const { aiSources, addAISource, removeAISource } = useAISources();

// 聊天功能
const { messages, isStreaming, sendMessage } = useChat();

// UI 状态
const { activeTab, setActiveTab, platform } = useUI();
```

### 3. 使用缓存

```typescript
import { cacheManager, useCache } from './src/utils/cache';

// 直接使用缓存管理器
cacheManager.set('key', data, 5000); // 5秒TTL
const cached = cacheManager.get('key');

// 使用 React Hook
const { data, loading, error } = useCache('key', fetchDataFunction);
```

### 4. 使用安全存储

```typescript
import { secureStorage } from './src/utils/security';

// 加密存储
secureStorage.set('apiKey', 'sk-xxx');
const apiKey = secureStorage.get<string>('apiKey');
```

## 多平台部署

### 支持的平台

配置文件：`src/config/platforms.ts`

1. **浏览器扩展**（默认）
   - Chrome、Firefox、Edge
   - 构建命令：`yarn plasmo build`

2. **Web 应用**
   - 响应式设计
   - PWA 支持

3. **移动应用**（计划中）
   - React Native
   - iOS 和 Android

4. **桌面应用**（计划中）
   - Electron
   - Windows、macOS、Linux

### 平台检测

系统会自动检测运行平台：

```typescript
const platform = createPlatformAdapter();

console.log(platform.name); // 'browser-extension', 'web', 'mobile', 'desktop'
console.log(platform.isMobile); // true/false
console.log(platform.isBrowserExtension); // true/false
```

## 开发指南

### 添加新的 AI 源

```typescript
import { useAISources } from './src/hooks';

const { addAISource } = useAISources();

addAISource({
  name: 'New AI Provider',
  type: 'openai',
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com',
  enabled: true,
  models: ['model-1', 'model-2']
});
```

### 创建新组件

使用响应式组件：

```typescript
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { useUI } from './src/hooks';

function MyComponent() {
  const { platform } = useUI();
  
  return (
    <ResponsiveLayout>
      {/* 你的内容 */}
    </ResponsiveLayout>
  );
}
```

### 性能优化建议

1. **使用缓存**：频繁请求的数据使用缓存
2. **代码分割**：大型组件使用 `React.lazy()`
3. **图片优化**：使用 WebP 格式
4. **延迟加载**：非关键资源延迟加载

## 安全最佳实践

1. **API 密钥**：使用 `secureStorage` 加密存储
2. **环境变量**：敏感信息使用环境变量
3. **输入验证**：所有用户输入进行验证
4. **HTTPS**：生产环境强制使用 HTTPS

## 下一步计划

1. [ ] 完成移动端适配
2. [ ] 添加桌面端支持
3. [ ] 实现离线功能
4. [ ] 添加数据同步
5. [ ] 性能监控
6. [ ] 错误追踪