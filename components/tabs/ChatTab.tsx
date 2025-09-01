import { useState, useRef, useEffect } from "react"
import { Input, Button, Space, Typography, Card, Avatar, Spin, message } from "antd"
import { SendOutlined, UserOutlined, RobotOutlined } from "@ant-design/icons"
import { Storage } from "@plasmohq/storage"
import { apiService } from "../../services/apiService"
import type { AISource } from "../../services/apiService"

const { Text } = Typography
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

/**
 * 聊天标签页组件 - 支持流式API调用和消息展示
 */
function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentAISource, setCurrentAISource] = useState<AISource | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      // 准备消息历史
      const chatMessages = [...messages, userMessage].map(msg => ({
        id: msg.id,
        role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
        timestamp: msg.timestamp
      }))

      // 使用流式API
      const stream = apiService.streamChat(chatMessages, currentAISource)
      let fullResponse = ''

      for await (const chunk of stream) {
        fullResponse += chunk
        // 更新助手消息内容
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: fullResponse }
            : msg
        ))
      }

      // 完成流式响应
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, isStreaming: false }
          : msg
      ))

    } catch (error) {
      console.error('聊天API调用失败:', error)
      message.error('发送消息失败，请检查网络连接和API配置')
      
      // 移除失败的助手消息
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 清空聊天记录
   */
  const handleClearMessages = () => {
    setMessages([])
    message.success('聊天记录已清空')
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
            color: '#999', 
            padding: '40px 20px',
            fontSize: '14px'
          }}>
            开始对话吧！输入您的问题，AI助手将为您提供帮助。
          </div>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%', padding: '0 16px' }}>
            {messages.map((message) => (
              <div key={message.id} style={{ display: 'flex', gap: 12 }}>
                <Avatar 
                  icon={message.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{ 
                    backgroundColor: message.type === 'user' ? '#1890ff' : '#52c41a',
                    flexShrink: 0
                  }}
                />
                <Card 
                  size="small" 
                  style={{ 
                    flex: 1,
                    backgroundColor: message.type === 'user' ? '#e6f7ff' : '#f6ffed'
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {message.content}
                    {message.isStreaming && (
                      <Spin size="small" style={{ marginLeft: 8 }} />
                    )}
                  </div>
                  <Text 
                    type="secondary" 
                    style={{ fontSize: '12px', marginTop: 8, display: 'block' }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Text>
                </Card>
              </div>
            ))}
          </Space>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <Card size="small">
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={isLoading}
            style={{ resize: 'none' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={isLoading}
            disabled={!inputValue.trim() || !currentAISource}
          >
            发送
          </Button>
        </Space.Compact>
        
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {currentAISource ? `当前引擎: ${currentAISource.name}` : '未配置AI引擎'}
          </Text>
          <Button 
            size="small" 
            onClick={handleClearMessages}
            disabled={messages.length === 0}
          >
            清空对话
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default ChatTab