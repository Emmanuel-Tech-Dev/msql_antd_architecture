jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn(), info: jest.fn() }));

const CacheManager = require("../shared/helpers/cacheManager");

let caches = [];
const createCache = (options) => {
  const cache = new CacheManager(options);
  caches.push(cache);
  return cache;
};
afterEach(() => {
  caches.forEach((cache) => cache.stopCleanupScheduler());
  caches = [];
  jest.restoreAllMocks();
});

describe("CacheManager", () => {
  test("set and get keep working as before", () => {
    const cache = createCache();
    cache.set("setting:theme", "dark");
    expect(cache.get("setting:theme")).toBe("dark");
    expect(cache.has("setting:theme")).toBe(true);
    cache.delete("setting:theme");
    expect(cache.get("setting:theme")).toBeUndefined();
  });

  test("remember loads once, and calls at the same time share that load", async () => {
    const cache = createCache();
    const load = jest.fn(async () => ({ columns: ["id"] }));
    const [first, second] = await Promise.all([cache.remember("t", load), cache.remember("t", load)]);
    expect(first).toBe(second);
    await cache.remember("t", load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("with maxAge, a value read all the time is still loaded again once it is that old", async () => {
    const cache = createCache();
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    const load = jest.fn(async () => "schema");
    await cache.remember("t", load, { maxAge: 60_000 });
    for (const second of [10, 20, 40, 59]) {
      now.mockReturnValue(1_000_000 + second * 1000);
      await cache.remember("t", load, { maxAge: 60_000 });
    }
    expect(load).toHaveBeenCalledTimes(1);
    now.mockReturnValue(1_000_000 + 60_001);
    await cache.remember("t", load, { maxAge: 60_000 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  test("a load that fails is not kept, so the next call tries again", async () => {
    const cache = createCache();
    const load = jest.fn().mockRejectedValueOnce(new Error("connection lost")).mockResolvedValue("ok");
    await expect(cache.remember("t", load)).rejects.toThrow("connection lost");
    expect(await cache.remember("t", load)).toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  test("the cleanup timer never keeps the process alive, and 0 turns it off", () => {
    expect(createCache().cleanupTimer.hasRef()).toBe(false);
    expect(createCache({ cleanupInterval: 0 }).cleanupTimer).toBeUndefined();
  });
});
