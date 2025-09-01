import { useState, useEffect } from "react"
import { Input, Button, Space, Typography, Card, Row, Col, Progress, message, Select, Upload, InputNumber, Tabs, Modal } from "antd"
import { VideoCameraOutlined, DeleteOutlined, DownloadOutlined, ReloadOutlined, UploadOutlined, PlayCircleOutlined, BulbOutlined, FileExcelOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons"
import { Storage } from "@plasmohq/storage"
import type { UploadFile } from "antd/es/upload/interface"
import BatchProcessor, { BatchTaskType, BatchTaskStatus } from '../BatchProcessor'
import type { BatchTask } from '../BatchProcessor'
import ExcelImporter from '../ExcelImporter'
import TemplateManager from '../TemplateManager'
import type { Template } from '../TemplateManager'
import { apiService } from "../../services/apiService"
import type { AISource } from "../../services/apiService"

const { Text, Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 存储实例
const storage = new Storage()

// 生成的视频类型
interface GeneratedVideo {
  id: string
  url: string
  thumbnailUrl: string
  prompt: string
  sourceImageUrl?: string
  timestamp: number
  status: 'generating' | 'completed' | 'failed'
  progress?: number
  duration?: number
}

// AISource类型已从apiService导入

/**
 * 图生视频标签页组件 - 支持多视频生成和展示
 */
function Image2VideoTab() {
  const [prompt, setPrompt] = useState("")
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentAISource, setCurrentAISource] = useState<AISource | null>(null)
  const [videoCount, setVideoCount] = useState(1)
  const [videoDuration, setVideoDuration] = useState(5)
  const [videoStyle, setVideoStyle] = useState("realistic")
  const [sourceImage, setSourceImage] = useState<UploadFile | null>(null)
  const [sourceImageUrl, setSourceImageUrl] = useState<string>("")

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
   * 模拟视频生成API调用
   */
  const simulateVideoGeneration = async (prompt: string, imageUrl: string, count: number): Promise<GeneratedVideo[]> => {
    // 模拟生成延迟（视频生成通常需要更长时间）
    await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000))
    
    // 返回模拟视频数据
    const videos: GeneratedVideo[] = []
    for (let i = 0; i < count; i++) {
      const randomId = Math.floor(Math.random() * 1000) + 100
      videos.push({
        id: `${Date.now()}_${i}`,
        url: `https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4`, // 示例视频
        thumbnailUrl: `https://picsum.photos/320/240?random=${randomId}`,
        prompt: prompt,
        sourceImageUrl: imageUrl,
        timestamp: Date.now(),
        status: 'completed',
        duration: videoDuration
      })
    }
    
    return videos
  }

  /**
   * 处理图片上传
   */
  const handleImageUpload = (file: UploadFile) => {
    setSourceImage(file)
    
    // 创建预览URL
    if (file.originFileObj) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSourceImageUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file.originFileObj)
    }
    
    return false // 阻止自动上传
  }

  /**
   * 生成视频
   */
  const handleGenerateVideos = async () => {
    if (!prompt.trim()) {
      message.warning("请输入视频描述")
      return
    }

    if (!sourceImageUrl) {
      message.warning("请上传源图片")
      return
    }

    if (!currentAISource) {
      message.error("请先配置AI请求源")
      return
    }

    setIsGenerating(true)

    // 创建生成中的视频占位符
    const newVideos: GeneratedVideo[] = []
    for (let i = 0; i < videoCount; i++) {
      newVideos.push({
        id: `${Date.now()}_${i}`,
        url: "",
        thumbnailUrl: sourceImageUrl,
        prompt: prompt.trim(),
        sourceImageUrl: sourceImageUrl,
        timestamp: Date.now(),
        status: 'generating',
        progress: 0,
        duration: videoDuration
      })
    }

    setVideos(prev => [...newVideos, ...prev])

    try {
      // 模拟进度更新（视频生成进度较慢）
      const progressInterval = setInterval(() => {
        setVideos(prev => 
          prev.map(video => {
            if (newVideos.some(newVideo => newVideo.id === video.id) && video.status === 'generating') {
              const newProgress = Math.min((video.progress || 0) + Math.random() * 5, 90)
              return { ...video, progress: newProgress }
            }
            return video
          })
        )
      }, 1000)

      // 调用生成API
      const generatedVideos = await simulateVideoGeneration(prompt.trim(), sourceImageUrl, videoCount)
      
      clearInterval(progressInterval)

      // 更新视频状态
      setVideos(prev => 
        prev.map(video => {
          const index = newVideos.findIndex(newVideo => newVideo.id === video.id)
          if (index !== -1 && index < generatedVideos.length) {
            return {
              ...video,
              ...generatedVideos[index],
              progress: 100
            }
          }
          return video
        })
      )

      message.success(`成功生成 ${generatedVideos.length} 个视频`)
    } catch (error) {
      console.error("生成视频失败:", error)
      message.error("生成视频失败，请重试")
      
      // 标记失败的视频
      setVideos(prev => 
        prev.map(video => {
          if (newVideos.some(newVideo => newVideo.id === video.id)) {
            return { ...video, status: 'failed' as const }
          }
          return video
        })
      )
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * 删除视频
   */
  const handleDeleteVideo = (videoId: string) => {
    setVideos(prev => prev.filter(video => video.id !== videoId))
  }

  /**
   * 下载视频
   */
  const handleDownloadVideo = async (videoUrl: string, prompt: string) => {
    try {
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `generated_video_${Date.now()}.mp4`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success("视频下载开始")
    } catch (error) {
      console.error("下载视频失败:", error)
      message.error("下载视频失败")
    }
  }

  /**
   * 重新生成视频
   */
  const handleRegenerateVideo = (videoPrompt: string, imageUrl?: string) => {
    setPrompt(videoPrompt)
    if (imageUrl) {
      setSourceImageUrl(imageUrl)
    }
  }

  /**
   * 清空所有视频
   */
  const handleClearVideos = () => {
    setVideos([])
  }

  /**
   * 播放视频
   */
  const handlePlayVideo = (videoUrl: string) => {
    window.open(videoUrl, '_blank')
  }

  /**
   * 创建批量视频生成任务
   */
  const createBatchTask = (data: any[], template?: Template) => {
    const tasks: BatchTask[] = data.map((item, index) => ({
      id: `video_task_${Date.now()}_${index}`,
      name: `视频生成任务 ${index + 1}`,
      type: BatchTaskType.IMAGE_TO_VIDEO,
      status: BatchTaskStatus.PENDING,
      data: [{
        prompt: item.prompt || item.description || '',
        imageUrl: item.imageUrl || item.image || '',
        duration: videoDuration,
        style: videoStyle,
        count: 1
      }],
      progress: 0,
      totalItems: 1,
      completedItems: 0,
      failedItems: 0,
      results: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    
    setBatchTasks(prev => [...prev, ...tasks])
    message.success(`已创建 ${tasks.length} 个批量视频生成任务`)
  }

  /**
   * 处理单个批量视频生成项
   */
  const processBatchVideoItem = async (taskType: BatchTaskType, item: any, taskId: string): Promise<any> => {
    try {
      const { prompt, imageUrl, duration, style, count } = item
      
      if (!prompt || !imageUrl) {
        throw new Error('缺少必要的视频生成参数')
      }

      // 模拟视频生成过程
      const videos = await simulateVideoGeneration(prompt, imageUrl, count || 1)
      
      return {
        success: true,
        result: {
          videos,
          prompt,
          imageUrl,
          generatedAt: Date.now()
        }
      }
    } catch (error) {
      console.error('批量视频生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '视频生成失败'
      }
    }
  }

  /**
   * 处理Excel导入完成
   */
  const handleImportComplete = (data: any[], config: any) => {
    console.log('导入的数据:', data)
    console.log('导入配置:', config)
    
    createBatchTask(data)
    setIsImportModalVisible(false)
    setActiveTab('batch')
    message.success(`成功导入 ${data.length} 条数据`)
  }

  /**
   * 处理模板应用
   */
  const handleTemplateApply = (template: Template) => {
    console.log('应用模板:', template)
    
    // 应用模板配置到当前设置（如果模板有配置）
    // 这里简化处理，直接使用当前设置
    
    // 如果有批量数据，创建批量任务
    // 这里简化处理，暂时不处理模板数据
    // if (template.data && template.data.length > 0) {
    //   createBatchTask(template.data, template)
    //   setActiveTab('batch')
    // }
    
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
    console.log('任务完成:', task)
    message.success(`任务 ${task.id} 完成`)
  }

  /**
   * 任务失败处理
   */
  const handleTaskFailed = (task: BatchTask, error: string) => {
    console.log('任务失败:', task, error)
    message.error(`任务 ${task.id} 失败: ${error}`)
  }

  /**
   * 所有任务完成处理
   */
  const handleAllTasksComplete = (tasks: BatchTask[]) => {
    console.log('所有任务完成:', tasks)
    message.success(`批量视频生成完成，共处理 ${tasks.length} 个任务`)
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
                <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 源图片上传 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>源图片</Text>
            <Space align="start">
              <Upload
                accept="image/*"
                beforeUpload={handleImageUpload}
                showUploadList={false}
                disabled={isGenerating}
              >
                <Button icon={<UploadOutlined />} disabled={isGenerating}>
                  上传图片
                </Button>
              </Upload>
              {sourceImageUrl && (
                <div style={{ 
                  width: 80, 
                  height: 60, 
                  border: '1px solid #d9d9d9', 
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <img 
                    src={sourceImageUrl} 
                    alt="源图片" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </Space>
          </div>
          
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>视频描述</Text>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述您想要的视频效果，例如：让图片中的人物挥手微笑"
              rows={3}
              disabled={isGenerating}
            />
          </div>
          
          <Row gutter={16}>
            <Col span={6}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>生成数量</Text>
              <InputNumber
                min={1}
                max={3}
                value={videoCount}
                onChange={(value) => setVideoCount(value || 1)}
                disabled={isGenerating}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={6}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>视频时长(秒)</Text>
              <InputNumber
                min={3}
                max={10}
                value={videoDuration}
                onChange={(value) => setVideoDuration(value || 5)}
                disabled={isGenerating}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={12}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>视频风格</Text>
              <Select
                value={videoStyle}
                onChange={setVideoStyle}
                disabled={isGenerating}
                style={{ width: '100%' }}
              >
                <Option value="realistic">写实</Option>
                <Option value="artistic">艺术</Option>
                <Option value="cinematic">电影感</Option>
                <Option value="animated">动画</Option>
              </Select>
            </Col>
          </Row>
          
          <Space>
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={handleGenerateVideos}
              loading={isGenerating}
              disabled={!prompt.trim() || !sourceImageUrl}
            >
              生成视频
            </Button>
            <Button
              onClick={handleClearVideos}
              disabled={videos.length === 0 || isGenerating}
            >
              清空视频
            </Button>
            {currentAISource && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前模型：{currentAISource.name}
              </Text>
            )}
          </Space>
        </Space>
      </Card>

      {/* 视频展示区域 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {videos.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#999',
            border: '2px dashed #d9d9d9',
            borderRadius: 8
          }}>
            <VideoCameraOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <br />
            <Text type="secondary">还没有生成视频，上传图片并输入描述开始创作吧！</Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {videos.map((video) => (
              <Col key={video.id} xs={24} sm={12} md={8}>
                <Card
                  size="small"
                  cover={
                    video.status === 'generating' ? (
                      <div style={{ 
                        height: 180, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5',
                        position: 'relative'
                      }}>
                        <img 
                          src={video.thumbnailUrl} 
                          alt="生成中" 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            opacity: 0.3
                          }}
                        />
                        <div style={{ 
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center'
                        }}>
                          <Progress 
                            type="circle" 
                            percent={Math.round(video.progress || 0)} 
                            size={60}
                          />
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>生成中...</Text>
                          </div>
                        </div>
                      </div>
                    ) : video.status === 'failed' ? (
                      <div style={{ 
                        height: 180, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#fff2f0',
                        color: '#ff4d4f'
                      }}>
                        生成失败
                      </div>
                    ) : (
                      <div style={{ position: 'relative', height: 180 }}>
                        <img
                          src={video.thumbnailUrl}
                          alt={video.prompt}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: 24,
                          color: 'white',
                          textShadow: '0 0 4px rgba(0,0,0,0.5)',
                          cursor: 'pointer'
                        }}>
                          <PlayCircleOutlined 
                            onClick={() => handlePlayVideo(video.url)}
                            title="播放视频"
                          />
                        </div>
                        <div style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11
                        }}>
                          {video.duration}s
                        </div>
                      </div>
                    )
                  }
                  actions={[
                    <Button
                      key="play"
                      type="text"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handlePlayVideo(video.url)}
                      disabled={video.status !== 'completed'}
                      title="播放"
                    />,
                    <Button
                      key="download"
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadVideo(video.url, video.prompt)}
                      disabled={video.status !== 'completed'}
                      title="下载"
                    />,
                    <Button
                      key="regenerate"
                      type="text"
                      icon={<ReloadOutlined />}
                      onClick={() => handleRegenerateVideo(video.prompt, video.sourceImageUrl)}
                      disabled={isGenerating}
                      title="重新生成"
                    />,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteVideo(video.id)}
                      title="删除"
                    />
                  ]}
                >
                  <Card.Meta
                    description={
                      <div>
                        <Text 
                          ellipsis={{ tooltip: video.prompt }} 
                          style={{ fontSize: 12 }}
                        >
                          {video.prompt}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(video.timestamp).toLocaleString()}
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
                  processFunction={processBatchVideoItem}
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
          currentTaskType={BatchTaskType.IMAGE_TO_VIDEO}
        />
      </Modal>
    </div>
  )
}

export default Image2VideoTab