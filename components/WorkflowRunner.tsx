import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Progress,
  Steps,
  Alert,
  Tabs,
  Space,
  Tag,
  message,
  Modal,
  Spin,
  Typography
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  RobotOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Step } = Steps;
const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 模拟工作流配置
const DEFAULT_WORKFLOWS = [
  {
    id: 'content-creation',
    name: '内容创作工作流',
    description: '从主题到完整内容的自动化创作流程',
    engine: 'doubao',
    steps: [
      { id: 'generate-content', name: '生成内容', description: '根据主题提示词生成文章内容' },
      { id: 'generate-title', name: '生成标题', description: '根据内容生成吸引人的标题' },
      { id: 'generate-description', name: '生成描述', description: '生成内容描述和话题标签' }
    ]
  },
  {
    id: 'video-production',
    name: '视频制作工作流',
    description: '内容到视频的完整制作流程',
    engine: 'jimeng',
    steps: [
      { id: 'generate-content', name: '生成内容', description: '根据主题提示词生成视频脚本' },
      { id: 'generate-video-scenes', name: '生成画面', description: '将内容转换为一键成片的画面描述' },
      { id: 'generate-title', name: '生成标题', description: '生成视频标题' },
      { id: 'generate-description', name: '生成描述', description: '生成视频描述和话题标签' },
      { id: 'generate-cover', name: '生成封面', description: '生成视频封面图提示词' }
    ]
  }
];

interface WorkflowRunnerProps {
  className?: string;
}

export const WorkflowRunner: React.FC<WorkflowRunnerProps> = ({ className }) => {
  const [form] = Form.useForm();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [currentExecution, setCurrentExecution] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // 启动工作流
  const startWorkflow = async (values: any) => {
    if (!selectedWorkflow) {
      message.error('请选择工作流');
      return;
    }

    setLoading(true);
    
    // 模拟执行
    const execution = {
      id: `wf_${Date.now()}`,
      workflowId: selectedWorkflow,
      status: 'running',
      currentStep: 0,
      startTime: new Date(),
      results: {},
      progress: 0
    };

    setCurrentExecution(execution);
    setExecutions(prev => [...prev, execution]);

    // 模拟执行过程
    const workflow = DEFAULT_WORKFLOWS.find(w => w.id === selectedWorkflow);
    if (workflow) {
      for (let i = 0; i < workflow.steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟延迟
        
        execution.currentStep = i;
        execution.progress = Math.round(((i + 1) / workflow.steps.length) * 100);
        
        // 模拟生成结果
        if (i === 0) {
          execution.results.content = `这是根据"${values.topic}"生成的内容示例...`;
        } else if (i === 1) {
          execution.results.title = `关于${values.topic}的精彩标题`;
        } else if (i === 2) {
          execution.results.description = `这是一个关于${values.topic}的精彩描述，包含相关话题标签。`;
        }
        
        setCurrentExecution({ ...execution });
      }
      
      execution.status = 'completed';
      execution.endTime = new Date();
      setCurrentExecution({ ...execution });
      setExecutions(prev => prev.map(e => e.id === execution.id ? execution : e));
      
      message.success('工作流执行完成！');
      setLoading(false);
    }
  };

  // 复制结果
  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  // 获取工作流步骤
  const getWorkflowSteps = () => {
    if (!selectedWorkflow) return [];
    const workflow = DEFAULT_WORKFLOWS.find(w => w.id === selectedWorkflow);
    return workflow?.steps || [];
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'processing';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      default: return 'wait';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined />;
      case 'running': return <Spin size="small" />;
      case 'failed': return <ExclamationCircleOutlined />;
      case 'paused': return <PauseCircleOutlined />;
      default: return null;
    }
  };

  const workflow = DEFAULT_WORKFLOWS.find(w => w.id === selectedWorkflow);

  return (
    <div className={className}>
      <Card title="AI Studio 自动化工作流" bordered={false}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="工作流配置" key="1">
            <Form
              form={form}
              layout="vertical"
              onFinish={startWorkflow}
              initialValues={{
                style: '专业',
                audience: '普通用户',
                duration: 30
              }}
            >
              <Form.Item
                label="选择工作流"
                name="workflow"
                rules={[{ required: true, message: '请选择工作流' }]}
              >
                <Select
                  placeholder="请选择工作流"
                  onChange={setSelectedWorkflow}
                >
                  {DEFAULT_WORKFLOWS.map(workflow => (
                    <Select.Option key={workflow.id} value={workflow.id}>
                      {workflow.name} - {workflow.description}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {workflow && (
                <>
                  <Alert
                    message={workflow.description}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    label="主题/内容提示词"
                    name="topic"
                    rules={[{ required: true, message: '请输入主题或内容提示词' }]}
                  >
                    <TextArea
                      rows={3}
                      placeholder="请输入要创作的主题或内容提示词..."
                    />
                  </Form.Item>

                  <Form.Item
                    label="内容风格"
                    name="style"
                  >
                    <Select>
                      <Select.Option value="专业">专业</Select.Option>
                      <Select.Option value="轻松">轻松</Select.Option>
                      <Select.Option value="幽默">幽默</Select.Option>
                      <Select.Option value="正式">正式</Select.Option>
                      <Select.Option value="活泼">活泼</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label="目标受众"
                    name="audience"
                  >
                    <Select>
                      <Select.Option value="普通用户">普通用户</Select.Option>
                      <Select.Option value="专业人士">专业人士</Select.Option>
                      <Select.Option value="年轻人">年轻人</Select.Option>
                      <Select.Option value="学生">学生</Select.Option>
                      <Select.Option value="职场人士">职场人士</Select.Option>
                    </Select>
                  </Form.Item>

                  {workflow.id === 'video-production' && (
                    <Form.Item
                      label="视频时长（秒）"
                      name="duration"
                    >
                      <Input type="number" min={10} max={300} />
                    </Form.Item>
                  )}
                </>
              )}

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlayCircleOutlined />}
                    loading={loading}
                    disabled={!selectedWorkflow}
                  >
                    开始执行
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="执行进度" key="2">
            {currentExecution ? (
              <div>
                <Steps
                  current={currentExecution.currentStep}
                  status={getStatusColor(currentExecution.status)}
                  style={{ marginBottom: 24 }}
                >
                  {getWorkflowSteps().map((step, index) => (
                    <Step
                      key={step.id}
                      title={step.name}
                      description={step.description}
                      icon={getStatusIcon(
                        index < currentExecution.currentStep ? 'completed' :
                        index === currentExecution.currentStep ? currentExecution.status : 'wait'
                      )}
                    />
                  ))}
                </Steps>

                <Progress
                  percent={currentExecution.progress}
                  status={getStatusColor(currentExecution.status)}
                  style={{ marginBottom: 24 }}
                />

                {currentExecution.error && (
                  <Alert
                    message="执行错误"
                    description={currentExecution.error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={() => setShowResults(true)}
                  disabled={currentExecution.status !== 'completed'}
                >
                  查看结果
                </Button>
              </div>
            ) : (
              <Alert
                message="暂无执行中的工作流"
                type="info"
                showIcon
              />
            )}
          </TabPane>

          <TabPane tab="历史记录" key="3">
            {executions.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {executions.map(execution => {
                  const workflow = DEFAULT_WORKFLOWS.find(w => w.id === execution.workflowId);
                  return (
                    <Card key={execution.id} size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <Text strong>{workflow?.name}</Text>
                          <br />
                          <Text type="secondary">
                            {execution.startTime?.toLocaleString()}
                          </Text>
                        </div>
                        <div>
                          <Tag color={getStatusColor(execution.status)}>
                            {execution.status}
                          </Tag>
                          <Progress
                            percent={execution.progress}
                            size="small"
                            style={{ width: 100, marginLeft: 8 }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </Space>
            ) : (
              <Alert
                message="暂无执行记录"
                type="info"
                showIcon
              />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 结果展示模态框 */}
      <Modal
        title="工作流执行结果"
        visible={showResults}
        onCancel={() => setShowResults(false)}
        footer={[
          <Button key="close" onClick={() => setShowResults(false)}>
            关闭
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              message.info('导出功能开发中');
            }}
          >
            导出结果
          </Button>
        ]}
        width={800}
      >
        {currentExecution && (
          <Tabs defaultActiveKey="1">
            {Object.entries(currentExecution.results).map(([key, value]) => (
              <TabPane tab={getResultTabName(key)} key={key}>
                <div style={{ position: 'relative' }}>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    style={{ position: 'absolute', right: 0, top: 0 }}
                    onClick={() => copyResult(String(value))}
                  />
                  <Paragraph>{value}</Paragraph>
                </div>
              </TabPane>
            ))}
          </Tabs>
        )}
      </Modal>
    </div>
  );
};

// 获取结果标签页名称
function getResultTabName(key: string): string {
  const names: Record<string, string> = {
    content: '生成内容',
    title: '生成标题',
    description: '生成描述',
    videoScenes: '视频场景',
    coverPrompt: '封面提示词'
  };
  return names[key] || key;
}