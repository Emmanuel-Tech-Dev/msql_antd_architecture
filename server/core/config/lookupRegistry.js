const LOOKUP_REGISTRY = Object.freeze({
  admin: ["id", "custom_id", "name", "email", "avatar", "status"],
  admin_roles: ["id", "role_name", "description", "is_system_role"],
  admin_permissions: ["id", "permission_name", "description", "alias"],
  admin_resources: [
    "id",
    "resource",
    "resource_type",
    "resource_path",
    "http_method",
    "icon",
    "is_public",
    "display_order",
    "category",
    "show_in_nav",
  ],
  admin_role_permissions: ["id", "role_id", "permission"],
  admin_permission_resources: ["id", "permission", "resource", "resource_type"],
  admin_user_roles: ["id", "user_id", "role_id"],
  system_resources: ["id", "resource_type"],
  tables_metadata: ["id", "table_name", "column_name", "col_real_name", "type"],
});

const SENSITIVE_GENERIC_TABLES = new Set([
  "admin_credentials",
  "admin_settings",
  "framework_bootstrap_datasets",
  "framework_bootstrap_profile_datasets",
  "framework_bootstrap_profiles",
  "system_settings",
  "tables",
  "token_blacklist",
  "ui_settings",
  "user_activity_logs",
]);

function getLookupColumns(table) {
  return LOOKUP_REGISTRY[table] ?? null;
}

module.exports = {
  LOOKUP_REGISTRY,
  SENSITIVE_GENERIC_TABLES,
  getLookupColumns,
};
