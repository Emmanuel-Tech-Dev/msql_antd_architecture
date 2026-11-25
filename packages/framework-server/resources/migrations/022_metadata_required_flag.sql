-- `required` becomes the field's own flag (metadata upgrade phase 3); the
-- server enforces it on generic writes. It replaces the validator naming
-- convention ('validateEmptyString' meant required), and `validator` goes.

ALTER TABLE `tables_metadata`
  DROP COLUMN `required`;

ALTER TABLE `tables_metadata`
  ADD COLUMN `required` TINYINT(1) NOT NULL DEFAULT 0 AFTER `validator`;

START TRANSACTION;

UPDATE `tables_metadata`
SET `required` = 1
WHERE `validator` = 'validateEmptyString';

-- The metadata editor describes `required` (a yes/no choice) instead of the
-- validator name.
UPDATE `tables_metadata`
SET `column_name` = 'required',
    `col_real_name` = 'Required',
    `type` = 'select',
    `config` = JSON_OBJECT('options', JSON_ARRAY(
      JSON_OBJECT('value', '0', 'label', 'No'),
      JSON_OBJECT('value', '1', 'label', 'Yes')
    )),
    `version` = `version` + 1
WHERE `table_name` = 'tables_metadata' AND `column_name` = 'validator';

UPDATE `framework_bootstrap_datasets`
SET `columns_json` = JSON_ARRAY(
      'id', 'table_name', 'column_name', 'col_real_name', 'type', 'options',
      'extra_options', 'form_visible', 'list_visible', 'editable', 'required',
      'section_key', 'col_span', 'config', 'version', 'icon', 'rank', 'createdAt',
      'updatedAt', 'group_name', 'disabled'
    ),
    `config_version` = `config_version` + 1
WHERE `dataset_key` = 'tables_metadata';

COMMIT;

ALTER TABLE `tables_metadata`
  DROP COLUMN `validator`;
