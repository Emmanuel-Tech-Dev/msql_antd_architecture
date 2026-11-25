const POLICY_EFFECTS = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  ABSTAIN: "ABSTAIN",
});

const DECISION_REASONS = Object.freeze({
  RBAC_DENIED: "RBAC_DENIED",
  POLICY_DENIED: "POLICY_DENIED",
  POLICY_ERROR: "POLICY_ERROR",
  ACCESS_GRANTED: "ACCESS_GRANTED",
});

function normalizeEffect(value, fallback = POLICY_EFFECTS.ABSTAIN) {
  const effect = String(value ?? "").trim().toUpperCase();
  return Object.values(POLICY_EFFECTS).includes(effect) ? effect : fallback;
}

function normalizePolicyResult(result, policyId) {
  if (typeof result === "boolean") {
    return {
      policyId,
      effect: result ? POLICY_EFFECTS.ALLOW : POLICY_EFFECTS.DENY,
    };
  }

  if (typeof result === "string") {
    return { policyId, effect: normalizeEffect(result) };
  }

  if (!result || typeof result !== "object") {
    return { policyId, effect: POLICY_EFFECTS.ABSTAIN };
  }

  return {
    policyId,
    effect: normalizeEffect(result.effect),
    reason: result.reason ? String(result.reason) : undefined,
    details: result.details,
  };
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== "object") {
    throw new TypeError("ABAC policy must be an object");
  }
  if (!String(policy.id ?? "").trim()) {
    throw new TypeError("ABAC policy requires a stable id");
  }
  if (typeof policy.evaluate !== "function") {
    throw new TypeError(`ABAC policy ${policy.id} requires an evaluate function`);
  }
  if (policy.appliesTo !== undefined && typeof policy.appliesTo !== "function") {
    throw new TypeError(`ABAC policy ${policy.id} appliesTo must be a function`);
  }
}

class AbacPolicyRegistry {
  constructor(policies = []) {
    this.policies = new Map();
    policies.forEach((policy) => this.register(policy));
  }

  register(policy) {
    validatePolicy(policy);
    const id = String(policy.id).trim();
    if (this.policies.has(id)) {
      throw new Error(`ABAC policy already registered: ${id}`);
    }
    this.policies.set(id, { ...policy, id });
    return () => this.unregister(id);
  }

  unregister(policyId) {
    return this.policies.delete(String(policyId ?? "").trim());
  }

  list() {
    return [...this.policies.values()].sort(
      (left, right) => Number(right.priority ?? 0) - Number(left.priority ?? 0),
    );
  }
}

class AbacEngine {
  constructor({ registry = new AbacPolicyRegistry() } = {}) {
    this.registry = registry;
  }

  async evaluate(context, { baselineAllowed = false } = {}) {
    if (baselineAllowed !== true) {
      return {
        allowed: false,
        effect: POLICY_EFFECTS.DENY,
        reason: DECISION_REASONS.RBAC_DENIED,
        evaluations: [],
      };
    }

    const evaluations = [];

    for (const policy of this.registry.list()) {
      let applies = true;
      try {
        if (policy.appliesTo) applies = await policy.appliesTo(context);
      } catch {
        return {
          allowed: false,
          effect: POLICY_EFFECTS.DENY,
          reason: DECISION_REASONS.POLICY_ERROR,
          deniedBy: policy.id,
          evaluations,
        };
      }

      if (!applies) continue;

      let evaluation;
      try {
        evaluation = normalizePolicyResult(await policy.evaluate(context), policy.id);
      } catch {
        return {
          allowed: false,
          effect: POLICY_EFFECTS.DENY,
          reason: DECISION_REASONS.POLICY_ERROR,
          deniedBy: policy.id,
          evaluations,
        };
      }

      evaluations.push(evaluation);
      if (evaluation.effect === POLICY_EFFECTS.DENY) {
        return {
          allowed: false,
          effect: POLICY_EFFECTS.DENY,
          reason: evaluation.reason || DECISION_REASONS.POLICY_DENIED,
          deniedBy: policy.id,
          evaluations,
        };
      }
    }

    return {
      allowed: true,
      effect: POLICY_EFFECTS.ALLOW,
      reason: DECISION_REASONS.ACCESS_GRANTED,
      evaluations,
    };
  }
}

module.exports = {
  AbacEngine,
  AbacPolicyRegistry,
  DECISION_REASONS,
  POLICY_EFFECTS,
  normalizeEffect,
  normalizePolicyResult,
};
