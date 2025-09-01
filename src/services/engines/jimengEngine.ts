/**
 * 火山引擎即梦API适配器
 * 实现即梦的图片生成和视频生成API调用逻辑
 */

import { AIEngineType, EngineConfigManager } from '../../config/engines';
import type { AISource } from '../../config/engines';

// 即梦文生图请求接口
interface JimengImageRequest {
  req_key: string;
  prompt: string;
  use_pre_llm?: boolean;
  seed?: number;
  width?: number;
  height?: number;
}

// 即梦任务提交响应
interface JimengTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
  message: string;
  request_id: string;
  status: number;
  time_elapsed: string;
}

// 即梦任务查询响应
interface JimengResultResponse {
  code: number;
  data: {
    status: number; // 任务状态：1-处理中，2-成功，3-失败
    binary_data_base64?: string[]; // base64编码的图片数据
    image_urls?: string[]; // 图片链接（如果配置了return_url）
  };
  message: string;
  request_id: string;
}

// 即梦视频生成请求接口
interface JimengVideoRequest {
  req_key: string;
  prompt: string;
  image_url?: string; // 图生视频时的输入图片
  duration?: number; // 视频时长
  fps?: number; // 帧率
  width?: number;
  height?: number;
}

// 支持的图片尺寸预设
const IMAGE_SIZE_PRESETS = {
  '1:1': { width: 1328, height: 1328 },
  '4:3': { width: 1472, height: 1104 },
  '3:2': { width: 1584, height: 1056 },
  '16:9': { width: 1664, height: 936 },
  '21:9': { width: 2016, height: 864 },
  '1:1_2k': { width: 2048, height: 2048 },
  '4:3_2k': { width: 2304, height: 1728 },
  '3:2_2k': { width: 2496, height: 1664 },
  '16:9_2k': { width: 2560, height: 1440 },
  '21:9_2k': { width: 3024, height: 1296 }
};

/**
 * 即梦引擎类 - 处理火山引擎即梦的图片和视频生成
 */
export class JimengEngine {
  private source: AISource;
  private config: any;
  private baseUrl = 'https://visual.volcengineapi.com';

  constructor(source: AISource) {
    this.source = source;
    this.config = EngineConfigManager.getEngineConfig(source.type);
  }

  /**
   * 生成图片
   */
  async generateImages(prompt: string, options: any = {}): Promise<string[]> {
    try {
      const {
        count = 1,
        size = '1:1',
        seed = -1,
        use_pre_llm = true
      } = options;

      const sizeConfig = IMAGE_SIZE_PRESETS[size as keyof typeof IMAGE_SIZE_PRESETS] || IMAGE_SIZE_PRESETS['1:1'];
      
      // 提交任务
      const taskId = await this.submitImageTask({
        req_key: 'jimeng_t2i_v30',
        prompt,
        use_pre_llm,
        seed,
        width: sizeConfig.width,
        height: sizeConfig.height
      });

      // 轮询获取结果
      const result = await this.pollTaskResult(taskId);
      
      if (result.image_urls) {
        return result.image_urls;
      } else if (result.binary_data_base64) {
        // 将base64转换为data URL
        return result.binary_data_base64.map(base64 => `data:image/png;base64,${base64}`);
      }
      
      throw new Error('未获取到图片数据');
    } catch (error) {
      console.error('即梦图片生成失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 生成视频
   */
  async generateVideos(prompt: string, options: any = {}): Promise<string[]> {
    try {
      const {
        sourceImageUrl,
        duration = 4,
        fps = 24,
        width = 1024,
        height = 576
      } = options;

      // 提交视频生成任务
      const taskId = await this.submitVideoTask({
        req_key: 'jimeng_i2v_v10', // 假设的视频生成模型
        prompt,
        image_url: sourceImageUrl,
        duration,
        fps,
        width,
        height
      });

      // 轮询获取结果
      const result = await this.pollTaskResult(taskId);
      
      if (result.image_urls) {
        return result.image_urls; // 视频URL
      }
      
      throw new Error('未获取到视频数据');
    } catch (error) {
      console.error('即梦视频生成失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 提交图片生成任务
   */
  private async submitImageTask(request: JimengImageRequest): Promise<string> {
    const response = await this.makeRequest('/CVSync2AsyncSubmitTask', {
      Action: 'CVSync2AsyncSubmitTask',
      Version: '2022-08-31'
    }, request);

    if (response.code !== 10000) {
      throw new Error(`任务提交失败: ${response.message}`);
    }

    return response.data.task_id;
  }

  /**
   * 提交视频生成任务
   */
  private async submitVideoTask(request: JimengVideoRequest): Promise<string> {
    const response = await this.makeRequest('/CVSync2AsyncSubmitTask', {
      Action: 'CVSync2AsyncSubmitTask',
      Version: '2022-08-31'
    }, request);

    if (response.code !== 10000) {
      throw new Error(`视频任务提交失败: ${response.message}`);
    }

    return response.data.task_id;
  }

  /**
   * 轮询任务结果
   */
  private async pollTaskResult(taskId: string, maxAttempts = 30): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.makeRequest('/CVSync2AsyncGetResult', {
          Action: 'CVSync2AsyncGetResult',
          Version: '2022-08-31'
        }, {
          req_key: 'jimeng_t2i_v30',
          task_id: taskId,
          req_json: JSON.stringify({
            return_url: true,
            logo_info: {
              add_logo: false
            }
          })
        });

        if (response.code !== 10000) {
          throw new Error(`查询任务失败: ${response.message}`);
        }

        const status = response.data.status;
        
        if (status === 2) {
          // 任务成功
          return response.data;
        } else if (status === 3) {
          // 任务失败
          throw new Error('任务执行失败');
        }
        
        // 任务还在处理中，等待后重试
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('任务超时');
  }

  /**
   * 发起HTTP请求
   */
  private async makeRequest(endpoint: string, queryParams: any, body: any): Promise<any> {
    const url = new URL(endpoint, this.baseUrl);
    
    // 添加查询参数
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });

    const headers = EngineConfigManager.buildRequestHeaders(this.source);
    headers['Content-Type'] = 'application/json';
    headers['Region'] = 'cn-north-1';
    headers['Service'] = 'cv';

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 错误处理
   */
  private handleError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(`即梦API错误 (${status}): ${data.message || '未知错误'}`);
    } else if (error.request) {
      return new Error('网络请求失败，请检查网络连接');
    } else {
      return new Error(`请求配置错误: ${error.message}`);
    }
  }

  /**
   * 获取支持的图片尺寸
   */
  getSupportedSizes(): Array<{ label: string; value: string; size: string }> {
    return [
      { label: '正方形 1:1 (1328x1328)', value: '1:1', size: '1328x1328' },
      { label: '横屏 4:3 (1472x1104)', value: '4:3', size: '1472x1104' },
      { label: '横屏 3:2 (1584x1056)', value: '3:2', size: '1584x1056' },
      { label: '宽屏 16:9 (1664x936)', value: '16:9', size: '1664x936' },
      { label: '超宽 21:9 (2016x864)', value: '21:9', size: '2016x864' },
      { label: '高清正方形 1:1 (2048x2048)', value: '1:1_2k', size: '2048x2048' },
      { label: '高清横屏 4:3 (2304x1728)', value: '4:3_2k', size: '2304x1728' },
      { label: '高清横屏 3:2 (2496x1664)', value: '3:2_2k', size: '2496x1664' },
      { label: '高清宽屏 16:9 (2560x1440)', value: '16:9_2k', size: '2560x1440' },
      { label: '高清超宽 21:9 (3024x1296)', value: '21:9_2k', size: '3024x1296' }
    ];
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // 提交一个简单的测试任务
      await this.submitImageTask({
        req_key: 'jimeng_t2i_v30',
        prompt: 'test',
        width: 512,
        height: 512
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * 创建即梦引擎实例
 */
export function createJimengEngine(source: AISource): JimengEngine {
  return new JimengEngine(source);
}

/**
 * 验证即梦配置
 */
export function validateJimengConfig(source: AISource): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!source.apiKey) {
    errors.push('缺少API密钥');
  }

  if (!source.baseUrl && !source.type) {
    errors.push('缺少API基础URL或引擎类型');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}