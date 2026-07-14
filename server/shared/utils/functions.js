const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const NodeCache = require("node-cache");
const { v4: uuidv4 } = require("uuid");
const otp = require("otp");
const { customAlphabet } = require("nanoid");

const IV_LENGTH = 16;

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
  clampInteger(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
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

  buildQuery(query, buildJoins) {
    let finalQuery = query;
    const joinsClause = buildJoins;

    if (joinsClause) {
      // Find where to insert the JOIN clause
      const fromMatch = finalQuery.match(
        /FROM\s+(?:`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:AS\s+)?(?!INNER\b|LEFT\b|RIGHT\b|FULL\b|CROSS\b|JOIN\b|WHERE\b|GROUP\b|HAVING\b|ORDER\b|LIMIT\b|OFFSET\b)[A-Za-z_][A-Za-z0-9_]*)?/i,
      );

      if (fromMatch) {
        const fromEndIndex = fromMatch.index + fromMatch[0].length;

        // Find the next clause after FROM (WHERE, ORDER BY, LIMIT, etc.)
        const afterFrom = finalQuery.substring(fromEndIndex);
        const whereMatch = afterFrom.match(/\s+WHERE\s+/i);
        const orderMatch = afterFrom.match(/\s+ORDER BY\s+/i);
        const limitMatch = afterFrom.match(/\s+LIMIT\s+/i);
        const offsetMatch = afterFrom.match(/\s+OFFSET\s+/i);
        const havingMatch = afterFrom.match(/\s+HAVING\s+/i);
        const groupMatch = afterFrom.match(/\s+GROUP BY\s+/i);

        // Find the earliest clause
        let insertPoint = finalQuery.length;

        if (whereMatch && whereMatch.index !== -1) {
          insertPoint = Math.min(insertPoint, fromEndIndex + whereMatch.index);
        }
        if (groupMatch && groupMatch.index !== -1) {
          insertPoint = Math.min(insertPoint, fromEndIndex + groupMatch.index);
        }
        if (havingMatch && havingMatch.index !== -1) {
          insertPoint = Math.min(insertPoint, fromEndIndex + havingMatch.index);
        }
        if (orderMatch && orderMatch.index !== -1) {
          insertPoint = Math.min(insertPoint, fromEndIndex + orderMatch.index);
        }
        if (limitMatch && limitMatch.index !== -1) {
          insertPoint = Math.min(insertPoint, fromEndIndex + limitMatch.index);
        }
        if (offsetMatch && offsetMatch.index !== -1) {
          insertPoint = Math.min(insertPoint, fromEndIndex + offsetMatch.index);
        }

        // If no clauses found, insert at the end (right after FROM table)
        if (insertPoint === finalQuery.length) {
          insertPoint = fromEndIndex;
        }

        finalQuery =
          finalQuery.slice(0, insertPoint) +
          joinsClause +
          finalQuery.slice(insertPoint);
      }
    }

    return finalQuery;
  },
  generateCustomId(prefix = "USR", length = 6) {
    const uuid = uuidv4().replace(/-/g, "");
    const hexPart = uuid.slice(0, 12); // take first 12 hex characters
    const numeric = parseInt(hexPart, 16).toString().slice(0, length); // convert to number, take first N digits

    return `${prefix}-${numeric}`;
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
};
module.exports = utils;
