import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, InputNumber, Input, Segmented, Select, Slider, Switch, Tooltip } from 'antd';
import {
    CheckOutlined,
    DesktopOutlined,
    DownloadOutlined,
    DownOutlined,
    EyeOutlined,
    MoonOutlined,
    RightOutlined,
    RollbackOutlined,
    SunOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useStore as useValuesStore } from '../../store/values-store';
import { useDataProvider } from '../../core/provider/DataProvider';
import useCan from '../../core/hooks/access/useCan';
import useNotification from '../../hooks/useNotification';
import { useTheme } from '../../hooks/useTheme';
import { DEFAULT_SIDER_CONFIG, normalizeSiderConfig } from '../../core/config/siderConfig';
import queryKeys from '../../core/queryKeys';
import { FONT_OPTIONS, parseThemePack, themePackCsv } from './appearance/themePack';
import { COLLAPSE_BREAKPOINTS, FONT_ROLES, LAYOUT_STYLES, describeChanges, paletteKey } from './appearance/appearanceFields';
import ColourSection from './appearance/ColourSection';
import AppearancePreview from './appearance/AppearancePreview';
import utils from '../../utils/function_utils';

const SECTIONS = [
    { id: 'theme', label: 'Theme' },
    { id: 'colours', label: 'Colours' },
    { id: 'text', label: 'Text' },
    { id: 'shape', label: 'Shape & spacing' },
    { id: 'layout', label: 'Sidebar & header', collapsible: true },
    { id: 'brand', label: 'Brand', collapsible: true },
];

const SECTION_CLASS = 'scroll-mt-24 rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-surface)] p-5';
const CAPTION_CLASS = 'font-[family-name:var(--ads-font-caption)] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.12em] text-[var(--ads-text-muted)]';
const ROW_CLASS = 'grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t border-[var(--ads-border-subtle)] pt-3 sm:grid-cols-[200px_minmax(0,1fr)_auto]';

function SectionHeading({ title, description, children }) {
    return (
        <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
                <h2 className="m-0 font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold">{title}</h2>
                {description && <p className="m-0 mt-0.5 text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">{description}</p>}
            </div>
            {children}
        </div>
    );
}

function RowLabel({ label, hint }) {
    return (
        <span className="flex flex-col">
            <span className="font-medium">{label}</span>
            {hint && <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{hint}</span>}
        </span>
    );
}

function SliderRow({ label, hint, min, max, step = 1, value, disabled, onChange }) {
    return (
        <div className={ROW_CLASS}>
            <RowLabel label={label} hint={hint} />
            <Slider aria-label={label} min={min} max={max} step={step} value={value} disabled={disabled} onChange={onChange} className="!m-0 !mx-1.5" />
            <InputNumber aria-label={`${label} in pixels`} min={min} max={max} step={step} value={value} disabled={disabled} onChange={(next) => next !== null && onChange(next)} addonAfter="px" className="!w-[112px]" />
        </div>
    );
}

function SwitchRow({ label, hint, checked, disabled, onChange }) {
    return (
        <label className="flex cursor-pointer items-center gap-4 border-t border-[var(--ads-border-subtle)] pt-3">
            <span className="min-w-0 flex-1"><RowLabel label={label} hint={hint} /></span>
            <Switch checked={checked} disabled={disabled} onChange={onChange} />
        </label>
    );
}

// Sidebar & header and Brand stay folded to a summary line until opened.
function FoldedSection({ id, title, summary, open, onToggle, children }) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className={`${SECTION_CLASS} !p-0`}>
            <h2 id={`${id}-title`} className="m-0">
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={onToggle}
                    className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[var(--ads-radius-lg)] border-0 bg-transparent px-5 text-left text-[var(--ads-text)] focus-visible:outline-2 focus-visible:outline-[var(--ads-focus)]"
                >
                    {open ? <DownOutlined className="text-xs text-[var(--ads-text-muted)]" /> : <RightOutlined className="text-xs text-[var(--ads-text-muted)]" />}
                    <span className="font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold">{title}</span>
                    {!open && <span className="min-w-0 flex-1 truncate text-[length:var(--ads-font-size-body-sm)] font-normal text-[var(--ads-text-muted)]">{summary}</span>}
                </button>
            </h2>
            {open && <div className="flex flex-col gap-3 px-5 pb-5">{children}</div>}
        </section>
    );
}

// "On this page": jumps to a section, highlights the one in view and marks
// sections with unsaved edits. A row of chips on narrow screens.
function SectionMenu({ active, unsavedSections, onJump }) {
    return (
        <nav aria-label="Appearance sections" className="sticky top-[76px] z-[5] -mx-1 flex gap-1 overflow-x-auto bg-[var(--ads-canvas)] px-1 py-1 min-[900px]:mx-0 min-[900px]:flex-col min-[900px]:overflow-visible min-[900px]:p-0">
            <span className={`${CAPTION_CLASS} hidden pb-2 min-[900px]:block`}>On this page</span>
            {SECTIONS.map((section) => {
                const isActive = active === section.id;
                return (
                    <button
                        key={section.id}
                        type="button"
                        aria-current={isActive ? 'location' : undefined}
                        onClick={() => onJump(section)}
                        className={`flex h-[34px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[var(--ads-radius-sm)] border-0 px-3 text-left font-medium focus-visible:outline-2 focus-visible:outline-[var(--ads-focus)] ${isActive
                            ? 'bg-[var(--ads-surface)] font-semibold text-[var(--ads-text)]'
                            : 'bg-transparent text-[var(--ads-text-muted)] hover:bg-[var(--ads-surface-hover)] hover:text-[var(--ads-text)]'}`}
                    >
                        <span className="flex-1">{section.label}</span>
                        {unsavedSections.has(section.id) && <i className="size-[7px] rounded-full bg-[var(--ads-warning)]" aria-label="unsaved changes" />}
                    </button>
                );
            })}
            <p className="m-0 hidden pt-3 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)] min-[900px]:block">A dot marks a section with unsaved changes.</p>
        </nav>
    );
}

export default function AppearanceSettings() {
    const rows = useValuesStore((state) => state.ui_settings) ?? [];
    const row = rows.find((item) => item.setting_key === 'layout.sider');
    const storedConfig = useMemo(() => normalizeSiderConfig(row?.setting_value), [row?.setting_value]);
    const [draft, setDraft] = useState(storedConfig);
    const [paletteMode, setPaletteMode] = useState('light');
    const [openFolds, setOpenFolds] = useState(() => new Set());
    const [activeSection, setActiveSection] = useState('theme');
    const [saving, setSaving] = useState(false);
    const themePackInputRef = useRef(null);
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const canUpdate = useCan('update:ui_settings');
    const { message } = useNotification();
    const { clearPreference, hasPreference, mode } = useTheme();

    useEffect(() => setDraft(storedConfig), [storedConfig, row?.version]);

    const normalizedDraft = useMemo(() => normalizeSiderConfig(draft), [draft]);
    const changes = useMemo(() => describeChanges(normalizedDraft, storedConfig), [normalizedDraft, storedConfig]);
    const unsavedSections = useMemo(() => new Set(changes.map((change) => change.section)), [changes]);
    const isDirty = JSON.stringify(normalizedDraft) !== JSON.stringify(storedConfig);
    const readOnly = !canUpdate;

    useEffect(() => {
        if (!isDirty) return undefined;
        const warnAboutUnsavedChanges = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnAboutUnsavedChanges);
        return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
    }, [isDirty]);

    // Highlight the section nearest the top of the screen.
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting);
            if (visible.length) setActiveSection(visible[0].target.id);
        }, { rootMargin: '-20% 0px -65% 0px' });
        SECTIONS.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });
        return () => observer.disconnect();
    }, []);

    const updateRoot = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const updateSection = (section, key, value) => setDraft((current) => ({
        ...current,
        [section]: { ...current[section], [key]: value },
    }));
    const updateApplication = (key, value) => updateSection('application', key, value);
    const updateFont = (key, value) => setDraft((current) => ({
        ...current,
        application: { ...current.application, fonts: { ...current.application.fonts, [key]: value } },
    }));
    const updateColour = (editedMode, token, value) => updateSection(paletteKey(editedMode), token, value);

    const toggleFold = (id, open) => setOpenFolds((current) => {
        const next = new Set(current);
        if (open ?? !next.has(id)) next.add(id);
        else next.delete(id);
        return next;
    });

    const jumpTo = (section) => {
        if (section.collapsible) toggleFold(section.id, true);
        setActiveSection(section.id);
        requestAnimationFrame(() => document.getElementById(section.id)?.scrollIntoView({
            behavior: utils.prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start',
        }));
    };

    // Reset brings back the default colours, fonts and sizes; the
    // sidebar and brand settings are kept.
    const resetTheme = () => setDraft((current) => {
        const defaults = normalizeSiderConfig(DEFAULT_SIDER_CONFIG);
        return { ...current, themeName: defaults.themeName, application: defaults.application, colors: defaults.colors, darkColors: defaults.darkColors };
    });

    // Everything back to the built-in defaults: theme, layout, sidebar and brand.
    const resetEverything = () => setDraft(normalizeSiderConfig(DEFAULT_SIDER_CONFIG));

    const exportThemePack = () => {
        const blob = new Blob([themePackCsv(normalizedDraft)], { type: 'text/csv;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = `${normalizedDraft.themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'appearance'}-theme.csv`;
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
            const themePack = parseThemePack(await file.text());
            setDraft((current) => ({
                ...current,
                themeName: themePack.themeName,
                application: {
                    ...current.application,
                    ...themePack.application,
                    fonts: { ...current.application.fonts, ...themePack.application.fonts },
                },
                colors: themePack.light,
                darkColors: themePack.dark,
            }));
            message.success(`“${themePack.themeName}” loaded into the preview. Check it, then save for everyone.`);
        } catch (error) {
            message.error(error.message || 'This theme CSV could not be read.');
        }
    };

    const save = async () => {
        if (!row?.id || readOnly || !isDirty) return;
        setSaving(true);
        try {
            await dataProvider.custom({
                url: `api/v1/ui-settings/${row.id}`,
                method: 'put',
                payload: { settingValue: normalizedDraft, expectedVersion: Number(row.version) },
            });
            await queryClient.refetchQueries({ queryKey: queryKeys.bootstrap(), exact: true, type: 'active' });
            message.success('Appearance saved. Everyone sees it on their next page load.');
        } catch (error) {
            message.error(error?.message || 'Appearance could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    if (!row) {
        return <Alert type="error" showIcon title="The appearance settings could not be loaded. Reload the page, or check that migrations have run." />;
    }

    const { application } = normalizedDraft;
    const palette = normalizedDraft[paletteKey(paletteMode)];
    const changedLabels = changes.map((change) => change.label);

    return (
        <main className="flex min-h-full flex-col gap-4 bg-[var(--ads-canvas)] text-[var(--ads-text)]">
            <header>
                <h1 className="m-0 text-[clamp(1.375rem,2vw,1.75rem)] font-semibold leading-tight text-[var(--ads-text-heading)]">Appearance</h1>
                <p className="m-0 mt-0.5 text-[var(--ads-text-muted)]">
                    How the app looks for everyone. Edits show in the preview first and apply to everyone when you save.
                </p>
            </header>

            {readOnly && (
                <Alert type="info" showIcon title="You can try changes in the preview, but only people allowed to change appearance can save them." />
            )}

            <div className="grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-[150px_minmax(0,1fr)] min-[1200px]:grid-cols-[150px_minmax(0,1fr)_360px]">
                <SectionMenu active={activeSection} unsavedSections={unsavedSections} onJump={jumpTo} />

                <div className="flex min-w-0 flex-col gap-4">
                    <section id="theme" aria-label="Theme" className={`${SECTION_CLASS} flex flex-col gap-3.5`}>
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="flex overflow-hidden rounded-[var(--ads-radius-md)] border border-[var(--ads-border)]" aria-hidden="true">
                                {['siderBg', 'contentBg', 'surfaceBg', 'accent', 'bodyText', 'success', 'warning', 'error'].map((token) => (
                                    <span key={token} className="h-[52px] w-[22px]" style={{ background: palette[token] }} />
                                ))}
                            </span>
                            <div className="min-w-0 flex-1">
                                <span className={CAPTION_CLASS}>Current theme</span>
                                <div className="font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h4)] font-semibold leading-tight">{normalizedDraft.themeName}</div>
                                <div className="text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">
                                    {application.fonts.heading} headings · {application.fonts.body} body · {application.borderRadius}px corners
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--ads-border-subtle)] pt-3">
                            <div className="min-w-[220px] flex-1">
                                <RowLabel label="Colour mode for everyone" hint="People can still switch for themselves with the sun icon in the header." />
                            </div>
                            <Segmented
                                aria-label="Colour mode for everyone"
                                value={application.colorMode}
                                disabled={readOnly}
                                onChange={(value) => updateApplication('colorMode', value)}
                                options={[
                                    { value: 'light', label: 'Light', icon: <SunOutlined /> },
                                    { value: 'dark', label: 'Dark', icon: <MoonOutlined /> },
                                    { value: 'system', label: 'Follow device', icon: <DesktopOutlined /> },
                                ]}
                            />
                        </div>

                        {hasPreference && (
                            <Alert
                                type="info"
                                showIcon
                                title={`You have switched to ${mode} mode for yourself`}
                                description="The colour mode chosen here applies to you again once you go back to the workspace setting."
                                action={<Button size="small" onClick={clearPreference}>Use the workspace setting</Button>}
                            />
                        )}

                        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ads-border-subtle)] pt-3">
                            <Button icon={<UploadOutlined />} disabled={readOnly} onClick={() => themePackInputRef.current?.click()}>Import CSV</Button>
                            <Button icon={<DownloadOutlined />} onClick={exportThemePack}>Export CSV</Button>
                            <input ref={themePackInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={importThemePack} />
                            <span className="ml-auto flex flex-wrap gap-1">
                                <Tooltip title="Colours, fonts and sizes only; layout, sidebar and brand are kept">
                                    <Button type="text" icon={<RollbackOutlined />} disabled={readOnly} onClick={resetTheme}>Reset to default theme</Button>
                                </Tooltip>
                                <Tooltip title="Theme, layout, sidebar and brand all go back to the defaults">
                                    <Button type="text" danger disabled={readOnly} onClick={resetEverything}>Reset everything</Button>
                                </Tooltip>
                            </span>
                        </div>
                    </section>

                    <section id="colours" aria-label="Colours" className={SECTION_CLASS}>
                        <ColourSection
                            draft={normalizedDraft}
                            stored={storedConfig}
                            mode={paletteMode}
                            onModeChange={setPaletteMode}
                            onColourChange={updateColour}
                            disabled={readOnly}
                        />
                    </section>

                    <section id="text" aria-label="Text" className={`${SECTION_CLASS} flex flex-col gap-3.5`}>
                        <SectionHeading title="Text" description="Fonts for each kind of text, and the base size everything scales from." />
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {FONT_ROLES.map((role) => (
                                <div key={role.key} className="flex min-w-0 flex-col gap-2 rounded-[var(--ads-radius-md)] border border-[var(--ads-border)] p-3">
                                    <span className={CAPTION_CLASS}>{role.label}</span>
                                    <span
                                        className={`truncate ${role.key === 'heading' ? 'text-[length:var(--ads-font-size-h5)] font-semibold' : ''}`}
                                        style={{ fontFamily: `"${application.fonts[role.key]}"` }}
                                    >
                                        {role.sample}
                                    </span>
                                    <Select aria-label={`${role.label} font`} value={application.fonts[role.key]} disabled={readOnly} onChange={(value) => updateFont(role.key, value)} options={FONT_OPTIONS} />
                                </div>
                            ))}
                        </div>
                        <SliderRow label="Base text size" hint="12–18 px" min={12} max={18} value={application.fontSize} disabled={readOnly} onChange={(value) => updateApplication('fontSize', value)} />
                    </section>

                    <section id="shape" aria-label="Shape and spacing" className={`${SECTION_CLASS} flex flex-col gap-3`}>
                        <SectionHeading title="Shape & spacing" description="How rounded and how roomy buttons, fields and cards are." />
                        <SliderRow
                            label="Corner rounding"
                            hint={application.borderRadius !== storedConfig.application.borderRadius ? `Changed from ${storedConfig.application.borderRadius} px` : '0–20 px'}
                            min={0}
                            max={20}
                            value={application.borderRadius}
                            disabled={readOnly}
                            onChange={(value) => updateApplication('borderRadius', value)}
                        />
                        <SliderRow label="Field & button height" hint="28–52 px" min={28} max={52} value={application.controlHeight} disabled={readOnly} onChange={(value) => updateApplication('controlHeight', value)} />
                        <SliderRow label="Page padding" hint="Space around the content of every page" min={8} max={48} value={normalizedDraft.content.padding} disabled={readOnly} onChange={(value) => updateSection('content', 'padding', value)} />
                        <SliderRow label="Page width" hint="Widest the content gets on big screens" min={960} max={2400} step={40} value={normalizedDraft.content.maxWidth} disabled={readOnly} onChange={(value) => updateSection('content', 'maxWidth', value)} />
                        <div className={`${ROW_CLASS} sm:grid-cols-[200px_minmax(0,1fr)]`}>
                            <RowLabel label="Spacing" hint="Room inside tables and forms" />
                            <Segmented
                                aria-label="Spacing"
                                className="justify-self-start"
                                value={application.density}
                                disabled={readOnly}
                                onChange={(value) => updateApplication('density', value)}
                                options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]}
                            />
                        </div>
                        <SwitchRow
                            label="Animations"
                            hint="Page fade-ins and drawer slides. Turned off automatically for people who ask their device for less motion."
                            checked={application.motionEnabled}
                            disabled={readOnly}
                            onChange={(value) => updateApplication('motionEnabled', value)}
                        />
                    </section>

                    <FoldedSection
                        id="layout"
                        title="Sidebar & header"
                        summary={`${LAYOUT_STYLES.find((style) => style.value === normalizedDraft.variant)?.label ?? normalizedDraft.variant} layout · sidebar ${normalizedDraft.width} px wide · collapses to ${normalizedDraft.collapsedWidth} px · header ${normalizedDraft.headerHeight} px${normalizedDraft.header.sticky ? ' · sticky header' : ''}`}
                        open={openFolds.has('layout')}
                        onToggle={() => toggleFold('layout')}
                    >
                        <div className={`${ROW_CLASS} sm:grid-cols-[200px_minmax(0,1fr)]`}>
                            <RowLabel label="Layout style" hint="How the menu and page are arranged" />
                            <Select
                                aria-label="Layout style"
                                value={normalizedDraft.variant}
                                disabled={readOnly}
                                onChange={(value) => updateRoot('variant', value)}
                                optionLabelProp="title"
                                options={LAYOUT_STYLES.map((style) => ({
                                    value: style.value,
                                    title: style.label,
                                    label: (
                                        <span className="flex flex-col py-0.5">
                                            <span className="font-medium">{style.label}</span>
                                            <span className="whitespace-normal text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{style.hint}</span>
                                        </span>
                                    ),
                                }))}
                            />
                        </div>
                        <div className={`${ROW_CLASS} sm:grid-cols-[200px_minmax(0,1fr)]`}>
                            <RowLabel label="Sidebar colour" hint="For every layout except Business, which follows light or dark mode" />
                            <Segmented
                                aria-label="Sidebar colour"
                                className="justify-self-start"
                                value={normalizedDraft.theme}
                                disabled={readOnly || normalizedDraft.variant === 'business'}
                                onChange={(value) => updateRoot('theme', value)}
                                options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
                            />
                        </div>
                        <div className={`${ROW_CLASS} sm:grid-cols-[200px_minmax(0,1fr)]`}>
                            <RowLabel label="Collapse below" hint="The sidebar folds by itself on screens narrower than this" />
                            <Select aria-label="Collapse below" className="max-w-[260px]" value={normalizedDraft.breakpoint} disabled={readOnly} onChange={(value) => updateRoot('breakpoint', value)} options={COLLAPSE_BREAKPOINTS} />
                        </div>
                        <SliderRow label="Sidebar width" min={180} max={360} value={normalizedDraft.width} disabled={readOnly} onChange={(value) => updateRoot('width', value)} />
                        <SliderRow label="Collapsed sidebar width" min={48} max={120} value={normalizedDraft.collapsedWidth} disabled={readOnly} onChange={(value) => updateRoot('collapsedWidth', value)} />
                        <SliderRow label="Header height" min={48} max={96} value={normalizedDraft.headerHeight} disabled={readOnly} onChange={(value) => updateRoot('headerHeight', value)} />
                        <SwitchRow label="Collapsible sidebar" hint="Show the Collapse sidebar button" checked={normalizedDraft.collapsible} disabled={readOnly} onChange={(value) => updateRoot('collapsible', value)} />
                        <SwitchRow label="Start collapsed" hint="Open the app with the sidebar narrow" checked={normalizedDraft.defaultCollapsed} disabled={readOnly || !normalizedDraft.collapsible} onChange={(value) => updateRoot('defaultCollapsed', value)} />
                        <SwitchRow label="Group navigation" hint="Show section labels such as Business and Settings" checked={normalizedDraft.isGrouped} disabled={readOnly} onChange={(value) => updateRoot('isGrouped', value)} />
                        <div className={`${ROW_CLASS} sm:grid-cols-[200px_minmax(0,1fr)]`}>
                            <RowLabel label="Menu groups" hint="How the sections are shown when navigation is grouped" />
                            <Segmented
                                aria-label="Menu groups"
                                className="justify-self-start"
                                value={normalizedDraft.groupVariant}
                                disabled={readOnly || !normalizedDraft.isGrouped}
                                onChange={(value) => updateRoot('groupVariant', value)}
                                options={[{ value: 'group', label: 'Section labels' }, { value: 'dropdown', label: 'Collapsible groups' }]}
                            />
                        </div>
                        <div className={`${ROW_CLASS} sm:grid-cols-[200px_minmax(0,1fr)]`}>
                            <RowLabel label="Pinned page" hint="Kept at the bottom of the sidebar, e.g. /admin/settings/system_logs" />
                            <Input aria-label="Pinned page" name="pinnedPage" autoComplete="off" className="max-w-[360px]" value={draft.bottomKey} disabled={readOnly} onChange={(event) => updateRoot('bottomKey', event.target.value)} />
                        </div>
                        <SwitchRow label="Sticky header" hint="Keep search and reminders in view while scrolling" checked={normalizedDraft.header.sticky} disabled={readOnly} onChange={(value) => updateSection('header', 'sticky', value)} />
                    </FoldedSection>

                    <FoldedSection
                        id="brand"
                        title="Brand"
                        summary={`“${normalizedDraft.brand.name}” · caption “${normalizedDraft.brand.caption}” · mark “${normalizedDraft.brand.mark}”`}
                        open={openFolds.has('brand')}
                        onToggle={() => toggleFold('brand')}
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px]">
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium">Name</span>
                                <Input name="brandName" autoComplete="off" maxLength={80} value={draft.brand.name} disabled={readOnly} onChange={(event) => updateSection('brand', 'name', event.target.value)} />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium">Caption</span>
                                <Input name="brandCaption" autoComplete="off" maxLength={80} value={draft.brand.caption} disabled={readOnly} onChange={(event) => updateSection('brand', 'caption', event.target.value)} />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium">Mark</span>
                                <Input name="brandMark" autoComplete="off" maxLength={2} value={draft.brand.mark} disabled={readOnly} onChange={(event) => updateSection('brand', 'mark', event.target.value)} />
                            </label>
                        </div>
                        <p className="m-0 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Shown at the top of the sidebar. The mark is one or two letters in the coloured square.</p>
                    </FoldedSection>
                </div>

                <aside aria-label="Live preview" className="flex min-w-0 flex-col gap-2.5 min-[900px]:col-start-2 min-[1200px]:sticky min-[1200px]:top-[76px] min-[1200px]:col-start-3 min-[1200px]:row-start-1">
                    <div className="flex items-center gap-2">
                        <span className={`${CAPTION_CLASS} flex-1`}>Live preview · {paletteMode}</span>
                        <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)]">Only you see this</span>
                    </div>
                    <AppearancePreview config={normalizedDraft} isDark={paletteMode === 'dark'} />
                    <div className="flex items-center gap-2 rounded-[var(--ads-radius-md)] border border-[var(--ads-border)] bg-[var(--ads-surface)] px-2.5 py-2">
                        <EyeOutlined className="text-[var(--ads-text-muted)]" />
                        <span className="flex-1 text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">Preview in</span>
                        <Segmented size="small" aria-label="Preview palette" value={paletteMode} onChange={setPaletteMode} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
                    </div>
                </aside>
            </div>

            {isDirty && !readOnly && (
                <div role="status" className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-[var(--ads-radius-lg)] bg-[var(--ads-text-heading)] px-4 py-2.5 text-[var(--ads-canvas)] shadow-[var(--ads-shadow-md)]">
                    <i className="size-2 shrink-0 rounded-full bg-[var(--ads-warning)]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold">{changes.length || 1} unsaved change{changes.length === 1 ? '' : 's'}</div>
                        {changedLabels.length > 0 && (
                            <div className="truncate text-[length:var(--ads-font-size-body-sm)] opacity-75">
                                {changedLabels.slice(0, 4).join(' · ')}{changedLabels.length > 4 ? ` and ${changedLabels.length - 4} more` : ''}
                            </div>
                        )}
                    </div>
                    <Button ghost disabled={saving} onClick={() => setDraft(storedConfig)} className="!border-[color-mix(in_srgb,var(--ads-canvas)_35%,transparent)] !text-[var(--ads-canvas)]">Discard</Button>
                    <Button
                        icon={<CheckOutlined />}
                        loading={saving}
                        onClick={save}
                        className="!border-transparent !bg-[color-mix(in_srgb,var(--ads-accent)_45%,var(--ads-canvas))] !font-semibold !text-[var(--ads-text-heading)]"
                    >
                        Save for everyone
                    </Button>
                </div>
            )}
        </main>
    );
}
