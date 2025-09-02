/**
 * 增强版聊天组件 - 集成 LangChain 功能
 * 支持记忆、RAG、工具调用等高级功能
 */

import {
  SendOutlined,
  DeleteOutlined,
  SaveOutlined,
  HistoryOutlined,
  SettingOutlined,
  ExperimentOutlined,
  ExpandOutlined,
  CompressOutlined,
  ThunderboltOutlined,
  RobotOutlined
} from "@ant-design/icons"
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Space,
  Tabs,
  Typography,
  List,
  Tag,
  Switch,
  Select,
  InputNumber,
  Divider,
  Badge,
  Tooltip,
  Popover,
  Progress
} from "antd"
import { useState, useEffect, useRef } from "react"

import { useAISources, useUI } from "../../src/hooks"
import { langChainService } from "../../src/services/langChainService"
import { apiService } from "../../services/apiService"

const { Text, Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 聊天消息接口
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  metadata?: {
    tools?: string[]
    thinking?: string
  }
}

/**
 * 增强版聊天组件
 */
function EnhancedChatTab() {
  const { currentSource } = useAISources()
  const { platform } = useUI()
  
  // 基础状态
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>("")
  
  // LangChain 功能状态
  const [langChainEnabled, setLangChainEnabled] = useState(true)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [showThinking, setShowThinking] = useState(false)
  const [thinkingContent, setThinkingContent] = useState("")
  
  // 对话历史
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  
  // 设置
  const [showSettings, setShowSettings] = useState(false)
  const [langChainConfig, setLangChainConfig] = useState<any>({})
  
  // 工具调用状态
  const [availableTools] = useState([
    { name: 'web_search', description: '网络搜索' },
    { name: 'calculator', description: '计算器' },
    { name: 'image_analyzer', description: '图片分析' },
    { name: 'code_executor', description: '代码执行' }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 初始化
  useEffect(() => {
    langChainService.initialize().then(() => {
      setLangChainConfig(langChainService.getConfig())
    })
    loadConversations()
  }, [])
  
  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // 加载对话历史
  const loadConversations = () => {
    const allConvs = langChainService.getAllConversations()
    setConversations(allConvs.sort((a, b) => {
      const aTime = a.messages[a.messages.length - 1]?.timestamp || 0
      const bTime = b.messages[b.messages.length - 1]?.timestamp || 0
      return bTime - aTime
    }))
  }
  
  // 发送消息
  const handleSend = async () => {
    if (!inputMessage.trim() || !currentSource) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)
    
    try {
      if (langChainEnabled) {
        // 使用 LangChain 服务
        const { response, conversationId: newConversationId } = await langChainService.chatWithMemory(
          inputMessage,
          conversationId,
          currentSource
        )
        
        setConversationId(newConversationId)
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
          metadata: {
            tools: memoryEnabled ? ['memory'] : [],
            thinking: showThinking ? '使用了对话记忆和上下文理解' : undefined
          }
        }
        
        setMessages(prev => [...prev, assistantMessage])
        loadConversations()
      } else {
        // 使用普通 API
        const response = await apiService.sendChatRequest(
          [{
            id: userMessage.id,
            role: 'user',
            content: inputMessage,
            timestamp: userMessage.timestamp
          }],
          currentSource
        )
        
        if (response.success) {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data!,
            timestamp: Date.now()
          }
          
          setMessages(prev => [...prev, assistantMessage])
        } else {
          message.error(response.error || '发送失败')
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      message.error('发送失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 新建对话
  const handleNewChat = () => {
    setMessages([])
    setConversationId("")
  }
  
  // 加载对话
  const handleLoadConversation = (convId: string) => {
    const history = langChainService.getConversationHistory(convId)
    if (history) {
      const formattedMessages: ChatMessage[] = history.messages.map(msg => ({
        id: `${msg.timestamp}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
      
      setMessages(formattedMessages)
      setConversationId(convId)
      setShowHistory(false)
    }
  }
  
  // 删除对话
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await langChainService.deleteConversation(convId)
    loadConversations()
    
    if (convId === conversationId) {
      handleNewChat()
    }
  }
  
  // 保存配置
  const handleSaveConfig = async () => {
    await langChainService.updateConfig(langChainConfig)
    message.success('配置已保存')
    setShowSettings(false)
  }
  
  // 优化提示词
  const handleOptimizePrompt = async () => {
    if (!inputMessage.trim()) return
    
    setIsLoading(true)
    try {
      const optimized = await langChainService.optimizeImagePrompt(inputMessage)
      setInputMessage(optimized)
      message.success('提示词已优化')
    } catch (error) {
      message.error('优化失败')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 工具栏 */}
      <Card size="small" className="mb-4">
        <div className="flex justify-between items-center">
          <Space>
            <Button
              icon={<SaveOutlined />}
              onClick={handleNewChat}
              size="small"
            >
              新建对话
            </Button>
            
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(true)}
              size="small"
            >
              对话历史
            </Button>
            
            <Tooltip title="开启后使用 LangChain 增强功能">
              <Badge dot={langChainEnabled}>
                <Button
                  type={langChainEnabled ? "primary" : "default"}
                  icon={<RobotOutlined />}
                  onClick={() => setLangChainEnabled(!langChainEnabled)}
                  size="small"
                >
                  LangChain
                </Button>
              </Badge>
            </Tooltip>
            
            {langChainEnabled && (
              <>
                <Tooltip title="对话记忆">
                  <Switch
                    checked={memoryEnabled}
                    onChange={setMemoryEnabled}
                    size="small"
                    checkedChildren="记忆"
                    unCheckedChildren="无记忆"
                  />
                </Tooltip>
                
                <Tooltip title="显示思考过程">
                  <Switch
                    checked={showThinking}
                    onChange={setShowThinking}
                    size="small"
                    checkedChildren="思考"
                    unCheckedChildren="隐藏"
                  />
                </Tooltip>
              </>
            )}
            
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleOptimizePrompt}
              disabled={!inputMessage.trim() || isLoading}
              size="small"
            >
              优化提示词
            </Button>
          </Space>
          
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(true)}
              size="small"
            >
              设置
            </Button>
            
            {currentSource && (
              <Text type="secondary" className="text-xs">
                当前引擎: {currentSource.name}
              </Text>
            )}
          </Space>
        </div>
      </Card>
      
      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Space direction="vertical" align="center">
                <ExperimentOutlined className="text-4xl text-gray-400" />
                <Text type="secondary">
                  {langChainEnabled ? '开始智能对话（支持记忆和上下文）' : '开始对话'}
                </Text>
              </Space>
            </div>
          ) : (
            <Space direction="vertical" size="middle" className="w-full">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* 思考过程 */}
                    {message.metadata?.thinking && showThinking && (
                      <div className="mt-2 p-2 bg-gray-200 bg-opacity-50 rounded text-xs">
                        <Text strong>思考过程:</Text> {message.metadata.thinking}
                      </div>
                    )}
                    
                    {/* 工具标签 */}
                    {message.metadata?.tools && message.metadata.tools.length > 0 && (
                      <div className="mt-2">
                        <Space size="small">
                          {message.metadata.tools.map(tool => (
                            <Tag key={tool} size="small" color="blue">
                              {tool}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                    
                    <div className="mt-1 opacity-70 text-xs">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </Space>
          )}
          
          {/* 加载状态 */}
          {isLoading && (
            <div className="flex justify-center py-4">
              <Progress type="circle" percent={0} size={40} />
            </div>
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="border-t p-4">
          <Space.Compact className="w-full">
            <TextArea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                langChainEnabled
                  ? "输入消息...（支持记忆和上下文）"
                  : "输入消息..."
              }
              autoSize={{ minRows: 2, maxRows: 6 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isLoading}
              disabled={!inputMessage.trim() || !currentSource}
            >
              发送
            </Button>
          </Space.Compact>
        </div>
      </div>
      
      {/* 对话历史弹窗 */}
      <Modal
        title="对话历史"
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={conversations}
          renderItem={item => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => handleDeleteConversation(item.id, e)}
                />
              ]}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleLoadConversation(item.id)}
            >
              <List.Item.Meta
                title={
                  <Text ellipsis={{ tooltip: item.metadata?.title || '未命名对话' }}>
                    {item.metadata?.title || '未命名对话'}
                  </Text>
                }
                description={
                  <Space direction="vertical" size="small" className="w-full">
                    <Text type="secondary" className="text-xs">
                      {item.messages.length} 条消息
                    </Text>
                    <Text type="secondary" className="text-xs">
                      {new Date(item.messages[item.messages.length - 1]?.timestamp).toLocaleString()}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
      
      {/* 设置弹窗 */}
      <Modal
        title="LangChain 设置"
        open={showSettings}
        onOk={handleSaveConfig}
        onCancel={() => setShowSettings(false)}
        width={500}
      >
        <Space direction="vertical" size="middle" className="w-full">
          <div>
            <Text strong>系统提示词</Text>
            <TextArea
              value={langChainConfig.customPrompts?.systemPrompt || ''}
              onChange={(e) => setLangChainConfig(prev => ({
                ...prev,
                customPrompts: {
                  ...prev.customPrompts,
                  systemPrompt: e.target.value
                }
              }))}
              rows={4}
              className="mt-2"
            />
          </div>
          
          <div>
            <Text strong>记忆设置</Text>
            <div className="mt-2">
              <Space>
                <span>最大记忆 Token 数:</span>
                <InputNumber
                  value={langChainConfig.maxMemoryTokens || 4000}
                  onChange={(value) => setLangChainConfig(prev => ({
                    ...prev,
                    maxMemoryTokens: value
                  }))}
                  min={1000}
                  max={16000}
                  step={1000}
                />
              </Space>
            </div>
          </div>
          
          <Divider />
          
          <div>
            <Text strong>高级功能</Text>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span>启用 RAG（检索增强生成）</span>
                <Switch
                  checked={langChainConfig.enableRAG || false}
                  onChange={(checked) => setLangChainConfig(prev => ({
                    ...prev,
                    enableRAG: checked
                  }))}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span>启用工具调用</span>
                <Switch
                  checked={langChainConfig.enableTools || false}
                  onChange={(checked) => setLangChainConfig(prev => ({
                    ...prev,
                    enableTools: checked
                  }))}
                />
              </div>
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default EnhancedChatTab