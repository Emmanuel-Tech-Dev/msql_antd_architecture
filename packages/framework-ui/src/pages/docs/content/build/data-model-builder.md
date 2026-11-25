---
id: data-model-builder
title: Data model builder
track: build
group: Data and screens
order: 2
eyebrow: Settings › Data model
audience: Admins and developers
readTime: 12 min
summary: Describe tables, design forms and lists with a live preview, edit lookups, keep versions, import records and write migrations for new tables.
---

The builder is the browser editor for table metadata. It needs the manage:metadata permission (superadmin and dev by default). Every change is a draft until you choose Save as vN; a save takes effect at once for every user and writes an audit entry.

## Screens

| Screen | What you do |
| --- | --- |
| Tables | See every table, described or not. Credential, token, log and framework tables are never listed. |
| Describe | Fields are guessed from the columns (types, options from ENUMs, lookups from foreign keys). Review and save as version 1. |
| Form | Outline of the fields under their sections: the arrows reorder a field within its section, and the folder button moves it to another section (or No section). Live preview on desktop or phone. Table opens the table inspector (Name in menus, Name of one record, Record title field, where the form opens, columns, sections, steps); clicking a field opens its inspector. For a List or Grouped list field the inspector also edits the row fields, each with the same inspector as a table field. |
| List | Which fields are columns, their order, which ones search covers, and the default sort, with the live list below. |
| History | Every version with what changed and who changed it. Restore saves the old version as a new one. Export JSON, field CSV or a SQL migration; import JSON or CSV into the draft. |
| Lookups | Edit or create a lookup and preview its choices before saving. Shows which fields use it. |
| New table | Design columns; the builder writes a migration file (table, metadata, permissions, API resources). Save it in your project's migrations folder (MIGRATIONS_PATH; server/resources/migrations when the project has none) and run npm run migrate. |
| Import records | Choose a table and a CSV, match columns to fields, check the rows against the same rules as the form, then import, optionally skipping rows with problems. |

## What the builder never does

- Change the database schema. New tables and columns go through migration files.
- List or describe credential, token, log or framework tables.
- Save without a version: every save is recorded in metadata_versions with the user who made it.

:::note Carrying a definition to another install
Export the migration from History and add it to the other project's migrations. It upserts the table's metadata and the lookups it uses.
:::
