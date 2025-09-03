import {
  MessageOutlined,
  PictureOutlined,
  RobotOutlined,
  VideoCameraOutlined
} from "@ant-design/icons"

import { ResponsiveTabs } from "../components/ui/ResponsiveTabs"
import ChatTab from "./tabs/ChatTab"
import Image2VideoTab from "./tabs/Image2VideoTab"
import Text2ImageTab from "./tabs/Text2ImageTab"
import { WorkflowRunner } from "./WorkflowRunner"

interface TabsContainerProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * 主要标签页容器组件 - 包含聊天、文生图、图生视频、自动化工作流四个功能模块
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
    },
    {
      key: "workflow",
      label: "自动化工作流",
      icon: <RobotOutlined />,
      children: <WorkflowRunner />
    }
  ]

  return (
    <div className={className} style={style}>
      <ResponsiveTabs items={tabItems} />
    </div>
  )
}

export default TabsContainer
