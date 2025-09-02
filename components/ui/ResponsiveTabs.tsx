import React from 'react';
import { Tabs } from 'antd';
import { useUI } from '../../src/hooks';

interface ResponsiveTabsProps {
  items: {
    key: string;
    label: React.ReactNode;
    children: React.ReactNode;
    icon?: React.ReactNode;
  }[];
}

export const ResponsiveTabs: React.FC<ResponsiveTabsProps> = ({ items }) => {
  const { activeTab, setActiveTab, platform } = useUI();
  const isMobile = platform.isMobile;

  const tabItems = items.map((item) => ({
    key: item.key,
    label: (
      <div className="flex items-center gap-2">
        {item.icon}
        <span className={!isMobile ? '' : 'text-sm'}>{item.label}</span>
      </div>
    ),
    children: item.children,
  }));

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems}
      type={isMobile ? 'card' : 'line'}
      size={isMobile ? 'small' : 'middle'}
      centered={isMobile}
      className="w-full"
    />
  );
};