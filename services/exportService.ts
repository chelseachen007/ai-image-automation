import type { BatchTask } from '../components/BatchProcessor'
import { BatchTaskType } from '../components/BatchProcessor'

/**
 * 导出服务类 - 处理批量任务结果的导出功能
 */
class ExportService {
  /**
   * 导出批量任务结果到Excel
   */
  async exportToExcel(task: BatchTask): Promise<void> {
    try {
      // 准备导出数据
      const exportData = this.prepareExportData(task)
      
      // 创建CSV内容（简化版Excel格式）
      const csvContent = this.generateCSVContent(exportData, task.type)
      
      // 下载文件
      this.downloadFile(csvContent, `${task.name}_results.csv`, 'text/csv')
    } catch (error) {
      console.error('导出Excel失败:', error)
      throw new Error('导出Excel失败')
    }
  }

  /**
   * 导出批量任务结果到ZIP
   */
  async exportToZip(task: BatchTask): Promise<void> {
    try {
      // 对于包含文件的任务（如图片、视频），创建ZIP包
      if (task.type === BatchTaskType.TEXT_TO_IMAGE || task.type === BatchTaskType.IMAGE_TO_VIDEO) {
        await this.exportMediaToZip(task)
      } else {
        // 对于文本结果，导出为文本文件集合
        await this.exportTextToZip(task)
      }
    } catch (error) {
      console.error('导出ZIP失败:', error)
      throw new Error('导出ZIP失败')
    }
  }

  /**
   * 准备导出数据
   */
  private prepareExportData(task: BatchTask): any[] {
    return task.results.map((result, index) => {
      const baseData = {
        序号: index + 1,
        任务ID: task.id,
        任务名称: task.name,
        创建时间: new Date(task.createdAt).toLocaleString(),
        完成时间: task.completedAt ? new Date(task.completedAt).toLocaleString() : '未完成',
        状态: this.getStatusText(result.status)
      }

      // 根据任务类型添加特定数据
      switch (task.type) {
        case BatchTaskType.CHAT:
          return {
            ...baseData,
            问题: result.data?.prompt || result.data?.content || '',
            回答: result.result || '',
            错误信息: result.error || ''
          }
        
        case BatchTaskType.TEXT_TO_IMAGE:
          return {
            ...baseData,
            提示词: result.data?.prompt || '',
            图片数量: result.data?.count || 1,
            图片尺寸: result.data?.size || '',
            图片风格: result.data?.style || '',
            生成结果: Array.isArray(result.result) ? result.result.join(', ') : result.result || '',
            错误信息: result.error || ''
          }
        
        case BatchTaskType.IMAGE_TO_VIDEO:
          return {
            ...baseData,
            提示词: result.data?.prompt || '',
            源图片: result.data?.sourceImageUrl || '',
            视频数量: result.data?.count || 1,
            视频时长: result.data?.duration || 5,
            视频风格: result.data?.style || '',
            生成结果: Array.isArray(result.result) ? result.result.length + '个视频' : result.result || '',
            错误信息: result.error || ''
          }
        
        default:
          return {
            ...baseData,
            输入数据: JSON.stringify(result.data),
            输出结果: JSON.stringify(result.result),
            错误信息: result.error || ''
          }
      }
    })
  }

  /**
   * 生成CSV内容
   */
  private generateCSVContent(data: any[], taskType: BatchTaskType): string {
    if (data.length === 0) return ''

    // 获取表头
    const headers = Object.keys(data[0])
    
    // 生成CSV行
    const csvRows = [
      headers.join(','), // 表头
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || ''
          // 处理包含逗号或换行的值
          return typeof value === 'string' && (value.includes(',') || value.includes('\n')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }

  /**
   * 导出媒体文件到ZIP
   */
  private async exportMediaToZip(task: BatchTask): Promise<void> {
    // 由于浏览器环境限制，这里提供一个简化的实现
    // 实际项目中可能需要使用JSZip库或服务端处理
    
    const mediaUrls: string[] = []
    const textData: string[] = []

    task.results.forEach((result, index) => {
      if (result.result && Array.isArray(result.result)) {
        result.result.forEach((item: any) => {
          if (typeof item === 'string' && (item.startsWith('http') || item.startsWith('data:'))) {
            mediaUrls.push(item)
          } else if (item.url) {
            mediaUrls.push(item.url)
          }
        })
      }
      
      // 添加元数据
      textData.push(`任务${index + 1}:\n输入: ${JSON.stringify(result.data)}\n输出: ${JSON.stringify(result.result)}\n---\n`)
    })

    // 创建包含URL列表的文本文件
    const urlListContent = [
      `# ${task.name} - 媒体文件列表`,
      `生成时间: ${new Date().toLocaleString()}`,
      `总计文件: ${mediaUrls.length}个`,
      '',
      '## 文件URL列表:',
      ...mediaUrls.map((url, index) => `${index + 1}. ${url}`),
      '',
      '## 任务详情:',
      ...textData
    ].join('\n')

    this.downloadFile(urlListContent, `${task.name}_media_list.txt`, 'text/plain')
  }

  /**
   * 导出文本结果到ZIP
   */
  private async exportTextToZip(task: BatchTask): Promise<void> {
    const textContent = task.results.map((result, index) => {
      return [
        `=== 任务 ${index + 1} ===`,
        `输入: ${JSON.stringify(result.data, null, 2)}`,
        `输出: ${result.result || '无结果'}`,
        `状态: ${this.getStatusText(result.status)}`,
        result.error ? `错误: ${result.error}` : '',
        '\n'
      ].filter(Boolean).join('\n')
    }).join('\n')

    const fullContent = [
      `# ${task.name} - 批量处理结果`,
      `生成时间: ${new Date().toLocaleString()}`,
      `任务类型: ${this.getTaskTypeText(task.type)}`,
      `总计项目: ${task.totalItems}`,
      `完成项目: ${task.completedItems}`,
      `失败项目: ${task.failedItems}`,
      '',
      '## 详细结果:',
      textContent
    ].join('\n')

    this.downloadFile(fullContent, `${task.name}_results.txt`, 'text/plain')
  }

  /**
   * 下载文件
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理URL对象
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '等待中',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '失败'
    }
    return statusMap[status] || status
  }

  /**
   * 获取任务类型文本
   */
  private getTaskTypeText(type: BatchTaskType): string {
    const typeMap: Record<BatchTaskType, string> = {
      [BatchTaskType.CHAT]: '批量对话',
      [BatchTaskType.TEXT_TO_IMAGE]: '文本生成图片',
      [BatchTaskType.IMAGE_TO_VIDEO]: '图片生成视频'
    }
    return typeMap[type] || '未知类型'
  }

  /**
   * 导出任务统计报告
   */
  async exportStatisticsReport(tasks: BatchTask[]): Promise<void> {
    const reportData = {
      生成时间: new Date().toLocaleString(),
      任务总数: tasks.length,
      任务统计: tasks.map(task => ({
        任务名称: task.name,
        任务类型: this.getTaskTypeText(task.type),
        总计项目: task.totalItems,
        完成项目: task.completedItems,
        失败项目: task.failedItems,
        成功率: task.totalItems > 0 ? `${((task.completedItems / task.totalItems) * 100).toFixed(1)}%` : '0%',
        创建时间: new Date(task.createdAt).toLocaleString(),
        完成时间: task.completedAt ? new Date(task.completedAt).toLocaleString() : '未完成'
      })),
      总体统计: {
        总项目数: tasks.reduce((sum, task) => sum + task.totalItems, 0),
        总完成数: tasks.reduce((sum, task) => sum + task.completedItems, 0),
        总失败数: tasks.reduce((sum, task) => sum + task.failedItems, 0)
      }
    }

    const csvContent = this.generateStatisticsCSV(reportData)
    this.downloadFile(csvContent, `batch_tasks_report_${Date.now()}.csv`, 'text/csv')
  }

  /**
   * 生成统计报告CSV
   */
  private generateStatisticsCSV(reportData: any): string {
    const headers = ['任务名称', '任务类型', '总计项目', '完成项目', '失败项目', '成功率', '创建时间', '完成时间']
    const rows = reportData.任务统计.map((task: any) => [
      task.任务名称,
      task.任务类型,
      task.总计项目,
      task.完成项目,
      task.失败项目,
      task.成功率,
      task.创建时间,
      task.完成时间
    ])

    const csvRows = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ]

    return csvRows.join('\n')
  }
}

// 导出单例实例
export const exportService = new ExportService()
export default exportService