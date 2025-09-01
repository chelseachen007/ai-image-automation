import { useState, useRef, useEffect } from "react"
import { Input, Button, Space, Typography, Card, Avatar, Spin, message, Tabs, Modal } from "antd"
import { SendOutlined, UserOutlined, RobotOutlined, BulbOutlined, FileExcelOutlined, SettingOutlined } from "@ant-design/icons"
import { Storage } from "@plasmohq/storage"
import BatchProcessor, { BatchTaskType, BatchTaskStatus } from '../BatchProcessor'
import type { BatchTask } from '../BatchProcessor'
import ExcelImporter from '../ExcelImporter'
import TemplateManager from '../TemplateManager'
import type { Template } from '../TemplateManager'

const { Text, Paragraph } = Typography
const { TextArea } = Input

// 存储实例
const storage = new Storage()

// 消息类型
interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

// AI请求源类型
interface AISource {
  id: string
  name: string
  type: 'openai' | 'claude' | 'gemini' | 'custom'
  apiKey: string
  baseUrl?: string
  isDefault: boolean
}

/**
 * 聊天标签页组件 - 支持流式API调用、消息展示和批量对话处理
 */
function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentAISource, setCurrentAISource] = useState<AISource | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 批量处理相关状态
  const [activeTab, setActiveTab] = useState('single')
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([])
  const [isImportModalVisible, setIsImportModalVisible] = useState(false)
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false)
  const [batchConfig, setBatchConfig] = useState({
    maxConcurrent: 3,
    retryCount: 2,
    retryDelay: 1000,
    autoStart: false
  })

  /**
   * 滚动到消息底部
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  /**
   * 加载默认AI请求源
   */
  const loadDefaultAISource = async () => {
    try {
      const sources = (await storage.get("ai_sources") as AISource[]) || []
      const defaultSource = sources.find(source => source.isDefault) || sources[0]
      setCurrentAISource(defaultSource || null)
    } catch (error) {
      console.error("加载AI请求源失败:", error)
    }
  }

  /**
   * 模拟流式API调用
   */
  const simulateStreamingResponse = async (userMessage: string): Promise<string> => {
    // 这里应该调用实际的API，现在先模拟
    const responses = [
      "我理解您的问题，让我来帮助您。",
      "根据您提供的信息，我建议...",
      "这是一个很好的问题，通常情况下...",
      "基于我的分析，您可以考虑以下几个方面：\n1. 首先...\n2. 其次...\n3. 最后..."
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * 发送消息
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim()) {
      message.warning("请输入消息内容")
      return
    }

    if (!currentAISource) {
      message.error("请先配置AI请求源")
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    }

    // 添加用户消息
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // 创建助手消息占位符
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      type: 'assistant',
      content: "",
      timestamp: Date.now(),
      isStreaming: true
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      // 模拟流式响应
      const response = await simulateStreamingResponse(userMessage.content)
      
      // 模拟逐字显示效果
      const words = response.split('')
      let currentContent = ""
      
      for (let i = 0; i < words.length; i++) {
        currentContent += words[i]
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: currentContent }
              : msg
          )
        )
        
        // 模拟打字延迟
        await new Promise(resolve => setTimeout(resolve, 30))
      }

      // 完成流式响应
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        )
      )
    } catch (error) {
      console.error("发送消息失败:", error)
      message.error("发送消息失败，请重试")
      
      // 移除失败的消息
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 处理回车发送
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  /**
   * 清空聊天记录
   */
  const handleClearChat = () => {
    setMessages([])
  }

  /**
   * 创建批量对话任务
   */
  const createBatchTask = (data: any[], template?: Template) => {
    const task: BatchTask = {
      id: `batch_chat_${Date.now()}`,
      type: BatchTaskType.CHAT,
      name: `批量对话任务 - ${new Date().toLocaleString()}`,
      status: BatchTaskStatus.PENDING,
      progress: 0,
      totalItems: data.length,
      completedItems: 0,
      failedItems: 0,
      data,
      results: [],
      createdAt: new Date()
    }
    
    setBatchTasks(prev => [...prev, task])
    return task
  }

  /**
   * 处理批量对话任务
   */
  const processBatchChatItem = async (taskType: BatchTaskType, item: any, taskId: string): Promise<any> => {
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      const response = await simulateStreamingResponse(item.question)
      
      return {
        question: item.question,
        answer: response,
        context: item.context || '',
        timestamp: new Date().toISOString(),
        success: true
      }
    } catch (error) {
      return {
        question: item.question,
        error: error instanceof Error ? error.message : '处理失败',
        timestamp: new Date().toISOString(),
        success: false
      }
    }
  }

  /**
   * 处理Excel导入完成
   */
  const handleImportComplete = (data: any[], config: any) => {
    const task = createBatchTask(data)
    setIsImportModalVisible(false)
    message.success(`成功创建批量任务，包含 ${data.length} 个对话项目`)
    
    // 切换到批量处理标签页
    setActiveTab('batch')
  }

  /**
   * 处理模板应用
   */
  const handleTemplateApply = (template: Template) => {
    // 应用模板参数到当前配置
    setBatchConfig(prev => ({
      ...prev,
      ...template.parameters
    }))
    setIsTemplateModalVisible(false)
    message.success(`已应用模板: ${template.name}`)
  }

  /**
   * 更新批量任务
   */
  const handleTaskUpdate = (updatedTask: BatchTask) => {
    setBatchTasks(prev => 
      prev.map(task => task.id === updatedTask.id ? updatedTask : task)
    )
  }

  /**
   * 任务完成处理
   */
  const handleTaskComplete = (task: BatchTask) => {
    message.success(`批量任务 "${task.name}" 已完成`)
  }

  /**
   * 任务失败处理
   */
  const handleTaskFailed = (task: BatchTask, error: string) => {
    message.error(`批量任务 "${task.name}" 失败: ${error}`)
  }

  /**
   * 所有任务完成处理
   */
  const handleAllTasksComplete = (tasks: BatchTask[]) => {
    const completedCount = tasks.filter(t => t.status === BatchTaskStatus.COMPLETED).length
    message.success(`所有批量任务已完成，成功完成 ${completedCount} 个任务`)
  }

  // 组件挂载时加载AI请求源
  useEffect(() => {
    loadDefaultAISource()
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        tabBarExtraContent={(
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => setIsImportModalVisible(true)}
              size="small"
            >
              导入Excel
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setIsTemplateModalVisible(true)}
              size="small"
            >
              模板管理
            </Button>
          </Space>
        )}
        items={[
          {
            key: 'single',
            label: (
              <span>
                <UserOutlined />
                单个对话
              </span>
            ),
            children: (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* 聊天消息区域 */}
                <div 
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '16px 0',
                    marginBottom: 16,
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    backgroundColor: '#fafafa'
                  }}
                >
                  {messages.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '60px 20px',
                      color: '#999'
                    }}>
                      <Text type="secondary">开始对话吧！我是您的AI助手。</Text>
                    </div>
                  ) : (
                    <div style={{ padding: '0 16px' }}>
                      {messages.map((message) => (
                        <div key={message.id} style={{ marginBottom: 16 }}>
                          <Card 
                            size="small"
                            style={{
                              marginLeft: message.type === 'user' ? '20%' : 0,
                              marginRight: message.type === 'assistant' ? '20%' : 0,
                              backgroundColor: message.type === 'user' ? '#e6f7ff' : '#f6ffed'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <Avatar 
                                size="small" 
                                icon={message.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                style={{
                                  backgroundColor: message.type === 'user' ? '#1890ff' : '#52c41a'
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: 12, 
                                  color: '#999', 
                                  marginBottom: 4 
                                }}>
                                  {message.type === 'user' ? '您' : (currentAISource?.name || 'AI助手')}
                                  <span style={{ marginLeft: 8 }}>
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <Paragraph 
                                  style={{ 
                                    margin: 0, 
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {message.content}
                                  {message.isStreaming && (
                                    <span style={{ 
                                      display: 'inline-block',
                                      width: 8,
                                      height: 16,
                                      backgroundColor: '#1890ff',
                                      marginLeft: 2,
                                      animation: 'blink 1s infinite'
                                    }} />
                                  )}
                                </Paragraph>
                              </div>
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                <div>
                  <Space.Compact style={{ width: '100%' }}>
                    <TextArea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="输入您的问题..."
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      disabled={isLoading}
                      style={{ resize: 'none' }}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSendMessage}
                      loading={isLoading}
                      disabled={!inputValue.trim()}
                      style={{ height: 'auto' }}
                    >
                      发送
                    </Button>
                  </Space.Compact>
                  
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button 
                      type="text" 
                      size="small" 
                      onClick={handleClearChat}
                      disabled={messages.length === 0}
                    >
                      清空对话
                    </Button>
                    {currentAISource && (
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
                        当前模型：{currentAISource.name}
                      </Text>
                    )}
                  </div>
                </div>
              </div>
            )
          },
          {
            key: 'batch',
            label: (
              <span>
                <BulbOutlined />
                批量处理
              </span>
            ),
            children: (
              <BatchProcessor
                 tasks={batchTasks}
                 config={batchConfig}
                 onTaskUpdate={handleTaskUpdate}
                 onTaskComplete={handleTaskComplete}
                 onTaskFailed={handleTaskFailed}
                 onAllTasksComplete={handleAllTasksComplete}
                 processFunction={processBatchChatItem}
               />
            )
          }
        ]}
      />
      
      {/* Excel导入弹窗 */}
      <Modal
        title="导入Excel批量对话数据"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
        width={800}
      >
        <ExcelImporter
           onImportComplete={handleImportComplete}
           onImportError={(error) => message.error(`导入失败: ${error}`)}
         />
      </Modal>
      
      {/* 模板管理弹窗 */}
      <Modal
        title="模板管理"
        open={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <TemplateManager
           onTemplateSelect={handleTemplateApply}
           onTemplateApply={handleTemplateApply}
           currentTaskType={BatchTaskType.CHAT}
         />
      </Modal>

      {/* CSS动画 */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default ChatTab