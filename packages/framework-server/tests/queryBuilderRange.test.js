const QueryBuilder = require("../core/lib/queryBuilder");

describe("query builder: limitRange and getSql", () => {
  test("limitRange(offset, count) adds MySQL's LIMIT offset, count", () => {
    const sql = new QueryBuilder().select(["id"], "invoices").where("status", "=", "open").orderBy("id").limitRange(40, 20).getSql();
    expect(sql).toBe("SELECT `id` FROM `invoices` WHERE `status` = ? ORDER BY `id` ASC LIMIT 40, 20");
  });

  test("with one argument it is limit(count); bad numbers throw", () => {
    expect(new QueryBuilder().select("*", "invoices").limitRange(5).getSql()).toBe("SELECT * FROM `invoices` LIMIT 5");
    expect(() => new QueryBuilder().select("*", "invoices").limitRange(-1, 5)).toThrow("Invalid offset: -1");
  });

  test("getSql includes the joins, like getSQL().query", () => {
    const builder = new QueryBuilder().select("*", "invoices").join("LEFT", "customers", "customers.id", "invoices.customer_id");
    expect(builder.getSql()).toBe(builder.getSQL().query);
    expect(builder.getSql()).toContain("LEFT JOIN `customers` ON `customers`.`id` = `invoices`.`customer_id`");
  });
});
