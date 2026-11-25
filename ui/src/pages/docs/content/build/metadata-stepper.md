---
id: metadata-stepper
title: Multi-step forms
track: build
group: Data and screens
order: 1.5
eyebrow: MetadataForm · StepsLayout
audience: Developers and admins
readTime: 10 min
summary: Turn any described table's form into steps: one step per section, checked step by step, saved once at the end. Settings, behaviour, and how to replace the stepper.
---

A long form becomes a stepper by setting metadata_tables.stepper. Nothing else changes: the same fields, rules, conditions and lookups apply, MetadataTable and useRecordForm open it the same way, and the server checks the whole record when it is saved. The stepper is the built-in steps layout in components/metadata/StepsLayout.jsx.

## Turning it on

1. **Group the fields into sections** — In Settings › Data model › Form, click Table in the outline and add sections (title, description, icon). Then put each field in a section with the folder button beside it in the outline, or with the field's Section setting. Each section with at least one visible field becomes one step, in the sections' order; fields left in No section form an untitled first step, and the table inspector warns about them.
2. **Switch on the stepper** — In the table inspector turn on Show as steps, pick the style, and choose a summary panel and a review step.
3. **Save as a new version** — Every user gets the stepper at once. Turning it off brings the ordinary form back.

```json metadata_tables.stepper
{
  "variant": "horizontal",
  "showSummary": true,
  "showReview": true,
  "nextLabel": "Continue"
}
```

```json metadata_tables.sections
[
  { "key": "business", "title": "Business", "description": "Who the customer is", "icon": "ShopOutlined" },
  { "key": "contact", "title": "Contact", "description": "How to reach them", "icon": "PhoneOutlined" },
  { "key": "billing", "title": "Billing", "icon": "CreditCardOutlined" }
]
```

## Settings

| Setting | Values | Effect |
| --- | --- | --- |
| variant | horizontal (default), vertical, compact | Steps across the top, down the side, or a slim progress bar. Phones always get compact. |
| showSummary | true / false | A panel beside the step with the record's title (title_column) and up to two filled answers from each finished step (not on phones). |
| showReview | true / false | After the last step, a review of every section, each with an Edit button, before saving. |
| nextLabel | text | Replaces "Continue to Contact" on the forward button. |
| section icon | an Ant Design icon name | Shown in the step marker and the review. Without one the marker shows the step number. |

## How it behaves

| Moment | What happens |
| --- | --- |
| Continue | Only this step's fields are checked (required, types, rules, conditions). The step is marked DONE and the next one opens. |
| Enter in a field | Means continue, never save, until the last step. |
| Going back | Back always works. When adding a record you can jump only to steps already done; when editing you can jump to any step. |
| Last step | The button becomes Review (with showReview) or "Add customer" / "Save changes". Nothing is saved before this. |
| The server refuses the save | The form opens the first step that holds a refused field, marks it FIX and shows the server's message under each refused field. |
| Conditional fields | A field hidden by visibleWhen is not rendered, so its step's check skips it. |
| Container | A stepper opens wider: a 1000 px modal or a 960 px drawer, and brings its own Back / Continue / Save buttons. |

## One save, step by step

:::flow
- Step 1 Business: Continue → validateFields(Business fields)
- Step 2 Contact: Continue → validateFields(Contact fields)
- Step 3 Billing: Review (showReview)
- Review: Edit any section, or Add customer
- POST /api/:resources → metadataSchema checks the whole record
- Refused? → open the step with the first bad field, marked FIX
:::

:::note Replacing the stepper
registerFormLayout('steps', MyStepper) before the form first renders (for example in the app's start-up code) replaces the built-in stepper everywhere; MetadataForm only registers its own when no 'steps' layout exists. A layout receives { metadata, sections, renderSection, form, mode, saving, submitText, singular, onCancel, errorFields }, renders the sections it wants with renderSection(section), and saves by calling form.submit().
:::

```jsx A minimal layout
import { registerFormLayout } from '../core/metadata/formLayouts';

function OnePagePerSection({ sections, renderSection, form, saving }) {
  const [at, setAt] = useState(0);
  const next = async () => {
    await form.validateFields(sections[at].fieldNames);
    if (at < sections.length - 1) setAt(at + 1); else form.submit();
  };
  return (
    <>
      {renderSection(sections[at])}
      <Button type="primary" loading={saving} onClick={next}>Next</Button>
    </>
  );
}

registerFormLayout('steps', OnePagePerSection);
```

:::warning Steps are for people, not for security
The stepper checks each step to help the person filling it in. The server always checks the complete record, the same way it checks an ordinary form, so a step can never be skipped to save bad data.
:::
