import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BANDS,
  curvePath,
  defaultLayout,
  edgeCurve,
  HOOKS,
  loadEdges,
  NODE_HEIGHT,
  NODE_WIDTH,
  nodeCenter,
  nodeUsage,
  NODES,
  pointOnCurve,
  routeEdges,
  traceHook,
} from './architectureSimulationModel';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TRACE_SPEED = 0.045;
const shorten = (text, length) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

function bandFrames(positions) {
  return BANDS.map((band) => {
    const ids = Object.keys(NODES).filter((id) => NODES[id].band === band.id);
    const xs = ids.map((id) => positions[id].x);
    const ys = ids.map((id) => positions[id].y);
    const x = Math.min(...xs) - 24;
    const y = Math.min(...ys) - 46;
    return { ...band, x, y, width: Math.max(...xs) + NODE_WIDTH + 24 - x, height: Math.max(...ys) + NODE_HEIGHT + 22 - y };
  });
}

function fittedView(positions, svg) {
  const xs = Object.values(positions).map((point) => point.x);
  const ys = Object.values(positions).map((point) => point.y);
  const minX = Math.min(...xs) - 30;
  const maxX = Math.max(...xs) + NODE_WIDTH + 30;
  const minY = Math.min(...ys) - 52;
  const maxY = Math.max(...ys) + NODE_HEIGHT + 26;
  const box = svg?.getBoundingClientRect();
  const ratio = box?.width && box?.height ? box.width / box.height : 1.6;
  let width = maxX - minX;
  let height = maxY - minY;
  if (width / height > ratio) height = width / ratio; else width = height * ratio;
  return { x: minX - (width - (maxX - minX)) / 2, y: minY - (height - (maxY - minY)) / 2, w: width, h: height };
}

// Picks one hook for a new request, in proportion to its share of the load.
function pickHook(hookIds) {
  const active = HOOKS.filter((hook) => hookIds.has(hook.id) && hook.weight > 0);
  let roll = Math.random() * active.reduce((sum, hook) => sum + hook.weight, 0);
  for (const hook of active) {
    roll -= hook.weight;
    if (roll <= 0) return hook;
  }
  return active[0];
}

export default function LabCanvas({ lab }) {
  const svgRef = useRef(null);
  const particleLayer = useRef(null);
  const traceDot = useRef(null);
  const [positions, setPositions] = useState(defaultLayout);
  const [view, setView] = useState({ x: 0, y: 0, w: 1500, h: 760 });
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState(null);
  const [panning, setPanning] = useState(false);
  const drag = useRef(null);

  // Latest values for the animation loop.
  const live = useRef({});
  useEffect(() => {
    live.current = { lab, positions };
  }, [lab, positions]);

  const fit = useCallback(() => setView(fittedView(positions, svgRef.current)), [positions]);
  const fitRef = useRef(fit);
  useEffect(() => { fitRef.current = fit; }, [fit]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => fitRef.current());
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Requests under load and the traced call, drawn outside React for speed.
  const traceProgress = useRef(0);
  useEffect(() => { traceProgress.current = 0; }, [lab.traceAt, lab.traceId, lab.failures]);
  useEffect(() => {
    let frame;
    let particles = [];

    // Traffic only runs after someone presses play, so it runs under reduced motion too.
    const spawn = ({ lab: state }) => {
      const { load } = state;
      if (!load.rps || Math.random() > Math.min(16, 1 + load.rps / 4) / 30) return;
      const hook = pickHook(state.hookIds);
      if (!hook) return;
      let steps = traceHook(hook, state.failures).steps.filter((step, index, all) => index === 0 || step.node !== all[index - 1].node);
      if (Math.random() * load.rps < load.limited) {
        steps = steps.slice(0, steps.findIndex((step) => step.node === 'index') + 1);
        steps[steps.length - 1] = { ...steps[steps.length - 1], kind: 'bad' };
      }
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '5');
      dot.setAttribute('class', 'lab-particle');
      particleLayer.current?.appendChild(dot);
      particles.push({ steps, segment: 0, t: 0, stopAt: steps.findIndex((step) => step.kind === 'bad'), speed: 0.05 / Math.max(1, Math.min(4, load.poolUse * 2)), dot, fade: 0 });
    };

    const moveParticles = (positions) => {
      particles = particles.filter((particle) => {
        if (particle.stopAt >= 0 && particle.segment >= particle.stopAt) {
          particle.fade += 1;
          const center = nodeCenter(positions, particle.steps[particle.stopAt].node);
          particle.dot.setAttribute('class', 'lab-particle is-bad');
          particle.dot.setAttribute('cx', center.x);
          particle.dot.setAttribute('cy', center.y);
          particle.dot.setAttribute('opacity', String(1 - particle.fade / 24));
          if (particle.fade <= 24) return true;
          particle.dot.remove();
          return false;
        }
        particle.t += particle.speed;
        while (particle.t >= 1) { particle.segment += 1; particle.t -= 1; }
        if (particle.segment >= particle.steps.length - 1) { particle.dot.remove(); return false; }
        const next = particle.steps[particle.segment + 1];
        const point = pointOnCurve(edgeCurve(positions, particle.steps[particle.segment].node, next.node), particle.t);
        particle.dot.setAttribute('class', `lab-particle${next.kind === 'retry' ? ' is-retry' : ''}`);
        particle.dot.setAttribute('cx', point.x);
        particle.dot.setAttribute('cy', point.y);
        return true;
      });
    };

    const moveTraceDot = ({ lab: state, positions }) => {
      const dot = traceDot.current;
      if (!dot || state.running) return;
      const { steps } = state.trace;
      const at = Math.min(state.traceAt, steps.length - 1);
      const from = steps[at];
      const to = steps[Math.min(at + 1, steps.length - 1)];
      const finished = at >= steps.length - 1;
      if (state.tracePlaying && !finished) {
        traceProgress.current += TRACE_SPEED;
        if (traceProgress.current >= 1) {
          traceProgress.current = 0;
          state.advanceTrace();
        }
      }
      const point = finished || from.node === to.node
        ? nodeCenter(positions, from.node)
        : pointOnCurve(edgeCurve(positions, from.node, to.node), traceProgress.current);
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      const kind = finished ? from.kind : to.kind;
      dot.setAttribute('class', `lab-particle lab-particle--trace${kind === 'bad' ? ' is-bad' : kind === 'retry' ? ' is-retry' : ''}`);
    };

    const loop = () => {
      const current = live.current;
      if (current.lab) {
        if (current.lab.running) spawn(current);
        else if (particles.length) { particles.forEach((particle) => particle.dot.remove()); particles = []; }
        moveParticles(current.positions);
        moveTraceDot(current);
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(frame);
      particles.forEach((particle) => particle.dot.remove());
    };
  }, []);

  // Wheel zoom around the pointer (needs a non-passive listener).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const box = svg.getBoundingClientRect();
      setView((current) => {
        const px = current.x + ((event.clientX - box.left) / box.width) * current.w;
        const py = current.y + ((event.clientY - box.top) / box.height) * current.h;
        const w = Math.min(4000, Math.max(500, current.w * (event.deltaY > 0 ? 1.12 : 1 / 1.12)));
        const scale = w / current.w;
        return { x: px - (px - current.x) * scale, y: py - (py - current.y) * scale, w, h: current.h * scale };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (factor) => setView((current) => {
    const w = Math.min(4000, Math.max(500, current.w * factor));
    const scale = w / current.w;
    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;
    return { x: cx - (cx - current.x) * scale, y: cy - (cy - current.y) * scale, w, h: current.h * scale };
  });

  const toWorld = (event) => {
    const box = svgRef.current.getBoundingClientRect();
    return { x: view.x + ((event.clientX - box.left) / box.width) * view.w, y: view.y + ((event.clientY - box.top) / box.height) * view.h };
  };

  const onPointerDown = (event) => {
    const nodeId = event.target.closest('[data-node]')?.dataset.node;
    const point = toWorld(event);
    drag.current = nodeId
      ? { kind: 'node', id: nodeId, offsetX: point.x - positions[nodeId].x, offsetY: point.y - positions[nodeId].y, startX: event.clientX, startY: event.clientY, moved: false }
      : { kind: 'pan', startX: event.clientX, startY: event.clientY, view, moved: false };
    if (!nodeId) setPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const current = drag.current;
    if (!current) {
      const nodeId = event.target.closest('[data-node]')?.dataset.node ?? null;
      setHover(nodeId);
      if (nodeId) {
        const box = svgRef.current.getBoundingClientRect();
        setTip({ id: nodeId, left: Math.min(box.width - 300, event.clientX - box.left + 14), top: Math.min(box.height - 96, event.clientY - box.top + 14) });
      } else setTip(null);
      return;
    }
    if (Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY) > 4) current.moved = true;
    if (!current.moved) return;
    setTip(null);
    if (current.kind === 'pan') {
      const box = svgRef.current.getBoundingClientRect();
      setView({ ...current.view, x: current.view.x - ((event.clientX - current.startX) / box.width) * current.view.w, y: current.view.y - ((event.clientY - current.startY) / box.height) * current.view.h });
      return;
    }
    const point = toWorld(event);
    setPositions((existing) => ({ ...existing, [current.id]: { x: Math.round(point.x - current.offsetX), y: Math.round(point.y - current.offsetY) } }));
  };

  const onPointerUp = () => {
    const current = drag.current;
    if (current?.kind === 'node' && !current.moved) lab.selectNode(current.id);
    drag.current = null;
    setPanning(false);
  };

  const edges = useMemo(() => {
    const list = lab.running
      ? loadEdges(lab.hookIds, lab.failures).map((edge) => ({ ...edge, className: `lab-edge is-flow${edge.kind ? ` is-${edge.kind}` : ''}` }))
      : routeEdges(lab.trace.steps, lab.traceAt).map((edge) => ({ ...edge, className: `lab-edge${edge.reached ? ' is-on' : ''}${edge.kind ? ` is-${edge.kind}` : ''}` }));
    if (!hover) return list;
    const drawn = new Set(list.flatMap((edge) => [`${edge.from}>${edge.to}`, `${edge.to}>${edge.from}`]));
    const extra = nodeUsage(hover).links
      .filter((other) => !drawn.has(`${hover}>${other}`))
      .map((other) => ({ from: hover, to: other, className: 'lab-edge is-lit is-hint' }));
    return [
      ...list.map((edge) => ({ ...edge, className: `${edge.className} ${edge.from === hover || edge.to === hover ? 'is-lit' : 'is-faded'}` })),
      ...extra,
    ];
  }, [hover, lab.failures, lab.hookIds, lab.running, lab.trace.steps, lab.traceAt]);

  const hoverSet = hover ? new Set([hover, ...nodeUsage(hover).links]) : null;
  const tracing = !lab.running;
  const routeNodes = new Set(lab.trace.steps.map((step) => step.node));
  const reachedNotes = {};
  lab.trace.steps.forEach((step, index) => { if (index <= lab.traceAt) reachedNotes[step.node] = step; });
  const currentNode = lab.trace.steps[lab.traceAt]?.node;

  const nodeClass = (id) => {
    const classes = ['lab-node', `is-${NODES[id].band}`];
    const load = Math.max(0, Math.min(1, lab.load.heat[id] ?? 0));
    if (hoverSet) { if (!hoverSet.has(id)) classes.push('is-dim'); } else if (tracing && !routeNodes.has(id)) classes.push('is-dim');
    if (tracing && reachedNotes[id]) classes.push(reachedNotes[id].kind === 'bad' ? 'is-bad' : 'is-on');
    if (tracing && currentNode === id) classes.push('is-current');
    if (lab.running) classes.push(load > 0.85 ? 'is-bad' : load > 0.6 ? 'is-warn' : '');
    if (lab.selected === id) classes.push('is-selected');
    return classes.filter(Boolean).join(' ');
  };
  const nodeStat = (id) => {
    if (lab.running) return lab.load.stat[id];
    return tracing && reachedNotes[id] ? reachedNotes[id].note : '';
  };

  const tipNode = tip ? NODES[tip.id] : null;
  const tipUsage = tip ? nodeUsage(tip.id) : null;

  return (
    <div className={`lab-stage${panning ? ' is-panning' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="group"
        aria-label="Map of the framework's files from React hooks through Express middleware and services to MySQL"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { setHover(null); setTip(null); }}
      >
        <g aria-hidden="true">
          {bandFrames(positions).map((band) => (
            <g key={band.id}>
              <rect className="lab-band" x={band.x} y={band.y} width={band.width} height={band.height} rx="14" />
              <text className="lab-band-label" x={band.x + 18} y={band.y + 26}>{band.label}</text>
            </g>
          ))}
        </g>
        <g aria-hidden="true">
          {edges.map((edge) => (
            <path
              key={`${edge.from}>${edge.to}`}
              className={edge.className}
              d={curvePath(edgeCurve(positions, edge.from, edge.to))}
              strokeWidth={edge.weight ? 1.5 + edge.weight * 1.8 : undefined}
            />
          ))}
        </g>
        <g ref={particleLayer} aria-hidden="true">
          {tracing && <circle ref={traceDot} r="8" className="lab-particle lab-particle--trace" />}
        </g>
        <g>
          {Object.entries(NODES).map(([id, node]) => (
            <g
              key={id}
              data-node={id}
              className={nodeClass(id)}
              transform={`translate(${positions[id].x},${positions[id].y})`}
              role="button"
              tabIndex={0}
              aria-label={`${id === 'hook' ? lab.traceId : node.title}, ${node.file}`}
              aria-pressed={lab.selected === id}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                lab.selectNode(id);
              }}
            >
              <rect className="lab-node__card" width={NODE_WIDTH} height={NODE_HEIGHT} rx="9" />
              <rect className="lab-node__kind" x="0" y="12" width="4" height={NODE_HEIGHT - 24} rx="2" />
              <text className="lab-node__title" x="14" y="23">{id === 'hook' ? (lab.running ? 'Hooks' : lab.traceId) : node.title}</text>
              <text className="lab-node__file" x="14" y="40">{shorten(node.file, 27)}</text>
              <text className="lab-node__stat" x="14" y="60">{shorten(nodeStat(id), 25)}</text>
              <rect className="lab-node__track" x="14" y="67" width={NODE_WIDTH - 28} height="4" rx="2" />
              <rect className="lab-node__bar" x="14" y="67" width={lab.running ? (NODE_WIDTH - 28) * Math.max(0, Math.min(1, lab.load.heat[id] ?? 0)) : 0} height="4" rx="2" />
            </g>
          ))}
        </g>
      </svg>

      <div className="lab-view-tools">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1 / 1.2)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1.2)}>−</button>
        <button type="button" aria-label="Fit to screen" onClick={fit}>⤢</button>
        <button type="button" aria-label="Restore layout" onClick={() => { const layout = defaultLayout(); setPositions(layout); setView(fittedView(layout, svgRef.current)); }}>↺</button>
      </div>
      <div className="lab-legend" aria-hidden="true">
        <span><i className="is-browser" />Browser</span><span><i className="is-express" />Express</span><span><i className="is-mysql" />MySQL</span><span><i className="is-bad" />Stopped</span><span><i className="is-retry" />Retried</span>
      </div>
      {tipNode && (
        <div className="lab-tip" style={{ left: tip.left, top: tip.top }}>
          <strong>{tipNode.title}</strong>
          <code>{tipNode.file}</code>
          <span>{tipUsage.hooks.length} hook{tipUsage.hooks.length === 1 ? '' : 's'} pass through · {tipUsage.links.length} connections · click for details</span>
        </div>
      )}
    </div>
  );
}
