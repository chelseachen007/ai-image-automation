import React from 'react';
import { Card, Alert } from 'antd';

export const WorkflowRunner: React.FC = () => {
  return (
    <div>
      <Card title="AI Studio 自动化工作流" bordered={false}>
        <Alert
          message="功能开发中"
          description="自动化工作流功能正在开发中，敬请期待！"
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};