---
id: visualization-hooks
title: Charts, calendars, and masonry
track: reference
group: Hooks
order: 3
eyebrow: Visualization hooks
audience: Frontend developers
readTime: 25 min
summary: Use the visualization hooks with normalized data, responsive layouts, note and event state, custom renderers, and honest implementation boundaries.
---

Visualization hooks convert stable application data into reusable Ant Design or Recharts presentation. Prepare and authorize the data before it reaches these hooks; they are renderers and local interaction managers, not reporting services.

## Visualization hook matrix

| Hook | Supported modes | Primary result |
| --- | --- | --- |
| useChart | line, bar, pie, area, composed | renderChart(options), Chart, chartTypes |
| useCalendar | basic, notice, card, selectable, lunar, week, custom-header | calendarProps plus note/event helpers |
| useMasonry | basic, responsive, image, dynamic, custom | masonryProps, masonryJSX, and item actions |
| useStatistics | None | Empty placeholder file; no production API exists |

```jsx Multi-series and composed charts
const chartDefaults = useMemo(() => ({
  height: 320,
  xKey: 'month',
  showGrid: true,
  showTooltip: true,
}), []);
const chart = useChart(chartDefaults);

const series = [
  { dataKey: 'target', name: 'Target', color: '#a89f94', chart: 'bar' },
  { dataKey: 'actual', name: 'Actual', color: '#d4570a', chart: 'line' },
];

return chart.renderChart({
  type: 'composed',
  data: monthlyResults,
  series,
  showLegend: true,
  tooltipFormatter: (value) => [formatCurrency(value), 'Amount'],
});
```

## useChart options

| Option | Purpose |
| --- | --- |
| type | Select line, bar, pie, area, or composed |
| data / xKey / dataKey / nameKey | Describe the normalized dataset fields |
| series | One string or object per Cartesian series; chart chooses bar/line in composed mode |
| colors | Pie-cell palette or fallback series palette |
| height / margin | Responsive container height and Recharts margins |
| showGrid / showXAxis / showYAxis / showTooltip / showLegend | Toggle chart furniture |
| innerRadius / outerRadius | Configure a pie or doughnut |
| tooltipFormatter | Format displayed values without mutating source data |

```jsx Pie chart
const chart = useChart();

return chart.renderChart({
  type: 'pie',
  data: [
    { status: 'Active', count: 42 },
    { status: 'Paused', count: 8 },
  ],
  nameKey: 'status',
  dataKey: 'count',
  colors: ['#2f855a', '#d69e2e'],
  innerRadius: 52,
  outerRadius: 84,
  showLegend: true,
});
```

:::note Stable defaults
Memoize the object passed to useChart when it is created inside a component. renderChart is memoized against that object; a new object on every render needlessly recreates the callback.
:::

```jsx Calendar with server-backed notes
function TeamCalendar({ notes, saveNote, deleteNoteOnServer }) {
  const calendar = useCalendar('notice', {
    notes,
    maxNotesPerDay: 5,
    onDateSelect: (date, detail) => setInspector({ date, ...detail }),
    onNoteAdd: async (date, note) => saveNote(date.format('YYYY-MM-DD'), note),
    onNoteDelete: async (date, noteId) => deleteNoteOnServer(noteId),
  });

  return <>
    <Calendar {...calendar.calendarProps} />
    <Button onClick={() => calendar.addNote(calendar.selectedDate, {
      title: 'Review',
      type: 'processing',
    })}>Add review</Button>
  </>;
}
```

## useCalendar capabilities

| Area | Members |
| --- | --- |
| Selection | selectedDate, selectedCell, mode, setters and selection handlers |
| Notes | calendarNotes, get/add/delete/update note and month helpers |
| Events | calendarEvents, get/add/delete/update event |
| Lunar | lunarData input, getLunarData, lunarCellRender |
| Rendering | noticeCellRender, customHeaderRender, calendarProps |
| Summary | stats derived from local note and event maps |

## Calendar persistence contract

- Use YYYY-MM-DD keys for day notes and events. Month-level notes use YYYY-MM.
- The hook updates local state first and invokes callbacks; callbacks are the feature's opportunity to persist changes.
- External notes/events are synchronized when non-empty maps change. A service remains the source of truth after reload.
- disabledDate, validRange, locale, and mode are forwarded through calendarProps.

```jsx Responsive dynamic masonry
const initialItems = useMemo(() => projects.map((project) => ({
  id: project.id,
  title: project.name,
  description: project.status,
  height: project.card_height,
})), [projects]);

const board = useMasonry('dynamic', {
  initialItems,
  keyField: 'id',
  heightKey: 'height',
  columns: { xs: 1, sm: 2, md: 3 },
  gutter: 12,
  onItemClick: (item) => openProject(item.data.id),
});

return <>
  <Button onClick={() => board.addItem(newProject)}>Add card</Button>
  {board.masonryJSX()}
</>;
```

## useMasonry return contract

| Area | Members |
| --- | --- |
| State | items, loading, error, selectedItem, layout |
| Loading | load and optional url-based request |
| Mutation | setItems, addItem, removeItem, updateItem, clearItems |
| Layout | pinItemToColumn, reorderItems, onLayoutChange |
| Helpers | normalizeItems, handleItemClick, handleImageLoad |
| Rendering | masonryProps and masonryJSX(overrides) |

:::warning Current network boundary
The url option in useMasonry uses the legacy useApi hook. For new protected feature work, prefer loading records through the provider/core query layer and pass them as initialItems until useMasonry is migrated to the provider contract.
:::

:::warning useStatistics status
packages/framework-ui/src/hooks/useStatistics.jsx is currently a zero-byte placeholder. The documentation intentionally does not invent functions for it. Define requirements, implement the API, and add unit tests before exposing it to feature developers.
:::
