const CacheManager = require("../../shared/helpers/cacheManager");
const logger = require("../../shared/helpers/logger");

const Model = require("../model/model");

class SettingsManager {
  constructor() {
    this.cache = new CacheManager({
      maxItems: 500,
      ttl: 0, // No TTL - settings never expire
      dormancyThreshold: Infinity,
      cleanupInterval: 0,
    });

    this.isPreload = false;
    this.cachePrefix = "setting:";
    this.environment = "dev";
  }

  async get(key, defaultValue = null) {
    try {
      const cacheKey = `${this.cachePrefix}${key}`;
      const cached = this.cache.get(cacheKey);

      if (cached !== undefined) {
        return cached;
      }

      // Not in cache - fetch from database
      const value = await this.fetchFromDB(key);

      if (value !== null) {
        this.cache.set(cacheKey, value, 0);
        return value;
      }

      return defaultValue;
    } catch (error) {
      logger.error(error, {
        component: "SettingsManager",
        operation: "get",
        settingKey: key,
      });
      return defaultValue;
    }
  }

  // A row for this environment, a global one, or one for every environment.
  appliesHere(row) {
    return row.env === this.environment || row.env === null || row.scope === "global";
  }

  // This environment's row wins over a global one, which wins over the rest.
  async fetchFromDB(key) {
    const rows = await new Model()
      .select(["value", "type", "scope", "env"], "system_settings")
      .where("key", "=", key)
      .execute();
    const rank = (row) => (row.env === this.environment ? 0 : row.scope === "global" ? 1 : 2);
    const [setting] = rows.filter((row) => this.appliesHere(row)).sort((a, b) => rank(a) - rank(b));

    if (!setting) return null;

    return this.convertType(setting.value, setting.type);
  }

  convertType(value, dataType) {
    if (value === null || value === undefined) return null;

    switch (dataType) {
      case "number":
        return parseFloat(value);

      case "boolean":
        if (typeof value === "boolean") return value;
        return ["true", "1", "yes"].includes(String(value).toLowerCase());

      case "json":
        try {
          return typeof value === "string" ? JSON.parse(value) : value;
        } catch (err) {
          logger.error(err, {
            component: "SettingsManager",
            operation: "convertJson",
          });
          return null;
        }

      case "string":
      default:
        return String(value);
    }
  }

  async set(key, value, changedBy = "dev") {
    try {
      const newValue = String(value);
      const current = await new Model().transaction(async (tx) => {
        const [setting] = await tx.builder()
          .select(["value", "type"], "system_settings")
          .where("key", "=", key)
          .executeInTransaction();
        if (!setting) {
          throw new Error(`Setting ${key} not found`);
        }

        await tx.builder()
          .update("system_settings", { value: newValue, updated_at: new Date() })
          .where("key", "=", key)
          .executeInTransaction();
        return setting;
      });

      // Update cache immediately
      const cacheKey = `${this.cachePrefix}${key}`;
      const typedValue = this.convertType(newValue, current.type);
      this.cache.set(cacheKey, typedValue, 0);

      logger.security("System setting updated", {
        settingKey: key,
        changedBy,
      });

      return {
        success: true,
        key,
        oldValue: current.value,
        newValue: typedValue,
      };
    } catch {
      throw new Error("connection failed try again");
    }
  }

  async preloadAll() {
    logger.app("Preloading system settings");
    try {
      const rows = (await new Model()
        .select(["key", "value", "type", "env", "scope"], "system_settings")
        .execute()).filter((row) => this.appliesHere(row));

      // return;

      let count = 0;
      for (const row of rows) {
        const cacheKey = `${this.cachePrefix}${row.key}`;
        const value = this.convertType(row.value, row.type);
        this.cache.set(cacheKey, value, 0);
        count++;
        //console.log(row);
      }

      this.isPreloaded = true;
      logger.app("System settings preloaded", {
        count,
        cachePolicy: "until-restart-or-update",
      });

      return count;
    } catch (error) {
      logger.error(error, {
        component: "SettingsManager",
        operation: "preloadAll",
      });
      throw error;
    }
  }

  getAll(key) {
    const settings = this.cache.get("settings:");
  }

  getAnalytics() {
    return {
      cacheSize: this.cache.cache.size,
      isPreloaded: this.isPreloaded,
      analytics: this.cache.getAnalytics(),
    };
  }
}

// async function systemSettings(tableName) {
//   try {
//     const res = await new Model().select(["*"], tableName).execute();
//     if (res?.length == 0) {
//       throw new Error("System setup up failed");
//     }
//     cache.set("settings:all", res, null);
//   } catch (error) {
//     console.log(error);
//     throw new Error("Failed to get system settings configuration");
//   }
// }

// function getSetting(key, defaultValue = null) {
//   const settings = cache.get("settings:all");
//   if (!settings || !(key in settings)) {
//     return defaultValue;
//   }
//   return settings[key];
// }

module.exports = SettingsManager;
