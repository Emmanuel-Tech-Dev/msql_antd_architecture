// server/route/logRoute.js

const path = require("path");
const fs = require("fs");

const LOG_PATH =
  process.env.LOG_PATH || path.join(__dirname, "../resources/logs");

const LOG_TYPES = [
  "access",
  "error",
  "query",
  "security",
  "critical",
  "performance",
  "app",
  "combined",
];

// generate all dates between startDate and endDate inclusive
// both are strings 'YYYY-MM-DD'
function getDateRange(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function parseLogFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return content
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, level: "unknown", timestamp: null };
        }
      });
  } catch {
    return [];
  }
}

class LogRoute {
  constructor(app) {
    this.readLogs(app);
    this.listLogFiles(app);
    return this;
  }

  // GET /api/v1/logs
  // ?type=error
  // &start=2026-04-01    ← range start (defaults to 7 days ago)
  // &end=2026-04-13      ← range end   (defaults to today)
  // &page=1
  // &limit=50
  // &search=keyword
  // &level=error
  readLogs(app) {
    app.get("/api/v1/logs", async (req, res) => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        const {
          type = "combined",
          start = weekAgo,
          end = today,
          page = 1,
          limit = 50,
          search = "",
          level = "",
        } = req.query;

        if (!LOG_TYPES.includes(type)) {
          return res.status(400).json({
            status: "error",
            message: `Invalid log type. Valid: ${LOG_TYPES.join(", ")}`,
          });
        }

        // guard against huge ranges — max 30 days
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffDays = Math.ceil(
          (endDate - startDate) / (1000 * 60 * 60 * 24),
        );

        if (diffDays < 0) {
          return res.status(400).json({
            status: "error",
            message: "start date must be before end date",
          });
        }

        if (diffDays > 30) {
          return res.status(400).json({
            status: "error",
            message: "Date range cannot exceed 30 days",
          });
        }

        // collect entries from all files in range
        const dates = getDateRange(start, end);
        let entries = [];

        for (const date of dates) {
          const filepath = path.join(LOG_PATH, `${type}-${date}.log`);

          if (fs.existsSync(filepath)) {
            const parsed = parseLogFile(filepath);
            entries.push(...parsed);
          }
        }

        // sort newest first across all files
        entries.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // filter by level
        if (level) {
          entries = entries.filter((e) => e.level === level);
        }

        // filter by search
        if (search.trim()) {
          const term = search.trim().toLowerCase();
          entries = entries.filter((e) =>
            JSON.stringify(e).toLowerCase().includes(term),
          );
        }

        const total = entries.length;
        const startIndex = (Number(page) - 1) * Number(limit);
        const paginated = entries.slice(startIndex, startIndex + Number(limit));

        return res.status(200).json({
          status: "ok",
          data: paginated,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
          },
          meta: {
            datesScanned: dates.length,
            filesFound: dates.filter((d) =>
              fs.existsSync(path.join(LOG_PATH, `${type}-${d}.log`)),
            ).length,
          },
        });
      } catch (error) {
        return res.status(500).json({
          status: "error",
          message: error.message,
        });
      }
    });
  }

  // GET /api/v1/logs/files
  listLogFiles(app) {
    app.get("/api/v1/logs/files", async (req, res) => {
      try {
        if (!fs.existsSync(LOG_PATH)) {
          return res.status(200).json({ status: "ok", data: {} });
        }

        const files = fs
          .readdirSync(LOG_PATH)
          .filter((f) => f.endsWith(".log"))
          .sort()
          .reverse();

        const grouped = {};
        files.forEach((filename) => {
          const match = filename.match(/^(.+)-(\d{4}-\d{2}-\d{2})\.log$/);
          if (!match) return;
          const [, type, date] = match;
          if (!grouped[type]) grouped[type] = [];
          const stat = fs.statSync(path.join(LOG_PATH, filename));
          grouped[type].push({
            filename,
            date,
            size: stat.size,
            sizeKb: Math.round(stat.size / 1024),
          });
        });

        return res.status(200).json({ status: "ok", data: grouped });
      } catch (error) {
        return res
          .status(500)
          .json({ status: "error", message: error.message });
      }
    });
  }
}

module.exports = LogRoute;
