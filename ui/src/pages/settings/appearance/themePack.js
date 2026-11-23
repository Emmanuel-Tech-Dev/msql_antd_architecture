// Theme pack CSV: one row per token, columns theme_name, mode, token, value.
// Light and dark rows hold colours; global rows hold fonts and sizes.

import { CHART_COLOR_FALLBACKS } from '../../../core/config/siderConfig';

export const THEME_COLOR_TOKENS = [
    'siderBg', 'headerBg', 'contentBg', 'accent', 'accentText', 'textPrimary', 'textMuted',
    'border', 'itemHover', 'itemActive', 'surfaceBg', 'elevatedBg', 'bodyText', 'secondaryText',
    'strongBorder', 'success', 'warning', 'error', 'info', 'chartRevenue', 'chartCosts', 'chartNet',
];

export const FONT_OPTIONS = ['Inter', 'Newsreader', 'IBM Plex Mono', 'Geist', 'Geist Mono']
    .map((value) => ({ value, label: value }));

const GLOBAL_FONT_TOKENS = [
    ['headingFont', 'heading'],
    ['bodyFont', 'body'],
    ['captionFont', 'caption'],
    ['dataFont', 'data'],
];

const SIZE_LIMITS = {
    borderRadius: [0, 20],
    controlHeight: [28, 52],
    fontSize: [12, 18],
};

export const COLOR_VALUE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i;

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

function readGlobalRow(application, token, value, lineNumber) {
    const fontToken = GLOBAL_FONT_TOKENS.find(([field]) => field === token);
    if (fontToken) {
        if (!FONT_OPTIONS.some((option) => option.value === value)) {
            throw new Error(`Row ${lineNumber} uses unsupported font "${value}".`);
        }
        application.fonts[fontToken[1]] = value;
        return;
    }
    if (token === 'density') {
        if (!['compact', 'comfortable', 'spacious'].includes(value)) {
            throw new Error(`Row ${lineNumber} has an invalid density.`);
        }
        application.density = value;
        return;
    }
    if (!SIZE_LIMITS[token]) {
        throw new Error(`Row ${lineNumber} uses unsupported global token "${token}".`);
    }
    const number = Number(value);
    const [minimum, maximum] = SIZE_LIMITS[token];
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
        throw new Error(`Row ${lineNumber} has an invalid ${token} value.`);
    }
    application[token] = number;
}

export function parseThemePack(csv) {
    const lines = csv
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length < 2) throw new Error('The CSV needs a header and theme rows.');

    const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
    const themeNameIndex = header.indexOf('theme_name');
    const modeIndex = header.indexOf('mode');
    const tokenIndex = header.indexOf('token');
    const valueIndex = header.indexOf('value');
    if ([themeNameIndex, modeIndex, tokenIndex, valueIndex].some((index) => index < 0)) {
        throw new Error('Use the CSV columns: theme_name, mode, token, value.');
    }

    const allowedColorTokens = new Set(THEME_COLOR_TOKENS);
    const themeNames = new Set();
    const palettes = { light: {}, dark: {} };
    const application = { fonts: {} };
    for (const [lineOffset, line] of lines.slice(1).entries()) {
        const cells = parseCsvLine(line);
        const mode = cells[modeIndex]?.toLowerCase();
        const token = cells[tokenIndex];
        const value = cells[valueIndex];
        const lineNumber = lineOffset + 2;
        const themeName = cells[themeNameIndex]?.trim();
        if (themeName) themeNames.add(themeName);

        if (!['light', 'dark', 'global'].includes(mode)) {
            throw new Error(`Row ${lineNumber} must use light, dark or global mode.`);
        }
        if (mode === 'global') {
            readGlobalRow(application, token, value, lineNumber);
            continue;
        }
        if (!allowedColorTokens.has(token)) {
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

    // Chart colours are optional; a pack without them uses its own accent,
    // warning and success colours.
    for (const mode of ['light', 'dark']) {
        for (const [token, fallbackToken] of Object.entries(CHART_COLOR_FALLBACKS)) {
            palettes[mode][token] ??= palettes[mode][fallbackToken];
        }
    }
    const missing = ['light', 'dark'].flatMap((mode) => THEME_COLOR_TOKENS
        .filter((token) => !palettes[mode][token])
        .map((token) => `${mode}.${token}`));
    if (missing.length) {
        throw new Error(`The CSV is incomplete. Missing: ${missing.join(', ')}.`);
    }
    if (themeNames.size > 1) {
        throw new Error('All rows in a theme pack must use the same theme_name.');
    }

    return {
        ...palettes,
        themeName: [...themeNames][0] || 'Imported theme',
        application,
    };
}

export function themePackCsv(config) {
    const { themeName, application } = config;
    const rows = [
        ['theme_name', 'mode', 'token', 'value'],
        ...['light', 'dark'].flatMap((mode) => {
            const palette = config[mode === 'dark' ? 'darkColors' : 'colors'];
            return THEME_COLOR_TOKENS.map((token) => [themeName, mode, token, palette[token]]);
        }),
        ...GLOBAL_FONT_TOKENS.map(([token, key]) => [themeName, 'global', token, application.fonts[key]]),
        [themeName, 'global', 'density', application.density],
        [themeName, 'global', 'borderRadius', application.borderRadius],
        [themeName, 'global', 'controlHeight', application.controlHeight],
        [themeName, 'global', 'fontSize', application.fontSize],
    ];
    return rows.map((cells) => cells.map(toCsvCell).join(',')).join('\n');
}
