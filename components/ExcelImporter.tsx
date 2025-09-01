import React, { useState, useCallback } from 'react';
import { Upload, Button, Table, Card, Select, Space, Alert, Modal, notification } from 'antd';
import { UploadOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { BatchTaskType } from './BatchProcessor';

const { Option } = Select;
const { Dragger } = Upload;

// Excel数据行接口
export interface ExcelDataRow {
  [key: string]: any;
}

// 导入配置接口
export interface ImportConfig {
  taskType: BatchTaskType;
  columnMapping: { [key: string]: string }; // Excel列名到字段名的映射
  requiredFields: string[]; // 必需字段
  defaultValues: { [key: string]: any }; // 默认值
}

// 预定义的导入模板
const IMPORT_TEMPLATES: { [key in BatchTaskType]: ImportConfig } = {
  [BatchTaskType.CHAT]: {
    taskType: BatchTaskType.CHAT,
    columnMapping: {
      '问题': 'question',
      '上下文': 'context',
      '系统提示': 'systemPrompt',
      '温度': 'temperature',
      '最大长度': 'maxLength'
    },
    requiredFields: ['question'],
    defaultValues: {
      temperature: 0.7,
      maxLength: 2000
    }
  },
  [BatchTaskType.TEXT_TO_IMAGE]: {
    taskType: BatchTaskType.TEXT_TO_IMAGE,
    columnMapping: {
      '提示词': 'prompt',
      '负面提示词': 'negativePrompt',
      '尺寸': 'size',
      '数量': 'count',
      '风格': 'style',
      '质量': 'quality'
    },
    requiredFields: ['prompt'],
    defaultValues: {
      size: '1024x1024',
      count: 1,
      quality: 'standard'
    }
  },
  [BatchTaskType.IMAGE_TO_VIDEO]: {
    taskType: BatchTaskType.IMAGE_TO_VIDEO,
    columnMapping: {
      '图片路径': 'imagePath',
      '图片URL': 'imageUrl',
      '描述': 'description',
      '时长': 'duration',
      '数量': 'count',
      '风格': 'style'
    },
    requiredFields: ['imagePath', 'imageUrl'],
    defaultValues: {
      duration: 5,
      count: 1
    }
  }
};

// Excel导入器属性接口
interface ExcelImporterProps {
  onImportComplete: (data: ExcelDataRow[], config: ImportConfig) => void;
  onImportError: (error: string) => void;
}

/**
 * Excel导入器组件
 * 支持解析批量任务数据，包括聊天、文生图、图生视频等类型
 */
const ExcelImporter: React.FC<ExcelImporterProps> = ({
  onImportComplete,
  onImportError
}) => {
  const [selectedTaskType, setSelectedTaskType] = useState<BatchTaskType>(BatchTaskType.CHAT);
  const [importedData, setImportedData] = useState<ExcelDataRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  /**
   * 解析Excel文件
   */
  const parseExcelFile = useCallback(async (file: File): Promise<ExcelDataRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // 这里使用简化的CSV解析，实际项目中应该使用xlsx库
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('文件内容不足，至少需要标题行和一行数据'));
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const data: ExcelDataRow[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row: ExcelDataRow = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            data.push(row);
          }
          
          setAvailableColumns(headers);
          resolve(data);
          
        } catch (error) {
          reject(new Error('文件解析失败: ' + (error instanceof Error ? error.message : '未知错误')));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }, []);

  /**
   * 处理文件上传
   */
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    setUploading(true);
    
    try {
      const data = await parseExcelFile(file as File);
      setImportedData(data);
      
      // 自动映射列名
      const template = IMPORT_TEMPLATES[selectedTaskType];
      const autoMapping: { [key: string]: string } = {};
      
      Object.entries(template.columnMapping).forEach(([excelCol, fieldName]) => {
        const matchedColumn = availableColumns.find(col => 
          col.toLowerCase().includes(excelCol.toLowerCase()) ||
          excelCol.toLowerCase().includes(col.toLowerCase())
        );
        if (matchedColumn) {
          autoMapping[matchedColumn] = fieldName;
        }
      });
      
      setColumnMapping(autoMapping);
      setIsModalVisible(true);
      
      onSuccess?.(data);
      notification.success({ message: `成功导入 ${data.length} 行数据` });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入失败';
      onError?.(new Error(errorMessage));
      onImportError(errorMessage);
      notification.error({ message: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  /**
   * 验证导入数据
   */
  const validateImportData = (): { valid: boolean; errors: string[] } => {
    const template = IMPORT_TEMPLATES[selectedTaskType];
    const errors: string[] = [];
    
    // 检查必需字段映射
    template.requiredFields.forEach(field => {
      const mappedColumn = Object.entries(columnMapping).find(([_, mappedField]) => mappedField === field);
      if (!mappedColumn) {
        errors.push(`缺少必需字段映射: ${field}`);
      }
    });
    
    // 检查数据完整性
    importedData.forEach((row, index) => {
      template.requiredFields.forEach(field => {
        const columnName = Object.entries(columnMapping).find(([_, mappedField]) => mappedField === field)?.[0];
        if (columnName && (!row[columnName] || row[columnName].toString().trim() === '')) {
          errors.push(`第 ${index + 2} 行缺少必需字段: ${field}`);
        }
      });
    });
    
    return { valid: errors.length === 0, errors };
  };

  /**
   * 确认导入
   */
  const confirmImport = () => {
    const validation = validateImportData();
    
    if (!validation.valid) {
      Modal.error({
        title: '数据验证失败',
        content: (
          <div>
            <p>发现以下问题:</p>
            <ul>
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )
      });
      return;
    }
    
    // 转换数据格式
    const template = IMPORT_TEMPLATES[selectedTaskType];
    const transformedData = importedData.map(row => {
      const transformed: any = { ...template.defaultValues };
      
      Object.entries(columnMapping).forEach(([columnName, fieldName]) => {
        if (row[columnName] !== undefined && row[columnName] !== '') {
          transformed[fieldName] = row[columnName];
        }
      });
      
      return transformed;
    });
    
    onImportComplete(transformedData, template);
    setIsModalVisible(false);
    setImportedData([]);
    setColumnMapping({});
    notification.success({ message: '数据导入成功' });
  };

  /**
   * 下载模板文件
   */
  const downloadTemplate = () => {
    const template = IMPORT_TEMPLATES[selectedTaskType];
    const headers = Object.keys(template.columnMapping);
    
    // 创建示例数据
    const exampleData = getExampleData(selectedTaskType);
    
    // 生成CSV内容
    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n');
    
    // 下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getTaskTypeName(selectedTaskType)}_模板.csv`;
    link.click();
  };

  /**
   * 获取示例数据
   */
  const getExampleData = (taskType: BatchTaskType): string[] => {
    switch (taskType) {
      case BatchTaskType.CHAT:
        return ['你好，请介绍一下人工智能', '技术背景', '你是一个AI助手', '0.7', '2000'];
      case BatchTaskType.TEXT_TO_IMAGE:
        return ['一只可爱的小猫在花园里玩耍', '模糊，低质量', '1024x1024', '1', '写实', 'standard'];
      case BatchTaskType.IMAGE_TO_VIDEO:
        return ['/path/to/image.jpg', 'https://example.com/image.jpg', '小猫在花园里奔跑', '5', '1', '自然'];
      default:
        return [];
    }
  };

  /**
   * 获取任务类型显示名称
   */
  const getTaskTypeName = (taskType: BatchTaskType): string => {
    switch (taskType) {
      case BatchTaskType.CHAT: return '批量对话';
      case BatchTaskType.TEXT_TO_IMAGE: return '批量文生图';
      case BatchTaskType.IMAGE_TO_VIDEO: return '批量图生视频';
      default: return '未知类型';
    }
  };

  // 预览表格列配置
  const previewColumns = availableColumns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    width: 150,
    ellipsis: true,
    render: (text: any) => text?.toString() || '-'
  }));

  return (
    <div className="excel-importer">
      <Card title="Excel批量导入" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 任务类型选择 */}
          <div>
            <label style={{ marginRight: 8 }}>任务类型:</label>
            <Select
              value={selectedTaskType}
              onChange={setSelectedTaskType}
              style={{ width: 200 }}
            >
              <Option value={BatchTaskType.CHAT}>批量对话</Option>
              <Option value={BatchTaskType.TEXT_TO_IMAGE}>批量文生图</Option>
              <Option value={BatchTaskType.IMAGE_TO_VIDEO}>批量图生视频</Option>
            </Select>
            
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadTemplate}
              style={{ marginLeft: 8 }}
            >
              下载模板
            </Button>
          </div>

          {/* 文件上传 */}
          <Dragger
            accept=".csv,.xlsx,.xls"
            customRequest={handleUpload}
            showUploadList={false}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <FileExcelOutlined />
            </p>
            <p className="ant-upload-text">
              点击或拖拽Excel文件到此区域上传
            </p>
            <p className="ant-upload-hint">
              支持 .csv, .xlsx, .xls 格式文件
            </p>
          </Dragger>

          {/* 使用说明 */}
          <Alert
            message="使用说明"
            description={
              <div>
                <p>1. 选择对应的任务类型</p>
                <p>2. 下载对应的Excel模板文件</p>
                <p>3. 按照模板格式填写数据</p>
                <p>4. 上传填写好的Excel文件</p>
                <p>5. 确认字段映射后完成导入</p>
              </div>
            }
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* 数据预览和字段映射模态框 */}
      <Modal
        title="数据预览和字段映射"
        open={isModalVisible}
        onOk={confirmImport}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        okText="确认导入"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 字段映射 */}
          <Card title="字段映射" size="small">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {Object.entries(IMPORT_TEMPLATES[selectedTaskType].columnMapping).map(([excelCol, fieldName]) => (
                <div key={fieldName}>
                  <label style={{ display: 'block', marginBottom: 4 }}>
                    {fieldName} {IMPORT_TEMPLATES[selectedTaskType].requiredFields.includes(fieldName) && <span style={{ color: 'red' }}>*</span>}
                  </label>
                  <Select
                    value={Object.entries(columnMapping).find(([_, field]) => field === fieldName)?.[0]}
                    onChange={(value) => {
                      const newMapping = { ...columnMapping };
                      // 移除旧映射
                      Object.keys(newMapping).forEach(key => {
                        if (newMapping[key] === fieldName) {
                          delete newMapping[key];
                        }
                      });
                      // 添加新映射
                      if (value) {
                        newMapping[value] = fieldName;
                      }
                      setColumnMapping(newMapping);
                    }}
                    placeholder={`选择对应的Excel列 (建议: ${excelCol})`}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    {availableColumns.map(col => (
                      <Option key={col} value={col}>{col}</Option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </Card>

          {/* 数据预览 */}
          <Card title={`数据预览 (共 ${importedData.length} 行)`} size="small">
            <Table
              columns={previewColumns}
              dataSource={importedData.slice(0, 5)} // 只显示前5行
              pagination={false}
              scroll={{ x: true, y: 200 }}
              size="small"
              rowKey={(_, index) => index?.toString() || '0'}
            />
            {importedData.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: 8, color: '#666' }}>
                仅显示前5行数据，实际将导入 {importedData.length} 行
              </div>
            )}
          </Card>
        </Space>
      </Modal>
    </div>
  );
};

export default ExcelImporter;
export type { ExcelImporterProps };