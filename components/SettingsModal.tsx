import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons"
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Typography
} from "antd"
import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

const { Title, Text } = Typography
const { Option } = Select

// 存储实例
const storage = new Storage()

// AI 请求源类型
interface AISource {
  id: string
  name: string
  type: "openai" | "claude" | "gemini" | "custom"
  apiKey: string
  baseUrl?: string
  isDefault: boolean
}

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
}

/**
 * 设置模态框组件 - 配置多个 AI 请求源和 API Key
 */
function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [form] = Form.useForm()
  const [aiSources, setAiSources] = useState<AISource[]>([])
  const [loading, setLoading] = useState(false)

  /**
   * 从存储中加载 AI 请求源配置
   */
  const loadAISources = async () => {
    try {
      const sources = ((await storage.get("ai_sources")) as AISource[]) || []
      setAiSources(sources)
    } catch (error) {
      console.error("加载 AI 请求源失败:", error)
      message.error("加载配置失败")
    }
  }

  /**
   * 保存 AI 请求源配置到存储
   */
  const saveAISources = async (sources: AISource[]) => {
    try {
      await storage.set("ai_sources", sources)
      message.success("配置保存成功")
    } catch (error) {
      console.error("保存 AI 请求源失败:", error)
      message.error("保存配置失败")
    }
  }

  /**
   * 添加新的 AI 请求源
   */
  const addAISource = () => {
    const newSource: AISource = {
      id: Date.now().toString(),
      name: "",
      type: "openai",
      apiKey: "",
      baseUrl: "",
      isDefault: aiSources.length === 0
    }
    setAiSources([...aiSources, newSource])
  }

  /**
   * 删除 AI 请求源
   */
  const removeAISource = (id: string) => {
    const updatedSources = aiSources.filter((source) => source.id !== id)
    // 如果删除的是默认源，将第一个设为默认
    if (updatedSources.length > 0 && !updatedSources.some((s) => s.isDefault)) {
      updatedSources[0].isDefault = true
    }
    setAiSources(updatedSources)
  }

  /**
   * 更新 AI 请求源
   */
  const updateAISource = (id: string, field: keyof AISource, value: any) => {
    setAiSources((sources) =>
      sources.map((source) => {
        if (source.id === id) {
          // 如果设置为默认，取消其他源的默认状态
          if (field === "isDefault" && value) {
            sources.forEach((s) => (s.isDefault = false))
          }
          return { ...source, [field]: value }
        }
        return source
      })
    )
  }

  /**
   * 获取 API 基础 URL 占位符
   */
  const getBaseUrlPlaceholder = (type: string) => {
    switch (type) {
      case "openai":
        return "https://api.openai.com/v1"
      case "claude":
        return "https://api.anthropic.com"
      case "gemini":
        return "https://generativelanguage.googleapis.com/v1"

      case "云雾":
        return "https://yunwu.ai/v1/chat/completions"
      case "apicore":
        return "https://api.apicore.ai/v1/chat/completions"
      case "apiyi":
        return "https://vip.apiyi.com/v1/chat/completions"
      default:
        return "自定义 API 基础 URL"
    }
  }

  /**
   * 保存所有配置
   */
  const handleSave = async () => {
    setLoading(true)
    try {
      // 验证必填字段
      const invalidSources = aiSources.filter(
        (source) => !source.name || !source.apiKey
      )
      if (invalidSources.length > 0) {
        message.error("请填写所有必填字段（名称和 API Key）")
        return
      }

      await saveAISources(aiSources)
      onClose()
    } catch (error) {
      console.error("保存配置失败:", error)
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时加载配置
  useEffect(() => {
    if (visible) {
      loadAISources()
    }
  }, [visible])

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          AI 请求源设置
        </Title>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="add" icon={<PlusOutlined />} onClick={addAISource}>
          添加请求源
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}>
          保存配置
        </Button>
      ]}
      styles={{
        body: { maxHeight: "70vh", overflowY: "auto" }
      }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Text type="secondary">
          配置多个 AI 请求源，支持 OpenAI、Claude、Gemini 等服务
        </Text>

        {aiSources.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text type="secondary">暂无配置的 AI 请求源</Text>
              <br />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={addAISource}
                style={{ marginTop: 16 }}>
                添加第一个请求源
              </Button>
            </div>
          </Card>
        ) : (
          aiSources.map((source, index) => (
            <Card
              key={source.id}
              title={`请求源 ${index + 1}${source.isDefault ? " (默认)" : ""}`}
              extra={
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeAISource(source.id)}
                  disabled={aiSources.length === 1}>
                  删除
                </Button>
              }>
              <Form layout="vertical">
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%" }}>
                  <Form.Item label="名称" required>
                    <Input
                      placeholder="如：OpenAI GPT-4"
                      value={source.name}
                      onChange={(e) =>
                        updateAISource(source.id, "name", e.target.value)
                      }
                    />
                  </Form.Item>

                  <Form.Item label="类型">
                    <Select
                      value={source.type}
                      onChange={(value) =>
                        updateAISource(source.id, "type", value)
                      }
                      style={{ width: "100%" }}>
                      <Option value="openai">OpenAI</Option>
                      <Option value="claude">Claude (Anthropic)</Option>
                      <Option value="gemini">Gemini (Google)</Option>
                      <Option value="云雾">云雾</Option>
                      <Option value="apicore">apicore</Option>
                      <Option value="apiyi">apiyi</Option>
                      <Option value="custom">自定义</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="API Key" required>
                    <Input.Password
                      placeholder="输入 API Key"
                      value={source.apiKey}
                      onChange={(e) =>
                        updateAISource(source.id, "apiKey", e.target.value)
                      }
                    />
                  </Form.Item>

                  <Form.Item label="API 基础 URL">
                    <Input
                      placeholder={getBaseUrlPlaceholder(source.type)}
                      value={source.baseUrl}
                      onChange={(e) =>
                        updateAISource(source.id, "baseUrl", e.target.value)
                      }
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type={source.isDefault ? "primary" : "default"}
                      onClick={() =>
                        updateAISource(
                          source.id,
                          "isDefault",
                          !source.isDefault
                        )
                      }
                      disabled={source.isDefault}>
                      {source.isDefault ? "默认请求源" : "设为默认"}
                    </Button>
                  </Form.Item>
                </Space>
              </Form>
            </Card>
          ))
        )}
      </Space>
    </Modal>
  )
}

export default SettingsModal
