import { useState, useEffect } from "react"
import { Modal, Form, Input, Button, Space, Card, Typography, Divider, message, List, Popconfirm } from "antd"
import { PlusOutlined, DeleteOutlined, SaveOutlined, EditOutlined, CopyOutlined } from "@ant-design/icons"
import { Storage } from "@plasmohq/storage"

const { Title, Text } = Typography
const { TextArea } = Input

// 存储实例
const storage = new Storage()

// 提示词模板类型
interface PromptTemplate {
  id: string
  name: string
  prefixPrompt: string
  suffixPrompt: string
  description?: string
  createdAt: number
  updatedAt: number
}

interface PromptModalProps {
  visible: boolean
  onClose: () => void
  onSelectPrompt?: (template: PromptTemplate) => void
}

/**
 * 提示词管理模态框组件 - 保存和管理提示词模板
 */
function PromptModal({ visible, onClose, onSelectPrompt }: PromptModalProps) {
  const [form] = Form.useForm()
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)

  /**
   * 从存储中加载提示词模板
   */
  const loadPromptTemplates = async () => {
    try {
      const templates = (await storage.get("prompt_templates") as PromptTemplate[]) || []
      setPromptTemplates(templates.sort((a, b) => b.updatedAt - a.updatedAt))
    } catch (error) {
      console.error("加载提示词模板失败:", error)
      message.error("加载模板失败")
    }
  }

  /**
   * 保存提示词模板到存储
   */
  const savePromptTemplates = async (templates: PromptTemplate[]) => {
    try {
      await storage.set("prompt_templates", templates)
      message.success("模板保存成功")
    } catch (error) {
      console.error("保存提示词模板失败:", error)
      message.error("保存模板失败")
    }
  }

  /**
   * 显示新建表单
   */
  const showCreateForm = () => {
    setEditingTemplate(null)
    form.resetFields()
    setIsFormVisible(true)
  }

  /**
   * 显示编辑表单
   */
  const showEditForm = (template: PromptTemplate) => {
    setEditingTemplate(template)
    form.setFieldsValue({
      name: template.name,
      prefixPrompt: template.prefixPrompt,
      suffixPrompt: template.suffixPrompt,
      description: template.description
    })
    setIsFormVisible(true)
  }

  /**
   * 隐藏表单
   */
  const hideForm = () => {
    setIsFormVisible(false)
    setEditingTemplate(null)
    form.resetFields()
  }

  /**
   * 保存提示词模板
   */
  const handleSaveTemplate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const now = Date.now()
      let updatedTemplates: PromptTemplate[]

      if (editingTemplate) {
        // 编辑现有模板
        updatedTemplates = promptTemplates.map(template => 
          template.id === editingTemplate.id 
            ? { ...template, ...values, updatedAt: now }
            : template
        )
      } else {
        // 创建新模板
        const newTemplate: PromptTemplate = {
          id: Date.now().toString(),
          ...values,
          createdAt: now,
          updatedAt: now
        }
        updatedTemplates = [newTemplate, ...promptTemplates]
      }

      await savePromptTemplates(updatedTemplates)
      setPromptTemplates(updatedTemplates)
      hideForm()
    } catch (error) {
      console.error("保存模板失败:", error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 删除提示词模板
   */
  const handleDeleteTemplate = async (id: string) => {
    try {
      const updatedTemplates = promptTemplates.filter(template => template.id !== id)
      await savePromptTemplates(updatedTemplates)
      setPromptTemplates(updatedTemplates)
    } catch (error) {
      console.error("删除模板失败:", error)
      message.error("删除模板失败")
    }
  }

  /**
   * 复制模板
   */
  const handleCopyTemplate = async (template: PromptTemplate) => {
    try {
      const now = Date.now()
      const newTemplate: PromptTemplate = {
        ...template,
        id: now.toString(),
        name: `${template.name} (副本)`,
        createdAt: now,
        updatedAt: now
      }
      const updatedTemplates = [newTemplate, ...promptTemplates]
      await savePromptTemplates(updatedTemplates)
      setPromptTemplates(updatedTemplates)
      message.success("模板复制成功")
    } catch (error) {
      console.error("复制模板失败:", error)
      message.error("复制模板失败")
    }
  }

  /**
   * 选择并使用模板
   */
  const handleSelectTemplate = (template: PromptTemplate) => {
    if (onSelectPrompt) {
      onSelectPrompt(template)
      onClose()
      message.success(`已应用模板：${template.name}`)
    }
  }

  /**
   * 格式化时间
   */
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  // 组件挂载时加载模板
  useEffect(() => {
    if (visible) {
      loadPromptTemplates()
    }
  }, [visible])

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          提示词模板管理
        </Title>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          关闭
        </Button>,
        <Button key="add" type="primary" icon={<PlusOutlined />} onClick={showCreateForm}>
          新建模板
        </Button>
      ]}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' }
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text type="secondary">
          管理你的提示词模板，快速应用到图片生成中
        </Text>

        {/* 新建/编辑表单 */}
        {isFormVisible && (
          <Card title={editingTemplate ? "编辑模板" : "新建模板"} 
                extra={
                  <Button type="text" onClick={hideForm}>
                    取消
                  </Button>
                }>
            <Form form={form} layout="vertical">
              <Form.Item 
                name="name" 
                label="模板名称" 
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="如：写实人像风格" />
              </Form.Item>

              <Form.Item name="description" label="描述">
                <Input placeholder="模板的用途和特点描述" />
              </Form.Item>

              <Form.Item 
                name="prefixPrompt" 
                label="提示词前缀"
                rules={[{ required: true, message: '请输入提示词前缀' }]}
              >
                <TextArea 
                  rows={3} 
                  placeholder="如：Romanticism, cinematic lighting, professional photography" 
                />
              </Form.Item>

              <Form.Item name="suffixPrompt" label="提示词后缀">
                <TextArea 
                  rows={3} 
                  placeholder="如：high details, UHD, masterpiece, best quality" 
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    loading={loading}
                    onClick={handleSaveTemplate}
                  >
                    保存模板
                  </Button>
                  <Button onClick={hideForm}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        {/* 模板列表 */}
        {promptTemplates.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">暂无保存的提示词模板</Text>
              <br />
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={showCreateForm}
                style={{ marginTop: 16 }}
              >
                创建第一个模板
              </Button>
            </div>
          </Card>
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 3 }}
            dataSource={promptTemplates}
            renderItem={(template) => (
              <List.Item>
                <Card
                  size="small"
                  title={template.name}
                  extra={
                    <Space>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyTemplate(template)}
                        title="复制模板"
                      />
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<EditOutlined />}
                        onClick={() => showEditForm(template)}
                        title="编辑模板"
                      />
                      <Popconfirm
                        title="确定要删除这个模板吗？"
                        onConfirm={() => handleDeleteTemplate(template.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button 
                          type="text" 
                          size="small" 
                          danger 
                          icon={<DeleteOutlined />}
                          title="删除模板"
                        />
                      </Popconfirm>
                    </Space>
                  }
                  actions={[
                    <Button 
                      key="use" 
                      type="primary" 
                      size="small"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      使用模板
                    </Button>
                  ]}
                >
                  {template.description && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      {template.description}
                    </Text>
                  )}
                  
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 12 }}>前缀：</Text>
                    <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: template.prefixPrompt }}>
                      {template.prefixPrompt || '无'}
                    </Text>
                  </div>
                  
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 12 }}>后缀：</Text>
                    <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: template.suffixPrompt }}>
                      {template.suffixPrompt || '无'}
                    </Text>
                  </div>
                  
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    更新时间：{formatTime(template.updatedAt)}
                  </Text>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Modal>
  )
}

export default PromptModal