import utils from '../../utils/function_utils';
import { isWorkspaceArea, isWorkspacePath } from '../navigation/routeResolver';
const VARIANTS = new Set(['default', 'sider', 'none', 'icon-rail', 'floating', 'top', 'premium', 'business']);
const BREAKPOINTS = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
const THEMES = new Set(['light', 'dark']);
const GROUP_VARIANTS = new Set(['dropdown', 'group']);
const COLOR_MODES = new Set(['light', 'dark', 'system']);
const DENSITIES = new Set(['compact', 'comfortable', 'spacious']);
const FONT_FAMILIES = new Set(['Inter', 'Newsreader', 'IBM Plex Mono', 'Geist', 'Geist Mono']);
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i;

// The framework's default theme. It is
// also what shows before sign-in, when the saved appearance is not loaded yet.
const LIGHT_COLORS = Object.freeze({
    siderBg: '#FBF7F2',
    headerBg: '#FFFDFA',
    contentBg: '#F6F1EA',
    accent: '#3E5A4D',
    accentText: '#FFFFFF',
    textPrimary: '#1F2723',
    textMuted: '#5C625D',
    border: '#ECE5DB',
    itemHover: '#F3EDE4',
    itemActive: '#E3ECE6',
    surfaceBg: '#FFFDFA',
    elevatedBg: '#FFFFFF',
    bodyText: '#1F2723',
    secondaryText: '#5C625D',
    strongBorder: '#D6CCBF',
    success: '#2D7652',
    warning: '#9A5A1C',
    error: '#B23F3A',
    info: '#3B6A8A',
    chartRevenue: '#1E7A50',
    chartCosts: '#D98A48',
    chartNet: '#3C6FC4',
});

const DARK_COLORS = Object.freeze({
    siderBg: '#171D1A',
    headerBg: '#171D1A',
    contentBg: '#0F1412',
    accent: '#8FB8A3',
    accentText: '#0F1412',
    textPrimary: '#F2EEE8',
    textMuted: '#BDB6AB',
    border: '#262E2A',
    itemHover: '#1E2622',
    itemActive: '#26332D',
    surfaceBg: '#171D1A',
    elevatedBg: '#1E2622',
    bodyText: '#F2EEE8',
    secondaryText: '#BDB6AB',
    strongBorder: '#3B4640',
    success: '#6CC39A',
    warning: '#E3A96B',
    error: '#EE8B84',
    info: '#85B4D6',
    chartRevenue: '#36A877',
    chartCosts: '#B9672A',
    chartNet: '#5A88E0',
});

export const DEFAULT_SIDER_CONFIG = Object.freeze({
    themeName: 'Framework Default',
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
    brand: { name: 'Workspace', caption: 'Administration', mark: 'W' },
    application: {
        colorMode: 'light',
        density: 'comfortable',
        borderRadius: 6,
        controlHeight: 32,
        fontSize: 14,
        fonts: {
            heading: 'Geist',
            body: 'Inter',
            caption: 'Geist Mono',
            data: 'Geist Mono',
        },
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

const isWorkspacePage = (path) => typeof path === 'string' && isWorkspacePath(path) && !isWorkspaceArea(path);

const safeWorkspacePath = (value, fallback) => {
    if (Array.isArray(value)) {
        const paths = value.filter(isWorkspacePage);
        return paths.length ? paths.slice(0, 10) : fallback;
    }
    return isWorkspacePage(value) ? value : fallback;
};

function parseSettingValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value !== 'string') return {};
    const parsed = utils.parseJson(value, {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

// Chart colours are optional in a theme. A theme that does not set them gets
// its own accent, warning and success colours, so charts always match it.
export const CHART_COLOR_FALLBACKS = Object.freeze({ chartRevenue: 'accent', chartCosts: 'warning', chartNet: 'success' });

function withChartColors(palette, input) {
    for (const [key, fallbackKey] of Object.entries(CHART_COLOR_FALLBACKS)) {
        const value = input?.[key];
        palette[key] = typeof value === 'string' && SAFE_COLOR.test(value.trim()) ? value.trim() : palette[fallbackKey];
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
    withChartColors(colors, input.colors);
    withChartColors(darkColors, input.darkColors);

    return {
        themeName: safeString(input.themeName, defaults.themeName),
        variant: VARIANTS.has(input.variant) ? input.variant : defaults.variant,
        width: boundedNumber(input.width, defaults.width, 180, 360),
        collapsedWidth: boundedNumber(input.collapsedWidth, defaults.collapsedWidth, 48, 120),
        breakpoint: BREAKPOINTS.has(input.breakpoint) ? input.breakpoint : defaults.breakpoint,
        theme: THEMES.has(input.theme) ? input.theme : defaults.theme,
        collapsible: typeof input.collapsible === 'boolean' ? input.collapsible : defaults.collapsible,
        defaultCollapsed: typeof input.defaultCollapsed === 'boolean' ? input.defaultCollapsed : defaults.defaultCollapsed,
        headerHeight: boundedNumber(input.headerHeight, defaults.headerHeight, 48, 96),
        isGrouped: typeof input.isGrouped === 'boolean' ? input.isGrouped : defaults.isGrouped,
        groupKey: utils.isIdentifier(input.groupKey) ? input.groupKey : defaults.groupKey,
        groupVariant: GROUP_VARIANTS.has(input.groupVariant) ? input.groupVariant : defaults.groupVariant,
        orderKey: utils.isIdentifier(input.orderKey) ? input.orderKey : defaults.orderKey,
        bottomKey: safeWorkspacePath(input.bottomKey, defaults.bottomKey),
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
            fonts: {
                heading: FONT_FAMILIES.has(input.application?.fonts?.heading)
                    ? input.application.fonts.heading
                    : defaults.application.fonts.heading,
                body: FONT_FAMILIES.has(input.application?.fonts?.body)
                    ? input.application.fonts.body
                    : defaults.application.fonts.body,
                caption: FONT_FAMILIES.has(input.application?.fonts?.caption)
                    ? input.application.fonts.caption
                    : defaults.application.fonts.caption,
                data: FONT_FAMILIES.has(input.application?.fonts?.data)
                    ? input.application.fonts.data
                    : defaults.application.fonts.data,
            },
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
