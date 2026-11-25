const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const SettingsManager = require("./systemSettings");
const Model = require("../model/model");
const utils = require("../../shared/utils/functions");
const AppError = require("../../shared/helpers/AppError");
const crypto = require("crypto");
const log = require("../../shared/helpers/logger");
const otpService = require("../../shared/helpers/otpService");
const temp = require("../../shared/utils/templates");
const { OAuth2Client } = require("google-auth-library");

const identityFingerprint = (value) =>
  crypto
    .createHash("sha256")
    .update(String(value ?? "").trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);

// Temporary passwords are read out or written down for the user, so they
// skip characters people mix up (0/O, 1/I/L). 12 characters from 31 is
// about 59 bits: not guessable, and only ever valid until first sign-in.
const TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateTemporaryPassword() {
  const characters = Array.from(crypto.randomBytes(12), (byte) => TEMPORARY_PASSWORD_ALPHABET[byte % TEMPORARY_PASSWORD_ALPHABET.length]);
  return [0, 4, 8].map((start) => characters.slice(start, start + 4).join("")).join("-");
}

// Which admin columns sign-in accepts is a setting; these apply when it is
// missing. Only columns that alone identify one account are ever used.
const DEFAULT_LOGIN_IDENTIFIERS = ["email", "custom_id"];
const NON_IDENTIFIER_COLUMNS = new Set(["id", "password", "name"]);

// Phone numbers are stored in international form (+233241234567). Local
// numbers get the configured country code. Anything else is not a phone.
function normalizePhoneNumber(value, countryCode) {
  const input = String(value ?? "").trim();
  if (!/^\+?[\d\s\-()]+$/.test(input)) return null;

  const digits = input.replace(/\D/g, "");
  let internationalDigits = digits;
  if (!input.startsWith("+") && digits.startsWith("0") && digits.length === 10) {
    internationalDigits = `${countryCode}${digits.slice(1)}`;
  } else if (!input.startsWith("+") && digits.length === 9) {
    internationalDigits = `${countryCode}${digits}`;
  }

  if (internationalDigits.length < 10 || internationalDigits.length > 15) return null;
  return `+${internationalDigits}`;
}

class AuthService {
  constructor() {
    this.settings = new SettingsManager();
    this.model = new Model();
    this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    this.AuthOTPKey = process.env.ENCRYPTION_KEY;

    this.googleAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Initializers
    this.TOKEN_ISSUER = null;
    this.IDPREFIX = null;
    this.MAX_RESET_LIMIT = null;
    this.LOCKOUT_DURATION_MINUTES = null;

    this.init();
  }

  async init() {
    this.IDPREFIX = await this.settings.get("regnumber.prefix");
    this.TOKEN_ISSUER = await this.settings.get("system.token_issuer");
    this.MAX_RESET_LIMIT = await this.settings.get(
      "auth.forget.password.limit",
    );
    this.LOCKOUT_DURATION_MINUTES = await this.settings.get(
      "auth.lockout_duration_minutes",
    );
  }
  async tokenIssuerInit() {
    const issuer =
      this.TOKEN_ISSUER || (await this.settings.get("system.token_issuer"));
    return issuer;
  }

  _generateToken(payload, secret, expiresIn) {
    return jwt.sign(
      payload, // Your custom payload
      secret,
      {
        expiresIn, // This sets the 'exp' claim automatically
        // jti: jti, // This sets the 'jti' claim in JWT standard claims
        issuer: this.TOKEN_ISSUER, // Optional: set issuer
        // audience: "your-users", // Optional: set audience
      },
    );
  }

  async sendResetLink(email, html, subject) {
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
  }

  async generateAuthTokens(user) {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const payload = {
      sub: user?.custom_id,
      token_version: user?.token_version,
    };

    const accessttl = await this.settings.get("auth.jwt.access_ttl");
    const refreshttl = await this.settings.get("auth.jwt.refresh_ttl");

    const accessToken = this._generateToken(
      {
        ...payload,
        jti: accessJti,
        type: "access",
      },
      this.accessTokenSecret,
      accessttl,
    );

    const refreshToken = this._generateToken(
      {
        ...payload,
        jti: refreshJti,
        type: "refresh",
      },
      this.refreshTokenSecret,
      refreshttl,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyToken(token, secret) {
    const decoded = jwt.verify(token, secret);

    return decoded;
  }

  async generateOtpChallengeToken(user, otpHash) {
    const issuer = await this.tokenIssuerInit();

    return jwt.sign(
      {
        sub: user?.custom_id,
        email: user?.email,
        token_version: user?.token_version,
        otp_hash: otpHash,
        type: "otp_challenge",
      },
      process.env.OTP_CHALLENGE_SECRET || this.accessTokenSecret,
      {
        expiresIn: process.env.OTP_CHALLENGE_TTL || "5m",
        issuer,
      },
    );
  }

  async verifyOtpChallengeToken(token) {
    if (!token) {
      throw new AppError("ERR_TOKEN_INVALID", "OTP challenge token required");
    }

    const decoded = await this.verifyToken(
      token,
      process.env.OTP_CHALLENGE_SECRET || this.accessTokenSecret,
    );

    if (decoded?.type !== "otp_challenge") {
      throw new AppError("ERR_TOKEN_INVALID", "Invalid OTP challenge token");
    }

    return decoded;
  }

  async sendLoginOtpEmail(email, code) {
    const html = temp.otpTemplateV1(code);
    await this.sendResetLink(email, html, "Your login verification code");
  }

  async issueEmailOtpChallenge(user, req) {
    const signingSecret = process.env.OTP_CHALLENGE_SECRET || this.accessTokenSecret;

    if (!signingSecret) {
      throw new AppError("ERR_INTERNAL_SERVER", "OTP secret is not configured");
    }

    const code = otpService.generateEmailOtpCode();
    const otpHash = otpService.hashEmailOtpCode(
      code,
      user?.custom_id,
      signingSecret,
    );
    const challengeToken = await this.generateOtpChallengeToken(user, otpHash);

    await this.sendLoginOtpEmail(user?.email, code);

    await utils.activityLogs(
      user?.custom_id,
      "Authentication",
      "pending",
      "Email OTP verification required",
      req?.ip,
      req?.headers?.["user-agent"],
    );

    return {
      requiresOtp: true,
      challengeToken,
      email: user?.email,
      expiresIn: process.env.OTP_CHALLENGE_TTL || "5m",
    };
  }

  async issueAuthTokensAndRecordLogin(user, req) {
    await this.model
      .update("admin", {
        last_login: new Date(),
      })
      .where("custom_id", "=", user?.custom_id)
      .execute();

    await utils.activityLogs(
      user?.custom_id,
      "Authentication",
      "success",
      "Login Successfully",
      req?.ip,
      req?.headers?.["user-agent"],
    );

    const tokens = await this.generateAuthTokens(user);
    const forcedPasswordChange = Number(user?.forced_password_change) === 1;

    return {
      ...tokens,
      forcedPasswordChange,
      user: {
        custom_id: user?.custom_id,
        name: user?.name,
        email: user?.email,
        forced_password_change: forcedPasswordChange ? 1 : 0,
      },
    };
  }

  async hashedPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  }

  async comparePassword(password, hashedPassword) {
    const value = await bcrypt.compare(password, hashedPassword);
    return value;
  }

  hashResetToken(token) {
    const resetToken = crypto.createHash("sha256").update(token).digest("hex");
    return resetToken;
  }

  getGoogleAudiences() {
    return [...new Set(
      [process.env.GOOGLE_CLIENT_ID, ...(process.env.GOOGLE_CLIENT_IDS || "").split(",")]
        .map((clientId) => clientId?.trim())
        .filter(Boolean),
    )];
  }

  getGoogleTokenClaims(token) {
    try {
      const payload = String(token).split(".")[1];
      if (!payload) return null;
      return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return null;
    }
  }

  async verifyGoogleAuthToken(token) {
    const audiences = this.getGoogleAudiences();
    const claims = this.getGoogleTokenClaims(token);

    if (!audiences.length) {
      throw new AppError(
        "ERR_INTERNAL_SERVER",
        "Google sign-in is not configured on this server",
      );
    }

    if (claims?.aud && !audiences.includes(claims.aud)) {
      log.security("Google OAuth audience mismatch", {
        tokenAudience: claims.aud,
        configuredAudienceCount: audiences.length,
        issuer: claims.iss,
      });
      throw new AppError(
        "ERR_TOKEN_INVALID",
        "Google sign-in is configured for a different OAuth client",
        { reason: "audience_mismatch" },
      );
    }

    try {
      const ticket = await this.googleAuthClient.verifyIdToken({
        idToken: token,
        audience: audiences,
      });

      return ticket.getPayload();
    } catch (error) {
      const source = String(error?.message || "").toLowerCase();
      const reason = source.includes("expired")
        ? "expired_token"
        : source.includes("issuer")
          ? "issuer_mismatch"
          : claims
            ? "verification_failed"
            : "malformed_token";
      log.security("Google OAuth token verification failed", {
        reason,
        tokenAudience: claims?.aud,
        issuer: claims?.iss,
        errorName: error?.name,
      });
      throw new AppError(
        "ERR_TOKEN_INVALID",
        "Google could not verify this sign-in. Check the OAuth client configuration and try again.",
        { reason },
      );
    }
  }

  async googleLogin(idToken, req) {
    if (!idToken) {
      throw new AppError("ERR_TOKEN_INVALID", "Google credential is required");
    }

    const payload = await this.verifyGoogleAuthToken(idToken);

    if (payload?.email_verified !== true || !payload?.email || !payload?.sub) {
      throw new AppError(
        "ERR_TOKEN_INVALID",
        "Google must provide a verified email address",
      );
    }

    log.security("Google OAuth token verified", {
      provider: "google",
      subjectPresent: Boolean(payload?.sub),
      emailVerified: payload?.email_verified === true,
    });

    const googleUser = {
      google_id: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: payload.name || payload.email.split("@")[0],
      profile_picture: payload.picture,
    };

    // Find or create user
    let [user] = await this.model
      .multiSelect([
        {
          table: "admin",
          columns: [
            "custom_id",
            "email",
            "name",
            "status",
            "forced_password_change",
            "oauth_provider",
          ],
        },
        {
          table: "admin_credentials",
          columns: ["token_version", "password_login_enabled"],
        },
      ])
      .join(
        "INNER",
        "admin_credentials",
        "admin.custom_id",
        "admin_credentials.admin_custom_id",
      )
      .where("admin.oauth_id", "=", googleUser.google_id)
      .execute();

    if (!user) {
      // Check if email exists
      [user] = await this.model
        .multiSelect([
          {
            table: "admin",
            columns: [
              "custom_id",
              "email",
              "name",
              "status",
              "forced_password_change",
              "oauth_provider",
            ],
          },
          {
            table: "admin_credentials",
            columns: ["token_version", "password_login_enabled"],
          },
        ])
        .join(
          "INNER",
          "admin_credentials",
          "admin.custom_id",
          "admin_credentials.admin_custom_id",
        )
        .where("admin.email", "=", googleUser.email)
        .execute();

      if (user) {
        // Link Google to existing account
        await this.model
          .update("admin", {
            oauth_id: googleUser.google_id,
            oauth_provider: "google",
            profile_picture: googleUser.profile_picture,
            //  email_verified: googleUser.email_verified,
            updatedAt: new Date(),
          })
          .where("custom_id", "=", user.custom_id)
          .execute();
      } else {
        const idPrefix =
          this.IDPREFIX || (await this.settings.get("regnumber.prefix"));
        const regNumber = utils.genRegNumber(idPrefix);
        const passwordHash = await this.hashedPassword(
          crypto.randomBytes(32).toString("hex"),
        );
        const roles = await this.model
          .select(["role_name"], "admin_roles")
          .execute();
        const defaultRole = roles.find(
          (role) => String(role?.role_name ?? "").trim().toLowerCase() === "user",
        );
        if (!defaultRole?.role_name) {
          throw new AppError(
            "ERR_INTERNAL_SERVER",
            "The default User role is not configured",
          );
        }

        await this.model.transaction(async (transact) => {
          const adminBuilder = transact.builder();
          adminBuilder.insert("admin", {
            custom_id: regNumber,
            email: googleUser.email,
            name: googleUser.name,
            oauth_id: googleUser.google_id,
            oauth_provider: "google",
            profile_picture: googleUser.profile_picture,
            status: 1,
            forced_password_change: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await adminBuilder.executeInTransaction();

          const credentialsBuilder = transact.builder();
          credentialsBuilder.insert("admin_credentials", {
            admin_custom_id: regNumber,
            password: passwordHash,
            password_login_enabled: 0,
          });
          await credentialsBuilder.executeInTransaction();

          const roleBuilder = transact.builder();
          roleBuilder.insert("admin_user_roles", {
            user_id: regNumber,
            role_id: defaultRole.role_name,
          });
          await roleBuilder.executeInTransaction();
        });

        user = {
          custom_id: regNumber,
          email: googleUser.email,
          name: googleUser.name,
          status: 1,
          forced_password_change: 0,
          oauth_provider: "google",
          password_login_enabled: 0,
          token_version: 1,
        };
      }
    }

    if (Number(user?.status) !== 1) {
      throw new AppError("ERR_FORBIDDEN", "Account is inactive");
    }

    return this.issueAuthTokensAndRecordLogin(
      { ...user, token_version: user.token_version || 1 },
      req,
    );
  }

  async isResetLockedOut(id) {
    const [user] = await this.model
      .select(["reset_limit", "last_reset_attempt"], "admin_credentials")
      .where("admin_custom_id", "=", id)
      .execute();

    if (!user || user?.reset_limit < this.MAX_RESET_LIMIT) {
      return false;
    }

    if (!user?.last_reset_attempt) {
      return false;
    }

    const lockoutEnd = new Date(user?.last_reset_attempt);
    lockoutEnd.setMinutes(
      lockoutEnd.getMinutes() + this.LOCKOUT_DURATION_MINUTES,
    );

    return new Date() < lockoutEnd;
  }

  async getRemainingLockoutTime(id) {
    const [user] = await this.model
      .select(["last_reset_attempt"], "admin_credentials")
      .where("admin_custom_id", "=", id)
      .execute();

    if (!user || !user?.last_reset_attempt) {
      return 0;
    }

    const lockoutEnd = new Date(user?.last_reset_attempt);
    lockoutEnd.setMinutes(
      lockoutEnd.getMinutes() + this.LOCKOUT_DURATION_MINUTES,
    );

    const remainingMs = lockoutEnd - new Date();
    return Math.max(0, Math.ceil(remainingMs / 60000)); // Convert to minutes
  }

  //login flow

  // Sign-in settings are read from the database every time (not the settings
  // cache), so a change to them applies without a restart.
  async loginSetting(key, fallback) {
    return (await this.settings.fetchFromDB(key)) ?? fallback;
  }

  // The admin columns a person may sign in with, in the configured order.
  // A configured column is dropped unless it alone identifies one account.
  async loginIdentifierColumns() {
    const configured = await this.loginSetting(
      "auth.login_identifiers",
      DEFAULT_LOGIN_IDENTIFIERS,
    );
    const uniqueColumns = await this.model.getUniqueColumns("admin");
    const usable = (Array.isArray(configured) ? configured : []).filter(
      (column) =>
        uniqueColumns.includes(column) && !NON_IDENTIFIER_COLUMNS.has(column),
    );

    if (usable.length !== (configured?.length ?? 0)) {
      log.security("Unusable sign-in identifiers ignored", {
        configured,
        usable,
      });
    }
    return usable.length ? usable : ["custom_id"];
  }

  async login(record, req) {
    const identifier = String(record?.identifier ?? record?.email ?? "").trim();
    const { password } = record ?? {};

    if (!identifier || !password) {
      throw new AppError("ERR_MISSING_REQUIRED_FIELD");
    }

    const countryCode = await this.loginSetting("auth.phone_country_code", "233");
    const loginConditions = (await this.loginIdentifierColumns())
      .map((column) => {
        if (column === "email") return { column, value: identifier.toLowerCase() };
        if (column === "phone_no") {
          return { column, value: normalizePhoneNumber(identifier, countryCode) };
        }
        return { column, value: identifier };
      })
      .filter((condition) => condition.value)
      .map((condition) => ({ ...condition, column: `admin.${condition.column}` }));

    // An empty group would add no WHERE at all and match any account.
    if (!loginConditions.length) {
      throw new AppError("ERR_USER_NOT_FOUND", null, {
        details: "Authentication failed , Try again later",
        level: "security",
      });
    }

    const users = await this.model
      .multiSelect([
        {
          table: "admin",
          columns: [
            "custom_id",
            "email",
            "phone_no",
            "name",
            "status",
            "forced_password_change",
            "oauth_provider",
          ],
        },
        {
          table: "admin_credentials",
          columns: ["password", "token_version", "password_login_enabled"],
        },
      ])
      .join(
        "INNER",
        "admin_credentials",
        "admin.custom_id",
        "admin_credentials.admin_custom_id",
      )
      .where(loginConditions, "=", "OR")
      .limit(2)
      .execute();

    // One value matching two accounts (one's email is another's ID) must
    // never pick either of them.
    if (users.length > 1) {
      log.security("Sign-in identifier matched more than one account", {
        identifierFingerprint: identityFingerprint(identifier),
      });
    }
    const user = users.length === 1 ? users[0] : null;

    if (!user) {
      throw new AppError("ERR_USER_NOT_FOUND", null, {
        details: "Authentication failed , Try again later",
        level: "security",
      });
    }

    if (Number(user?.status) !== 1) {
      throw new AppError("ERR_FORBIDDEN", "Account is inactive");
    }

    if (Number(user?.password_login_enabled) === 0) {
      throw new AppError(
        "ERR_FORBIDDEN",
        "This account uses Google sign-in. Set a password first to enable email and password login.",
      );
    }

    const isPasswordValid = await this.comparePassword(
      password,
      user?.password,
    );

    if (!isPasswordValid) {
      throw new AppError("ERR_INVALID_CREDENTIALS", "Wrong user password", {
        details: "Authentication failed!,Try again",
        level: "security",
      });
    }

    return this.issueAuthTokensAndRecordLogin(user, req);
  }

  async requestOtpLogin(record, req) {
    const { email } = record;

    if (!email) {
      throw new AppError("ERR_MISSING_REQUIRED_FIELD");
    }

    const [user] = await this.model
      .multiSelect([
        { table: "admin", columns: ["custom_id", "email", "name", "status"] },
        { table: "admin_credentials", columns: ["token_version"] },
      ])
      .join(
        "INNER",
        "admin_credentials",
        "admin.custom_id",
        "admin_credentials.admin_custom_id",
      )
      .where("admin.email", "=", email)
      .execute();

    if (!user) {
      throw new AppError("ERR_USER_NOT_FOUND", null, {
        details: "No registered account exists for this email",
        level: "security",
      });
    }

    if (Number(user?.status) !== 1) {
      throw new AppError("ERR_FORBIDDEN", "Account is inactive");
    }

    return this.issueEmailOtpChallenge(user, req);
  }

  async verifyOtpLogin(challengeToken, code, req) {
    const decoded = await this.verifyOtpChallengeToken(challengeToken);

    const [user] = await this.model
      .multiSelect([
        {
          table: "admin",
          columns: [
            "custom_id",
            "email",
            "name",
            "status",
            "forced_password_change",
          ],
        },
        { table: "admin_credentials", columns: ["token_version"] },
      ])
      .join(
        "INNER",
        "admin_credentials",
        "admin.custom_id",
        "admin_credentials.admin_custom_id",
      )
      .where("admin.custom_id", "=", decoded.sub)
      .execute();

    if (!user || user?.token_version !== decoded?.token_version) {
      throw new AppError("ERR_TOKEN_INVALID", "OTP challenge is no longer valid");
    }

    if (Number(user?.status) !== 1) {
      throw new AppError("ERR_FORBIDDEN", "Account is inactive");
    }

    const result = otpService.verifyEmailOtpCode(
      code,
      decoded.sub,
      decoded.otp_hash,
      process.env.OTP_CHALLENGE_SECRET || this.accessTokenSecret,
    );

    if (!result.isValid) {
      throw new AppError("ERR_INVALID_CREDENTIALS", result.error);
    }

    return this.issueAuthTokensAndRecordLogin(user, req);
  }

  async resendOtpLogin(challengeToken, req) {
    const decoded = await this.verifyOtpChallengeToken(challengeToken);

    const [user] = await this.model
      .multiSelect([
        { table: "admin", columns: ["custom_id", "email"] },
        { table: "admin_credentials", columns: ["token_version"] },
      ])
      .join(
        "INNER",
        "admin_credentials",
        "admin.custom_id",
        "admin_credentials.admin_custom_id",
      )
      .where("admin.custom_id", "=", decoded.sub)
      .execute();

    if (!user || user?.token_version !== decoded?.token_version) {
      throw new AppError("ERR_TOKEN_INVALID", "OTP challenge is no longer valid");
    }

    return this.issueEmailOtpChallenge(user, req);
  }

  async createAdminUser(record, { actorUserId } = {}) {
    if (!record?.name) {
      throw new AppError("ERR_MISSING_REQUIRED_FIELD");
    }

    const email = record.email?.trim().toLowerCase() || null;
    const name = record.name.trim();
    const roles = await this.model
      .select(["role_name"], "admin_roles")
      .execute();
    const defaultRole = roles.find(
      (role) => String(role?.role_name ?? "").trim().toLowerCase() === "user",
    );
    if (!defaultRole?.role_name) {
      throw new AppError(
        "ERR_INTERNAL_SERVER",
        "The default User role is not configured",
      );
    }
    const requestedRoleName = String(record.role ?? defaultRole.role_name).trim();
    const assignedRole = roles.find(
      (role) => String(role?.role_name ?? "").trim() === requestedRoleName,
    );
    if (!assignedRole?.role_name) {
      throw new AppError("ERR_VALIDATION_FAILED", "The selected system role is unavailable");
    }
    const additionalPermissions = [
      ...new Set(
        (record.additional_permissions ?? [])
          .map((permission) => String(permission).trim())
          .filter(Boolean),
      ),
    ];
    if (additionalPermissions.length) {
      const availablePermissions = await this.model
        .select(["permission_name"], "admin_permissions")
        .whereIn("permission_name", additionalPermissions)
        .execute();
      if (availablePermissions.length !== additionalPermissions.length) {
        throw new AppError("ERR_VALIDATION_FAILED", "One or more additional permissions are unavailable");
      }
    }

    let phoneNumber = null;
    if (record.phone_no) {
      const countryCode = await this.loginSetting("auth.phone_country_code", "233");
      phoneNumber = normalizePhoneNumber(record.phone_no, countryCode);
      if (!phoneNumber) {
        throw new AppError("ERR_VALIDATION_FAILED", "Enter a valid phone number");
      }
    }

    const idPrefix = this.IDPREFIX || (await this.settings.get("regnumber.prefix"));
    const cid = utils.genRegNumber(idPrefix);
    // Shown once to the administrator, who hands it to the user; the user
    // must replace it at first sign-in.
    const temporaryPassword = generateTemporaryPassword();
    const defaultPasswordHash = await this.hashedPassword(temporaryPassword);
    const createdUser = {
      custom_id: cid,
      name,
      email,
      phone_no: phoneNumber,
      oauth_provider: "Password",
      status: Number(record.status) === 0 ? 0 : 1,
      forced_password_change: 1,
    };

    await this.model.transaction(async (transact) => {
      const builder = transact.builder();
      builder.insert("admin", createdUser);
      await builder.executeInTransaction();

      const builder2 = transact.builder();
      builder2.insert("admin_credentials", {
        password: defaultPasswordHash,
        admin_custom_id: cid,
      });
      await builder2.executeInTransaction();

      const roleBuilder = transact.builder();
      roleBuilder.insert("admin_user_roles", {
        user_id: cid,
        role_id: assignedRole.role_name,
      });
      await roleBuilder.executeInTransaction();

      for (const permission of additionalPermissions) {
        const permissionBuilder = transact.builder();
        permissionBuilder.insert("admin_user_permission_overrides", {
          user_id: cid,
          permission,
          effect: "ALLOW",
          reason: "Assigned during account creation",
          granted_by: actorUserId || null,
          valid_from: new Date(),
          valid_until: null,
        });
        await permissionBuilder.executeInTransaction();
      }
    });

    return {
      ...createdUser,
      default_role: String(assignedRole.role_name).trim(),
      additional_permissions: additionalPermissions,
      temporary_password: temporaryPassword,
    };
  }

  // For a user who forgot their password and cannot use the reset link (for
  // example, no email): a new temporary password the administrator hands
  // over. Every session the user has is signed out, and they must choose a
  // new password at their next sign-in.
  async resetTemporaryPassword(userId) {
    const [user] = await this.model
      .select(["custom_id", "name"], "admin")
      .where("custom_id", "=", userId)
      .execute();
    if (!user) throw new AppError("ERR_USER_NOT_FOUND", "User not found");

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.hashedPassword(temporaryPassword);
    await this.model.transaction(async (tx) => {
      // The row is locked so a sign-out elsewhere cannot raise token_version
      // between the read and the write; the new version signs out every session.
      const [credentials] = await tx.builder()
        .select(["token_version"], "admin_credentials")
        .where("admin_custom_id", "=", user.custom_id)
        .forUpdate()
        .executeInTransaction();
      if (credentials) {
        await tx.builder()
          .update("admin_credentials", {
            password: passwordHash,
            password_login_enabled: 1,
            token_version: Number(credentials.token_version ?? 0) + 1,
          })
          .where("admin_custom_id", "=", user.custom_id)
          .executeInTransaction();
      }
      await tx.builder()
        .update("admin", { forced_password_change: 1 })
        .where("custom_id", "=", user.custom_id)
        .executeInTransaction();
    });
    return { custom_id: user.custom_id, name: user.name, temporary_password: temporaryPassword };
  }

  async googleOAuth(record, req) {
    return this.googleLogin(record?.idToken ?? record?.token, req);
  }

  async logout(token, req) {
    // const { accessToken, refreshToken } = token;

    const verifyToken = await this.verifyToken(token, this.refreshTokenSecret);
    // const refToken = await this.verifyRefreshToken(
    //   refreshToken,
    //   this.refreshTokenSecret
    // );

    await this.model.transaction(async (transact) => {
      const builder = transact.builder();
      builder
        .update("admin_credentials", {
          token_version: verifyToken?.token_version + 1,
        })
        .where("admin_custom_id", "=", verifyToken?.sub);
      await builder.executeInTransaction();

      // 2. Insert into another table (e.g., admin_credentials or admin_audit)
      const builder2 = transact.builder();
      builder2
        .update("admin", {
          last_logout: new Date(),
        })
        .where("custom_id", "=", verifyToken?.sub);

      await builder2.executeInTransaction();

      const tokenBlacklist = transact.builder();

      tokenBlacklist.insert("token_blacklist", {
        user_custom_id: verifyToken?.sub,
        jti: verifyToken?.jti,
        token_type: verifyToken?.type,
      });

      await tokenBlacklist.executeInTransaction();
    });

    await utils.activityLogs(
      verifyToken?.sub,
      "Authentication",
      "success",
      "LogOut Successfully",
      req.path,
      req.headers["user-agent"],
    );
  }

  async refreshToken(token) {
    let decoded;
    try {
      decoded = await this.verifyToken(token, this.refreshTokenSecret);
    } catch (error) {
      if (error?.name === "TokenExpiredError" || error?.message === "jwt expired") {
        throw new AppError("ERR_TOKEN_EXPIRED", "Refresh token has expired", {
          reason: "refresh_token_expired",
        });
      }
      throw new AppError("ERR_TOKEN_INVALID", "Refresh token is invalid", {
        reason: "refresh_token_invalid",
      });
    }

    if (!decoded || decoded.type !== "refresh") {
      throw new AppError("ERR_TOKEN_INVALID", "Refresh token is invalid", {
        reason: "wrong_token_type",
      });
    }

    // 1. Check blacklist (by jti)
    const [blacklisted] = await this.model
      .select(["jti"], "token_blacklist")
      .where("jti", "=", decoded.jti)
      .where("token_type", "=", "refresh")
      .execute();

    if (blacklisted) {
      throw new AppError("ERR_TOKEN_REVOKED", "Refresh token has already been used", {
        reason: "refresh_token_reused",
      });
    }

    // 2. Check token_version matches
    const [user] = await this.model
      .select(["token_version"], "admin_credentials")
      .where("admin_custom_id", "=", decoded.sub)
      .execute();

    if (!user) {
      throw new AppError("ERR_AUTH_USER_INVALID", "The session user no longer exists", {
        reason: "session_user_missing",
      });
    }

    if (Number(user.token_version) !== Number(decoded.token_version)) {
      throw new AppError("ERR_TOKEN_REVOKED", "The session has been invalidated", {
        reason: "token_version_changed",
      });
    }

    await this.model
      .insert("token_blacklist", {
        user_custom_id: decoded.sub,
        jti: decoded.jti,
        token_type: "refresh",
      })
      .execute();

    const newtoken = await this.generateAuthTokens({
      custom_id: decoded.sub,
      token_version: Number(user.token_version),
    });

    // 4. Blacklist old refresh token now that we know the new one is ready.

    return newtoken;
  }

  async changePassword(record, req) {
    const { oldPassword, newpassword, sub } = record;
    if (!oldPassword || !newpassword || !sub) {
      throw new AppError(
        "ERR_INVALID_CREDENTIALS",
        "Current password is incorrect",
        {
          message: "Failed to change password , Try again later",
          level: "security",
        },
      );
    }

    const [user] = await this.model
      .select(
        ["admin_custom_id", "password", "token_version"],
        "admin_credentials",
      )
      .where("admin_custom_id", "=", sub)
      .execute();

    if (!user) {
      throw new AppError("ERR_USER_NOT_FOUND", null, {
        message: "Failed to change password , Try again later",
        level: "security",
      });
    }

    const isPasswordValid = await this.comparePassword(
      oldPassword,
      user?.password,
    );

    if (!isPasswordValid) {
      throw new AppError(
        "ERR_INVALID_CREDENTIALS",
        "Current password is incorrect",
        {
          message: "Failed to change password , Try again later",
          level: "security",
        },
      );
    }

    const hashPassword = await this.hashedPassword(newpassword);
    const newTokenVersion = (user.token_version || 0) + 1;

    const token = await this.generateAuthTokens({
      custom_id: user?.admin_custom_id,
      token_version: newTokenVersion,
    });

    await this.model.transaction(async (transact) => {
      const credentialsBuilder = transact.builder();
      credentialsBuilder
        .update("admin_credentials", {
          password: hashPassword,
          password_login_enabled: 1,
          token_version: newTokenVersion,
          updated_at: new Date(),
        })
        .where("admin_custom_id", "=", sub);
      await credentialsBuilder.executeInTransaction();

      const userBuilder = transact.builder();
      userBuilder
        .update("admin", {
          forced_password_change: 0,
          updatedAt: new Date(),
        })
        .where("custom_id", "=", sub);
      await userBuilder.executeInTransaction();
    });

    log.security("Password changed successfully", {
      requestId: req?.requestId,
      userId: sub,
      ip: req?.ip,
      userAgent: req?.get("user-agent"),
    });

    return token;
  }

  async forgetPassword(user, req) {
    const { email } = user;
    const [userExist] = await this.model
      .select(["email", "custom_id"], "admin")
      .where("email", "=", email)
      .execute();

    if (!userExist) {
      log.security("Password reset requested for non-existent email", {
        requestId: req?.requestId,
        identityFingerprint: identityFingerprint(email),
        ip: req?.ip,
      });
      return true;
    }

    const [credentials] = await this.model
      .select(["reset_limit", "last_reset_attempt"], "admin_credentials")
      .where("admin_custom_id", "=", userExist?.custom_id)
      .execute();

    //  Check if user is locked out
    const isLocked = await this.isResetLockedOut(userExist?.custom_id);
    if (isLocked) {
      const remainingTime = await this.getRemainingLockoutTime(
        userExist?.custom_id,
      );

      throw new AppError(
        "ERR_RATE_LIMIT_EXCEEDED",
        `Too many password reset attempts. Please try again in ${remainingTime} minutes.`,
        {
          message: `Account temporarily locked. Try again in ${remainingTime} minutes.`,
          level: "security",
        },
      );
    }

    // Check if max attempts reached (but lockout expired)
    const currentResetLimit = credentials?.reset_limit || 0;

    if (currentResetLimit >= this.MAX_RESET_LIMIT) {
      // Lockout has expired, reset the counter
      await this.model
        .update("admin_credentials", {
          reset_limit: 0,
          last_reset_attempt: null,
        })
        .where("admin_custom_id", "=", userExist?.custom_id)
        .execute();
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashToken = this.hashResetToken(resetToken);
    const expiresIn = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    const newResetLimit =
      currentResetLimit >= this.MAX_RESET_LIMIT
        ? 1 // If we just reset it, start at 1
        : currentResetLimit + 1; // Otherwise increment

    await this.model
      .update("admin_credentials", {
        reset_token: hashToken,
        reset_token_expiry: expiresIn,
        reset_token_used: false,
        reset_limit: newResetLimit,
        last_reset_attempt: new Date(),
        updated_at: new Date(),
      })
      .where("admin_custom_id", "=", userExist?.custom_id)
      .execute();

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const html = temp.passwordResetTemplate(resetLink, userExist?.email);
    const subject = "Password Reset";

    await this.sendResetLink(userExist?.email, html, subject);

    await utils.activityLogs(
      userExist?.custom_id,
      "Password Reset link Request",
      "Security",
      "Password Reset link request successful",
      req.ip,
      req.headers["user-agent"],
    );

    return true;
  }

  async verifyPasswordResetToken(token) {
    const resetToken = this.hashResetToken(token);

    const [user] = await this.model
      .select(
        ["admin_custom_id", "reset_token_expiry", "reset_token_used"],
        "admin_credentials",
      )
      .where("reset_token", "=", resetToken)
      .execute();

    if (!user) {
      throw new AppError("ERR_NOT_FOUND", null, {
        message: "Failed to verify token, Try again",
        level: "security",
      });
    }

    if (user?.reset_token_used) {
      throw new AppError("ERR_TOKEN_INVALID", "Token already used", {
        message: "Failed to verify token, Try again",
        level: "security",
      });
    }

    if (new Date(user?.reset_token_expiry) < new Date()) {
      throw new AppError("ERR_TOKEN_EXPIRED", null, {
        message: "Failed to verify token, Try again",
        level: "security",
      });
    }

    return true;
  }

  async resetPassword(token, newPassword) {
    // ✅ STEP 1: Verify Token (3 checks)
    const hashedToken = this.hashResetToken(token);

    const [user] = await this.model
      .select(
        [
          "admin_custom_id",
          "reset_token_expiry",
          "reset_token_used",
          "token_version",
        ],
        "admin_credentials",
      )
      .where("reset_token", "=", hashedToken)
      .execute();

    if (!user) {
      throw new AppError(
        "ERR_TOKEN_INVALID",
        "Invalid or expired reset token",
        {
          message: "Failed to reset password, Try again",
          level: "security",
        },
      );
    }

    if (user?.reset_token_used) {
      throw new AppError(
        "ERR_TOKEN_INVALID",
        "Reset token has already been used",
        {
          message: "Failed to reset password, Try again",
          level: "security",
        },
      );
    }

    if (new Date(user?.reset_token_expiry) < new Date()) {
      throw new AppError("ERR_TOKEN_EXPIRED", "Reset token has expired", {
        message: "Failed to reset password, Try again",
        level: "security",
      });
    }

    //  Update Password
    const hashedPassword = await this.hashedPassword(newPassword);
    const newTokenVersion = (user.token_version || 0) + 1;

    await this.model.transaction(async (transact) => {
      const credentialsBuilder = transact.builder();
      credentialsBuilder
        .update("admin_credentials", {
          password: hashedPassword,
          password_login_enabled: 1,
          reset_token: null,
          reset_token_expiry: null,
          reset_token_used: true,
          token_version: newTokenVersion,
          reset_limit: 0,
          last_reset_attempt: null,
          updated_at: new Date(),
        })
        .where("admin_custom_id", "=", user?.admin_custom_id);
      await credentialsBuilder.executeInTransaction();

      const userBuilder = transact.builder();
      userBuilder
        .update("admin", {
          forced_password_change: 0,
          updatedAt: new Date(),
        })
        .where("custom_id", "=", user?.admin_custom_id);
      await userBuilder.executeInTransaction();
    });

    return true;
  }
}

module.exports = AuthService;
