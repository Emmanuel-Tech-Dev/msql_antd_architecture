const { POLICY_EFFECTS } = require("./abacEngine");

const ACTIVE_ACCOUNT_STATUSES = new Set([true, 1, "1", "active", "enabled"]);

function isActiveAccountStatus(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : value;
  return ACTIVE_ACCOUNT_STATUSES.has(normalized);
}

function createCoreAbacPolicies() {
  return [
    {
      id: "core.authenticated-subject",
      priority: 1_000,
      evaluate(context) {
        if (!context?.subject?.id) {
          return {
            effect: POLICY_EFFECTS.DENY,
            reason: "SUBJECT_NOT_AUTHENTICATED",
          };
        }
        return POLICY_EFFECTS.ALLOW;
      },
    },
    {
      id: "core.active-account",
      priority: 900,
      evaluate(context) {
        if (!isActiveAccountStatus(context?.subject?.attributes?.accountStatus)) {
          return {
            effect: POLICY_EFFECTS.DENY,
            reason: "ACCOUNT_INACTIVE",
          };
        }
        return POLICY_EFFECTS.ALLOW;
      },
    },
  ];
}

module.exports = { createCoreAbacPolicies, isActiveAccountStatus };
