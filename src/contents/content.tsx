import {
  BulbOutlined,
  CloseOutlined,
  PlusOutlined,
  SettingOutlined
} from "@ant-design/icons"
import { Button, Drawer, message, Space, Typography } from "antd"
import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

import PromptModal from "../../components/PromptModal"
import SettingsModal from "../../components/SettingsModal"
import TabsContainer from "../../components/TabsContainer"

const { Title, Text } = Typography

// 存储实例
const storage = new Storage()

// 提示词模板类型
interface PromptTemplate {
  id: string
  name: string
  prefixPrompt: string
  suffixPrompt: string
  description?: string
  createdAt: number
  updatedAt: number
}

/**
 * 内容脚本 UI 组件 - 在网页中注入悬浮球和抽屉功能
 */
function ContentUI() {
  // 状态管理
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    string | undefined
  >(undefined)

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
   * 组件挂载时加载提示词模板
   */
  useEffect(() => {
    loadPromptTemplates()
  }, [])

  /**
   * 当抽屉打开时重新加载模板
   */
  useEffect(() => {
    if (isDrawerOpen) {
      loadPromptTemplates()
    }
  }, [isDrawerOpen])

  /**
   * 打开设置模态框
   */
  const openSettings = () => {
    setIsSettingsOpen(true)
  }

  /**
   * 关闭设置模态框
   */
  const closeSettings = () => {
    setIsSettingsOpen(false)
  }

  /**
   * 打开提示词模态框
   */
  const openPromptModal = () => {
    setIsPromptModalOpen(true)
  }

  /**
   * 关闭提示词模态框
   */
  const closePromptModal = () => {
    setIsPromptModalOpen(false)
  }

  /**
   * 加载提示词模板
   */
  const loadPromptTemplates = async () => {
    try {
      const templates =
        ((await storage.get("prompt_templates")) as PromptTemplate[]) || []
      setPromptTemplates(templates)
    } catch (error) {
      console.error("加载提示词模板失败:", error)
    }
  }

  /**
   * 选择提示词模板
   */
  const handleSelectPrompt = (template: PromptTemplate) => {
    setSelectedTemplateId(template.id)
    message.success(`已选择模板：${template.name}`)
  }

  /**
   * 清除选中的模板
   */
  const clearSelectedTemplate = () => {
    setSelectedTemplateId(undefined)
  }

  return (
    <>
      {/* 悬浮球 */}
      <div
        onClick={toggleDrawer}
        style={{
          position: "fixed",
          top: "50%",
          right: 20,
          width: 60,
          height: 60,
          backgroundColor: "#1890ff",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          transform: `translateY(-50%) ${isDrawerOpen ? "rotate(45deg)" : "rotate(0deg)"}`,
          transition: "all 0.3s ease",
          zIndex: 999999,
          color: "white",
          fontSize: "24px",
          userSelect: "none"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#40a9ff"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#1890ff"
        }}>
        {isDrawerOpen ? <CloseOutlined /> : <PlusOutlined />}
      </div>

      {/* 抽屉 */}
      <Drawer
        title={
          <Title level={4} style={{ margin: 0 }}>
            AI 多功能工具
          </Title>
        }
        placement="right"
        width={500}
        onClose={closeDrawer}
        open={isDrawerOpen}
        closeIcon={<CloseOutlined />}
        styles={{
          body: { padding: "24px" }
        }}
        getContainer={() => document.body}
        style={{ zIndex: 999998 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 顶部操作按钮 */}
          <Space style={{ marginBottom: 16 }}>
            <Button
              icon={<SettingOutlined />}
              onClick={openSettings}
              type="default">
              设置
            </Button>
            <Button
              icon={<BulbOutlined />}
              onClick={openPromptModal}
              type="default">
              提示词模板
            </Button>
          </Space>

          {/* 集成 TabsContainer */}
          <TabsContainer />
        </Space>
      </Drawer>

      {/* 设置模态框 */}
      <SettingsModal visible={isSettingsOpen} onClose={closeSettings} />

      {/* 提示词模态框 */}
      <PromptModal
        visible={isPromptModalOpen}
        onClose={closePromptModal}
        onSelectPrompt={handleSelectPrompt}
      />
    </>
  )
}

export default ContentUI
