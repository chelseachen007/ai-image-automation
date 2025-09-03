/**
 * AI Studio 自动化工作流配置
 * 定义了内容创作到发布的完整自动化流程
 */

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  promptType: 'content' | 'title' | 'description' | 'cover' | 'video';
  template?: string;
  dependencies?: string[];
  outputKey: string;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  engine: string; // 使用的AI引擎
  model?: string; // 指定模型
}

// 预设的提示词模板
export const PROMPT_TEMPLATES = {
  content: `请根据以下主题创作一篇吸引人的内容：

主题：{topic}
要求：
- 字数控制在300-500字
- 语言风格：{style}
- 目标受众：{audience}
- 包含2-3个关键点
- 结构清晰，有开头、主体、结尾

请直接输出内容，不需要额外说明。`,

  title: `请为以下内容生成一个吸引人的标题：

内容：{content}
要求：
- 标题长度在10-20字之间
- 突出核心价值点
- 使用吸引眼球的词汇
- 适合社交媒体传播

请提供3个选项，按推荐度排序。`,

  description: `请为以下内容生成一个引人入胜的描述：

内容：{content}
标题：{title}
要求：
- 描述长度在50-100字之间
- 突出内容的亮点和价值
- 使用相关的话题标签
- 包含行动号召

请直接输出描述内容。`,

  cover: `请为以下内容生成封面图提示词：

标题：{title}
内容主题：{content}
风格要求：{style}
要求：
- 详细的视觉描述
- 色彩搭配建议
- 构图和布局说明
- 适合作为封面图的尺寸比例

请提供专业的AI绘画提示词。`,

  video: `请将以下内容转换为一键成片的画面提示词：

内容：{content}
风格：{style}
时长：{duration}秒
要求：
- 每个镜头的详细描述
- 画面转场效果
- 背景音乐建议
- 文字显示时机和位置

请按时间序列输出每个镜头的描述。`
};

// 预设工作流配置
export const DEFAULT_WORKFLOWS: WorkflowConfig[] = [
  {
    id: 'content-creation',
    name: '内容创作工作流',
    description: '从主题到完整内容的自动化创作流程',
    engine: 'doubao',
    steps: [
      {
        id: 'generate-content',
        name: '生成内容',
        description: '根据主题提示词生成文章内容',
        promptType: 'content',
        template: PROMPT_TEMPLATES.content,
        outputKey: 'content'
      },
      {
        id: 'generate-title',
        name: '生成标题',
        description: '根据内容生成吸引人的标题',
        promptType: 'title',
        template: PROMPT_TEMPLATES.title,
        dependencies: ['generate-content'],
        outputKey: 'title'
      },
      {
        id: 'generate-description',
        name: '生成描述',
        description: '生成内容描述和话题标签',
        promptType: 'description',
        template: PROMPT_TEMPLATES.description,
        dependencies: ['generate-content', 'generate-title'],
        outputKey: 'description'
      }
    ]
  },
  {
    id: 'video-production',
    name: '视频制作工作流',
    description: '内容到视频的完整制作流程',
    engine: 'jimeng',
    steps: [
      {
        id: 'generate-content',
        name: '生成内容',
        description: '根据主题提示词生成视频脚本',
        promptType: 'content',
        template: PROMPT_TEMPLATES.content,
        outputKey: 'content'
      },
      {
        id: 'generate-video-scenes',
        name: '生成画面',
        description: '将内容转换为一键成片的画面描述',
        promptType: 'video',
        template: PROMPT_TEMPLATES.video,
        dependencies: ['generate-content'],
        outputKey: 'videoScenes'
      },
      {
        id: 'generate-title',
        name: '生成标题',
        description: '生成视频标题',
        promptType: 'title',
        template: PROMPT_TEMPLATES.title,
        dependencies: ['generate-content'],
        outputKey: 'title'
      },
      {
        id: 'generate-description',
        name: '生成描述',
        description: '生成视频描述和话题标签',
        promptType: 'description',
        template: PROMPT_TEMPLATES.description,
        dependencies: ['generate-content', 'generate-title'],
        outputKey: 'description'
      },
      {
        id: 'generate-cover',
        name: '生成封面',
        description: '生成视频封面图提示词',
        promptType: 'cover',
        template: PROMPT_TEMPLATES.cover,
        dependencies: ['generate-title', 'generate-content'],
        outputKey: 'coverPrompt'
      }
    ]
  }
];

// 工作流执行状态
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  startTime?: Date;
  endTime?: Date;
  results: Record<string, any>;
  error?: string;
  progress: number;
}

// 工作流步骤参数
export interface WorkflowStepParams {
  topic?: string;
  style?: string;
  audience?: string;
  duration?: number;
  [key: string]: any;
}