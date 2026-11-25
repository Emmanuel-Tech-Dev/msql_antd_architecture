const px = (value) => `${Math.round(Number(value) * 100) / 100}px`;
const mix = (color, amount, base) => `color-mix(in srgb, ${color} ${amount}%, ${base})`;

const FONT_STACKS = Object.freeze({
    Inter: '"Inter", system-ui, sans-serif',
    Newsreader: '"Newsreader", Georgia, serif',
    'IBM Plex Mono': '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
    Geist: '"Geist", "Inter", system-ui, sans-serif',
    'Geist Mono': '"Geist Mono", "SFMono-Regular", Consolas, monospace',
});

export function resolveFontStack(font) {
    return FONT_STACKS[font] ?? FONT_STACKS.Inter;
}

export function getAppearancePalette(appearance, isDark) {
    return isDark ? appearance.darkColors : appearance.colors;
}

export function createAdsStyle(appearance, isDark = false) {
    const colors = getAppearancePalette(appearance, isDark);
    const radius = appearance.application.borderRadius;
    const controlHeight = appearance.application.controlHeight;
    const fontSize = appearance.application.fontSize;
    const fonts = appearance.application.fonts;

    return {
        '--ads-canvas': colors.contentBg,
        '--ads-surface': colors.surfaceBg,
        '--ads-surface-raised': colors.elevatedBg,
        '--ads-surface-sunken': mix(colors.contentBg, 72, colors.surfaceBg),
        '--ads-surface-hover': mix(colors.bodyText, 6, colors.surfaceBg),
        '--ads-surface-active': mix(colors.bodyText, 10, colors.surfaceBg),
        '--ads-surface-disabled': mix(colors.bodyText, 4, colors.surfaceBg),
        '--ads-text': colors.bodyText,
        '--ads-text-heading': colors.bodyText,
        '--ads-text-muted': colors.secondaryText,
        '--ads-text-subtle': mix(colors.secondaryText, 78, colors.surfaceBg),
        '--ads-text-disabled': mix(colors.secondaryText, 55, colors.surfaceBg),
        '--ads-text-inverse': colors.accentText,
        // Cards, tables and dividers use the soft border; the strong border is
        // kept for edges that must stand out, such as form controls.
        '--ads-border': colors.border,
        '--ads-border-subtle': mix(colors.border, 60, colors.surfaceBg),
        '--ads-border-strong': colors.strongBorder,
        '--ads-accent': colors.accent,
        '--ads-chart-revenue': colors.chartRevenue ?? colors.accent,
        '--ads-chart-costs': colors.chartCosts ?? colors.warning,
        '--ads-chart-net': colors.chartNet ?? colors.success,
        '--ads-accent-hover': mix(colors.accent, 88, isDark ? 'white' : 'black'),
        '--ads-accent-active': mix(colors.accent, 78, isDark ? 'white' : 'black'),
        '--ads-accent-soft': mix(colors.accent, isDark ? 20 : 11, colors.surfaceBg),
        '--ads-accent-soft-hover': mix(colors.accent, isDark ? 27 : 16, colors.surfaceBg),
        '--ads-accent-border': mix(colors.accent, isDark ? 48 : 36, colors.surfaceBg),
        '--ads-accent-text': mix(colors.accent, isDark ? 82 : 78, isDark ? 'white' : 'black'),
        '--ads-focus': mix(colors.accent, isDark ? 22 : 16, 'transparent'),
        '--ads-success': colors.success,
        '--ads-success-hover': mix(colors.success, 88, isDark ? 'white' : 'black'),
        '--ads-success-active': mix(colors.success, 78, isDark ? 'white' : 'black'),
        '--ads-success-soft': mix(colors.success, isDark ? 18 : 10, colors.surfaceBg),
        '--ads-success-border': mix(colors.success, isDark ? 45 : 32, colors.surfaceBg),
        '--ads-warning': colors.warning,
        '--ads-warning-hover': mix(colors.warning, 88, isDark ? 'white' : 'black'),
        '--ads-warning-active': mix(colors.warning, 78, isDark ? 'white' : 'black'),
        '--ads-warning-soft': mix(colors.warning, isDark ? 18 : 10, colors.surfaceBg),
        '--ads-warning-border': mix(colors.warning, isDark ? 45 : 32, colors.surfaceBg),
        '--ads-danger': colors.error,
        '--ads-danger-hover': mix(colors.error, 88, isDark ? 'white' : 'black'),
        '--ads-danger-active': mix(colors.error, 78, isDark ? 'white' : 'black'),
        '--ads-danger-soft': mix(colors.error, isDark ? 18 : 9, colors.surfaceBg),
        '--ads-danger-border': mix(colors.error, isDark ? 45 : 31, colors.surfaceBg),
        '--ads-info': colors.info,
        '--ads-info-hover': mix(colors.info, 88, isDark ? 'white' : 'black'),
        '--ads-info-active': mix(colors.info, 78, isDark ? 'white' : 'black'),
        '--ads-info-soft': mix(colors.info, isDark ? 18 : 9, colors.surfaceBg),
        '--ads-info-border': mix(colors.info, isDark ? 45 : 31, colors.surfaceBg),
        '--ads-font-sans': resolveFontStack(fonts.body),
        '--ads-font-heading': resolveFontStack(fonts.heading),
        '--ads-font-caption': resolveFontStack(fonts.caption),
        '--ads-font-data': resolveFontStack(fonts.data),
        '--ads-font-size-body': px(fontSize),
        '--ads-font-size-body-sm': px(Math.max(11, fontSize - 1)),
        '--ads-font-size-body-lg': px(fontSize + 2),
        '--ads-font-size-caption': px(Math.max(10, fontSize - 3)),
        '--ads-font-size-h5': px(fontSize + 4),
        '--ads-font-size-h4': px(fontSize + 8),
        '--ads-font-size-h3': px(fontSize + 12),
        '--ads-font-size-h2': px(fontSize + 18),
        '--ads-font-size-h1': px(fontSize + 24),
        '--ads-radius-xs': px(Math.max(2, radius * 0.5)),
        '--ads-radius-sm': px(Math.max(3, radius * 0.75)),
        '--ads-radius-md': px(radius),
        '--ads-radius-lg': px(radius + 4),
        '--ads-radius-xl': px(radius + 8),
        '--ads-control-sm': px(Math.max(24, controlHeight - 6)),
        '--ads-control-md': px(controlHeight),
        '--ads-control-lg': px(Math.min(58, controlHeight + 6)),
    };
}

export function createLegacyVariables(appearance, isDark = false) {
    const colors = getAppearancePalette(appearance, isDark);
    return {
        '--color-accent': colors.accent,
        '--color-accent-hover': colors.accent,
        '--color-accent-light': mix(colors.accent, 12, colors.surfaceBg),
        '--color-accent-muted': mix(colors.accent, 12, 'transparent'),
        '--color-primary': colors.accent,
        '--color-bg-base': colors.contentBg,
        '--color-bg-layout': colors.contentBg,
        '--color-bg-container': colors.surfaceBg,
        '--color-bg-elevated': colors.elevatedBg,
        '--color-bg-sunken': mix(colors.contentBg, 72, colors.surfaceBg),
        '--color-bg-overlay': mix(colors.surfaceBg, 88, 'transparent'),
        '--color-border': colors.border,
        '--color-border-secondary': mix(colors.border, 80, colors.surfaceBg),
        '--color-border-subtle': mix(colors.border, 60, colors.surfaceBg),
        '--color-border-strong': colors.strongBorder,
        '--color-text-primary': colors.bodyText,
        '--color-text-secondary': colors.secondaryText,
        '--color-text-tertiary': mix(colors.secondaryText, 78, colors.surfaceBg),
        '--color-text-disabled': mix(colors.secondaryText, 55, colors.surfaceBg),
        '--color-text-inverse': colors.accentText,
        '--color-success': colors.success,
        '--color-success-bg': mix(colors.success, 10, colors.surfaceBg),
        '--color-warning': colors.warning,
        '--color-warning-bg': mix(colors.warning, 10, colors.surfaceBg),
        '--color-error': colors.error,
        '--color-error-bg': mix(colors.error, 9, colors.surfaceBg),
        '--color-info': colors.info,
        '--color-info-bg': mix(colors.info, 9, colors.surfaceBg),
        '--font-size-base': px(appearance.application.fontSize),
        '--app-radius': px(appearance.application.borderRadius),
        '--app-control-height': px(appearance.application.controlHeight),
        '--app-content-padding': px(appearance.content.padding),
        '--app-header-height': px(appearance.headerHeight),
        '--app-content-max-width': px(appearance.content.maxWidth),
    };
}

export function applyVariables(element, variables) {
    Object.entries(variables).forEach(([name, value]) => element.style.setProperty(name, value));
}
