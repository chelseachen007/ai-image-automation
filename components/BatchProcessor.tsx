import React, { useState, useEffect, useCallback } from 'react';
import { Progress, Button, List, Card, Tag, Space, Modal, notification } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';

// 批量任务状态枚举
export enum BatchTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

// 批量任务类型枚举
export enum BatchTaskType {
  CHAT = 'chat',
  TEXT_TO_IMAGE = 'text_to_image',
  IMAGE_TO_VIDEO = 'image_to_video'
}

// 批量任务接口
export interface BatchTask {
  id: string;
  type: BatchTaskType;
  name: string;
  status: BatchTaskStatus;
  progress: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  data: any[]; // 任务数据数组
  results: any[]; // 结果数组
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// 批量处理器配置接口
export interface BatchProcessorConfig {
  maxConcurrent: number; // 最大并发数
  retryCount: number; // 重试次数
  retryDelay: number; // 重试延迟(ms)
  autoStart: boolean; // 自动开始
}

// 批量处理器属性接口
interface BatchProcessorProps {
  tasks: BatchTask[];
  config: BatchProcessorConfig;
  onTaskUpdate: (task: BatchTask) => void;
  onTaskComplete: (task: BatchTask) => void;
  onTaskFailed: (task: BatchTask, error: string) => void;
  onAllTasksComplete: (tasks: BatchTask[]) => void;
  processFunction: (taskType: BatchTaskType, item: any, taskId: string) => Promise<any>;
}

/**
 * 批量处理器组件
 * 提供队列管理、进度跟踪、任务调度等核心功能
 */
const BatchProcessor: React.FC<BatchProcessorProps> = ({
  tasks,
  config,
  onTaskUpdate,
  onTaskComplete,
  onTaskFailed,
  onAllTasksComplete,
  processFunction
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<BatchTask | null>(null);
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  /**
   * 开始处理批量任务
   */
  const startProcessing = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const pendingTasks = tasks.filter(task => task.status === BatchTaskStatus.PENDING);
    
    if (pendingTasks.length === 0) {
      setIsProcessing(false);
      notification.info({ message: '没有待处理的任务' });
      return;
    }

    // 开始处理任务队列
    for (const task of pendingTasks) {
      if (!isProcessing) break; // 如果已停止，退出循环
      
      await processTask(task);
    }
    
    setIsProcessing(false);
    onAllTasksComplete(tasks);
    notification.success({ message: '所有任务处理完成' });
  }, [tasks, isProcessing, processFunction]);

  /**
   * 处理单个批量任务
   */
  const processTask = async (task: BatchTask) => {
    setCurrentTask(task);
    
    // 更新任务状态为运行中
    const updatedTask = {
      ...task,
      status: BatchTaskStatus.RUNNING,
      startedAt: new Date(),
      progress: 0,
      completedItems: 0,
      failedItems: 0
    };
    onTaskUpdate(updatedTask);

    try {
      const results: any[] = [];
      const totalItems = task.data.length;
      
      // 并发处理任务项
      const semaphore = new Array(config.maxConcurrent).fill(null);
      let currentIndex = 0;
      
      const processItem = async (item: any, index: number): Promise<void> => {
        try {
          const result = await processFunction(task.type, item, task.id);
          results[index] = result;
          
          // 更新进度
          updatedTask.completedItems++;
          updatedTask.progress = Math.round((updatedTask.completedItems / totalItems) * 100);
          onTaskUpdate({ ...updatedTask });
          
        } catch (error) {
          updatedTask.failedItems++;
          results[index] = { error: error instanceof Error ? error.message : '处理失败' };
          
          // 重试逻辑
          if (config.retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, config.retryDelay));
            // 这里可以添加重试逻辑
          }
        }
      };

      // 并发处理
      const promises: Promise<void>[] = [];
      for (let i = 0; i < Math.min(config.maxConcurrent, totalItems); i++) {
        if (currentIndex < totalItems) {
          promises.push(processItem(task.data[currentIndex], currentIndex));
          currentIndex++;
        }
      }

      // 等待当前批次完成，然后处理下一批
      while (promises.length > 0) {
        await Promise.race(promises);
        
        // 移除已完成的promise，添加新的
        const completedIndex = promises.findIndex(p => p === undefined);
        if (completedIndex !== -1) {
          promises.splice(completedIndex, 1);
          
          if (currentIndex < totalItems) {
            promises.push(processItem(task.data[currentIndex], currentIndex));
            currentIndex++;
          }
        }
      }

      // 任务完成
      const finalTask = {
        ...updatedTask,
        status: BatchTaskStatus.COMPLETED,
        progress: 100,
        results,
        completedAt: new Date()
      };
      
      onTaskUpdate(finalTask);
      onTaskComplete(finalTask);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '任务处理失败';
      const failedTask = {
        ...updatedTask,
        status: BatchTaskStatus.FAILED,
        error: errorMessage,
        completedAt: new Date()
      };
      
      onTaskUpdate(failedTask);
      onTaskFailed(failedTask, errorMessage);
    }
  };

  /**
   * 暂停处理
   */
  const pauseProcessing = () => {
    setIsProcessing(false);
    if (currentTask) {
      const pausedTask = {
        ...currentTask,
        status: BatchTaskStatus.PAUSED
      };
      onTaskUpdate(pausedTask);
    }
  };

  /**
   * 停止处理
   */
  const stopProcessing = () => {
    setIsProcessing(false);
    setCurrentTask(null);
    
    // 将所有运行中的任务标记为已取消
    tasks.forEach(task => {
      if (task.status === BatchTaskStatus.RUNNING) {
        const cancelledTask = {
          ...task,
          status: BatchTaskStatus.CANCELLED
        };
        onTaskUpdate(cancelledTask);
      }
    });
  };

  /**
   * 删除任务
   */
  const deleteTask = (taskId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个批量任务吗？',
      onOk: () => {
        // 这里应该调用父组件的删除方法
        notification.success({ message: '任务已删除' });
      }
    });
  };

  /**
   * 获取状态标签颜色
   */
  const getStatusColor = (status: BatchTaskStatus): string => {
    switch (status) {
      case BatchTaskStatus.PENDING: return 'default';
      case BatchTaskStatus.RUNNING: return 'processing';
      case BatchTaskStatus.COMPLETED: return 'success';
      case BatchTaskStatus.FAILED: return 'error';
      case BatchTaskStatus.PAUSED: return 'warning';
      case BatchTaskStatus.CANCELLED: return 'default';
      default: return 'default';
    }
  };

  /**
   * 获取任务类型显示名称
   */
  const getTaskTypeName = (type: BatchTaskType): string => {
    switch (type) {
      case BatchTaskType.CHAT: return '批量对话';
      case BatchTaskType.TEXT_TO_IMAGE: return '批量文生图';
      case BatchTaskType.IMAGE_TO_VIDEO: return '批量图生视频';
      default: return '未知类型';
    }
  };

  return (
    <div className="batch-processor">
      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={startProcessing}
            disabled={isProcessing || tasks.length === 0}
            loading={isProcessing}
          >
            开始处理
          </Button>
          
          <Button
            icon={<PauseCircleOutlined />}
            onClick={pauseProcessing}
            disabled={!isProcessing}
          >
            暂停
          </Button>
          
          <Button
            icon={<StopOutlined />}
            onClick={stopProcessing}
            disabled={!isProcessing}
            danger
          >
            停止
          </Button>
          
          <span style={{ marginLeft: 16, color: '#666' }}>
            总任务数: {tasks.length} | 
            待处理: {tasks.filter(t => t.status === BatchTaskStatus.PENDING).length} | 
            进行中: {tasks.filter(t => t.status === BatchTaskStatus.RUNNING).length} | 
            已完成: {tasks.filter(t => t.status === BatchTaskStatus.COMPLETED).length}
          </span>
        </Space>
      </Card>

      {/* 任务列表 */}
      <List
        dataSource={tasks}
        renderItem={(task) => (
          <List.Item
            actions={[
              <Button
                size="small"
                onClick={() => setShowDetails(showDetails === task.id ? null : task.id)}
              >
                {showDetails === task.id ? '隐藏详情' : '查看详情'}
              </Button>,
              <Button
                size="small"
                icon={<DownloadOutlined />}
                disabled={task.status !== BatchTaskStatus.COMPLETED}
              >
                导出结果
              </Button>,
              <Button
                size="small"
                icon={<DeleteOutlined />}
                danger
                onClick={() => deleteTask(task.id)}
              >
                删除
              </Button>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span>{task.name}</span>
                  <Tag color={getStatusColor(task.status)}>
                    {task.status.toUpperCase()}
                  </Tag>
                  <Tag>{getTaskTypeName(task.type)}</Tag>
                </Space>
              }
              description={
                <div>
                  <div style={{ marginBottom: 8 }}>
                    总项目: {task.totalItems} | 
                    已完成: {task.completedItems} | 
                    失败: {task.failedItems}
                  </div>
                  <Progress 
                    percent={task.progress} 
                    size="small" 
                    status={task.status === BatchTaskStatus.FAILED ? 'exception' : 'normal'}
                  />
                  {showDetails === task.id && (
                    <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                      <p><strong>创建时间:</strong> {task.createdAt.toLocaleString()}</p>
                      {task.startedAt && <p><strong>开始时间:</strong> {task.startedAt.toLocaleString()}</p>}
                      {task.completedAt && <p><strong>完成时间:</strong> {task.completedAt.toLocaleString()}</p>}
                      {task.error && <p style={{ color: 'red' }}><strong>错误信息:</strong> {task.error}</p>}
                    </div>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default BatchProcessor;
export type { BatchProcessorProps };