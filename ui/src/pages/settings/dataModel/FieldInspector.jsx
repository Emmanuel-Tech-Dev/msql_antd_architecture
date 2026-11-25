import { useState } from 'react';
import { Button, Checkbox, Input, InputNumber, Segmented, Select, Switch, Tabs } from 'antd';
import { ArrowDownOutlined, ArrowLeftOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { NOT_IN_ROWS } from '../../../core/metadata/fieldRules';
import { FIELD_TYPE_GROUPS, LIST_TYPES, LOOKUP_TYPES, NUMBER_TYPES, OPTION_TYPES, WIDTHS, typeLabel } from './fieldCatalogue';
import { Eyebrow } from './dataModelShared';
import utils from '../../../utils/function_utils';

const RULES = [
    { value: 'pattern', label: 'Pattern' }, { value: 'minLength', label: 'At least … characters' },
    { value: 'maxLength', label: 'At most … characters' }, { value: 'min', label: 'At least' }, { value: 'max', label: 'At most' },
];
const FILE_TYPES = [
    { value: 'image/jpeg', label: 'JPG' }, { value: 'image/png', label: 'PNG' }, { value: 'image/webp', label: 'WebP' },
    { value: 'image/gif', label: 'GIF' }, { value: 'application/pdf', label: 'PDF' },
];

function Labelled({ label, hint, children }) {
    return (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            {label}
            {children}
            {hint && <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">{hint}</span>}
        </label>
    );
}

function Toggle({ label, checked, onChange, disabled }) {
    return (
        <label className="flex items-center justify-between gap-2 rounded-[calc(var(--app-radius,6px)*1.6)] border border-[var(--color-border)] px-3 py-2.5 text-[13.5px] font-medium">
            {label}
            <Switch size="small" checked={checked} disabled={disabled} onChange={onChange} />
        </label>
    );
}

// "Show this field when <field> is one of <values>", the form the server and
// MetadataForm read: { field, in: [...] }.
function ConditionEditor({ label, condition, onChange, otherFields }) {
    return (
        <div className="flex flex-col gap-2 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-3">
            <span className="text-[13px] font-semibold">{label}</span>
            <Select allowClear placeholder="Always" value={condition?.field} aria-label={`${label}: field`}
                options={otherFields.map((field) => ({ value: field.column_name, label: field.col_real_name || field.column_name }))}
                onChange={(field) => onChange(field ? { field, in: condition?.in ?? [] } : undefined)} />
            {condition?.field && (
                <Select mode="tags" placeholder="is one of… (type a value, press Enter)" aria-label={`${label}: values`} value={condition.in ?? []}
                    options={(otherFields.find((field) => field.column_name === condition.field)?.config?.options ?? []).map((option) => ({ value: String(option.value), label: option.label }))}
                    onChange={(values) => onChange({ field: condition.field, in: values })} />
            )}
        </div>
    );
}

const ROW_TYPE_GROUPS = FIELD_TYPE_GROUPS
    .map((group) => ({ ...group, options: group.options.filter((option) => !NOT_IN_ROWS.has(option.value)) }))
    .filter((group) => group.options.length);

// The fields of each row of a list (or of a groupList's groups or items).
// Each one is edited with the same inspector as a table field.
function RowFieldsEditor({ title, fields, onChange, lookups, permissions }) {
    const [open, setOpen] = useState(null);
    const rowFields = fields ?? [];
    const update = (index, next) => onChange(rowFields.map((rowField, at) => (at === index ? next : rowField)));
    const move = (index, step) => {
        const next = [...rowFields];
        [next[index], next[index + step]] = [next[index + step], next[index]];
        onChange(next);
    };
    const addField = () => {
        let number = rowFields.length + 1;
        while (rowFields.some((rowField) => rowField.column_name === `field_${number}`)) number += 1;
        onChange([...rowFields, { column_name: `field_${number}`, col_real_name: `Field ${number}`, type: 'text', required: 0, config: null }]);
        setOpen(rowFields.length);
    };

    if (open !== null && rowFields[open]) {
        return (
            <div className="flex flex-col gap-3 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] p-3">
                <Button type="link" className="!self-start !px-0" icon={<ArrowLeftOutlined />} onClick={() => setOpen(null)}>{title}</Button>
                <FieldInspector inRow field={rowFields[open]} lookups={lookups} permissions={permissions} sections={[]}
                    otherFields={rowFields.filter((_, at) => at !== open)} onChange={(next) => update(open, next)} />
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">{title}</span>
            {rowFields.map((rowField, index) => (
                <div key={`${rowField.column_name}-${index}`} className="flex items-center gap-1 rounded-[calc(var(--app-radius,6px)*1.5)] border border-[var(--color-border)] py-1 pl-2.5 pr-1">
                    <button type="button" className="flex min-w-0 grow cursor-pointer flex-col border-0 bg-transparent p-0 text-left" onClick={() => setOpen(index)}>
                        <strong className="truncate text-[13px]">{rowField.col_real_name || rowField.column_name}{Number(rowField.required) === 1 ? ' *' : ''}</strong>
                        <span className="truncate font-[var(--font-mono)] text-[11.5px] text-[var(--color-text-secondary)]">{rowField.column_name} · {typeLabel(rowField.type)}</span>
                    </button>
                    <Button type="text" size="small" aria-label={`Move ${rowField.column_name} up`} icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} />
                    <Button type="text" size="small" aria-label={`Move ${rowField.column_name} down`} icon={<ArrowDownOutlined />} disabled={index === rowFields.length - 1} onClick={() => move(index, 1)} />
                    <Button type="text" size="small" aria-label={`Remove ${rowField.column_name}`} icon={<DeleteOutlined />} onClick={() => onChange(rowFields.filter((_, at) => at !== index))} />
                </div>
            ))}
            {!rowFields.length && <span className="text-[12.5px] text-[var(--color-text-secondary)]">No fields yet: a row needs at least one.</span>}
            <Button type="dashed" icon={<PlusOutlined />} onClick={addField}>Add field</Button>
        </div>
    );
}

// Rows: labels and how many (a list's rows, a groupList's groups or items).
function RowSettings({ config, onChange, unit }) {
    return (
        <div className="grid grid-cols-2 gap-2.5">
            <Labelled label={`${unit} label`}><Input placeholder={unit} value={config.rowLabel} onChange={(event) => onChange('rowLabel', event.target.value || undefined)} /></Labelled>
            <Labelled label="Add button"><Input placeholder={`Add ${(config.rowLabel ?? unit).toLowerCase()}`} value={config.addLabel} onChange={(event) => onChange('addLabel', event.target.value || undefined)} /></Labelled>
            <Labelled label="At least"><InputNumber className="!w-full" min={0} value={config.minRows} onChange={(value) => onChange('minRows', value ?? undefined)} /></Labelled>
            <Labelled label="At most"><InputNumber className="!w-full" min={1} value={config.maxRows} onChange={(value) => onChange('maxRows', value ?? undefined)} /></Labelled>
        </div>
    );
}

function ListSettings({ field, config, setConfig, lookups, permissions }) {
    const children = config.children ?? {};
    const setChildren = (key, value) => {
        const next = { key: children.key ?? 'items', ...children, [key]: value };
        if (value === undefined) delete next[key];
        setConfig('children', next);
    };
    return (
        <div className="flex flex-col gap-3 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-3">
            <div className="flex flex-col gap-1.5 text-[13px] font-semibold">Row style
                <Segmented block value={config.display ?? 'table'} onChange={(display) => setConfig('display', display === 'table' ? undefined : display)}
                    options={[{ value: 'table', label: 'Table' }, { value: 'cards', label: 'Cards' }]} />
                <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">Phones always show cards. Stored as JSON in one column.</span>
            </div>
            {field.type === 'list' ? (
                <>
                    <RowSettings config={config} onChange={setConfig} unit="Row" />
                    <RowFieldsEditor title="Row fields" fields={config.fields} onChange={(fields) => setConfig('fields', fields)} lookups={lookups} permissions={permissions} />
                </>
            ) : (
                <Tabs size="small" items={[
                    {
                        key: 'groups', label: 'Group fields',
                        children: (
                            <div className="flex flex-col gap-3">
                                <RowSettings config={config} onChange={setConfig} unit="Group" />
                                <RowFieldsEditor title="Group fields" fields={config.fields} onChange={(fields) => setConfig('fields', fields)} lookups={lookups} permissions={permissions} />
                            </div>
                        ),
                    },
                    {
                        key: 'items', label: `Inner list · ${children.key ?? 'items'}`,
                        children: (
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <Labelled label="List label"><Input placeholder="Items" value={children.label} onChange={(event) => setChildren('label', event.target.value || undefined)} /></Labelled>
                                    <Labelled label="Stored under" hint="Key inside each group"><Input value={children.key ?? 'items'}
                                        onChange={(event) => utils.isIdentifier(event.target.value) && setChildren('key', event.target.value)} /></Labelled>
                                </div>
                                <RowSettings config={children} onChange={setChildren} unit="Item" />
                                <RowFieldsEditor title="Item fields" fields={children.fields} onChange={(fields) => setChildren('fields', fields)} lookups={lookups} permissions={permissions} />
                            </div>
                        ),
                    },
                ]} />
            )}
        </div>
    );
}

// Settings of one field in the form designer. `inRow`: a field inside a
// list's row, which has no table-level settings (visibility, section, access).
export default function FieldInspector({ field, sections, lookups, permissions, otherFields, onChange, inRow = false }) {
    const config = field.config ?? {};
    const set = (changes) => onChange({ ...field, ...changes });
    const setConfig = (key, value) => {
        const next = { ...config, [key]: value };
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) delete next[key];
        set({ config: Object.keys(next).length ? next : null });
    };
    const options = config.options ?? [];
    const setOption = (index, changes) => setConfig('options', options.map((option, at) => (at === index ? { ...option, ...changes } : option)));
    const rules = config.rules ?? [];
    const setRule = (index, changes) => setConfig('rules', rules.map((rule, at) => (at === index ? { ...rule, ...changes } : rule)));
    const isKey = field.type === 'primaryKey';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
                <Eyebrow>FIELD · {field.column_name}</Eyebrow>
                <strong className="font-[var(--font-heading)] text-[17px] font-semibold">{field.col_real_name || field.column_name}</strong>
            </div>
            <Labelled label="Label"><Input value={field.col_real_name} onChange={(event) => set({ col_real_name: event.target.value })} /></Labelled>
            {inRow && (
                <Labelled label="Key" hint="Name of this value inside each row: letters, digits and _">
                    <Input value={field.column_name} onChange={(event) => utils.isIdentifier(event.target.value) && set({ column_name: event.target.value })} />
                </Labelled>
            )}
            <Labelled label="Field type"><Select value={field.type} options={inRow ? ROW_TYPE_GROUPS : FIELD_TYPE_GROUPS} onChange={(type) => set({ type })} disabled={isKey} /></Labelled>
            {inRow ? (
                <Toggle label="Required" checked={Number(field.required) === 1} onChange={(on) => set({ required: on ? 1 : 0 })} />
            ) : (
            <div className="grid grid-cols-2 gap-2.5">
                <Toggle label="In the form" checked={Number(field.form_visible) === 1} disabled={isKey} onChange={(on) => set({ form_visible: on ? 1 : 0 })} />
                <Toggle label="In the list" checked={Number(field.list_visible) === 1} onChange={(on) => set({ list_visible: on ? 1 : 0 })} />
                <Toggle label="Required" checked={Number(field.required) === 1} disabled={isKey} onChange={(on) => set({ required: on ? 1 : 0 })} />
                <Toggle label="Editable" checked={Number(field.editable) !== 0} disabled={isKey} onChange={(on) => set({ editable: on ? 1 : 0 })} />
                <Toggle label="Read-only" checked={Number(field.disabled) === 1} disabled={isKey} onChange={(on) => set({ disabled: on ? 1 : 0 })} />
            </div>
            )}
            <div className="flex flex-col gap-1.5 text-[13px] font-semibold">Width
                <Segmented block value={Number(field.col_span) || 24} onChange={(col_span) => set({ col_span })} options={WIDTHS} />
            </div>
            {!inRow && sections.length > 0 && (
                <Labelled label="Section">
                    <Select allowClear placeholder="No section" value={field.section_key ?? undefined} onChange={(section_key) => set({ section_key: section_key ?? null })}
                        options={sections.map((section) => ({ value: section.key, label: section.title || section.key }))} />
                </Labelled>
            )}
            <Labelled label="Placeholder"><Input value={config.placeholder} onChange={(event) => setConfig('placeholder', event.target.value)} /></Labelled>
            <Labelled label="Help text"><Input.TextArea autoSize={{ minRows: 2 }} value={config.helpText} onChange={(event) => setConfig('helpText', event.target.value)} /></Labelled>
            <Labelled label="Default for new records"><Input value={config.default} onChange={(event) => setConfig('default', event.target.value)} /></Labelled>

            {LIST_TYPES.has(field.type) && !inRow && (
                <ListSettings field={field} config={config} setConfig={setConfig} lookups={lookups} permissions={permissions} />
            )}
            {OPTION_TYPES.has(field.type) && (
                <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold">Options</span>
                    {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <Input aria-label={`Option ${index + 1} value`} placeholder="Value" value={option.value} onChange={(event) => setOption(index, { value: event.target.value })} />
                            <Input aria-label={`Option ${index + 1} label`} placeholder="Label" value={option.label} onChange={(event) => setOption(index, { label: event.target.value })} />
                            <Button type="text" aria-label={`Remove option ${index + 1}`} icon={<DeleteOutlined />} onClick={() => setConfig('options', options.filter((_, at) => at !== index))} />
                        </div>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => setConfig('options', [...options, { value: '', label: '' }])}>Add option</Button>
                    {['select', 'multiSelect'].includes(field.type) && (
                        <Segmented block value={config.display ?? 'dropdown'} onChange={(display) => setConfig('display', display === 'dropdown' ? undefined : display)}
                            options={[{ value: 'dropdown', label: 'Dropdown' }, { value: 'chips', label: 'Chips' }, { value: 'cards', label: 'Cards' }]} />
                    )}
                </div>
            )}
            {LOOKUP_TYPES.has(field.type) && (
                <Labelled label="Lookup" hint="Where the choices come from. Edit lookups on the Lookups tab.">
                    <Select value={config.lookup} onChange={(lookup) => setConfig('lookup', lookup)}
                        options={lookups.map((lookup) => ({ value: lookup.lookup_key, label: `${lookup.lookup_key} · ${lookup.source_table}` }))} />
                </Labelled>
            )}
            {field.type === 'money' && <Labelled label="Currency"><Input placeholder="GHS" value={config.currency} onChange={(event) => setConfig('currency', event.target.value.toUpperCase())} /></Labelled>}
            {NUMBER_TYPES.has(field.type) && (
                <div className="grid grid-cols-2 gap-2.5">
                    <Labelled label="Lowest"><InputNumber className="!w-full" value={config.min} onChange={(value) => setConfig('min', value ?? undefined)} /></Labelled>
                    <Labelled label="Highest"><InputNumber className="!w-full" value={config.max} onChange={(value) => setConfig('max', value ?? undefined)} /></Labelled>
                </div>
            )}
            {['file', 'image'].includes(field.type) && (
                <>
                    <div className="flex flex-col gap-1.5 text-[13px] font-semibold">Accepted files
                        <Checkbox.Group value={config.accept ?? []} onChange={(accept) => setConfig('accept', accept)}
                            options={FILE_TYPES.filter((type) => field.type === 'file' || type.value.startsWith('image/'))} />
                        <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">None ticked: every type this kind of field allows.</span>
                    </div>
                    <Labelled label="Largest file (MB)"><InputNumber className="!w-full" min={1} max={10} value={config.maxSizeMb} onChange={(value) => setConfig('maxSizeMb', value ?? undefined)} /></Labelled>
                </>
            )}

            <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">Rules</span>
                {rules.map((rule, index) => (
                    <div key={index} className="flex flex-col gap-1.5 rounded-[calc(var(--app-radius,6px)*1.6)] border border-[var(--color-border)] p-2.5">
                        <div className="flex items-center gap-1.5">
                            <Select className="grow" aria-label={`Rule ${index + 1}`} value={rule.rule} options={RULES} onChange={(value) => setRule(index, { rule: value })} />
                            <Button type="text" aria-label={`Remove rule ${index + 1}`} icon={<DeleteOutlined />} onClick={() => setConfig('rules', rules.filter((_, at) => at !== index))} />
                        </div>
                        <Input aria-label={`Rule ${index + 1} value`} placeholder={rule.rule === 'pattern' ? '^[A-Z]{3}$' : 'Number'} value={rule.value}
                            onChange={(event) => setRule(index, { value: rule.rule === 'pattern' ? event.target.value : Number(event.target.value) || event.target.value })} />
                        <Input aria-label={`Rule ${index + 1} message`} placeholder="Message (optional)" value={rule.message} onChange={(event) => setRule(index, { message: event.target.value || undefined })} />
                    </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => setConfig('rules', [...rules, { rule: 'minLength', value: 3 }])}>Add rule</Button>
            </div>

            {!inRow && (
            <div className="flex flex-col gap-2.5 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-3">
                <span className="text-[13px] font-semibold">Access</span>
                {[['readPermission', 'Who can see it', 'Everyone who can read the table'], ['writePermission', 'Who can change it', 'Same as who can see it']].map(([key, label, empty]) => (
                    <label key={key} className="flex flex-col gap-1.5 text-[13px] font-medium">{label}
                        <Select showSearch allowClear placeholder={empty} value={config[key]} onChange={(value) => setConfig(key, value)} disabled={isKey}
                            options={permissions.map((permission) => ({ value: permission.permission_name, label: permission.permission_name, title: permission.description }))} />
                    </label>
                ))}
                <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                    Enforced by the server: without the permission the field is left out of records, forms and lists, or shown read-only. Add permissions on the Permissions page and give them to roles.
                </span>
            </div>
            )}

            <ConditionEditor label="Show this field when" condition={config.visibleWhen} otherFields={otherFields} onChange={(value) => setConfig('visibleWhen', value)} />
            <ConditionEditor label="Required when" condition={config.requiredWhen} otherFields={otherFields} onChange={(value) => setConfig('requiredWhen', value)} />
        </div>
    );
}
