-- A described table's form can run as a stepper (metadata upgrade phase 4).
-- NULL keeps the ordinary form. Otherwise each section is one step:
-- { "variant": "horizontal" | "vertical" | "compact",
--   "showSummary": true, "showReview": false, "nextLabel": "Continue" }
-- Sections may carry "icon" (an Ant Design icon name) and "description".
-- form_layout still chooses the container (modal, drawer or page).

ALTER TABLE `metadata_tables`
  ADD COLUMN `stepper` JSON NULL AFTER `sections`;
