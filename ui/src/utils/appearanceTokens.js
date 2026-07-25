export const ADS_LIGHT_COLORS = Object.freeze({
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

export const ADS_DARK_COLORS = Object.freeze({
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

const px = (value) => `${Math.round(Number(value) * 100) / 100}px`;
const mix = (color, amount, base) => `color-mix(in srgb, ${color} ${amount}%, ${base})`;

export function getAppearancePalette(appearance, isDark) {
    return isDark ? appearance.darkColors : appearance.colors;
}

export function createAdsStyle(appearance, isDark = false) {
    const colors = getAppearancePalette(appearance, isDark);
    const radius = appearance.application.borderRadius;
    const controlHeight = appearance.application.controlHeight;
    const fontSize = appearance.application.fontSize;

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
        '--ads-border': colors.strongBorder,
        '--ads-border-subtle': mix(colors.strongBorder, 58, colors.surfaceBg),
        '--ads-border-strong': mix(colors.strongBorder, 82, colors.bodyText),
        '--ads-accent': colors.accent,
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
        '--ads-font-size-body': px(fontSize),
        '--ads-font-size-body-sm': px(Math.max(11, fontSize - 1)),
        '--ads-font-size-body-lg': px(fontSize + 2),
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
        '--color-border': colors.strongBorder,
        '--color-border-secondary': mix(colors.strongBorder, 70, colors.surfaceBg),
        '--color-border-subtle': mix(colors.strongBorder, 58, colors.surfaceBg),
        '--color-border-strong': mix(colors.strongBorder, 82, colors.bodyText),
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
        '--app-content-max-width': px(appearance.content.maxWidth),
    };
}

export function applyVariables(element, variables) {
    Object.entries(variables).forEach(([name, value]) => element.style.setProperty(name, value));
}
