-- Forms and lists now fetch a table's metadata on demand
-- (GET /api/v1/metadata/:table), so start-up no longer loads every field of
-- every table. The dataset stays registered; set enabled = 1 to bring it back.

START TRANSACTION;

UPDATE `framework_bootstrap_profile_datasets` AS link
JOIN `framework_bootstrap_datasets` AS dataset ON dataset.`id` = link.`dataset_id`
JOIN `framework_bootstrap_profiles` AS profile ON profile.`id` = link.`profile_id`
SET link.`enabled` = 0
WHERE dataset.`dataset_key` = 'tables_metadata'
  AND profile.`profile_key` = 'authenticated_startup';

COMMIT;
