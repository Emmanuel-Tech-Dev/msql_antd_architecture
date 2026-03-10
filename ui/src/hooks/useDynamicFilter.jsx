import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Input, Checkbox, Radio, Slider, DatePicker, Switch,
    Select, Tag, Button, Drawer, Space, Typography, Badge,
    Divider, Collapse,
} from 'antd';
import {
    SearchOutlined, FilterOutlined, CloseOutlined, ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

// ─── Filter type constants ────────────────────────────────────────────────────
export const FILTER_TYPES = {
    SEARCH: 'search',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TAG: 'tag',
    RANGE: 'range',
    DATE_RANGE: 'dateRange',
    SWITCH: 'switch',
    SELECT: 'select',
};

// ─── Serialize / deserialize for URL params ───────────────────────────────────
const serialize = (val) => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return val.join(',');
    if (typeof val === 'object' && val.from !== undefined) return `${val.from}~${val.to}`;
    return String(val);
};

const deserialize = (str, type) => {
    if (!str) return null;
    if (type === FILTER_TYPES.CHECKBOX || type === FILTER_TYPES.TAG) return str.split(',').filter(Boolean);
    if (type === FILTER_TYPES.RANGE) {
        const [from, to] = str.split('~').map(Number);
        return { from, to };
    }
    if (type === FILTER_TYPES.DATE_RANGE) {
        const [from, to] = str.split('~');
        return { from, to };
    }
    if (type === FILTER_TYPES.SWITCH) return str === 'true';
    return str;
};

// ─── Get default value per filter type ───────────────────────────────────────
const getDefault = (filter) => {
    if (filter.defaultValue !== undefined) return filter.defaultValue;
    switch (filter.type) {
        case FILTER_TYPES.CHECKBOX:
        case FILTER_TYPES.TAG: return [];
        case FILTER_TYPES.RANGE: return filter.range ?? [0, 100];
        case FILTER_TYPES.SWITCH: return false;
        case FILTER_TYPES.DATE_RANGE:
        case FILTER_TYPES.SEARCH:
        case FILTER_TYPES.RADIO:
        case FILTER_TYPES.SELECT: return null;
        default: return null;
    }
};

// ─── Check if a filter value is "active" (non-default) ───────────────────────
const isActive = (val, filter) => {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return val.from !== null && val.to !== null;
    if (filter.type === FILTER_TYPES.SWITCH) return val === true;
    return val !== '' && val !== null;
};

// ─── Client-side filter logic ─────────────────────────────────────────────────
const applyClientFilters = (data, values, filters) => {
    return data.filter((item) =>
        filters.every((filter) => {
            const val = values[filter.key];
            if (!isActive(val, filter)) return true;
            const itemVal = filter.dataIndex
                ? filter.dataIndex.split('.').reduce((o, k) => o?.[k], item)
                : item[filter.key];

            switch (filter.type) {
                case FILTER_TYPES.SEARCH:
                    return String(itemVal ?? '').toLowerCase().includes(String(val).toLowerCase());
                case FILTER_TYPES.CHECKBOX:
                case FILTER_TYPES.TAG:
                    return val.includes(String(itemVal));
                case FILTER_TYPES.RADIO:
                case FILTER_TYPES.SELECT:
                    return String(itemVal) === String(val);
                case FILTER_TYPES.RANGE:
                    return itemVal >= val[0] && itemVal <= val[1];
                case FILTER_TYPES.DATE_RANGE: {
                    const d = dayjs(itemVal);
                    return d.isAfter(dayjs(val.from)) && d.isBefore(dayjs(val.to));
                }
                case FILTER_TYPES.SWITCH:
                    return Boolean(itemVal) === val;
                default:
                    return true;
            }
        })
    );
};

// ─── useDynamicFilter ─────────────────────────────────────────────────────────
const useDynamicFilter = (staticConfig = {}) => {
    const {
        // filter definitions
        filters = [],              // [{ key, label, type, options, range, dataIndex, ... }]

        // layout variant
        variant = 'horizontal',    // 'horizontal' | 'sidebar'

        // data mode
        mode = 'server',           // 'server' | 'client'
        data = [],                 // client mode: array to filter

        // state persistence
        persistence = 'state',     // 'state' | 'url' | 'both'

        // callbacks
        onChange,                  // (activeValues) => void  — server mode: call your API here
        onReset,

        // horizontal bar options
        showSearch = true,         // show global search input in bar
        searchKey = 'search',
        searchPlaceholder = 'Search...',

        // sidebar options
        sidebarWidth = 280,
        sidebarTitle = 'Filters',

        // styles
        style,
    } = staticConfig;

    // ─── URL params (only when persistence includes 'url') ────────────────
    const [searchParams, setSearchParams] = useSearchParams();

    // ─── Build initial state from URL or defaults ─────────────────────────
    const buildInitial = useCallback(() => {
        const initial = {};
        filters.forEach((f) => {
            if (persistence !== 'state') {
                const urlVal = searchParams.get(f.key);
                if (urlVal) {
                    initial[f.key] = deserialize(urlVal, f.type);
                    return;
                }
            }
            initial[f.key] = getDefault(f);
        });
        if (showSearch) {
            initial[searchKey] = persistence !== 'state'
                ? searchParams.get(searchKey) || ''
                : '';
        }
        return initial;
    }, [filters, persistence, searchKey, showSearch]);

    const [values, setValues] = useState(() => buildInitial());
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // ─── Sync to URL when values change ──────────────────────────────────
    useEffect(() => {
        if (persistence === 'state') return;
        const params = new URLSearchParams();
        Object.entries(values).forEach(([key, val]) => {
            const serialized = serialize(val);
            if (serialized) params.set(key, serialized);
        });
        setSearchParams(params, { replace: true });
    }, [values, persistence]);

    // ─── Notify parent when values change ────────────────────────────────
    useEffect(() => {
        if (onChange) onChange(activeValues);
    }, [values]);

    // ─── Active values — only non-default entries ─────────────────────────
    const activeValues = useMemo(() => {
        const result = {};
        Object.entries(values).forEach(([key, val]) => {
            const filter = filters.find((f) => f.key === key);
            if (filter && isActive(val, filter)) result[key] = val;
            if (key === searchKey && val) result[key] = val;
        });
        return result;
    }, [values, filters, searchKey]);

    const activeCount = useMemo(() => Object.keys(activeValues).length, [activeValues]);

    // ─── Filtered data (client mode) ─────────────────────────────────────
    const filteredData = useMemo(() => {
        if (mode !== 'client') return data;
        return applyClientFilters(data, values, filters);
    }, [mode, data, values, filters]);

    // ─── Set / reset helpers ──────────────────────────────────────────────
    const setValue = useCallback((key, val) => {
        setValues((prev) => ({ ...prev, [key]: val }));
    }, []);

    const reset = useCallback(() => {
        const defaults = {};
        filters.forEach((f) => { defaults[f.key] = getDefault(f); });
        if (showSearch) defaults[searchKey] = '';
        setValues(defaults);
        if (onReset) onReset();
    }, [filters, showSearch, searchKey, onReset]);

    const removeFilter = useCallback((key) => {
        const filter = filters.find((f) => f.key === key);
        setValue(key, filter ? getDefault(filter) : null);
    }, [filters, setValue]);

    // ─── Render individual filter control ─────────────────────────────────
    const renderControl = useCallback((filter) => {
        const val = values[filter.key];

        switch (filter.type) {
            case FILTER_TYPES.SEARCH:
                return (
                    <Input
                        placeholder={filter.placeholder ?? 'Search...'}
                        prefix={<SearchOutlined />}
                        value={val ?? ''}
                        onChange={(e) => setValue(filter.key, e.target.value)}
                        allowClear
                        style={{ width: filter.width ?? 200 }}
                    />
                );

            case FILTER_TYPES.CHECKBOX:
                return (
                    <Checkbox.Group
                        options={filter.options ?? []}
                        value={val ?? []}
                        onChange={(v) => setValue(filter.key, v)}
                        style={variant === 'sidebar' ? { display: 'flex', flexDirection: 'column', gap: 8 } : {}}
                    />
                );

            case FILTER_TYPES.RADIO:
                return (
                    <Radio.Group
                        options={filter.options ?? []}
                        value={val}
                        onChange={(e) => setValue(filter.key, e.target.value)}
                        optionType={filter.optionType ?? 'default'}
                        buttonStyle={filter.buttonStyle ?? 'outline'}
                        style={variant === 'sidebar' ? { display: 'flex', flexDirection: 'column', gap: 8 } : {}}
                    />
                );

            case FILTER_TYPES.TAG:
                return (
                    <Space wrap size={[8, 8]}>
                        {(filter.options ?? []).map((opt) => {
                            const optVal = typeof opt === 'object' ? opt.value : opt;
                            const optLabel = typeof opt === 'object' ? opt.label : opt;
                            const selected = (val ?? []).includes(optVal);
                            return (
                                <Tag.CheckableTag
                                    key={optVal}
                                    checked={selected}
                                    onChange={(checked) => {
                                        const next = checked
                                            ? [...(val ?? []), optVal]
                                            : (val ?? []).filter((v) => v !== optVal);
                                        setValue(filter.key, next);
                                    }}
                                    style={{ cursor: 'pointer', userSelect: 'none', padding: '2px 12px', borderRadius: 20 }}
                                >
                                    {optLabel}
                                </Tag.CheckableTag>
                            );
                        })}
                    </Space>
                );

            case FILTER_TYPES.RANGE:
                return (
                    <Slider
                        range
                        min={filter.range?.[0] ?? 0}
                        max={filter.range?.[1] ?? 100}
                        step={filter.step ?? 1}
                        value={val ?? filter.range ?? [0, 100]}
                        onChange={(v) => setValue(filter.key, v)}
                        tooltip={{ formatter: filter.formatter ?? ((v) => v) }}
                        style={{ width: variant === 'sidebar' ? '100%' : (filter.width ?? 180) }}
                    />
                );

            case FILTER_TYPES.DATE_RANGE:
                return (
                    <RangePicker
                        value={val ? [dayjs(val.from), dayjs(val.to)] : null}
                        onChange={(dates) => {
                            if (!dates) { setValue(filter.key, null); return; }
                            setValue(filter.key, {
                                from: dates[0].toISOString(),
                                to: dates[1].toISOString(),
                            });
                        }}
                        style={{ width: filter.width ?? 260 }}
                    />
                );

            case FILTER_TYPES.SWITCH:
                return (
                    <Switch
                        checked={val ?? false}
                        onChange={(v) => setValue(filter.key, v)}
                        checkedChildren={filter.checkedLabel ?? 'On'}
                        unCheckedChildren={filter.uncheckedLabel ?? 'Off'}
                    />
                );

            case FILTER_TYPES.SELECT:
                return (
                    <Select
                        placeholder={filter.placeholder ?? `Select ${filter.label}`}
                        value={val}
                        onChange={(v) => setValue(filter.key, v)}
                        options={filter.options ?? []}
                        allowClear
                        mode={filter.multiple ? 'multiple' : undefined}
                        style={{ width: filter.width ?? 180 }}
                    />
                );

            default:
                return null;
        }
    }, [values, setValue, variant]);

    // ─── Active filter chips (horizontal bar) ─────────────────────────────
    const renderActiveChips = useCallback(() => {
        const chips = Object.entries(activeValues).map(([key, val]) => {
            const filter = filters.find((f) => f.key === key);
            const label = filter?.label ?? key;

            let display = '';
            if (Array.isArray(val)) display = val.join(', ');
            else if (typeof val === 'object' && val?.from) display = `${val.from} – ${val.to}`;
            else display = String(val);

            return (
                <Tag
                    key={key}
                    closable
                    color="blue"
                    onClose={() => removeFilter(key)}
                    style={{ borderRadius: 20, padding: '2px 10px' }}
                >
                    <Text style={{ fontSize: 12 }}>
                        <Text strong style={{ fontSize: 12 }}>{label}: </Text>
                        {display}
                    </Text>
                </Tag>
            );
        });

        if (!chips.length) return null;

        return (
            <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
                {chips}
                <Button
                    size="small"
                    type="link"
                    icon={<ReloadOutlined />}
                    onClick={reset}
                    danger
                >
                    Clear all
                </Button>
            </Space>
        );
    }, [activeValues, filters, removeFilter, reset]);

    // ─── HORIZONTAL BAR ───────────────────────────────────────────────────
    const horizontalBarJSX = useMemo(() => {
        // separate search from other filters for layout
        const searchFilter = showSearch
            ? { key: searchKey, type: FILTER_TYPES.SEARCH, label: 'Search', placeholder: searchPlaceholder }
            : null;

        const otherFilters = filters.filter((f) => f.type !== FILTER_TYPES.SEARCH);

        return (
            <div style={{ ...style }}>
                {/* ── Filter row ── */}
                <Space wrap size={[12, 12]} align="center">
                    {/* Global search */}
                    {searchFilter && (
                        <Input
                            placeholder={searchPlaceholder}
                            prefix={<SearchOutlined />}
                            value={values[searchKey] ?? ''}
                            onChange={(e) => setValue(searchKey, e.target.value)}
                            allowClear
                            style={{ width: 220 }}
                        />
                    )}

                    {/* Inline tag filters (shown directly in bar) */}
                    {otherFilters
                        .filter((f) => f.inline !== false && [FILTER_TYPES.TAG, FILTER_TYPES.RADIO].includes(f.type))
                        .map((filter) => (
                            <div key={filter.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                                    {filter.label}:
                                </Text>
                                {renderControl(filter)}
                            </div>
                        ))
                    }

                    {/* Collapsed filters in a dropdown-style group */}
                    {otherFilters
                        .filter((f) => f.inline === false || ![FILTER_TYPES.TAG, FILTER_TYPES.RADIO].includes(f.type))
                        .map((filter) => (
                            <div key={filter.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                                    {filter.label}:
                                </Text>
                                {renderControl(filter)}
                            </div>
                        ))
                    }

                    {/* Reset */}
                    {activeCount > 0 && (
                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={reset}
                            danger
                        >
                            Reset
                        </Button>
                    )}
                </Space>

                {/* ── Active chips row ── */}
                {renderActiveChips()}
            </div>
        );
    }, [values, filters, activeCount, showSearch, searchKey, searchPlaceholder,
        renderControl, renderActiveChips, setValue, reset, style]);

    // ─── SIDEBAR ──────────────────────────────────────────────────────────
    const sidebarTriggerJSX = useMemo(() => (
        <Badge count={activeCount} size="small">
            <Button
                icon={<FilterOutlined />}
                onClick={() => setSidebarOpen(true)}
            >
                Filters
            </Button>
        </Badge>
    ), [activeCount]);

    const sidebarJSX = useMemo(() => (
        <>
            {sidebarTriggerJSX}
            <Drawer
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{sidebarTitle}</Text>
                        {activeCount > 0 && (
                            <Button
                                size="small"
                                type="link"
                                icon={<ReloadOutlined />}
                                onClick={reset}
                                danger
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                }
                placement="right"
                width={sidebarWidth}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                closeIcon={<CloseOutlined />}
                footer={
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button onClick={reset}>Reset</Button>
                        <Button type="primary" onClick={() => setSidebarOpen(false)}>
                            Apply
                        </Button>
                    </Space>
                }
            >
                <Collapse
                    defaultActiveKey={filters.map((f) => f.key)}
                    ghost
                    expandIconPosition="end"
                    items={filters.map((filter) => ({
                        key: filter.key,
                        label: (
                            <Space>
                                <Text strong style={{ fontSize: 14 }}>{filter.label}</Text>
                                {isActive(values[filter.key], filter) && (
                                    <Badge dot color="blue" />
                                )}
                            </Space>
                        ),
                        children: (
                            <div style={{ paddingBottom: 8 }}>
                                {renderControl(filter)}
                            </div>
                        ),
                    }))}
                />
            </Drawer>
        </>
    ), [filters, values, sidebarOpen, sidebarWidth, sidebarTitle,
        activeCount, renderControl, reset, sidebarTriggerJSX]);

    // ─── Inline sidebar (no drawer — rendered in a panel) ─────────────────
    const inlineSidebarJSX = useMemo(() => (
        <div style={{ width: sidebarWidth, ...style }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text strong style={{ fontSize: 16 }}>{sidebarTitle}</Text>
                {activeCount > 0 && (
                    <Button size="small" type="link" icon={<ReloadOutlined />} onClick={reset} danger>
                        Clear all
                    </Button>
                )}
            </div>

            {filters.map((filter, i) => (
                <div key={filter.key}>
                    <div style={{ marginBottom: 12 }}>
                        <Space style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 13 }}>{filter.label}</Text>
                            {isActive(values[filter.key], filter) && <Badge dot color="blue" />}
                        </Space>
                        {renderControl(filter)}
                    </div>
                    {i < filters.length - 1 && <Divider style={{ margin: '12px 0' }} />}
                </div>
            ))}
        </div>
    ), [filters, values, sidebarWidth, sidebarTitle, activeCount, renderControl, reset, style]);

    return {
        // values
        values,
        activeValues,
        activeCount,
        filteredData,     // client mode only

        // actions
        setValue,
        reset,
        removeFilter,

        // JSX variants
        horizontalBarJSX,     // drop-in horizontal filter bar
        sidebarJSX,           // trigger button + drawer
        inlineSidebarJSX,     // always-visible panel (e-commerce left column)
        renderControl,        // render a single filter control by key

        // sidebar state
        sidebarOpen,
        setSidebarOpen,
    };
};

export default useDynamicFilter;