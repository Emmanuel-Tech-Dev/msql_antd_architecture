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

    return this.generateAuthTokens(user);
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

  async verifyGoogleAuthToken(token) {
    try {
      const ticket = await this.googleAuthClient.verifyIdToken({
        token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      return ticket.getPayload();
    } catch (error) {
      throw new AppError("ERR_INVALID_TOKEN", "Invalid Google token");
    }
  }

  async googleLogin(idToken, req) {
    // Verification happens here automatically
    const payload = await this.verifyGoogleAuthToken(idToken);

    log.security("Google OAuth token verified", {
      provider: "google",
      subjectPresent: Boolean(payload?.sub),
      emailVerified: payload?.email_verified === true,
    });

    const googleUser = {
      google_id: payload.sub,
      email: payload.email,
      name: payload.name,
      profile_picture: payload.picture,
      //  email_verified: payload.email_verified,
    };

    // Find or create user
    let [user] = await this.model
      .multiSelect([
        { table: "admin", columns: ["custom_id", "email", "name"] },
        { table: "admin_credentials", columns: ["token_version"] },
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
          { table: "admin", columns: ["custom_id", "email", "name"] },
          { table: "admin_credentials", columns: ["token_version"] },
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
        // Create new user
        const regNumber = utils.genRegNumber(this.IDPREFIX);
        const passwordHash = await this.hashedPassword(
          crypto.randomBytes(32).toString("hex"),
        );

        await this.model.transaction(async (transact) => {
          const adminBuilder = transact.builder();
          adminBuilder.insert("admin", {
            custom_id: regNumber,
            email: googleUser.email,
            name: googleUser.name,
            oauth_id: googleUser.google_id,
            oauth_provider: "google",
            profile_picture: googleUser.profile_picture,
            // email_verified: googleUser.email_verified,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await adminBuilder.executeInTransaction();

          const credentialsBuilder = transact.builder();
          credentialsBuilder.insert("admin_credentials", {
            admin_custom_id: regNumber,
            password: passwordHash,
          });
          await credentialsBuilder.executeInTransaction();
        });

        user = {
          custom_id: regNumber,
          email: googleUser.email,
          name: googleUser.name,
          token_version: 1,
        };
      }
    }

    return this.issueAuthTokensAndRecordLogin(
      {
        custom_id: user.custom_id,
        token_version: user.token_version || 1,
      },
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

  async login(record, req) {
    const { email, password } = record;

    if (!email || !password) {
      throw new AppError("ERR_MISSING_REQUIRED_FIELD");
    }

    const rootUser = this.settings.get("auth.dev_accounts");
    // if(email === rootUser?.email){

    // }

    const [user] = await this.model
      .multiSelect([
        { table: "admin", columns: ["custom_id", "email", "name"] },
        {
          table: "admin_credentials",
          columns: ["password", "token_version"],
        },
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
        details: "Authentication failed , Try again later",
        level: "security",
      });
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
      .select(
        ["admin_custom_id", "token_version"],
        "admin_credentials",
      )
      .where("admin_custom_id", "=", decoded.sub)
      .execute();

    if (!user || user?.token_version !== decoded?.token_version) {
      throw new AppError("ERR_TOKEN_INVALID", "OTP challenge is no longer valid");
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

    return this.issueAuthTokensAndRecordLogin(
      {
        custom_id: user.admin_custom_id,
        token_version: user.token_version,
      },
      req,
    );
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

  async createAdminUser(record) {
    if (!record?.email || !record?.password || !record?.name) {
      throw new AppError("ERR_MISSING_REQUIRED_FIELD");
    }

    const result = await this.model.transaction(async (transact) => {
      const hashedPassword = await this.hashedPassword(record?.password);
      const filteredRecords = utils.removePasswordFromObject(record);

      const cid = utils.genRegNumber(this.IDPREFIX);
      // 1. Insert into admin table
      const builder = transact.builder();
      builder.insert("admin", {
        custom_id: cid,
        ...filteredRecords,
      });
      await builder.executeInTransaction();

      // 2. Insert into another table (e.g., admin_credentials or admin_audit)
      const builder2 = transact.builder();
      builder2.insert("admin_credentials", {
        // Different table?

        password: hashedPassword, // Use original record data
        admin_custom_id: cid,
      });

      await builder2.executeInTransaction(); // Fixed: was builder, should be builder2

      return true;
    });

    return result;
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
    const decoded = await this.verifyToken(token, this.refreshTokenSecret);

    if (!decoded || decoded.type !== "refresh") {
      throw new AppError(" ERR_BAD_REQUEST");
    }

    // 1. Check blacklist (by jti)
    const [blacklisted] = await this.model
      .select(["jti"], "token_blacklist")
      .where("jti", "=", decoded.jti)
      .where("token_type", "=", "refresh")
      .execute();

    if (blacklisted) {
      throw new AppError("ERR_BAD_REQUEST");
    }

    // 2. Check token_version matches
    const [user] = await this.model
      .select(["token_version"], "admin_credentials")
      .where("admin_custom_id", "=", decoded.sub)
      .execute();

    if (!user || user.token_version !== decoded.token_version) {
      throw new AppError("ERR_BAD_REQUEST");
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
      token_version: user.token_version,
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

    await this.model
      .update("admin_credentials", {
        password: hashPassword,
        token_version: newTokenVersion,
        updated_at: new Date(),
      })
      .where("admin_custom_id", "=", sub)
      .execute();

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
        "ERR_INVALID_TOKEN",
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

    await this.model
      .update("admin_credentials", {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
        reset_token_used: true,
        token_version: newTokenVersion,
        reset_limit: 0,
        last_reset_attempt: null,
        updated_at: new Date(),
      })
      .where("admin_custom_id", "=", user?.admin_custom_id)
      .execute();

    return true;
  }
}

module.exports = AuthService;
