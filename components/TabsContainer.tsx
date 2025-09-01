import { useState } from "react"
import { Tabs, Typography } from "antd"
import { MessageOutlined, PictureOutlined, VideoCameraOutlined } from "@ant-design/icons"
import ChatTab from "./tabs/ChatTab"
import Text2ImageTab from "./tabs/Text2ImageTab"
import Image2VideoTab from "./tabs/Image2VideoTab"

const { Title } = Typography

interface TabsContainerProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * 主要标签页容器组件 - 包含聊天、文生图、图生视频三个功能模块
 */
function TabsContainer({ className, style }: TabsContainerProps) {
  const [activeTab, setActiveTab] = useState("chat")

  /**
   * 标签页配置
   */
  const tabItems = [
    {
      key: "chat",
      label: (
        <span>
          <MessageOutlined />
          聊天
        </span>
      ),
      children: <ChatTab />
    },
    {
      key: "text2image",
      label: (
        <span>
          <PictureOutlined />
          文生图
        </span>
      ),
      children: <Text2ImageTab />
    },
    {
      key: "image2video",
      label: (
        <span>
          <VideoCameraOutlined />
          图生视频
        </span>
      ),
      children: <Image2VideoTab />
    }
  ]

  /**
   * 处理标签页切换
   */
  const handleTabChange = (key: string) => {
    setActiveTab(key)
  }

  return (
    <div className={className} style={style}>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        tabPosition="top"
        animated={{ inkBar: true, tabPane: false }}
        style={{ height: '100%' }}
        tabBarStyle={{
          marginBottom: 16,
          borderBottom: '1px solid #f0f0f0'
        }}
      />
    </div>
  )
}

export default TabsContainer