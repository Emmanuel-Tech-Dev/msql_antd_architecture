const {
  AbacEngine,
  AbacPolicyRegistry,
  DECISION_REASONS,
  POLICY_EFFECTS,
} = require("../core/lib/abacEngine");

function context() {
  return {
    subject: { id: "ADM-1", roles: ["Sales"], attributes: {} },
    action: { name: "update:sale", method: "PUT", attributes: {} },
    resource: { type: "sale", id: "SAL-1", attributes: {} },
    environment: { scope: { type: "global", id: null } },
  };
}

describe("ABAC engine", () => {
  test("cannot elevate a request denied by the RBAC baseline", async () => {
    const registry = new AbacPolicyRegistry([
      { id: "test.allow", evaluate: () => POLICY_EFFECTS.ALLOW },
    ]);
    const result = await new AbacEngine({ registry }).evaluate(context(), {
      baselineAllowed: false,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(DECISION_REASONS.RBAC_DENIED);
    expect(result.evaluations).toEqual([]);
  });

  test("allows the RBAC baseline when applicable policies do not deny", async () => {
    const registry = new AbacPolicyRegistry([
      { id: "test.allow", evaluate: () => true },
      { id: "test.abstain", evaluate: () => POLICY_EFFECTS.ABSTAIN },
      { id: "test.not-applicable", appliesTo: () => false, evaluate: () => false },
    ]);
    const result = await new AbacEngine({ registry }).evaluate(context(), {
      baselineAllowed: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.evaluations).toEqual([
      expect.objectContaining({ policyId: "test.allow", effect: "ALLOW" }),
      expect.objectContaining({ policyId: "test.abstain", effect: "ABSTAIN" }),
    ]);
  });

  test("uses deny-overrides combining", async () => {
    const registry = new AbacPolicyRegistry([
      { id: "test.allow", priority: 20, evaluate: () => POLICY_EFFECTS.ALLOW },
      {
        id: "test.record-boundary",
        priority: 10,
        evaluate: () => ({ effect: "DENY", reason: "RECORD_SCOPE_MISMATCH" }),
      },
    ]);
    const result = await new AbacEngine({ registry }).evaluate(context(), {
      baselineAllowed: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("RECORD_SCOPE_MISMATCH");
    expect(result.deniedBy).toBe("test.record-boundary");
  });

  test("fails closed when a policy cannot be evaluated", async () => {
    const registry = new AbacPolicyRegistry([
      {
        id: "test.broken-policy",
        evaluate: () => {
          throw new Error("data source unavailable");
        },
      },
    ]);
    const result = await new AbacEngine({ registry }).evaluate(context(), {
      baselineAllowed: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(DECISION_REASONS.POLICY_ERROR);
    expect(result.deniedBy).toBe("test.broken-policy");
  });

  test("rejects duplicate policy ids", () => {
    const registry = new AbacPolicyRegistry([
      { id: "test.unique", evaluate: () => true },
    ]);

    expect(() => registry.register({ id: "test.unique", evaluate: () => true }))
      .toThrow("ABAC policy already registered: test.unique");
  });
});
