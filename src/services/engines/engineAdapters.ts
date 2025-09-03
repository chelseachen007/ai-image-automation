import { AIEngineConfig, AISource, AIEngineType, AIEngineFeature } from '../config/engines';
import { EngineAdapter } from '../adapters';

// AI引擎适配器基类
export abstract class BaseEngineAdapter implements EngineAdapter {
  protected config: AIEngineConfig;
  protected source: AISource;

  constructor(config: AIEngineConfig, source: AISource) {
    this.config = config;
    this.source = source;
  }

  // 抽象方法，由子类实现
  abstract generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; usage?: any }>;

  abstract generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
  }): Promise<{ url: string; revisedPrompt?: string }>;

  abstract generateVideo(params: {
    prompt: string;
    model?: string;
    image?: string;
    duration?: number;
  }): Promise<{ url: string; thumbnailUrl?: string }>;

  // 通用方法
  protected async makeRequest(endpoint: string, data: any): Promise<any> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders();
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.config.requestConfig?.timeout || 60000)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  protected buildUrl(endpoint: string): string {
    const baseUrl = this.source.baseUrl || this.config.baseUrl;
    return `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  }

  protected buildHeaders(): Record<string, string> {
    const headers = { ...this.config.headers };
    
    if (this.config.apiKeyName === 'Authorization') {
      headers['Authorization'] = `Bearer ${this.source.apiKey}`;
    } else {
      headers[this.config.apiKeyName] = this.source.apiKey;
    }
    
    return headers;
  }

  // 检查功能支持
  supportsFeature(feature: AIEngineFeature): boolean {
    return this.config.supportedFeatures.includes(feature);
  }

  // 获取默认模型
  getDefaultModel(type: 'text' | 'image' | 'video'): string | null {
    const model = this.config.models.find(m => m.type === type);
    return model?.id || null;
  }
}

// 豆包引擎适配器
export class DoubaoEngineAdapter extends BaseEngineAdapter {
  async generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; usage?: any }> {
    const model = params.model || this.getDefaultModel('text') || 'doubao-pro-4k';
    
    const requestData = {
      model,
      messages: params.messages || [
        { role: 'user', content: params.prompt }
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1000
    };

    const response = await this.makeRequest('chat/completions', requestData);
    
    return {
      content: response.choices[0].message.content,
      usage: response.usage
    };
  }

  async generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
  }): Promise<{ url: string; revisedPrompt?: string }> {
    throw new Error('豆包引擎不支持图片生成功能');
  }

  async generateVideo(params: {
    prompt: string;
    model?: string;
    image?: string;
    duration?: number;
  }): Promise<{ url: string; thumbnailUrl?: string }> {
    throw new Error('豆包引擎不支持视频生成功能');
  }
}

// 即梦引擎适配器
export class JimengEngineAdapter extends BaseEngineAdapter {
  async generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; usage?: any }> {
    throw new Error('即梦引擎不支持文本生成功能');
  }

  async generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
  }): Promise<{ url: string; revisedPrompt?: string }> {
    const model = params.model || this.getDefaultModel('image') || 'jimeng_t2i_v30';
    
    const requestData = {
      req_key: '',
      prompt: params.prompt,
      model_version: model,
      width: 1024,
      height: 1024,
      scale: 7.5,
      seed: '',
      steps: 20,
      logo_info: {
        add_logo: false
      }
    };

    const response = await this.makeRequest('image', requestData);
    
    return {
      url: response.data[0].url,
      revisedPrompt: params.prompt
    };
  }

  async generateVideo(params: {
    prompt: string;
    model?: string;
    image?: string;
    duration?: number;
  }): Promise<{ url: string; thumbnailUrl?: string }> {
    const model = params.model || this.getDefaultModel('video') || 'jimeng_i2v_v10';
    
    const requestData = {
      req_key: '',
      model_version: model,
      prompt: params.prompt,
      first_frame_image_url: params.image,
      video_width: 1280,
      video_height: 720,
      fps: 30,
      duration: params.duration || 5,
      logo_info: {
        add_logo: false
      }
    };

    const response = await this.makeRequest('video', requestData);
    
    return {
      url: response.data[0].video_url,
      thumbnailUrl: response.data[0].cover_url
    };
  }
}

// OpenAI引擎适配器
export class OpenAIEngineAdapter extends BaseEngineAdapter {
  async generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; usage?: any }> {
    const model = params.model || this.getDefaultModel('text') || 'gpt-4o-mini';
    
    const requestData = {
      model,
      messages: params.messages || [
        { role: 'user', content: params.prompt }
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens
    };

    const response = await this.makeRequest('chat/completions', requestData);
    
    return {
      content: response.choices[0].message.content,
      usage: response.usage
    };
  }

  async generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
  }): Promise<{ url: string; revisedPrompt?: string }> {
    const model = params.model || this.getDefaultModel('image') || 'dall-e-3';
    
    const requestData = {
      model,
      prompt: params.prompt,
      n: params.n || 1,
      size: params.size || '1024x1024',
      quality: params.quality || 'standard'
    };

    const response = await this.makeRequest('images/generations', requestData);
    
    return {
      url: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt
    };
  }

  async generateVideo(params: {
    prompt: string;
    model?: string;
    image?: string;
    duration?: number;
  }): Promise<{ url: string; thumbnailUrl?: string }> {
    throw new Error('Sora视频生成功能暂未开放');
  }
}

// Claude引擎适配器
export class ClaudeEngineAdapter extends BaseEngineAdapter {
  async generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; usage?: any }> {
    const model = params.model || this.getDefaultModel('text') || 'claude-3-5-sonnet-20240620';
    
    const requestData = {
      model,
      max_tokens: params.maxTokens || 1000,
      temperature: params.temperature ?? 0.7,
      messages: params.messages || [
        { role: 'user', content: params.prompt }
      ]
    };

    const response = await this.makeRequest('messages', requestData);
    
    return {
      content: response.content[0].text,
      usage: response.usage
    };
  }

  async generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
  }): Promise<{ url: string; revisedPrompt?: string }> {
    throw new Error('Claude引擎不支持图片生成功能');
  }

  async generateVideo(params: {
    prompt: string;
    model?: string;
    image?: string;
    duration?: number;
  }): Promise<{ url: string; thumbnailUrl?: string }> {
    throw new Error('Claude引擎不支持视频生成功能');
  }
}

// Gemini引擎适配器
export class GeminiEngineAdapter extends BaseEngineAdapter {
  async generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; usage?: any }> {
    const model = params.model || this.getDefaultModel('text') || 'gemini-1.5-flash';
    
    const requestData = {
      contents: [{
        parts: [{ text: params.prompt }]
      }],
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxTokens || 1000
      }
    };

    const response = await this.makeRequest(`models/${model}:generateContent`, requestData);
    
    return {
      content: response.candidates[0].content.parts[0].text,
      usage: response.metadata?.tokenMetadata
    };
  }

  async generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
  }): Promise<{ url: string; revisedPrompt?: string }> {
    throw new Error('Gemini图片生成功能暂未实现');
  }

  async generateVideo(params: {
    prompt: string;
    model?: string;
    image?: string;
    duration?: number;
  }): Promise<{ url: string; thumbnailUrl?: string }> {
    throw new Error('Gemini引擎不支持视频生成功能');
  }
}

// 引擎适配器工厂
export function createEngineAdapter(type: AIEngineType, source: AISource): EngineAdapter {
  const { AI_ENGINE_CONFIGS } = require('../config/engines');
  const config = AI_ENGINE_CONFIGS[type];
  
  switch (type) {
    case AIEngineType.DOUBAO:
      return new DoubaoEngineAdapter(config, source);
    case AIEngineType.JIMENG:
      return new JimengEngineAdapter(config, source);
    case AIEngineType.OPENAI:
      return new OpenAIEngineAdapter(config, source);
    case AIEngineType.CLAUDE:
      return new ClaudeEngineAdapter(config, source);
    case AIEngineType.GEMINI:
      return new GeminiEngineAdapter(config, source);
    default:
      throw new Error(`不支持的引擎类型: ${type}`);
  }
}