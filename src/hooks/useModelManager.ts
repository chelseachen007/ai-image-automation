/**
 * 模型管理自定义Hook
 * 使用React hooks模式替代ModelManager类
 */

import { useState, useCallback, useMemo } from 'react';
import type { ModelInfo, ModelCapabilities } from '../config/models';
import { platformModels } from '../config/models';

/**
 * 自定义模型管理Hook
 * @returns 模型管理相关的状态和方法
 */
export const useModelManager = () => {
  // 自定义模型状态
  const [customModels, setCustomModels] = useState<ModelInfo[]>([]);

  /**
   * 获取所有模型
   */
  const getAllModels = useCallback((): ModelInfo[] => {
    const allModels: ModelInfo[] = [];
    
    // 添加平台模型
    Object.values(platformModels).forEach(models => {
      allModels.push(...models);
    });
    
    // 添加自定义模型
    allModels.push(...customModels);
    
    return allModels;
  }, [customModels]);

  /**
   * 根据平台获取模型
   */
  const getModelsByPlatform = useCallback((platform: string): ModelInfo[] => {
    if (platform === 'Custom') {
      // Custom平台可以使用所有其他平台的模型 + 自定义模型
      const allPlatformModels: ModelInfo[] = [];
      Object.values(platformModels).forEach(models => {
        allPlatformModels.push(...models);
      });
      return [...allPlatformModels, ...customModels];
    }
    return platformModels[platform] || [];
  }, [customModels]);

  /**
   * 根据ID获取模型
   */
  const getModelById = useCallback((id: string): ModelInfo | undefined => {
    return getAllModels().find(model => model.id === id);
  }, [getAllModels]);

  /**
   * 根据能力筛选模型
   */
  const getModelsByCapability = useCallback((
    capability: keyof ModelCapabilities, 
    value: boolean = true
  ): ModelInfo[] => {
    return getAllModels().filter(model => model.capabilities[capability] === value);
  }, [getAllModels]);

  /**
   * 获取支持图片生成的模型
   */
  const getImageGenerationModels = useCallback((): ModelInfo[] => {
    return getModelsByCapability('canGenerateImages', true);
  }, [getModelsByCapability]);

  /**
   * 获取支持视频生成的模型
   */
  const getVideoGenerationModels = useCallback((): ModelInfo[] => {
    return getModelsByCapability('canGenerateVideos', true);
  }, [getModelsByCapability]);

  /**
   * 获取支持图片输入的模型
   */
  const getImageInputModels = useCallback((): ModelInfo[] => {
    return getModelsByCapability('supportsImageInput', true);
  }, [getModelsByCapability]);

  /**
   * 添加自定义模型
   */
  const addCustomModel = useCallback((model: Omit<ModelInfo, 'isCustom' | 'platform'>): void => {
    const customModel: ModelInfo = {
      ...model,
      platform: 'Custom',
      isCustom: true,
      capabilities: {
        // 自定义模型默认支持所有功能
        supportsImageInput: true,
        canGenerateImages: true,
        canGenerateVideos: true,
        supportsStreaming: true,
        supportsBatch: true,
        ...model.capabilities
      }
    };
    
    setCustomModels(prev => [...prev, customModel]);
  }, []);

  /**
   * 删除自定义模型
   */
  const removeCustomModel = useCallback((id: string): boolean => {
    let removed = false;
    setCustomModels(prev => {
      const index = prev.findIndex(model => model.id === id);
      if (index !== -1) {
        removed = true;
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
    return removed;
  }, []);

  /**
   * 更新自定义模型
   */
  const updateCustomModel = useCallback((id: string, updates: Partial<ModelInfo>): boolean => {
    let updated = false;
    setCustomModels(prev => {
      const index = prev.findIndex(model => model.id === id);
      if (index !== -1) {
        updated = true;
        const newModels = [...prev];
        newModels[index] = {
          ...newModels[index],
          ...updates,
          platform: 'Custom',
          isCustom: true
        };
        return newModels;
      }
      return prev;
    });
    return updated;
  }, []);

  /**
   * 检查模型是否支持特定功能
   */
  const checkModelCapability = useCallback((
    modelId: string, 
    capability: keyof ModelCapabilities
  ): boolean => {
    const model = getModelById(modelId);
    if (!model) return false;
    
    const value = model.capabilities[capability];
    return typeof value === 'boolean' ? value : Boolean(value);
  }, [getModelById]);

  /**
   * 获取平台列表
   */
  const getPlatforms = useMemo((): string[] => {
    const platforms = Object.keys(platformModels);
    if (customModels.length > 0) {
      platforms.push('Custom');
    }
    return platforms;
  }, [customModels.length]);

  return {
    // 状态
    customModels,
    
    // 查询方法
    getAllModels,
    getModelsByPlatform,
    getModelById,
    getModelsByCapability,
    getImageGenerationModels,
    getVideoGenerationModels,
    getImageInputModels,
    getPlatforms,
    
    // 管理方法
    addCustomModel,
    removeCustomModel,
    updateCustomModel,
    checkModelCapability
  };
};

/**
 * 默认模型ID常量
 */
export const DEFAULT_MODELS = {
  CHAT: 'gpt-4o-mini',
  IMAGE_GENERATION: 'jimeng-text2image-3.0',
  VIDEO_GENERATION: 'jimeng-image2video'
};