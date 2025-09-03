# AI Studio 自动化工作流 - 实现说明

## 实现的功能

### 1. 工作流配置系统 (`src/config/workflows.ts`)
- 定义了两种预设工作流：内容创作和视频制作
- 支持自定义提示词模板
- 灵活的步骤依赖关系配置

### 2. 工作流执行器 (`src/services/workflowExecutor.ts`)
- 异步执行工作流步骤
- 支持暂停、恢复、取消操作
- 实时进度跟踪和状态管理
- 错误处理和重试机制

### 3. 工作流界面 (`components/WorkflowRunner.tsx`)
- 直观的配置界面
- 实时进度展示
- 结果查看和导出
- 执行历史记录

### 4. AI引擎适配器 (`src/services/engines/engineAdapters.ts`)
- 统一的AI引擎接口
- 支持多种AI引擎（豆包、即梦、OpenAI等）
- 可扩展的适配器架构

## 核心架构

### 工作流执行流程
1. 用户选择工作流并配置参数
2. 系统创建执行实例
3. 按顺序执行各个步骤
4. 每个步骤调用相应的AI功能
5. 收集并展示结果

### 数据流
```
用户输入 → 工作流配置 → 步骤执行 → AI调用 → 结果收集 → 展示
```

## 使用示例

### 基本使用
```tsx
import { WorkflowRunner } from './components/WorkflowRunner';

function App() {
  return <WorkflowRunner />;
}
```

### 编程式使用
```tsx
import { workflowExecutor } from './services/workflowExecutor';

// 启动工作流
const execution = await workflowExecutor.execute('content-creation', {
  topic: '人工智能的发展趋势',
  style: '专业',
  audience: '技术人员'
});
```

## 扩展指南

### 添加新的工作流
1. 在 `workflows.ts` 中定义新的 `WorkflowConfig`
2. 添加相应的提示词模板
3. 在界面中添加选择选项

### 集成新的AI引擎
1. 创建新的引擎适配器类
2. 实现 `EngineAdapter` 接口
3. 在 `engineAdapters.ts` 中注册

### 自定义步骤类型
1. 扩展 `promptType` 类型
2. 在执行器中添加处理逻辑
3. 更新界面展示逻辑