// The builder's field-type catalogue and small helpers shared by its screens.

// The field types the builder offers, grouped as in the type catalogue.
export const FIELD_TYPE_GROUPS = [
    { label: 'Text', options: [['text', 'Text'], ['textarea', 'Long text'], ['richText', 'Rich text'], ['email', 'Email'], ['phone', 'Phone'], ['url', 'Web address'], ['password', 'Password']] },
    { label: 'Numbers', options: [['integer', 'Whole number'], ['number', 'Number'], ['money', 'Money'], ['percent', 'Percent'], ['duration', 'Duration']] },
    { label: 'Dates', options: [['date', 'Date'], ['dateTime', 'Date and time'], ['time', 'Time']] },
    { label: 'Choices', options: [['switch', 'Yes / no'], ['select', 'Select'], ['multiSelect', 'Several choices'], ['radio', 'Radio'], ['checkboxGroup', 'Checkboxes']] },
    { label: 'From another table', options: [['lookup', 'Lookup'], ['multiLookup', 'Several from lookup']] },
    { label: 'Files', options: [['image', 'Image'], ['file', 'File'], ['icon', 'Icon']] },
    { label: 'System', options: [['primaryKey', 'Primary key'], ['generatedId', 'Generated ID']] },
].map((group) => ({ label: group.label, options: group.options.map(([value, label]) => ({ value, label })) }));

const TYPE_LABELS = Object.fromEntries(FIELD_TYPE_GROUPS.flatMap((group) => group.options.map((option) => [option.value, option.label])));
export const typeLabel = (type) => TYPE_LABELS[type] ?? type;
export const OPTION_TYPES = new Set(['select', 'multiSelect', 'radio', 'checkboxGroup']);
export const LOOKUP_TYPES = new Set(['lookup', 'multiLookup']);
export const NUMBER_TYPES = new Set(['integer', 'number', 'money', 'percent', 'duration']);

export const WIDTHS = [
    { value: 24, label: 'Full' }, { value: 12, label: 'Half' }, { value: 8, label: 'Third' }, { value: 6, label: 'Quarter' },
];

export function humanize(name) {
    const words = String(name ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim().toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}
