---
id: query-builder
title: Query builder
track: reference
group: Package reference
order: 0.45
eyebrow: Model from @msql-antd/framework-server
audience: Backend developers
readTime: 22 min
summary: Every Model method with the forms it accepts, an example and the exact SQL it produces: select, where (chained, grouped, OR), joins, sorting, paging, grouping, aggregates, writes, full-text search, transactions, and the list URL syntax.
---

## How it works

new Model() starts an empty query. Each method adds a piece and returns the same builder, so calls chain; a run method (execute, first, count, exists, paginate) sends it to MySQL and resets the builder. Every value travels as a ? parameter, and every name is checked and quoted with backticks.

```js The shape of every query
const { Model } = require("@msql-antd/framework-server");

const rows = await new Model()
  .select(["id", "number", "total"], "invoices")   // what and from where
  .where("status", "=", "open")                    // conditions
  .orderBy("issued_on", "DESC")                    // order
  .limit(20)                                       // how many
  .execute();                                      // run it
```

Every SQL result on this page was produced by the builder itself (getSQL()), with the parameters shown after it. Use getSQL() the same way to see what a query of yours will send.

:::warning One builder per query
Start each query with its own new Model(). A run method resets the builder, but a builder you abandon before running keeps its pieces.
:::

## select and from

| Call | SQL |
| --- | --- |
| select(["id", "number", "total"], "invoices") | SELECT `id`, `number`, `total` FROM `invoices` |
| select("*", "invoices") | SELECT * FROM `invoices` |
| select(["customer_id", "SUM(total) AS spent"], "invoices") | SELECT `customer_id`, SUM(total) AS spent FROM `invoices` |
| select(["id"]).from("invoices") | SELECT `id` FROM `invoices` |
| select(["invoices.id", "customers.name"], "invoices") | SELECT `invoices`.`id`, `customers`.`name` FROM `invoices` |

columns is a name, "*", "table.*", an array of them, or an expression. A plain name is quoted; a value containing a space, bracket or comma (SUM(total) AS spent) is passed through as written, which is how expressions work.

:::danger Never pass request input as a column or table name
Values from a request belong in where values, which are always parameters. If a column name itself comes from the request (a sort column, say), check it first with utils.requireIdentifier(name, "column name"); a name with a space would otherwise reach the SQL as written.
:::

## where: one condition at a time (chaining)

where(column, operator, value). Each call adds AND; the first adds WHERE.

```js Chained conditions
new Model().select("*", "invoices").where("status", "=", "open").where("total", ">=", 100)
// SELECT * FROM `invoices` WHERE `status` = ? AND `total` >= ?      params: ["open", 100]
```

| Operator | Example |
| --- | --- |
| = != <> | where("status", "!=", "void") |
| > >= < <= | where("total", ">=", 100) |
| LIKE, NOT LIKE | where("email", "LIKE", "%@acme.com") (you write the %) |
| IN, NOT IN | prefer whereIn / whereNotIn below |

Any other operator throws "Invalid SQL operator: …". The operator is not optional when you give a value: where("status", "=", "open").

:::warning Matching NULL
where("paid_at", "=", null) sends paid_at = NULL, which is never true in SQL, so it finds nothing. Use whereNull("paid_at") or whereNotNull("paid_at").
:::

## where with an array: a bracketed group

Pass an array of { column, value, operator } to add several conditions inside one pair of brackets. The second argument is the operator for items that do not name their own; the third joins the items (AND by default). The whole group is added with AND.

```js One search box across several columns
new Model().select("*", "customers")
  .where([{ column: "name", value: "%ama%" }, { column: "email", value: "%ama%" }], "LIKE", "OR")
// SELECT * FROM `customers` WHERE (`name` LIKE ? OR `email` LIKE ?)     params: ["%ama%", "%ama%"]
```

```js Items with their own operators, inside an outer AND
new Model().select("*", "invoices")
  .where("branch_id", "=", 3)
  .where([
    { column: "total", operator: ">=", value: 1000 },
    { column: "status", operator: "=", value: "overdue" },
  ], "=", "OR")
// SELECT * FROM `invoices` WHERE `branch_id` = ? AND (`total` >= ? OR `status` = ?)
//   params: [3, 1000, "overdue"]
```

```js A group without a joiner: AND
new Model().select("*", "invoices").where([{ column: "status", value: "open" }, { column: "branch_id", value: 3 }])
// SELECT * FROM `invoices` WHERE (`status` = ? AND `branch_id` = ?)     params: ["open", 3]
```

An empty array adds nothing, so a search with no columns is skipped safely.

## orWhere

The same two forms, joined with OR. With an array, the items are joined by OR unless you give AND.

```js OR between conditions
new Model().select("*", "invoices").where("status", "=", "open").orWhere("status", "=", "overdue")
// SELECT * FROM `invoices` WHERE `status` = ? OR `status` = ?      params: ["open", "overdue"]
```

```js An OR group of AND conditions
new Model().select("*", "invoices")
  .where("status", "=", "paid")
  .orWhere([{ column: "total", value: 0 }, { column: "customer_id", value: 7 }], "=", "AND")
// SELECT * FROM `invoices` WHERE `status` = ? OR (`total` = ? AND `customer_id` = ?)
```

:::warning AND binds before OR
where(a).orWhere(b).where(c) produces a OR b AND c, which SQL reads as a OR (b AND c). When you mix AND and OR, put the OR part in a group: where(a).where([b, c], "=", "OR") gives a AND (b OR c).
:::

## More conditions

| Call | SQL | Notes |
| --- | --- | --- |
| whereIn("status", ["open", "overdue"]) | `status` IN (?, ?) | Throws on an empty array: check the list first |
| whereNotIn("branch_id", [9, 10]) | `branch_id` NOT IN (?, ?) | Same |
| whereBetween("issued_on", "2026-01-01", "2026-03-31") | `issued_on` BETWEEN ? AND ? | Both ends included; both required |
| whereLike("number", "INV-2026%") | `number` LIKE ? | You write the %; an empty pattern throws |
| whereNull("deleted_at") / whereNotNull("paid_at") | IS NULL / IS NOT NULL | |
| whereColumns("amount_paid", "<", "total") | `amount_paid` < `total` | Compares two columns, no parameter |

All of them add AND, and all chain with where and the groups:

```js Combined
new Model().select("*", "invoices")
  .whereIn("status", ["open", "overdue"])
  .whereNotIn("branch_id", [9, 10])
  .whereNull("deleted_at")
// SELECT * FROM `invoices` WHERE `status` IN (?, ?) AND `branch_id` NOT IN (?, ?) AND `deleted_at` IS NULL
```

## Joins

join(type, table, leftColumn, rightColumn) or join(type, table, leftColumn, operator, rightColumn). Types: INNER, LEFT, RIGHT, FULL, CROSS, JOIN. Joins are placed after FROM, before WHERE, whatever order you call them in.

```js Invoices with their customer's name
new Model()
  .select(["invoices.id", "customers.name"], "invoices")
  .join("LEFT", "customers", "customers.id", "invoices.customer_id")
  .where("invoices.status", "=", "open")
// SELECT `invoices`.`id`, `customers`.`name` FROM `invoices`
//   LEFT JOIN `customers` ON `customers`.`id` = `invoices`.`customer_id` WHERE `invoices`.`status` = ?
```

```js Two joins, one with an explicit operator
new Model().select(["invoices.id"], "invoices")
  .join("INNER", "customers", "customers.id", "=", "invoices.customer_id")
  .join("LEFT", "branches", "branches.id", "invoices.branch_id")
```

multiSelect([{ table, columns }]) selects from several tables, each column prefixed with its table; the first table is the FROM:

```js multiSelect
new Model()
  .multiSelect([{ table: "invoices", columns: ["id", "total"] }, { table: "customers", columns: ["name"] }])
  .join("INNER", "customers", "customers.id", "invoices.customer_id")
// SELECT `invoices`.`id`, `invoices`.`total`, `customers`.`name` FROM `invoices`
//   INNER JOIN `customers` ON `customers`.`id` = `invoices`.`customer_id`
```

Write qualified names (customers.name) whenever two tables share a column name. Table aliases work by writing the table with its alias; the text is used as written (not quoted), so write it yourself, never from request input:

```js Aliases
new Model()
  .select(["i.id", "c.name"], "invoices i")
  .join("LEFT", "customers c", "c.id", "i.customer_id")
  .where("i.status", "=", "open")
// SELECT `i`.`id`, `c`.`name` FROM invoices i LEFT JOIN customers c ON `c`.`id` = `i`.`customer_id` WHERE `i`.`status` = ?
```

## Sorting, limits and paging

| Call | SQL |
| --- | --- |
| orderBy("issued_on", "DESC") | ORDER BY `issued_on` DESC (anything but DESC is ASC) |
| orderBy("issued_on", "DESC").orderBy("id", "DESC") | ORDER BY `issued_on` DESC, `id` DESC |
| limit(20) | LIMIT 20 |
| offset(40) | OFFSET 40 |
| limitRange(40, 20) | LIMIT 40, 20 (skip 40, take 20); limitRange(20) is limit(20) |

Add a unique column as the last sort (id) so pages never repeat or skip rows. limit and offset take whole numbers only: "ten" throws "Invalid limit: ten".

```js A page with its totals
const { result, pagination } = await new Model()
  .select(["id", "number", "total"], "invoices")
  .where("status", "=", "open")
  .orderBy("issued_on", "DESC").orderBy("id", "DESC")
  .paginate(2, 20);
// result: the 20 rows of page 2
// pagination: { total, page: 2, limit: 20, totalPages, hasNext, hasPrev }
```

paginate counts the rows first (joins and GROUP BY respected), then fetches the page; password and other secret fields are redacted from result. Cap a limit that comes from a request: paginate(page, utils.clampInteger(req.query.limit, 20, 100)).

## Grouping and aggregates

```js Customers with more than five invoices
new Model().select(["customer_id", "COUNT(*) AS invoices"], "invoices").groupBy("customer_id").having("COUNT(*)", ">", 5)
// SELECT `customer_id`, COUNT(*) AS invoices FROM `invoices` GROUP BY `customer_id` HAVING COUNT(*) > ?
```

```js One total
const [{ revenue }] = await new Model().aggregate("SUM", "total", "revenue").from("invoices").where("status", "=", "paid").execute();
// SELECT SUM(`total`) AS `revenue` FROM `invoices` WHERE `status` = ?
```

| Call | What it does |
| --- | --- |
| groupBy("customer_id") / groupBy(["branch_id", "status"]) | GROUP BY one or several columns |
| having(column, operator, value) | HAVING; call again for AND |
| aggregate(func, column, alias) | Starts SELECT COUNT/SUM/AVG/MIN/MAX(column) AS alias; add from(table) |
| addAggregate(func, column, alias) | Adds one to an existing select: select(["branch_id"], "invoices").addAggregate("AVG", "total", "average").groupBy("branch_id") |
| selectRaw(sql) | Adds a raw expression to the select list: select(["id", "total"], "invoices").selectRaw("total - amount_paid AS balance") |

Other functions (MEDIAN…) throw. selectRaw text goes into the SQL as written: never build it from request input.

## Running a query

| Method | Returns |
| --- | --- |
| execute() | Rows for a SELECT; { insertId, affectedRows } for a write |
| first() | The first row, or null (adds LIMIT 1) |
| count(column = "*") | A number. SELECT COUNT(*) AS count … without ORDER BY; a grouped query is counted as a subquery so each group counts once |
| exists() | true when count() > 0 |
| paginate(page, limit) | { result, pagination }, see above |
| raw(sql, params) | Your own SQL with ? parameters; rows |
| getSQL() | { query, params } without running; getSql() gives the text alone |

```js first, count, exists
const invoice = await new Model().select("*", "invoices").where("id", "=", req.params.id).first();
if (!invoice) throw new AppError("ERR_RECORD_NOT_FOUND");

const open = await new Model().select("id", "invoices").where("status", "=", "open").count();
const taken = await new Model().select("id", "customers").where("email", "=", email).exists();
```

## Writing

```js Insert
const { insertId } = await new Model().insert("invoices", { number: "INV-1001", customer_id: 7, total: 450 }).execute();
// INSERT INTO `invoices` (`number`, `customer_id`, `total`) VALUES (?, ?, ?)
```

```js Many rows at once (missing fields become NULL)
await new Model().bulkInsert("invoice_lines", [
  { invoice_id: 1, item: "Paint", qty: 2 },
  { invoice_id: 1, item: "Brush" },
]).execute();
// INSERT INTO `invoice_lines` (`invoice_id`, `item`, `qty`) VALUES (?, ?, ?), (?, ?, ?)
//   params: [1, "Paint", 2, 1, "Brush", null]
```

```js Insert, or update when the key exists
await new Model().insert("counters", { name: "invoice", value: 1 }).onDuplicateKeyUpdate({ value: 2 }).execute();
// INSERT INTO `counters` (`name`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?
```

```js Update and delete
const { affectedRows } = await new Model().update("invoices", { status: "paid", paid_at: now }).where("id", "=", 12).execute();
if (!affectedRows) throw new AppError("ERR_RECORD_NOT_FOUND");
// UPDATE `invoices` SET `status` = ?, `paid_at` = ? WHERE `id` = ?

await new Model().delete("invoice_lines").whereIn("id", [4, 5]).execute();
// DELETE FROM `invoice_lines` WHERE `id` IN (?, ?)
```

:::danger update and delete without where
update() and delete() change every row of the table when no where follows. Check affectedRows when exactly one row should change.
:::

These writes skip the metadata's field rules. For a table described in metadata, write through BaseService or validate first with the metadata (validateRecordAgainstMetadata) when the values come from a user.

## Transactions and locking

When several writes must all succeed or all fail, run them in Model.transaction. The function gets a helper on one connection; throwing anywhere rolls everything back and the error continues to your route.

```js Pay an invoice
await new Model().transaction(async (tx) => {
  const [invoice] = await tx.builder()
    .select(["id", "total", "amount_paid"], "invoices")
    .where("id", "=", id)
    .forUpdate()                      // lock the row until commit
    .executeInTransaction();
  if (!invoice) throw new AppError("ERR_RECORD_NOT_FOUND");

  await tx.builder().insert("payments", { invoice_id: id, amount }).executeInTransaction();
  await tx.builder().update("invoices", { amount_paid: invoice.amount_paid + amount }).where("id", "=", id).executeInTransaction();
});
```

| Helper | Use |
| --- | --- |
| tx.builder() | A builder bound to the transaction: every method above, run with executeInTransaction() |
| tx.query(sql, params) | Raw SQL on the transaction's connection |
| tx.connection | The connection, for helpers that take one |

:::warning execute() inside a transaction
new Model().execute() and tx.builder().execute() use another connection, outside the transaction: they are not rolled back. Inside the function always use tx.builder() … executeInTransaction().
:::

forUpdate() locks the selected rows until the transaction ends, so two requests cannot both read the old balance; outside a transaction it locks nothing useful.

## Full-text search

Needs a FULLTEXT index on the columns.

| Call | SQL |
| --- | --- |
| fullTextSearch("articles", ["title", "body"], "house paint") | SELECT * FROM `articles` WHERE MATCH(`title`, `body`) AGAINST(? IN NATURAL LANGUAGE MODE) |
| fullTextSearchWithScore("articles", ["title", "body"], "house paint") | Adds MATCH(…) AGAINST(?) AS relevance_score to the select |

Modes: NATURAL LANGUAGE (default), BOOLEAN, QUERY EXPANSION. In BOOLEAN mode the builder removes the operator characters + - < > ( ) ~ * and searches the remaining words as one phrase ("paint +brush" becomes "paint  brush"), so Boolean operators cannot be used from here.

## Errors the builder throws

| Mistake | Message |
| --- | --- |
| Unknown operator | Invalid SQL operator: LIKEX |
| A name with forbidden characters | Invalid SQL identifier: a;drop |
| whereIn / whereNotIn with [] | Values for whereIn must be a non-empty array |
| Unknown join type | Invalid join type: OUTER. Must be one of: INNER, LEFT, RIGHT, FULL, CROSS, JOIN |
| Unknown aggregate | Unsupported aggregate function: MEDIAN. Must be one of: COUNT, SUM, AVG, MIN, MAX |
| forUpdate on a non-SELECT, or twice | forUpdate requires an unlocked SELECT query |
| A limit that is not a whole number | Invalid limit: ten |

These are programming errors, so they reach the error handler as 500s; check request input (requireIdentifier, a non-empty list) before it reaches the builder.

## The list URL syntax

The generic list route GET /api/<table>/table (what useList, useTableApi and MetadataTable call) turns query parameters into builder calls:

| Parameter | Becomes |
| --- | --- |
| page, limit | The page and its size; limit is capped (100 unless the table config raises it to at most 500); default 20 |
| search=ama | (col1 LIKE '%ama%' OR col2 LIKE '%ama%') over the configured searchable columns |
| status=open | `status` = 'open' |
| total_min=100 / total_max=500 | `total` >= 100 / `total` <= 500 |
| status_in=open,overdue | `status` IN ('open', 'overdue') |
| status_not_in=void,draft | `status` NOT IN ('void', 'draft') |
| name_like=ama | `name` LIKE '%ama%'; name_like=ama,kofi gives (name LIKE '%ama%' OR name LIKE '%kofi%') |
| sort_by=issued_on&sort_order=desc | ORDER BY `issued_on` DESC |

Only real columns of the table are used, never sensitive ones (password, token…) or ones the metadata hides from the user; unknown parameters are ignored. From the UI, pass them as filters; arrays are joined with commas:

```jsx useList with filters
const { data } = useList({
  resource: 'invoices',
  pagination: { current: 1, pageSize: 20 },
  filters: { status_in: ['open', 'overdue'], total_min: 100, search: 'ama' },
  sorters: { field: 'issued_on', order: 'descend' },
})
// GET /api/invoices/table?page=1&limit=20&status_in=open,overdue&total_min=100&search=ama&sort_by=issued_on&sort_order=desc
```
