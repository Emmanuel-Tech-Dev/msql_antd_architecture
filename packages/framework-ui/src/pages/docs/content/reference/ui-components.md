---
id: ui-components
title: UI components
track: reference
group: Package reference
order: 0.2
eyebrow: Components from @msql-antd/framework-ui
audience: Frontend developers
readTime: 16 min
summary: Every component the UI package exports, with its props and an example: page header, tables, metadata forms, rich text, maps, access guards, loading and not-found screens.
---

## Import and use

```jsx Any page
import { PageHeader, MetadataTable, MapView, Can } from '@msql-antd/framework-ui'
```

Components are ordinary React components: pass props to control what they show, wrap them in your own components, style them with className or style. What you cannot do from a project is change a component's inside; when a component needs an option it does not have, add the prop in the framework and release a new version.

| Component | For |
| --- | --- |
| PageHeader | The title band and body of every admin page |
| MetadataTable, MetadataForm, MetadataFields, StepsLayout | Screens built from a table's metadata |
| ListField, ListCell, LookupSelect, UploadField, IconSelect | The field controls metadata forms use, usable on their own |
| CustomTable | An antd table with search, refresh and row selection, driven by useTableApi |
| RichTextEditor | Formatted text (TipTap) with images and links |
| MapView, LocationPicker, DirectionsMap | Maps with Mapbox or Google |
| Can, PageLink | Showing things only to people who may use them |
| AppLayout, ThemeToggle, AppLoading, PageLoading, NotFound404 | The shell and its states |

## PageHeader

| Prop | Type | What it does |
| --- | --- | --- |
| title (or header) | node | The page title |
| description | node | One line under the title |
| icon | node | An icon beside the title |
| items | array | Breadcrumb items, as antd Breadcrumb items |
| actions | node | Buttons on the right of the title |
| aside | node | Extra content on the right of the band |
| children | node | The page body, below the band |
| className / contentClassName | string | Classes for the whole header / the body |

```jsx Invoices page
<PageHeader
  title="Invoices"
  description="Issued, paid and overdue invoices."
  icon={<FileTextOutlined />}
  actions={<Button type="primary" onClick={openNew}>New invoice</Button>}
>
  <MetadataTable table="invoices" />
</PageHeader>
```

## MetadataTable

A complete list screen from a table's metadata: columns, search, pagination, and add, edit and delete in a modal. Add, Edit and Delete appear only for people with create:, update: and delete:<table>.

| Prop | Default | What it does |
| --- | --- | --- |
| table | required | The table name |
| pageSize | 10 | Rows per page |
| columns | — | Changes columns by field name: { status: { title: "State", render: (value, row) => <Tag>{value}</Tag> } } |
| header | — | header({ addButton }) returns what sits above the table, so you can place the add button yourself |
| addLabel / addTitle / editTitle | from the table's singular name | Button and modal titles |
| formProps | — | Props passed to the MetadataForm in the modal (slots, onSubmit, initialValues…) |
| metadata | — | A draft definition instead of the saved one (the builder's preview uses this) |
| tableSelection | false | Adds a checkbox to each row. While rows are ticked, a bar shows "N selected", Delete selected (for people with delete:<table>), your bulkActions and Clear |
| onSelectionChange(rows, keys) | — | Called whenever the selection changes, with the ticked rows and their primary keys |
| bulkActions({ selectedRows, selectedRowKeys, clearSelection, refresh }) | — | Your own buttons in the selection bar, for example a bulk update through your own route |

Delete selected sends DELETE /api/<table> with the ticked ids: one request, one transaction, so either all are deleted or (when one cannot be, a foreign key for example) none. Selection covers the rows on the current page.

```jsx A bulk update through your own route
<MetadataTable
  table="invoices"
  tableSelection
  bulkActions={({ selectedRowKeys, clearSelection, refresh }) => (
    <Button onClick={async () => {
      await apiClient.post('/api/v1/invoices/mark-paid', { ids: selectedRowKeys })
      clearSelection()
      refresh()
    }}>Mark paid</Button>
  )}
/>
```

The route is yours: register it with createServer({ routes }) and give it an API resource and a permission, like any project route.

Who sees which button is decided by permissions. Delete selected appears only for people with delete:<table>; anyone without it still gets the checkboxes and your own actions. Your buttons follow the same rule when you check them with useCan:

```jsx Your own action for permitted people only
function InvoiceList() {
  const canMarkPaid = useCan('update:invoices')
  return (
    <MetadataTable
      table="invoices"
      tableSelection
      bulkActions={({ selectedRowKeys, refresh }) => canMarkPaid && (
        <Button onClick={() => markPaid(selectedRowKeys).then(refresh)}>Mark paid</Button>
      )}
    />
  )
}
```

To keep Delete selected off a table altogether, don't give anyone delete:<table>; the server refuses bulk and single deletes without it either way.

## MetadataForm and MetadataFields

MetadataForm renders, checks and saves a record from the metadata: fields, sections, steps, lookups, uploads and list fields. MetadataFields renders only the fields, inside a Form you own.

| MetadataForm prop | What it does |
| --- | --- |
| table | The table name |
| record | The record to edit; leave out to add a new one |
| initialValues | Starting values for a new record |
| fields | Only these field names, in this order |
| readOnly | Show values without editing |
| slots | Replace one field's control: { phone: (field) => <PhoneInput /> } |
| submitText | The save button's text |
| form | An antd form instance you created with Form.useForm() |
| showActions / notify | Hide the buttons / the success message |
| onSubmit(values, { mode, record }) | Save through your own code instead of the generic route; what it returns goes to onSaved |
| onSaved(saved) / onSaveError(error) / onCancel() | After saving / when saving failed / Cancel |
| metadata / preview | A draft definition, for previews |

MetadataFields takes metadata (the loaded definition), mode ("create" or "edit"), section, fields, readOnly and slots. StepsLayout is the multi-step layout MetadataForm uses when a table is set to steps; you rarely use it directly. Everything about the metadata itself (field types, rules, conditions, lookups, steps) is on Metadata-driven forms and Multi-step forms.

## Field controls

| Component | Props | Value |
| --- | --- | --- |
| LookupSelect | lookupKey (a metadata lookup), multiple, dependsOn (another field's name: the options follow that field and clear when it changes; must be inside an antd Form), plus antd Select props | The chosen value, or an array with multiple |
| UploadField | table, column (the field files are stored for), kind ("file" or "image"), accept, maxSizeMb, value, onChange, disabled | The stored file's address |
| IconSelect | value, onChange, disabled, placeholder | An antd icon name such as "TeamOutlined" |
| ListField | field (a list or groupList field definition), disabled, required. Inside an antd Form | An array of rows |
| ListCell | value, field | Read-only display of a list value in a table cell |

```jsx A lookup in your own form
<Form form={form} layout="vertical">
  <Form.Item name="region_id" label="Region"><LookupSelect lookupKey="regions" /></Form.Item>
  <Form.Item name="district_id" label="District"><LookupSelect lookupKey="districts" dependsOn="region_id" /></Form.Item>
</Form>
```

## CustomTable

An antd Table with a toolbar (search box, refresh button), the loading state and row selection. It takes what useTableApi returns as tableConfig, so data, paging, sorting, filters and search are wired for you.

| Prop | Default | What it does |
| --- | --- | --- |
| tableConfig | required | The object from useTableApi |
| columns | required | antd Table columns |
| showToolbar | true | The search and refresh bar |
| label | "Data records" | The table's accessible name |
| views / toolbar / notice / scopeBar | — | Extra content: view switcher, more toolbar buttons, a message above the table, a filter bar |
| className / tableClassName | — | Classes for the wrapper / the table |

```jsx A table from your own endpoint
const table = useTableApi({ pagination: { current: 1, pageSize: 20 } }, {}, 'id', { table: 'invoices' })
return <CustomTable tableConfig={table} columns={[{ title: 'Number', dataIndex: 'number' }]} />
```

useTableApi itself (online and offline data, filters, selection) is covered in the Application hooks cookbook.

## RichTextEditor

| Prop | Default | What it does |
| --- | --- | --- |
| value / onChange(html, { editor, json, text }) | — | Controlled HTML. An empty editor gives "" |
| initialContent | "" | Starting HTML when not controlled |
| onReady(editor) / onBlur(html, { editor, event }) | — | The TipTap editor once ready / when focus leaves |
| placeholder | "Start writing…" | Shown while empty |
| minHeight | 280 | Pixels |
| disabled / readOnly | false | No editing; readOnly keeps the content selectable |
| showToolbar / showWordCount | true | The formatting bar / the word and character count |
| uploadImage(file) | — | Uploads an inserted image; return its URL (or { url }) |
| allowBase64Images | true | Without uploadImage, images are embedded as data: URLs. Set false to refuse images instead |
| acceptedImageTypes | JPEG, PNG, WebP, GIF | Allowed image types |
| maxImageSize | 5 MB | Larger images are refused with a message |
| ariaLabel / className | "Rich text editor" / "" | Accessible name / wrapper class |

```jsx Article body with uploads
<RichTextEditor
  value={body}
  onChange={(html) => setBody(html)}
  uploadImage={async (file) => (await uploadToCloudinary(file)).secure_url}
/>
```

:::note Embedded images are large
Without uploadImage, a photo is stored inside the HTML as text, which can be several megabytes per image. For anything saved to the database, give uploadImage.
:::

## MapView

Needs the map key in <FrameworkApp config>: mapboxAccessToken for Mapbox, googleMapsApiKey (and optionally googleMapId) for Google.

| Prop | Default | What it does |
| --- | --- | --- |
| provider | config.mapProvider, then "mapbox" | "mapbox" or "google" |
| center | Ghana (7.9465, -1.0232) | { lat, lng } |
| zoom | 6 | Zoom level |
| markers | [] | [{ id, position: { lat, lng }, title, popup, color, draggable }] |
| route | — | { origin, destination, travelMode }: draws a route; travelMode is driving (default), walking, bicycling or transit |
| behaviors | — | Callbacks: onMapClick, onMarkerClick, onMarkerDragEnd (each gets { position, marker, event, provider }), onRoute(result), onError(error) |
| providerOptions | — | { style, mapOptions } for Mapbox; { mapId, apiKey, mapOptions } for Google |
| className / style | — | The map box is at least 280 px high; give it a height |
| loadingFallback / errorFallback | spinner / message | What shows while loading / when the map fails |

A ref gives the map's actions: setCenter(position, { zoom, animate }), setZoom, setMarkers, setRoute, clearRoute, fitBounds(positions), reverseGeocode(position), getCurrentPosition(), resize(), reload(), getInstance() (the Mapbox or Google map object).

```jsx Branch map
const map = useRef(null)

<MapView
  ref={map}
  center={{ lat: 5.6037, lng: -0.187 }}
  zoom={12}
  markers={branches.map((b) => ({ id: b.id, position: { lat: b.lat, lng: b.lng }, title: b.name }))}
  behaviors={{ onMarkerClick: ({ marker }) => openBranch(marker.id) }}
  style={{ height: 420 }}
/>
<Button onClick={() => map.current.fitBounds(branches.map((b) => ({ lat: b.lat, lng: b.lng })))}>Show all</Button>
```

## LocationPicker and DirectionsMap

LocationPicker lets someone choose a place by clicking the map or using their current position, then shows the address.

| Prop | What it does |
| --- | --- |
| value | { latitude, longitude, address } |
| onChange(value) | Called with { latitude, longitude, address } after the address is looked up |
| provider / providerOptions | Default: config.mapProvider, then Mapbox |

DirectionsMap shows one record on the map and, on request, the route to it from the viewer's current position (or a fixed starting point), with distance, duration and turn-by-turn steps. It works with any record that has a position.

| Prop | Default | What it does |
| --- | --- | --- |
| destination | required | The record (a customer, a site, a delivery…) or a plain { lat, lng } |
| getPosition(record) | reads lat/lng, latitude/longitude or lon | Returns { lat, lng } for your own column names, or null when the record has no position |
| title | name, title, label, or first and last name | Text, or a function of the record, for the marker and the button |
| description | address, location or description | Text, or a function of the record, shown under the map and in the marker |
| origin | the viewer's current position | A fixed starting point (a depot, an office): { lat, lng } or a record getPosition understands |
| travelMode | "driving" | driving, walking, bicycling or transit |
| loading | false | Shows a spinner while you load the record |
| emptyMessage | "This record has no map location saved yet." | Shown when the record has no position |
| onRoute(result) | — | Called with the route: distanceMeters, durationSeconds, steps |
| provider / providerOptions | config.mapProvider, then Mapbox | As for MapView |
| height / className | 380 / "" | Map height in pixels / wrapper class |

```jsx A delivery site with its own column names
<DirectionsMap
  destination={site}
  loading={isLoading}
  getPosition={(row) => (row?.gps_lat ? { lat: Number(row.gps_lat), lng: Number(row.gps_lng) } : null)}
  title={(row) => row.site_name}
  description={(row) => `${row.street}, ${row.town}`}
  origin={{ lat: 5.6037, lng: -0.187 }}
/>
```

## Can and PageLink

| Component | Props | What it does |
| --- | --- | --- |
| Can | permission, fallback = null, children | Shows children only when the person has the permission. permission is a name ("update:invoices") or { resource, action } |
| PageLink | to, route, className, children | A router link that turns into plain text when the person may not open that page. route is the page's registered path, such as "/admin/customers/:customerId" |

```jsx Only for people who may approve
<Can permission="approve:invoices" fallback={<Tag>Waiting for approval</Tag>}>
  <Button onClick={approve}>Approve</Button>
</Can>

<PageLink to={`/admin/customers/${row.customer_id}`} route="/admin/customers/:customerId">{row.customer_name}</PageLink>
```

Hiding a button is a convenience, not security: the server checks every request against its own permissions.

## Shell and states

| Component | What it is |
| --- | --- |
| AppLayout | The signed-in shell: sidebar from the BROWSER_ROUTE rows, header, profile menu and the route guard. FrameworkApp already uses it for /admin; use it yourself only when composing your own routes without FrameworkApp |
| ThemeToggle | The light/dark switch from the header. No props |
| AppLoading | The full-screen loading state used while the app starts. No props |
| PageLoading | The loading state for one page inside the layout. No props |
| NotFound404 | The not-found screen with a way back. No props |
