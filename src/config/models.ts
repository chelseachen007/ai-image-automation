/**
 * 模型配置管理系统
 * 定义各个平台的模型信息和能力特性
 */

// 模型能力接口
export interface ModelCapabilities {
  /** 是否支持图片输入 */
  supportsImageInput: boolean;
  /** 是否能生成图片 */
  canGenerateImages: boolean;
  /** 是否能生成视频 */
  canGenerateVideos: boolean;
  /** 是否支持流式输出 */
  supportsStreaming: boolean;
  /** 是否支持批量处理 */
  supportsBatch: boolean;
  /** 最大输入token数 */
  maxInputTokens?: number;
  /** 最大输出token数 */
  maxOutputTokens?: number;
}

// 模型信息接口
export interface ModelInfo {
  /** 模型ID */
  id: string;
  /** 模型显示名称 */
  name: string;
  /** 模型描述 */
  description?: string;
  /** 所属平台 */
  platform: string;
  /** 模型能力 */
  capabilities: ModelCapabilities;
  /** 是否为自定义模型 */
  isCustom: boolean;
  /** 模型版本 */
  version?: string;
  /** 是否已弃用 */
  deprecated?: boolean;
}

// 平台模型配置
export interface PlatformModels {
  [platform: string]: ModelInfo[];
}

// OpenAI平台模型配置
const openaiModels: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: '最新的GPT-4模型，支持多模态输入',
    platform: 'OpenAI',
    capabilities: {
      supportsImageInput: true,
      canGenerateImages: false,
      canGenerateVideos: false,
      supportsStreaming: true,
      supportsBatch: true,
      maxInputTokens: 128000,
      maxOutputTokens: 4096
    },
    isCustom: false,
    version: '2024-08-06'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: '轻量级GPT-4模型，成本更低',
    platform: 'OpenAI',
    capabilities: {
      supportsImageInput: true,
      canGenerateImages: false,
      canGenerateVideos: false,
      supportsStreaming: true,
      supportsBatch: true,
      maxInputTokens: 128000,
      maxOutputTokens: 16384
    },
    isCustom: false,
    version: '2024-07-18'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: '经典的GPT-3.5模型',
    platform: 'OpenAI',
    capabilities: {
      supportsImageInput: false,
      canGenerateImages: false,
      canGenerateVideos: false,
      supportsStreaming: true,
      supportsBatch: true,
      maxInputTokens: 16385,
      maxOutputTokens: 4096
    },
    isCustom: false,
    version: '0125'
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    description: '最新的图像生成模型',
    platform: 'OpenAI',
    capabilities: {
      supportsImageInput: false,
      canGenerateImages: true,
      canGenerateVideos: false,
      supportsStreaming: false,
      supportsBatch: false
    },
    isCustom: false
  },
  {
    id: 'dall-e-2',
    name: 'DALL-E 2',
    description: '经典的图像生成模型',
    platform: 'OpenAI',
    capabilities: {
      supportsImageInput: false,
      canGenerateImages: true,
      canGenerateVideos: false,
      supportsStreaming: false,
      supportsBatch: false
    },
    isCustom: false
  }
];

// 火山引擎(豆包)模型配置
const doubaoModels: ModelInfo[] = [
  {
    id: 'doubao-pro-4k',
    name: '豆包 Pro 4K',
    description: '火山引擎豆包专业版模型',
    platform: 'Doubao',
    capabilities: {
      supportsImageInput: true,
      canGenerateImages: false,
      canGenerateVideos: false,
      supportsStreaming: true,
      supportsBatch: true,
      maxInputTokens: 4096,
      maxOutputTokens: 4096
    },
    isCustom: false
  },
  {
    id: 'doubao-lite-4k',
    name: '豆包 Lite 4K',
    description: '火山引擎豆包轻量版模型',
    platform: 'Doubao',
    capabilities: {
      supportsImageInput: false,
      canGenerateImages: false,
      canGenerateVideos: false,
      supportsStreaming: true,
      supportsBatch: true,
      maxInputTokens: 4096,
      maxOutputTokens: 4096
    },
    isCustom: false
  }
];

// 即梦引擎模型配置
const jimengModels: ModelInfo[] = [
  {
    id: 'jimeng-text2image-3.0',
    name: '即梦文生图 3.0',
    description: '火山引擎即梦文生图模型',
    platform: 'Jimeng',
    capabilities: {
      supportsImageInput: false,
      canGenerateImages: true,
      canGenerateVideos: false,
      supportsStreaming: false,
      supportsBatch: true
    },
    isCustom: false,
    version: '3.0'
  },
  {
    id: 'jimeng-image2video',
    name: '即梦图生视频',
    description: '火山引擎即梦图生视频模型',
    platform: 'Jimeng',
    capabilities: {
      supportsImageInput: true,
      canGenerateImages: false,
      canGenerateVideos: true,
      supportsStreaming: false,
      supportsBatch: true
    },
    isCustom: false
  }
];

// 自定义模型默认能力（视为OpenAI兼容）
const customModelCapabilities: ModelCapabilities = {
  supportsImageInput: true,
  canGenerateImages: true,
  canGenerateVideos: true,
  supportsStreaming: true,
  supportsBatch: true
};

// 所有平台模型配置
export const platformModels: PlatformModels = {
  OpenAI: openaiModels,
  Doubao: doubaoModels,
  Jimeng: jimengModels
};

// 模型管理类
export class ModelManager {
  private static instance: ModelManager;
  private customModels: ModelInfo[] = [];

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelInfo[] {
    const allModels: ModelInfo[] = [];
    
    // 添加平台模型
    Object.values(platformModels).forEach(models => {
      allModels.push(...models);
    });
    
    // 添加自定义模型
    allModels.push(...this.customModels);
    
    return allModels;
  }

  /**
   * 根据平台获取模型
   */
  getModelsByPlatform(platform: string): ModelInfo[] {
    if (platform === 'Custom') {
      return this.customModels;
    }
    return platformModels[platform] || [];
  }

  /**
   * 根据ID获取模型
   */
  getModelById(id: string): ModelInfo | undefined {
    return this.getAllModels().find(model => model.id === id);
  }

  /**
   * 根据能力筛选模型
   */
  getModelsByCapability(capability: keyof ModelCapabilities, value: boolean = true): ModelInfo[] {
    return this.getAllModels().filter(model => model.capabilities[capability] === value);
  }

  /**
   * 获取支持图片生成的模型
   */
  getImageGenerationModels(): ModelInfo[] {
    return this.getModelsByCapability('canGenerateImages', true);
  }

  /**
   * 获取支持视频生成的模型
   */
  getVideoGenerationModels(): ModelInfo[] {
    return this.getModelsByCapability('canGenerateVideos', true);
  }

  /**
   * 获取支持图片输入的模型
   */
  getImageInputModels(): ModelInfo[] {
    return this.getModelsByCapability('supportsImageInput', true);
  }

  /**
   * 添加自定义模型
   */
  addCustomModel(model: Omit<ModelInfo, 'isCustom' | 'platform'>): void {
    const customModel: ModelInfo = {
      ...model,
      platform: 'Custom',
      isCustom: true,
      capabilities: {
        ...customModelCapabilities,
        ...model.capabilities
      }
    };
    
    this.customModels.push(customModel);
  }

  /**
   * 删除自定义模型
   */
  removeCustomModel(id: string): boolean {
    const index = this.customModels.findIndex(model => model.id === id);
    if (index !== -1) {
      this.customModels.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 更新自定义模型
   */
  updateCustomModel(id: string, updates: Partial<ModelInfo>): boolean {
    const index = this.customModels.findIndex(model => model.id === id);
    if (index !== -1) {
      this.customModels[index] = {
        ...this.customModels[index],
        ...updates,
        platform: 'Custom',
        isCustom: true
      };
      return true;
    }
    return false;
  }

  /**
   * 检查模型是否支持特定功能
   */
  checkModelCapability(modelId: string, capability: keyof ModelCapabilities): boolean {
    const model = this.getModelById(modelId);
    if (!model) return false;
    
    const value = model.capabilities[capability];
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  /**
   * 获取平台列表
   */
  getPlatforms(): string[] {
    const platforms = Object.keys(platformModels);
    if (this.customModels.length > 0) {
      platforms.push('Custom');
    }
    return platforms;
  }
}

// 导出单例实例
export const modelManager = ModelManager.getInstance();

// 导出默认模型ID
export const DEFAULT_MODELS = {
  CHAT: 'gpt-4o-mini',
  IMAGE_GENERATION: 'jimeng-text2image-3.0',
  VIDEO_GENERATION: 'jimeng-image2video'
};