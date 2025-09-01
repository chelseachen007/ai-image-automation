/**
 * 火山引擎豆包API适配器
 * 实现火山引擎的具体API调用逻辑
 */

import { AIEngineType, EngineConfigManager } from '../../config/engines';
import type { AISource } from '../../config/engines';

// 火山引擎API请求接口
interface DoubaoRequest {
  model: string;
  messages: DoubaoMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

// 火山引擎消息格式
interface DoubaoMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | DoubaoContent[];
}

// 火山引擎内容格式（支持多模态）
interface DoubaoContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

// 火山引擎API响应接口
interface DoubaoResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DoubaoChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface DoubaoChoice {
  index: number;
  message: DoubaoMessage;
  finish_reason: string;
}

// 火山引擎错误响应
interface DoubaoError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * 火山引擎豆包API适配器类
 */
export class DoubaoEngine {
  private source: AISource;
  private config: any;

  constructor(source: AISource) {
    this.source = source;
    this.config = EngineConfigManager.getEngineConfig(AIEngineType.DOUBAO);
  }

  /**
   * 发送聊天请求
   */
  async chat(messages: any[], options: any = {}): Promise<any> {
    const requestData: DoubaoRequest = {
      model: options.model || 'doubao-pro-4k',
      messages: this.formatMessages(messages),
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0,
      stream: false
    };

    try {
      const response = await this.makeRequest('/chat/completions', requestData);
      return this.formatResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 批量聊天请求
   */
  async batchChat(requests: any[]): Promise<any[]> {
    const results = [];
    
    // 火山引擎暂不支持原生批量API，使用并发请求
    const batchSize = 5; // 限制并发数量
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => 
        this.chat(request.messages, request.options)
          .catch(error => ({ error: error.message }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 添加延迟以避免频率限制
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * 格式化消息
   */
  private formatMessages(messages: any[]): DoubaoMessage[] {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content
        };
      } else if (Array.isArray(msg.content)) {
        // 处理多模态内容
        return {
          role: msg.role,
          content: msg.content.map((item: any) => {
            if (item.type === 'text') {
              return {
                type: 'text',
                text: item.text
              };
            } else if (item.type === 'image_url') {
              return {
                type: 'image_url',
                image_url: {
                  url: item.image_url.url,
                  detail: item.image_url.detail || 'auto'
                }
              };
            }
            return item;
          })
        };
      }
      return msg;
    });
  }

  /**
   * 格式化响应
   */
  private formatResponse(response: DoubaoResponse): any {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('火山引擎返回了空响应');
    }

    const choice = response.choices[0];
    return {
      id: response.id,
      content: choice.message.content,
      role: choice.message.role,
      model: response.model,
      usage: response.usage,
      finishReason: choice.finish_reason
    };
  }

  /**
   * 发送HTTP请求
   */
  private async makeRequest(endpoint: string, data: any): Promise<DoubaoResponse> {
    const url = EngineConfigManager.buildRequestUrl(this.source, endpoint);
    const headers = EngineConfigManager.buildRequestHeaders(this.source);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`火山引擎API请求失败: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * 处理错误
   */
  private handleError(error: any): Error {
    if (error.error) {
      const doubaoError = error as DoubaoError;
      return new Error(`火山引擎错误: ${doubaoError.error.message} (${doubaoError.error.code})`);
    }
    
    if (error.message) {
      return new Error(`火山引擎请求失败: ${error.message}`);
    }
    
    return new Error('火山引擎未知错误');
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): string[] {
    const models = EngineConfigManager.getEngineModels(AIEngineType.DOUBAO);
    return models.map(model => model.id);
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const testMessages = [{
        role: 'user',
        content: '你好'
      }];
      
      await this.chat(testMessages, { max_tokens: 10 });
      return true;
    } catch (error) {
      console.error('火山引擎API密钥验证失败:', error);
      return false;
    }
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelId: string): any {
    const models = EngineConfigManager.getEngineModels(AIEngineType.DOUBAO);
    return models.find(model => model.id === modelId);
  }

  /**
   * 计算token使用量（估算）
   */
  estimateTokens(text: string): number {
    // 中文字符按2个token计算，英文按0.75个token计算
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars * 2 + otherChars * 0.75);
  }
}

/**
 * 火山引擎工厂函数
 */
export function createDoubaoEngine(source: AISource): DoubaoEngine {
  return new DoubaoEngine(source);
}

/**
 * 火山引擎配置验证
 */
export function validateDoubaoConfig(source: AISource): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!source.apiKey) {
    errors.push('API密钥不能为空');
  }
  
  if (source.apiKey && !source.apiKey.startsWith('sk-')) {
    errors.push('火山引擎API密钥格式不正确，应以"sk-"开头');
  }
  
  if (source.baseUrl && !source.baseUrl.startsWith('https://')) {
    errors.push('自定义API地址必须使用HTTPS协议');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}