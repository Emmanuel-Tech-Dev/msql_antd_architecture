import { HOOKS, MISSIONS, nodeUsage, NODES } from './architectureSimulationModel';

export function HookPalette({ lab }) {
  const groups = [...new Set(HOOKS.map((hook) => hook.group))];
  return (
    <section className="lab-section" aria-labelledby="lab-hooks-title">
      <h3 id="lab-hooks-title">Framework hooks</h3>
      <p className="lab-hint">Click a hook to trace it. The switch adds it to the load.</p>
      {groups.map((group) => (
        <div className="lab-hook-group" key={group}>
          <span className="lab-group-label">{group}</span>
          {HOOKS.filter((hook) => hook.group === group).map((hook) => {
            const active = !lab.running && lab.traceId === hook.id;
            return (
              <div className={`lab-hook${active ? ' is-active' : ''}`} key={hook.id}>
                <button type="button" className="lab-hook__trace" aria-pressed={active} onClick={() => lab.startTrace(hook.id)}>
                  <strong>{hook.id}</strong>
                  <small>{hook.endpoint}</small>
                </button>
                {hook.weight > 0 && (
                  <button
                    type="button"
                    className="lab-switch"
                    role="switch"
                    aria-checked={lab.hookIds.has(hook.id)}
                    aria-label={`Include ${hook.id} in the load`}
                    onClick={() => lab.toggleHookLoad(hook.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

export function MissionList({ lab }) {
  return (
    <section className="lab-section" aria-labelledby="lab-missions-title">
      <h3 id="lab-missions-title">Missions</h3>
      {MISSIONS.map((mission) => {
        const done = lab.completed.has(mission.id);
        const current = lab.missionId === mission.id;
        return (
          <button type="button" className="lab-mission" aria-pressed={current} key={mission.id} onClick={() => lab.startMission(mission.id)}>
            <strong>{mission.title}</strong>
            <small>{mission.goal}</small>
            <span className={done ? 'is-done' : ''}>{done ? 'Completed' : current ? 'Click the box that answers it' : 'Start'}</span>
          </button>
        );
      })}
    </section>
  );
}

function Metric({ label, value, fill, tone = '', note, met }) {
  return (
    <div className={`lab-metric${tone ? ` is-${tone}` : ''}`}>
      <div className="lab-metric__row">
        <span>{label}</span>
        <strong>
          {value}
          {met !== undefined && <em className={met ? 'is-met' : 'is-missed'}>{met ? 'met' : 'missed'}</em>}
        </strong>
      </div>
      <div className="lab-metric__track"><div style={{ width: `${Math.min(100, Math.max(0, fill) * 100)}%` }} /></div>
      <small>{note}</small>
    </div>
  );
}

export function LoadMetrics({ lab }) {
  const { load, running } = lab;
  const show = (value) => (running ? value : '—');
  return (
    <section className="lab-section" aria-labelledby="lab-metrics-title">
      <h3 id="lab-metrics-title">System metrics <small>{running ? 'under load' : 'press play for load'}</small></h3>
      <Metric label="Throughput" value={show(`${load.throughput.toFixed(1)} req/s`)} fill={running ? load.throughput / Math.max(1, load.rps) : 0} note={`${running ? load.rps.toFixed(1) : 0} req/s from ${lab.hookIds.size} hooks`} />
      <Metric label="p95 latency" value={show(`${load.p95} ms`)} fill={running ? load.p95 / 1000 : 0} tone={running && load.p95 > 800 ? 'bad' : running && load.p95 > 400 ? 'warn' : ''} note="Target 400 ms" met={running ? load.p95 < 400 : undefined} />
      <Metric label="Error rate" value={show(`${load.errorRate.toFixed(1)}%`)} fill={running ? load.errorRate / 20 : 0} tone={running && load.errorRate > 5 ? 'bad' : running && load.errorRate > 1 ? 'warn' : ''} note="Target under 1%" met={running ? load.errorRate < 1 : undefined} />
      <Metric label="Queries per request" value={show(load.queriesPerRequest.toFixed(1))} fill={running ? load.queriesPerRequest / 12 : 0} note="authMiddleWare 1 · authority 0–4 · schema cached · data" />
      <Metric label="MySQL pool" value={show(`${Math.round(load.poolUse * 100)}%`)} fill={running ? load.poolUse : 0} tone={running && load.poolUse > 0.85 ? 'bad' : running && load.poolUse > 0.6 ? 'warn' : ''} note={`${running ? load.queriesPerSecond.toFixed(0) : 0} queries/s on 10 connections`} />
    </section>
  );
}

function NodeInspector({ lab }) {
  const node = NODES[lab.selected];
  const usage = nodeUsage(lab.selected);
  return (
    <section className="lab-section" aria-labelledby="lab-inspector-title">
      <h3 id="lab-inspector-title">{node.title} <button type="button" className="lab-tool" onClick={lab.clearSelection}>{lab.running ? 'Close' : 'Back to trace'}</button></h3>
      <code className="lab-file">{node.file}</code>
      <p className="lab-hint">{node.does}</p>
      <strong className="lab-subhead">Hooks that pass through it</strong>
      <div className="lab-chips">
        {usage.hooks.length ? usage.hooks.map((id) => <button type="button" key={id} onClick={() => lab.startTrace(id)}>{id}</button>) : <span className="lab-hint">None</span>}
      </div>
      <strong className="lab-subhead">Connects to</strong>
      <div className="lab-chips">
        {usage.links.map((id) => <button type="button" key={id} onClick={() => lab.selectNode(id)}>{NODES[id].title}</button>)}
      </div>
    </section>
  );
}

export function TracePanel({ lab }) {
  if (lab.selected) return <NodeInspector lab={lab} />;
  if (lab.running) {
    return (
      <section className="lab-section">
        <h3>Under load</h3>
        <p className="lab-hint">Each dot is one request following its hook&apos;s real path. Click any file for details, or click a hook to pause and trace it.</p>
      </section>
    );
  }
  const { steps, result, ok } = lab.trace;
  const finished = lab.traceAt >= steps.length - 1;
  return (
    <section className="lab-section" aria-labelledby="lab-trace-title">
      <h3 id="lab-trace-title">
        Trace · {lab.traceId}
        <span className="lab-trace-controls">
          <button type="button" className="lab-tool" aria-label="Previous step" onClick={() => lab.stepTrace(-1)}>◀</button>
          <button type="button" className="lab-tool" onClick={lab.toggleTracePlay}>{lab.tracePlaying ? 'Pause' : finished ? 'Replay' : 'Play'}</button>
          <button type="button" className="lab-tool" aria-label="Next step" onClick={() => lab.stepTrace(1)}>▶</button>
        </span>
      </h3>
      <ol className="lab-trace">
        {steps.map((step, index) => {
          const reached = index <= lab.traceAt;
          return (
            <li key={`${step.node}-${index}`} className={`${reached ? `is-${step.kind}` : 'is-pending'}${index === lab.traceAt ? ' is-now' : ''}`}>
              <button type="button" onClick={() => lab.jumpTrace(index)}>
                <i aria-hidden="true">{!reached ? '·' : step.kind === 'bad' ? '✕' : step.kind === 'retry' ? '↻' : '✓'}</i>
                <span>
                  {NODES[step.node].title}{step.queries ? ` · ${step.queries} ${step.queries === 1 ? 'query' : 'queries'}` : ''}
                  <code>{step.note}</code>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {finished && <pre className={`lab-result ${ok ? 'is-ok' : 'is-bad'}`}>{result}</pre>}
    </section>
  );
}

export function ServerLog({ lab }) {
  return (
    <section className="lab-section" aria-labelledby="lab-log-title">
      <h3 id="lab-log-title">Server log</h3>
      <div className="lab-log" role="log" aria-live="polite">
        {lab.logs.map((line) => <div key={line.id} className={line.tone ? `is-${line.tone}` : ''}>{line.text}</div>)}
      </div>
    </section>
  );
}
