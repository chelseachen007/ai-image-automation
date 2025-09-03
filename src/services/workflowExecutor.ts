import { 
  WorkflowConfig, 
  WorkflowExecution, 
  WorkflowStepParams,
  DEFAULT_WORKFLOWS 
} from '../config/workflows';
import { getEngine, AIEngineType, AISource } from '../config/engines';
import { createEngineAdapter } from './engines/engineAdapters';

/**
 * 工作流执行器
 * 负责按顺序执行工作流的各个步骤
 */
export class WorkflowExecutor {
  private executions: Map<string, WorkflowExecution> = new Map();
  private onProgress?: (execution: WorkflowExecution) => void;
  private onComplete?: (execution: WorkflowExecution) => void;
  private onError?: (execution: WorkflowExecution, error: Error) => void;

  constructor(
    private options: {
      onProgress?: (execution: WorkflowExecution) => void;
      onComplete?: (execution: WorkflowExecution) => void;
      onError?: (execution: WorkflowExecution, error: Error) => void;
    } = {}
  ) {
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }

  /**
   * 启动工作流执行
   */
  async execute(
    workflowId: string, 
    params: WorkflowStepParams
  ): Promise<WorkflowExecution> {
    // 查找工作流配置
    const workflow = DEFAULT_WORKFLOWS.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error(`工作流 ${workflowId} 未找到`);
    }

    // 创建执行实例
    const execution: WorkflowExecution = {
      id: this.generateId(),
      workflowId,
      status: 'pending',
      currentStep: 0,
      results: {},
      progress: 0
    };

    this.executions.set(execution.id, execution);

    try {
      // 异步执行工作流
      this.runWorkflow(workflow, execution, params).catch(error => {
        console.error('工作流执行失败:', error);
      });

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : '未知错误';
      this.onError?.(execution, error as Error);
      throw error;
    }
  }

  /**
   * 异步运行工作流
   */
  private async runWorkflow(
    workflow: WorkflowConfig,
    execution: WorkflowExecution,
    params: WorkflowStepParams
  ): Promise<void> {
    execution.status = 'running';
    execution.startTime = new Date();
    this.onProgress?.(execution);

    // TODO: 从配置中获取API密钥，这里需要根据实际情况调整
    const source: AISource = {
      id: 'default',
      name: workflow.engine,
      type: workflow.engine as AIEngineType,
      apiKey: process.env.PLASMO_PUBLIC_API_KEY || 'your-api-key-here',
      isDefault: true
    };
    
    const adapter = createEngineAdapter(workflow.engine as AIEngineType, source);

    try {
      // 按顺序执行每个步骤
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        
        // 检查依赖是否满足
        if (step.dependencies) {
          for (const dep of step.dependencies) {
            if (!execution.results[dep]) {
              throw new Error(`依赖步骤 ${dep} 未完成`);
            }
          }
        }

        // 更新当前步骤
        execution.currentStep = i;
        execution.progress = Math.round((i / workflow.steps.length) * 100);
        this.onProgress?.(execution);

        // 执行步骤
        const result = await this.executeStep(step, adapter, execution.results, params);
        execution.results[step.outputKey] = result;
      }

      // 工作流完成
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.progress = 100;
      this.onComplete?.(execution);
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : '未知错误';
      this.onError?.(execution, error as Error);
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(
    step: any,
    adapter: EngineAdapter,
    previousResults: Record<string, any>,
    params: WorkflowStepParams
  ): Promise<any> {
    // 准备提示词
    let prompt = step.template || '';
    
    // 替换模板变量
    const templateData = {
      ...params,
      ...previousResults,
      content: previousResults.content || '',
      title: previousResults.title || ''
    };

    Object.entries(templateData).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    // 根据步骤类型调用相应的AI功能
    switch (step.promptType) {
      case 'content':
      case 'title':
      case 'description':
        // 使用文本生成功能
        const textResponse = await adapter.generateText({
          prompt,
          model: step.model || 'default',
          temperature: 0.7,
          maxTokens: 1000
        });
        return textResponse.content;

      case 'cover':
        // 生成封面图提示词
        const coverPrompt = await adapter.generateText({
          prompt,
          model: step.model || 'default',
          temperature: 0.8
        });
        return coverPrompt.content;

      case 'video':
        // 生成视频场景描述
        const videoScenes = await adapter.generateText({
          prompt,
          model: step.model || 'default',
          temperature: 0.7
        });
        return videoScenes.content;

      default:
        throw new Error(`未知的步骤类型: ${step.promptType}`);
    }
  }

  /**
   * 暂停工作流执行
   */
  pause(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';
      return true;
    }
    return false;
  }

  /**
   * 恢复工作流执行
   */
  async resume(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'paused') {
      return false;
    }

    // TODO: 实现恢复逻辑
    return false;
  }

  /**
   * 取消工作流执行
   */
  cancel(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && (execution.status === 'running' || execution.status === 'paused')) {
      execution.status = 'failed';
      execution.error = '用户取消';
      return true;
    }
    return false;
  }

  /**
   * 获取执行状态
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * 获取所有执行记录
   */
  getExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建全局工作流执行器实例
export const workflowExecutor = new WorkflowExecutor();