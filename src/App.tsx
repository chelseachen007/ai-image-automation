import React, { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useAppStore, useUI } from './src/hooks';
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { ResponsiveTabs } from './components/ui/ResponsiveTabs';
import ChatTab from './components/tabs/ChatTab';
import Text2ImageTab from './components/tabs/Text2ImageTab';
import Image2VideoTab from './components/tabs/Image2VideoTab';
import { MessageOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons';

const App: React.FC = () => {
  const { platform } = useUI();
  const { aiSources, addAISource } = useAppStore();

  useEffect(() => {
    // Initialize with default AI sources if none exist
    if (aiSources.length === 0) {
      addAISource({
        name: 'OpenAI GPT-4',
        type: 'openai',
        apiKey: '',
        enabled: true,
        models: ['gpt-4', 'gpt-4-turbo'],
      });
    }
  }, [aiSources.length, addAISource]);

  const tabItems = [
    {
      key: 'chat',
      label: '聊天',
      icon: <MessageOutlined />,
      children: <ChatTab />,
    },
    {
      key: 'text2image',
      label: '文生图',
      icon: <PictureOutlined />,
      children: <Text2ImageTab />,
    },
    {
      key: 'image2video',
      label: '图生视频',
      icon: <VideoCameraOutlined />,
      children: <Image2VideoTab />,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <ResponsiveLayout>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">AI 自动化工具</h1>
          <ResponsiveTabs items={tabItems} />
        </div>
      </ResponsiveLayout>
    </ConfigProvider>
  );
};

export default App;