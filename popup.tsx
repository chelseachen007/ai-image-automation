import { useState } from "react"
import { Drawer, FloatButton, Button } from "antd"
import { PlusOutlined, CloseOutlined, SettingOutlined } from "@ant-design/icons"
import { useUI } from "./src/hooks"
import TabsContainer from "./components/TabsContainer"

/**
 * 主弹窗组件 - 使用新的架构
 */
function IndexPopup() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { toggleSettings } = useUI()

  /**
   * 切换抽屉显示状态
   */
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  /**
   * 关闭抽屉
   */
  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  return (
    <>
      {/* Ant Design 悬浮球 */}
      <FloatButton
        icon={isDrawerOpen ? <CloseOutlined /> : <PlusOutlined />}
        onClick={toggleDrawer}
        style={{
          position: "fixed",
          top: "50%",
          right: 20,
          width: 60,
          height: 60,
          transform: `translateY(-50%) ${isDrawerOpen ? "rotate(45deg)" : "rotate(0deg)"}`,
          transition: "all 0.3s ease",
          zIndex: 9999
        }}
        type="primary"
      />

      {/* 主抽屉组件 */}
      <Drawer
        title="AI 自动化工具"
        placement="right"
        width={600}
        onClose={closeDrawer}
        open={isDrawerOpen}
        closeIcon={<CloseOutlined />}
        styles={{
          body: { padding: 0, height: '100%' }
        }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 主内容区域 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TabsContainer />
          </div>
          
          {/* 底部设置按钮 */}
          <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Button 
              icon={<SettingOutlined />} 
              onClick={toggleSettings}
              block
            >
              设置
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}

export default IndexPopup
