import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeLoad,
  DEFAULT_LOAD_HOOKS,
  findHook,
  healthOf,
  loadLogLines,
  MISSIONS,
  NODES,
  traceHook,
} from './architectureSimulationModel';

const WARM_CACHE = 0.97;
const MAX_LOG_LINES = 40;
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const timestamp = () => new Date().toTimeString().slice(0, 8);
const toggled = (set, value) => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
};

// State of the Framework Load Lab: one traced hook, or many hooks under load.
export default function useLoadLab() {
  const [users, setUsers] = useState(60);
  const [pace, setPace] = useState(4);
  const [office, setOffice] = useState(false);
  const [hookIds, setHookIds] = useState(() => new Set(DEFAULT_LOAD_HOOKS));
  const [failures, setFailures] = useState(() => new Set());
  const [running, setRunningState] = useState(false);
  const [cacheWarm, setCacheWarm] = useState(WARM_CACHE);
  const [revokeWave, setRevokeWave] = useState(0);

  // Reduced motion only stops the automatic play on page load: the first trace
  // opens finished. Animation someone starts (a hook, Play, load) still runs.
  const [traceId, setTraceId] = useState('useCreate');
  const [traceAt, setTraceAt] = useState(() => (prefersReducedMotion() ? traceHook(findHook('useCreate'), new Set()).steps.length - 1 : 0));
  const [tracePlaying, setTracePlaying] = useState(() => !prefersReducedMotion());

  const [selected, setSelected] = useState(null);
  const [missionId, setMissionId] = useState(null);
  const [completed, setCompleted] = useState(() => new Set());
  const [logs, setLogs] = useState([{ id: 0, tone: '', text: `${timestamp()} ready · click a hook to trace it, or press play for load` }]);
  const logId = useRef(1);

  const log = useCallback((tone, text) => {
    const id = logId.current;
    logId.current += 1;
    setLogs((current) => [{ id, tone, text: `${timestamp()} ${text}` }, ...current].slice(0, MAX_LOG_LINES));
  }, []);

  const trace = useMemo(() => traceHook(findHook(traceId), failures), [traceId, failures]);
  const load = useMemo(
    () => computeLoad({ users, pace, office, hookIds, failures, cacheWarm, revokeWave }),
    [users, pace, office, hookIds, failures, cacheWarm, revokeWave],
  );
  const health = useMemo(() => (running ? healthOf(load, true) : { tone: 'ok', label: 'Tracing' }), [load, running]);

  // Under load the permission cache warms back up and a revoked-token wave fades.
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setCacheWarm((current) => Math.min(WARM_CACHE, current + (failures.has('rolechange') ? 0.012 : 0.04)));
      setRevokeWave((current) => Math.max(0, current * 0.94));
    }, 250);
    return () => window.clearInterval(timer);
  }, [failures, running]);

  // The server log follows what the load is doing, every ~1.5 s.
  const loadRef = useRef(load);
  const warmRef = useRef(cacheWarm);
  useEffect(() => {
    loadRef.current = load;
    warmRef.current = cacheWarm;
  }, [cacheWarm, load]);
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      for (const [tone, text] of loadLogLines(loadRef.current, warmRef.current)) log(tone, text);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [log, running]);

  const lastHealth = useRef(null);
  useEffect(() => {
    if (!running) {
      lastHealth.current = null;
      return;
    }
    if (lastHealth.current === health.label) return;
    lastHealth.current = health.label;
    log(health.tone, `system ${health.label.toLowerCase()} · p95 ${load.p95} ms · ${load.errorRate.toFixed(1)}% errors`);
  }, [health, load.errorRate, load.p95, log, running]);

  const finishTrace = useCallback(() => {
    setTracePlaying(false);
    log(trace.ok ? 'ok' : 'bad', `${traceId} → ${trace.result}`);
  }, [log, trace, traceId]);

  const startTrace = useCallback((id) => {
    setRunningState(false);
    setSelected(null);
    setTraceId(id);
    setTraceAt(0);
    setTracePlaying(true);
  }, []);

  const advanceTrace = useCallback(() => {
    const last = trace.steps.length - 1;
    if (traceAt + 1 >= last) {
      setTraceAt(last);
      finishTrace();
      return;
    }
    setTraceAt(traceAt + 1);
  }, [finishTrace, trace.steps.length, traceAt]);

  const jumpTrace = useCallback((index) => {
    setTracePlaying(false);
    setTraceAt(Math.max(0, Math.min(trace.steps.length - 1, index)));
  }, [trace.steps.length]);

  const stepTrace = useCallback((delta) => {
    const last = trace.steps.length - 1;
    const next = Math.max(0, Math.min(last, traceAt + delta));
    setTraceAt(next);
    if (next === last && traceAt !== last) finishTrace();
    else setTracePlaying(false);
  }, [finishTrace, trace.steps.length, traceAt]);

  const toggleTracePlay = useCallback(() => {
    if (traceAt >= trace.steps.length - 1) {
      setTraceAt(0);
      setTracePlaying(true);
      return;
    }
    setTracePlaying((current) => !current);
  }, [trace.steps.length, traceAt]);

  const setRunning = useCallback((on) => {
    setRunningState(on);
    setSelected(null);
    if (on) log('ok', `load started · ${users} users · ${pace} calls/min · ${[...hookIds].join(', ')}`);
  }, [hookIds, log, pace, users]);

  const toggleFailure = useCallback((id) => {
    const switchingOn = !failures.has(id);
    setFailures((current) => toggled(current, id));
    setTraceAt(0);
    setTracePlaying(true);
    if (!switchingOn) return;
    if (id === 'revoke') {
      setRevokeWave(1);
      log('warn', 'UPDATE admin_credentials SET token_version = token_version + 1');
    }
    if (id === 'rolechange') {
      setCacheWarm(0.05);
      log('warn', 'acessRoute → clearPermissionCache · publish access:changed');
    }
    if (id === 'slowdb') log('warn', 'queries now take ~45 ms instead of ~4 ms');
  }, [failures, log]);

  const selectNode = useCallback((id) => {
    setSelected(id);
    const mission = MISSIONS.find((item) => item.id === missionId);
    if (!mission || completed.has(mission.id)) return;
    if (id === mission.answer) {
      setCompleted((current) => new Set(current).add(mission.id));
      log('ok', `mission complete: ${mission.title} → ${NODES[id].title}`);
    } else {
      log('warn', `not quite: ${NODES[id].title} is not the answer to "${mission.title}"`);
    }
  }, [completed, log, missionId]);

  const startMission = useCallback((id) => {
    const mission = MISSIONS.find((item) => item.id === id);
    setMissionId(id);
    log('ok', `mission: ${mission.title}`);
    if (mission.trace) {
      startTrace(mission.trace);
      return;
    }
    setUsers(mission.load.users);
    setPace(mission.load.pace);
    setOffice(mission.load.office);
    setFailures(new Set());
    setHookIds(new Set(DEFAULT_LOAD_HOOKS));
    setCacheWarm(WARM_CACHE);
    setRunningState(true);
    setSelected(null);
  }, [log, startTrace]);

  const reset = useCallback(() => {
    setUsers(60);
    setPace(4);
    setOffice(false);
    setFailures(new Set());
    setHookIds(new Set(DEFAULT_LOAD_HOOKS));
    setCacheWarm(WARM_CACHE);
    setRevokeWave(0);
    setMissionId(null);
    setTraceAt(0);
    setTracePlaying(true);
    log('', 'reset');
  }, [log]);

  return {
    users, pace, office, hookIds, failures, running, load, health,
    traceId, trace, traceAt, tracePlaying, selected, missionId, completed, logs,
    setUsers, setPace,
    setOffice: (value) => {
      setOffice(value);
      log('', value ? 'all users now share one IP for express-rate-limit' : 'each user has their own IP');
    },
    toggleHookLoad: (id) => setHookIds((current) => toggled(current, id)),
    toggleFailure, setRunning, startTrace, advanceTrace, jumpTrace, stepTrace, toggleTracePlay,
    selectNode, clearSelection: () => setSelected(null), startMission, reset,
  };
}
