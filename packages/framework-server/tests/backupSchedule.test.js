jest.mock("../core/config/conn", () => ({ query: jest.fn(), execute: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), security: jest.fn() }));

const { nextAutomaticRun } = require("../core/lib/backupHistoryService");

const schedule = (overrides = {}) => ({
  enabled: true,
  frequency: "daily",
  hour: 2,
  keep: 14,
  startedAt: new Date(2026, 10, 2, 14, 30).toISOString(),
  ...overrides,
});

describe("nextAutomaticRun", () => {
  test("nothing is due while the schedule is off", () => {
    expect(nextAutomaticRun(schedule({ enabled: false }), null)).toBeNull();
  });

  test("the first backup waits for the chosen hour after the schedule started", () => {
    expect(nextAutomaticRun(schedule(), null)).toEqual(new Date(2026, 10, 3, 2, 0));
    const startedEarly = schedule({ startedAt: new Date(2026, 10, 2, 1, 0).toISOString() });
    expect(nextAutomaticRun(startedEarly, null)).toEqual(new Date(2026, 10, 2, 2, 0));
  });

  test("later backups come one interval after the last automatic one, at the chosen hour", () => {
    const last = { status: "DONE", createdAt: new Date(2026, 10, 3, 2, 4) };
    expect(nextAutomaticRun(schedule(), last)).toEqual(new Date(2026, 10, 4, 2, 0));
    expect(nextAutomaticRun(schedule({ frequency: "every3days" }), last)).toEqual(new Date(2026, 10, 6, 2, 0));
    expect(nextAutomaticRun(schedule({ frequency: "weekly" }), last)).toEqual(new Date(2026, 10, 10, 2, 0));
  });

  test("a failed backup is tried again an hour later", () => {
    const failed = { status: "FAILED", createdAt: new Date(2026, 10, 3, 2, 0) };
    expect(nextAutomaticRun(schedule(), failed)).toEqual(new Date(2026, 10, 3, 3, 0));
  });
});
