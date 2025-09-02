import {
  BulbOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  UploadOutlined,
  VideoCameraOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  SaveOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  HdOutlined,
  ApiOutlined,
  ThunderboltOutlined
} from "@ant-design/icons"
import {
  Button,
  Card,
  Col,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
  Tag,
  Tooltip,
  Slider,
  Switch,
  Upload,
  Divider,
  Rate
} from "antd"
import type { UploadFile } from "antd/es/upload/interface"
import { useState, useEffect, useRef } from "react"

import { useAISources, useUI, useModelManager } from "../../src/hooks"
import { modelManager, DEFAULT_MODELS } from "../../src/config/models"
import { EngineConfigManager } from "../../src/config/engines"
import { cacheManager } from "../../src/utils/cache"
import { apiService } from "../../services/apiService"
import BatchProcessor from "../BatchProcessor"
import ExcelImporter from "../ExcelImporter"
import TemplateManager from "../TemplateManager"

const { Text, Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 生成的视频类型
interface GeneratedVideo {
  id: string
  url: string
  thumbnailUrl: string
  prompt: string
  sourceImageUrl?: string
  timestamp: number
  status: "generating" | "completed" | "failed"
  progress?: number
  duration?: number
  model?: string
  resolution?: string
  fps?: number
  quality?: string
  motionIntensity?: number
  cameraMovement?: string
  style?: string
  seed?: string
}

// 高级视频参数
interface VideoParams {
  motionIntensity: number
  cameraMovement: string
  fps: number
  quality: string
  seed: string
  negativePrompt: string
  enableUpscale: boolean
  upscaleModel: string
  aspectRatio: string
}

/**
 * 图生视频标签页组件 - 支持最新AI模型和高级功能
 */
function Image2VideoTab() {
  const { currentSource } = useAISources()
  const { platform } = useUI()
  const { getVideoGenerationModels } = useModelManager()
  
  // 基础状态
  const [prompt, setPrompt] = useState("")
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  
  // 模型和生成设置
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS.VIDEO_GENERATION)
  const [videoDuration, setVideoDuration] = useState(5)
  const [videoStyle, setVideoStyle] = useState("cinematic")
  const [videoResolution, setVideoResolution] = useState("1080p")
  const [videoCount, setVideoCount] = useState(1)
  
  // 高级参数
  const [advancedParams, setAdvancedParams] = useState<VideoParams>({
    motionIntensity: 5,
    cameraMovement: "static",
    fps: 24,
    quality: "standard",
    seed: "",
    negativePrompt: "",
    enableUpscale: false,
    upscaleModel: "R-ESRGAN 4x+",
    aspectRatio: "16:9"
  })
  
  // 源图片
  const [sourceImage, setSourceImage] = useState<UploadFile | null>(null)
  const [sourceImageUrl, setSourceImageUrl] = useState<string>("")
  
  // 批量处理相关状态
  const [activeTab, setActiveTab] = useState("single")
  const [batchTasks, setBatchTasks] = useState<any[]>([])
  const [isImportModalVisible, setIsImportModalVisible] = useState(false)
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // 历史记录
  const [showHistory, setShowHistory] = useState(false)
  const [generationHistory, setGenerationHistory] = useState<any[]>([])
  
  // 获取可用的视频生成模型（根据当前AI源过滤）
  const videoModels = currentSource 
    ? getVideoGenerationModels().filter(model => {
        const platform = EngineConfigManager.mapEngineTypeToPlatform(currentSource.type)
        return model.platform === platform
      })
    : getVideoGenerationModels()
  
  // 缓存常用设置
  useEffect(() => {
    const cachedSettings = cacheManager.get('video-gen-settings')
    if (cachedSettings) {
      setVideoDuration(cachedSettings.duration || 5)
      setVideoStyle(cachedSettings.style || "cinematic")
      setVideoResolution(cachedSettings.resolution || "1080p")
    }
  }, [])
  
  // 当AI源改变时，自动选择可用的视频模型
  useEffect(() => {
    if (currentSource && videoModels.length > 0) {
      // 检查当前选择的模型是否在可用模型列表中
      const currentModelAvailable = videoModels.some(model => model.id === selectedModel)
      if (!currentModelAvailable) {
        // 选择第一个可用模型
        setSelectedModel(videoModels[0].id)
      }
    }
  }, [currentSource, videoModels])
  
  // 保存设置到缓存
  const saveSettings = () => {
    cacheManager.set('video-gen-settings', {
      duration: videoDuration,
      style: videoStyle,
      resolution: videoResolution
    }, 300000) // 5分钟缓存
  }
  
  // 处理图片上传
  const handleImageUpload = (file: UploadFile) => {
    setSourceImage(file)
    
    if (file.originFileObj) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSourceImageUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file.originFileObj)
    }
    
    return false
  }
  
  // 生成视频
  const handleGenerate = async () => {
    if (!prompt.trim() && !sourceImageUrl) {
      message.warning("请输入提示词或上传图片")
      return
    }
    
    if (!currentSource) {
      message.warning("请先在设置中配置AI源")
      return
    }
    
    setIsGenerating(true)
    saveSettings()
    
    try {
      // 创建生成任务
      const newVideos: GeneratedVideo[] = []
      for (let i = 0; i < videoCount; i++) {
        const newVideo: GeneratedVideo = {
          id: `video_${Date.now()}_${i}`,
          url: "",
          thumbnailUrl: "",
          prompt: prompt.trim(),
          sourceImageUrl,
          timestamp: Date.now(),
          status: "generating",
          progress: 0,
          duration: videoDuration,
          model: selectedModel,
          resolution: videoResolution,
          fps: advancedParams.fps,
          quality: advancedParams.quality,
          motionIntensity: advancedParams.motionIntensity,
          cameraMovement: advancedParams.cameraMovement,
          style: videoStyle,
          seed: advancedParams.seed || Math.random().toString(36).substr(2, 9)
        }
        newVideos.push(newVideo)
      }
      
      setVideos(prev => [...newVideos, ...prev])
      
      // 调用真实的API生成视频
      for (let i = 0; i < newVideos.length; i++) {
        const newVideo = newVideos[i]
        
        try {
          // 先更新状态为生成中
          setVideos(prev => prev.map(video => 
            video.id === newVideo.id 
              ? { ...video, progress: 10 }
              : video
          ))
          
          // 调用API生成视频
          const result = await apiService.generateVideos(
            {
              prompt: prompt.trim(),
              sourceImageUrl: sourceImageUrl,
              count: 1, // 每次调用生成一个视频
              duration: videoDuration,
              style: videoStyle
            },
            currentSource,
            selectedModel
          )
          
          if (result.success && result.data) {
            // 更新视频状态为完成
            setVideos(prev => prev.map(video => 
              video.id === newVideo.id 
                ? { 
                    ...video, 
                    status: "completed",
                    progress: 100,
                    url: result.data![0].url,
                    thumbnailUrl: result.data![0].thumbnailUrl
                  }
                : video
            ))
          } else {
            // 生成失败
            setVideos(prev => prev.map(video => 
              video.id === newVideo.id 
                ? { ...video, status: "failed", progress: 0 }
                : video
            ))
            message.error(`视频 ${i + 1} 生成失败: ${result.error}`)
          }
        } catch (error) {
          console.error(`视频 ${i + 1} 生成失败:`, error)
          setVideos(prev => prev.map(video => 
            video.id === newVideo.id 
              ? { ...video, status: "failed", progress: 0 }
              : video
          ))
          message.error(`视频 ${i + 1} 生成失败，请重试`)
        }
      }
      
      // 添加到历史记录
      const historyItem = {
        id: Date.now().toString(),
        prompt: prompt.trim(),
        model: selectedModel,
        hasSourceImage: !!sourceImageUrl,
        params: { 
          videoDuration, 
          videoStyle, 
          videoResolution, 
          videoCount,
          ...advancedParams 
        },
        timestamp: Date.now(),
        videoCount
      }
      setGenerationHistory(prev => [historyItem, ...prev.slice(0, 49)])
      
      message.success(`正在生成 ${videoCount} 个视频...`)
    } catch (error) {
      console.error("生成失败:", error)
      message.error("生成失败，请重试")
    } finally {
      setIsGenerating(false)
    }
  }
  
  // 下载视频
  const handleDownload = async (video: GeneratedVideo) => {
    if (!video.url) return
    
    try {
      if (platform.native?.filesystem?.saveFile) {
        await platform.native.filesystem.saveFile(
          video.url,
          `video_${video.id}.mp4`
        )
      } else {
        // 浏览器环境下载
        const link = document.createElement('a')
        link.href = video.url
        link.download = `video_${video.prompt.slice(0, 20)}_${video.id}.mp4`
        link.click()
      }
      message.success("视频下载成功")
    } catch (error) {
      console.error("下载失败:", error)
      message.error("下载失败")
    }
  }
  
  // 复制提示词
  const copyPrompt = (promptText: string) => {
    navigator.clipboard.writeText(promptText)
    message.success("提示词已复制")
  }
  
  // 使用历史记录
  const useHistoryItem = (item: any) => {
    setPrompt(item.prompt)
    setSelectedModel(item.model)
    setVideoDuration(item.params.videoDuration)
    setVideoStyle(item.params.videoStyle)
    setVideoResolution(item.params.videoResolution)
    setVideoCount(item.params.videoCount)
    setAdvancedParams(item.params)
    setShowHistory(false)
  }
  
  // 导出视频信息
  const exportVideoInfo = () => {
    const videoData = videos.map(video => ({
      prompt: video.prompt,
      model: video.model,
      duration: video.duration,
      resolution: video.resolution,
      fps: video.fps,
      style: video.style,
      motionIntensity: video.motionIntensity,
      cameraMovement: video.cameraMovement,
      seed: video.seed,
      timestamp: new Date(video.timestamp).toISOString()
    }))
    
    const blob = new Blob([JSON.stringify(videoData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video_generation_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    message.success("视频信息已导出")
  }
  
  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 模型和基础设置 */}
      <Card size="small" className="mb-4">
        <Row gutter={16}>
          <Col span={6}>
            <Text strong className="text-sm">选择模型</Text>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              className="w-full mt-1"
              placeholder="选择视频生成模型"
              disabled={videoModels.length === 0}
            >
              {videoModels.map(model => (
                <Option key={model.id} value={model.id}>
                  <Space>
                    <span>{model.name}</span>
                    <Tag size="small">{model.platform}</Tag>
                  </Space>
                </Option>
              ))}
            </Select>
            {videoModels.length === 0 && currentSource && (
              <Text type="danger" className="text-xs mt-1 block">
                当前AI源 {currentSource.name} 暂不支持视频生成
              </Text>
            )}
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">视频时长</Text>
            <InputNumber
              min={1}
              max={60}
              value={videoDuration}
              onChange={setVideoDuration}
              className="w-full mt-1"
              addonAfter="秒"
            />
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">分辨率</Text>
            <Select
              value={videoResolution}
              onChange={setVideoResolution}
              className="w-full mt-1"
            >
              <Option value="480p">480p (SD)</Option>
              <Option value="720p">720p (HD)</Option>
              <Option value="1080p">1080p (FHD)</Option>
              <Option value="1440p">1440p (QHD)</Option>
              <Option value="2160p">2160p (4K)</Option>
            </Select>
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">风格</Text>
            <Select
              value={videoStyle}
              onChange={setVideoStyle}
              className="w-full mt-1"
            >
              <Option value="cinematic">电影感</Option>
              <Option value="realistic">写实</Option>
              <Option value="anime">动漫</Option>
              <Option value="artistic">艺术</Option>
              <Option value="documentary">纪录片</Option>
              <Option value="commercial">商业广告</Option>
              <Option value="music-video">音乐视频</Option>
            </Select>
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">生成数量</Text>
            <InputNumber
              min={1}
              max={5}
              value={videoCount}
              onChange={setVideoCount}
              className="w-full mt-1"
            />
          </Col>
        </Row>
        
        <div className="mt-3">
          <Space>
            <Tooltip title="显示高级参数">
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                高级设置
              </Button>
            </Tooltip>
            
            <Tooltip title="查看历史记录">
              <Button
                type="text"
                size="small"
                icon={<HistoryOutlined />}
                onClick={() => setShowHistory(!showHistory)}
              >
                历史
              </Button>
            </Tooltip>
            
            <Button
              type="text"
              size="small"
              icon={<SaveOutlined />}
              onClick={exportVideoInfo}
            >
              导出
            </Button>
          </Space>
        </div>
      </Card>
      
      {/* 高级参数设置 */}
      {showAdvanced && (
        <Card size="small" className="mb-4" title="高级参数">
          <Row gutter={16}>
            <Col span={6}>
              <Text strong className="text-sm">运动强度</Text>
              <Rate
                count={10}
                value={advancedParams.motionIntensity}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, motionIntensity: value as number }))}
                className="mt-2"
              />
              <Text type="secondary" className="text-xs block mt-1">
                {advancedParams.motionIntensity}/10
              </Text>
            </Col>
            
            <Col span={6}>
              <Text strong className="text-sm">镜头运动</Text>
              <Select
                value={advancedParams.cameraMovement}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, cameraMovement: value }))}
                className="w-full mt-1"
              >
                <Option value="static">静态</Option>
                <Option value="pan">平移</Option>
                <Option value="tilt">倾斜</Option>
                <Option value="zoom">缩放</Option>
                <Option value="dolly">推拉</Option>
                <Option value="tracking">跟踪</Option>
                <Option value="orbit">环绕</Option>
              </Select>
            </Col>
            
            <Col span={6}>
              <Text strong className="text-sm">帧率</Text>
              <Select
                value={advancedParams.fps}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, fps: value as number }))}
                className="w-full mt-1"
              >
                <Option value={15}>15 fps (省流量)</Option>
                <Option value={24}>24 fps (电影)</Option>
                <Option value={30}>30 fps (标准)</Option>
                <Option value={60}>60 fps (流畅)</Option>
              </Select>
            </Col>
            
            <Col span={6}>
              <Text strong className="text-sm">质量模式</Text>
              <Select
                value={advancedParams.quality}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, quality: value }))}
                className="w-full mt-1"
              >
                <Option value="draft">草稿 (快速)</Option>
                <Option value="standard">标准</Option>
                <Option value="high">高质量</Option>
                <Option value="ultra">超高质量</Option>
              </Select>
            </Col>
          </Row>
          
          <Row gutter={16} className="mt-3">
            <Col span={6}>
              <Text strong className="text-sm">长宽比</Text>
              <Select
                value={advancedParams.aspectRatio}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, aspectRatio: value }))}
                className="w-full mt-1"
              >
                <Option value="16:9">16:9 (横屏)</Option>
                <Option value="9:16">9:16 (竖屏)</Option>
                <Option value="1:1">1:1 (正方形)</Option>
                <Option value="4:3">4:3 (传统)</Option>
                <Option value="21:9">21:9 (宽屏)</Option>
              </Select>
            </Col>
            
            <Col span={6}>
              <Text strong className="text-sm">随机种子</Text>
              <Input
                value={advancedParams.seed}
                onChange={(e) => setAdvancedParams(prev => ({ ...prev, seed: e.target.value }))}
                placeholder="留空使用随机种子"
                className="mt-1"
              />
            </Col>
            
            <Col span={12}>
              <Text strong className="text-sm">负面提示词</Text>
              <TextArea
                value={advancedParams.negativePrompt}
                onChange={(e) => setAdvancedParams(prev => ({ ...prev, negativePrompt: e.target.value }))}
                placeholder="描述不想要的内容，例如：模糊, 抖动, 低质量"
                rows={1}
                className="mt-1"
              />
            </Col>
          </Row>
          
          <div className="mt-3">
            <Switch
              checked={advancedParams.enableUpscale}
              onChange={(checked) => setAdvancedParams(prev => ({ ...prev, enableUpscale: checked }))}
              checkedChildren="启用超分辨率"
              unCheckedChildren="关闭超分辨率"
            />
            {advancedParams.enableUpscale && (
              <Select
                value={advancedParams.upscaleModel}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, upscaleModel: value }))}
                className="ml-3"
                style={{ width: 150 }}
              >
                <Option value="R-ESRGAN 4x+">R-ESRGAN 4x+</Option>
                <Option value="Real-ESRGAN">Real-ESRGAN</Option>
                <Option value="SwinIR">SwinIR</Option>
              </Select>
            )}
          </div>
        </Card>
      )}
      
      {/* 历史记录侧边栏 */}
      {showHistory && (
        <Card size="small" className="mb-4" title="历史记录">
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {generationHistory.length === 0 ? (
              <Text type="secondary">暂无历史记录</Text>
            ) : (
              <Space direction="vertical" size="small" className="w-full">
                {generationHistory.map(item => (
                  <Card 
                    key={item.id} 
                    size="small" 
                    hoverable
                    onClick={() => useHistoryItem(item)}
                    className="cursor-pointer"
                  >
                    <Text ellipsis={{ tooltip: item.prompt }} className="text-sm">
                      {item.prompt}
                    </Text>
                    <div className="flex justify-between mt-1">
                      <Space>
                        <Tag size="small">{item.model}</Tag>
                        {item.hasSourceImage && <Tag size="small" icon={<UploadOutlined />}>图生视频</Tag>}
                      </Space>
                      <Text type="secondary" className="text-xs">
                        {new Date(item.timestamp).toLocaleString()}
                      </Text>
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </div>
        </Card>
      )}
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="flex-1 flex flex-col"
          items={[
            {
              key: "single",
              label: "单个生成",
              children: (
                <div className="flex-1 flex flex-col">
                  {/* 图片上传和提示词输入 */}
                  <Card size="small" className="mb-4">
                    <div>
                      <Text strong className="text-sm">上传图片</Text>
                      <Upload
                        accept="image/*"
                        maxCount={1}
                        beforeUpload={handleImageUpload}
                        showUploadList={false}
                      >
                        <Button icon={<UploadOutlined />}>
                          {sourceImage ? "重新上传" : "选择图片"}
                        </Button>
                      </Upload>
                      
                      {sourceImageUrl && (
                        <div className="mt-2">
                          <Image
                            src={sourceImageUrl}
                            alt="Source"
                            width={150}
                            height={150}
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <Text strong className="text-sm">视频描述</Text>
                      <TextArea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={
                          sourceImageUrl
                            ? "描述你想要的视频效果（可选）"
                            : "描述你想要生成的视频内容..."
                        }
                        autoSize={{ minRows: 3, maxRows: 6 }}
                      />
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <Space>
                        <Button
                          type="primary"
                          icon={<VideoCameraOutlined />}
                          onClick={handleGenerate}
                          loading={isGenerating}
                          disabled={(!prompt.trim() && !sourceImageUrl) || videoModels.length === 0}
                        >
                          生成视频
                        </Button>
                        
                        <Button
                          icon={<BulbOutlined />}
                          onClick={() => setIsTemplateModalVisible(true)}
                        >
                          使用模板
                        </Button>
                        
                        {videos.length > 0 && (
                          <Button
                            icon={<DeleteOutlined />}
                            onClick={() => setVideos([])}
                          >
                            清空列表
                          </Button>
                        )}
                      </Space>
                      
                      {currentSource && (
                        <Text type="secondary" className="text-xs">
                          当前引擎: {currentSource.name}
                        </Text>
                      )}
                    </div>
                  </Card>
                  
                  {/* 生成历史 */}
                  <div className="flex-1 overflow-y-auto">
                    {videos.length === 0 ? (
                      <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                        <Space direction="vertical" align="center">
                          <VideoCameraOutlined className="text-4xl text-gray-400" />
                          <Text type="secondary">
                            {sourceImageUrl ? "输入描述开始生成视频" : "上传图片或输入描述开始创作"}
                          </Text>
                        </Space>
                      </div>
                    ) : (
                      <Row gutter={[16, 16]}>
                        {videos.map(video => (
                          <Col key={video.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                              hoverable
                              cover={
                                video.status === "generating" ? (
                                  <div className="h-48 bg-gray-100 flex flex-col items-center justify-center">
                                    <Progress
                                      type="circle"
                                      percent={Math.round(video.progress || 0)}
                                      size={80}
                                    />
                                    <Text type="secondary" className="mt-2 text-sm">
                                      生成中...
                                    </Text>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Image
                                      src={video.thumbnailUrl || "https://via.placeholder.com/400x225"}
                                      alt={video.prompt}
                                      className="h-48 object-cover"
                                      preview={false}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                      <PlayCircleOutlined className="text-4xl text-white" />
                                    </div>
                                  </div>
                                )
                              }
                              actions={[
                                <Tooltip title="播放">
                                  <Button
                                    type="text"
                                    icon={<PlayCircleOutlined />}
                                    disabled={video.status !== "completed"}
                                  >
                                    播放
                                  </Button>
                                </Tooltip>,
                                <Tooltip title="下载">
                                  <Button
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    disabled={video.status !== "completed"}
                                    onClick={() => handleDownload(video)}
                                  />
                                </Tooltip>,
                                <Tooltip title="复制提示词">
                                  <Button
                                    type="text"
                                    icon={<CopyOutlined />}
                                    onClick={() => copyPrompt(video.prompt)}
                                  />
                                </Tooltip>,
                                <Tooltip title="删除">
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => setVideos(prev => prev.filter(v => v.id !== video.id))}
                                  />
                                </Tooltip>
                              ]}
                            >
                              <Card.Meta
                                title={
                                  <Text ellipsis={{ tooltip: video.prompt }} className="text-sm">
                                    {video.prompt || "未命名视频"}
                                  </Text>
                                }
                                description={
                                  <Space direction="vertical" size="small" className="w-full">
                                    <div className="flex justify-between">
                                      <Tag size="small">{video.model}</Tag>
                                      <Tag size="small">{video.resolution}</Tag>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <Text type="secondary">
                                        时长: {video.duration}秒
                                      </Text>
                                      <Text type="secondary">
                                        {video.status === "completed" ? "已完成" : "生成中"}
                                      </Text>
                                    </div>
                                    {video.seed && (
                                      <Text type="secondary" className="text-xs">
                                        Seed: {video.seed}
                                      </Text>
                                    )}
                                    <Text type="secondary" className="text-xs">
                                      {new Date(video.timestamp).toLocaleString()}
                                    </Text>
                                  </Space>
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
              key: "batch",
              label: "批量生成",
              children: (
                <BatchProcessor
                  type="video"
                  tasks={batchTasks}
                  onTasksChange={setBatchTasks}
                />
              )
            }
          ]}
        />
      </div>
      
      {/* 模板选择弹窗 */}
      <Modal
        title="选择模板"
        open={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <TemplateManager
          type="video"
          onSelect={(template) => {
            setPrompt(template.content)
            setIsTemplateModalVisible(false)
          }}
        />
      </Modal>
      
      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
        width={600}
      >
        <ExcelImporter
          type="video"
          onImport={(data) => {
            console.log("导入数据:", data)
            setIsImportModalVisible(false)
          }}
        />
      </Modal>
    </div>
  )
}

export default Image2VideoTab