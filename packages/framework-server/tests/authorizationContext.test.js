const {
  buildHttpAuthorizationContext,
} = require("../core/lib/authorizationContext");

describe("HTTP authorization context", () => {
  test("maps trusted request and authority data into generic ABAC attributes", () => {
    const req = {
      path: "/api/sales/1",
      method: "PUT",
      user: { sub: "ADM-1", type: "access", token_version: 2 },
      requestId: "REQ-1",
      ip: "127.0.0.1",
      headers: { authorization: "Bearer secret", "user-agent": "jest" },
    };
    const authority = {
      account: { custom_id: "ADM-1", status: 1 },
      roleNames: ["Sales", "Sales"],
      effectivePermissions: ["update:sale"],
      privileged: false,
    };
    const matchedResources = [{
      resource: "update:sale:api",
      resource_type: "API_ENDPOINT",
      resource_path: "/api/sales/:id",
    }];

    const result = buildHttpAuthorizationContext({
      req,
      authority,
      matchedResources,
      now: new Date("2026-08-14T12:00:00Z"),
    });

    expect(result.subject).toEqual(expect.objectContaining({
      id: "ADM-1",
      roles: ["Sales"],
      permissions: ["update:sale"],
    }));
    expect(result.action.name).toBe("update:sale:api");
    expect(result.resource.attributes.routePatterns).toEqual(["/api/sales/:id"]);
    expect(result.environment.scope).toEqual({ type: "global", id: null });
    expect(result.environment.occurredAt).toBe("2026-08-14T12:00:00.000Z");
    expect(JSON.stringify(result)).not.toContain("Bearer secret");
  });
});
