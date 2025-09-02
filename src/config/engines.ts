/**
 * AI引擎配置管理模块
 * 统一管理所有支持的AI引擎配置
 */

import { modelManager } from './models'
import type { ModelInfo, ModelCapabilities } from './models'

// AI引擎类型枚举
export enum AIEngineType {
  OPENAI = "openai",
  CLAUDE = "claude",
  GEMINI = "gemini",
  DOUBAO = "doubao", // 火山引擎豆包
  JIMENG = "jimeng", // 火山引擎即梦
  CUSTOM = "custom"
}

// AI引擎配置接口
export interface AIEngineConfig {
  id: string
  name: string
  type: AIEngineType
  baseUrl: string
  apiKeyName: string // API密钥参数名
  models: AIEngineModel[]
  supportedFeatures: AIEngineFeature[]
  headers?: Record<string, string>
  requestConfig?: {
    timeout?: number
    retries?: number
  }
}

// AI引擎模型配置
export interface AIEngineModel {
  id: string
  name: string
  type: "text" | "image" | "video" | "multimodal"
  maxTokens?: number
  supportsBatch?: boolean
}

// AI引擎支持的功能
export enum AIEngineFeature {
  TEXT_GENERATION = "text_generation",
  IMAGE_GENERATION = "image_generation",
  VIDEO_GENERATION = "video_generation",
  CHAT = "chat",
  BATCH_PROCESSING = "batch_processing"
}

// 用户配置的AI源
export interface AISource {
  id: string
  name: string
  type: AIEngineType
  apiKey: string
  baseUrl?: string // 可选，用于自定义端点
  isDefault: boolean
  modelOverrides?: Record<string, string> // 模型映射覆盖
}

// 预定义的AI引擎配置
export const AI_ENGINE_CONFIGS: Record<AIEngineType, AIEngineConfig> = {
  [AIEngineType.OPENAI]: {
    id: "openai",
    name: "OpenAI",
    type: AIEngineType.OPENAI,
    baseUrl: "https://api.openai.com/v1",
    apiKeyName: "Authorization",
    models: [
      {
        id: "gpt-4",
        name: "GPT-4",
        type: "text",
        maxTokens: 8192,
        supportsBatch: true
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        type: "text",
        maxTokens: 4096,
        supportsBatch: true
      },
      {
        id: "dall-e-3",
        name: "DALL-E 3",
        type: "image",
        supportsBatch: false
      },
      {
        id: "gpt-4-vision-preview",
        name: "GPT-4 Vision",
        type: "multimodal",
        maxTokens: 4096,
        supportsBatch: true
      }
    ],
    supportedFeatures: [
      AIEngineFeature.TEXT_GENERATION,
      AIEngineFeature.IMAGE_GENERATION,
      AIEngineFeature.CHAT,
      AIEngineFeature.BATCH_PROCESSING
    ],
    headers: {
      "Content-Type": "application/json"
    },
    requestConfig: {
      timeout: 60000,
      retries: 3
    }
  },

  [AIEngineType.CLAUDE]: {
    id: "claude",
    name: "Anthropic Claude",
    type: AIEngineType.CLAUDE,
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyName: "x-api-key",
    models: [
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        type: "text",
        maxTokens: 4096,
        supportsBatch: true
      },
      {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        type: "text",
        maxTokens: 4096,
        supportsBatch: true
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        type: "text",
        maxTokens: 4096,
        supportsBatch: true
      }
    ],
    supportedFeatures: [
      AIEngineFeature.TEXT_GENERATION,
      AIEngineFeature.CHAT,
      AIEngineFeature.BATCH_PROCESSING
    ],
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01"
    },
    requestConfig: {
      timeout: 60000,
      retries: 3
    }
  },

  [AIEngineType.GEMINI]: {
    id: "gemini",
    name: "Google Gemini",
    type: AIEngineType.GEMINI,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyName: "key",
    models: [
      {
        id: "gemini-pro",
        name: "Gemini Pro",
        type: "text",
        maxTokens: 32768,
        supportsBatch: true
      },
      {
        id: "gemini-pro-vision",
        name: "Gemini Pro Vision",
        type: "multimodal",
        maxTokens: 16384,
        supportsBatch: true
      }
    ],
    supportedFeatures: [
      AIEngineFeature.TEXT_GENERATION,
      AIEngineFeature.CHAT,
      AIEngineFeature.BATCH_PROCESSING
    ],
    headers: {
      "Content-Type": "application/json"
    },
    requestConfig: {
      timeout: 60000,
      retries: 3
    }
  },

  [AIEngineType.DOUBAO]: {
    id: "doubao",
    name: "火山引擎豆包",
    type: AIEngineType.DOUBAO,
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeyName: "Authorization",
    models: [
      {
        id: "doubao-lite-4k",
        name: "豆包 Lite 4K",
        type: "text",
        maxTokens: 4096,
        supportsBatch: true
      },
      {
        id: "doubao-pro-4k",
        name: "豆包 Pro 4K",
        type: "text",
        maxTokens: 4096,
        supportsBatch: true
      },
      {
        id: "doubao-pro-32k",
        name: "豆包 Pro 32K",
        type: "text",
        maxTokens: 32768,
        supportsBatch: true
      },
      {
        id: "doubao-vision",
        name: "豆包视觉模型",
        type: "multimodal",
        maxTokens: 4096,
        supportsBatch: true
      }
    ],
    supportedFeatures: [
      AIEngineFeature.TEXT_GENERATION,
      AIEngineFeature.CHAT,
      AIEngineFeature.BATCH_PROCESSING
    ],
    headers: {
      "Content-Type": "application/json"
    },
    requestConfig: {
      timeout: 60000,
      retries: 3
    }
  },

  [AIEngineType.JIMENG]: {
    id: "jimeng",
    name: "火山引擎即梦",
    type: AIEngineType.JIMENG,
    baseUrl: "https://visual.volcengineapi.com",
    apiKeyName: "Authorization",
    models: [
      {
        id: "jimeng_t2i_v30",
        name: "即梦文生图3.0",
        type: "image",
        supportsBatch: true
      },
      {
        id: "jimeng_i2v_v10",
        name: "即梦图生视频1.0",
        type: "video",
        supportsBatch: true
      }
    ],
    supportedFeatures: [
      AIEngineFeature.IMAGE_GENERATION,
      AIEngineFeature.VIDEO_GENERATION,
      AIEngineFeature.BATCH_PROCESSING
    ],
    headers: {
      "Content-Type": "application/json"
    },
    requestConfig: {
      timeout: 120000, // 图片和视频生成需要更长时间
      retries: 3
    }
  },

  [AIEngineType.CUSTOM]: {
    id: "custom",
    name: "自定义引擎",
    type: AIEngineType.CUSTOM,
    baseUrl: "",
    apiKeyName: "Authorization",
    models: [],
    supportedFeatures: [
      AIEngineFeature.TEXT_GENERATION,
      AIEngineFeature.IMAGE_GENERATION,
      AIEngineFeature.VIDEO_GENERATION,
      AIEngineFeature.CHAT,
      AIEngineFeature.BATCH_PROCESSING
    ],
    headers: {
      "Content-Type": "application/json"
    },
    requestConfig: {
      timeout: 60000,
      retries: 3
    }
  }
}

/**
 * 引擎配置管理类
 */
export class EngineConfigManager {
  /**
   * 获取引擎配置
   */
  static getEngineConfig(type: AIEngineType): AIEngineConfig {
    return AI_ENGINE_CONFIGS[type]
  }

  /**
   * 获取所有引擎配置
   */
  static getAllEngineConfigs(): AIEngineConfig[] {
    return Object.values(AI_ENGINE_CONFIGS)
  }

  /**
   * 获取支持特定功能的引擎
   */
  static getEnginesByFeature(feature: AIEngineFeature): AIEngineConfig[] {
    return Object.values(AI_ENGINE_CONFIGS).filter((config) =>
      config.supportedFeatures.includes(feature)
    )
  }

  /**
   * 获取引擎的模型列表
   */
  static getEngineModels(
    type: AIEngineType,
    modelType?: "text" | "image" | "video" | "multimodal"
  ): AIEngineModel[] {
    const config = AI_ENGINE_CONFIGS[type]
    if (!config) return []

    if (modelType) {
      return config.models.filter((model) => model.type === modelType)
    }

    return config.models
  }

  /**
   * 验证引擎配置
   */
  static validateEngineConfig(config: AIEngineConfig): boolean {
    return !!(
      config.id &&
      config.name &&
      config.type &&
      config.baseUrl &&
      config.apiKeyName
    )
  }

  /**
   * 构建API请求头
   */
  static buildRequestHeaders(source: AISource): Record<string, string> {
    const config = this.getEngineConfig(source.type)
    const headers = { ...(config.headers || {}) }

    // 设置API密钥
    if (config.apiKeyName === "Authorization") {
      headers["Authorization"] = `Bearer ${source.apiKey}`
    } else {
      headers[config.apiKeyName] = source.apiKey
    }

    return headers
  }

  /**
   * 构建API请求URL
   */
  static buildRequestUrl(source: AISource, endpoint: string): string {
    const config = this.getEngineConfig(source.type)
    const baseUrl = source.baseUrl || config.baseUrl
    return `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`
  }

  /**
   * 获取引擎的默认模型
   */
  static getDefaultModel(
    type: AIEngineType,
    modelType: "text" | "image" | "video" | "multimodal" = "text"
  ): AIEngineModel | null {
    const models = this.getEngineModels(type, modelType)
    return models.length > 0 ? models[0] : null
  }

  /**
   * 获取详细的模型信息（从模型管理器）
   */
  static getDetailedModelInfo(modelId: string): ModelInfo | undefined {
    return modelManager.getModelById(modelId)
  }

  /**
   * 获取平台的所有详细模型信息
   */
  static getDetailedModelsByPlatform(platform: string): ModelInfo[] {
    return modelManager.getModelsByPlatform(platform)
  }

  /**
   * 根据能力获取模型列表
   */
  static getModelsByCapability(capability: keyof ModelCapabilities, value: boolean = true): ModelInfo[] {
    return modelManager.getModelsByCapability(capability, value)
  }

  /**
   * 获取支持图片生成的模型
   */
  static getImageGenerationModels(): ModelInfo[] {
    return modelManager.getImageGenerationModels()
  }

  /**
   * 获取支持视频生成的模型
   */
  static getVideoGenerationModels(): ModelInfo[] {
    return modelManager.getVideoGenerationModels()
  }

  /**
   * 获取支持图片输入的模型
   */
  static getImageInputModels(): ModelInfo[] {
    return modelManager.getImageInputModels()
  }

  /**
   * 检查模型是否支持特定功能
   */
  static checkModelCapability(modelId: string, capability: keyof ModelCapabilities): boolean {
    return modelManager.checkModelCapability(modelId, capability)
  }

  /**
   * 获取所有平台列表
   */
  static getAllPlatforms(): string[] {
    return modelManager.getPlatforms()
  }

  /**
   * 根据引擎类型映射到平台名称
   */
  static mapEngineTypeToPlatform(type: AIEngineType): string {
    const mapping: Record<AIEngineType, string> = {
      [AIEngineType.OPENAI]: 'OpenAI',
      [AIEngineType.CLAUDE]: 'Claude',
      [AIEngineType.GEMINI]: 'Gemini',
      [AIEngineType.DOUBAO]: 'Doubao',
      [AIEngineType.JIMENG]: 'Jimeng',
      [AIEngineType.CUSTOM]: 'Custom'
    }
    return mapping[type] || 'Custom'
  }

  /**
   * 获取引擎类型对应的详细模型列表
   */
  static getEngineDetailedModels(type: AIEngineType): ModelInfo[] {
    const platform = this.mapEngineTypeToPlatform(type)
    return this.getDetailedModelsByPlatform(platform)
  }
}

// 导出常用的引擎类型选项
export const ENGINE_TYPE_OPTIONS = [
  { value: AIEngineType.OPENAI, label: "OpenAI" },
  { value: AIEngineType.CLAUDE, label: "Anthropic Claude" },
  { value: AIEngineType.GEMINI, label: "Google Gemini" },
  { value: AIEngineType.DOUBAO, label: "火山引擎豆包" },
  { value: AIEngineType.JIMENG, label: "火山引擎即梦" },
  { value: AIEngineType.CUSTOM, label: "自定义引擎" }
]
