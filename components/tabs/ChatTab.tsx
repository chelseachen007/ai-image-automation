import { useState, useRef, useEffect } from "react"
import { 
  Input, 
  Button, 
  Space, 
  Typography, 
  Card, 
  Avatar, 
  Spin, 
  Select, 
  Tag, 
  Switch, 
  Slider,
  message,
  Tooltip
} from "antd"
import { 
  SendOutlined, 
  UserOutlined, 
  RobotOutlined, 
  PictureOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  ClearOutlined,
  SaveOutlined,
  CopyOutlined,
  LikeFilled,
  DislikeFilled
} from "@ant-design/icons"
import { useChat, useAISources, useUI } from "../../src/hooks"
import { modelManager, DEFAULT_MODELS } from "../../src/config/models"
import { cacheManager } from "../../src/utils/cache"

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

// 消息类型
interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
  attachments?: {
    type: 'image' | 'audio' | 'video'
    url: string
    name: string
  }[]
  model?: string
  feedback?: 'good' | 'bad'
}

/**
 * 聊天标签页组件 - 支持最新AI模型和功能
 */
function ChatTab() {
  const { messages, isStreaming, sendMessage, clearMessages } = useChat()
  const { aiSources, currentSource, addAISource } = useAISources()
  const { platform } = useUI()
  const [inputValue, setInputValue] = useState("")
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS.CHAT)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2000)
  const [enableWebSearch, setEnableWebSearch] = useState(false)
  const [enableCodeInterpreter, setEnableCodeInterpreter] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 获取可用的聊天模型
  const chatModels = modelManager.getModelsByCapability('supportsStreaming', true)

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 处理发送消息
  const handleSend = async () => {
    if (!inputValue.trim() && attachments.length === 0) return
    
    if (!currentSource) {
      message.warning("请先在设置中配置AI源")
      return
    }

    const messageContent = {
      text: inputValue.trim(),
      attachments,
      settings: {
        model: selectedModel,
        temperature,
        maxTokens,
        enableWebSearch,
        enableCodeInterpreter
      }
    }

    setInputValue("")
    setAttachments([])
    await sendMessage(JSON.stringify(messageContent))
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 处理文件上传
  const handleFileUpload = (file: File, type: 'image' | 'audio' | 'video') => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setAttachments(prev => [...prev, {
        type,
        url: e.target?.result as string,
        name: file.name
      }])
    }
    reader.readAsDataURL(file)
  }

  // 移除附件
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // 复制消息
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    message.success("已复制到剪贴板")
  }

  // 反馈消息质量
  const handleFeedback = (messageId: string, feedback: 'good' | 'bad') => {
    // TODO: 发送反馈到服务器
    console.log(`Message ${messageId} feedback: ${feedback}`)
  }

  // 导出聊天记录
  const exportChat = () => {
    const chatData = {
      messages,
      exportTime: new Date().toISOString(),
      model: selectedModel
    }
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    message.success("聊天记录已导出")
  }

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 模型选择和设置 */}
      <Card size="small" className="mb-4">
        <Space wrap>
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            style={{ width: 200 }}
            placeholder="选择模型"
          >
            {chatModels.map(model => (
              <Option key={model.id} value={model.id}>
                <Space>
                  <span>{model.name}</span>
                  <Tag size="small">{model.platform}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
          
          <Tooltip title="创造性：值越高越随机">
            <span className="text-sm">温度: {temperature}</span>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={setTemperature}
              style={{ width: 100 }}
            />
          </Tooltip>
          
          <Tooltip title="启用网络搜索">
            <Switch
              checked={enableWebSearch}
              onChange={setEnableWebSearch}
              checkedChildren="搜索"
              unCheckedChildren="搜索"
            />
          </Tooltip>
          
          <Tooltip title="启用代码解释器">
            <Switch
              checked={enableCodeInterpreter}
              onChange={setEnableCodeInterpreter}
              checkedChildren="代码"
              unCheckedChildren="代码"
            />
          </Tooltip>
          
          <Button 
            icon={<SaveOutlined />} 
            onClick={exportChat}
            size="small"
          >
            导出
          </Button>
        </Space>
      </Card>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Space direction="vertical" align="center">
              <Text type="secondary" className="text-lg">
                {currentSource ? '开始聊天吧！' : '请先在设置中配置AI源'}
              </Text>
              {currentSource && (
                <Text type="secondary">
                  支持 GPT-5、Claude 4、Gemini 2.0 等最新模型
                </Text>
              )}
            </Space>
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
                    : 'bg-white'
                }`}
                bodyStyle={{ padding: '12px 16px' }}
              >
                <div className="flex items-start justify-between mb-2">
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
                </div>
                
                {/* 附件展示 */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {att.type === 'image' && <PictureOutlined />}
                        {att.type === 'audio' && <AudioOutlined />}
                        {att.type === 'video' && <VideoCameraOutlined />}
                        <Text className="text-sm">{att.name}</Text>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 模型信息 */}
                {message.model && (
                  <Tag size="small" className="mt-2">
                    {message.model}
                  </Tag>
                )}
                
                {/* 操作按钮 */}
                {message.type === 'assistant' && !message.isStreaming && (
                  <Space className="mt-2">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyMessage(message.content)}
                    >
                      复制
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<LikeFilled />}
                      className={message.feedback === 'good' ? 'text-blue-500' : ''}
                      onClick={() => handleFeedback(message.id, 'good')}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DislikeFilled />}
                      className={message.feedback === 'bad' ? 'text-red-500' : ''}
                      onClick={() => handleFeedback(message.id, 'bad')}
                    />
                  </Space>
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
        {/* 附件预览 */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, i) => (
              <Tag
                key={i}
                closable
                onClose={() => removeAttachment(i)}
                icon={att.type === 'image' ? <ImageOutlined /> : 
                       att.type === 'audio' ? <AudioOutlined /> : <VideoCameraOutlined />}
              >
                {att.name}
              </Tag>
            ))}
          </div>
        )}
        
        <Space.Compact className="w-full">
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              currentSource 
                ? "输入消息... (支持图片、音频、视频)" 
                : "请先配置AI源"
            }
            disabled={!currentSource || isStreaming}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="flex-1"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={(!inputValue.trim() && attachments.length === 0) || !currentSource || isStreaming}
            loading={isStreaming}
          >
            发送
          </Button>
          <Button onClick={clearMessages} disabled={messages.length === 0}>
            清空
          </Button>
        </Space.Compact>
        
        {/* 快捷操作 */}
        <Space className="mt-2">
          <input
            type="file"
            accept="image/*"
            id="image-upload"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, 'image')
            }}
          />
          <Button
            size="small"
            icon={<ImageOutlined />}
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            图片
          </Button>
          
          <input
            type="file"
            accept="audio/*"
            id="audio-upload"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, 'audio')
            }}
          />
          <Button
            size="small"
            icon={<AudioOutlined />}
            onClick={() => document.getElementById('audio-upload')?.click()}
          >
            音频
          </Button>
          
          <input
            type="file"
            accept="video/*"
            id="video-upload"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, 'video')
            }}
          />
          <Button
            size="small"
            icon={<VideoCameraOutlined />}
            onClick={() => document.getElementById('video-upload')?.click()}
          >
            视频
          </Button>
        </Space>
        
        {currentSource && (
          <Text type="secondary" className="text-xs mt-2 block">
            当前使用: {currentSource.name} | 模型: {selectedModel}
          </Text>
        )}
      </div>
    </div>
  )
}

export default ChatTab