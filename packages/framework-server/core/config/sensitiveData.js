// What the framework never serves through generic endpoints, whatever the
// caller's permissions: whole tables, and columns of any table (compared in
// lower case). The one list every layer uses.

const SENSITIVE_TABLES = new Set([
  "admin_credentials",
  "admin_settings",
  "framework_bootstrap_datasets",
  "framework_bootstrap_profile_datasets",
  "framework_bootstrap_profiles",
  "metadata_uploads",
  "system_settings",
  "tables",
  "token_blacklist",
  "ui_settings",
  "user_activity_logs",
]);

const SENSITIVE_COLUMNS = new Set([
  "password",
  "password_hash",
  "passwd",
  "salt",
  "token",
  "access_token",
  "refresh_token",
  "reset_token",
  "reset_token_expiry",
  "otp",
  "otp_secret",
  "two_factor_secret",
  "totp_secret",
  "secret",
  "client_secret",
  "api_key",
  "private_key",
  "encryption_key",
]);

const isSensitiveColumn = (column) => SENSITIVE_COLUMNS.has(String(column).toLowerCase());

module.exports = { SENSITIVE_COLUMNS, SENSITIVE_TABLES, isSensitiveColumn };
