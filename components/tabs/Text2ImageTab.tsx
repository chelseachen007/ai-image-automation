import { useState, useEffect } from "react"
import { Input, Button, Space, Typography, Card, Image, Row, Col, Progress, message, Select, InputNumber, Tabs, Modal } from "antd"
import { PictureOutlined, DeleteOutlined, DownloadOutlined, ReloadOutlined, BulbOutlined, FileExcelOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons"
import { Storage } from "@plasmohq/storage"
import BatchProcessor, { BatchTaskType, BatchTaskStatus } from '../BatchProcessor'
import type { BatchTask } from '../BatchProcessor'
import ExcelImporter from '../ExcelImporter'
import TemplateManager from '../TemplateManager'
import type { Template } from '../TemplateManager'

const { Text, Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 存储实例
const storage = new Storage()

// 生成的图片类型
interface GeneratedImage {
  id: string
  url: string
  prompt: string
  timestamp: number
  status: 'generating' | 'completed' | 'failed'
  progress?: number
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
 * 文生图标签页组件 - 支持多图片生成、展示和批量处理
 */
function Text2ImageTab() {
  const [prompt, setPrompt] = useState("")
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentAISource, setCurrentAISource] = useState<AISource | null>(null)
  const [imageCount, setImageCount] = useState(1)
  const [imageSize, setImageSize] = useState("1024x1024")
  const [imageStyle, setImageStyle] = useState("natural")
  
  // 批量处理相关状态
  const [activeTab, setActiveTab] = useState('single')
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([])
  const [isImportModalVisible, setIsImportModalVisible] = useState(false)
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false)
  const [batchConfig, setBatchConfig] = useState({
    maxConcurrent: 2,
    retryCount: 2,
    retryDelay: 1000,
    autoStart: false
  })

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
   * 模拟图片生成API调用
   */
  const simulateImageGeneration = async (prompt: string, count: number): Promise<string[]> => {
    // 模拟生成延迟
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    // 返回模拟图片URL（使用Picsum作为占位图）
    const imageUrls: string[] = []
    for (let i = 0; i < count; i++) {
      const randomId = Math.floor(Math.random() * 1000) + 100
      imageUrls.push(`https://picsum.photos/512/512?random=${randomId}`)
    }
    
    return imageUrls
  }

  /**
   * 生成图片
   */
  const handleGenerateImages = async () => {
    if (!prompt.trim()) {
      message.warning("请输入图片描述")
      return
    }

    if (!currentAISource) {
      message.error("请先配置AI请求源")
      return
    }

    setIsGenerating(true)

    // 创建生成中的图片占位符
    const newImages: GeneratedImage[] = []
    for (let i = 0; i < imageCount; i++) {
      newImages.push({
        id: `${Date.now()}_${i}`,
        url: "",
        prompt: prompt.trim(),
        timestamp: Date.now(),
        status: 'generating',
        progress: 0
      })
    }

    setImages(prev => [...newImages, ...prev])

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setImages(prev => 
          prev.map(img => {
            if (newImages.some(newImg => newImg.id === img.id) && img.status === 'generating') {
              const newProgress = Math.min((img.progress || 0) + Math.random() * 20, 90)
              return { ...img, progress: newProgress }
            }
            return img
          })
        )
      }, 500)

      // 调用生成API
      const imageUrls = await simulateImageGeneration(prompt.trim(), imageCount)
      
      clearInterval(progressInterval)

      // 更新图片状态
      setImages(prev => 
        prev.map(img => {
          const index = newImages.findIndex(newImg => newImg.id === img.id)
          if (index !== -1 && index < imageUrls.length) {
            return {
              ...img,
              url: imageUrls[index],
              status: 'completed' as const,
              progress: 100
            }
          }
          return img
        })
      )

      message.success(`成功生成 ${imageUrls.length} 张图片`)
    } catch (error) {
      console.error("生成图片失败:", error)
      message.error("生成图片失败，请重试")
      
      // 标记失败的图片
      setImages(prev => 
        prev.map(img => {
          if (newImages.some(newImg => newImg.id === img.id)) {
            return { ...img, status: 'failed' as const }
          }
          return img
        })
      )
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * 删除图片
   */
  const handleDeleteImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
  }

  /**
   * 下载图片
   */
  const handleDownloadImage = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `generated_image_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success("图片下载成功")
    } catch (error) {
      console.error("下载图片失败:", error)
      message.error("下载图片失败")
    }
  }

  /**
   * 重新生成图片
   */
  const handleRegenerateImage = (imagePrompt: string) => {
    setPrompt(imagePrompt)
    // 可以直接触发生成
  }

  /**
   * 清空图片
   */
  const handleClearImages = () => {
    setImages([])
  }

  /**
   * 创建批量图片生成任务
   */
  const createBatchTask = (data: any[], template?: Template) => {
    const task: BatchTask = {
      id: `batch_image_${Date.now()}`,
      type: BatchTaskType.TEXT_TO_IMAGE,
      name: `批量图片生成任务 - ${new Date().toLocaleString()}`,
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
   * 处理批量图片生成任务
   */
  const processBatchImageItem = async (taskType: BatchTaskType, item: any, taskId: string): Promise<any> => {
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
      
      const imageUrls = await simulateImageGeneration(item.prompt, item.count || 1)
      
      return {
        prompt: item.prompt,
        imageUrls,
        size: item.size || '1024x1024',
        style: item.style || 'natural',
        count: item.count || 1,
        timestamp: new Date().toISOString(),
        success: true
      }
    } catch (error) {
      return {
        prompt: item.prompt,
        error: error instanceof Error ? error.message : '生成失败',
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
    message.success(`成功创建批量任务，包含 ${data.length} 个图片生成项目`)
    
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
    
    // 如果是单个生成模式，也应用到单个生成参数
    if (activeTab === 'single') {
      setImageSize(template.parameters.size || imageSize)
      setImageStyle(template.parameters.style || imageStyle)
      setImageCount(template.parameters.count || imageCount)
    }
    
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
                单个生成
              </span>
            ),
            children: (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* 生成参数设置 */}
                <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>图片描述</Text>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述您想要生成的图片，例如：一只可爱的小猫坐在花园里"
              rows={3}
              disabled={isGenerating}
            />
          </div>
          
          <Row gutter={16}>
            <Col span={8}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>生成数量</Text>
              <InputNumber
                min={1}
                max={4}
                value={imageCount}
                onChange={(value) => setImageCount(value || 1)}
                disabled={isGenerating}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={8}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>图片尺寸</Text>
              <Select
                value={imageSize}
                onChange={setImageSize}
                disabled={isGenerating}
                style={{ width: '100%' }}
              >
                <Option value="512x512">512×512</Option>
                <Option value="1024x1024">1024×1024</Option>
                <Option value="1024x1792">1024×1792 (竖版)</Option>
                <Option value="1792x1024">1792×1024 (横版)</Option>
              </Select>
            </Col>
            <Col span={8}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>图片风格</Text>
              <Select
                value={imageStyle}
                onChange={setImageStyle}
                disabled={isGenerating}
                style={{ width: '100%' }}
              >
                <Option value="natural">自然</Option>
                <Option value="vivid">生动</Option>
                <Option value="artistic">艺术</Option>
                <Option value="realistic">写实</Option>
              </Select>
            </Col>
          </Row>
          
          <Space>
            <Button
              type="primary"
              icon={<PictureOutlined />}
              onClick={handleGenerateImages}
              loading={isGenerating}
              disabled={!prompt.trim()}
            >
              生成图片
            </Button>
            <Button
              onClick={handleClearImages}
              disabled={images.length === 0 || isGenerating}
            >
              清空图片
            </Button>
            {currentAISource && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前模型：{currentAISource.name}
              </Text>
            )}
          </Space>
        </Space>
      </Card>

      {/* 图片展示区域 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {images.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#999',
            border: '2px dashed #d9d9d9',
            borderRadius: 8
          }}>
            <PictureOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <br />
            <Text type="secondary">还没有生成图片，输入描述开始创作吧！</Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {images.map((image) => (
              <Col key={image.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  size="small"
                  cover={
                    image.status === 'generating' ? (
                      <div style={{ 
                        height: 200, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <Progress 
                            type="circle" 
                            percent={Math.round(image.progress || 0)} 
                            size={80}
                          />
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary">生成中...</Text>
                          </div>
                        </div>
                      </div>
                    ) : image.status === 'failed' ? (
                      <div style={{ 
                        height: 200, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#fff2f0',
                        color: '#ff4d4f'
                      }}>
                        生成失败
                      </div>
                    ) : (
                      <Image
                        src={image.url}
                        alt={image.prompt}
                        style={{ height: 200, objectFit: 'cover' }}
                        preview={{
                          mask: '预览'
                        }}
                      />
                    )
                  }
                  actions={[
                    <Button
                      key="download"
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadImage(image.url, image.prompt)}
                      disabled={image.status !== 'completed'}
                      title="下载"
                    />,
                    <Button
                      key="regenerate"
                      type="text"
                      icon={<ReloadOutlined />}
                      onClick={() => handleRegenerateImage(image.prompt)}
                      disabled={isGenerating}
                      title="重新生成"
                    />,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteImage(image.id)}
                      title="删除"
                    />
                  ]}
                >
                  <Card.Meta
                    description={
                      <div>
                        <Text 
                          ellipsis={{ tooltip: image.prompt }} 
                          style={{ fontSize: 12 }}
                        >
                          {image.prompt}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(image.timestamp).toLocaleString()}
                        </Text>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
              </div>
            )
          },
          {
            key: 'batch',
            label: (
              <span>
                <BulbOutlined />
                批量生成
              </span>
            ),
            children: (
              <div style={{ height: '100%' }}>
                <BatchProcessor
                  tasks={batchTasks}
                  processFunction={processBatchImageItem}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskComplete={handleTaskComplete}
                  onTaskFailed={handleTaskFailed}
                  onAllTasksComplete={handleAllTasksComplete}
                  config={batchConfig}
                />
              </div>
            )
          }
        ]}
      />

      {/* Excel导入模态框 */}
      <Modal
        title="导入Excel数据"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
        width={800}
      >
        <ExcelImporter
          onImportComplete={handleImportComplete}
          onImportError={(error) => {
            message.error(`导入失败: ${error}`);
            setIsImportModalVisible(false);
          }}
        />
      </Modal>

      {/* 模板管理模态框 */}
      <Modal
        title="模板管理"
        open={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <TemplateManager
          onTemplateSelect={(template) => {
            console.log('选择模板:', template);
          }}
          onTemplateApply={handleTemplateApply}
          currentTaskType={BatchTaskType.TEXT_TO_IMAGE}
        />
      </Modal>
    </div>
  )
}

export default Text2ImageTab