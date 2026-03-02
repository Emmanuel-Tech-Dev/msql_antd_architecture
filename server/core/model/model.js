const conn = require("../config/conn");
const QueryBuilder = require("../lib/queryBuilder");
const utils = require("../../shared/utils/functions");

class Model extends QueryBuilder {
  constructor() {
    super();
    this.pool = conn; // Connection pool
    this._paginate = {};
    this.columncache = new Map();
  }

  async getTableColumns(table) {
    if (!this.columncache) this.columncache = new Map(); // ← ADD this line

    if (this.columncache.has(table)) return this.columncache.get(table);

    const [rows] = await this.pool.query(`DESCRIBE \`${table}\``);
    const columns = rows.map((r) => r.Field);
    this.columncache.set(table, columns);
    return columns;
  }

  async execute() {
    try {
      const joins = this.buildJoins();

      const finalQuery = utils.buildQuery(this.query, joins);
      const [rows] = await conn.query(finalQuery, this.params);
      // console.log("Executed SQL:", this.query);
      // console.log("With parameters:", this.params);
      // // Reset after execution for reusability
      const result = rows;
      this.reset();

      // console.log(result);
      return result;
    } catch (error) {
      console.error("Query execution error:", error);
      console.error("SQL:", this.query);
      console.error("Params:", this.params);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // async execute() {
  //   try {
  //     const finalQuery = this.buildQuery();
  //     const [rows] = await conn.query(finalQuery, this.params);
  //     return rows;
  //   } catch (error) {
  //     throw new Error(`Query execution failed: ${error.message}`);
  //   }
  // }

  async tableQueryParams(queryParams, options = {}) {
    const {
      table,
      maxLimit = 100,
      defaultLimit = 20,
      fullTextSearch = null,
      filterable = null, // legacy explicit list
      sortable = null, // legacy explicit list
      searchable = [],
      // Columns that must NEVER be exposed via query params even if they exist in DB.
      // Merged with the built-in sensitive defaults below.
      exclude = [],
    } = options;

    // ── Built-in sensitive column blacklist ────────────────────────────────
    // These are stripped from allowedColumns regardless of what DESCRIBE returns.
    // Add your own via exclude: ["ssn", "card_number", "dob"]
    const SENSITIVE = new Set([
      "password",
      "password_hash",
      "passwd",
      "token",
      "access_token",
      "refresh_token",
      "reset_token",
      "secret",
      "client_secret",
      "api_key",
      "private_key",
      "otp",
      "otp_secret",
      "two_factor_secret",
      "totp_secret",
      "salt",
      "encryption_key",
      ...exclude,
    ]);

    // ── 1. Get columns (from cache or DESCRIBE) ────────────────────────────
    let columns;
    if (filterable && sortable) {
      // Legacy explicit mode — no DB call needed
      columns = [...new Set([...filterable, ...sortable])];
    } else if (table) {
      columns = await this.getTableColumns(table);
    } else {
      console.warn(
        "applyQueryParams: provide either `table` or `filterable`+`sortable`",
      );
      columns = [];
    }

    // Strip sensitive columns — a ?password_like=x can never reach the query
    const allowedColumns = new Set(columns.filter((c) => !SENSITIVE.has(c)));
    const allowedSortable = sortable ? new Set(sortable) : allowedColumns;

    // ── 2. Global search (fullTextSearch or LIKE fallback) ─────────────────
    if (queryParams.search?.trim()) {
      const searchTerm = queryParams.search.trim();
      // console.log(fullTextSearch);
      if (
        fullTextSearch?.enabled &&
        fullTextSearch?.columns?.length &&
        fullTextSearch?.table
      ) {
        const mode = fullTextSearch.mode || "NATURAL LANGUAGE";
        const withScore = fullTextSearch.withScore !== false;

        if (withScore) {
          this.fullTextSearchWithScore(
            fullTextSearch.table,
            fullTextSearch.columns,
            searchTerm,
            mode,
          );
          if (!queryParams.sort_by) this.orderBy("id", "DESC");
        } else {
          this.fullTextSearch(
            fullTextSearch.table,
            fullTextSearch.columns,
            searchTerm,
            mode,
          );
        }
      } else if (searchable.length > 0) {
        const searchValue = `%${searchTerm}%`;
        const searchConditions = searchable.map((col) => ({
          column: col,
          operator: "LIKE",
          value: searchValue,
        }));
        this.where(searchConditions, "LIKE", "OR");
      } else {
        console.warn(
          "⚠ search param received but no fullTextSearch config or searchable columns",
        );
      }
    }

    // ── 3. Process every query param ──────────────────────────────────────
    // Reserved params that are NOT filters
    const RESERVED = new Set([
      "page",
      "limit",
      "offset",
      "search",
      "sort_by",
      "sort_order",
    ]);

    for (const key of Object.keys(queryParams)) {
      if (RESERVED.has(key)) continue;
      const val = queryParams[key];
      if (val === undefined || val === null || val === "") continue;

      // ── _like  →  column LIKE '%val%' ─────────────────────────────────
      // if (key.endsWith("_like")) {
      //   const col = key.slice(0, -5); // remove "_like"
      //   if (allowedColumns.has(col)) {
      //     this.whereLike(col, `%${val}%`);
      //   }
      //   continue;
      // }

      // ── _min  →  column >= val ────────────────────────────────────────
      if (key.endsWith("_min")) {
        const col = key.slice(0, -4);
        if (allowedColumns.has(col)) this.where(col, ">=", val);
        continue;
      }

      // ── _max  →  column <= val ────────────────────────────────────────
      if (key.endsWith("_max")) {
        const col = key.slice(0, -4);
        if (allowedColumns.has(col)) this.where(col, "<=", val);
        continue;
      }

      // ── _not_in  →  column NOT IN (a,b,c) ────────────────────────────
      if (key.endsWith("_not_in")) {
        const col = key.slice(0, -7);
        if (allowedColumns.has(col)) {
          this.whereNotIn(
            col,
            val.split(",").map((v) => v.trim()),
          );
        }
        continue;
      }

      // ── _in  →  column IN (a,b,c) ────────────────────────────────────
      // Note: check _not_in BEFORE _in so "status_not_in" doesn't match _in
      if (key.endsWith("_in")) {
        const col = key.slice(0, -3);
        if (allowedColumns.has(col)) {
          this.whereIn(
            col,
            val.split(",").map((v) => v.trim()),
          );
        }
        continue;
      }

      // ── _like  →  column LIKE '%val%' (supports multi) ─────────────
      if (key.endsWith("_like")) {
        const col = key.slice(0, -5);
        // console.log(col, key);
        if (allowedColumns.has(col)) {
          const values = String(val)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);

          if (values.length === 1) {
            // single filter (fast path)
            this.whereLike(col, `%${values[0]}%`);
          } else if (values.length > 1) {
            // multi filter → OR conditions
            const conditions = values.map((v) => ({
              column: col,
              // operator: "LIKE",
              value: `%${v}%`,
            }));

            this.where(conditions, "LIKE", "OR");
          }
        }

        continue;
      }

      // ── plain key  →  column = val (exact match) ──────────────────────
      if (allowedColumns.has(key)) {
        this.where(key, "=", val);
      }
    }

    // ── 4. Sorting ─────────────────────────────────────────────────────────
    if (queryParams.sort_by) {
      const col = queryParams.sort_by;
      const order =
        queryParams.sort_order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

      if (col === "relevance_score" || allowedSortable.has(col)) {
        this.orderBy(col, order);
      }
    }

    // ── 5. Pagination ──────────────────────────────────────────────────────
    // const limit = Math.min(
    //   parseInt(queryParams.limit) || defaultLimit,
    //   maxLimit,
    // );
    // const offset = parseInt(queryParams.offset) || 0;
    // const page = parseInt(queryParams.page);

    // if (page && page > 0) {
    //   this._paginate = { page, limit };
    // } else if (offset > 0) {
    //   this._paginate = { offset, limit };
    // } else {
    //   this._paginate = { page: 1, limit };
    // }

    return this;
  }

  applyQueryParams(queryParams, options = {}) {
    const {
      searchable = [],
      filterable = [],
      sortable = [],
      maxLimit = 100,
      defaultLimit = 20,
      fullTextSearch = null, // { enabled: true, columns: ['title', 'content'], table: 'articles' }
    } = options;

    // SEARCH HANDLING

    if (queryParams.search && queryParams.search.trim() !== "") {
      const searchTerm = queryParams.search.trim();

      // Option 1: Use Full-Text Search if configured
      if (queryParams.search && queryParams.search.trim() !== "") {
        const searchTerm = queryParams.search.trim();

        // Option 1: Use Full-Text Search if configured
        if (
          fullTextSearch?.enabled &&
          fullTextSearch?.columns?.length > 0 &&
          fullTextSearch?.table
        ) {
          const mode = fullTextSearch.mode || "NATURAL LANGUAGE";
          const withScore = fullTextSearch.withScore !== false; // Default true

          console.log(`✓ Using Full-Text Search on ${fullTextSearch.table}`);

          if (withScore) {
            this.fullTextSearchWithScore(
              fullTextSearch.table,
              fullTextSearch.columns,
              searchTerm,
              mode,
            );

            // Auto-sort by relevance ONLY if using score AND no custom sort
            if (!queryParams.sort_by) {
              this.orderBy("id", "DESC");
            }
          } else {
            this.fullTextSearch(
              fullTextSearch.table,
              fullTextSearch.columns,
              searchTerm,
              mode,
            );
            // No relevance_score column when withScore is false
          }
        }
        // Option 2: Fallback to LIKE search if searchable columns provided
        else if (searchable.length > 0) {
          console.log("✓ Using LIKE search (no full-text index)");
          const searchValue = `%${searchTerm}%`;
          const searchConditions = searchable.map((column) => ({
            column,
            operator: "LIKE",
            value: searchValue,
          }));
          this.where(searchConditions, "LIKE", "OR");
        }
        // Option 3: No search method available
        else {
          console.warn(
            "⚠ Search requested but no fullTextSearch config or searchable columns provided",
          );
        }
      }
    }

    // FILTERS (exact match)

    filterable.forEach((column) => {
      if (queryParams[column] !== undefined && queryParams[column] !== "") {
        this.where(column, "=", queryParams[column]);
      }
    });

    // SPECIAL OPERATORS

    Object.keys(queryParams).forEach((key) => {
      // Handle min/max range filters
      if (key.endsWith("_min")) {
        const column = key.replace("_min", "");
        if (filterable.includes(column)) {
          this.where(column, ">=", queryParams[key]);
        }
      }
      if (key.endsWith("_max")) {
        const column = key.replace("_max", "");
        if (filterable.includes(column)) {
          this.where(column, "<=", queryParams[key]);
        }
      }

      // Handle IN queries (column_in=val1,val2,val3)
      if (key.endsWith("_in")) {
        const column = key.replace("_in", "");
        if (filterable.includes(column)) {
          const values = queryParams[key].split(",").map((v) => v.trim());
          this.whereIn(column, values);
        }
      }

      // Handle NOT IN queries
      if (key.endsWith("_not_in")) {
        const column = key.replace("_not_in", "");
        if (filterable.includes(column)) {
          const values = queryParams[key].split(",").map((v) => v.trim());
          this.whereNotIn(column, values);
        }
      }

      // Handle LIKE queries (column_like)
      if (key.endsWith("_like")) {
        const column = key.replace("_like", "");
        if (filterable.includes(column) || searchable.includes(column)) {
          this.whereLike(column, `%${queryParams[key]}%`);
        }
      }
    });

    // SORTING

    if (queryParams.sort_by) {
      const sortColumn = queryParams.sort_by;
      const sortOrder =
        queryParams.sort_order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

      // Allow sorting by relevance_score if full-text search is active
      if (sortColumn === "relevance_score" || sortable.includes(sortColumn)) {
        this.orderBy(sortColumn, sortOrder);
      }
    }

    // PAGINATION

    const limit = Math.min(
      parseInt(queryParams.limit) || defaultLimit,
      maxLimit,
    );
    const offset = parseInt(queryParams.offset) || 0;
    const page = parseInt(queryParams.page);

    if (page && page > 0) {
      this._paginate = { page, limit };
    } else if (offset > 0) {
      this._paginate = { offset, limit };
    } else {
      this._paginate = { page: 1, limit };
    }

    return this;
  }

  async paginate(page, limit) {
    // console.log(this._paginate);
    // resolve params
    const pageNum =
      page !== undefined ? parseInt(page) : this._paginate.page || 1;
    const limitNum =
      limit !== undefined ? parseInt(limit) : this._paginate.limit || 10;

    if (!pageNum || !limitNum) {
      throw new Error(
        "Pagination parameters not set. Please use applyQueryParams first.",
      );
    }

    // Clone current query to count total
    const countQuery = this.query;
    const countParams = [...this.params];

    // Get total count (without LIMIT / OFFSET)
    const totalQuery = countQuery.replace(
      /SELECT .+ FROM/i,
      "SELECT COUNT(*) as total FROM",
    );

    const [countResult] = await this.pool.query(totalQuery, countParams);
    const total = countResult[0].total;

    // Apply pagination
    const offset = (pageNum - 1) * limitNum;
    this.limit(limitNum).offset(offset);

    // Execute paginated query
    const result = await this.execute();

    const newResults = utils.removePasswordFromObject({ results: result });

    return {
      result: newResults.results,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    };
  }

  // Execute raw SQL query

  async raw(sql, params = []) {
    try {
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error("Raw query execution error:", error);
      console.error("SQL:", sql);
      console.error("Params:", params);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // Get first row only

  async first() {
    this.limit(1);
    const results = await this.execute();
    return results.length > 0 ? results[0] : null;
  }

  // Get count of rows

  async count(column = "*") {
    const originalQuery = this.query;
    this.query = this.query.replace(
      /SELECT .+ FROM/,
      `SELECT COUNT(${column}) as count FROM`,
    );
    const result = await this.execute();
    return result[0].count;
  }

  //Check if record exists

  async exists() {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Execute a transaction with multiple operations
   * @param {Function} callback - Async function containing queries
   */
  async transaction(callback) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Pass a transaction helper object to the callback
      const txHelper = {
        query: async (sql, params = []) => {
          const [rows] = await connection.query(sql, params);
          return rows;
        },

        // Allow QueryBuilder usage in transactions
        builder: () => {
          const builder = new QueryBuilder();
          builder.executeInTransaction = async () => {
            const [rows] = await connection.query(
              builder.query,
              builder.params,
            );
            builder.reset();
            return rows;
          };
          return builder;
        },
      };

      const result = await callback(txHelper);
      await connection.commit();

      return result;
    } catch (error) {
      await connection.rollback();
      console.error("Transaction error:", error);
      throw new Error(`Transaction failed: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  async tableExists(tableName) {
    const sql = `
      SELECT COUNT(*) AS count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = ?
    `;
    const results = await this.raw(sql, [tableName]);
    return results[0].count > 0;
  }

  /**
   * Close the connection pool (call on app shutdown)
   */
  async closePool() {
    try {
      await this.pool.end();
      console.log("Connection pool closed successfully");
    } catch (error) {
      console.error("Error closing pool:", error);
      throw error;
    }
  }
}

module.exports = Model;
