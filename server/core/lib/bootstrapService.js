const AppError = require("../../shared/helpers/AppError");
const logger = require("../../shared/helpers/logger");
const utils = require("../../shared/utils/functions");
const Model = require("../model/model");
const { SENSITIVE_COLUMNS } = require("../config/sensitiveData");

// What the UI loads after sign-in is decided here, from the
// framework_bootstrap_* registry (migration 001). The browser only names a
// profile; it never names a table, a column or a filter.

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENVIRONMENTS = { development: "dev", staging: "staging", production: "prod" };
// Never loaded at startup, even if a dataset is registered for them.
const BLOCKED_SOURCES = new Set(["admin_credentials", "token_blacklist", "user_activity_logs"]);

const currentEnvironment = () => ENVIRONMENTS[process.env.NODE_ENV] ?? "dev";

async function loadProfileDatasets(profileKey) {
  const environments = ["all", currentEnvironment()];
  const [profile] = await new Model()
    .select(["id"], "framework_bootstrap_profiles")
    .where("profile_key", "=", profileKey)
    .where("enabled", "=", 1)
    .whereIn("environment", environments)
    .execute();
  if (!profile) {
    throw new AppError("ERR_NOT_FOUND", "Bootstrap profile not found");
  }

  return new Model()
    .multiSelect([
      {
        table: "framework_bootstrap_datasets",
        columns: ["dataset_key", "source_name", "columns_json", "base_filters_json",
          "default_sort_json", "max_rows", "required_permission"],
      },
      { table: "framework_bootstrap_profile_datasets", columns: ["failure_mode"] },
    ])
    .join("INNER", "framework_bootstrap_profile_datasets",
      "framework_bootstrap_profile_datasets.dataset_id", "framework_bootstrap_datasets.id")
    .where("framework_bootstrap_profile_datasets.profile_id", "=", profile.id)
    .where("framework_bootstrap_profile_datasets.enabled", "=", 1)
    .where("framework_bootstrap_datasets.enabled", "=", 1)
    .whereIn("framework_bootstrap_datasets.environment", environments)
    .orderBy("framework_bootstrap_profile_datasets.load_order", "ASC")
    .execute();
}

async function loadDataset(dataset, { permissions, privileged }) {
  const source = dataset.source_name;
  if (dataset.required_permission && !privileged && !permissions.includes(dataset.required_permission)) {
    throw new AppError("ERR_ACCESS_DENIED", null, {
      message: `Missing bootstrap permission: ${dataset.required_permission}`,
      resource: dataset.dataset_key,
    });
  }
  if (BLOCKED_SOURCES.has(source)) {
    throw new AppError("ERR_ACCESS_DENIED", "This source is not available through bootstrap");
  }

  const model = new Model();
  if (!(await model.tableExists(source))) {
    throw new AppError("ERR_NOT_FOUND", `Bootstrap source ${source} was not found`);
  }
  const physicalColumns = await model.getTableColumns(source);
  const checkColumn = (column) => {
    if (!IDENTIFIER.test(column ?? "") || !physicalColumns.includes(column)
      || SENSITIVE_COLUMNS.has(column.toLowerCase())) {
      throw new AppError("ERR_INVALID_INPUT",
        `Bootstrap dataset ${dataset.dataset_key} uses unavailable column ${column}`);
    }
    return column;
  };

  const query = model.select(dataset.columns_json.map(checkColumn), source);
  for (const filter of dataset.base_filters_json ?? []) {
    query.where(checkColumn(filter.column), "=", filter.value);
  }
  for (const sort of dataset.default_sort_json ?? []) {
    query.orderBy(checkColumn(sort.column), sort.direction);
  }
  const rows = await query.limit(dataset.max_rows).execute();
  return utils.redactSensitiveData(rows);
}

// A REQUIRED dataset that fails fails the whole request; an OPTIONAL one is
// left out and named in `unavailable`.
async function loadBootstrapProfile(profileKey, { permissions = [], privileged = false } = {}) {
  if (!IDENTIFIER.test(profileKey ?? "")) {
    throw new AppError("ERR_INVALID_INPUT", "Bootstrap requires a profile key");
  }

  const stores = {};
  const unavailable = [];
  for (const dataset of await loadProfileDatasets(profileKey)) {
    try {
      stores[dataset.dataset_key] = await loadDataset(dataset, { permissions, privileged });
    } catch (error) {
      if (dataset.failure_mode !== "OPTIONAL") throw error;
      logger.error(error, { component: "bootstrap", dataset: dataset.dataset_key });
      unavailable.push(dataset.dataset_key);
    }
  }
  return { stores, unavailable };
}

module.exports = { loadBootstrapProfile, currentEnvironment };
