import { useCallback, useMemo, useState } from 'react';
import {
  buildSimulationTrace,
  DEFAULT_COMPONENT_IDS,
  evaluatePolicy,
  HEALTHY_POLICY,
} from './architectureSimulationModel';

function policiesMatch(left, right) {
  return Object.keys(HEALTHY_POLICY).every((key) => left[key] === right[key]);
}

function sameComponents(left, right) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

export default function useArchitectureSimulation() {
  // Policy edits are staged. This keeps half-edited inspector values from
  // changing the graph before the explicit Trigger Policy Change action.
  const [draftPolicy, setDraftPolicy] = useState({ ...HEALTHY_POLICY });
  const [activePolicy, setActivePolicy] = useState({ ...HEALTHY_POLICY });
  const [componentIds, setComponentIds] = useState([...DEFAULT_COMPONENT_IDS]);
  const [runId, setRunId] = useState(1);

  const scenario = useMemo(
    () => evaluatePolicy(activePolicy, componentIds),
    [activePolicy, componentIds],
  );
  const trace = useMemo(
    () => buildSimulationTrace(scenario, activePolicy, runId, componentIds),
    [activePolicy, componentIds, runId, scenario],
  );

  const updateDraft = useCallback((key, value) => {
    setDraftPolicy((current) => ({ ...current, [key]: value }));
  }, []);

  const trigger = useCallback(() => {
    setActivePolicy({ ...draftPolicy });
    setRunId((current) => current + 1);
  }, [draftPolicy]);

  // Adding or removing a visible component is itself an explicit simulation
  // action, so component changes evaluate immediately against active policy.
  const toggleComponent = useCallback((componentId) => {
    setComponentIds((current) => current.includes(componentId)
      ? current.filter((id) => id !== componentId)
      : [...current, componentId]);
    setRunId((current) => current + 1);
  }, []);

  const remediate = useCallback(() => {
    const repaired = { ...activePolicy, ...scenario.fix };
    setDraftPolicy(repaired);
    setActivePolicy(repaired);
    setRunId((current) => current + 1);
  }, [activePolicy, scenario.fix]);

  const restoreBaseline = useCallback(() => {
    setDraftPolicy({ ...HEALTHY_POLICY });
    setActivePolicy({ ...HEALTHY_POLICY });
    setComponentIds([...DEFAULT_COMPONENT_IDS]);
    setRunId((current) => current + 1);
  }, []);

  return {
    draftPolicy,
    activePolicy,
    componentIds,
    scenario,
    trace,
    runId,
    hasPendingChanges: !policiesMatch(draftPolicy, activePolicy),
    baselineActive: policiesMatch(activePolicy, HEALTHY_POLICY)
      && sameComponents(componentIds, DEFAULT_COMPONENT_IDS),
    updateDraft,
    trigger,
    toggleComponent,
    remediate,
    restoreBaseline,
  };
}
