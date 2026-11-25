const framework = require("../index");

describe("package entry", () => {
  test("exports createServer and loads the rest on first use", () => {
    expect(typeof framework.createServer).toBe("function");
    const loaded = (file) => Boolean(require.cache[require.resolve(file)]);
    const logger = "../shared/helpers/logger";
    const wasLoaded = loaded(logger);
    expect(Object.keys(framework)).toEqual(expect.arrayContaining(["Model", "AppError", "utils", "logger", "authorization", "migrations"]));
    expect(loaded(logger)).toBe(wasLoaded);
    expect(framework.utils).toBe(require("../shared/utils/functions"));
    expect(framework.AppError).toBe(require("../shared/helpers/AppError"));
  });
});
