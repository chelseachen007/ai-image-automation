import React from 'react';
import { Layout } from 'antd';
import { useUI } from '../hooks';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
}) => {
  const { platform } = useUI();
  const isMobile = platform.isMobile;

  if (isMobile) {
    return (
      <Layout className="h-screen flex flex-col">
        {header && <Layout.Header className="bg-white p-4 shadow-sm">{header}</Layout.Header>}
        <Layout className="flex-1 overflow-hidden">
          {sidebar && (
            <Layout.Sider
              width={280}
              className="bg-white shadow-lg"
              breakpoint="lg"
              collapsedWidth={0}
            >
              {sidebar}
            </Layout.Sider>
          )}
          <Layout.Content className="overflow-auto p-4">{children}</Layout.Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout className="h-screen">
      {header && <Layout.Header className="bg-white shadow-sm">{header}</Layout.Header>}
      <Layout>
        {sidebar && (
          <Layout.Sider width={280} className="bg-white shadow-md">
            {sidebar}
          </Layout.Sider>
        )}
        <Layout.Content className="overflow-auto bg-gray-50">{children}</Layout.Content>
      </Layout>
    </Layout>
  );
};