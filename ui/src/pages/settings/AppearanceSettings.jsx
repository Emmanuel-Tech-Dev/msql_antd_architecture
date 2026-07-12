import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    ColorPicker,
    Form,
    Input,
    InputNumber,
    Row,
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
    CheckOutlined,
    ControlOutlined,
    EyeOutlined,
    ReloadOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useStore as useValuesStore } from '../../store/values-store';
import { useDataProvider } from '../../core/provider/DataProvider';
import useCan from '../../core/hooks/access/useCan';
import useNotification from '../../hooks/useNotification';
import { normalizeSiderConfig } from '../../core/config/siderConfig';
import queryKeys from '../../core/queryKeys';
import './AppearanceSettings.css';

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
];

export default function AppearanceSettings() {
    const rows = useValuesStore((state) => state.ui_settings) ?? [];
    const row = rows.find((item) => item.setting_key === 'layout.sider');
    const storedConfig = useMemo(() => normalizeSiderConfig(row?.setting_value), [row?.setting_value]);
    const [draft, setDraft] = useState(storedConfig);
    const [saving, setSaving] = useState(false);
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const canUpdate = useCan('update:ui_settings');
    const { message } = useNotification();

    useEffect(() => setDraft(storedConfig), [storedConfig, row?.version]);

    const normalizedDraft = useMemo(() => normalizeSiderConfig(draft), [draft]);
    const previewColors = useMemo(() => {
        const dark = normalizedDraft.application.colorMode === 'dark'
            || (normalizedDraft.application.colorMode === 'system'
                && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (!dark) return normalizedDraft.colors;
        return {
            ...normalizedDraft.colors,
            headerBg: '#141210', contentBg: '#0e0d0b', surfaceBg: '#1c1a17',
            elevatedBg: '#141210', bodyText: '#f0ede8', secondaryText: '#a89f94',
            border: '#1e1c18', strongBorder: '#2e2b26',
        };
    }, [normalizedDraft]);
    const isDirty = JSON.stringify(normalizedDraft) !== JSON.stringify(storedConfig);

    const updateRoot = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const updateBrand = (key, value) => setDraft((current) => ({
        ...current,
        brand: { ...current.brand, [key]: value },
    }));
    const updateColor = (key, value) => setDraft((current) => ({
        ...current,
        colors: { ...current.colors, [key]: value },
    }));
    const updateSection = (section, key, value) => setDraft((current) => ({
        ...current,
        [section]: { ...current[section], [key]: value },
    }));

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
        return <Alert type="error" showIcon message="The layout.sider configuration is unavailable." />;
    }

    return (
        <main className="appearance-page">
            <header className="appearance-header">
                <div>
                    <Text className="appearance-kicker">SYSTEM / DESIGN LANGUAGE</Text>
                    <Title level={2}>Appearance settings</Title>
                    <Paragraph>
                        Control the application shell, shared Ant Design components, content rhythm,
                        color system, and motion without rebuilding the frontend.
                    </Paragraph>
                </div>
                <Space wrap>
                    <Tag>Version {row.version}</Tag>
                    {isDirty && <Tag color="orange">Unsaved changes</Tag>}
                    <Button icon={<ReloadOutlined />} disabled={!isDirty || saving} onClick={() => setDraft(storedConfig)}>
                        Reset
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        disabled={!canUpdate || !isDirty}
                        onClick={save}
                    >
                        Save and apply
                    </Button>
                </Space>
            </header>

            {!canUpdate && (
                <Alert
                    className="appearance-access-alert"
                    type="warning"
                    showIcon
                    message="You can preview these settings, but update:ui_settings is required to save them."
                />
            )}

            <Row gutter={[20, 20]} align="stretch">
                <Col xs={24} xl={15}>
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <Card className="appearance-card" title={<><ControlOutlined /> Navigation and shell</>}>
                            <Form layout="vertical" requiredMark={false}>
                                <Row gutter={16}>
                                    <Col xs={24} md={8}>
                                        <Form.Item label="Layout variant">
                                            <Select value={draft.variant} onChange={(value) => updateRoot('variant', value)} options={[
                                                'premium', 'sider', 'default', 'floating', 'icon-rail', 'top', 'none',
                                            ].map((value) => ({ value, label: value }))} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item label="Responsive breakpoint">
                                            <Select value={draft.breakpoint} onChange={(value) => updateRoot('breakpoint', value)} options={
                                                ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map((value) => ({ value, label: value.toUpperCase() }))
                                            } />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item label="Sidebar theme">
                                            <Select value={draft.theme} onChange={(value) => updateRoot('theme', value)} options={[
                                                { value: 'dark', label: 'Dark' },
                                                { value: 'light', label: 'Light' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <div className="appearance-slider-row">
                                    <div>
                                        <Text strong>Expanded width</Text>
                                        <Slider min={180} max={360} value={draft.width} onChange={(value) => updateRoot('width', value)} />
                                    </div>
                                    <InputNumber min={180} max={360} value={draft.width} onChange={(value) => updateRoot('width', value)} addonAfter="px" />
                                </div>
                                <div className="appearance-slider-row">
                                    <div>
                                        <Text strong>Collapsed width</Text>
                                        <Slider min={48} max={120} value={draft.collapsedWidth} onChange={(value) => updateRoot('collapsedWidth', value)} />
                                    </div>
                                    <InputNumber min={48} max={120} value={draft.collapsedWidth} onChange={(value) => updateRoot('collapsedWidth', value)} addonAfter="px" />
                                </div>
                                <div className="appearance-slider-row">
                                    <div>
                                        <Text strong>Header height</Text>
                                        <Slider min={48} max={96} value={draft.headerHeight} onChange={(value) => updateRoot('headerHeight', value)} />
                                    </div>
                                    <InputNumber min={48} max={96} value={draft.headerHeight} onChange={(value) => updateRoot('headerHeight', value)} addonAfter="px" />
                                </div>

                                <div className="appearance-switches">
                                    <label><Switch checked={draft.collapsible} onChange={(value) => updateRoot('collapsible', value)} /> Collapsible</label>
                                    <label><Switch checked={draft.defaultCollapsed} disabled={!draft.collapsible} onChange={(value) => updateRoot('defaultCollapsed', value)} /> Start collapsed</label>
                                    <label><Switch checked={draft.isGrouped} onChange={(value) => updateRoot('isGrouped', value)} /> Group navigation</label>
                                </div>
                            </Form>
                        </Card>

                        <Card className="appearance-card" title={<><AppstoreOutlined /> Application and components</>}>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} md={8}>
                                    <Text className="appearance-label">Color mode</Text>
                                    <Select
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
                                    <Text className="appearance-label">Component density</Text>
                                    <Select
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
                                <Col xs={24} md={8} className="appearance-switch-field">
                                    <Text className="appearance-label">Interface motion</Text>
                                    <Switch
                                        checked={draft.application.motionEnabled}
                                        checkedChildren="On"
                                        unCheckedChildren="Off"
                                        onChange={(value) => updateSection('application', 'motionEnabled', value)}
                                    />
                                </Col>
                            </Row>
                            <div className="appearance-slider-row">
                                <div><Text strong>Corner radius</Text><Slider min={0} max={20} value={draft.application.borderRadius} onChange={(value) => updateSection('application', 'borderRadius', value)} /></div>
                                <InputNumber min={0} max={20} value={draft.application.borderRadius} onChange={(value) => updateSection('application', 'borderRadius', value)} addonAfter="px" />
                            </div>
                            <div className="appearance-slider-row">
                                <div><Text strong>Control height</Text><Slider min={28} max={52} value={draft.application.controlHeight} onChange={(value) => updateSection('application', 'controlHeight', value)} /></div>
                                <InputNumber min={28} max={52} value={draft.application.controlHeight} onChange={(value) => updateSection('application', 'controlHeight', value)} addonAfter="px" />
                            </div>
                            <div className="appearance-slider-row">
                                <div><Text strong>Base font size</Text><Slider min={12} max={18} value={draft.application.fontSize} onChange={(value) => updateSection('application', 'fontSize', value)} /></div>
                                <InputNumber min={12} max={18} value={draft.application.fontSize} onChange={(value) => updateSection('application', 'fontSize', value)} addonAfter="px" />
                            </div>
                        </Card>

                        <Card className="appearance-card" title="Content and workspace header">
                            <div className="appearance-slider-row">
                                <div><Text strong>Content maximum width</Text><Slider min={960} max={2400} step={40} value={draft.content.maxWidth} onChange={(value) => updateSection('content', 'maxWidth', value)} /></div>
                                <InputNumber min={960} max={2400} value={draft.content.maxWidth} onChange={(value) => updateSection('content', 'maxWidth', value)} addonAfter="px" />
                            </div>
                            <div className="appearance-slider-row">
                                <div><Text strong>Content padding</Text><Slider min={8} max={48} value={draft.content.padding} onChange={(value) => updateSection('content', 'padding', value)} /></div>
                                <InputNumber min={8} max={48} value={draft.content.padding} onChange={(value) => updateSection('content', 'padding', value)} addonAfter="px" />
                            </div>
                            <div className="appearance-switches">
                                <label><Switch checked={draft.header.sticky} onChange={(value) => updateSection('header', 'sticky', value)} /> Sticky header</label>
                                <label><Switch checked={draft.header.showSystemStatus} onChange={(value) => updateSection('header', 'showSystemStatus', value)} /> System status</label>
                                <label><Switch checked={draft.header.showRole} onChange={(value) => updateSection('header', 'showRole', value)} /> Active role</label>
                            </div>
                        </Card>

                        <Card className="appearance-card" title="Brand and navigation">
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Text className="appearance-label">Application name</Text>
                                    <Input value={draft.brand.name} maxLength={80} onChange={(event) => updateBrand('name', event.target.value)} />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className="appearance-label">Caption</Text>
                                    <Input value={draft.brand.caption} maxLength={80} onChange={(event) => updateBrand('caption', event.target.value)} />
                                </Col>
                                <Col xs={24} md={4}>
                                    <Text className="appearance-label">Mark</Text>
                                    <Input value={draft.brand.mark} maxLength={2} onChange={(event) => updateBrand('mark', event.target.value)} />
                                </Col>
                            </Row>
                            <Row gutter={16} className="appearance-secondary-fields">
                                <Col xs={24} md={8}>
                                    <Text className="appearance-label">Group style</Text>
                                    <Select style={{ width: '100%' }} value={draft.groupVariant} onChange={(value) => updateRoot('groupVariant', value)} options={[
                                        { value: 'group', label: 'Section labels' },
                                        { value: 'dropdown', label: 'Collapsible groups' },
                                    ]} />
                                </Col>
                                <Col xs={24} md={16}>
                                    <Text className="appearance-label">Pinned route</Text>
                                    <Input value={draft.bottomKey} onChange={(event) => updateRoot('bottomKey', event.target.value)} />
                                </Col>
                            </Row>
                        </Card>

                        <Card className="appearance-card" title={<><BgColorsOutlined /> Color system</>}>
                            <div className="appearance-colors">
                                {COLOR_FIELDS.map(([key, label]) => (
                                    <div className="appearance-color" key={key}>
                                        <ColorPicker
                                            value={draft.colors[key]}
                                            showText
                                            onChange={(_, css) => updateColor(key, css)}
                                        />
                                        <Text>{label}</Text>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Space>
                </Col>

                <Col xs={24} xl={9}>
                    <Card className="appearance-preview-card" title={<><EyeOutlined /> Live preview</>}>
                        <div
                            className="appearance-preview"
                            style={{
                                background: previewColors.contentBg,
                                gridTemplateColumns: draft.defaultCollapsed && draft.collapsible
                                    ? '64px minmax(0, 1fr)'
                                    : 'minmax(150px, 38%) minmax(0, 1fr)',
                            }}
                        >
                            <aside
                                className={draft.defaultCollapsed && draft.collapsible ? 'is-collapsed' : undefined}
                                style={{ background: previewColors.siderBg, color: previewColors.textPrimary }}
                            >
                                <div className="appearance-preview__brand">
                                    <b style={{ background: previewColors.accent, color: previewColors.accentText }}>{draft.brand.mark}</b>
                                    {!(draft.defaultCollapsed && draft.collapsible) && <span><strong>{draft.brand.name}</strong><small style={{ color: previewColors.textMuted }}>{draft.brand.caption}</small></span>}
                                </div>
                                {!(draft.defaultCollapsed && draft.collapsible) && <small style={{ color: previewColors.textMuted }}>WORKSPACE</small>}
                                {['Overview', 'Users', 'Permissions', 'Appearance'].map((label, index) => (
                                    <div
                                        className="appearance-preview__item"
                                        key={label}
                                        style={index === 3 ? { background: previewColors.itemActive, borderColor: previewColors.accent } : undefined}
                                    >
                                        {index === 3 && <CheckOutlined style={{ color: previewColors.accent }} />}
                                        {!(draft.defaultCollapsed && draft.collapsible) && <span>{label}</span>}
                                    </div>
                                ))}
                            </aside>
                            <section>
                                <header style={{ background: previewColors.headerBg, borderColor: previewColors.strongBorder }}>
                                    <span style={{ color: previewColors.bodyText }}>Appearance</span>
                                    {draft.header.showSystemStatus && <i style={{ background: previewColors.success }} />}
                                </header>
                                <div
                                    className="appearance-preview__content"
                                    style={{ padding: Math.max(10, draft.content.padding / 2) }}
                                >
                                    <span style={{ background: previewColors.accent }} />
                                    <span style={{ background: previewColors.surfaceBg, borderRadius: draft.application.borderRadius / 2 }} />
                                    <span style={{ background: previewColors.surfaceBg, borderRadius: draft.application.borderRadius / 2 }} />
                                </div>
                            </section>
                        </div>
                        <Alert
                            className="appearance-preview-note"
                            type="info"
                            showIcon
                            message="Preview is local until you save"
                            description="Saving validates the complete configuration, increments its version, and updates active sessions."
                        />
                    </Card>
                </Col>
            </Row>
        </main>
    );
}
