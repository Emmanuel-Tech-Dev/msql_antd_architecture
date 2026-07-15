jest.mock("../core/model/model", () => jest.fn());

const {
  isOverrideActive,
  resolveOverrides,
} = require("../core/lib/authorityService");

describe("hybrid RBAC authority resolution", () => {
  test("combines role inheritance with direct allows", () => {
    const result = resolveOverrides(
      [{ permission: "read:users" }],
      [{ permission: "export:reports", effect: "ALLOW" }],
      "permission",
    );

    expect(result.effective).toEqual(expect.arrayContaining(["read:users", "export:reports"]));
    expect(result.directAllows).toEqual(["export:reports"]);
  });

  test("direct deny removes an inherited permission and wins over allow", () => {
    const result = resolveOverrides(
      [{ permission: "delete:users" }],
      [
        { permission: "delete:users", effect: "ALLOW" },
        { permission: "delete:users", effect: "DENY" },
      ],
      "permission",
    );

    expect(result.effective).not.toContain("delete:users");
    expect(result.directDenies).toEqual(["delete:users"]);
  });

  test("ignores expired and not-yet-active overrides", () => {
    const now = new Date("2026-07-14T12:00:00Z");
    const result = resolveOverrides(
      [],
      [
        { permission: "expired", effect: "ALLOW", valid_until: "2026-07-14T11:59:59Z" },
        { permission: "future", effect: "ALLOW", valid_from: "2026-07-14T12:00:01Z" },
        { permission: "active", effect: "ALLOW", valid_until: "2026-07-15T12:00:00Z" },
      ],
      "permission",
      { now },
    );

    expect(result.effective).toEqual(["active"]);
    expect(isOverrideActive({ effect: "ALLOW", valid_until: "2026-07-14T12:00:00Z" }, now)).toBe(false);
  });

  test("user overrides cannot change privileged system-role behavior", () => {
    const result = resolveOverrides(
      [{ permission: "read:users" }],
      [
        { permission: "read:users", effect: "DENY" },
        { permission: "invented:bypass", effect: "ALLOW" },
      ],
      "permission",
      { privileged: true },
    );

    expect(result.effective).toEqual(["read:users"]);
    expect(result.directAllows).toEqual([]);
    expect(result.directDenies).toEqual([]);
    expect(result.overridesApplied).toBe(false);
  });
});
