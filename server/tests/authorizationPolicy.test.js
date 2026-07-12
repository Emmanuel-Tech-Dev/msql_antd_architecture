const {
  canAccessResource,
  isPrivilegedSystemRole,
  matchesHttpMethod,
  matchesResourcePath,
} = require("../core/lib/authorizationPolicy");

describe("authorization policy", () => {
  test("matches exact paths and normalizes trailing slashes", () => {
    expect(matchesResourcePath("/api/admin", "/api/admin")).toBe(true);
    expect(matchesResourcePath("/api/admin/", "/api/admin")).toBe(true);
  });

  test("matches named route parameters by segment", () => {
    expect(matchesResourcePath("/api/admin/:id", "/api/admin/42")).toBe(true);
    expect(matchesResourcePath("/access/users/:role", "/access/users/Admin")).toBe(true);
    expect(matchesResourcePath("/api/admin/:id", "/api/admin/42/history")).toBe(false);
  });

  test("does not grant child routes from an exact base resource", () => {
    expect(matchesResourcePath("/api/admin", "/api/admin/table")).toBe(false);
    expect(matchesResourcePath("/api/admin", "/api/admin/42")).toBe(false);
  });

  test("supports an explicit final wildcard", () => {
    expect(matchesResourcePath("/api/reports/*", "/api/reports/daily/1")).toBe(true);
    expect(matchesResourcePath("/api/reports/*", "/api/users/1")).toBe(false);
  });

  test("matches configured methods without widening specific methods", () => {
    expect(matchesHttpMethod("GET", "GET")).toBe(true);
    expect(matchesHttpMethod("GET", "POST")).toBe(false);
    expect(matchesHttpMethod("ALL", "DELETE")).toBe(true);
  });

  test("requires both route and method", () => {
    const resource = {
      resource_path: "/access/assign/roles",
      http_method: "POST",
    };
    expect(canAccessResource(resource, "POST", "/access/assign/roles")).toBe(true);
    expect(canAccessResource(resource, "GET", "/access/assign/roles")).toBe(false);
  });

  test("recognizes only explicit privileged system roles", () => {
    expect(isPrivilegedSystemRole([{ role_id: "SuperAdmin" }])).toBe(true);
    expect(isPrivilegedSystemRole(["dev"])).toBe(true);
    expect(isPrivilegedSystemRole(["Admin"])).toBe(false);
    expect(isPrivilegedSystemRole(["developer"])).toBe(false);
  });
});
