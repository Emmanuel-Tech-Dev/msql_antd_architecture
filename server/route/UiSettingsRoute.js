const { z } = require("zod");
const conn = require("../core/config/conn");
const authorizationEvents = require("../core/lib/authorizationEvents");
const AppError = require("../shared/helpers/AppError");
const logger = require("../shared/helpers/logger");

const color = z
  .string()
  .trim()
  .regex(/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i);
const adminPath = z.string().startsWith("/admin/").max(255);

const siderSchema = z
  .object({
    variant: z.enum([
      "default",
      "sider",
      "none",
      "icon-rail",
      "floating",
      "top",
      "premium",
    ]),
    width: z.number().min(180).max(360),
    collapsedWidth: z.number().min(48).max(120),
    breakpoint: z.enum(["xs", "sm", "md", "lg", "xl", "xxl"]),
    theme: z.enum(["light", "dark"]),
    collapsible: z.boolean(),
    defaultCollapsed: z.boolean(),
    headerHeight: z.number().min(48).max(96),
    isGrouped: z.boolean(),
    groupKey: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
    groupVariant: z.enum(["dropdown", "group"]),
    orderKey: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
    bottomKey: z.union([adminPath, z.array(adminPath).max(10)]),
    defaultHeader: z.boolean(),
    defaultFooter: z.boolean(),
    brand: z
      .object({
        name: z.string().trim().min(1).max(80),
        caption: z.string().trim().min(1).max(80),
        mark: z.string().trim().min(1).max(2),
      })
      .strict(),
    application: z
      .object({
        colorMode: z.enum(["light", "dark", "system"]),
        density: z.enum(["compact", "comfortable", "spacious"]),
        borderRadius: z.number().min(0).max(20),
        controlHeight: z.number().min(28).max(52),
        fontSize: z.number().min(12).max(18),
        motionEnabled: z.boolean(),
      })
      .strict(),
    content: z
      .object({
        maxWidth: z.number().min(960).max(2400),
        padding: z.number().min(8).max(48),
      })
      .strict(),
    header: z
      .object({
        sticky: z.boolean(),
        showSystemStatus: z.boolean(),
        showRole: z.boolean(),
      })
      .strict(),
    colors: z
      .object({
        siderBg: color,
        headerBg: color,
        contentBg: color,
        accent: color,
        accentText: color,
        textPrimary: color,
        textMuted: color,
        border: color,
        itemHover: color,
        itemActive: color,
        surfaceBg: color,
        elevatedBg: color,
        bodyText: color,
        secondaryText: color,
        strongBorder: color,
        success: color,
        warning: color,
        error: color,
      })
      .strict(),
  })
  .strict();

const updateSchema = z
  .object({
    settingValue: siderSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

class UiSettingsRoute {
  constructor(app) {
    app.put("/api/v1/ui-settings/:id", async (req, res, next) => {
      try {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) {
          throw new AppError("ERR_INVALID_INPUT", "Invalid UI setting ID");
        }

        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
          throw new AppError("ERR_VALIDATION_FAILED", "Invalid appearance configuration", {
            fields: parsed.error.issues.map((issue) => issue.path.join(".")),
          });
        }

        const { settingValue, expectedVersion } = parsed.data;
        const [result] = await conn.execute(
          `UPDATE ui_settings
           SET setting_value = ?, version = version + 1, updated_by = ?
           WHERE id = ? AND setting_key = 'layout.sider' AND version = ? AND is_active = 1`,
          [JSON.stringify(settingValue), req.user.sub, id, expectedVersion],
        );

        if (result.affectedRows !== 1) {
          throw new AppError(
            "ERR_CONFLICT",
            "The appearance configuration changed elsewhere. Reload and try again.",
          );
        }

        logger.security("Application appearance configuration updated", {
          requestId: req.requestId,
          userId: req.user.sub,
          settingId: id,
          previousVersion: expectedVersion,
          version: expectedVersion + 1,
        });
        authorizationEvents.broadcast("ui-settings-changed", "appearance-updated");

        return res.status(200).json({
          status: "ok",
          message: "Appearance settings updated",
          data: {
            id,
            setting_key: "layout.sider",
            setting_value: settingValue,
            version: expectedVersion + 1,
          },
        });
      } catch (error) {
        return next(error);
      }
    });
  }
}

module.exports = UiSettingsRoute;
