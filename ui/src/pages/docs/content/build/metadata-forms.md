---
id: metadata-forms
title: Metadata-driven forms
track: build
group: Data and screens
order: 1
eyebrow: MetadataForm + MetadataTable
audience: Developers and admins
readTime: 20 min
summary: Describe a table once: the same description builds its list and form, and the server enforces it on every write.
---

A described table has one row in metadata_tables (labels, title column, sort, search, form layout, sections, stepper) and one row per field in tables_metadata (label, type, in form, in list, required, editable, read-only, section, width, and a config JSON). Lookups live in metadata_lookups and every saved definition in metadata_versions. The UI and the server read the same rows.

## From description to screen

:::flow
- A page renders <MetadataTable table="taxes" />
- useTableMetadata fetches GET /api/v1/metadata/taxes (cached 60 s per table)
- The server leaves out fields the user may not read and marks fields they may not change read-only
- MetadataTable builds columns, search and actions from the list fields and the user's permissions
- Add or Edit opens MetadataForm in a modal, drawer or page, optionally as steps
- Each field renders through the field type registry
- Save sends the record; the server checks it against the same metadata before writing
:::

## tables_metadata columns

| Column | Meaning |
| --- | --- |
| column_name / col_real_name | Physical column and its label |
| type | Field type from the registry (see below) |
| form_visible / list_visible | Shown in the form / shown as a list column. Hidden from the form also means users can't set it. |
| required / editable / disabled | Required; editable after create; read-only (never written) |
| section_key / col_span / rank | Section, width out of 24, order |
| config (JSON) | options, lookup, placeholder, helpText, default, rules, visibleWhen, requiredWhen, min, max, display, currency, accept, maxSizeMb, readPermission, writePermission |

## Field types

| Group | Types |
| --- | --- |
| Text | text, textarea, richText, email, phone, url, password |
| Numbers | integer, number, money, percent, duration |
| Dates | date, dateTime, time |
| Choices | switch, select, multiSelect, radio, checkboxGroup (select/multiSelect can show as chips or cards) |
| From another table | lookup, multiLookup (config.lookup names a metadata_lookups key) |
| Files | image, file (uploaded to /api/v1/uploads/:table/:column, checked against accept and maxSizeMb) |
| System | primaryKey, generatedId, color |

```json A field's config
{
  "placeholder": "e.g. 15",
  "helpText": "Applied to the net amount",
  "min": 0,
  "max": 100,
  "rules": [{ "rule": "pattern", "value": "^[0-9.]+$", "message": "Numbers only" }],
  "visibleWhen": { "field": "kind", "in": ["LEVY"] },
  "requiredWhen": { "field": "kind", "in": ["LEVY"] },
  "readPermission": "view:tax_rates"
}
```

```jsx A whole page
import MetadataTable from '../components/metadata/MetadataTable';

export default function Taxes() {
  return (
    <PageHeader title="Taxes">
      <MetadataTable
        table="taxes"
        columns={{ rate: { render: (value) => `${value}%` } }}
      />
    </PageHeader>
  );
}
```

```jsx A form on its own
<MetadataForm
  table="taxes"
  record={editing}            // omit to create
  fields={['name', 'rate']}  // optional subset
  onSaved={() => close()}
/>

// useRecordForm is a thin wrapper for pages that open the form imperatively:
const form = useRecordForm();
form.openCreate('taxes', { kind: 'VAT' });
{form.recordModal({ createTitle: 'Add tax', onOk: () => form.save() })}
```

## Extending it

| Need | How |
| --- | --- |
| A new field type | registerFieldType('rating', { render, ... }) in core/metadata/fieldTypes.jsx |
| A new form layout | registerFormLayout('wizard', Component) in core/metadata/formLayouts.js; steps is built in |
| A custom column or cell | MetadataTable columns={{ column: { title, render } }} |
| Extra content in a form | MetadataForm slots |
| Workflow rules | A hand-written route; metadataSchema(table) can be reused and extended with zod |

:::warning Lookups are keys
A lookup field names a metadata_lookups key. The server decides the source table, value and label columns, filter, sort, row limit and required permission. The browser never sends SQL or column names.
:::

:::note Tables that aren't described
They still work through the generic API with permission checks, but get no field rules. Describe a table in Settings › Data model before building screens on it.
:::
