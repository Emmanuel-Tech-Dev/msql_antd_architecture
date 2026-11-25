-- Metadata model v2, second step.
--
-- 1. Optional input settings live in `config`: placeholder, helpText,
--    default, rules, visibleWhen and requiredWhen. Columns keep what every
--    field has (name, type, label, order, visibility, policy) and the layout
--    the form designer moves in bulk (rank, section_key, col_span).
-- 2. form_visible and list_visible replace backend_visible and
--    frontend_visible (same values, clearer names); the old columns go.

START TRANSACTION;

-- Lossless: any value already set moves into config before its column goes.
-- JSON_MERGE_PATCH leaves out keys whose value is NULL.
UPDATE `tables_metadata`
SET `config` = JSON_MERGE_PATCH(
      COALESCE(`config`, JSON_OBJECT()),
      JSON_OBJECT(
        'placeholder', `placeholder`,
        'helpText', `help_text`,
        'default', `default_value`,
        'rules', `rules`,
        'visibleWhen', `visible_when`,
        'requiredWhen', `required_when`
      )
    ),
    `version` = `version` + 1
WHERE `placeholder` IS NOT NULL
   OR `help_text` IS NOT NULL
   OR `default_value` IS NOT NULL
   OR `rules` IS NOT NULL
   OR `visible_when` IS NOT NULL
   OR `required_when` IS NOT NULL;

-- The metadata editor describes its own columns under the new names.
UPDATE `tables_metadata`
SET `column_name` = 'form_visible', `col_real_name` = 'Show in form'
WHERE `table_name` = 'tables_metadata' AND `column_name` = 'backend_visible';

UPDATE `tables_metadata`
SET `column_name` = 'list_visible', `col_real_name` = 'Show in list'
WHERE `table_name` = 'tables_metadata' AND `column_name` = 'frontend_visible';

-- Startup loads the final column set.
UPDATE `framework_bootstrap_datasets`
SET `columns_json` = JSON_ARRAY(
      'id', 'table_name', 'column_name', 'col_real_name', 'type', 'options',
      'extra_options', 'form_visible', 'list_visible', 'editable', 'validator', 'required',
      'section_key', 'col_span', 'config', 'version', 'icon', 'rank', 'createdAt',
      'updatedAt', 'group_name', 'disabled'
    ),
    `config_version` = `config_version` + 1
WHERE `dataset_key` = 'tables_metadata';

COMMIT;

ALTER TABLE `tables_metadata`
  DROP COLUMN `placeholder`,
  DROP COLUMN `help_text`,
  DROP COLUMN `default_value`,
  DROP COLUMN `rules`,
  DROP COLUMN `visible_when`,
  DROP COLUMN `required_when`,
  DROP COLUMN `form_visible`,
  DROP COLUMN `list_visible`;

ALTER TABLE `tables_metadata`
  RENAME COLUMN `backend_visible` TO `form_visible`,
  RENAME COLUMN `frontend_visible` TO `list_visible`;
