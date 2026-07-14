import {
  ApiOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Handle, Position } from '@xyflow/react';

const layerIcons = {
  ui: <AppstoreOutlined />,
  runtime: <DeploymentUnitOutlined />,
  cache: <ThunderboltOutlined />,
  provider: <ApiOutlined />,
  transport: <CloudServerOutlined />,
  server: <CloudServerOutlined />,
  security: <LockOutlined />,
  guard: <SafetyCertificateOutlined />,
  service: <DeploymentUnitOutlined />,
  database: <DatabaseOutlined />,
};

const statusLabels = {
  healthy: 'Online',
  error: 'Policy break',
  blocked: 'Blocked',
};

export default function ArchitectureNode({ data, selected }) {
  const impactKey = data.status === 'error' ? data.impactRun : 'stable';

  return (
    <>
      <Handle id="target-left" type="target" position={Position.Left} isConnectable={false} />
      <Handle id="target-right" type="target" position={Position.Right} isConnectable={false} />
      <Handle id="target-top" type="target" position={Position.Top} isConnectable={false} />
      <div
        className={`architecture-node architecture-node--${data.status}${selected ? ' is-selected' : ''}`}
        key={impactKey}
      >
        <div className="architecture-node__topline">
          <span className="architecture-node__order">{data.order}</span>
          <span className="architecture-node__status"><i />{statusLabels[data.status]}</span>
        </div>
        <div className="architecture-node__body">
          <span className="architecture-node__icon" aria-hidden>{layerIcons[data.kind]}</span>
          <div>
            <strong>{data.label}</strong>
            <small>{data.detail}</small>
          </div>
        </div>
      </div>
      <Handle id="source-right" type="source" position={Position.Right} isConnectable={false} />
      <Handle id="source-left" type="source" position={Position.Left} isConnectable={false} />
      <Handle id="source-bottom" type="source" position={Position.Bottom} isConnectable={false} />
    </>
  );
}
