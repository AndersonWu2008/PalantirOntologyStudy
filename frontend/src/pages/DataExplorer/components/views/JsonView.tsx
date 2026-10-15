/**
 * JSON View Component
 * Displays raw data in JSON format
 */

import React from 'react';
import { Card, Button, Space, Typography, Tooltip } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { useDataExplorerStore } from '../../store';

const { Text } = Typography;

/** Mock JSON data */
const mockJsonData = {
  id: 'emp_001',
  type: 'employee',
  name: 'John Doe',
  email: 'john.doe@company.com',
  department: 'Engineering',
  position: 'Senior Software Engineer',
  status: 'active',
  salary: 120000,
  manager: {
    id: 'emp_002',
    name: 'Jane Smith',
  },
  organization: {
    id: 'org_001',
    name: 'Acme Corp',
  },
  projects: [
    { id: 'proj_001', name: 'Project Alpha' },
    { id: 'proj_002', name: 'Project Beta' },
  ],
  metadata: {
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-03-10T14:20:00Z',
    created_by: 'admin',
    version: 3,
  },
  properties: {
    skills: ['React', 'TypeScript', 'Node.js'],
    certifications: ['AWS Certified', 'Scrum Master'],
    languages: ['English', 'Spanish'],
  },
};

const JsonView: React.FC = () => {
  const { selectedInstance } = useDataExplorerStore();

  // Format JSON with syntax highlighting
  const formatJson = (data: any): React.ReactNode => {
    const jsonString = JSON.stringify(data, null, 2);
    const lines = jsonString.split('\n');

    return lines.map((line, index) => {
      // Key highlighting
      const keyMatch = line.match(/^(\s*)("[^"]+"):/);
      if (keyMatch) {
        const indent = keyMatch[1];
        const key = keyMatch[2];
        const rest = line.slice(keyMatch[0].length);
        return (
          <div key={index}>
            <span style={{ color: '#999' }}>{indent}</span>
            <span style={{ color: '#d73a49' }}>{key}</span>
            <span style={{ color: '#333' }}>:</span>
            <span>{highlightValue(rest)}</span>
          </div>
        );
      }

      // Array/Objects closing
      if (line.match(/^[\s]*[}\]]/)) {
        return (
          <div key={index} style={{ color: '#333' }}>
            {line}
          </div>
        );
      }

      return (
        <div key={index}>
          <span>{highlightValue(line)}</span>
        </div>
      );
    });
  };

  // Highlight values based on type
  const highlightValue = (value: string): React.ReactNode => {
    // String values
    if (value.includes('"')) {
      const parts = value.split('"');
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          // Inside quotes (string value)
          return (
            <span key={i} style={{ color: '#032f62' }}>
              &quot;{part}&quot;
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      });
    }

    // Numbers
    if (value.match(/:\s*(-?\d+\.?\d*)/)) {
      return value.replace(/(:\s*)(-?\d+\.?\d*)/g, (_, prefix, num) => (
        `${prefix}<span style="color: #005cc5">${num}</span>`
      ));
    }

    // Booleans and null
    if (value.match(/:\s*(true|false|null)/)) {
      return value.replace(/(:\s*)(true|false|null)/g, (_, prefix, bool) => (
        `${prefix}<span style="color: #005cc5">${bool}</span>`
      ));
    }

    return value;
  };

  // Handle copy
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(mockJsonData, null, 2));
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(mockJsonData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const data = selectedInstance || mockJsonData;

  return (
    <div className="json-view">
      <Card
        title={
          <Space>
            <Text strong>JSON Data</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {Object.keys(data).length} fields
            </Text>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Copy to clipboard">
              <Button icon={<CopyOutlined />} onClick={handleCopy}>
                Copy
              </Button>
            </Tooltip>
            <Tooltip title="Download JSON">
              <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                Download
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <pre
          style={{
            backgroundColor: '#f6f8fa',
            padding: 16,
            borderRadius: 6,
            overflow: 'auto',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {formatJson(data)}
        </pre>
      </Card>
    </div>
  );
};

export default JsonView;
