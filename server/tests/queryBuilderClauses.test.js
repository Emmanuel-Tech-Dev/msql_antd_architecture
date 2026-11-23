jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn() }));

const db = require("../core/config/conn");
const Model = require("../core/model/model");
const QueryBuilder = require("../core/lib/queryBuilder");
const utils = require("../shared/utils/functions");

const PROJECT_COUNT = "(SELECT COUNT(*) FROM projects project WHERE project.customer_id = customer.custom_id) AS project_count";

describe("QueryBuilder clause placement", () => {
  beforeEach(() => jest.clearAllMocks());

  test("a subquery's WHERE in the select list does not turn the first condition into AND", () => {
    const { query, params } = new QueryBuilder()
      .select(["customer.name", PROJECT_COUNT], "customers customer")
      .whereNull("customer.deletedAt")
      .where("customer.source_id", "=", 3)
      .getSQL();
    expect(query).toBe(`SELECT \`customer\`.\`name\`, ${PROJECT_COUNT} FROM customers customer WHERE \`customer\`.\`deletedAt\` IS NULL AND \`customer\`.\`source_id\` = ?`);
    expect(params).toEqual([3]);
  });

  test("joins go after the outer FROM, not inside a subquery column", () => {
    const { query } = new QueryBuilder()
      .select(["customer.name", PROJECT_COUNT, "source.name AS source_name"], "customers customer")
      .join("LEFT", "customer_sources source", "source.id", "customer.source_id")
      .whereNull("customer.deletedAt")
      .getSQL();
    expect(query).toBe(`SELECT \`customer\`.\`name\`, ${PROJECT_COUNT}, source.name AS source_name FROM customers customer LEFT JOIN customer_sources source ON \`source\`.\`id\` = \`customer\`.\`source_id\` WHERE \`customer\`.\`deletedAt\` IS NULL`);
  });

  test("a grouped search is added with AND, its conditions joined with OR", () => {
    const { query, params } = new QueryBuilder()
      .select("*", "customers")
      .whereNull("deletedAt")
      .where([{ column: "name", value: "%ama%" }, { column: "phone", value: "%ama%" }], "LIKE", "OR")
      .getSQL();
    expect(query).toBe("SELECT * FROM `customers` WHERE `deletedAt` IS NULL AND (`name` LIKE ? OR `phone` LIKE ?)");
    expect(params).toEqual(["%ama%", "%ama%"]);
  });

  test("an orWhere group is added with OR", () => {
    const { query } = new QueryBuilder()
      .select("*", "customers")
      .where("status", "=", "ACTIVE")
      .orWhere([{ column: "name", value: "Ama" }, { column: "city", value: "Kumasi" }], "=", "AND")
      .getSQL();
    expect(query).toBe("SELECT * FROM `customers` WHERE `status` = ? OR (`name` = ? AND `city` = ?)");
  });

  test("orderBy can be called again for a tie-breaker", () => {
    const { query } = new QueryBuilder()
      .select(["name"], "customers")
      .orderBy("name", "asc")
      .orderBy("id", "DESC")
      .limit(20)
      .getSQL();
    expect(query).toBe("SELECT `name` FROM `customers` ORDER BY `name` ASC, `id` DESC LIMIT 20");
  });

  test("selectRaw adds columns before the outer FROM", () => {
    const { query } = new QueryBuilder()
      .select(["customer.name", PROJECT_COUNT], "customers customer")
      .selectRaw("customer.city AS town")
      .getSQL();
    expect(query).toBe(`SELECT \`customer\`.\`name\`, ${PROJECT_COUNT}, customer.city AS town FROM customers customer`);
  });

  test("a second having condition is joined with AND", () => {
    const { query } = new QueryBuilder()
      .select(["customer_id", "SUM(amount) AS paid"], "payments")
      .groupBy("customer_id")
      .having("SUM(amount)", ">", 100)
      .having("COUNT(*)", ">=", 2)
      .getSQL();
    expect(query).toBe("SELECT `customer_id`, SUM(amount) AS paid FROM `payments` GROUP BY `customer_id` HAVING SUM(amount) > ? AND COUNT(*) >= ?");
  });

  test("whereColumns compares two columns without parameters", () => {
    const { query, params } = new QueryBuilder()
      .select("*", "supplier_bills bill")
      .whereNull("bill.deletedAt")
      .whereColumns("bill.amount_paid", "<", "bill.total")
      .getSQL();
    expect(query).toBe("SELECT * FROM supplier_bills bill WHERE `bill`.`deletedAt` IS NULL AND `bill`.`amount_paid` < `bill`.`total`");
    expect(params).toEqual([]);
  });

  test("keywords inside quoted text are ignored", () => {
    expect(utils.topLevelIndex("SELECT 'a FROM b' AS label FROM items", /FROM\s/)).toBe(27);
  });
});

describe("counting", () => {
  beforeEach(() => jest.clearAllMocks());

  test("countQuery swaps the outer select list and drops ORDER BY", () => {
    expect(utils.countQuery(`SELECT customer.name, ${PROJECT_COUNT} FROM customers customer WHERE customer.x = ? ORDER BY project_count DESC`))
      .toBe("SELECT COUNT(*) AS total FROM customers customer WHERE customer.x = ?");
  });

  test("countQuery counts grouped rows as a derived table", () => {
    expect(utils.countQuery("SELECT customer_id, SUM(amount) AS paid FROM payments GROUP BY customer_id ORDER BY paid DESC"))
      .toBe("SELECT COUNT(*) AS total FROM (SELECT customer_id, SUM(amount) AS paid FROM payments GROUP BY customer_id) AS counted_rows");
  });

  test("paginate counts with joins and subquery columns, then pages the rows", async () => {
    db.query
      .mockResolvedValueOnce([[{ total: 42 }]])
      .mockResolvedValueOnce([[{ name: "Ama" }]]);

    const page = await new Model()
      .select(["customer.name", PROJECT_COUNT], "customers customer")
      .join("LEFT", "customer_sources source", "source.id", "customer.source_id")
      .whereNull("customer.deletedAt")
      .orderBy("project_count", "DESC")
      .orderBy("customer.id", "DESC")
      .paginate(2, 20);

    expect(db.query.mock.calls[0][0]).toBe(
      "SELECT COUNT(*) AS total FROM customers customer LEFT JOIN customer_sources source ON `source`.`id` = `customer`.`source_id` WHERE `customer`.`deletedAt` IS NULL",
    );
    expect(db.query.mock.calls[1][0]).toMatch(/ORDER BY `project_count` DESC, `customer`\.`id` DESC LIMIT 20 OFFSET 20$/);
    expect(page.pagination).toMatchObject({ total: 42, page: 2, limit: 20, totalPages: 3 });
  });

  test("count counts the built query and resets the builder", async () => {
    db.query.mockResolvedValueOnce([[{ count: 5 }]]);
    const model = new Model().select("*", "customers").whereNull("deletedAt");
    await expect(model.count()).resolves.toBe(5);
    expect(db.query).toHaveBeenCalledWith("SELECT COUNT(*) AS count FROM `customers` WHERE `deletedAt` IS NULL", []);
    expect(model.query).toBe("");
  });
});
