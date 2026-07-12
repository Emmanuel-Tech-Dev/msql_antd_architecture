const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const cleanIdentifier = (value) => String(value ?? "").replaceAll("`", "").trim();

export function legacySqlToLookup(sql) {
  if (typeof sql !== "string") return null;

  const normalized = sql.trim().replace(/;$/, "");
  const match = normalized.match(
    /^SELECT\s+(.+?)\s+FROM\s+`?([A-Za-z_][A-Za-z0-9_]*)`?(?:\s+WHERE\s+`?([A-Za-z_][A-Za-z0-9_]*)`?\s*=\s*(['"])(.*?)\4)?(?:\s+LIMIT\s+(\d+))?$/i,
  );

  if (!match) return null;

  const fields = match[1]
    .split(",")
    .map(cleanIdentifier)
    .filter((field) => IDENTIFIER.test(field));
  const table = cleanIdentifier(match[2]);
  const whereColumn = cleanIdentifier(match[3]);

  if (!IDENTIFIER.test(table) || fields.length === 0) return null;

  return {
    lookup: {
      table,
      fields,
      ...(whereColumn
        ? { where: { column: whereColumn, value: match[5] } }
        : {}),
      limit: Math.min(Number(match[6] ?? 500), 500),
    },
  };
}

export function createLookupPayload({ table, fields, where, limit = 500 }) {
  return {
    lookup: {
      table,
      fields,
      ...(where ? { where } : {}),
      limit: Math.min(Number(limit) || 500, 500),
    },
  };
}
