const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const AppError = require("../helpers/AppError");

const NodeCache = require("node-cache");
const { v4: uuidv4 } = require("uuid");
const otp = require("otp");
const { customAlphabet } = require("nanoid");

const IV_LENGTH = 16;
const AUTHENTICATED_IV_LENGTH = 12;

function getEncryptionKey() {
  const configuredKey = process.env.ENCRYPTION_KEY;
  const encoding = process.env.KEY_HOOK || "utf8";

  if (!configuredKey) {
    throw new Error(
      "ENCRYPTION_KEY is not configured. Set it to a value that decodes to exactly 32 bytes.",
    );
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new Error(
      `KEY_HOOK must be a valid Buffer encoding; received "${encoding}".`,
    );
  }

  const key = Buffer.from(configuredKey, encoding);
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to exactly 32 bytes; received ${key.length} bytes.`,
    );
  }

  return key;
}

const cache = new NodeCache({ stdTTL: 3600 });

const utils = {
  requireIdentifiers(identifiers) {
    for (const [name, value] of Object.entries(identifiers)) {
      if (typeof value !== "string" || !value.trim()) {
        throw new AppError("ERR_INVALID_INPUT", `${name} is required`);
      }
    }
  },

  clampInteger(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  },
  parseJson(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  },
  encrypt: (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  },

  decrypt: (encryptedText) => {
    const [iv, encrypted] = encryptedText.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      getEncryptionKey(),
      Buffer.from(iv, "hex"),
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  },
  encryptSensitive: (text) => {
    const iv = crypto.randomBytes(AUTHENTICATED_IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(String(text), "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `gcm:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  },
  decryptSensitive: (encryptedValue) => {
    const encoded = Buffer.isBuffer(encryptedValue)
      ? encryptedValue.toString("utf8")
      : String(encryptedValue);
    const [format, ivHex, authTagHex, ciphertextHex] = encoded.split(":");
    if (format !== "gcm" || !ivHex || !authTagHex || !ciphertextHex) {
      throw new Error("Unsupported sensitive value format");
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  },
  convertArrayToObject(arr) {
    if (!arr || !arr.record) {
      // Return the input object as is, or handle the error
      return arr;
    }

    const recordValues = Object.values(arr.record);

    if (recordValues.length === 0) {
      return { record: null };
    }

    return {
      ...arr,
      record: recordValues[0],
    };
  },

  redactSensitiveData(data, extraKeys = []) {
    if (data === undefined || data === null) return data;

    const sensitiveKeys = new Set([
      "password",
      "passwordhash",
      "passwd",
      "oldpassword",
      "newpassword",
      "accesstoken",
      "refreshtoken",
      "resettoken",
      "otp",
      "otpcode",
      "otpsecret",
      "token",
      "secret",
      "clientsecret",
      "apikey",
      "privatekey",
      "authorization",
      "cookie",
      ...extraKeys.map((key) =>
        String(key)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ""),
      ),
    ]);
    const clone = structuredClone(data);

    const redact = (obj) => {
      if (obj && typeof obj === "object") {
        Object.keys(obj).forEach((key) => {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (sensitiveKeys.has(normalizedKey)) {
            obj[key] = "[REDACTED]";
          } else if (Array.isArray(obj[key])) {
            obj[key] = obj[key].map((item) => redact(item));
          } else if (obj[key] && typeof obj[key] === "object") {
            redact(obj[key]);
          }
        });
      }
      return obj;
    };

    if (Array.isArray(clone)) {
      return clone.map((item) => redact(item));
    }

    return redact(clone);
  },

  removePasswordFromObject(data) {
    return this.redactSensitiveData(data);
  },

  // Index of the first match of `pattern` that sits in the outer query (not
  // inside brackets or quotes) at or after `from`, or -1. Clause keywords in
  // subqueries, such as a counted subquery's own FROM or WHERE, are skipped.
  topLevelIndex(sql, pattern, from = 0) {
    const sticky = new RegExp(pattern.source, "iy");
    let depth = 0;
    let quote = null;
    for (let index = from; index < sql.length; index += 1) {
      const character = sql[index];
      if (quote) {
        if (character === "\\" && quote !== "`") index += 1;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === "'" || character === '"' || character === "`")
        quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
      else if (depth === 0 && (index === 0 || /[\s)]/.test(sql[index - 1]))) {
        sticky.lastIndex = index;
        if (sticky.test(sql)) return index;
      }
    }
    return -1;
  },

  // Places the JOIN clauses after the outer query's FROM table (and alias),
  // before its WHERE, GROUP BY, HAVING, ORDER BY, LIMIT or locking clause.
  buildQuery(query, joinsClause) {
    if (!joinsClause) return query;
    const fromIndex = this.topLevelIndex(query, /FROM\s/);
    if (fromIndex === -1) return query;

    const fromTable =
      /FROM\s+(?:`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:AS\s+)?(?!INNER(?![A-Za-z0-9_])|LEFT(?![A-Za-z0-9_])|RIGHT(?![A-Za-z0-9_])|FULL(?![A-Za-z0-9_])|CROSS(?![A-Za-z0-9_])|JOIN(?![A-Za-z0-9_])|WHERE(?![A-Za-z0-9_])|GROUP(?![A-Za-z0-9_])|HAVING(?![A-Za-z0-9_])|ORDER(?![A-Za-z0-9_])|LIMIT(?![A-Za-z0-9_])|OFFSET(?![A-Za-z0-9_])|FOR(?![A-Za-z0-9_]))[A-Za-z_][A-Za-z0-9_]*)?/iy;
    fromTable.lastIndex = fromIndex;
    const fromEnd = fromTable.test(query) ? fromTable.lastIndex : fromIndex;

    let insertAt = this.topLevelIndex(
      query,
      /(?:WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|FOR\s+UPDATE)(?![A-Za-z0-9_])/,
      fromEnd,
    );
    if (insertAt === -1) insertAt = fromEnd;
    while (insertAt > fromEnd && /\s/.test(query[insertAt - 1])) insertAt -= 1;

    return query.slice(0, insertAt) + joinsClause + query.slice(insertAt);
  },

  // SELECT COUNT(*) for a built query: the outer select list is swapped for
  // the count, or, when the query groups rows, the query is counted as a
  // derived table so each group counts once. ORDER BY is dropped.
  countQuery(query, countExpression = "COUNT(*)", alias = "total") {
    const fromIndex = this.topLevelIndex(query, /FROM\s/);
    if (fromIndex === -1)
      throw new Error("A count needs a query with a FROM clause");
    const orderIndex = this.topLevelIndex(
      query,
      /ORDER\s+BY(?![A-Za-z0-9_])/,
      fromIndex,
    );
    const body = (
      orderIndex === -1 ? query : query.slice(0, orderIndex)
    ).trimEnd();
    const grouped =
      /^SELECT\s+DISTINCT(?![A-Za-z0-9_])/i.test(body) ||
      this.topLevelIndex(
        body,
        /(?:GROUP\s+BY|HAVING)(?![A-Za-z0-9_])/,
        fromIndex,
      ) !== -1;
    return grouped
      ? `SELECT COUNT(*) AS ${alias} FROM (${body}) AS counted_rows`
      : `SELECT ${countExpression} AS ${alias} ${body.slice(fromIndex)}`;
  },

  generateCustomId(prefix = "USR", length = 6) {
    const uuid = uuidv4().replace(/-/g, "");
    const hexPart = uuid.slice(0, 12); // take first 12 hex characters
    const numeric = parseInt(hexPart, 16).toString().slice(0, length); // convert to number, take first N digits

    return `${prefix}-${numeric}`;
  },

  generateCustomIDWithCrypto(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  },

  generateToken: (payload, secret, expiresIn) => {
    // Generate unique JTI if not provided
    const jti = payload.jti || uuidv4();

    return jwt.sign(
      payload, // Your custom payload
      secret,
      {
        expiresIn, // This sets the 'exp' claim automatically
        // jti: jti, // This sets the 'jti' claim in JWT standard claims
        issuer: "your-issuer", // Optional: set issuer
        // audience: "your-users", // Optional: set audience
      },
    );
  },

  generateAuthTokens: (user) => {
    // Generate unique JTIs for each token
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const basePayload = {
      id: user.id,
      custom_id: user.custom_id,
      email: user.email,
    };

    // Create access token with its own JTI
    const accessToken = Utilities.generateToken(
      {
        ...basePayload,
        jti: accessJti,
        type: "access", // Optional: identify token type
      },
      process.env.JWT_SECRET,
      "15m",
    );

    // Create refresh token with its own JTI
    const refreshToken = Utilities.generateToken(
      {
        ...basePayload,
        jti: refreshJti,
        type: "refresh", // Optional: identify token type
      },
      process.env.REFRESH_TOKEN_SECRET,
      "7d",
    );

    return {
      accessToken,
      refreshToken,
    };
  },

  generateStudentTokens: (student) => {
    const payload = {
      id: student.id,
      name: student.name,
      index_number: student.index_number,
      hall_id: student.hall_affiliate, // Include hall_id if necessary
      role: process.env.STUDENT_ROLE,
    };

    return {
      accessToken: Utilities.generateToken(
        payload,
        process.env.JWT_SECRET,
        "15m",
      ),
      refreshToken: Utilities.generateToken(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        "7d",
      ),
    };
  },

  verifyToken: async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // console.log("Decoded access token:", {
      //   jti: decoded.jti,
      //   exp: decoded.exp,
      //   iat: decoded.iat,
      //   expiresAt: new Date(decoded.exp * 1000).toLocaleString(),
      // });
      return decoded;
    } catch (error) {
      console.error("Access token verification failed:", error.message);
      return null;
    }
  },

  verifyRefreshToken: async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      // console.log("Decoded refresh token:", {
      //   jti: decoded.jti,
      //   exp: decoded.exp,
      //   iat: decoded.iat,
      //   expiresAt: new Date(decoded.exp * 1000).toLocaleString(),
      // });
      return decoded;
    } catch (error) {
      console.error("Refresh token verification failed:", error.message);
      return null;
    }
  },
  hashPassword: async (password) => {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  },

  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  },

  generateOtpSecret() {
    const secret = otp.utils.generateKey();
    return secret;
  },
  generateOtpCode(secret) {
    const code = otp.totp.gen(secret);
    return code;
  },
  verifyOtp(inputCode, secret) {
    const isValidOtp = otp.totp.check(inputCode, secret);
    return isValidOtp;
  },

  sendOtpPin: async (email, html, subject) => {
    const transpoter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender address
      to: email, // List of recipients
      subject: subject,
      html: html,
    };

    await transpoter.sendMail(mailOptions);
  },
  getFileType(mimetype) {
    if (mimetype.startsWith("image/")) return "image";
    if (mimetype.startsWith("video/")) return "video";
    return "unknown";
  },

  genRegNumber(prefix = "REG") {
    const generateRandomDigits = customAlphabet("0123456789", 6);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const random = generateRandomDigits(); // 6 random digits

    return `${prefix}${year}${month}${day}${random}`;
  },
  hashToken(token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    return tokenHash;
  },

  genInstituitionCode(name, region) {
    // if university of Ghana || Kwame Nkrumah University of Science and Technology || Akenten Appiah Menkah University of Science and Technoloogy

    const stopWords = ["OF", "AND", "THE", "FOR", "IN", "AT", "TO"];

    const code = name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "") // Clean special chars
      .split(/\s+/) // Split by any whitespace
      .filter((word) => word && !stopWords.includes(word)) // Remove "OF", "AND", etc.
      .map((word) => word[0]) // Take first letter of remaining words
      .join("")
      .slice(0, 10); // Limit length (e.g., KNUST)

    return `${code}-${region}`;
  },

  extractConfig(query) {
    const config = {};
    const queryParams = {};

    for (const [key, val] of Object.entries(query)) {
      if (key.startsWith("_")) {
        // Strip leading _ to restore original option name
        // e.g. _fullTextSearch → fullTextSearch, _maxLimit → maxLimit
        config[key.slice(1)] = val;
      } else {
        queryParams[key] = val;
      }
    }

    // qs parses booleans and numbers as strings — coerce them back
    if (config.fullTextSearch) {
      const fts = config.fullTextSearch;
      if (typeof fts.enabled === "string") fts.enabled = fts.enabled === "true";
      if (typeof fts.withScore === "string")
        fts.withScore = fts.withScore === "true";
      // columns comes through as an array already thanks to qs bracket notation
    }
    if (typeof config.maxLimit === "string")
      config.maxLimit = parseInt(config.maxLimit);
    if (typeof config.defaultLimit === "string")
      config.defaultLimit = parseInt(config.defaultLimit);

    return { config, queryParams };
  },

  async getSystemOpenRoute() {
    const SettingsManager = require("../../core/lib/systemSettings");
    const settings = new SettingsManager();
    const openRoutes = await settings.get("system.open_routes");

    // Support both shapes:
    // 1) { route: ["/a", "/b"] }
    // 2) ["/a", "/b"]
    if (Array.isArray(openRoutes)) {
      return openRoutes;
    }

    if (openRoutes && Array.isArray(openRoutes.route)) {
      return openRoutes.route;
    }

    return [];
  },

  async activityLogs(customId, title, type, description, ip, agent) {
    const Model = require("../../core/model/model");

    await new Model()
      .insert("user_activity_logs", {
        user_id: customId,
        activity_type: title,
        title: type,
        description: description,
        ip_address: ip,
        user_agent: agent,
      })
      .execute();

    return;
  },

  slugify(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180);
  },

  inPlaceholders(values = []) {
    if (!Array.isArray(values) || values.length === 0) {
      return "";
    }
    const flatValues = values.flat(Infinity);

    const validValues = flatValues.filter((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    });

    const uniqueValues = [];
    const seenObjects = new Set();

    for (const item of validValues) {
      if (typeof item === "object") {
        const strObj = JSON.stringify(item);
        if (!seenObjects.has(strObj)) {
          seenObjects.add(strObj);
          uniqueValues.push(item);
        }
      } else {
        if (!uniqueValues.includes(item)) {
          uniqueValues.push(item);
        }
      }
    }
    return uniqueValues.map(() => "?").join(", ");
  },

  requireValidRange(minimum, maximum, label) {
    if (
      minimum == null ||
      maximum == null ||
      Number(maximum) >= Number(minimum)
    )
      return;
    throw new AppError(
      "ERR_VALIDATION_FAILED",
      `${label} maximum must be greater than or equal to its minimum`,
    );
  },

  uniqueIds(values = []) {
    return [
      ...new Set(values.map((value) => String(value).trim()).filter(Boolean)),
    ];
  },
  hasOwn(value, property) {
    return Object.prototype.hasOwnProperty.call(value, property);
  },
};
module.exports = utils;
