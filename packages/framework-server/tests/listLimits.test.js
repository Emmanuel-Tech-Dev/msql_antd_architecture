jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn(), performance: jest.fn() }));

const db = require("../core/config/conn");
const BaseService = require("../core/lib/baseService");

function serviceFor(query, headers = {}) {
  return new BaseService({
    params: { resources: "invoices" },
    query,
    headers,
    validatedResource: { table: "invoices", primaryKey: "id", fields: ["id", "total"], restricted: [] },
  }, {});
}
const limitOf = () => db.query.mock.calls.map(([sql]) => sql).find((sql) => /LIMIT/.test(sql));

beforeEach(() => {
  db.query.mockReset();
  db.query.mockImplementation(async (sql) => {
    if (sql.startsWith("DESCRIBE")) return [[{ Field: "id", Key: "PRI" }, { Field: "total", Key: "" }]];
    if (/COUNT\(\*\)/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });
});

describe("list routes cap the page size", () => {
  test("GET /api/:resources/table: ?limit is capped by maxLimit (100 unless configured)", async () => {
    await serviceFor({ page: "1", limit: "100000" }).findAllWithTable();
    expect(limitOf()).toMatch(/LIMIT 100 OFFSET 0$/);
  });

  test("GET /api/:resources/table: no limit gives the default (20); a bad page is page 1", async () => {
    await serviceFor({ page: "abc" }).findAllWithTable();
    expect(limitOf()).toMatch(/LIMIT 20 OFFSET 0$/);
  });

  test("GET /api/:resources and POST /api/:resources/query: at most 100", async () => {
    await serviceFor({ limit: "5000" }).findAll();
    expect(limitOf()).toMatch(/LIMIT 100 OFFSET 0$/);
    db.query.mockClear();
    await serviceFor({}).findAllWithParams({ paginate: { page: 2, limit: 9999 } });
    expect(limitOf()).toMatch(/LIMIT 100 OFFSET 100$/);
  });
});
