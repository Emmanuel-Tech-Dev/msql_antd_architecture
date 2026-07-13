const { getLookupColumns } = require("../core/config/lookupRegistry");

describe("lookup registry", () => {
  test("allows only the system resource fields required by form metadata", () => {
    expect(getLookupColumns("system_resources")).toEqual([
      "id",
      "resource_type",
    ]);
  });

  test("continues to reject unregistered tables", () => {
    expect(getLookupColumns("admin_credentials")).toBeNull();
  });
});
