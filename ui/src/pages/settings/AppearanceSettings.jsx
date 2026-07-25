import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    ColorPicker,
    Form,
    Input,
    InputNumber,
    Progress,
    Row,
    Segmented,
    Select,
    Slider,
    Space,
    Switch,
    Tag,
    Typography,
} from 'antd';
import {
    AppstoreOutlined,
    BgColorsOutlined,
    BorderOutlined,
    CheckOutlined,
    ColumnWidthOutlined,
    ControlOutlined,
    DownloadOutlined,
    EyeOutlined,
    FileTextOutlined,
    LayoutOutlined,
    ReloadOutlined,
    SaveOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useStore as useValuesStore } from '../../store/values-store';
import { useDataProvider } from '../../core/provider/DataProvider';
import useCan from '../../core/hooks/access/useCan';
import useNotification from '../../hooks/useNotification';
import { useTheme } from '../../hooks/useTheme';
import { DEFAULT_SIDER_CONFIG, normalizeSiderConfig } from '../../core/config/siderConfig';
import { createAdsStyle, getAppearancePalette } from '../../utils/appearanceTokens';
import queryKeys from '../../core/queryKeys';

const { Paragraph, Text, Title } = Typography;

const COLOR_FIELDS = [
    ['siderBg', 'Sidebar'],
    ['headerBg', 'Header'],
    ['contentBg', 'Content'],
    ['accent', 'Accent'],
    ['accentText', 'Accent text'],
    ['textPrimary', 'Primary text'],
    ['textMuted', 'Muted text'],
    ['border', 'Borders'],
    ['itemHover', 'Item hover'],
    ['itemActive', 'Active item'],
    ['surfaceBg', 'Cards and inputs'],
    ['elevatedBg', 'Elevated surfaces'],
    ['bodyText', 'Body text'],
    ['secondaryText', 'Secondary text'],
    ['strongBorder', 'Component borders'],
    ['success', 'Success'],
    ['warning', 'Warning'],
    ['error', 'Error'],
    ['info', 'Information'],
];

const COLOR_VALUE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i;

const parseCsvLine = (line) => {
    const cells = [];
    let value = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"' && line[index + 1] === '"') {
            value += '"';
            index += 1;
        } else if (character === '"') {
            quoted = !quoted;
        } else if (character === ',' && !quoted) {
            cells.push(value.trim());
            value = '';
        } else {
            value += character;
        }
    }
    cells.push(value.trim());
    return cells;
};

const toCsvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

const parseThemePack = (csv) => {
    const lines = csv
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length < 2) throw new Error('The CSV needs a header and color rows.');

    const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
    const modeIndex = header.indexOf('mode');
    const tokenIndex = header.indexOf('token');
    const valueIndex = header.indexOf('value');
    if ([modeIndex, tokenIndex, valueIndex].some((index) => index < 0)) {
        throw new Error('Use the CSV columns: theme_name, mode, token, value.');
    }

    const allowedTokens = new Set(COLOR_FIELDS.map(([token]) => token));
    const palettes = { light: {}, dark: {} };
    for (const [lineOffset, line] of lines.slice(1).entries()) {
        const cells = parseCsvLine(line);
        const mode = cells[modeIndex]?.toLowerCase();
        const token = cells[tokenIndex];
        const value = cells[valueIndex];
        const lineNumber = lineOffset + 2;

        if (!['light', 'dark'].includes(mode)) {
            throw new Error(`Row ${lineNumber} must use light or dark mode.`);
        }
        if (!allowedTokens.has(token)) {
            throw new Error(`Row ${lineNumber} uses unsupported token “${token}”.`);
        }
        if (!COLOR_VALUE.test(value ?? '')) {
            throw new Error(`Row ${lineNumber} has an invalid color value.`);
        }
        if (palettes[mode][token]) {
            throw new Error(`Row ${lineNumber} duplicates ${mode}.${token}.`);
        }
        palettes[mode][token] = value;
    }

    const missing = ['light', 'dark'].flatMap((mode) =>
        COLOR_FIELDS
            .map(([token]) => token)
            .filter((token) => !palettes[mode][token])
            .map((token) => `${mode}.${token}`),
    );
    if (missing.length) {
        throw new Error(`The CSV is incomplete. Missing: ${missing.join(', ')}.`);
    }

    return palettes;
};

const CARD_CLASS = [
    'overflow-hidden border border-[var(--ads-border-subtle)]',
    'bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)]',
    '[&_.ant-card-head]:min-h-[52px] [&_.ant-card-head]:border-b-[var(--ads-border-subtle)]',
    '[&_.ant-card-head]:bg-[var(--ads-surface-raised)] [&_.ant-card-head]:px-5',
    '[&_.ant-card-head-title]:font-semibold [&_.ant-card-head-title_.anticon]:text-[var(--ads-accent)]',
    '[&_.ant-card-body]:p-5',
].join(' ');

const SLIDER_ROW_CLASS = [
    'grid grid-cols-1 items-center gap-2 py-3.5',
    'sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-5',
    '[&_.ant-slider]:mx-1.5 [&_.ant-slider]:mt-2',
    '[&_.ant-input-number]:w-full sm:[&_.ant-input-number]:w-[116px]',
].join(' ');

const BORDERED_SLIDER_ROW_CLASS = `${SLIDER_ROW_CLASS} border-t border-[var(--ads-border-subtle)]`;

const SWITCH_GRID_CLASS = [
    'mt-4 grid grid-cols-1 gap-2 border-t border-[var(--ads-border-subtle)] pt-4 md:grid-cols-3',
    '[&>label]:flex [&>label]:min-h-11 [&>label]:items-center [&>label]:gap-2.5',
    '[&>label]:rounded-[var(--ads-radius-md)] [&>label]:border [&>label]:border-[var(--ads-border-subtle)]',
    '[&>label]:bg-[var(--ads-surface-raised)] [&>label]:px-3.5 [&>label]:text-sm',
].join(' ');

const FIELD_LABEL_CLASS = 'mb-1.5 block text-xs font-medium text-[var(--ads-text-muted)]';

export default function AppearanceSettings() {
    const rows = useValuesStore((state) => state.ui_settings) ?? [];
    const row = rows.find((item) => item.setting_key === 'layout.sider');
    const storedConfig = useMemo(() => normalizeSiderConfig(row?.setting_value), [row?.setting_value]);
    const [draft, setDraft] = useState(storedConfig);
    const [paletteMode, setPaletteMode] = useState('light');
    const [systemDark, setSystemDark] = useState(
        () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
    const [saving, setSaving] = useState(false);
    const themePackInputRef = useRef(null);
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const canUpdate = useCan('update:ui_settings');
    const { message } = useNotification();
    const { clearPreference, hasPreference, mode } = useTheme();

    useEffect(() => setDraft(storedConfig), [storedConfig, row?.version]);

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const update = (event) => setSystemDark(event.matches);
        media.addEventListener?.('change', update);
        return () => media.removeEventListener?.('change', update);
    }, []);

    const normalizedDraft = useMemo(() => normalizeSiderConfig(draft), [draft]);
    const previewIsDark = normalizedDraft.application.colorMode === 'dark'
        || (normalizedDraft.application.colorMode === 'system' && systemDark);
    const previewColors = getAppearancePalette(normalizedDraft, previewIsDark);
    const previewStyle = useMemo(
        () => createAdsStyle(normalizedDraft, previewIsDark),
        [normalizedDraft, previewIsDark],
    );
    const isDirty = JSON.stringify(normalizedDraft) !== JSON.stringify(storedConfig);

    useEffect(() => {
        if (!isDirty) return undefined;
        const warnAboutUnsavedChanges = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnAboutUnsavedChanges);
        return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
    }, [isDirty]);

    const updateRoot = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const updateBrand = (key, value) => setDraft((current) => ({
        ...current,
        brand: { ...current.brand, [key]: value },
    }));
    const updateColor = (key, value) => {
        const section = paletteMode === 'dark' ? 'darkColors' : 'colors';
        setDraft((current) => ({
            ...current,
            [section]: { ...current[section], [key]: value },
        }));
    };
    const updateSection = (section, key, value) => setDraft((current) => ({
        ...current,
        [section]: { ...current[section], [key]: value },
    }));

    const exportThemePack = () => {
        const rows = [
            ['theme_name', 'mode', 'token', 'value'],
            ...['light', 'dark'].flatMap((mode) => {
                const palette = normalizedDraft[mode === 'dark' ? 'darkColors' : 'colors'];
                return COLOR_FIELDS.map(([token]) => [draft.brand.name, mode, token, palette[token]]);
            }),
        ];
        const csv = rows.map((cells) => cells.map(toCsvCell).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = `${draft.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'appearance'}-theme.csv`;
        anchor.click();
        URL.revokeObjectURL(href);
    };

    const importThemePack = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 100 * 1024) {
            message.error('Theme CSV files must be smaller than 100 KB.');
            return;
        }
        try {
            const palettes = parseThemePack(await file.text());
            setDraft((current) => ({
                ...current,
                colors: palettes.light,
                darkColors: palettes.dark,
            }));
            message.success('Light and dark palettes imported into the draft. Review the preview, then save.');
        } catch (error) {
            message.error(error.message || 'Unable to import this theme CSV.');
        }
    };

    const save = async () => {
        if (!row?.id || !canUpdate || !isDirty) return;
        setSaving(true);
        try {
            await dataProvider.custom({
                url: `api/v1/ui-settings/${row.id}`,
                method: 'put',
                payload: {
                    settingValue: normalizedDraft,
                    expectedVersion: Number(row.version),
                },
            });
            await queryClient.refetchQueries({ queryKey: queryKeys.bootstrap(), exact: true, type: 'active' });
            message.success('Appearance settings applied to active sessions.');
        } catch (error) {
            message.error(error?.message || 'Unable to update appearance settings.');
        } finally {
            setSaving(false);
        }
    };

    if (!row) {
        return <Alert type="error" showIcon title="The layout.sider configuration is unavailable." />;
    }

    return (
        <main className="min-h-full bg-[var(--ads-canvas)] p-3 text-[var(--ads-text)] md:p-4 xl:p-5">
            <header className="mx-auto grid max-w-[var(--app-content-max-width)] grid-cols-1 items-center gap-5 border-b border-[var(--ads-border-subtle)] pb-6 min-[1180px]:grid-cols-[minmax(0,1fr)_auto] min-[1180px]:gap-7">
                <div className="flex min-w-0 items-start gap-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-[var(--ads-radius-md)] border border-[var(--ads-border)] bg-[var(--ads-surface)] text-lg text-[var(--ads-accent)] shadow-[var(--ads-shadow-xs)]" aria-hidden="true"><BgColorsOutlined /></span>
                    <div>
                        <Title level={2} className="!mb-1 !text-[clamp(1.5rem,2vw,2rem)] !leading-tight">Appearance</Title>
                        <Paragraph className="!mb-0 !max-w-[680px] !text-[var(--ads-text-muted)]">
                            Configure the workspace shell, component rhythm, and semantic color system.
                        </Paragraph>
                    </div>
                </div>
                <div className="flex flex-col items-start gap-2.5 min-[1180px]:items-end">
                    <div className="flex flex-wrap justify-start gap-1 min-[1180px]:justify-end" aria-live="polite">
                        <Tag bordered={false}>Version {row.version}</Tag>
                        {isDirty ? <Tag color="warning">Unsaved changes</Tag> : <Tag color="success">Up to date</Tag>}
                    </div>
                    <Space wrap>
                        <Button disabled={saving} onClick={() => setDraft(normalizeSiderConfig(DEFAULT_SIDER_CONFIG))}>
                            ADS Defaults
                        </Button>
                        <Button icon={<ReloadOutlined />} disabled={!isDirty || saving} onClick={() => setDraft(storedConfig)}>
                            Revert
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            disabled={!canUpdate || !isDirty}
                            onClick={save}
                        >
                            Save &amp; Apply
                        </Button>
                    </Space>
                </div>
            </header>

            <section
                className="mx-auto mt-4 grid max-w-[var(--app-content-max-width)] grid-cols-1 overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)] sm:grid-cols-2 xl:grid-cols-4 [&>div]:grid [&>div]:grid-cols-[auto_1fr] [&>div]:items-center [&>div]:gap-x-3 [&>div]:border-b [&>div]:border-[var(--ads-border-subtle)] [&>div]:p-4 sm:[&>div]:border-r xl:[&>div]:border-b-0 [&>div:nth-child(2n)]:border-r-0 xl:[&>div:nth-child(2)]:border-r xl:[&>div:last-child]:border-r-0 [&>div>svg]:row-span-2 [&>div>svg]:text-lg [&>div>svg]:text-[var(--ads-accent)] [&>div>span]:text-xs [&>div>span]:text-[var(--ads-text-muted)] [&>div>strong]:mt-0.5 [&>div>strong]:capitalize"
                aria-label="Current appearance configuration"
            >
                <div>
                    <LayoutOutlined aria-hidden="true" />
                    <span>Color mode</span>
                    <strong>{draft.application.colorMode === 'system' ? 'Follow device' : draft.application.colorMode}</strong>
                </div>
                <div>
                    <ControlOutlined aria-hidden="true" />
                    <span>Density</span>
                    <strong>{draft.application.density}</strong>
                </div>
                <div>
                    <BorderOutlined aria-hidden="true" />
                    <span>Corner radius</span>
                    <strong>{draft.application.borderRadius}px</strong>
                </div>
                <div>
                    <ColumnWidthOutlined aria-hidden="true" />
                    <span>Control height</span>
                    <strong>{draft.application.controlHeight}px</strong>
                </div>
            </section>

            {!canUpdate && (
                <Alert
                    className="mx-auto mt-4 max-w-[var(--app-content-max-width)]"
                    type="warning"
                    showIcon
                    title="You can preview these settings, but update:ui_settings is required to save them."
                />
            )}

            {hasPreference && (
                <Alert
                    className="mx-auto mt-4 max-w-[var(--app-content-max-width)]"
                    type="info"
                    showIcon
                    title={`A personal ${mode} mode override is active`}
                    description="Workspace color-mode changes will apply after the personal override is cleared."
                    action={<Button size="small" onClick={clearPreference}>Use Workspace Setting</Button>}
                />
            )}

            <div className="mx-auto mt-4 grid max-w-[var(--app-content-max-width)] grid-cols-1 items-start gap-4 min-[1200px]:grid-cols-12">
                <div className="min-w-0 min-[1200px]:col-span-6">
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <Card className={CARD_CLASS} title={<><ControlOutlined /> Navigation &amp; Shell</>}>
                            <Form layout="vertical" requiredMark={false}>
                                <Row gutter={16}>
                                    <Col xs={24} md={8}>
                                        <Form.Item label="Layout variant">
                                            <Select aria-label="Layout variant" value={draft.variant} onChange={(value) => updateRoot('variant', value)} options={[
                                                'premium', 'sider', 'default', 'floating', 'icon-rail', 'top', 'none',
                                            ].map((value) => ({ value, label: value }))} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item label="Responsive breakpoint">
                                            <Select aria-label="Responsive breakpoint" value={draft.breakpoint} onChange={(value) => updateRoot('breakpoint', value)} options={
                                                ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map((value) => ({ value, label: value.toUpperCase() }))
                                            } />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item label="Sidebar theme">
                                            <Select aria-label="Sidebar theme" value={draft.theme} onChange={(value) => updateRoot('theme', value)} options={[
                                                { value: 'dark', label: 'Dark' },
                                                { value: 'light', label: 'Light' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <div className={BORDERED_SLIDER_ROW_CLASS}>
                                    <div>
                                        <Text strong>Expanded width</Text>
                                        <Slider aria-label="Expanded sidebar width" min={180} max={360} value={draft.width} onChange={(value) => updateRoot('width', value)} />
                                    </div>
                                    <InputNumber aria-label="Expanded sidebar width in pixels" min={180} max={360} value={draft.width} onChange={(value) => updateRoot('width', value)} addonAfter="px" />
                                </div>
                                <div className={BORDERED_SLIDER_ROW_CLASS}>
                                    <div>
                                        <Text strong>Collapsed width</Text>
                                        <Slider aria-label="Collapsed sidebar width" min={48} max={120} value={draft.collapsedWidth} onChange={(value) => updateRoot('collapsedWidth', value)} />
                                    </div>
                                    <InputNumber aria-label="Collapsed sidebar width in pixels" min={48} max={120} value={draft.collapsedWidth} onChange={(value) => updateRoot('collapsedWidth', value)} addonAfter="px" />
                                </div>
                                <div className={BORDERED_SLIDER_ROW_CLASS}>
                                    <div>
                                        <Text strong>Header height</Text>
                                        <Slider aria-label="Header height" min={48} max={96} value={draft.headerHeight} onChange={(value) => updateRoot('headerHeight', value)} />
                                    </div>
                                    <InputNumber aria-label="Header height in pixels" min={48} max={96} value={draft.headerHeight} onChange={(value) => updateRoot('headerHeight', value)} addonAfter="px" />
                                </div>

                                <div className={SWITCH_GRID_CLASS}>
                                    <label><Switch checked={draft.collapsible} onChange={(value) => updateRoot('collapsible', value)} /> Collapsible</label>
                                    <label><Switch checked={draft.defaultCollapsed} disabled={!draft.collapsible} onChange={(value) => updateRoot('defaultCollapsed', value)} /> Start collapsed</label>
                                    <label><Switch checked={draft.isGrouped} onChange={(value) => updateRoot('isGrouped', value)} /> Group navigation</label>
                                </div>
                            </Form>
                        </Card>

                        <Card className={CARD_CLASS} title={<><AppstoreOutlined /> Application &amp; Components</>}>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} md={8}>
                                    <Text className={FIELD_LABEL_CLASS}>Color mode</Text>
                                    <Select
                                        aria-label="Application color mode"
                                        style={{ width: '100%' }}
                                        value={draft.application.colorMode}
                                        onChange={(value) => updateSection('application', 'colorMode', value)}
                                        options={[
                                            { value: 'light', label: 'Light' },
                                            { value: 'dark', label: 'Dark' },
                                            { value: 'system', label: 'Follow device' },
                                        ]}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className={FIELD_LABEL_CLASS}>Component density</Text>
                                    <Select
                                        aria-label="Component density"
                                        style={{ width: '100%' }}
                                        value={draft.application.density}
                                        onChange={(value) => updateSection('application', 'density', value)}
                                        options={[
                                            { value: 'compact', label: 'Compact' },
                                            { value: 'comfortable', label: 'Comfortable' },
                                            { value: 'spacious', label: 'Spacious' },
                                        ]}
                                    />
                                </Col>
                                <Col xs={24} md={8} className="flex min-h-[68px] flex-col justify-between">
                                    <Text className={FIELD_LABEL_CLASS}>Interface motion</Text>
                                    <Switch
                                        checked={draft.application.motionEnabled}
                                        checkedChildren="On"
                                        unCheckedChildren="Off"
                                        onChange={(value) => updateSection('application', 'motionEnabled', value)}
                                    />
                                </Col>
                            </Row>
                            <div className={BORDERED_SLIDER_ROW_CLASS}>
                                <div><Text strong>Corner radius</Text><Slider aria-label="Component corner radius" min={0} max={20} value={draft.application.borderRadius} onChange={(value) => updateSection('application', 'borderRadius', value)} /></div>
                                <InputNumber aria-label="Component corner radius in pixels" min={0} max={20} value={draft.application.borderRadius} onChange={(value) => updateSection('application', 'borderRadius', value)} addonAfter="px" />
                            </div>
                            <div className={BORDERED_SLIDER_ROW_CLASS}>
                                <div><Text strong>Control height</Text><Slider aria-label="Component control height" min={28} max={52} value={draft.application.controlHeight} onChange={(value) => updateSection('application', 'controlHeight', value)} /></div>
                                <InputNumber aria-label="Component control height in pixels" min={28} max={52} value={draft.application.controlHeight} onChange={(value) => updateSection('application', 'controlHeight', value)} addonAfter="px" />
                            </div>
                            <div className={BORDERED_SLIDER_ROW_CLASS}>
                                <div><Text strong>Base font size</Text><Slider aria-label="Base font size" min={12} max={18} value={draft.application.fontSize} onChange={(value) => updateSection('application', 'fontSize', value)} /></div>
                                <InputNumber aria-label="Base font size in pixels" min={12} max={18} value={draft.application.fontSize} onChange={(value) => updateSection('application', 'fontSize', value)} addonAfter="px" />
                            </div>
                        </Card>

                        <Card className={CARD_CLASS} title="Content & Workspace Header">
                            <div className={BORDERED_SLIDER_ROW_CLASS}>
                                <div><Text strong>Content maximum width</Text><Slider aria-label="Content maximum width" min={960} max={2400} step={40} value={draft.content.maxWidth} onChange={(value) => updateSection('content', 'maxWidth', value)} /></div>
                                <InputNumber aria-label="Content maximum width in pixels" min={960} max={2400} value={draft.content.maxWidth} onChange={(value) => updateSection('content', 'maxWidth', value)} addonAfter="px" />
                            </div>
                            <div className={BORDERED_SLIDER_ROW_CLASS}>
                                <div><Text strong>Content padding</Text><Slider aria-label="Content padding" min={8} max={48} value={draft.content.padding} onChange={(value) => updateSection('content', 'padding', value)} /></div>
                                <InputNumber aria-label="Content padding in pixels" min={8} max={48} value={draft.content.padding} onChange={(value) => updateSection('content', 'padding', value)} addonAfter="px" />
                            </div>
                            <div className={SWITCH_GRID_CLASS}>
                                <label><Switch checked={draft.header.sticky} onChange={(value) => updateSection('header', 'sticky', value)} /> Sticky header</label>
                                <label><Switch checked={draft.header.showSystemStatus} onChange={(value) => updateSection('header', 'showSystemStatus', value)} /> System status</label>
                                <label><Switch checked={draft.header.showRole} onChange={(value) => updateSection('header', 'showRole', value)} /> Active role</label>
                            </div>
                        </Card>

                        <Card className={CARD_CLASS} title="Brand & Navigation">
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Text className={FIELD_LABEL_CLASS}>Application name</Text>
                                    <Input aria-label="Application name" name="applicationName" autoComplete="off" value={draft.brand.name} maxLength={80} onChange={(event) => updateBrand('name', event.target.value)} />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className={FIELD_LABEL_CLASS}>Caption</Text>
                                    <Input aria-label="Application caption" name="applicationCaption" autoComplete="off" value={draft.brand.caption} maxLength={80} onChange={(event) => updateBrand('caption', event.target.value)} />
                                </Col>
                                <Col xs={24} md={4}>
                                    <Text className={FIELD_LABEL_CLASS}>Mark</Text>
                                    <Input aria-label="Application mark" name="applicationMark" autoComplete="off" value={draft.brand.mark} maxLength={2} onChange={(event) => updateBrand('mark', event.target.value)} />
                                </Col>
                            </Row>
                            <Row gutter={16} className="mt-4">
                                <Col xs={24} md={8}>
                                    <Text className={FIELD_LABEL_CLASS}>Group style</Text>
                                    <Select aria-label="Navigation group style" style={{ width: '100%' }} value={draft.groupVariant} onChange={(value) => updateRoot('groupVariant', value)} options={[
                                        { value: 'group', label: 'Section labels' },
                                        { value: 'dropdown', label: 'Collapsible groups' },
                                    ]} />
                                </Col>
                                <Col xs={24} md={16}>
                                    <Text className={FIELD_LABEL_CLASS}>Pinned route</Text>
                                    <Input aria-label="Pinned route" name="pinnedRoute" autoComplete="off" value={draft.bottomKey} onChange={(event) => updateRoot('bottomKey', event.target.value)} />
                                </Col>
                            </Row>
                        </Card>

                        <Card
                            className={CARD_CLASS}
                            title={<><BgColorsOutlined /> ADS Semantic Colors</>}
                            extra={(
                                <Segmented
                                    aria-label="Palette to edit"
                                    value={paletteMode}
                                    onChange={setPaletteMode}
                                    options={[
                                        { value: 'light', label: 'Light palette' },
                                        { value: 'dark', label: 'Dark palette' },
                                    ]}
                                />
                            )}
                        >
                            <Paragraph className="!mb-4 !max-w-[720px] !text-[var(--ads-text-muted)]">
                                These values feed the public <Text code>--ads-*</Text> contract. Component hover,
                                focus, selected, and feedback states are derived automatically.
                            </Paragraph>
                            <div className="mb-4 flex flex-col gap-3 rounded-[var(--ads-radius-md)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface-raised)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 gap-3">
                                    <FileTextOutlined className="mt-0.5 text-lg text-[var(--ads-accent)]" aria-hidden="true" />
                                    <div>
                                        <Text strong className="block">Theme pack CSV</Text>
                                        <Text className="block text-xs !text-[var(--ads-text-muted)]">
                                            Import all semantic tokens for both light and dark mode, or export the current pack as a template.
                                        </Text>
                                    </div>
                                </div>
                                <Space wrap>
                                    <Button icon={<DownloadOutlined />} onClick={exportThemePack}>Export CSV</Button>
                                    <Button icon={<UploadOutlined />} onClick={() => themePackInputRef.current?.click()}>Import CSV</Button>
                                    <input
                                        ref={themePackInputRef}
                                        className="hidden"
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={importThemePack}
                                    />
                                </Space>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                {COLOR_FIELDS.map(([key, label]) => (
                                    <div
                                        className="flex min-w-0 flex-col gap-2 rounded-[var(--ads-radius-md)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface-raised)] p-3 [&_.ant-color-picker-trigger]:w-full [&_.ant-color-picker-trigger]:justify-start"
                                        key={key}
                                    >
                                        <Text className="block text-xs font-medium leading-5 text-[var(--ads-text-muted)]">
                                            {label}
                                        </Text>
                                        <ColorPicker
                                            aria-label={`${label} color for the ${paletteMode} palette`}
                                            value={draft[paletteMode === 'dark' ? 'darkColors' : 'colors'][key]}
                                            showText
                                            onChange={(_, css) => updateColor(key, css)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Space>
                </div>

                <aside className="min-w-0 min-[1200px]:sticky min-[1200px]:top-4 min-[1200px]:col-span-6 min-[1200px]:self-start">
                    <Card
                        className={CARD_CLASS}
                        title={<><EyeOutlined /> Live Preview</>}
                    >
                        <div
                            className={`ads-theme ads-v1 grid min-h-[440px] overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] shadow-[var(--ads-shadow-sm)] ${previewIsDark ? 'ads-dark' : ''}`}
                            style={{
                                ...previewStyle,
                                background: previewColors.contentBg,
                                gridTemplateColumns: draft.defaultCollapsed && draft.collapsible
                                    ? '64px minmax(0, 1fr)'
                                    : 'minmax(150px, 38%) minmax(0, 1fr)',
                            }}
                        >
                            <aside
                                className={`min-w-0 overflow-hidden p-3 ${draft.defaultCollapsed && draft.collapsible ? 'text-center' : ''}`}
                                style={{ background: previewColors.siderBg, color: previewColors.textPrimary }}
                            >
                                <div className="mb-7 flex min-w-0 items-center gap-2">
                                    <b className="grid size-[30px] shrink-0 place-items-center rounded-[var(--ads-radius-sm)] text-xs font-semibold" style={{ background: previewColors.accent, color: previewColors.accentText }}>{draft.brand.mark}</b>
                                    {!(draft.defaultCollapsed && draft.collapsible) && <span className="min-w-0 text-left"><strong className="block truncate text-[11px]">{draft.brand.name}</strong><small className="block truncate text-[8px]" style={{ color: previewColors.textMuted }}>{draft.brand.caption}</small></span>}
                                </div>
                                {!(draft.defaultCollapsed && draft.collapsible) && <small className="mb-3 block text-left text-[8px] font-semibold tracking-[0.12em]" style={{ color: previewColors.textMuted }}>WORKSPACE</small>}
                                {['Overview', 'Users', 'Permissions', 'Appearance'].map((label, index) => (
                                    <div
                                        className="my-0.5 flex min-h-[34px] items-center gap-2 rounded-[var(--ads-radius-sm)] border-l-2 border-transparent p-2 text-left text-[10px]"
                                        key={label}
                                        style={index === 3 ? { background: previewColors.itemActive, borderColor: previewColors.accent } : undefined}
                                    >
                                        {index === 3 && <CheckOutlined style={{ color: previewColors.accent }} />}
                                        {!(draft.defaultCollapsed && draft.collapsible) && <span>{label}</span>}
                                    </div>
                                ))}
                            </aside>
                            <section className="min-w-0">
                                <header className="flex h-12 items-center justify-between border-b px-4 text-[11px] font-semibold" style={{ background: previewColors.headerBg, borderColor: previewColors.strongBorder }}>
                                    <span style={{ color: previewColors.bodyText }}>Appearance</span>
                                    {draft.header.showSystemStatus && <i className="size-2 rounded-full" style={{ background: previewColors.success }} />}
                                </header>
                                <div
                                    style={{ padding: Math.max(10, draft.content.padding / 2) }}
                                >
                                    <Card size="small" title="Monthly Overview" extra={<Tag color="success">Healthy</Tag>}>
                                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                            <Input name="appearancePreviewSearch" autoComplete="off" placeholder="Search transactions…" aria-label="Preview search input" />
                                            <Progress percent={68} size="small" />
                                            <Checkbox defaultChecked>Notify finance team</Checkbox>
                                            <Space wrap>
                                                <Button type="primary" size="small">Create Report</Button>
                                                <Button size="small">Export</Button>
                                            </Space>
                                        </Space>
                                    </Card>
                                </div>
                            </section>
                        </div>
                        <Alert
                            className="mt-3.5"
                            type="info"
                            showIcon
                            title="Preview is local until you save"
                            description="Saving validates the complete configuration, increments its version, and updates active sessions."
                        />
                    </Card>
                </aside>
            </div>
        </main>
    );
}
