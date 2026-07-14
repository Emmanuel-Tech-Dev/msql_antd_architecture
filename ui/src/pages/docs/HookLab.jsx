import { useCallback, useMemo, useState } from 'react';
import {
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  LayoutOutlined,
  NotificationOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SkinOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Calendar,
  Card,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import useCalendar from '../../hooks/useCalender';
import useChart from '../../hooks/useChart';
import useDraggable from '../../hooks/useDraggable';
import useDrawer from '../../hooks/useDrawer';
import useDynamicFilter from '../../hooks/useDynamicFilter';
import useIcons from '../../hooks/useIcons';
import useLocalForage from '../../hooks/useLocalForage';
import useMasonry from '../../hooks/useMasonary';
import useModal from '../../hooks/useModal';
import useNotification from '../../hooks/useNotification';
import useSider from '../../hooks/useSider';
import useTableApi from '../../hooks/useTableApi';
import useUpload from '../../hooks/useUpload';
import { useTheme } from '../../hooks/useTheme';
import { hookCategories, hookPlaygroundCatalog } from './hookPlaygroundCatalog';
import { semanticDemoComponents } from './HookSemanticDemos';
import './HookLab.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

const CHART_DEFAULTS = { height: 280, xKey: 'month' };
const CHART_DATA = [
  { month: 'Jan', planned: 42, actual: 35 },
  { month: 'Feb', planned: 48, actual: 46 },
  { month: 'Mar', planned: 52, actual: 49 },
  { month: 'Apr', planned: 58, actual: 63 },
  { month: 'May', planned: 66, actual: 61 },
];
const CALENDAR_NOTES = {
  '2026-07-13': [{ id: 1, type: 'success', title: 'Release review' }],
  '2026-07-18': [{ id: 2, type: 'warning', title: 'Backup drill' }],
};
const MASONRY_ITEMS = [
  { id: 1, title: 'Access review', description: 'Confirm role mappings', height: 130 },
  { id: 2, title: 'Backup drill', description: 'Restore the latest dump', height: 180 },
  { id: 3, title: 'UI release', description: 'Verify responsive pages', height: 145 },
  { id: 4, title: 'Log audit', description: 'Review security events', height: 165 },
];
const TABLE_ROWS = [
  { id: 1, name: 'Northstar', status: 'Active', owner: 'Ama' },
  { id: 2, name: 'Meridian', status: 'Planning', owner: 'Kojo' },
  { id: 3, name: 'Atlas', status: 'Archived', owner: 'Nana' },
  { id: 4, name: 'Lighthouse', status: 'Active', owner: 'Esi' },
];
const SIDER_ITEMS = [
  { key: '/overview', label: 'Overview', icon: <AppstoreOutlined /> },
  { key: '/reports', label: 'Reports', icon: <BarChartOutlined /> },
  { key: '/calendar', label: 'Calendar', icon: <CalendarOutlined /> },
];

const categoryIcons = {
  Layout: <LayoutOutlined />,
  Overlays: <AppstoreOutlined />,
  Appearance: <SkinOutlined />,
  Visualization: <BarChartOutlined />,
  'Data UI': <DatabaseOutlined />,
  Feedback: <NotificationOutlined />,
  Forms: <EditOutlined />,
  Access: <SafetyCertificateOutlined />,
  'Core access': <SafetyCertificateOutlined />,
  'Core data': <DatabaseOutlined />,
  'Core auth': <SafetyCertificateOutlined />,
};

function PreviewSurface({ children, note }) {
  return (
    <div className="hook-studio__preview">
      {note && <div className="hook-studio__preview-note"><ExperimentOutlined />{note}</div>}
      <div className="hook-studio__preview-body">{children}</div>
    </div>
  );
}

function SiderDemo() {
  const shell = useSider({ defaultCollapsed: false, collapsible: true }, { items: SIDER_ITEMS });
  const { appearance } = useTheme();
  return (
    <PreviewSurface note="The full layoutJSX owns an Outlet, so this isolated preview uses the hook's real collapsed state only.">
      <div className="hook-studio__mini-shell">
        <aside className={shell.collapsed ? 'is-collapsed' : ''} style={{ background: appearance.colors.siderBg }}>
          <div className="hook-studio__mini-brand"><LayoutOutlined />{!shell.collapsed && <strong>Framework</strong>}</div>
          {SIDER_ITEMS.map((item) => <div className="hook-studio__mini-route" key={item.key}>{item.icon}{!shell.collapsed && item.label}</div>)}
          <Button onClick={shell.toggle}>{shell.collapsed ? 'Expand' : 'Collapse'}</Button>
        </aside>
        <div><small>COLLAPSED STATE</small><strong>{String(shell.collapsed)}</strong><p>Use the control to verify that the hook owns and updates the navigation state.</p></div>
      </div>
    </PreviewSurface>
  );
}

function ModalDemo() {
  const dialog = useModal({ width: 520, draggable: true, resetOnClose: true });
  return (
    <PreviewSurface>
      <Button type="primary" onClick={() => dialog.openModal({
        title: 'Review deployment',
        content: <div className="hook-studio__summary"><strong>3 changes ready</strong><p>The feature owns the operation; useModal owns the surface and confirmation state.</p></div>,
        onOk: async () => dialog.closeModal(),
      })}>Open draggable modal</Button>
      {dialog.modalJSX()}
    </PreviewSurface>
  );
}

function DrawerDemo() {
  const panel = useDrawer({ width: 480, resizable: true, minWidth: 340, maxWidth: 720, resetOnClose: true });
  return (
    <PreviewSurface>
      <Button type="primary" onClick={() => panel.openDrawer({
        title: 'Project details',
        content: <div className="hook-studio__key-values"><span><small>Owner</small>Ama Mensah</span><span><small>Status</small>Active</span><span><small>Region</small>Europe West</span></div>,
      })}>Open resizable drawer</Button>
      {panel.drawerJSX()}
    </PreviewSurface>
  );
}

function DraggableDemo() {
  const draggable = useDraggable();
  return (
    <PreviewSurface note="Hover the dark handle, then drag the card. Movement is bounded to the current viewport.">
      <div className="hook-studio__drag-zone">
        {draggable.drag(
          <Card
            className="hook-studio__drag-card"
            title={<div {...draggable.draggableTitleProps}><AppstoreOutlined /> Drag this surface</div>}
          >
            The same wrapper is supplied to Ant Design Modal through modalRender.
          </Card>,
        )}
      </div>
    </PreviewSurface>
  );
}

function ThemeDemo() {
  const { appearance, isDark, mode, scope, toggle, clearPreference } = useTheme();
  return (
    <PreviewSurface note="This changes the documentation theme through the real shared ThemeProvider.">
      <div className="hook-studio__theme-swatch" style={{ background: appearance.colors.elevatedBg, borderColor: appearance.colors.strongBorder }}>
        <small>{scope} scope · {mode}</small>
        <Title level={4}>{isDark ? 'Dark appearance' : 'Light appearance'}</Title>
        <div className="hook-studio__palette">
          {['primary', 'contentBg', 'elevatedBg', 'siderBg'].map((token) => <span key={token} title={token} style={{ background: appearance.colors[token] }} />)}
        </div>
        <Space wrap><Button type="primary" onClick={toggle}>Toggle mode</Button><Button onClick={clearPreference}>Use configured mode</Button></Space>
      </div>
    </PreviewSurface>
  );
}

function ChartDemo() {
  const [type, setType] = useState('bar');
  const chart = useChart(CHART_DEFAULTS);
  return (
    <PreviewSurface>
      <Segmented value={type} onChange={setType} options={['line', 'bar', 'area', 'composed']} />
      <div className="hook-studio__chart">
        {chart.renderChart({
          type,
          data: CHART_DATA,
          showLegend: true,
          series: [
            { dataKey: 'planned', name: 'Planned', color: '#a89f94', chart: 'bar' },
            { dataKey: 'actual', name: 'Actual', color: '#d4570a', chart: type === 'composed' ? 'line' : undefined },
          ],
        })}
      </div>
    </PreviewSurface>
  );
}

function CalendarDemo() {
  const calendar = useCalendar('card', { notes: CALENDAR_NOTES });
  return (
    <PreviewSurface>
      <div className="hook-studio__calendar">
        <Calendar {...calendar.calendarProps} />
        <aside><CalendarOutlined /><small>Selected date</small><strong>{calendar.selectedDate.format('D MMMM YYYY')}</strong><span>{calendar.stats.totalNotes} notes</span><Button size="small" onClick={() => calendar.addNote(calendar.selectedDate, { title: 'New review', type: 'processing' })}>Add note</Button></aside>
      </div>
    </PreviewSurface>
  );
}

function MasonryDemo() {
  const board = useMasonry('dynamic', { initialItems: MASONRY_ITEMS, columns: { xs: 1, sm: 2, md: 3 }, gutter: 10 });
  return (
    <PreviewSurface>
      <Space wrap className="hook-studio__controls">
        <Button icon={<PlusOutlined />} onClick={() => board.addItem({ id: Date.now(), title: `Task ${board.items.length + 1}`, description: 'Added locally', height: 130 + (board.items.length % 3) * 25 })}>Add card</Button>
        <Button disabled={!board.items.length} onClick={() => board.removeItem(board.items.at(-1)?.key)}>Remove last</Button>
        <Text type="secondary">{board.items.length} cards</Text>
      </Space>
      {board.masonryJSX()}
    </PreviewSurface>
  );
}

function FilterDemo() {
  const [active, setActive] = useState({});
  const definitions = useMemo(() => [
    { key: 'status', type: 'select', label: 'Status', options: [{ label: 'Active', value: 'active' }, { label: 'Archived', value: 'archived' }] },
    { key: 'amount', type: 'range', label: 'Amount', range: [0, 100] },
    { key: 'verified', type: 'switch', label: 'Verified' },
  ], []);
  const onChange = useCallback((values) => setActive(values), []);
  const filters = useDynamicFilter({ filters: definitions, onChange, persistence: 'state', searchPlaceholder: 'Search records' });
  return (
    <PreviewSurface>
      {filters.horizontalBarJSX}
      <pre className="hook-studio__output">{JSON.stringify(active, null, 2)}</pre>
    </PreviewSurface>
  );
}

function TableDemo() {
  const table = useTableApi({}, { manual: true }, 'id');
  const [loaded, setLoaded] = useState(false);
  const columns = useMemo(() => [
    { title: 'Project', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Status', dataIndex: 'status' },
    { title: 'Owner', dataIndex: 'owner' },
  ], []);
  return (
    <PreviewSurface note="This is the real offline mode. No provider request is sent.">
      <Space wrap className="hook-studio__controls">
        <Button type="primary" onClick={() => { table.setRecord(TABLE_ROWS); setLoaded(true); }}>Load sample records</Button>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search offline rows" onChange={(event) => table.handleGlobalSearch(event.target.value)} />
        <Button icon={<ReloadOutlined />} onClick={table.resetParams}>Reset</Button>
      </Space>
      {!loaded ? <Empty description="Load sample records to enter offline mode" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <Table {...table.tableProps} columns={columns} size="small" />}
    </PreviewSurface>
  );
}

function NotificationDemo() {
  const feedback = useNotification();
  const AlertJsx = feedback.AlertJsx;
  return (
    <PreviewSurface>
      <Space wrap>
        <Button type="primary" onClick={() => feedback.message.success('Profile saved')}>Message</Button>
        <Button onClick={() => feedback.notification.info('Background export', 'The report is still being prepared.')}>Notification</Button>
        <Button onClick={() => feedback.alert.warning('Review required', 'Two fields need attention before publishing.')}>Inline alert</Button>
      </Space>
      <div className="hook-studio__alert-slot"><AlertJsx /></div>
    </PreviewSurface>
  );
}

function IconsDemo() {
  const icons = useIcons();
  const [name, setName] = useState('AppstoreOutlined');
  return (
    <PreviewSurface>
      <div className="hook-studio__icon-demo">
        <div>{icons.resolveIcon(name)}</div>
        <Select showSearch value={name} onChange={setName} options={icons.iconNames.map((iconName) => ({ label: iconName, value: iconName }))} />
        <Text type="secondary">resolveIcon returns a React element ready for an icon prop.</Text>
      </div>
    </PreviewSurface>
  );
}

function StorageDemo() {
  const storage = useLocalForage({ name: 'framework-docs', storeName: 'hook-sandbox' });
  const [value, setValue] = useState(null);
  const save = async () => {
    const next = { title: 'Offline draft', savedAt: new Date().toISOString() };
    await storage.setItem('demo:draft', next);
    setValue(next);
  };
  const read = async () => setValue(await storage.getItem('demo:draft'));
  const remove = async () => { await storage.deleteItem('demo:draft'); setValue(null); };
  return (
    <PreviewSurface note="This writes only to the current browser's framework-docs IndexedDB store.">
      <Space wrap><Button type="primary" loading={storage.loading} onClick={save}>Save local draft</Button><Button onClick={read}>Read</Button><Button danger icon={<DeleteOutlined />} onClick={remove}>Delete</Button></Space>
      <pre className="hook-studio__output">{JSON.stringify(value, null, 2)}</pre>
    </PreviewSurface>
  );
}

function UploadDemo() {
  const upload = useUpload('', '');
  const [configured, setConfigured] = useState(false);
  const configure = () => {
    upload.setAcceptedFiles(['image/png', 'image/jpeg', 'image/webp']);
    upload.setNumFiles(1);
    upload.setCustomBeforeUpload({
      beforeUpload: async (file) => {
        const url = await upload.getBase64(file);
        upload.setBase64FileList([url]);
        upload.setFileList([{ uid: file.uid, name: file.name, status: 'done', url, originFileObj: file }]);
      },
    });
    setConfigured(true);
  };
  return (
    <PreviewSurface note="Local-only mode intercepts beforeUpload and converts the image to a preview. No upload endpoint is called.">
      {!configured ? <Button type="primary" onClick={configure}>Enable local upload sandbox</Button> : <>
        <Space align="start" wrap>
          {upload.uploader('avatar', '/docs/local-only', 'docs-avatar')}
          <div className="hook-studio__upload-state"><small>FILES</small><strong>{upload.fileList.length}</strong><Button size="small" onClick={() => upload.setFileList([])}>Clear</Button></div>
        </Space>
        {upload.preview()}
      </>}
    </PreviewSurface>
  );
}

function StatisticsDemo() {
  return (
    <PreviewSurface>
      <Alert type="warning" showIcon title="No hook contract exists yet" description="useStatistics.jsx is empty. Define accepted datasets, aggregation behavior, null handling, return values, and tests before turning this into a live implementation." />
      <div className="hook-studio__planned"><span>01</span><p>Define requirements</p><span>02</span><p>Implement pure calculations</p><span>03</span><p>Add unit and visualization tests</p></div>
    </PreviewSurface>
  );
}

const demoComponents = {
  sider: SiderDemo,
  modal: ModalDemo,
  drawer: DrawerDemo,
  draggable: DraggableDemo,
  theme: ThemeDemo,
  chart: ChartDemo,
  calendar: CalendarDemo,
  masonry: MasonryDemo,
  filter: FilterDemo,
  table: TableDemo,
  notification: NotificationDemo,
  icons: IconsDemo,
  storage: StorageDemo,
  upload: UploadDemo,
  statistics: StatisticsDemo,
};

function CodeWorkbench({ entry }) {
  const [draft, setDraft] = useState(entry.source);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="hook-studio__code">
      <div className="hook-studio__code-tools">
        <span><CodeOutlined /> Editable scratchpad</span>
        <Space><Button size="small" icon={<ReloadOutlined />} onClick={() => setDraft(entry.source)}>Reset</Button><Button size="small" icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button></Space>
      </div>
      <TextArea aria-label={`${entry.name} code scratchpad`} spellCheck={false} value={draft} onChange={(event) => setDraft(event.target.value)} autoSize={{ minRows: 13, maxRows: 26 }} />
      <p>Preview controls execute safe hook behavior. The source editor is intentionally not evaluated in the browser; copy a variation into the codebase to compile it through React and the framework providers.</p>
    </div>
  );
}

function ContractPanel({ entry }) {
  return (
    <div className="hook-studio__contract">
      <div><small>SOURCE</small><strong>{entry.importPath}</strong></div>
      <div><small>RUNTIME</small><strong>{entry.status}</strong></div>
      <div><small>CATEGORY</small><strong>{entry.category}</strong></div>
      <Alert showIcon type={entry.status.includes('Live') ? 'success' : entry.status === 'Not implemented' ? 'warning' : 'info'} title={entry.status.includes('Live') ? 'Executed by this documentation page' : 'Isolated from protected application state'} description={entry.status.includes('Live') ? 'Use the Preview tab controls to exercise the real hook implementation.' : 'The Preview tab models inputs, loading, success, failure, and normalized output without affecting a live session or database.'} />
    </div>
  );
}

export default function HookLab() {
  const [activeKey, setActiveKey] = useState('useSider');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All hooks');
  const [view, setView] = useState('Preview');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return hookPlaygroundCatalog.filter((entry) => {
      const matchesCategory = category === 'All hooks' || entry.category === category;
      const matchesSearch = !needle || `${entry.name} ${entry.summary} ${entry.category}`.toLowerCase().includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [category, query]);

  const active = hookPlaygroundCatalog.find((entry) => entry.key === activeKey) ?? hookPlaygroundCatalog[0];
  const Demo = semanticDemoComponents[active.name] ?? demoComponents[active.demo] ?? StatisticsDemo;
  const selectHook = (key) => { setActiveKey(key); setView('Preview'); };

  return (
    <div className="hook-studio">
      <div className="hook-studio__intro">
        <div><span>Interactive developer reference</span><Title level={3}>Hook Studio</Title><Text type="secondary">One isolated demo for every application and core framework hook, with editable scenarios and copy-ready source.</Text></div>
        <div className="hook-studio__count"><strong>{hookPlaygroundCatalog.length}</strong><small>documented hooks</small></div>
      </div>

      <div className="hook-studio__filters">
        <Input allowClear prefix={<SearchOutlined />} placeholder="Find a hook or capability" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={category} onChange={setCategory} options={['All hooks', ...hookCategories].map((item) => ({ label: item, value: item }))} />
      </div>

      <div className="hook-studio__workspace">
        <nav className="hook-studio__catalog" aria-label="Hook playgrounds">
          {filtered.length ? filtered.map((entry) => (
            <button className={entry.key === active.key ? 'is-active' : ''} key={entry.key} onClick={() => selectHook(entry.key)} type="button">
              <span>{categoryIcons[entry.category] ?? <ApiOutlined />}</span>
              <span><strong>{entry.name}</strong><small>{entry.category}</small></span>
              <i className={entry.status.includes('Live') ? 'is-live' : entry.status === 'Not implemented' ? 'is-planned' : ''} />
            </button>
          )) : <Empty description="No hooks match this filter" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </nav>

        <section className="hook-studio__workbench">
          <header className="hook-studio__workbench-head">
            <div><span>{active.category}</span><Title level={4}>{active.name}</Title><p>{active.summary}</p></div>
            <Tag bordered={false} color={active.status.includes('Live') ? 'success' : active.status === 'Not implemented' ? 'warning' : 'processing'}>{active.status}</Tag>
          </header>
          <div className="hook-studio__tabs"><Segmented value={view} onChange={setView} options={[{ label: 'Preview', value: 'Preview', icon: <PlayCircleOutlined /> }, { label: 'Code', value: 'Code', icon: <CodeOutlined /> }, { label: 'Contract', value: 'Contract', icon: <SafetyCertificateOutlined /> }]} /></div>
          {view === 'Preview' && <Demo key={active.key} entry={active} />}
          {view === 'Code' && <CodeWorkbench key={active.key} entry={active} />}
          {view === 'Contract' && <ContractPanel entry={active} />}
        </section>
      </div>
    </div>
  );
}
