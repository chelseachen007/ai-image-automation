import React from 'react';
import { WorkflowRunner } from './components/WorkflowRunner';

// 新的自动化工作流组件
export function AutomationWorkflow() {
  return (
    <div className="automation-workflow">
      <WorkflowRunner />
    </div>
  );
}

export default AutomationWorkflow;