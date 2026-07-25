const VARIANTS = new Set(['default', 'sider', 'none', 'icon-rail', 'floating', 'top', 'premium']);
const BREAKPOINTS = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
const THEMES = new Set(['light', 'dark']);
const GROUP_VARIANTS = new Set(['dropdown', 'group']);
const COLOR_MODES = new Set(['light', 'dark', 'system']);
const DENSITIES = new Set(['compact', 'comfortable', 'spacious']);
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i;

const LIGHT_COLORS = Object.freeze({
    siderBg: '#171c1a',
    headerBg: '#ffffff',
    contentBg: '#f7f7f5',
    accent: '#0f766e',
    accentText: '#f8faf9',
    textPrimary: '#e4e9e6',
    textMuted: '#a7b0ac',
    border: '#303936',
    itemHover: '#232a27',
    itemActive: '#173532',
    surfaceBg: '#ffffff',
    elevatedBg: '#ffffff',
    bodyText: '#202523',
    secondaryText: '#5e6864',
    strongBorder: '#dde1de',
    success: '#39875d',
    warning: '#b7791f',
    error: '#c84a54',
    info: '#4776b8',
});

const DARK_COLORS = Object.freeze({
    siderBg: '#0d110f',
    headerBg: '#171c1a',
    contentBg: '#111513',
    accent: '#55b8ae',
    accentText: '#10201d',
    textPrimary: '#e4e9e6',
    textMuted: '#a7b0ac',
    border: '#303936',
    itemHover: '#232a27',
    itemActive: '#173532',
    surfaceBg: '#171c1a',
    elevatedBg: '#1c2220',
    bodyText: '#e4e9e6',
    secondaryText: '#a7b0ac',
    strongBorder: '#303936',
    success: '#6cba88',
    warning: '#d7a552',
    error: '#e37a82',
    info: '#79a4db',
});

export const DEFAULT_SIDER_CONFIG = Object.freeze({
    variant: 'premium',
    width: 252,
    collapsedWidth: 76,
    breakpoint: 'lg',
    theme: 'dark',
    collapsible: true,
    defaultCollapsed: false,
    headerHeight: 64,
    isGrouped: true,
    groupKey: 'category',
    groupVariant: 'group',
    orderKey: 'order',
    bottomKey: '/admin/settings/system_logs',
    defaultHeader: false,
    defaultFooter: false,
    brand: { name: 'Budget Manager', caption: 'Operations Console', mark: 'B' },
    application: {
        colorMode: 'light',
        density: 'comfortable',
        borderRadius: 8,
        controlHeight: 38,
        fontSize: 14,
        motionEnabled: true,
    },
    content: {
        maxWidth: 1600,
        padding: 16,
    },
    header: {
        sticky: true,
        showSystemStatus: true,
        showRole: true,
    },
    colors: LIGHT_COLORS,
    darkColors: DARK_COLORS,
});

const boundedNumber = (value, fallback, minimum, maximum) => {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(maximum, Math.max(minimum, number))
        : fallback;
};

const safeString = (value, fallback, maximum = 80) => {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    return value.trim().slice(0, maximum);
};

const safeAdminPath = (value, fallback) => {
    if (Array.isArray(value)) {
        const paths = value.filter((path) => typeof path === 'string' && path.startsWith('/admin/'));
        return paths.length ? paths.slice(0, 10) : fallback;
    }
    return typeof value === 'string' && value.startsWith('/admin/') ? value : fallback;
};

function parseSettingValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function normalizeSiderConfig(value) {
    const input = parseSettingValue(value);
    const defaults = DEFAULT_SIDER_CONFIG;
    const colors = Object.fromEntries(
        Object.entries(defaults.colors).map(([key, fallback]) => [
            key,
            typeof input.colors?.[key] === 'string' && SAFE_COLOR.test(input.colors[key].trim())
                ? input.colors[key].trim()
                : fallback,
        ]),
    );
    const darkColors = Object.fromEntries(
        Object.entries(defaults.darkColors).map(([key, fallback]) => [
            key,
            typeof input.darkColors?.[key] === 'string' && SAFE_COLOR.test(input.darkColors[key].trim())
                ? input.darkColors[key].trim()
                : fallback,
        ]),
    );

    return {
        variant: VARIANTS.has(input.variant) ? input.variant : defaults.variant,
        width: boundedNumber(input.width, defaults.width, 180, 360),
        collapsedWidth: boundedNumber(input.collapsedWidth, defaults.collapsedWidth, 48, 120),
        breakpoint: BREAKPOINTS.has(input.breakpoint) ? input.breakpoint : defaults.breakpoint,
        theme: THEMES.has(input.theme) ? input.theme : defaults.theme,
        collapsible: typeof input.collapsible === 'boolean' ? input.collapsible : defaults.collapsible,
        defaultCollapsed: typeof input.defaultCollapsed === 'boolean' ? input.defaultCollapsed : defaults.defaultCollapsed,
        headerHeight: boundedNumber(input.headerHeight, defaults.headerHeight, 48, 96),
        isGrouped: typeof input.isGrouped === 'boolean' ? input.isGrouped : defaults.isGrouped,
        groupKey: IDENTIFIER.test(input.groupKey ?? '') ? input.groupKey : defaults.groupKey,
        groupVariant: GROUP_VARIANTS.has(input.groupVariant) ? input.groupVariant : defaults.groupVariant,
        orderKey: IDENTIFIER.test(input.orderKey ?? '') ? input.orderKey : defaults.orderKey,
        bottomKey: safeAdminPath(input.bottomKey, defaults.bottomKey),
        defaultHeader: typeof input.defaultHeader === 'boolean' ? input.defaultHeader : defaults.defaultHeader,
        defaultFooter: typeof input.defaultFooter === 'boolean' ? input.defaultFooter : defaults.defaultFooter,
        brand: {
            name: safeString(input.brand?.name, defaults.brand.name),
            caption: safeString(input.brand?.caption, defaults.brand.caption),
            mark: safeString(input.brand?.mark, defaults.brand.mark, 2),
        },
        application: {
            colorMode: COLOR_MODES.has(input.application?.colorMode)
                ? input.application.colorMode
                : defaults.application.colorMode,
            density: DENSITIES.has(input.application?.density)
                ? input.application.density
                : defaults.application.density,
            borderRadius: boundedNumber(input.application?.borderRadius, defaults.application.borderRadius, 0, 20),
            controlHeight: boundedNumber(input.application?.controlHeight, defaults.application.controlHeight, 28, 52),
            fontSize: boundedNumber(input.application?.fontSize, defaults.application.fontSize, 12, 18),
            motionEnabled: typeof input.application?.motionEnabled === 'boolean'
                ? input.application.motionEnabled
                : defaults.application.motionEnabled,
        },
        content: {
            maxWidth: boundedNumber(input.content?.maxWidth, defaults.content.maxWidth, 960, 2400),
            padding: boundedNumber(input.content?.padding, defaults.content.padding, 8, 48),
        },
        header: {
            sticky: typeof input.header?.sticky === 'boolean' ? input.header.sticky : defaults.header.sticky,
            showSystemStatus: typeof input.header?.showSystemStatus === 'boolean'
                ? input.header.showSystemStatus
                : defaults.header.showSystemStatus,
            showRole: typeof input.header?.showRole === 'boolean' ? input.header.showRole : defaults.header.showRole,
        },
        colors,
        darkColors,
    };
}

export function resolveSiderConfig(rows = []) {
    const row = Array.isArray(rows)
        ? rows.find((item) => item?.setting_key === 'layout.sider' && item?.is_active !== 0)
        : null;
    return normalizeSiderConfig(row?.setting_value);
}
