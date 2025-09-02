# LangChain 集成指南

## 概述

本指南将帮助你在 AI 图像自动化应用中集成 LangChain，提供更强大的对话能力、记忆管理、RAG 和工具调用等高级功能。

## 功能特性

### ✅ 已实现功能
1. **对话记忆管理** - 保存和利用对话历史
2. **提示词优化** - 自动优化图片/视频生成提示词
3. **智能图片分析** - 分析图片内容、风格和标签
4. **可配置系统** - 灵活的配置管理
5. **对话历史管理** - 完整的对话 CRUD 操作

### 🚧 待实现功能（需要安装 LangChain 后）
1. **真正的 LangChain 链式调用**
2. **RAG（检索增强生成）**
3. **工具/代理调用**
4. **文档处理**
5. **多模态链**

## 安装步骤

### 1. 安装依赖

```bash
# 进入项目目录
cd /Users/chenjie/Documents/study/github/ai-image-automation

# 安装 LangChain 核心包
npm install langchain
npm install @langchain/community
npm install @langchain/core

# 安装可选依赖（根据需要）
npm install @langchain/openai          # OpenAI 集成
npm install @langchain/google-genai    # Google Gemini 集成
npm install langchain/chroma           # 向量数据库
npm install pdf-parse                 # PDF 处理
npm install docx                      # Word 文档处理
```

### 2. 更新服务实现

取消注释 `src/services/langChainService.ts` 中的相关代码：

```typescript
// 取消注释这些导入
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages"
import { ConversationBufferMemory } from "langchain/memory"
import { LLMChain } from "langchain/chains"
import { PromptTemplate } from "@langchain/core/prompts"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

// 实现 initializeLangChainComponents 方法
private async initializeLangChainComponents(): Promise<void> {
  // 初始化 LLM
  this.llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    openAIApiKey: "your-api-key"
  })
  
  // 初始化记忆
  this.memory = new ConversationBufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
    maxTokenLimit: this.config.maxMemoryTokens
  })
  
  // 初始化工具
  this.initializeTools()
}
```

### 3. 集成到应用

将 `EnhancedChatTab` 组件添加到应用中：

```typescript
// 在你的主要路由或标签页配置中
import EnhancedChatTab from "./components/tabs/EnhancedChatTab"

// 添加到标签页列表
const tabs = [
  // ... 其他标签页
  {
    key: "enhanced-chat",
    label: "智能对话",
    children: <EnhancedChatTab />
  }
]
```

## 使用示例

### 1. 带记忆的对话

```typescript
// 使用 LangChain 服务进行带记忆的对话
const { response, conversationId } = await langChainService.chatWithMemory(
  "我上次问了你什么问题？",
  "conv_12345"  // 可选，不提供会创建新对话
)

console.log(response)  // 会包含之前的对话上下文
console.log(conversationId)  // 对话ID，可用于后续对话
```

### 2. 优化图片提示词

```typescript
const originalPrompt = "a cat"
const optimizedPrompt = await langChainService.optimizeImagePrompt(
  originalPrompt,
  "photorealistic"
)

console.log(optimizedPrompt)
// 输出: "A highly detailed photorealistic image of a cute cat sitting on a windowsill, 
// with soft natural lighting, fur texture clearly visible, expressive eyes, 
// shallow depth of field, professional photography, 8k resolution"
```

### 3. 智能图片分析

```typescript
const analysis = await langChainService.analyzeImage(
  "https://example.com/image.jpg",
  "description"
)

console.log(analysis)
// 输出: "这是一张美丽的日落照片，拍摄于海滩。画面中，太阳正缓缓沉入海平面，
// 天空呈现出橙红色和紫色的渐变。几只海鸟在远处飞翔，海面波光粼粼..."
```

## 高级用法

### 1. 自定义工具

```typescript
// 添加自定义工具
const weatherTool: LangChainTool = {
  name: "weather",
  description: "获取天气信息",
  func: async (location) => {
    // 调用天气 API
    const response = await fetch(`https://api.weather.com?location=${location}`)
    const data = await response.json()
    return `今天${location}的天气是${data.weather}`
  }
}

langChainService.addTool(weatherTool)
```

### 2. RAG 实现

```typescript
// 配置 RAG
await langChainService.updateConfig({
  enableRAG: true,
  ragConfig: {
    vectorStore: "chroma",
    documents: ["./docs/"],
    chunkSize: 1000,
    chunkOverlap: 200
  }
})
```

### 3. 自定义提示词模板

```typescript
await langChainService.updateConfig({
  customPrompts: {
    systemPrompt: `你是一个专业的 AI 艺术指导师，专门帮助用户创建出色的 AI 生成内容。
    你的回答应该富有创意、详细且实用。`,
    imagePromptOptimizer: `请将以下简单的图片描述转换为详细的 AI 生成提示词。
    包含以下要素：
    1. 主体描述（外观、表情、动作）
    2. 环境设置（背景、光线、氛围）
    3. 艺术风格（画风、色彩、构图）
    4. 技术参数（质量、细节、渲染）`,
    videoPromptOptimizer: `将以下视频描述转换为详细的视频生成提示词。
    包含场景转换、动态效果、镜头运动等元素。`
  }
})
```

## 架构说明

### 服务层架构

```
┌─────────────────┐
│   Components   │ (React 组件)
└─────────┬───────┘
          │
┌─────────▼───────┐
│ LangChainService │ (LangChain 服务层)
└─────────┬───────┘
          │
┌─────────▼───────┐
│   APIService    │ (现有 API 服务)
└─────────┬───────┘
          │
┌─────────▼───────┐
│ AI Engines      │ (各种 AI 引擎)
└─────────────────┘
```

### 数据流

1. **用户输入** → React 组件
2. **组件调用** → LangChain 服务
3. **LangChain 处理** → 记忆管理、工具调用、RAG
4. **API 调用** → 底层 AI 引擎
5. **响应返回** → 逐层返回给用户

## 性能优化

### 1. 记忆管理
- 自动清理过期对话
- 限制记忆 Token 数量
- 支持对话压缩

### 2. 缓存策略
- API 响应缓存
- 向量嵌入缓存
- 对话历史本地存储

### 3. 批量处理
- 支持批量提示词优化
- 并行工具调用
- 流式响应处理

## 注意事项

1. **API 密钥管理** - 确保 OpenAI 或其他服务的 API 密钥安全
2. **Token 限制** - 注意不同模型的 Token 限制
3. **成本控制** - LangChain 功能可能增加 API 调用成本
4. **浏览器兼容性** - 某些 LangChain 功能可能需要 polyfill
5. **存储限制** - 浏览器存储空间有限

## 故障排除

### 常见问题

1. **模块导入错误**
   ```bash
   # 重新安装依赖
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **内存溢出**
   - 减少 `maxMemoryTokens`
   - 启用对话清理

3. **API 调用失败**
   - 检查网络连接
   - 验证 API 密钥
   - 查看 API 限制

## 扩展开发

### 添加新的 AI 引擎支持

```typescript
// 在 langChainService.ts 中添加
async supportNewEngine(engineConfig: EngineConfig) {
  // 初始化新的引擎适配器
  const adapter = new EngineAdapter(engineConfig)
  this.adapters.set(engineConfig.type, adapter)
}
```

### 自定义链类型

```typescript
class CustomChain extends LLMChain {
  async customLogic(input: string): Promise<string> {
    // 自定义处理逻辑
    return processedInput
  }
}
```

## 结语

LangChain 的集成将大大提升你的 AI 应用的智能化水平。从简单的对话记忆到复杂的 RAG 系统，LangChain 提供了构建高级 AI 应用所需的所有工具。

根据你的具体需求，可以选择性地实现和启用各项功能。建议从基础的对话记忆开始，逐步添加更高级的功能。