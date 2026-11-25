jest.mock("../core/realtime/socketServer", () => ({
  emitToAll: jest.fn(),
  emitToUsers: jest.fn(),
}));

const { emitToUsers } = require("../core/realtime/socketServer");
const { normalizeUserIds, publish } = require("../core/lib/authorizationEvents");

describe("authorization events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizes arrays, sets, and scalar user identifiers", () => {
    expect(normalizeUserIds(["USR-1", "USR-1", null, "USR-2"]))
      .toEqual(["USR-1", "USR-2"]);
    expect(normalizeUserIds(new Set(["USR-1", "USR-2"])))
      .toEqual(["USR-1", "USR-2"]);
    expect(normalizeUserIds("USR-1")).toEqual(["USR-1"]);
  });

  test("publishes an array to the realtime socket boundary", () => {
    publish(["USR-1", "USR-1", "USR-2"], "roles-changed");

    expect(emitToUsers).toHaveBeenCalledTimes(1);
    expect(emitToUsers).toHaveBeenCalledWith(
      ["USR-1", "USR-2"],
      "access:changed",
      expect.objectContaining({ reason: "roles-changed" }),
    );
  });
});
