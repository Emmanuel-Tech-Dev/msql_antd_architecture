---
id: metadata-forms
title: Metadata-driven forms
track: build
group: Data and screens
order: 1
eyebrow: MetadataForm + MetadataTable
audience: Developers and admins
readTime: 25 min
summary: Describe a table once: the same description builds its list and form, and the server enforces it on every write. Every table setting, field setting, condition, lookup option and repeating field.
---

A described table has one row in metadata_tables (its labels, list and form settings), one row per field in tables_metadata (label, type, visibility, rules and a config JSON), and the lookups its fields use in metadata_lookups. Every saved definition is kept in metadata_versions. The UI and the server read the same rows, so a form shows the same error the server would return before anything is sent.

## From description to screen

:::flow
- A page renders <MetadataTable table="taxes" />
- useTableMetadata fetches GET /api/v1/metadata/taxes (cached 60 s per table)
- The server leaves out fields the user may not read and marks fields they may not change read-only
- MetadataTable builds columns, search and actions from the list fields and the user's permissions
- Add or Edit opens MetadataForm in a modal or a drawer, as one form or as steps
- Each field renders through the field type registry
- Save sends the record; the server checks it against the same metadata before writing
:::

## Table settings (metadata_tables)

| Column | What it does |
| --- | --- |
| label / singular_label | Name in menus, and Name of one record (used in buttons and titles: "Add tax", "Edit tax", "Tax added"). |
| description / icon | Shown in the data model builder; icon is an Ant Design icon name. |
| title_column | Record title field: the field that names a record when it is shown elsewhere (a reference number or a name), and heads the stepper summary. |
| default_sort | [{ "column": "createdAt", "direction": "desc" }]: the list's starting order. |
| search_columns | ["name", "code"]: the columns the list's search box looks in. |
| form_layout | modal (default) or drawer: where Add and Edit open. page is accepted but MetadataTable still opens a modal; for a full page, render MetadataForm on your own route. |
| form_columns | 1 or 2. Two columns widen the modal to 760 px (drawer 720 px) and put fields side by side. |
| sections | [{ "key", "title", "description", "icon" }] in order: the form's groups, and the steps of a stepper. A collapsed flag can be stored but the form does not use it yet. |
| stepper | null for an ordinary form, or the stepper settings: see Multi-step forms. |
| enabled / version | A disabled table falls back to the generic API without rules; version counts saves. |
| is_system | 1 for the framework's own tables: never offered by Grant table access (Permissions page). Set in the builder's table inspector (System table). |

## Field columns (tables_metadata)

| Column | Meaning |
| --- | --- |
| column_name / col_real_name | Physical column and its label |
| type | Field type from the registry (see below) |
| form_visible / list_visible | Shown in the form / shown as a list column. Hidden from the form also means users can't set it. |
| required / editable / disabled | Required; editable after create (otherwise only set when creating); read-only (never written) |
| section_key | The section (and step) the field belongs to. A key that matches no section puts the field in an untitled first section. |
| col_span / rank | Width out of 24 and order. In a two-column form a full-width field (24) takes half the row; long text and rich text always take the whole row; on phones every field takes the whole row. |
| config (JSON) | Everything else: the keys are below. |

## Field config keys

| Key | For | What it does |
| --- | --- | --- |
| placeholder | any input | Hint inside the input. Default: "Enter Label" or "Select Label". |
| helpText | any | A line of help under the field. |
| default | any | Value for a new record, unless the page passes initialValues. Generated IDs make their own. |
| options | select, multiSelect, radio, checkboxGroup | [{ "value", "label", "description" }]. description shows on cards. |
| display | select, multiSelect | chips or cards instead of a dropdown. |
| lookup | lookup, multiLookup | The metadata_lookups key the choices come from. |
| min / max | number types | Allowed range, checked in the browser and on the server. |
| step / precision | number types | Arrow-key step and decimal places (money defaults to 2 and min 0). |
| currency | money | Prefix such as GHS, in the input and the list. |
| rows | textarea | Starting height in lines (grows up to 10). |
| accept / maxSizeMb | image, file | Allowed types and size limit; the server checks the file's real signature too. |
| rules | text and numbers | [{ "rule", "value", "message" }] where rule is pattern, minLength, maxLength, min or max. |
| visibleWhen / requiredWhen | any | Conditions: see below. |
| readPermission / writePermission | any | Permission needed to see the field / to change it (writePermission defaults to readPermission). |
| fields | list, groupList | The fields of each row (or each group): ordinary field definitions, see Repeating fields. |
| children | groupList | The inner list of each group: { key, label, rowLabel, addLabel, minRows, maxRows, fields }. |
| display | list, groupList | table (default) or cards for the rows; phones always show cards. |
| rowLabel / addLabel | list, groupList | "Contact" and "Add contact": names a row in messages, headings and the add button. |
| minRows / maxRows | list, groupList | How many rows (or groups) are allowed; checked in the browser and on the server. |

```json A field's config
{
  "placeholder": "e.g. 15",
  "helpText": "Applied to the net amount",
  "min": 0,
  "max": 100,
  "precision": 2,
  "rules": [{ "rule": "pattern", "value": "^[0-9.]+$", "message": "Numbers only" }],
  "visibleWhen": { "field": "kind", "in": ["LEVY"] },
  "requiredWhen": { "field": "kind", "in": ["LEVY"] },
  "readPermission": "view:tax_rates"
}
```

## Conditional fields

| Condition | True when |
| --- | --- |
| { "field": "kind", "equals": "LEVY" } | kind is LEVY |
| { "field": "kind", "in": ["LEVY", "VAT"] } | kind is one of the values |
| { "field": "phone", "notEmpty": true } | phone has a value |
| { "all": [ … ] } / { "any": [ … ] } | every / at least one of the conditions inside (they nest) |
| no condition | always |

:::note How the two conditions work together
visibleWhen hides the field while it is false, and a hidden field is never required, whatever required or requiredWhen say. requiredWhen makes a visible field required only while it is true. The browser and the server evaluate the same conditions with the same messages, so a value the form accepts is a value the server accepts.
:::

## Field types

| Group | Types |
| --- | --- |
| Text | text, textarea, richText, email, phone, url, password |
| Numbers | integer, number, money, percent, duration |
| Dates | date, dateTime, time |
| Choices | switch, select, multiSelect, radio, checkboxGroup (select/multiSelect can show as chips or cards) |
| From another table | lookup, multiLookup (config.lookup names a metadata_lookups key) |
| Files | image, file (uploaded to /api/v1/uploads/:table/:column, checked against accept and maxSizeMb) |
| Pickers | icon (a searchable list of the icons the app can draw, each shown beside its name) |
| Repeating | list (rows of fields), groupList (groups, each with its own fields and an inner list), stored as JSON in one column |
| System | primaryKey, generatedId, color (a plain text input for now) |

## How file and image fields store files

1. **Choose a file** — UploadField sends it at once to POST /api/v1/uploads/:table/:column. The server checks the user may create or update the table and write the field, the size (maxSizeMb, 10 MB by default) and the file's real type from its content, stores it in Cloudinary under metadata/<table>, and records it in metadata_uploads as PENDING.
2. **Save the record** — The field's value is the file's URL. After the save the upload is ATTACHED to the record.
3. **Replace or clear the file, or delete the record** — After the save or delete succeeds, the file it no longer uses is REMOVED and deleted from storage, unless another record still points at the same URL.
4. **Upload but never save** — The upload stays PENDING. An hourly clean-up deletes pending uploads older than 24 hours, and retries deletions that failed (up to 5 times).

:::note Files saved outside the generic API
Cleanup follows saves made through /api/:resources. A hand-written route that stores an uploaded URL keeps the file safe anyway: before deleting anything the clean-up checks that no record in that column still uses the URL, and marks it attached if one does.
:::

## Repeating fields (list and groupList)

| Part | How it works |
| --- | --- |
| What is stored | One column holds a JSON array. list: [{ "name": "Ama", "channel": "email" }]. groupList: [{ "name": "Stationery", "items": [{ "item": "A4 paper", "price": 58 }] }]. New tables get a JSON column. |
| Row fields | config.fields are ordinary field definitions: { column_name, col_real_name, type, required, col_span, config }. Text, numbers, money, dates, switch, choices, lookups, rules, help text, width and defaults all work inside a row. |
| Conditions in a row | visibleWhen and requiredWhen read the row's own values, so a phone can be required only on rows whose channel is phone. |
| In the form | A table of rows with one input per field, or a card per row (config.display). Phones always show cards. Add stops at maxRows. Any row can be removed; minRows is checked when saving ("Contacts needs at least 1 contact"). |
| Checks | Each input is checked with its own rules as you go. On save the server checks every row and reports the row: "Contacts, row 2: Phone is required"; "Price list, group 1, Items row 1: Item is required". Keys that are not row fields are dropped. |
| In the list and stepper | The column shows a count ("2 contacts", "2 categories · 3 items"); hover or focus shows the first rows. The stepper summary and review show the same. |
| In the builder | Pick List or Grouped list as the field type, then add row fields in the inspector. Each row field opens in the same inspector as a table field; a grouped list has a tab for group fields and one for the inner list. |

```json A list field's config
{
  "rowLabel": "Contact",
  "addLabel": "Add contact",
  "minRows": 1,
  "maxRows": 5,
  "fields": [
    { "column_name": "name", "col_real_name": "Name", "type": "text", "required": 1 },
    { "column_name": "channel", "col_real_name": "Channel", "type": "select",
      "config": { "options": [{ "value": "email", "label": "Email" }, { "value": "phone", "label": "Phone" }] } },
    { "column_name": "phone", "col_real_name": "Phone", "type": "phone",
      "config": { "requiredWhen": { "field": "channel", "in": ["phone"] } } }
  ]
}
```

:::note Old dynamic forms keep working
A field still typed dynaFormSimple or dynaFormNested, with its rows in the old tables_metadata.options format, is read as list or groupList when the table loads: text, number and textArea fields, and json/csv selects, radios and checkboxes become their metadata types; SQL-backed choices become text. Nested data keeps its inner key list. No data migration is needed; save the field once in the builder to store it in the new format.
:::

:::warning Not in rows yet
File and image uploads, a lookup that depends on another field in the same row, a list inside a row, and dragging rows to reorder them. Rows live inside one column: data you need to search, total or join across records (invoice lines for reports, for example) belongs in its own table with a lookup back.
:::

## Lookups (metadata_lookups)

| Column | What it does |
| --- | --- |
| lookup_key | The name fields use in config.lookup. |
| source_table / value_column / label_column | Where the choices come from: the stored value and the text shown. Never a sensitive table. |
| extra_columns | More columns sent with each choice, for a page to use. |
| base_filters | Fixed conditions: [{ "column": "active", "value": 1 }]. |
| depends_on / filter_column | A dependent lookup: the form field whose value filters this lookup, and the column it filters on. |
| sort / max_rows | Order of the choices, and the most returned (500 by default). |
| cache_ttl_seconds | How long the server may reuse the choices. |
| required_permission | Permission needed to read the choices. |
| environment / enabled | Where the lookup applies, and whether it is on. |

## Dependent lookups

1. **Describe the link** — On the child lookup set depends_on to the parent field (region) and filter_column to the column that holds it (towns.region_id).
2. **Before a parent is chosen** — The child dropdown says "Choose the field above first", and the server returns no choices without a parent value.
3. **When the parent changes** — The child clears a choice that no longer belongs to the new parent.
4. **On save** — The server checks the submitted value against the choices for the parent value being saved, so a town from another region is refused.

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
// A table with a stepper brings its own Back / Continue / Save buttons.
```

## Saving to your own route

| Step | What happens |
| --- | --- |
| Checks | The form checks every field (and every step) exactly as before. Nothing is sent while a field is wrong. |
| onSubmit(values, { mode, record }) | Called instead of POST / PUT /api/:resources. values holds only the fields this user may write, already converted (dates as text, lists as arrays). record is the record being edited, or undefined when adding. |
| Success | onSaved(saved, { mode, values }) runs: saved is whatever onSubmit returned (optional, usually the new record with its id), values is what was sent. The "added" or "updated" message shows and every list of the table refetches. |
| Refusal | Throw (or let apiClient throw) an error with details.errors = { column: message }. Each message appears under its field, a stepper opens that field's step, and onSaveError receives the error. ERR_VALIDATION_FAILED from the server already has this shape. |
| Where it works | MetadataForm onSubmit, MetadataTable formProps={{ onSubmit }}, and useRecordForm's recordModal({ onSubmit }). |

```jsx In the browser
<MetadataForm
  table="customers"
  record={editing}
  onSubmit={async (values, { mode, record }) => {
    console.log(values);   // see exactly what would be saved
    const response = await apiClient.post('/api/v1/customers/onboard', values);
    // Optional: return what onSaved needs, e.g. the new record with its id.
    // response.data is the body; framework routes wrap it as { status, data }.
    return response.data.data;
  }}
  onSaved={(customer, { values }) => navigate(`/admin/customers/${customer.id}`)}
/>

// Nothing to pass on? Return nothing; onSaved still gets the values sent.
<MetadataForm table="customers" onSubmit={(values) => apiClient.post('/api/v1/customers/onboard', values)} onSaved={() => close()} />
```

```js On the server: the same checks and file clean-up as the generic route
const { validateRecordAgainstMetadata, throwFieldErrors } = require("../core/lib/metadataSchema");
const { syncRecordFiles } = require("../core/lib/uploadTracking");
const Model = require("../core/model/model");

app.post("/api/v1/customers/onboard", async (req, res) => {
  const access = { permissions: req.permissions, privileged: req.isPrivileged };
  const { record, errors } = await validateRecordAgainstMetadata("customers", req.body, { mode: "create", access });
  if (Object.keys(errors).length) throwFieldErrors(errors);   // 400 with details.errors

  const result = await new Model().insert("customers", record).execute();
  await syncRecordFiles("customers", result.insertId, {}, record); // attach uploaded files
  // …your own workflow: welcome email, account, audit entry
  res.status(201).json({ status: "ok", data: { id: result.insertId, ...record } });
});
```

## Extending it

| Need | How |
| --- | --- |
| A new field type | registerFieldType('rating', { input, cell, toForm, fromForm }) in core/metadata/fieldTypes.jsx |
| A different stepper or another layout | registerFormLayout('steps', MyStepper) in core/metadata/formLayouts.js: see Multi-step forms |
| A custom column or cell | MetadataTable columns={{ column: { title, render } }} |
| Extra content in a form | MetadataForm slots: before:column, after:column, before:section:key, after:section:key |
| Workflow rules | A hand-written route with MetadataForm onSubmit; validateRecordAgainstMetadata (or metadataSchema(table), extendable with zod) gives it the same checks |

:::warning Lookups are keys
A lookup field names a metadata_lookups key. The server decides the source table, value and label columns, filter, sort, row limit and required permission. The browser never sends SQL or column names.
:::

:::note Tables that aren't described
They still work through the generic API with permission checks, but get no field rules. Describe a table in Settings › Data model before building screens on it.
:::
