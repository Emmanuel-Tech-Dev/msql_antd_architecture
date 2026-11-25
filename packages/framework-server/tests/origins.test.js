const { allowedOrigins, isAllowedOrigin, setAllowedOrigins, DEVELOPMENT_ORIGINS } = require("../core/config/origins");

describe("allowed origins", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    setAllowedOrigins([]);
  });

  test("origins from createServer and ALLOWED_ORIGINS both count; trailing slashes are ignored", () => {
    process.env.ALLOWED_ORIGINS = "https://app.example.com, https://staff.example.com/";
    setAllowedOrigins(["https://admin.example.com/"]);
    expect(isAllowedOrigin("https://admin.example.com")).toBe(true);
    expect(isAllowedOrigin("https://staff.example.com")).toBe(true);
    expect(isAllowedOrigin("https://app.example.com/")).toBe(true);
    expect(isAllowedOrigin("https://evil.example.com")).toBe(false);
  });

  test("a regular expression allows a family of origins", () => {
    setAllowedOrigins([/^https:\/\/[a-z0-9-]+\.example\.com$/]);
    expect(isAllowedOrigin("https://branch-12.example.com")).toBe(true);
    expect(isAllowedOrigin("https://example.com.evil.net")).toBe(false);
  });

  test("with nothing configured: local addresses in development, none in production", () => {
    delete process.env.ALLOWED_ORIGINS;
    process.env.NODE_ENV = "development";
    expect(allowedOrigins()).toEqual(DEVELOPMENT_ORIGINS);
    expect(isAllowedOrigin("https://my-production-app.com")).toBe(false);
    process.env.NODE_ENV = "production";
    expect(allowedOrigins()).toEqual([]);
    expect(isAllowedOrigin("http://localhost:5173")).toBe(false);
  });

  test("requests without an Origin header (same origin, curl) pass; bad entries are rejected", () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(() => setAllowedOrigins([42])).toThrow("expected URL strings or regular expressions");
  });
});
