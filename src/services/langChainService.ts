/**
 * LangChain 集成服务
 * 提供链式调用、记忆管理、RAG 等高级功能
 */

import { Storage } from "@plasmohq/storage"
import { AIEngineType, EngineConfigManager } from "../src/config/engines"
import type { AISource } from "../src/config/engines"
import { apiService } from "../services/apiService"

// 存储实例
const storage = new Storage()

// 导入 LangChain 核心模块
// 注意：需要在安装后取消注释
// import { ChatOpenAI } from "@langchain/openai"
// import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages"
// import { ConversationBufferMemory } from "langchain/memory"
// import { LLMChain } from "langchain/chains"
// import { PromptTemplate } from "@langchain/core/prompts"
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

// 对话历史接口
export interface ConversationHistory {
  id: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
  }>
  metadata?: {
    title?: string
    model?: string
    tags?: string[]
  }
}

// LangChain 配置接口
export interface LangChainConfig {
  enableMemory: boolean
  maxMemoryTokens: number
  enableRAG: boolean
  enableTools: boolean
  customPrompts: Record<string, string>
}

// 工具定义接口
export interface LangChainTool {
  name: string
  description: string
  func: (input: string) => Promise<string>
}

/**
 * LangChain 服务类
 */
export class LangChainService {
  private static instance: LangChainService
  private config: LangChainConfig
  private conversationHistories: Map<string, ConversationHistory> = new Map()
  
  // LangChain 组件（需要在安装后初始化）
  // private memory: ConversationBufferMemory
  // private tools: LangChainTool[] = []

  private constructor() {
    this.config = {
      enableMemory: true,
      maxMemoryTokens: 4000,
      enableRAG: false,
      enableTools: false,
      customPrompts: {
        systemPrompt: "你是一个智能助手，能够帮助用户完成各种任务。",
        imagePromptOptimizer: "请优化以下图片生成提示词，使其更加详细和有效：",
        videoPromptOptimizer: "请优化以下视频生成提示词，使其更加生动和具体："
      }
    }
  }

  static getInstance(): LangChainService {
    if (!LangChainService.instance) {
      LangChainService.instance = new LangChainService()
    }
    return LangChainService.instance
  }

  /**
   * 初始化 LangChain
   */
  async initialize(): Promise<void> {
    try {
      // 加载保存的配置
      const savedConfig = await storage.get('langchain_config')
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig }
      }

      // 加载对话历史
      const histories = await storage.get('conversation_histories') as ConversationHistory[]
      if (histories) {
        histories.forEach(history => {
          this.conversationHistories.set(history.id, history)
        })
      }

      // 初始化 LangChain 组件（需要在安装后实现）
      // await this.initializeLangChainComponents()
      
      console.log('LangChain 服务初始化成功')
    } catch (error) {
      console.error('LangChain 服务初始化失败:', error)
    }
  }

  /**
   * 带记忆的对话
   */
  async chatWithMemory(
    message: string,
    conversationId?: string,
    aiSource?: AISource
  ): Promise<{ response: string; conversationId: string }> {
    // 如果没有提供 conversationId，创建新的
    if (!conversationId) {
      conversationId = `conv_${Date.now()}`
    }

    // 获取或创建对话历史
    let history = this.conversationHistories.get(conversationId)
    if (!history) {
      history = {
        id: conversationId,
        messages: [],
        metadata: {
          title: message.slice(0, 50) + (message.length > 50 ? '...' : '')
        }
      }
      this.conversationHistories.set(conversationId, history)
    }

    // 添加用户消息
    history.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    })

    try {
      let response: string

      if (this.config.enableMemory && history.messages.length > 2) {
        // 使用记忆的对话（需要在安装后实现）
        // response = await this.chatWithMemoryInternal(message, history, aiSource)
        response = await this.fallbackChatWithMemory(message, history, aiSource)
      } else {
        // 普通对话
        const apiResponse = await apiService.sendChatRequest(
          [{ id: Date.now().toString(), role: 'user', content: message, timestamp: Date.now() }],
          aiSource
        )
        response = apiResponse.success ? apiResponse.data! : '抱歉，发生了错误'
      }

      // 添加助手回复
      history.messages.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      })

      // 保存对话历史
      await this.saveConversationHistory(conversationId)

      return { response, conversationId }
    } catch (error) {
      console.error('对话失败:', error)
      throw error
    }
  }

  /**
   * 降级的带记忆对话实现（使用原生 API）
   */
  private async fallbackChatWithMemory(
    message: string,
    history: ConversationHistory,
    aiSource?: AISource
  ): Promise<string> {
    // 构建包含历史的提示词
    const systemPrompt = this.config.customPrompts.systemPrompt
    const conversationContext = history.messages
      .slice(-10) // 保留最近10条消息
      .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
      .join('\n')

    const fullPrompt = `${systemPrompt}\n\n对话历史：\n${conversationContext}\n\n用户: ${message}\n助手:`

    // 调用 API
    const apiResponse = await apiService.sendChatRequest(
      [{ id: Date.now().toString(), role: 'user', content: fullPrompt, timestamp: Date.now() }],
      aiSource
    )

    return apiResponse.success ? apiResponse.data! : '抱歉，发生了错误'
  }

  /**
   * 优化图片生成提示词
   */
  async optimizeImagePrompt(
    originalPrompt: string,
    style?: string,
    aiSource?: AISource
  ): Promise<string> {
    const optimizationPrompt = `${this.config.customPrompts.imagePromptOptimizer}\n\n原始提示词: ${originalPrompt}${style ? `\n期望风格: ${style}` : ''}`

    const response = await apiService.sendChatRequest(
      [{ id: Date.now().toString(), role: 'user', content: optimizationPrompt, timestamp: Date.now() }],
      aiSource
    )

    return response.success ? response.data! : originalPrompt
  }

  /**
   * 优化视频生成提示词
   */
  async optimizeVideoPrompt(
    originalPrompt: string,
    duration?: number,
    style?: string,
    aiSource?: AISource
  ): Promise<string> {
    const optimizationPrompt = `${this.config.customPrompts.videoPromptOptimizer}\n\n原始提示词: ${originalPrompt}${duration ? `\n视频时长: ${duration}秒` : ''}${style ? `\n期望风格: ${style}` : ''}`

    const response = await apiService.sendChatRequest(
      [{ id: Date.now().toString(), role: 'user', content: optimizationPrompt, timestamp: Date.now() }],
      aiSource
    )

    return response.success ? response.data! : originalPrompt
  }

  /**
   * 智能分析图片
   */
  async analyzeImage(
    imageUrl: string,
    analysisType: 'description' | 'tags' | 'style' | 'suggestions',
    aiSource?: AISource
  ): Promise<string> {
    const analysisPrompts = {
      description: "请详细描述这张图片的内容，包括主体、背景、色彩、构图等。",
      tags: "为这张图片生成相关的标签，用逗号分隔。",
      style: "分析这张图片的艺术风格，包括画风、色调、技法等。",
      suggestions: "基于这张图片，提供一些创意建议或改进方向。"
    }

    const prompt = `${analysisPrompts[analysisType]}\n\n图片链接: ${imageUrl}`

    const response = await apiService.sendChatRequest(
      [{ id: Date.now().toString(), role: 'user', content: prompt, timestamp: Date.now() }],
      aiSource
    )

    return response.success ? response.data! : '分析失败'
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(conversationId: string): ConversationHistory | null {
    return this.conversationHistories.get(conversationId) || null
  }

  /**
   * 获取所有对话列表
   */
  getAllConversations(): ConversationHistory[] {
    return Array.from(this.conversationHistories.values())
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string): Promise<void> {
    this.conversationHistories.delete(conversationId)
    await storage.remove(`conversation_${conversationId}`)
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<LangChainConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig }
    await storage.set('langchain_config', this.config)
  }

  /**
   * 获取配置
   */
  getConfig(): LangChainConfig {
    return { ...this.config }
  }

  /**
   * 保存对话历史
   */
  private async saveConversationHistory(conversationId: string): Promise<void> {
    const history = this.conversationHistories.get(conversationId)
    if (history) {
      await storage.set(`conversation_${conversationId}`, history)
    }
  }

  /**
   * 清理过期对话
   */
  async cleanupOldConversations(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now()
    const toDelete: string[] = []

    this.conversationHistories.forEach((history, id) => {
      const lastMessage = history.messages[history.messages.length - 1]
      if (lastMessage && now - lastMessage.timestamp > maxAge) {
        toDelete.push(id)
      }
    })

    toDelete.forEach(id => {
      this.conversationHistories.delete(id)
      storage.remove(`conversation_${id}`)
    })
  }
}

// 导出单例实例
export const langChainService = LangChainService.getInstance()