import { useState } from 'react';
import { FAILURES } from './architectureSimulationModel';
import LabCanvas from './LabCanvas';
import { HookPalette, LoadMetrics, MissionList, ServerLog, TracePanel } from './LabPanels';
import useLoadLab from './useLoadLab';
import './ArchitectureSimulator.css';

// Framework Load Lab: the framework's real files as a live map. Trace one
// hook's path through them, or put the architecture under load.
export default function ArchitectureSimulator({ headingId, title = 'Framework Load Lab' }) {
  const lab = useLoadLab();
  const [focus, setFocus] = useState(false);

  return (
    <section className="docs-block load-lab" aria-labelledby={headingId}>
      <div className="load-lab__intro">
        <span>Interactive architecture lab</span>
        <h2 id={headingId}>{title}</h2>
        <p>Every box is a real framework file. Click a hook to trace one call through the files it touches, or switch hooks on and press play to put the whole architecture under load. Drag the canvas to pan, scroll to zoom, drag boxes to rearrange, and hover a file to see its connections.</p>
      </div>

      <div className={`load-lab__frame${focus ? ' is-focus' : ''}`}>
        {!focus && (
          <aside className="load-lab__side load-lab__side--left">
            <HookPalette lab={lab} />
            <MissionList lab={lab} />
          </aside>
        )}

        <div className="load-lab__main">
          <div className="lab-toolbar" role="group" aria-label="Break something">
            <span className="lab-toolbar__label">Break something:</span>
            {FAILURES.map((failure) => (
              <button type="button" className="lab-tool lab-tool--failure" aria-pressed={lab.failures.has(failure.id)} key={failure.id} onClick={() => lab.toggleFailure(failure.id)}>
                {failure.label}
              </button>
            ))}
            <button type="button" className="lab-tool" onClick={lab.reset}>Reset</button>
            <span className="lab-toolbar__spacer" />
            <button type="button" className="lab-tool" aria-pressed={focus} onClick={() => setFocus((current) => !current)}>{focus ? 'Show panels' : 'Focus canvas'}</button>
            <span className={`lab-health is-${lab.health.tone}`} aria-live="polite">{lab.health.label}</span>
          </div>

          <LabCanvas lab={lab} />

          <div className="lab-loadbar">
            <button type="button" className="lab-play" aria-label={lab.running ? 'Pause load' : 'Start load'} onClick={() => lab.setRunning(!lab.running)}>
              {lab.running ? '❚❚' : '▶'}
            </button>
            <label className="lab-slider" htmlFor="lab-users">
              <span>Signed-in users <b>{lab.users}</b></span>
              <input id="lab-users" type="range" min="1" max="400" value={lab.users} onChange={(event) => lab.setUsers(Number(event.target.value))} />
            </label>
            <label className="lab-slider" htmlFor="lab-pace">
              <span>Hook calls per user per minute <b>{lab.pace}</b></span>
              <input id="lab-pace" type="range" min="1" max="20" value={lab.pace} onChange={(event) => lab.setPace(Number(event.target.value))} />
            </label>
            <label className="lab-check" htmlFor="lab-office">
              <input id="lab-office" type="checkbox" checked={lab.office} onChange={(event) => lab.setOffice(event.target.checked)} />
              All users behind one office IP
            </label>
          </div>
        </div>

        {!focus && (
          <aside className="load-lab__side load-lab__side--right">
            <LoadMetrics lab={lab} />
            <TracePanel lab={lab} />
            <ServerLog lab={lab} />
          </aside>
        )}
      </div>
    </section>
  );
}
