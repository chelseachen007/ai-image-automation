import { Storage } from "@plasmohq/storage"
import { AIEngineType, EngineConfigManager } from "../src/config/engines"
import type { AISource } from "../src/config/engines"
import { DoubaoEngine } from "../src/services/engines/doubaoEngine"
import { JimengEngine } from "../src/services/engines/jimengEngine"

// 存储实例
const storage = new Storage()

// 重新导出AISource类型以保持向后兼容
export type { AISource } from "../src/config/engines"

// 聊天消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 图片生成参数
export interface ImageGenerationParams {
  prompt: string
  count: number
  size: string
  style: string
}

// 视频生成参数
export interface VideoGenerationParams {
  prompt: string
  sourceImageUrl: string
  count: number
  duration: number
  style: string
}

// API响应类型
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 批量任务项类型
export interface BatchTaskItem {
  id: string
  data: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: any
  error?: string
  retryCount?: number
}

// 批量任务配置
export interface BatchConfig {
  maxConcurrent: number
  retryCount: number
  retryDelay: number
  autoStart: boolean
}

// 批量处理结果
export interface BatchResult<T> {
  totalItems: number
  completedItems: number
  failedItems: number
  results: T[]
  errors: string[]
}

/**
 * API服务类 - 统一管理不同类型的API调用，支持批量处理和队列管理
 */
class APIService {
  private batchQueues: Map<string, BatchTaskItem[]> = new Map()
  private processingQueues: Map<string, Set<string>> = new Map()

  /**
   * 获取默认AI请求源
   */
  async getDefaultAISource(): Promise<AISource | null> {
    try {
      const sources = (await storage.get("ai_sources") as AISource[]) || []
      return sources.find(source => source.isDefault) || sources[0] || null
    } catch (error) {
      console.error("获取AI请求源失败:", error)
      return null
    }
  }

  /**
   * 获取所有AI请求源
   */
  async getAllAISources(): Promise<AISource[]> {
    try {
      return (await storage.get("ai_sources") as AISource[]) || []
    } catch (error) {
      console.error("获取AI请求源列表失败:", error)
      return []
    }
  }

  /**
   * 构建请求头
   */
  private buildHeaders(aiSource: AISource): Record<string, string> {
    return EngineConfigManager.buildRequestHeaders(aiSource)
  }

  /**
   * 构建API URL
   */
  private buildAPIUrl(aiSource: AISource, endpoint: string): string {
    return EngineConfigManager.buildRequestUrl(aiSource, endpoint)
  }

  /**
   * 获取引擎实例
   */
  private getEngineInstance(aiSource: AISource): any {
    switch (aiSource.type) {
      case AIEngineType.DOUBAO:
        return new DoubaoEngine(aiSource)
      case AIEngineType.JIMENG:
        return new JimengEngine(aiSource)
      default:
        return null
    }
  }

  /**
   * 发送聊天请求（支持新引擎）
   */
  async sendChatRequest(
    messages: ChatMessage[],
    aiSource?: AISource
  ): Promise<APIResponse<string>> {
    try {
      const source = aiSource || await this.getDefaultAISource()
      if (!source) {
        return { success: false, error: "未找到可用的AI请求源" }
      }

      // 尝试使用新引擎
      const engine = this.getEngineInstance(source)
      if (engine) {
        const result = await engine.chat(messages)
        return {
          success: true,
          data: result.content
        }
      }

      // 回退到原有实现
      return await this.legacySendChatRequest(messages, source)
    } catch (error) {
      console.error("聊天请求失败:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误"
      }
    }
  }

  /**
   * 原有的聊天请求实现（保持向后兼容）
   */
  private async legacySendChatRequest(
    messages: ChatMessage[],
    aiSource: AISource
  ): Promise<APIResponse<string>> {
    const url = this.buildAPIUrl(aiSource, '/chat/completions')
    const headers = this.buildHeaders(aiSource)

    let requestBody: any

    switch (aiSource.type) {
      case AIEngineType.OPENAI:
      case AIEngineType.CUSTOM:
        requestBody = {
          model: 'gpt-3.5-turbo',
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7
        }
        break
      case AIEngineType.CLAUDE:
        requestBody = {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2048,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
        break
      case AIEngineType.GEMINI:
        const finalUrl = `${url}/models/gemini-pro:generateContent?key=${aiSource.apiKey}`
        requestBody = {
          contents: messages.map(msg => ({
            parts: [{ text: msg.content }],
            role: msg.role === 'assistant' ? 'model' : 'user'
          }))
        }
        
        const geminiResponse = await fetch(finalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        
        if (!geminiResponse.ok) {
          throw new Error(`Gemini API请求失败: ${geminiResponse.statusText}`)
        }
        
        const geminiData = await geminiResponse.json()
        return {
          success: true,
          data: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "无响应内容"
        }
      default:
        throw new Error('不支持的引擎类型')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.statusText}`)
    }

    const data = await response.json()
    
    switch (aiSource.type) {
      case AIEngineType.OPENAI:
      case AIEngineType.CUSTOM:
        return {
          success: true,
          data: data.choices?.[0]?.message?.content || "无响应内容"
        }
      case AIEngineType.CLAUDE:
        return {
          success: true,
          data: data.content?.[0]?.text || "无响应内容"
        }
      default:
        return {
          success: false,
          error: "不支持的引擎类型"
        }
    }
  }

  /**
   * 聊天API调用 - 支持流式返回
   */
  async *streamChat(
    messages: ChatMessage[], 
    aiSource?: AISource
  ): AsyncGenerator<string, void, unknown> {
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      throw new Error('未找到可用的AI请求源')
    }

    try {
      let url: string
      let body: any

      switch (source.type) {
        case AIEngineType.OPENAI:
          url = this.buildAPIUrl(source, '/chat/completions')
          body = {
            model: 'gpt-3.5-turbo',
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            stream: true,
            max_tokens: 1000
          }
          break

        case AIEngineType.CLAUDE:
          url = this.buildAPIUrl(source, '/messages')
          body = {
            model: 'claude-3-sonnet-20240229',
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            max_tokens: 1000,
            stream: true
          }
          break

        case AIEngineType.GEMINI:
          url = this.buildAPIUrl(source, `/models/gemini-pro:streamGenerateContent?key=${source.apiKey}`)
          body = {
            contents: messages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            }))
          }
          break

        default:
          // 自定义引擎默认使用OpenAI格式
          url = this.buildAPIUrl(source, '/chat/completions')
          body = {
            model: 'gpt-3.5-turbo',
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            stream: true
          }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(source),
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') return

              try {
                const parsed = JSON.parse(data)
                let content = ''

                switch (source.type) {
                  case AIEngineType.OPENAI:
                  case AIEngineType.CUSTOM:
                    content = parsed.choices?.[0]?.delta?.content || ''
                    break
                  case AIEngineType.CLAUDE:
                    content = parsed.delta?.text || ''
                    break
                  case AIEngineType.GEMINI:
                    content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    break
                }

                if (content) {
                  yield content
                }
              } catch (e) {
                console.warn('解析流数据失败:', e)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error('聊天API调用失败:', error)
      throw error
    }
  }

  // 其他方法保持不变...
  async generateImages(
    params: ImageGenerationParams,
    aiSource?: AISource
  ): Promise<APIResponse<string[]>> {
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      return { success: false, error: '未找到可用的AI请求源' }
    }

    try {
      // 使用即梦引擎生成图片
      if (source.type === AIEngineType.JIMENG) {
        const engine = new JimengEngine(source)
        const imageUrls = await engine.generateImages(params.prompt, {
          count: params.count,
          size: params.size
        })
        return { success: true, data: imageUrls }
      }
      
      // 其他引擎的图片生成逻辑（暂时保留模拟）
      await new Promise(resolve => setTimeout(resolve, 2000))
      const mockUrls: string[] = []
      for (let i = 0; i < params.count; i++) {
        const randomId = Math.floor(Math.random() * 1000) + 100
        mockUrls.push(`https://picsum.photos/512/512?random=${randomId}`)
      }
      return { success: true, data: mockUrls }
    } catch (error) {
      console.error('图片生成API调用失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  }

  async generateVideos(
    params: VideoGenerationParams,
    aiSource?: AISource
  ): Promise<APIResponse<Array<{ url: string; thumbnailUrl: string }>>> {
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      return { success: false, error: '未找到可用的AI请求源' }
    }

    try {
      // 使用即梦引擎生成视频
      if (source.type === AIEngineType.JIMENG) {
        const engine = new JimengEngine(source)
        const videoUrls = await engine.generateVideos(params.prompt, {
          sourceImageUrl: params.sourceImageUrl,
          duration: params.duration,
          count: params.count
        })
        
        const videos = videoUrls.map((url, index) => ({
          url,
          thumbnailUrl: params.sourceImageUrl || `https://picsum.photos/320/240?random=${Date.now() + index}`
        }))
        
        return { success: true, data: videos }
      }
      
      // 其他引擎的视频生成逻辑（暂时保留模拟）
      await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000))
      
      const mockVideos: Array<{ url: string; thumbnailUrl: string }> = []
      for (let i = 0; i < params.count; i++) {
        const randomId = Math.floor(Math.random() * 1000) + 100
        mockVideos.push({
          url: `https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4`,
          thumbnailUrl: `https://picsum.photos/320/240?random=${randomId}`
        })
      }
      
      return { success: true, data: mockVideos }
    } catch (error) {
      console.error('视频生成API调用失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  }

  async testConnection(aiSource: AISource): Promise<APIResponse<boolean>> {
    try {
      const testMessages: ChatMessage[] = [
        {
          id: 'test',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now()
        }
      ]

      // 使用流式聊天进行连接测试
      const stream = this.streamChat(testMessages, aiSource)
      const { value } = await stream.next()
      
      return { success: true, data: true }
    } catch (error) {
      console.error('API连接测试失败:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '连接测试失败' 
      }
    }
  }

  // 批量处理方法保持不变...
  createBatchQueue(queueId: string, items: any[]): BatchTaskItem[] {
    const batchItems: BatchTaskItem[] = items.map((data, index) => ({
      id: `${queueId}_${index}_${Date.now()}`,
      data,
      status: 'pending',
      retryCount: 0
    }))
    
    this.batchQueues.set(queueId, batchItems)
    this.processingQueues.set(queueId, new Set())
    
    return batchItems
  }

  getBatchQueueStatus(queueId: string): BatchResult<any> | null {
    const queue = this.batchQueues.get(queueId)
    if (!queue) return null

    const totalItems = queue.length
    const completedItems = queue.filter(item => item.status === 'completed').length
    const failedItems = queue.filter(item => item.status === 'failed').length
    const results = queue.filter(item => item.result).map(item => item.result)
    const errors = queue.filter(item => item.error).map(item => item.error!)

    return {
      totalItems,
      completedItems,
      failedItems,
      results,
      errors
    }
  }

  clearBatchQueue(queueId: string): void {
    this.batchQueues.delete(queueId)
    this.processingQueues.delete(queueId)
  }
}

export const apiService = new APIService()
export default apiService