# Design brief: repeating fields (list, groupList)

Status: **approved and built** (2026-11-25), default row style table, first-version scope as listed. Review mock: https://claude.ai/artifact/JTsn3QADJsnZu78Rc7M58s (private).

## Why

The old useRecordForm handled `dynaFormSimple` / `dynaFormNested` field types through useDynamicForm, with its own field types, option formats and no validation. MetadataForm cannot use that hook without running two form systems in one form. The repeating fields become native metadata field types instead.

## Decisions

- `list` (replaces dynaFormSimple): one column holds a JSON array of rows. `config.fields` are ordinary field definitions (`column_name`, `col_real_name`, `type`, `required`, `col_span`, `config`).
- `groupList` (replaces dynaFormNested): JSON array of groups; `config.fields` for the group, `config.children = { key, label, fields }` for the inner list (key defaults to `list`, the old shape).
- `config.display`: `table` (default) or `cards`; phones always cards. `config.minRows`, `config.maxRows`, `config.addLabel`.
- Row conditions (`visibleWhen`, `requiredWhen`) read the row's own values.
- Server: `metadataSchema` checks every row with the same messages ("Contacts, row 2: Phone is required"), enforces min/max rows, drops unknown row keys, stores JSON.
- List cell: "2 contacts" chip with a popover of the first rows; stepper summary and review use the same.
- Builder: field inspector gains a Row fields editor (and group / inner tabs for groupList); each row field edits with the normal field inspector.
- Old definitions: a dynaFormSimple / dynaFormNested field's legacy `options` JSON is converted to list / groupList config when the table's metadata loads. No data migration.
- New-table migrations store list / groupList as JSON columns.

## Not in the first version

Uploads inside a row, dependent lookups within a row, three levels of nesting, drag to reorder rows. Data that must be searched, totalled or joined across records belongs in its own table.
