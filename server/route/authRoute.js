const AuthService = require("../core/lib/authService");
const SettingsManager = require("../core/lib/systemSettings");
const authMiddleWare = require("../core/middleware/authMiddleWare");
const { authorization } = require("../core/middleware/authorization");
const validateRequest = require("../core/middleware/validateRequest");
const Model = require("../core/model/model");
const authSchema = require("../schema/auth.schema/createUserScheme");
const log = require("../shared/helpers/logger");
const utils = require("../shared/utils/functions");
const AppError = require("../shared/helpers/AppError");
const authorizationEvents = require("../core/lib/authorizationEvents");
const conn = require("../core/config/conn");
const { z } = require("zod");
const { profileImageUpload } = require("../core/config/multer");
const uploadServices = require("../core/lib/uploadServices");

const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phoneNo: z.string().trim().max(30).nullable().optional(),
  })
  .strict();

const acceptProfileImage = (req, res, next) => {
  profileImageUpload.single("avatar")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Profile images must be smaller than 5 MB"
      : error.message;
    return next(new AppError("ERR_VALIDATION_FAILED", message));
  });
};
class AuthRoute {
  constructor(app) {
    this.app = app;
    this.auth = new AuthService();
    this.settings = new SettingsManager();
    this.refreshttl = null;
    this.login(app);
    this.createUserAccount(app);
    this.logout(app);
    this.refreshToken(app);
    this.changePassword(app);
    this.forgetPassword(app);
    this.verifyResetToken(app);
    this.resetPassword(app);
    this.googleOAuth(app);
    this.otpRoutes(app);
    this.getAuthUser(app);
    this.profile(app);
    this.profileAvatar(app);
    this.accessEvents(app);

    return this;
  }

  async getRefreshTtl() {
    if (!this.refreshttl) {
      this.refreshttl = await this.settings.get("auth.jwt.refresh_ttl");
    }
    return this.refreshttl;
  }

  getAuthUser(app) {
    app.get(
      "/auth/auth_user",
      authMiddleWare,
      authorization,
      async (req, res) => {
        const userId = req.user.sub;
        let role = Array.isArray(req.roles) ? req.roles : [];
        let perm = Array.isArray(req.permissions) ? req.permissions : [];
        let resources = [];

        // Ensure roles always available
        if (!role.length) {
          role = await new Model()
            .select(["user_id", "role_id"], "admin_user_roles")
            .where("user_id", "=", userId)
            .execute();
        }

        const roleNames = role
          .map((r) => (typeof r === "string" ? r : r?.role_id))
          .filter(Boolean);

        // Ensure permissions always available
        if (!perm.length && roleNames.length) {
          const perms = await new Model()
            .select(["permission"], "admin_role_permissions")
            .whereIn("role_id", roleNames)
            .execute();
          perm = perms.map((p) => p.permission);
        }

        // Browser routes for UI context should come from admin_role_browser_routes.
        // Dev role can access all browser routes once authenticated.
        const isDev = roleNames.some(
          (r) => String(r).trim().toLowerCase() === "dev",
        );

        if (isDev) {
          resources = await new Model()
            .select(
              [
                "id",
                "resource_path",
                "resource",
                "icon",
                "is_public",
                "display_order",
                "category",
                "show_in_nav",
              ],
              "admin_resources",
            )
            .where("resource_type", "=", "BROWSER_ROUTE")
            .execute();
        } else if (roleNames.length) {
          try {
            const placeholders = roleNames.map(() => "?").join(", ");
            resources = await new Model().raw(
              `SELECT DISTINCT ar.resource_path, ar.resource, ar.icon, ar.display_order,
                       ar.category, ar.show_in_nav
               FROM admin_resources ar
               INNER JOIN admin_role_browser_routes arbr
                 ON arbr.resource = ar.resource
               WHERE ar.resource_type = 'BROWSER_ROUTE'
                 AND arbr.role_id IN (${placeholders})
               ORDER BY ar.display_order ASC`,
              roleNames,
            );

            // Safety fallback for naming mismatches or empty assignments.
            if (!Array.isArray(resources) || resources.length === 0) {
              resources = perm.length
                ? await new Model()
                    .select(
                      [
                        "id",
                        "resource_path",
                        "resource",
                        "icon",
                        "is_public",
                        "display_order",
                        "category",
                        "show_in_nav",
                      ],
                      "admin_resources",
                    )
                    .where("resource_type", "=", "BROWSER_ROUTE")
                    .whereIn("resource", perm)
                    .execute()
                : [];
            }
          } catch (error) {
            // Compatibility fallback: old permission/resource mapping.
            resources = perm.length
              ? await new Model()
                  .select(
                    [
                      "id",
                      "resource_path",
                      "resource",
                      "icon",
                      "is_public",
                      "display_order",
                      "category",
                      "show_in_nav",
                    ],
                    "admin_resources",
                  )
                  .where("resource_type", "=", "BROWSER_ROUTE")
                  .whereIn("resource", perm)
                  .execute()
              : [];
          }
        }

        const [user] = await new Model()
          .select(
            ["custom_id", "name", "email", "phone_no", "avatar", "profile_picture", "status"],
            "admin",
          )
          .where("custom_id", "=", userId)
          .execute();

        if (!user) throw new AppError("ERR_USER_NOT_FOUND");

        res.status(200).json({
          status: "ok",
          data: {
            user,
            role,
            assignedPermission: perm,
            resources,
          },
        });
      },
    );
  }

  login(app) {
    app.post("/auth/login", async (req, res) => {
      const record = req.body;

      const response = await this.auth.login(record, req);
      const refreshttl = await this.getRefreshTtl();

      if (response?.requiresOtp) {
        return res.status(200).json({
          status: "ok",
          message: "OTP verification required",
          requiresOtp: true,
          challengeToken: response.challengeToken,
          email: response.email,
          expiresIn: response.expiresIn,
        });
      }

      res
        .status(200)
        .cookie("refresh_token", response?.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: refreshttl,
        })
        .json({
          status: "ok",
          message: "Operation Successfull!",
          token: response?.accessToken,
        });
    });
  }

  profile(app) {
    app.patch("/auth/profile", authMiddleWare, async (req, res) => {
      const parsed = profileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("ERR_VALIDATION_FAILED", "Invalid profile details", {
          fields: parsed.error.issues.map((issue) => issue.path.join(".")),
        });
      }

      const userId = req.user.sub;
      const { name, phoneNo = null } = parsed.data;
      await conn.execute(
        `UPDATE admin
         SET name = ?, phone_no = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE custom_id = ?`,
        [name, phoneNo || null, userId],
      );

      const [rows] = await conn.execute(
        `SELECT custom_id, name, email, phone_no, avatar, profile_picture, status, last_login, last_logout, createdAt
         FROM admin WHERE custom_id = ? LIMIT 1`,
        [userId],
      );
      if (!rows[0]) throw new AppError("ERR_USER_NOT_FOUND");

      log.security("User profile updated", {
        requestId: req.requestId,
        userId,
        changedFields: ["name", "phone_no"],
      });
      authorizationEvents.publish([userId], "profile-updated");

      res.status(200).json({
        status: "ok",
        message: "Profile updated",
        data: rows[0],
      });
    });
  }

  profileAvatar(app) {
    app.post(
      "/auth/profile/avatar",
      authMiddleWare,
      acceptProfileImage,
      async (req, res) => {
        if (!req.file) {
          throw new AppError("ERR_BAD_REQUEST", "Select an image to upload");
        }

        const userId = req.user.sub;
        const uploaded = await uploadServices.uploadProfileAvatar(req.file, userId);
        await conn.execute(
          `UPDATE admin SET avatar = ?, updatedAt = CURRENT_TIMESTAMP WHERE custom_id = ?`,
          [uploaded.url, userId],
        );

        log.security("User profile avatar updated", {
          requestId: req.requestId,
          userId,
          mimeType: req.file.mimetype,
          size: req.file.size,
        });
        authorizationEvents.publish([userId], "profile-avatar-updated");

        res.status(200).json({
          status: "ok",
          message: "Profile image updated",
          data: { avatar: uploaded.url },
        });
      },
    );
  }

  accessEvents(app) {
    app.get("/auth/access-events", authMiddleWare, (req, res) => {
      authorizationEvents.subscribe(req.user.sub, req, res);
    });
  }

  otpRoutes(app) {
    app.post("/auth/otp/request-login", async (req, res) => {
      const response = await this.auth.requestOtpLogin(req.body || {}, req);

      res.status(200).json({
        status: "ok",
        message: "OTP sent successfully",
        requiresOtp: true,
        challengeToken: response.challengeToken,
        email: response.email,
        expiresIn: response.expiresIn,
      });
    });

    app.post("/auth/otp/verify-login", async (req, res) => {
      const { challengeToken, code } = req.body || {};
      const response = await this.auth.verifyOtpLogin(challengeToken, code, req);
      const refreshttl = await this.getRefreshTtl();

      res
        .status(200)
        .cookie("refresh_token", response?.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: refreshttl,
        })
        .json({
          status: "ok",
          message: "Operation Successfull!",
          token: response?.accessToken,
        });
    });

    app.post("/auth/otp/resend-login", async (req, res) => {
      const { challengeToken } = req.body || {};
      const response = await this.auth.resendOtpLogin(challengeToken, req);

      res.status(200).json({
        status: "ok",
        message: "OTP sent successfully",
        requiresOtp: true,
        challengeToken: response.challengeToken,
        email: response.email,
        expiresIn: response.expiresIn,
      });
    });
  }

  logout(app) {
    app.post("/auth/logout", async (req, res) => {
      const token = req.cookies.refresh_token;

      await this.auth.logout(token, req);

      res
        .status(200)
        .clearCookie("refresh_token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        })
        .json({
          status: "ok",
          message: "Operation Successfull!",
          detalis: "User logout",
        });
    });
  }

  createUserAccount(app) {
    app.post(
      "/auth/register",
      authMiddleWare,
      authorization,
      validateRequest(authSchema.register),
      async (req, res) => {
        const record = req.body;
        await this.auth.createAdminUser(record);
        res.status(201).json({
          status: "ok",
          message: "Operation Successfull!",
          detalis: "User created successfully",
        });
      },
    );
  }

  refreshToken(app) {
    app.post("/auth/refresh", async (req, res) => {
      const token = req.cookies.refresh_token;

      if (!token) {
        return res.status(401).json({
          status: "error",
          message: "No refresh token provided",
        });
      }

      const refreshttl = await this.getRefreshTtl();

      const response = await this.auth.refreshToken(token);
      res
        .status(200)
        .cookie("refresh_token", response?.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: refreshttl,
        })
        .json({
          status: "ok",
          message: "Operation Successfull!",
          token: response?.accessToken,
        });
    });
  }

  changePassword(app) {
    app.post("/auth/change_password", authMiddleWare, async (req, res) => {
      const record = req.body;
      const { sub } = req.user;

      const response = await this.auth.changePassword({
        ...record,
        sub,
      });

      await utils.activityLogs(
        sub,
        "Security",
        "User password changed successfull",
        req.path,
        req.headers["user-agent"],
      );
      // res.cookie("refresh_token", response?.refreshToken, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      //   sameSite: "strict", // Strict CSRF protection
      //   maxAge: this.refreshttl, // 7 days
      // });

      const refreshttl = await this.getRefreshTtl();

      res
        .status(200)
        .cookie("refresh_token", response?.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // Use secure cookies in production
          sameSite: "strict", // Strict CSRF protection
          maxAge: refreshttl, // 7 days
        })
        .json({
          status: "ok",
          message: "Operation Successfull!",
          token: response?.accessToken,
        });
    });
  }

  forgetPassword(app) {
    app.post("/auth/forget_password", async (req, res) => {
      const record = req.body;
      //   {sub}

      const response = await this.auth.forgetPassword(record, req);
      if (response) {
        log.security("Forget Password change init", {
          requestId: req.requestId,
          ip: req?.ip,
          userAgent: req?.get("user-agent"),
        });
      }

      res.status(201).json({
        status: "ok",
        message: "Operation Successfull!",
        details: "Please check email for reset link",
      });
    });
  }

  verifyResetToken(app) {
    app.get("/auth/verify_reset_token", async (req, res) => {
      const token = req.query.token;

      const result = await this.auth.verifyPasswordResetToken(token);

      if (result) {
        log.security("Reset Password token verified", {
          requestId: req.requestId,
          ip: req?.ip,
          userAgent: req?.get("user-agent"),
        });
      }

      res.status(201).json({
        status: "ok",
        message: "Operation Successfull!",
        details: "Token verified , Proceed to the reset password",
      });
    });
  }

  resetPassword(app) {
    app.post("/auth/reset_password", async (req, res) => {
      const { token } = req.query;
      const { password } = req.body;

      const response = await this.auth.resetPassword(token, password);

      if (response) {
        log.security("Password Reset successfully", {
          requestId: req.requestId,
          ip: req?.ip,
          userAgent: req?.get("user-agent"),
        });
      }

      res.status(201).json({
        status: "ok",
        message: "Operation Successfull!",
        details: "Password reset successfully , You can now login",
      });
    });
  }

  googleOAuth(app) {
    app.post("/auth/google_oauth", async (req, res) => {
      const record = req.body;

      const response = await this.auth.googleOAuth(record, req);

      // res.cookie("refresh_token", response?.refreshToken, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      //   sameSite: "strict", // Strict CSRF protection
      //   maxAge: this.refreshttl, // 7 days
      // });

      const refreshttl = await this.getRefreshTtl();

      if (response?.requiresOtp) {
        return res.status(200).json({
          status: "ok",
          message: "OTP verification required",
          requiresOtp: true,
          challengeToken: response.challengeToken,
          email: response.email,
          expiresIn: response.expiresIn,
        });
      }

      res
        .status(200)
        .cookie("refresh_token", response?.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // Use secure cookies in production
          sameSite: "strict", // Strict CSRF protection
          maxAge: refreshttl, // 7 days
        })
        .json({
          status: "ok",
          message: "Operation Successfull!",
          token: response?.accessToken,
        });
    });
  }
}

module.exports = AuthRoute;
