import { ResponsiveTabs } from "../components/ui/ResponsiveTabs"
import { MessageOutlined, PictureOutlined, VideoCameraOutlined } from "@ant-design/icons"
import ChatTab from "./tabs/ChatTab"
import Text2ImageTab from "./tabs/Text2ImageTab"
import Image2VideoTab from "./tabs/Image2VideoTab"

interface TabsContainerProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * 主要标签页容器组件 - 包含聊天、文生图、图生视频三个功能模块
 */
function TabsContainer({ className, style }: TabsContainerProps) {
  const tabItems = [
    {
      key: "chat",
      label: "聊天",
      icon: <MessageOutlined />,
      children: <ChatTab />
    },
    {
      key: "text2image",
      label: "文生图",
      icon: <PictureOutlined />,
      children: <Text2ImageTab />
    },
    {
      key: "image2video",
      label: "图生视频",
      icon: <VideoCameraOutlined />,
      children: <Image2VideoTab />
    }
  ]

  return (
    <div className={className} style={style}>
      <ResponsiveTabs items={tabItems} />
    </div>
  )
}

export default TabsContainer