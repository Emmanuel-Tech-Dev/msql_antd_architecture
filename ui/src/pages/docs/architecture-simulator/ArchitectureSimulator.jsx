import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CodeOutlined,
  ExperimentOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Background, BackgroundVariant, Controls, MarkerType, ReactFlow } from '@xyflow/react';
import { Button, Select, Tooltip } from 'antd';
import { useTheme } from '../../../hooks/useTheme';
import ArchitectureNode from './ArchitectureNode';
import FrontendComponentNode from './FrontendComponentNode';
import useArchitectureSimulation from './useArchitectureSimulation';
import {
  ARCHITECTURE_EDGES,
  ARCHITECTURE_LAYERS,
  FRONTEND_COMPONENTS,
  getComponentStatus,
  getLayerStatus,
  POLICY_GROUPS,
} from './architectureSimulationModel';
import './ArchitectureSimulator.css';

const nodeTypes = { architecture: ArchitectureNode, frontendComponent: FrontendComponentNode };
const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

function ComponentLibrary({ simulation }) {
  return (
    <aside className="architecture-sim__library" aria-labelledby="architecture-library-title">
      <div className="architecture-sim__side-heading">
        <div><small>Component library</small><h3 id="architecture-library-title">Add to canvas</h3></div>
        <span>{simulation.componentIds.length}/{FRONTEND_COMPONENTS.length}</span>
      </div>
      <p>Mount frontend components, then change their runtime or server contracts to test the complete path.</p>
      <div className="architecture-sim__component-list">
        {FRONTEND_COMPONENTS.map((component) => {
          const installed = simulation.componentIds.includes(component.id);
          return (
            <button
              aria-pressed={installed}
              className={installed ? 'is-installed' : ''}
              key={component.id}
              onClick={() => simulation.toggleComponent(component.id)}
              type="button"
            >
              <span><small>{component.category}</small><strong>{component.label}</strong><em>{component.detail}</em></span>
              <i aria-hidden>{installed ? <CheckOutlined /> : <PlusOutlined />}</i>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PolicyConfiguration({ simulation }) {
  return (
    <aside className="architecture-sim__configuration" aria-labelledby="architecture-policy-title">
      <div className="architecture-sim__side-heading">
        <div><small>Configuration inspector</small><h3 id="architecture-policy-title">Policy contracts</h3></div>
        <ExperimentOutlined aria-hidden />
      </div>
      <p>Edits are staged until you trigger the policy change.</p>

      <div className="architecture-sim__policy-groups">
        {POLICY_GROUPS.map((group) => (
          <details defaultOpen={group.id !== 'content'} key={group.id}>
            <summary><span><strong>{group.label}</strong><small>{group.description}</small></span><i aria-hidden>+</i></summary>
            <div className="architecture-sim__policy-fields">
              {group.fields.map((field) => (
                <label className="architecture-sim__field" htmlFor={`sim-policy-${field.key}`} key={field.key}>
                  <span><strong>{field.label}</strong><small>{field.help}</small></span>
                  <Select
                    id={`sim-policy-${field.key}`}
                    aria-label={field.label}
                    options={field.options}
                    value={simulation.draftPolicy[field.key]}
                    onChange={(value) => simulation.updateDraft(field.key, value)}
                  />
                </label>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="architecture-sim__trigger">
        <div aria-live="polite"><i className={simulation.hasPendingChanges ? 'is-pending' : ''} /><span>{simulation.hasPendingChanges ? 'Unapplied policy changes' : 'Canvas matches configuration'}</span></div>
        <Button block type="primary" icon={<ThunderboltOutlined />} onClick={simulation.trigger}>Trigger Policy Change</Button>
      </div>
    </aside>
  );
}

function buildComponentNodes(componentIds, currentScenario, runId, selectedId) {
  return componentIds.map((componentId, index) => {
    const definition = FRONTEND_COMPONENTS.find((item) => item.id === componentId);
    const row = Math.floor(index / 4);
    const column = index % 4;
    return {
      id: `component-${componentId}`,
      type: 'frontendComponent',
      position: { x: column * 300 + 40, y: -185 - row * 165 },
      draggable: false,
      selected: selectedId === `component-${componentId}`,
      data: {
        ...definition,
        status: getComponentStatus(componentId, currentScenario),
        impactRun: runId,
      },
    };
  });
}

function FlowGraph({ simulation, isDark, isFullscreen }) {
  const [selectedId, setSelectedId] = useState('framework-runtime');
  const flowRef = useRef(null);
  const healthy = simulation.scenario.healthy;
  const edgeColor = healthy ? '#27865b' : '#d14343';

  const nodes = useMemo(() => [
    ...buildComponentNodes(simulation.componentIds, simulation.scenario, simulation.runId, selectedId),
    ...ARCHITECTURE_LAYERS.map((layer) => ({
      ...layer,
      type: 'architecture',
      draggable: false,
      selected: layer.id === selectedId,
      data: { ...layer.data, status: getLayerStatus(layer.id, simulation.scenario), impactRun: simulation.runId },
    })),
  ], [selectedId, simulation.componentIds, simulation.runId, simulation.scenario]);

  const edges = useMemo(() => {
    const componentEdges = simulation.componentIds.map((componentId, index) => ({
      id: `component-edge-${componentId}`,
      source: `component-${componentId}`,
      target: 'page-hooks',
      sourceHandle: 'source-bottom',
      targetHandle: 'target-top',
      label: index === 0 ? 'mount' : undefined,
    }));
    return [...componentEdges, ...ARCHITECTURE_EDGES].map((edge) => ({
      ...edge,
      type: 'smoothstep',
      animated: true,
      className: `architecture-edge architecture-edge--${healthy ? 'healthy' : 'error'}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 16, height: 16 },
      style: { stroke: edgeColor, strokeWidth: healthy ? 1.8 : 2.2 },
      labelStyle: { fill: healthy ? '#47695a' : '#a93a3a', fontSize: 11, fontWeight: 700 },
      labelBgStyle: { fill: isDark ? '#171512' : '#fffdf9', fillOpacity: 0.94 },
      labelBgPadding: [5, 4],
      labelBgBorderRadius: 2,
    }));
  }, [edgeColor, healthy, isDark, simulation.componentIds]);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      flowRef.current?.fitView({ padding: 0.08, maxZoom: isFullscreen ? 1 : 0.86, duration: 180, ease: easeOutCubic, interpolate: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isFullscreen, simulation.componentIds]);

  return (
    <section className="architecture-sim__graph-panel" aria-labelledby="architecture-flow-title">
      <div className="architecture-sim__graph-heading">
        <div><small>Frontend + backend canvas</small><h3 id="architecture-flow-title">Framework boundary map</h3></div>
        <div className={`architecture-sim__health architecture-sim__health--${healthy ? 'healthy' : 'error'}`} aria-live="polite">
          {healthy ? <CheckCircleFilled /> : <CloseCircleFilled />}
          <span><strong>{healthy ? 'Healthy' : 'Policy break'}</strong><small>{simulation.scenario.code}</small></span>
        </div>
      </div>
      <div className="architecture-sim__selection" aria-live="polite">
        <span>Selected</span><strong>{selectedNode?.data.label}</strong><small>{selectedNode?.data.detail}</small>
      </div>
      <div className={`architecture-sim__flow architecture-sim__flow--${healthy ? 'healthy' : 'error'}`}>
        <ReactFlow
          aria-label="Interactive frontend and backend framework architecture flow"
          colorMode={isDark ? 'dark' : 'light'}
          edges={edges}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.08, maxZoom: isFullscreen ? 1 : 0.86 }}
          maxZoom={1.6}
          minZoom={0.32}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          onInit={(instance) => { flowRef.current = instance; }}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          panOnDrag
          zoomOnDoubleClick={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />
          <Controls aria-label="Architecture canvas controls" fitViewOptions={{ padding: 0.08, duration: 180, ease: easeOutCubic, interpolate: 'smooth' }} showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="architecture-sim__graph-note"><span><i className="is-healthy" />Validated path</span><span><i className="is-error" />Rejected path</span><small>Pan, zoom, and select any component or layer.</small></div>
    </section>
  );
}

function RemediationBanner({ simulation }) {
  const healthy = simulation.scenario.healthy;
  return (
    <section className={`architecture-sim__remediation architecture-sim__remediation--${healthy ? 'healthy' : 'error'}`} aria-labelledby="architecture-remediation-title" aria-live="polite">
      <span className="architecture-sim__remediation-icon">{healthy ? <SafetyCertificateOutlined /> : <ToolOutlined />}</span>
      <div><small>{healthy ? 'Resolved state' : 'Remediation banner'}</small><h3 id="architecture-remediation-title">{healthy ? simulation.scenario.title : 'Why it broke'}</h3><p>{simulation.scenario.why}</p></div>
      {healthy ? (
        <Tooltip title={simulation.baselineActive ? 'The documented baseline is active' : 'Restore policies and default components'}>
          <Button icon={<ReloadOutlined />} disabled={simulation.baselineActive} onClick={simulation.restoreBaseline}>Restore baseline</Button>
        </Tooltip>
      ) : <Button type="primary" icon={<ToolOutlined />} onClick={simulation.remediate}>Click to Fix</Button>}
    </section>
  );
}

function SimulationTerminal({ simulation }) {
  const healthy = simulation.scenario.healthy;
  return (
    <section className="architecture-sim__terminal" aria-labelledby="architecture-terminal-title">
      <div className="architecture-sim__terminal-bar"><span className="architecture-sim__terminal-lights" aria-hidden><i /><i /><i /></span><span id="architecture-terminal-title"><CodeOutlined /> Simulated framework trace</span><small>run #{String(simulation.runId).padStart(2, '0')}</small></div>
      <div className="architecture-sim__terminal-body" role="log" aria-live="polite" aria-atomic="true">
        <div className="architecture-sim__terminal-command"><span>$</span> framework:policy-sim --scope ui,server --safe-output</div>
        {simulation.trace.map((line, index) => {
          const tone = line.includes('ERROR') || line.includes('FAIL') ? 'error' : line.includes('OK') ? 'success' : line.trim().startsWith('at ') || line.includes('context:') ? 'muted' : 'default';
          return <div className={`architecture-sim__terminal-line is-${tone}`} key={`${simulation.runId}-${index}`}>{line}</div>;
        })}
      </div>
      <div className="architecture-sim__terminal-footer"><span><i className={healthy ? 'is-healthy' : 'is-error'} />{healthy ? 'Full-stack simulation completed' : 'Boundary rejected simulation'}</span><small>No live application data is used.</small></div>
    </section>
  );
}

export default function ArchitectureSimulator({ headingId, title = 'Architectural Simulation Flow' }) {
  const simulation = useArchitectureSimulation();
  const { isDark } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isFullscreen]);

  return (
    <section className={`docs-block architecture-sim${isFullscreen ? ' is-fullscreen' : ''}`} aria-labelledby={headingId}>
      <div className="architecture-sim__intro">
        <div><span>Interactive full-stack lab</span><h2 id={headingId}>{title}</h2><p>Add frontend components, change client or server policies, and trace the first breaking point across the complete React-to-MySQL architecture.</p></div>
        <Button className="architecture-sim__fullscreen-button" icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={() => setIsFullscreen((current) => !current)}>{isFullscreen ? 'Exit full screen' : 'Open full screen'}</Button>
      </div>

      <div className="architecture-sim__studio">
        <header className="architecture-sim__studio-bar">
          <div><strong>Framework Architecture Studio</strong><small>{simulation.componentIds.length} frontend components / 10 architecture layers</small></div>
          <div><span className={simulation.scenario.healthy ? 'is-healthy' : 'is-error'}>{simulation.scenario.healthy ? 'System healthy' : simulation.scenario.code}</span><Button aria-label={isFullscreen ? 'Exit full screen' : 'Open full screen'} icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={() => setIsFullscreen((current) => !current)} /></div>
        </header>
        <div className="architecture-sim__workspace">
          <ComponentLibrary simulation={simulation} />
          <main className="architecture-sim__canvas-column">
            <FlowGraph simulation={simulation} isDark={isDark} isFullscreen={isFullscreen} />
            <RemediationBanner simulation={simulation} />
            <SimulationTerminal simulation={simulation} />
          </main>
          <PolicyConfiguration simulation={simulation} />
        </div>
      </div>
    </section>
  );
}
