const utils = require("../../shared/utils/functions");
const conn = require("../config/conn"); // Your connection pool

class QueryBuilder {
  constructor() {
    this.query = "";
    this.params = [];
    this.type = "";
    this.joins = [];
    this.selectedTables = [];
  }

  quoteIdentifier(identifier) {
    if (identifier === "*" || identifier === undefined || identifier === null) {
      return identifier;
    }

    if (Array.isArray(identifier)) {
      return identifier.map((item) => this.quoteIdentifier(item));
    }

    const value = String(identifier).trim();
    if (!value) {
      throw new Error("Identifier cannot be empty");
    }

    if (value === "*") return "*";

    if (/^[A-Za-z_][A-Za-z0-9_]*\.\*$/.test(value)) {
      const [table] = value.split(".");
      return `${this.quoteIdentifier(table)}.*`;
    }

    if (/^`[^`]+`(\.`[^`]+`)*$/.test(value)) {
      return value;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value)) {
      return value
        .split(".")
        .map((part) => `\`${part.replace(/`/g, "``")}\``)
        .join(".");
    }

    // Keep explicit SQL expressions available for developer-authored calls
    // such as COUNT(*), SUM(amount) AS total, and selectRaw().
    if (/[\s(),]/.test(value)) return value;

    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  normalizeOperator(operator = "=") {
    const op = String(operator).trim().toUpperCase();
    const allowed = new Set([
      "=",
      "!=",
      "<>",
      ">",
      ">=",
      "<",
      "<=",
      "LIKE",
      "NOT LIKE",
      "IN",
      "NOT IN",
    ]);

    if (!allowed.has(op)) {
      throw new Error(`Invalid SQL operator: ${operator}`);
    }

    return op;
  }

  normalizeDirection(direction = "ASC") {
    return String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
  }

  normalizeLimit(value, label = "limit") {
    const number = Number.parseInt(value, 10);
    if (!Number.isInteger(number) || number < 0) {
      throw new Error(`Invalid ${label}: ${value}`);
    }
    return number;
  }

  // SELECT columns
  select(columns = "*", table) {
    const fromClause = table ? ` FROM ${this.quoteIdentifier(table)}` : "";
    if (Array.isArray(columns)) {
      this.query = `SELECT ${columns
        .map((column) => this.quoteIdentifier(column))
        .join(", ")}${fromClause}`;
    } else {
      this.query = `SELECT ${this.quoteIdentifier(columns)}${fromClause}`;
    }

    return this;
  }

  // FROM table
  from(table) {
    this.query += ` FROM ${this.quoteIdentifier(table)}`;
    return this;
  }

  // WHERE condition
  where(
    columnOrConditions,
    operator = "=",
    valueOrLogic = null,
    // fullTextSearch = false
  ) {
    // Handle array of conditions
    if (Array.isArray(columnOrConditions)) {
      const conditions = columnOrConditions;
      const logic = valueOrLogic || "AND"; // Default to AND

      if (conditions.length === 0) return this;

      const whereClause = this.query.includes("WHERE") ? "" : " WHERE ";
      const conditionStrings = [];

      for (let condition of conditions) {
        const col = this.quoteIdentifier(condition.column);
        const op = this.normalizeOperator(condition.operator || operator);
        const val = condition.value;

        conditionStrings.push(`${col} ${op} ?`);
        this.params.push(val);
      }

      //   conditions.forEach((condition) => {
      //     const col = condition.column;
      //     const op = condition.operator || operator;
      //     const val = condition.value;

      //     conditionStrings.push(`${col} ${op} ?`);
      //     this.params.push(val);
      //   });

      if (this.query.includes("WHERE")) {
        this.query += ` ${logic} (${conditionStrings.join(` ${logic} `)})`;
      } else {
        this.query += `${whereClause}(${conditionStrings.join(` ${logic} `)})`;
      }

      return this;
    }

    // Handle single condition
    const column = this.quoteIdentifier(columnOrConditions);
    const op = this.normalizeOperator(operator);
    const value = valueOrLogic;

    if (this.query.includes("WHERE")) {
      this.query += ` AND ${column} ${op} ?`;
    } else {
      this.query += ` WHERE ${column} ${op} ?`;
    }

    this.params.push(value);
    return this;
  }

  // OR WHERE condition
  orWhere(columnOrConditions, operator = "=", valueOrLogic = null) {
    // Handle array of conditions
    if (Array.isArray(columnOrConditions)) {
      const conditions = columnOrConditions;
      const logic = valueOrLogic || "OR"; // Default to OR

      if (conditions.length === 0) return this;

      const whereClause = this.query.includes("WHERE") ? "" : " WHERE ";
      const conditionStrings = [];

      conditions.forEach((condition) => {
        const col = this.quoteIdentifier(condition.column);
        const op = this.normalizeOperator(condition.operator || operator);
        const val = condition.value;

        conditionStrings.push(`${col} ${op} ?`);
        this.params.push(val);
      });

      if (this.query.includes("WHERE")) {
        this.query += ` OR (${conditionStrings.join(` ${logic} `)})`;
      } else {
        this.query += `${whereClause}(${conditionStrings.join(` ${logic} `)})`;
      }

      return this;
    }

    // Handle single condition
    const column = this.quoteIdentifier(columnOrConditions);
    const op = this.normalizeOperator(operator);
    const value = valueOrLogic;

    if (this.query.includes("WHERE")) {
      this.query += ` OR ${column} ${op} ?`;
    } else {
      this.query += ` WHERE ${column} ${op} ?`;
    }
    this.params.push(value);
    return this;
  }

  // WHERE IN - for multiple values
  // Usage: whereIn("status", ["active", "pending", "completed"])
  whereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Values for whereIn must be a non-empty array");
    }

    const placeholders = values.map(() => "?").join(", ");
    const col = this.quoteIdentifier(column);

    if (this.query.includes("WHERE")) {
      this.query += ` AND ${col} IN (${placeholders})`;
    } else {
      this.query += ` WHERE ${col} IN (${placeholders})`;
    }

    this.params.push(...values);
    return this;
  }

  // WHERE NOT IN
  //useCase: whereNotIn("status", ["inactive", "banned"])
  whereNotIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Values for whereNotIn must be a non-empty array");
    }

    const placeholders = values.map(() => "?").join(", ");
    const col = this.quoteIdentifier(column);

    if (this.query.includes("WHERE")) {
      this.query += ` AND ${col} NOT IN (${placeholders})`;
    } else {
      this.query += ` WHERE ${col} NOT IN (${placeholders})`;
    }

    this.params.push(...values);
    return this;
  }

  // WHERE BETWEEN
  // Usage: whereBetween("age", 18, 65)
  whereBetween(column, min, max) {
    if (min === undefined || max === undefined) {
      throw new Error("Both min and max values are required for whereBetween");
    }
    const col = this.quoteIdentifier(column);
    if (this.query.includes("WHERE")) {
      this.query += ` AND ${col} BETWEEN ? AND ?`;
    } else {
      this.query += ` WHERE ${col} BETWEEN ? AND ?`;
    }
    this.params.push(min, max);
    return this;
  }

  // WHERE LIKE
  // Usage: whereLike("name", "%John%")
  //useCase: whereLike("column", "%pattern%")
  whereLike(column, pattern) {
    if (!pattern) {
      throw new Error("Pattern is required for whereLike");
    }
    const col = this.quoteIdentifier(column);
    if (this.query.includes("WHERE")) {
      this.query += ` AND ${col} LIKE ?`;
    } else {
      this.query += ` WHERE ${col} LIKE ?`;
    }
    this.params.push(pattern);
    return this;
  }

  // WHERE IS NULL
  //useCase: whereNull("deleted_at")
  whereNull(column) {
    if (!column) {
      throw new Error("Column name is required for whereNull");
    }
    const col = this.quoteIdentifier(column);
    if (this.query.includes("WHERE")) {
      this.query += ` AND ${col} IS NULL`;
    } else {
      this.query += ` WHERE ${col} IS NULL`;
    }
    return this;
  }

  // WHERE IS NOT NULL
  //useCase: whereNotNull("deleted_at")
  whereNotNull(column) {
    if (!column) {
      throw new Error("Column name is required for whereNull");
    }
    const col = this.quoteIdentifier(column);
    if (this.query.includes("WHERE")) {
      this.query += ` AND ${col} IS NOT NULL`;
    } else {
      this.query += ` WHERE ${col} IS NOT NULL`;
    }
    return this;
  }

  // ORDER BY
  orderBy(column, direction = "ASC") {
    this.query += ` ORDER BY ${this.quoteIdentifier(column)} ${this.normalizeDirection(direction)}`;
    return this;
  }

  // GROUP BY
  groupBy(columns) {
    if (Array.isArray(columns)) {
      this.query += ` GROUP BY ${columns
        .map((column) => this.quoteIdentifier(column))
        .join(", ")}`;
    } else {
      this.query += ` GROUP BY ${this.quoteIdentifier(columns)}`;
    }
    return this;
  }

  // LIMIT
  limit(count) {
    this.query += ` LIMIT ${this.normalizeLimit(count)}`;
    return this;
  }

  limitRange(start, end) {
    if (start.toString().trim() === "")
      throw "Parameter 1 is required for limit to work";
    this.sql += ` LIMIT ${start} ${end ? "," + end : ""} `;
    return this;
  }

  setSql(sql) {
    // console.log("Setting SQL:", sql);
    this.query = sql;
    return this;
  }

  getSql() {
    return this.sql;
  }

  // OFFSET
  offset(count) {
    this.query += ` OFFSET ${this.normalizeLimit(count, "offset")}`;
    return this;
  }

  /*
   * JOIN with flexible type
   * Usage:
   *   .join("INNER", "posts", "users.id", "posts.user_id")
   *   .join("LEFT", "comments", "posts.id", "comments.post_id")
   *   .join("INNER", "posts", "users.id", "=", "posts.user_id")
   */
  join(joinType, table, column1, operator, column2) {
    const validJoinTypes = ["INNER", "LEFT", "RIGHT", "FULL", "CROSS", "JOIN"];
    const upperJoinType = joinType.toUpperCase();

    if (!validJoinTypes.includes(upperJoinType)) {
      throw new Error(
        `Invalid join type: ${joinType}. Must be one of: ${validJoinTypes.join(
          ", ",
        )}`,
      );
    }

    // Handle both 4 and 5 parameter versions
    let col1, op, col2;
    if (column2 !== undefined) {
      // 5 parameters: join("INNER", "posts", "users.id", "=", "posts.user_id")
      col1 = column1;
      op = operator;
      col2 = column2;
    } else {
      // 4 parameters: join("INNER", "posts", "users.id", "posts.user_id")
      col1 = column1;
      op = "=";
      col2 = operator;
    }

    this.joins.push({
      type: upperJoinType === "CROSS" ? "CROSS JOIN" : `${upperJoinType} JOIN`,
      table: this.quoteIdentifier(table),
      leftColumn: this.quoteIdentifier(col1),
      operator: this.normalizeOperator(op),
      rightColumn: this.quoteIdentifier(col2),
    });

    return this;
  }

  /**
   * Build JOIN clauses into the query
   */
  buildJoins() {
    if (this.joins.length === 0) return "";

    return this.joins
      .map((join) => {
        if (join.type === "CROSS JOIN") {
          return ` ${join.type} ${join.table}`;
        }
        return ` ${join.type} ${join.table} ON ${join.leftColumn} ${join.operator} ${join.rightColumn}`;
      })
      .join("");
  }

  /**
   * MultiSelect - Select columns from multiple tables with joins
   * Usage: .multiSelect([
   *   { table: "users", columns: ["id", "name", "email"] },
   *   { table: "posts", columns: ["id", "title", "content"] }
   * ])
   * .join("INNER", "posts", "users.id", "posts.user_id")
   */
  multiSelect(tableSelections) {
    if (!Array.isArray(tableSelections) || tableSelections.length === 0) {
      throw new Error(
        "tableSelections must be a non-empty array of { table, columns } objects",
      );
    }

    const selectClauses = [];
    let mainTable = null;

    tableSelections.forEach((selection) => {
      const { table, columns } = selection;

      if (!table) {
        throw new Error("Each table selection must have a 'table' property");
      }

      if (!mainTable) {
        mainTable = table;
      }

      this.selectedTables.push(table);

      if (Array.isArray(columns)) {
        // Handle ["*"] specially
        if (columns.length === 1 && columns[0] === "*") {
          selectClauses.push(`${this.quoteIdentifier(table)}.*`);
        } else {
          // Prefix columns with table name for clarity
          const prefixedColumns = columns.map((col) =>
            this.quoteIdentifier(`${table}.${col}`),
          );
          selectClauses.push(...prefixedColumns);
        }
      } else if (columns === "*") {
        selectClauses.push(`${this.quoteIdentifier(table)}.*`);
      } else {
        selectClauses.push(this.quoteIdentifier(`${table}.${columns}`));
      }
    });

    this.query = `SELECT ${selectClauses.join(", ")} FROM ${this.quoteIdentifier(mainTable)}`;

    return this;
  }

  insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    this.query = `INSERT INTO ${this.quoteIdentifier(table)} (${columns
      .map((column) => this.quoteIdentifier(column))
      .join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
    this.params = values;
    return this;
  }

  bulkInsert(table, dataArray) {
    if (!Array.isArray(dataArray)) {
      throw new Error("Data must be an array");
    }

    if (dataArray.length === 0) {
      throw new Error("Data array for bulk insert cannot be empty");
    }

    const allKeys = [
      ...new Set(dataArray.flatMap((record) => Object.keys(record))),
    ];

    if (allKeys.length === 0) {
      throw new Error("Records must contain at least one field");
    }

    const columns = allKeys.map((key) => this.quoteIdentifier(key)).join(", ");

    // Use placeholders instead of direct values
    const placeholders = dataArray
      .map(() => `(${allKeys.map(() => "?").join(", ")})`)
      .join(", ");

    // Flatten all values in order
    this.params = dataArray.flatMap((record) =>
      allKeys.map((key) => record[key] ?? null),
    );

    this.query = `INSERT INTO ${this.quoteIdentifier(table)} (${columns}) VALUES ${placeholders}`;

    return this;
  }

  // UPDATE
  update(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    this.query = `UPDATE ${this.quoteIdentifier(table)} SET ${columns
      .map((col) => `${this.quoteIdentifier(col)} = ?`)
      .join(", ")}`;
    this.params = values;
    return this;
  }

  // DELETE
  delete(table) {
    this.query = `DELETE FROM ${this.quoteIdentifier(table)}`;
    return this;
  }

  //useCase: aggregate("SUM", "amount", "total_amount")
  aggregate(func, column, alias = null) {
    this.type = "select";
    const upperFunc = func.toUpperCase();
    const validFunctions = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

    if (!validFunctions.includes(upperFunc)) {
      throw new Error(
        `Unsupported aggregate function: ${func}. Must be one of: ${validFunctions.join(
          ", ",
        )}`,
      );
    }

    const functionPart = `${upperFunc}(${this.quoteIdentifier(column)})`;
    let selectClause;

    if (alias) {
      selectClause = `${functionPart} AS ${this.quoteIdentifier(alias)}`;
    } else {
      selectClause = functionPart;
    }

    this.query = `SELECT ${selectClause}`;
    // console.log(this.params, this.query);

    return this;
  }

  selectRaw(rawSql) {
    if (!this.query.includes("SELECT")) {
      throw new Error(
        "selectRaw must be called after select() or multiSelect()",
      );
    }

    // Find the FROM keyword and insert before it
    const fromIndex = this.query.toUpperCase().indexOf(" FROM ");
    if (fromIndex === -1) {
      throw new Error("Query must have a FROM clause to use selectRaw");
    }

    this.query =
      this.query.slice(0, fromIndex) +
      ", " +
      rawSql +
      this.query.slice(fromIndex);

    return this;
  }

  addAggregate(func, column, alias = null) {
    const upperFunc = func.toUpperCase();
    const validFunctions = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

    if (!validFunctions.includes(upperFunc)) {
      throw new Error(
        `Unsupported aggregate function: ${func}. Must be one of: ${validFunctions.join(
          ", ",
        )}`,
      );
    }

    const functionPart = alias
      ? `${upperFunc}(${this.quoteIdentifier(column)}) AS ${this.quoteIdentifier(alias)}`
      : `${upperFunc}(${this.quoteIdentifier(column)})`;

    return this.selectRaw(functionPart);
  }
  //useCase :having("total_amount", ">", 1000)
  //useCase: having("COUNT(id)", ">", 5)
  having(column, operator, value) {
    const col = this.quoteIdentifier(column);
    const op = this.normalizeOperator(operator);
    if (this.query.includes("HAVING")) {
      this.query += ` AND ${col} ${op} ?`;
    } else {
      this.query += ` HAVING ${col} ${op} ?`;
    }
    this.params.push(value);
    return this;
  }

  // Get the raw query (for debugging)
  getSQL() {
    return {
      query: utils.buildQuery(this.query, this.buildJoins()),
      params: this.params,
    };
  }

  // Reset the query builder
  reset() {
    this.query = "";
    this.params = [];
    this.joins = [];
    this.selectedTables = [];
    return this;
  }

  fullTextSearch(table, columns, searchTerm, mode = "NATURAL LANGUAGE") {
    //  console.log("full text search", table, columns, searchTerm);

    if (!table || !columns || !searchTerm) {
      throw new Error(
        "Table, columns, and searchTerm are required for fullTextSearch",
      );
    }

    // Sanitize table/column names (only allow alphanumeric, underscore, dot)
    const sanitizeName = (name) => {
      if (!/^[a-zA-Z0-9_.]+$/.test(name)) {
        throw new Error(`Invalid identifier: ${name}`);
      }
      return this.quoteIdentifier(name);
    };

    let columnsList;
    if (Array.isArray(columns)) {
      if (columns.length === 0)
        throw new Error("Columns array cannot be empty");
      columnsList = columns.map(sanitizeName).join(", ");
    } else {
      columnsList = sanitizeName(columns);
    }
    const safeTable = sanitizeName(table);

    const validModes = ["NATURAL LANGUAGE", "BOOLEAN", "QUERY EXPANSION"];
    const upperMode = mode.toUpperCase();

    let searchMode;
    let finalSearchTerm = searchTerm;

    if (upperMode === "NATURAL LANGUAGE" || upperMode === "NATURAL") {
      searchMode = "NATURAL LANGUAGE MODE";
    } else if (upperMode === "BOOLEAN") {
      searchMode = "BOOLEAN MODE";
      // ✅ Escape special Boolean Mode characters to prevent syntax errors
      finalSearchTerm = `"${searchTerm.replace(/[+\-><()~*]/g, " ").trim()}"`;
      if (!finalSearchTerm) {
        throw new Error(
          "Search term is empty after sanitizing special characters",
        );
      }
    } else if (upperMode === "QUERY EXPANSION" || upperMode === "EXPANSION") {
      searchMode = "WITH QUERY EXPANSION";
    } else {
      throw new Error(
        `Invalid search mode: ${mode}. Must be one of: ${validModes.join(", ")}`,
      );
    }

    this.query = `SELECT * FROM ${safeTable} WHERE MATCH(${columnsList}) AGAINST(? IN ${searchMode})`;
    this.params.push(finalSearchTerm);

    return this;
  }

  /**
   * Full-Text Search with custom SELECT columns
   * Includes relevance score
   */
  fullTextSearchWithScore(
    table,
    columns,
    searchTerm,
    mode = "NATURAL LANGUAGE",
  ) {
    if (!table || !columns || !searchTerm) {
      throw new Error("Table, columns, and searchTerm are required");
    }

    let columnsList;
    if (Array.isArray(columns)) {
      columnsList = columns.map((column) => this.quoteIdentifier(column)).join(", ");
    } else {
      columnsList = this.quoteIdentifier(columns);
    }

    const safeTable = this.quoteIdentifier(table);

    const upperMode = mode.toUpperCase();
    let searchMode;
    if (upperMode === "NATURAL LANGUAGE" || upperMode === "NATURAL") {
      searchMode = "NATURAL LANGUAGE MODE";
    } else if (upperMode === "BOOLEAN") {
      searchMode = "BOOLEAN MODE";
    } else if (upperMode === "QUERY EXPANSION" || upperMode === "EXPANSION") {
      searchMode = "WITH QUERY EXPANSION";
    } else {
      searchMode = "NATURAL LANGUAGE MODE";
    }

    // Include relevance score in results
    this.query = `SELECT *, MATCH(${columnsList}) AGAINST(? IN ${searchMode}) AS relevance_score FROM ${safeTable} WHERE MATCH(${columnsList}) AGAINST(? IN ${searchMode})`;

    // Add search term twice (once for score, once for WHERE)
    this.params.push(searchTerm, searchTerm);

    return this;
  }
}

module.exports = QueryBuilder;
