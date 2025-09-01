import { useState } from "react"
import { Drawer, FloatButton, Input, Button, Space, Typography, Tag, Divider } from "antd"
import { PlusOutlined, CloseOutlined, SettingOutlined, ClearOutlined, SyncOutlined } from "@ant-design/icons"

const { Title, Text } = Typography

/**
 * 主弹窗组件 - 使用 Ant Design 实现悬浮球点击展示抽屉功能
 */
function IndexPopup() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [prefixPrompt, setPrefixPrompt] = useState("")
  const [suffixPrompt, setSuffixPrompt] = useState("")

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

  /**
   * 清空所有输入
   */
  const handleClear = () => {
    setPrefixPrompt("")
    setSuffixPrompt("")
  }

  /**
   * 处理变更操作
   */
  const handleChange = () => {
    // TODO: 实现变更逻辑
    console.log("变更操作，前缀:", prefixPrompt, "后缀:", suffixPrompt)
  }

  return (
    <>
      {/* Ant Design 悬浮球 - 常态显示在页面右侧 */}
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

      {/* Ant Design 抽屉组件 */}
      <Drawer
        title={
          <Title level={4} style={{ margin: 0 }}>
            AI 图片生成
          </Title>
        }
        placement="right"
        width={400}
        onClose={closeDrawer}
        open={isDrawerOpen}
        closeIcon={<CloseOutlined />}
        styles={{
          body: { padding: "24px" }
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 提示词前缀 */}
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              提示词前缀
            </Text>
            <Input
              placeholder="如 Romanticism, cinematic lighting, 输入 @ 使用变量"
              value={prefixPrompt}
              onChange={(e) => setPrefixPrompt(e.target.value)}
              size="large"
            />
          </div>

          {/* 提示词后缀 */}
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              提示词后缀
            </Text>
            <Input
              placeholder="如 high details, UHD, 输入 @ 使用变量"
              value={suffixPrompt}
              onChange={(e) => setSuffixPrompt(e.target.value)}
              size="large"
            />
          </div>

          {/* 图词匹配 */}
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              图词匹配
            </Text>
            <Space>
              <Tag color="blue" style={{ padding: "4px 12px", borderRadius: 16 }}>
                智能参考
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                参考强度: 默认
              </Text>
            </Space>
          </div>

          <Divider />

          {/* 操作按钮 */}
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              style={{ flex: 1 }}
            >
              清空
            </Button>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={handleChange}
              style={{ flex: 1, marginLeft: 8 }}
            >
              变更
            </Button>
            <Button
              icon={<SettingOutlined />}
              style={{ marginLeft: 8 }}
            />
          </Space>
        </Space>
      </Drawer>
    </>
  )
}

export default IndexPopup
