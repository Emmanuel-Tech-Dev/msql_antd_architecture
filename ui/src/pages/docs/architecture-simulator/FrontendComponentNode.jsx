import {
  BarChartOutlined,
  CloudSyncOutlined,
  EditOutlined,
  FileTextOutlined,
  FormOutlined,
  SelectOutlined,
  TableOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Handle, Position } from '@xyflow/react';

const icons = {
  page: <FileTextOutlined />, table: <TableOutlined />, form: <FormOutlined />,
  select: <SelectOutlined />, upload: <UploadOutlined />, editor: <EditOutlined />,
  chart: <BarChartOutlined />, offline: <CloudSyncOutlined />,
};

export default function FrontendComponentNode({ data, selected }) {
  const impactKey = data.status === 'error' ? data.impactRun : 'stable';
  return (
    <>
      <div
        className={`frontend-component-node frontend-component-node--${data.status}${selected ? ' is-selected' : ''}`}
        key={impactKey}
      >
        <span className="frontend-component-node__icon" aria-hidden>{icons[data.icon]}</span>
        <span><small>{data.category} component</small><strong>{data.label}</strong><em>{data.detail}</em></span>
        <i className="frontend-component-node__state">{data.status === 'error' ? 'Break' : 'Mounted'}</i>
      </div>
      <Handle id="source-bottom" type="source" position={Position.Bottom} isConnectable={false} />
    </>
  );
}
