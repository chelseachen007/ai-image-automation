import { useState, useRef, useEffect } from "react"
import { Input, Button, Space, Typography, Card, Avatar, Spin } from "antd"
import { SendOutlined, UserOutlined, RobotOutlined } from "@ant-design/icons"
import { useChat, useAISources, useUI } from "../../src/hooks"

const { Text } = Typography
const { TextArea } = Input

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
  const { messages, isStreaming, sendMessage, clearMessages } = useChat()
  const { currentSource } = useAISources()
  const { platform } = useUI()
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /**
   * 滚动到消息底部
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * 处理发送消息
   */
  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return
    
    const message = inputValue.trim()
    setInputValue("")
    await sendMessage(message)
  }

  /**
   * 处理键盘事件
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * 清空消息
   */
  const handleClear = () => {
    clearMessages()
  }

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Text type="secondary">
              {currentSource ? '开始聊天吧！' : '请先在设置中配置AI源'}
            </Text>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'assistant' && (
                <Avatar icon={<RobotOutlined />} className="flex-shrink-0" />
              )}
              <Card
                className={`max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Text
                  className={`whitespace-pre-wrap ${
                    message.type === 'user' ? 'text-white' : ''
                  }`}
                >
                  {message.content}
                </Text>
                {message.isStreaming && (
                  <Spin size="small" className="ml-2" />
                )}
              </Card>
              {message.type === 'user' && (
                <Avatar icon={<UserOutlined />} className="flex-shrink-0" />
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-white p-4">
        <Space.Compact className="w-full">
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentSource ? "输入消息..." : "请先配置AI源"}
            disabled={!currentSource || isStreaming}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="flex-1"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!inputValue.trim() || !currentSource || isStreaming}
            loading={isStreaming}
          >
            发送
          </Button>
          <Button onClick={handleClear} disabled={messages.length === 0}>
            清空
          </Button>
        </Space.Compact>
        
        {currentSource && (
          <Text type="secondary" className="text-xs mt-2 block">
            当前使用: {currentSource.name}
          </Text>
        )}
      </div>
    </div>
  )
}

export default ChatTab