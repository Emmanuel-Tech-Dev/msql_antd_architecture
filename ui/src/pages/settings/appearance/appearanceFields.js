// The editable appearance fields, grouped and named the way the Appearance
// page shows them, and the list of what a draft changes.

// Some palette tokens are always the same colour, so one field sets both.
export const COLOR_GROUPS = [
    {
        key: 'surfaces',
        label: 'Surfaces',
        fields: [
            { tokens: ['contentBg'], label: 'Page background', hint: 'Behind everything' },
            { tokens: ['surfaceBg'], label: 'Cards & panels', hint: 'Tables, forms, cards' },
            { tokens: ['elevatedBg'], label: 'Raised panels', hint: 'Drawers, menus, pop-ups' },
            { tokens: ['siderBg'], label: 'Sidebar', hint: 'Navigation on the left' },
            { tokens: ['headerBg'], label: 'Header', hint: 'Bar with search and bell' },
            { tokens: ['itemHover'], label: 'Hover', hint: 'Menu items under the pointer' },
            { tokens: ['itemActive'], label: 'Selected item', hint: 'Current page in the sidebar' },
        ],
    },
    {
        key: 'text',
        label: 'Text',
        fields: [
            { tokens: ['bodyText', 'textPrimary'], label: 'Main text', hint: 'Headings and body' },
            { tokens: ['secondaryText', 'textMuted'], label: 'Secondary text', hint: 'Hints, captions, labels' },
        ],
    },
    {
        key: 'accent',
        label: 'Accent & borders',
        fields: [
            { tokens: ['accent'], label: 'Accent', hint: 'Main buttons, links, selection' },
            { tokens: ['accentText'], label: 'Text on accent', hint: 'Labels on main buttons' },
            { tokens: ['border'], label: 'Borders: cards, tables', hint: 'Cards, tables, dividers' },
            { tokens: ['strongBorder'], label: 'Borders: input fields', hint: 'Fields, selects, buttons' },
        ],
    },
    {
        key: 'status',
        label: 'Status',
        fields: [
            { tokens: ['success'], label: 'Success', hint: 'Paid, saved, healthy' },
            { tokens: ['warning'], label: 'Warning', hint: 'Part paid, due soon' },
            { tokens: ['error'], label: 'Error', hint: 'Overdue, failed, delete' },
            { tokens: ['info'], label: 'Info', hint: 'Sent, notes, help' },
        ],
    },
    {
        key: 'charts',
        label: 'Charts',
        fields: [
            { tokens: ['chartRevenue'], label: 'Revenue', hint: 'Money in' },
            { tokens: ['chartCosts'], label: 'Costs', hint: 'Money out' },
            { tokens: ['chartNet'], label: 'Net profit', hint: 'What is left' },
        ],
    },
];

export const FONT_ROLES = [
    { key: 'heading', label: 'Headings', sample: 'Invoice INV-2026-014' },
    { key: 'body', label: 'Body', sample: 'Balance due by Friday' },
    { key: 'caption', label: 'Captions', sample: 'DUE 15/11/2026' },
    { key: 'data', label: 'Numbers', sample: 'GH₵ 10,701.33' },
];

export const paletteKey = (mode) => (mode === 'dark' ? 'darkColors' : 'colors');

export const colorFieldChanged = (draft, stored, mode, field) => field.tokens
    .some((token) => draft[paletteKey(mode)][token] !== stored[paletteKey(mode)][token]);

const APPLICATION_LABELS = {
    colorMode: ['theme', 'Colour mode'],
    fontSize: ['text', 'Base text size'],
    borderRadius: ['shape', 'Corner rounding'],
    controlHeight: ['shape', 'Field & button height'],
    density: ['shape', 'Spacing'],
    motionEnabled: ['shape', 'Animations'],
};

// The page shells SiderLayout can draw (layout.sider `variant`).
export const LAYOUT_STYLES = [
    { value: 'business', label: 'Business', hint: 'Sidebar with the business card, sections and your account at the bottom' },
    { value: 'premium', label: 'Premium', hint: 'Sidebar with brand header, grouped menu and profile' },
    { value: 'sider', label: 'Classic sidebar', hint: 'Plain sidebar with a collapse button' },
    { value: 'default', label: 'Default', hint: 'Standard sidebar and header' },
    { value: 'floating', label: 'Floating sidebar', hint: 'Sidebar as a card floating over the page' },
    { value: 'icon-rail', label: 'Icon rail', hint: 'Narrow strip of icons; labels show on hover' },
    { value: 'top', label: 'Top navigation', hint: 'Menu across the top, no sidebar' },
    { value: 'none', label: 'No navigation', hint: 'Content only, without a menu' },
];

// Screen widths below which the sidebar collapses by itself.
export const COLLAPSE_BREAKPOINTS = [
    { value: 'xs', label: '480 px (phones only)' },
    { value: 'sm', label: '576 px' },
    { value: 'md', label: '768 px (tablets)' },
    { value: 'lg', label: '992 px (small laptops)' },
    { value: 'xl', label: '1200 px' },
    { value: 'xxl', label: '1600 px (large screens)' },
];

const LAYOUT_LABELS = {
    variant: 'Layout style',
    theme: 'Sidebar colour',
    breakpoint: 'Collapse below',
    groupVariant: 'Menu groups',
    bottomKey: 'Pinned page',
    width: 'Sidebar width',
    collapsedWidth: 'Collapsed sidebar width',
    headerHeight: 'Header height',
    collapsible: 'Collapsible sidebar',
    defaultCollapsed: 'Start collapsed',
    isGrouped: 'Group navigation',
};

const BRAND_LABELS = { name: 'Name', caption: 'Caption', mark: 'Mark' };

// Each change as { section, label }, so the page can mark the sections that
// have unsaved edits and the save bar can name them.
export function describeChanges(draft, stored) {
    const changes = [];
    if (draft.themeName !== stored.themeName) changes.push({ section: 'theme', label: 'Theme name' });
    for (const mode of ['light', 'dark']) {
        for (const group of COLOR_GROUPS) {
            for (const field of group.fields) {
                if (colorFieldChanged(draft, stored, mode, field)) {
                    changes.push({ section: 'colours', label: mode === 'dark' ? `${field.label} (dark)` : field.label });
                }
            }
        }
    }
    for (const role of FONT_ROLES) {
        if (draft.application.fonts[role.key] !== stored.application.fonts[role.key]) {
            changes.push({ section: 'text', label: `${role.label} font` });
        }
    }
    for (const [key, [section, label]] of Object.entries(APPLICATION_LABELS)) {
        if (draft.application[key] !== stored.application[key]) changes.push({ section, label });
    }
    for (const [key, label] of Object.entries(LAYOUT_LABELS)) {
        if (draft[key] !== stored[key]) changes.push({ section: 'layout', label });
    }
    if (draft.content.maxWidth !== stored.content.maxWidth) changes.push({ section: 'shape', label: 'Page width' });
    if (draft.content.padding !== stored.content.padding) changes.push({ section: 'shape', label: 'Page padding' });
    if (draft.header.sticky !== stored.header.sticky) changes.push({ section: 'layout', label: 'Sticky header' });
    for (const [key, label] of Object.entries(BRAND_LABELS)) {
        if (draft.brand[key] !== stored.brand[key]) changes.push({ section: 'brand', label: `Brand ${label.toLowerCase()}` });
    }
    return changes;
}
