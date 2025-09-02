import {
  BulbOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  PictureOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  SaveOutlined,
  HistoryOutlined
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
  Divider
} from "antd"
import { useEffect, useState, useRef } from "react"

import { useAISources, useUI, useModelManager } from "../../src/hooks"
import { modelManager, DEFAULT_MODELS } from "../../src/config/models"
import { cacheManager } from "../../src/utils/cache"
import { apiService } from "../../services/apiService"
import BatchProcessor from "../BatchProcessor"
import ExcelImporter from "../ExcelImporter"
import TemplateManager from "../TemplateManager"

const { Text, Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 生成的图片类型
interface GeneratedImage {
  id: string
  url: string
  prompt: string
  timestamp: number
  status: "generating" | "completed" | "failed"
  progress?: number
  model?: string
  size?: string
  style?: string
  seed?: string
  steps?: number
  cfgScale?: number
  negativePrompt?: string
}

// 高级生成参数
interface GenerationParams {
  steps: number
  cfgScale: number
  seed: string
  negativePrompt: string
  sampler: string
  enableHiresFix: boolean
  hiresUpscaler: string
  denoisingStrength: number
}

/**
 * 文生图标签页组件 - 支持最新AI模型和高级功能
 */
function Text2ImageTab() {
  const { currentSource } = useAISources()
  const { platform } = useUI()
  const { getImageGenerationModels } = useModelManager()
  
  // 基础状态
  const [prompt, setPrompt] = useState("")
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  
  // 模型和生成设置
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS.IMAGE_GENERATION)
  const [imageCount, setImageCount] = useState(1)
  const [imageSize, setImageSize] = useState("1024x1024")
  const [imageStyle, setImageStyle] = useState("natural")
  const [qualityPreset, setQualityPreset] = useState("standard")
  
  // 高级参数
  const [advancedParams, setAdvancedParams] = useState<GenerationParams>({
    steps: 20,
    cfgScale: 7,
    seed: "",
    negativePrompt: "",
    sampler: "DPM++ 2M Karras",
    enableHiresFix: false,
    hiresUpscaler: "R-ESRGAN 4x+",
    denoisingStrength: 0.5
  })
  
  // 参考图片（图生图）
  const [referenceImage, setReferenceImage] = useState<any>(null)
  const [imageToImage, setImageToImage] = useState(false)
  const [strength, setStrength] = useState(0.75)
  
  // 批量处理相关状态
  const [activeTab, setActiveTab] = useState("single")
  const [batchTasks, setBatchTasks] = useState<any[]>([])
  const [isImportModalVisible, setIsImportModalVisible] = useState(false)
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // 历史记录
  const [showHistory, setShowHistory] = useState(false)
  const [generationHistory, setGenerationHistory] = useState<any[]>([])
  
  // 获取可用的图片生成模型
  const imageModels = getImageGenerationModels()
  
  // 缓存常用设置
  useEffect(() => {
    const cachedSettings = cacheManager.get('image-gen-settings')
    if (cachedSettings) {
      setImageSize(cachedSettings.size || "1024x1024")
      setImageStyle(cachedSettings.style || "natural")
      setQualityPreset(cachedSettings.quality || "standard")
    }
  }, [])
  
  // 保存设置到缓存
  const saveSettings = () => {
    cacheManager.set('image-gen-settings', {
      size: imageSize,
      style: imageStyle,
      quality: qualityPreset
    }, 300000) // 5分钟缓存
  }
  
  // 生成图片
  const handleGenerateImages = async () => {
    if (!prompt.trim() && !referenceImage) {
      message.warning("请输入图片描述或上传参考图片")
      return
    }
    
    if (!currentSource) {
      message.warning("请先在设置中配置AI源")
      return
    }
    
    setIsGenerating(true)
    saveSettings()
    
    try {
      // 准备生成参数
      const generationParams = {
        prompt: prompt.trim(),
        count: imageCount,
        size: imageSize,
        style: imageStyle,
        steps: advancedParams.steps,
        cfgScale: advancedParams.cfgScale,
        seed: advancedParams.seed,
        negativePrompt: advancedParams.negativePrompt,
        // 图生图参数
        imageToImage,
        referenceImage: referenceImage?.url,
        strength
      }
      
      // 创建生成中的图片占位符
      const newImages: GeneratedImage[] = []
      for (let i = 0; i < imageCount; i++) {
        const newImage: GeneratedImage = {
          id: `img_${Date.now()}_${i}`,
          url: "",
          prompt: prompt.trim(),
          timestamp: Date.now(),
          status: "generating",
          progress: 0,
          model: selectedModel,
          size: imageSize,
          style: imageStyle,
          steps: advancedParams.steps,
          cfgScale: advancedParams.cfgScale,
          seed: advancedParams.seed || Math.random().toString(36).substr(2, 9),
          negativePrompt: advancedParams.negativePrompt
        }
        newImages.push(newImage)
      }
      
      setImages(prev => [...newImages, ...prev])
      
      // 调用真实的API
      const result = await apiService.generateImages(
        {
          prompt: prompt.trim(),
          count: imageCount,
          size: imageSize,
          style: imageStyle
        },
        currentSource,
        selectedModel
      )
      
      if (result.success && result.data) {
        // 更新图片状态
        setImages(prev => prev.map(img => {
          const index = newImages.findIndex(newImg => newImg.id === img.id)
          if (index !== -1 && index < result.data!.length) {
            return {
              ...img,
              status: "completed" as const,
              progress: 100,
              url: result.data![index]
            }
          }
          return img
        }))
        
        message.success(`成功生成 ${result.data.length} 张图片`)
      } else {
        // 标记为失败
        setImages(prev => prev.map(img => 
          newImages.some(newImg => newImg.id === img.id) 
            ? { ...img, status: "failed" as const }
            : img
        ))
        throw new Error(result.error || "生成失败")
      }
      
      // 添加到历史记录
      const historyItem = {
        id: Date.now().toString(),
        prompt: prompt.trim(),
        model: selectedModel,
        params: { imageSize, imageStyle, imageCount, ...advancedParams },
        timestamp: Date.now(),
        imageCount
      }
      setGenerationHistory(prev => [historyItem, ...prev.slice(0, 49)]) // 保留最近50条
      
    } catch (error) {
      console.error("生成失败:", error)
      message.error(error instanceof Error ? error.message : "生成失败，请重试")
      
      // 标记失败的图片
      setImages(prev => prev.map(img => 
        img.status === "generating" && newImages.some(newImg => newImg.id === img.id)
          ? { ...img, status: "failed" as const }
          : img
      ))
    } finally {
      setIsGenerating(false)
    }
  }
  
  // 处理参考图片上传
  const handleReferenceImageUpload = (file: any) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setReferenceImage({
        uid: file.uid,
        name: file.name,
        url: e.target?.result as string
      })
    }
    reader.readAsDataURL(file)
    return false
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
    setImageSize(item.params.imageSize)
    setImageStyle(item.params.imageStyle)
    setImageCount(item.params.imageCount)
    setAdvancedParams(item.params)
    setShowHistory(false)
  }
  
  // 导出图片信息
  const exportImageInfo = () => {
    const imageData = images.map(img => ({
      prompt: img.prompt,
      model: img.model,
      size: img.size,
      style: img.style,
      seed: img.seed,
      steps: img.steps,
      cfgScale: img.cfgScale,
      timestamp: new Date(img.timestamp).toISOString()
    }))
    
    const blob = new Blob([JSON.stringify(imageData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `image_generation_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    message.success("图片信息已导出")
  }
  
  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 模型和基础设置 */}
      <Card size="small" className="mb-4">
        <Row gutter={16}>
          <Col span={8}>
            <Text strong className="text-sm">选择模型</Text>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              className="w-full mt-1"
              placeholder="选择生成模型"
            >
              {imageModels.map(model => (
                <Option key={model.id} value={model.id}>
                  <Space>
                    <span>{model.name}</span>
                    <Tag size="small">{model.platform}</Tag>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">尺寸</Text>
            <Select
              value={imageSize}
              onChange={setImageSize}
              className="w-full mt-1"
            >
              <Option value="512x512">512×512</Option>
              <Option value="768x768">768×768</Option>
              <Option value="1024x1024">1024×1024</Option>
              <Option value="1024x1792">1024×1792 (竖版)</Option>
              <Option value="1792x1024">1792×1024 (横版)</Option>
              <Option value="1152x896">1152×896 (SDXL)</Option>
              <Option value="896x1152">896×1152 (SDXL竖版)</Option>
            </Select>
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">风格</Text>
            <Select
              value={imageStyle}
              onChange={setImageStyle}
              className="w-full mt-1"
            >
              <Option value="natural">自然</Option>
              <Option value="vivid">生动</Option>
              <Option value="realistic">写实</Option>
              <Option value="artistic">艺术</Option>
              <Option value="anime">动漫</Option>
              <Option value="cinematic">电影感</Option>
              <Option value="photographic">摄影</Option>
              <Option value="digital-art">数字艺术</Option>
            </Select>
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">数量</Text>
            <InputNumber
              min={1}
              max={10}
              value={imageCount}
              onChange={setImageCount}
              className="w-full mt-1"
            />
          </Col>
          
          <Col span={4}>
            <Text strong className="text-sm">质量</Text>
            <Select
              value={qualityPreset}
              onChange={setQualityPreset}
              className="w-full mt-1"
            >
              <Option value="draft">草稿 (快速)</Option>
              <Option value="standard">标准</Option>
              <Option value="high">高质量</Option>
              <Option value="ultra">超高质量</Option>
            </Select>
          </Col>
        </Row>
        
        <div className="mt-3">
          <Space>
            <Tooltip title="使用参考图片生成相似图片">
              <Switch
                checked={imageToImage}
                onChange={setImageToImage}
                checkedChildren="图生图"
                unCheckedChildren="文生图"
              />
            </Tooltip>
            
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
              onClick={exportImageInfo}
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
              <Text strong className="text-sm">迭代步数</Text>
              <Slider
                min={1}
                max={100}
                value={advancedParams.steps}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, steps: value as number }))}
                className="mt-2"
              />
              <Text type="secondary" className="text-xs">{advancedParams.steps} 步</Text>
            </Col>
            
            <Col span={6}>
              <Text strong className="text-sm">引导强度</Text>
              <Slider
                min={1}
                max={30}
                value={advancedParams.cfgScale}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, cfgScale: value as number }))}
                className="mt-2"
              />
              <Text type="secondary" className="text-xs">CFG: {advancedParams.cfgScale}</Text>
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
            
            <Col span={6}>
              <Text strong className="text-sm">采样器</Text>
              <Select
                value={advancedParams.sampler}
                onChange={(value) => setAdvancedParams(prev => ({ ...prev, sampler: value }))}
                className="w-full mt-1"
              >
                <Option value="DPM++ 2M Karras">DPM++ 2M Karras</Option>
                <Option value="Euler a">Euler a</Option>
                <Option value="DDIM">DDIM</Option>
                <Option value="UniPC">UniPC</Option>
              </Select>
            </Col>
          </Row>
          
          <div className="mt-3">
            <Text strong className="text-sm">负面提示词</Text>
            <TextArea
              value={advancedParams.negativePrompt}
              onChange={(e) => setAdvancedParams(prev => ({ ...prev, negativePrompt: e.target.value }))}
              placeholder="描述不想要的内容，例如：模糊, 低质量, 扭曲"
              rows={2}
              className="mt-1"
            />
          </div>
          
          {imageToImage && (
            <div className="mt-3">
              <Text strong className="text-sm">重绘强度</Text>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={strength}
                onChange={setStrength}
                className="mt-2"
              />
              <Text type="secondary" className="text-xs">{Math.round(strength * 100)}%</Text>
            </div>
          )}
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
                      <Text type="secondary" className="text-xs">
                        {item.model} · {item.imageCount}张
                      </Text>
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
                  {/* 输入区域 */}
                  <Card size="small" className="mb-4">
                    {imageToImage && (
                      <div className="mb-3">
                        <Text strong className="text-sm">参考图片</Text>
                        <Upload
                          accept="image/*"
                          maxCount={1}
                          beforeUpload={handleReferenceImageUpload}
                          showUploadList={false}
                        >
                          <Button icon={<PictureOutlined />}>
                            {referenceImage ? "更换图片" : "上传参考图片"}
                          </Button>
                        </Upload>
                        {referenceImage && (
                          <div className="mt-2">
                            <Image
                              src={referenceImage.url}
                              alt="Reference"
                              width={100}
                              height={100}
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <TextArea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        imageToImage
                          ? "描述你想要的图片变化（可选）"
                          : "描述你想要生成的图片，支持中英文..."
                      }
                      autoSize={{ minRows: 3, maxRows: 6 }}
                    />
                    
                    <div className="mt-3 flex justify-between items-center">
                      <Space>
                        <Button
                          type="primary"
                          icon={<PictureOutlined />}
                          onClick={handleGenerateImages}
                          loading={isGenerating}
                          disabled={!prompt.trim() && !referenceImage}
                        >
                          生成图片
                        </Button>
                        
                        <Button
                          icon={<BulbOutlined />}
                          onClick={() => setIsTemplateModalVisible(true)}
                        >
                          使用模板
                        </Button>
                        
                        {images.length > 0 && (
                          <Button
                            icon={<DeleteOutlined />}
                            onClick={() => setImages([])}
                          >
                            清空
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
                  
                  {/* 图片展示区域 */}
                  <div className="flex-1 overflow-y-auto">
                    {images.length === 0 ? (
                      <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                        <Space direction="vertical" align="center">
                          <PictureOutlined className="text-4xl text-gray-400" />
                          <Text type="secondary">
                            {imageToImage ? "上传参考图片开始创作" : "输入描述开始创作"}
                          </Text>
                        </Space>
                      </div>
                    ) : (
                      <Row gutter={[16, 16]}>
                        {images.map(image => (
                          <Col key={image.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                              hoverable
                              cover={
                                image.status === "generating" ? (
                                  <div className="h-48 bg-gray-100 flex items-center justify-center">
                                    <Progress
                                      type="circle"
                                      percent={Math.round(image.progress || 0)}
                                      size={80}
                                    />
                                  </div>
                                ) : (
                                  <Image
                                    src={image.url}
                                    alt={image.prompt}
                                    className="h-48 object-cover"
                                    preview={{
                                      mask: "预览"
                                    }}
                                  />
                                )
                              }
                              actions={[
                                <Tooltip title="下载">
                                  <Button
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    disabled={image.status !== "completed"}
                                    onClick={() => {
                                      const link = document.createElement('a')
                                      link.href = image.url
                                      link.download = `${image.prompt.slice(0, 20)}_${image.id}.jpg`
                                      link.click()
                                    }}
                                  />
                                </Tooltip>,
                                <Tooltip title="复制提示词">
                                  <Button
                                    type="text"
                                    icon={<CopyOutlined />}
                                    onClick={() => copyPrompt(image.prompt)}
                                  />
                                </Tooltip>,
                                <Tooltip title="重新生成">
                                  <Button
                                    type="text"
                                    icon={<ReloadOutlined />}
                                    onClick={() => {
                                      setPrompt(image.prompt)
                                      handleGenerateImages()
                                    }}
                                    disabled={isGenerating}
                                  />
                                </Tooltip>,
                                <Tooltip title="删除">
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => setImages(prev => prev.filter(img => img.id !== image.id))}
                                  />
                                </Tooltip>
                              ]}
                            >
                              <Card.Meta
                                title={
                                  <Text ellipsis={{ tooltip: image.prompt }} className="text-sm">
                                    {image.prompt}
                                  </Text>
                                }
                                description={
                                  <Space direction="vertical" size="small" className="w-full">
                                    <div className="flex justify-between">
                                      <Tag size="small">{image.model}</Tag>
                                      <Tag size="small">{image.size}</Tag>
                                    </div>
                                    {image.seed && (
                                      <Text type="secondary" className="text-xs">
                                        Seed: {image.seed}
                                      </Text>
                                    )}
                                    <Text type="secondary" className="text-xs">
                                      {new Date(image.timestamp).toLocaleString()}
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
                  type="image"
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
          type="image"
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
          type="image"
          onImport={(data) => {
            console.log("导入数据:", data)
            setIsImportModalVisible(false)
          }}
        />
      </Modal>
    </div>
  )
}

export default Text2ImageTab