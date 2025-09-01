import { Storage } from "@plasmohq/storage"

// 存储实例
const storage = new Storage()

// AI请求源类型
export interface AISource {
  id: string
  name: string
  type: 'openai' | 'claude' | 'gemini' | 'custom'
  apiKey: string
  baseUrl?: string
  isDefault: boolean
}

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    switch (aiSource.type) {
      case 'openai':
        headers['Authorization'] = `Bearer ${aiSource.apiKey}`
        break
      case 'claude':
        headers['x-api-key'] = aiSource.apiKey
        headers['anthropic-version'] = '2023-06-01'
        break
      case 'gemini':
        // Gemini通常在URL中传递API key
        break
      case 'custom':
        headers['Authorization'] = `Bearer ${aiSource.apiKey}`
        break
    }

    return headers
  }

  /**
   * 构建API URL
   */
  private buildAPIUrl(aiSource: AISource, endpoint: string): string {
    let baseUrl = aiSource.baseUrl

    if (!baseUrl) {
      switch (aiSource.type) {
        case 'openai':
          baseUrl = 'https://api.openai.com/v1'
          break
        case 'claude':
          baseUrl = 'https://api.anthropic.com/v1'
          break
        case 'gemini':
          baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
          break
        default:
          throw new Error('未配置API基础URL')
      }
    }

    return `${baseUrl}${endpoint}`
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
        case 'openai':
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

        case 'claude':
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

        case 'gemini':
          url = this.buildAPIUrl(source, `/models/gemini-pro:streamGenerateContent?key=${source.apiKey}`)
          body = {
            contents: messages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            }))
          }
          break

        default:
          // 自定义API，使用OpenAI格式
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
                  case 'openai':
                  case 'custom':
                    content = parsed.choices?.[0]?.delta?.content || ''
                    break
                  case 'claude':
                    content = parsed.delta?.text || ''
                    break
                  case 'gemini':
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

  /**
   * 图片生成API调用
   */
  async generateImages(
    params: ImageGenerationParams,
    aiSource?: AISource
  ): Promise<APIResponse<string[]>> {
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      return { success: false, error: '未找到可用的AI请求源' }
    }

    try {
      let url: string
      let body: any

      switch (source.type) {
        case 'openai':
          url = this.buildAPIUrl(source, '/images/generations')
          body = {
            model: 'dall-e-3',
            prompt: params.prompt,
            n: params.count,
            size: params.size,
            style: params.style
          }
          break

        default:
          // 对于其他类型，模拟生成
          await new Promise(resolve => setTimeout(resolve, 2000))
          const mockUrls: string[] = []
          for (let i = 0; i < params.count; i++) {
            const randomId = Math.floor(Math.random() * 1000) + 100
            mockUrls.push(`https://picsum.photos/512/512?random=${randomId}`)
          }
          return { success: true, data: mockUrls }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(source),
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const imageUrls = result.data?.map((item: any) => item.url) || []
      
      return { success: true, data: imageUrls }
    } catch (error) {
      console.error('图片生成API调用失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 视频生成API调用
   */
  async generateVideos(
    params: VideoGenerationParams,
    aiSource?: AISource
  ): Promise<APIResponse<Array<{ url: string; thumbnailUrl: string }>>> {
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      return { success: false, error: '未找到可用的AI请求源' }
    }

    try {
      // 目前大多数API还不支持视频生成，这里提供模拟实现
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

  /**
   * 测试API连接
   */
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

      // 尝试发送一个简单的测试消息
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

  /**
   * 创建批量任务队列
   */
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

  /**
   * 获取批量任务队列状态
   */
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

  /**
   * 批量聊天处理
   */
  async processBatchChat(
    queueId: string,
    config: BatchConfig,
    onProgress?: (progress: BatchResult<string>) => void,
    aiSource?: AISource
  ): Promise<BatchResult<string>> {
    const queue = this.batchQueues.get(queueId)
    if (!queue) {
      throw new Error('批量任务队列不存在')
    }

    const processingSet = this.processingQueues.get(queueId)!
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      throw new Error('未找到可用的AI请求源')
    }

    const processItem = async (item: BatchTaskItem): Promise<void> => {
      if (processingSet.size >= config.maxConcurrent) {
        return
      }

      processingSet.add(item.id)
      item.status = 'processing'

      try {
        const messages: ChatMessage[] = [{
          id: item.id,
          role: 'user',
          content: item.data.prompt || item.data.content || String(item.data),
          timestamp: Date.now()
        }]

        let fullResponse = ''
        const stream = this.streamChat(messages, source)
        
        for await (const chunk of stream) {
          fullResponse += chunk
        }

        item.result = fullResponse
        item.status = 'completed'
      } catch (error) {
        item.error = error instanceof Error ? error.message : '处理失败'
        item.retryCount = (item.retryCount || 0) + 1
        
        if (item.retryCount < config.retryCount) {
          item.status = 'pending'
          setTimeout(() => processItem(item), config.retryDelay)
        } else {
          item.status = 'failed'
        }
      } finally {
        processingSet.delete(item.id)
        
        if (onProgress) {
          const status = this.getBatchQueueStatus(queueId)!
          onProgress(status)
        }
      }
    }

    // 开始处理队列
    const processQueue = async (): Promise<void> => {
      const pendingItems = queue.filter(item => item.status === 'pending')
      const availableSlots = config.maxConcurrent - processingSet.size
      const itemsToProcess = pendingItems.slice(0, availableSlots)

      await Promise.all(itemsToProcess.map(processItem))

      const hasMorePending = queue.some(item => item.status === 'pending')
      const hasProcessing = processingSet.size > 0

      if (hasMorePending || hasProcessing) {
        setTimeout(processQueue, 100)
      }
    }

    await processQueue()
    return this.getBatchQueueStatus(queueId)!
  }

  /**
   * 批量图片生成处理
   */
  async processBatchImages(
    queueId: string,
    config: BatchConfig,
    onProgress?: (progress: BatchResult<string[]>) => void,
    aiSource?: AISource
  ): Promise<BatchResult<string[]>> {
    const queue = this.batchQueues.get(queueId)
    if (!queue) {
      throw new Error('批量任务队列不存在')
    }

    const processingSet = this.processingQueues.get(queueId)!
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      throw new Error('未找到可用的AI请求源')
    }

    const processItem = async (item: BatchTaskItem): Promise<void> => {
      if (processingSet.size >= config.maxConcurrent) {
        return
      }

      processingSet.add(item.id)
      item.status = 'processing'

      try {
        const params: ImageGenerationParams = {
          prompt: item.data.prompt,
          count: item.data.count || 1,
          size: item.data.size || '512x512',
          style: item.data.style || 'natural'
        }

        const result = await this.generateImages(params, source)
        if (result.success) {
          item.result = result.data
          item.status = 'completed'
        } else {
          throw new Error(result.error || '图片生成失败')
        }
      } catch (error) {
        item.error = error instanceof Error ? error.message : '处理失败'
        item.retryCount = (item.retryCount || 0) + 1
        
        if (item.retryCount < config.retryCount) {
          item.status = 'pending'
          setTimeout(() => processItem(item), config.retryDelay)
        } else {
          item.status = 'failed'
        }
      } finally {
        processingSet.delete(item.id)
        
        if (onProgress) {
          const status = this.getBatchQueueStatus(queueId)!
          onProgress(status)
        }
      }
    }

    // 开始处理队列
    const processQueue = async (): Promise<void> => {
      const pendingItems = queue.filter(item => item.status === 'pending')
      const availableSlots = config.maxConcurrent - processingSet.size
      const itemsToProcess = pendingItems.slice(0, availableSlots)

      await Promise.all(itemsToProcess.map(processItem))

      const hasMorePending = queue.some(item => item.status === 'pending')
      const hasProcessing = processingSet.size > 0

      if (hasMorePending || hasProcessing) {
        setTimeout(processQueue, 100)
      }
    }

    await processQueue()
    return this.getBatchQueueStatus(queueId)!
  }

  /**
   * 批量视频生成处理
   */
  async processBatchVideos(
    queueId: string,
    config: BatchConfig,
    onProgress?: (progress: BatchResult<Array<{ url: string; thumbnailUrl: string }>>) => void,
    aiSource?: AISource
  ): Promise<BatchResult<Array<{ url: string; thumbnailUrl: string }>>> {
    const queue = this.batchQueues.get(queueId)
    if (!queue) {
      throw new Error('批量任务队列不存在')
    }

    const processingSet = this.processingQueues.get(queueId)!
    const source = aiSource || await this.getDefaultAISource()
    if (!source) {
      throw new Error('未找到可用的AI请求源')
    }

    const processItem = async (item: BatchTaskItem): Promise<void> => {
      if (processingSet.size >= config.maxConcurrent) {
        return
      }

      processingSet.add(item.id)
      item.status = 'processing'

      try {
        const params: VideoGenerationParams = {
          prompt: item.data.prompt,
          sourceImageUrl: item.data.sourceImageUrl,
          count: item.data.count || 1,
          duration: item.data.duration || 5,
          style: item.data.style || 'natural'
        }

        const result = await this.generateVideos(params, source)
        if (result.success) {
          item.result = result.data
          item.status = 'completed'
        } else {
          throw new Error(result.error || '视频生成失败')
        }
      } catch (error) {
        item.error = error instanceof Error ? error.message : '处理失败'
        item.retryCount = (item.retryCount || 0) + 1
        
        if (item.retryCount < config.retryCount) {
          item.status = 'pending'
          setTimeout(() => processItem(item), config.retryDelay)
        } else {
          item.status = 'failed'
        }
      } finally {
        processingSet.delete(item.id)
        
        if (onProgress) {
          const status = this.getBatchQueueStatus(queueId)!
          onProgress(status)
        }
      }
    }

    // 开始处理队列
    const processQueue = async (): Promise<void> => {
      const pendingItems = queue.filter(item => item.status === 'pending')
      const availableSlots = config.maxConcurrent - processingSet.size
      const itemsToProcess = pendingItems.slice(0, availableSlots)

      await Promise.all(itemsToProcess.map(processItem))

      const hasMorePending = queue.some(item => item.status === 'pending')
      const hasProcessing = processingSet.size > 0

      if (hasMorePending || hasProcessing) {
        setTimeout(processQueue, 100)
      }
    }

    await processQueue()
    return this.getBatchQueueStatus(queueId)!
  }

  /**
   * 清理批量任务队列
   */
  clearBatchQueue(queueId: string): void {
    this.batchQueues.delete(queueId)
    this.processingQueues.delete(queueId)
  }

  /**
   * 暂停批量任务处理
   */
  pauseBatchQueue(queueId: string): void {
    const queue = this.batchQueues.get(queueId)
    if (queue) {
      queue.forEach(item => {
        if (item.status === 'pending') {
          item.status = 'pending' // 保持pending状态，但停止处理
        }
      })
    }
  }

  /**
   * 恢复批量任务处理
   */
  resumeBatchQueue(queueId: string, config: BatchConfig): void {
    const queue = this.batchQueues.get(queueId)
    if (queue) {
      const hasPendingItems = queue.some(item => item.status === 'pending')
      if (hasPendingItems) {
        // 根据任务类型恢复处理
        // 这里需要根据实际情况调用相应的批量处理方法
      }
    }
  }
}

// 导出单例实例
export const apiService = new APIService()
export default apiService