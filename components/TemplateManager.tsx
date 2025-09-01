import React, { useState, useEffect } from 'react';
import { Card, Button, List, Modal, Form, Input, Select, Space, Tag, Popconfirm, notification, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, SaveOutlined } from '@ant-design/icons';
import { BatchTaskType } from './BatchProcessor';

const { Option } = Select;
const { TextArea } = Input;

// 模板接口
export interface Template {
  id: string;
  name: string;
  type: BatchTaskType;
  description?: string;
  parameters: { [key: string]: any };
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

// 预定义的默认模板
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'chat_default',
    name: '标准对话模板',
    type: BatchTaskType.CHAT,
    description: '适用于一般对话场景的标准参数',
    parameters: {
      temperature: 0.7,
      maxLength: 2000,
      systemPrompt: '你是一个有用的AI助手，请提供准确和有帮助的回答。'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'chat_creative',
    name: '创意对话模板',
    type: BatchTaskType.CHAT,
    description: '适用于创意写作和头脑风暴的参数',
    parameters: {
      temperature: 0.9,
      maxLength: 3000,
      systemPrompt: '你是一个富有创意的AI助手，请提供有想象力和创新性的回答。'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'image_realistic',
    name: '写实风格图片模板',
    type: BatchTaskType.TEXT_TO_IMAGE,
    description: '生成写实风格的高质量图片',
    parameters: {
      size: '1024x1024',
      count: 1,
      style: '写实',
      quality: 'hd',
      negativePrompt: '模糊，低质量，变形，噪点'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'image_anime',
    name: '动漫风格图片模板',
    type: BatchTaskType.TEXT_TO_IMAGE,
    description: '生成动漫风格的图片',
    parameters: {
      size: '1024x1024',
      count: 1,
      style: '动漫',
      quality: 'standard',
      negativePrompt: '真人，写实，3D渲染'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'video_short',
    name: '短视频模板',
    type: BatchTaskType.IMAGE_TO_VIDEO,
    description: '生成5秒短视频',
    parameters: {
      duration: 5,
      count: 1,
      style: '自然',
      fps: 24
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'video_long',
    name: '长视频模板',
    type: BatchTaskType.IMAGE_TO_VIDEO,
    description: '生成10秒长视频',
    parameters: {
      duration: 10,
      count: 1,
      style: '电影',
      fps: 30
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  }
];

// 模板管理器属性接口
interface TemplateManagerProps {
  onTemplateSelect: (template: Template) => void;
  onTemplateApply: (template: Template) => void;
  currentTaskType?: BatchTaskType;
}

/**
 * 模板管理系统组件
 * 支持保存、编辑、删除和复用不同类型任务的生成参数模板
 */
const TemplateManager: React.FC<TemplateManagerProps> = ({
  onTemplateSelect,
  onTemplateApply,
  currentTaskType
}) => {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [selectedType, setSelectedType] = useState<BatchTaskType | 'all'>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form] = Form.useForm();

  /**
   * 根据类型过滤模板
   */
  useEffect(() => {
    const filtered = selectedType === 'all' 
      ? templates 
      : templates.filter(template => template.type === selectedType);
    setFilteredTemplates(filtered);
  }, [templates, selectedType]);

  /**
   * 从本地存储加载模板
   */
  useEffect(() => {
    const savedTemplates = localStorage.getItem('ai_templates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        const templatesWithDates = parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        }));
        setTemplates([...DEFAULT_TEMPLATES, ...templatesWithDates]);
      } catch (error) {
        console.error('加载模板失败:', error);
      }
    }
  }, []);

  /**
   * 保存模板到本地存储
   */
  const saveTemplatesToStorage = (newTemplates: Template[]) => {
    const customTemplates = newTemplates.filter(t => !t.isDefault);
    localStorage.setItem('ai_templates', JSON.stringify(customTemplates));
  };

  /**
   * 创建新模板
   */
  const createTemplate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  /**
   * 编辑模板
   */
  const editTemplate = (template: Template) => {
    if (template.isDefault) {
      notification.warning({ message: '默认模板不能编辑，请复制后修改' });
      return;
    }
    
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      type: template.type,
      description: template.description,
      parameters: JSON.stringify(template.parameters, null, 2)
    });
    setIsModalVisible(true);
  };

  /**
   * 复制模板
   */
  const duplicateTemplate = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (副本)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false
    };
    
    const newTemplates = [...templates, newTemplate];
    setTemplates(newTemplates);
    saveTemplatesToStorage(newTemplates);
    notification.success({ message: '模板复制成功' });
  };

  /**
   * 删除模板
   */
  const deleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.isDefault) {
      notification.warning({ message: '默认模板不能删除' });
      return;
    }
    
    const newTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(newTemplates);
    saveTemplatesToStorage(newTemplates);
    notification.success({ message: '模板删除成功' });
  };

  /**
   * 保存模板
   */
  const saveTemplate = async () => {
    try {
      const values = await form.validateFields();
      
      // 验证参数JSON格式
      let parameters;
      try {
        parameters = JSON.parse(values.parameters);
      } catch (error) {
        notification.error({ message: '参数格式错误，请输入有效的JSON' });
        return;
      }
      
      const now = new Date();
      const template: Template = {
        id: editingTemplate?.id || `template_${Date.now()}`,
        name: values.name,
        type: values.type,
        description: values.description,
        parameters,
        createdAt: editingTemplate?.createdAt || now,
        updatedAt: now,
        isDefault: false
      };
      
      let newTemplates;
      if (editingTemplate) {
        newTemplates = templates.map(t => t.id === template.id ? template : t);
      } else {
        newTemplates = [...templates, template];
      }
      
      setTemplates(newTemplates);
      saveTemplatesToStorage(newTemplates);
      setIsModalVisible(false);
      notification.success({ message: editingTemplate ? '模板更新成功' : '模板创建成功' });
      
    } catch (error) {
      console.error('保存模板失败:', error);
    }
  };

  /**
   * 应用模板
   */
  const applyTemplate = (template: Template) => {
    onTemplateApply(template);
    notification.success({ message: `已应用模板: ${template.name}` });
  };

  /**
   * 获取任务类型显示名称
   */
  const getTaskTypeName = (type: BatchTaskType): string => {
    switch (type) {
      case BatchTaskType.CHAT: return '对话';
      case BatchTaskType.TEXT_TO_IMAGE: return '文生图';
      case BatchTaskType.IMAGE_TO_VIDEO: return '图生视频';
      default: return '未知';
    }
  };

  /**
   * 获取参数字段配置
   */
  const getParameterFields = (type: BatchTaskType) => {
    switch (type) {
      case BatchTaskType.CHAT:
        return {
          temperature: { label: '温度', type: 'number', min: 0, max: 2, step: 0.1 },
          maxLength: { label: '最大长度', type: 'number', min: 100, max: 10000 },
          systemPrompt: { label: '系统提示', type: 'textarea' }
        };
      case BatchTaskType.TEXT_TO_IMAGE:
        return {
          size: { label: '尺寸', type: 'select', options: ['512x512', '1024x1024', '1024x1792', '1792x1024'] },
          count: { label: '数量', type: 'number', min: 1, max: 4 },
          style: { label: '风格', type: 'select', options: ['写实', '动漫', '油画', '水彩', '素描'] },
          quality: { label: '质量', type: 'select', options: ['standard', 'hd'] },
          negativePrompt: { label: '负面提示词', type: 'textarea' }
        };
      case BatchTaskType.IMAGE_TO_VIDEO:
        return {
          duration: { label: '时长(秒)', type: 'number', min: 3, max: 10 },
          count: { label: '数量', type: 'number', min: 1, max: 4 },
          style: { label: '风格', type: 'select', options: ['自然', '电影', '动画', '艺术'] },
          fps: { label: '帧率', type: 'select', options: [24, 30, 60] }
        };
      default:
        return {};
    }
  };

  return (
    <div className="template-manager">
      <Card 
        title="模板管理" 
        size="small"
        extra={
          <Space>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: 120 }}
            >
              <Option value="all">全部类型</Option>
              <Option value={BatchTaskType.CHAT}>对话</Option>
              <Option value={BatchTaskType.TEXT_TO_IMAGE}>文生图</Option>
              <Option value={BatchTaskType.IMAGE_TO_VIDEO}>图生视频</Option>
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={createTemplate}
            >
              新建模板
            </Button>
          </Space>
        }
      >
        <List
          dataSource={filteredTemplates}
          renderItem={(template) => (
            <List.Item
              actions={[
                <Button
                  size="small"
                  type="link"
                  onClick={() => applyTemplate(template)}
                >
                  应用
                </Button>,
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => duplicateTemplate(template)}
                >
                  复制
                </Button>,
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => editTemplate(template)}
                  disabled={template.isDefault}
                >
                  编辑
                </Button>,
                <Popconfirm
                  title="确定要删除这个模板吗？"
                  onConfirm={() => deleteTemplate(template.id)}
                  disabled={template.isDefault}
                >
                  <Button
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    disabled={template.isDefault}
                  >
                    删除
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{template.name}</span>
                    <Tag color="blue">{getTaskTypeName(template.type)}</Tag>
                    {template.isDefault && <Tag color="gold">默认</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <div>{template.description}</div>
                    <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
                      创建时间: {template.createdAt.toLocaleString()}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 模板编辑模态框 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={isModalVisible}
        onOk={saveTemplate}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: currentTaskType || BatchTaskType.CHAT
          }}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="输入模板名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select>
              <Option value={BatchTaskType.CHAT}>对话</Option>
              <Option value={BatchTaskType.TEXT_TO_IMAGE}>文生图</Option>
              <Option value={BatchTaskType.IMAGE_TO_VIDEO}>图生视频</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={2} placeholder="输入模板描述（可选）" />
          </Form.Item>

          <Form.Item
            name="parameters"
            label="参数配置"
            rules={[{ required: true, message: '请输入参数配置' }]}
          >
            <TextArea
              rows={8}
              placeholder='输入JSON格式的参数配置，例如:\n{\n  "temperature": 0.7,\n  "maxLength": 2000\n}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TemplateManager;
export type { TemplateManagerProps };