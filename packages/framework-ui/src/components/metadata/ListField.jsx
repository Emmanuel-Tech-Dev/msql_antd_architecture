import { Button, Col, Form, Grid, Popover, Row } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { getFieldType } from '../../core/metadata/fieldTypes';
import { conditionMet, fieldLabel, fieldRules, parseRows, rowFieldsOf } from '../../core/metadata/fieldRules';
import utils from '../../utils/function_utils';

const CHOICE_TYPES = new Set(['select', 'multiSelect', 'radio', 'checkboxGroup', 'lookup', 'multiLookup']);

// One field inside a row. Inside Form.List names are relative to the list;
// `rowPath` is the row's full name, for conditions that read the row.
function RowFieldItem({ field, name, rowPath, disabled, showLabel }) {
    const definition = getFieldType(field.type);
    const label = fieldLabel(field);
    const placeholder = field.config?.placeholder ?? (showLabel ? `${CHOICE_TYPES.has(field.type) ? 'Select' : 'Enter'} ${label}` : label);
    const item = (rowValues) => (
        <Form.Item
            name={[name, field.column_name]}
            label={label}
            rules={fieldRules(field, rowValues)}
            valuePropName={definition.valuePropName ?? 'value'}
            className={showLabel ? undefined : '!mb-0 [&_.ant-form-item-label]:sr-only'}
        >
            {definition.input({ field, disabled, placeholder })}
        </Form.Item>
    );
    const config = field.config ?? {};
    if (!config.visibleWhen && !config.requiredWhen) return item();
    return (
        <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
                const rowValues = getFieldValue(rowPath) ?? {};
                return conditionMet(config.visibleWhen, rowValues) ? item(rowValues) : null;
            }}
        </Form.Item>
    );
}

const newRow = (fields) => Object.fromEntries(fields
    .filter((field) => field.config?.default !== undefined)
    .map((field) => [field.column_name, getFieldType(field.type).toForm(field.config.default)]));

const rowCountRule = ({ label, unit, required, minRows, maxRows }) => ({
    validator: async (_, rows) => {
        const count = rows?.length ?? 0;
        if (required && count === 0) throw new Error(`${label} is required`);
        if (minRows !== undefined && count < minRows) throw new Error(`${label} needs at least ${utils.pluralize(minRows, unit)}`);
        if (maxRows !== undefined && count > maxRows) throw new Error(`${label} allows at most ${utils.pluralize(maxRows, unit)}`);
    },
});

function AddButton({ label, onAdd, disabled }) {
    return (
        <Button type="dashed" block icon={<PlusOutlined />} onClick={onAdd} disabled={disabled}>{label}</Button>
    );
}

// The rows of one list: a table of inputs, or a card per row.
function Rows({ name, path, fields, display, disabled, rowLabel, addLabel, label, required, minRows, maxRows }) {
    const span = (field) => Number(field.col_span) || 24;
    const columns = `28px ${fields.map((field) => `minmax(0, ${span(field)}fr)`).join(' ')} 32px`;
    return (
        <Form.List name={name} rules={[rowCountRule({ label, unit: rowLabel, required, minRows, maxRows })]}>
            {(rows, { add, remove }, { errors }) => {
                const full = maxRows !== undefined && rows.length >= maxRows;
                // Any row can be removed; minRows is checked when saving, so a
                // wrong row can always be cleared and replaced.
                const removable = !disabled;
                return (
                    <div className="flex flex-col gap-2">
                        {rows.length === 0 && (
                            <div className="rounded-[calc(var(--app-radius,6px)*1.5)] border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-[13px] text-[var(--color-text-secondary)]">
                                No {rowLabel.toLowerCase()}s yet.
                            </div>
                        )}
                        {rows.length > 0 && display === 'table' && (
                            <div role="table" aria-label={label} className="overflow-hidden rounded-[calc(var(--app-radius,6px)*1.5)] border border-[var(--color-border)]">
                                <div role="row" className="grid items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-sunken)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)]" style={{ gridTemplateColumns: columns }}>
                                    <span role="columnheader">#</span>
                                    {fields.map((field) => <span role="columnheader" key={field.column_name}>{fieldLabel(field)}{Number(field.required) === 1 ? ' *' : ''}</span>)}
                                    <span />
                                </div>
                                {rows.map((row, index) => (
                                    <div role="row" key={row.key} className="grid items-start gap-2 border-t border-[var(--color-border-subtle)] px-2.5 py-1.5 first-of-type:border-t-0" style={{ gridTemplateColumns: columns }}>
                                        <span className="pt-1.5 font-[var(--font-mono)] text-[11.5px] text-[var(--color-text-secondary)]">{index + 1}</span>
                                        {fields.map((field) => (
                                            <div role="cell" key={field.column_name} className="min-w-0">
                                                <RowFieldItem field={field} name={row.name} rowPath={[...path, row.name]} disabled={disabled} />
                                            </div>
                                        ))}
                                        {removable ? <Button type="text" size="small" aria-label={`Remove ${rowLabel.toLowerCase()} ${index + 1}`} icon={<CloseOutlined />} onClick={() => remove(row.name)} /> : <span />}
                                    </div>
                                ))}
                            </div>
                        )}
                        {rows.length > 0 && display === 'cards' && rows.map((row, index) => (
                            <section key={row.key} aria-label={`${rowLabel} ${index + 1}`} className="rounded-[calc(var(--app-radius,6px)*1.5)] border border-[var(--color-border)] px-3 pb-1 pt-2">
                                <header className="mb-1 flex items-center justify-between">
                                    <strong className="text-[13px]">{rowLabel} {index + 1}</strong>
                                    {removable && <Button type="text" size="small" aria-label={`Remove ${rowLabel.toLowerCase()} ${index + 1}`} icon={<CloseOutlined />} onClick={() => remove(row.name)} />}
                                </header>
                                <Row gutter={12}>
                                    {fields.map((field) => (
                                        <Col key={field.column_name} xs={24} md={span(field)}>
                                            <RowFieldItem field={field} name={row.name} rowPath={[...path, row.name]} disabled={disabled} showLabel />
                                        </Col>
                                    ))}
                                </Row>
                            </section>
                        ))}
                        {!disabled && <AddButton label={addLabel} disabled={full} onAdd={() => add(newRow(fields))} />}
                        <Form.ErrorList errors={errors} />
                    </div>
                );
            }}
        </Form.List>
    );
}

// list: rows of fields. groupList: groups, each with its own fields and an
// inner list. Rows hold ordinary field definitions (config.fields).
export default function ListField({ field, disabled, required }) {
    const screens = Grid.useBreakpoint();
    const config = field.config ?? {};
    const label = fieldLabel(field);
    const display = screens.md === false ? 'cards' : (config.display ?? 'table');
    const rowFields = rowFieldsOf(config.fields);
    const rowLabel = config.rowLabel ?? (field.type === 'groupList' ? 'Group' : 'Row');
    const addLabel = config.addLabel ?? `Add ${rowLabel.toLowerCase()}`;
    const column = field.column_name;

    const body = field.type !== 'groupList'
        ? <Rows name={column} path={[column]} fields={rowFields} display={display} disabled={disabled} rowLabel={rowLabel} addLabel={addLabel}
            label={label} required={required} minRows={config.minRows} maxRows={config.maxRows} />
        : (
            <Form.List name={column} rules={[rowCountRule({ label, unit: rowLabel, required, minRows: config.minRows, maxRows: config.maxRows })]}>
                {(groups, { add, remove }, { errors }) => {
                    const children = config.children ?? {};
                    const childKey = children.key || 'list';
                    const childFields = rowFieldsOf(children.fields);
                    const childLabel = children.rowLabel ?? 'Item';
                    const full = config.maxRows !== undefined && groups.length >= config.maxRows;
                    return (
                        <div className="flex flex-col gap-2.5">
                            {groups.map((group, index) => (
                                <section key={group.key} aria-label={`${rowLabel} ${index + 1}`} className="overflow-hidden rounded-[calc(var(--app-radius,6px)*1.8)] border border-[var(--color-border)]">
                                    <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-sunken)] px-3 py-1.5">
                                        <strong className="text-[13.5px]">{rowLabel} {index + 1}</strong>
                                        {!disabled && <Button type="text" size="small" aria-label={`Remove ${rowLabel.toLowerCase()} ${index + 1}`} icon={<CloseOutlined />} onClick={() => remove(group.name)} />}
                                    </header>
                                    <div className="flex flex-col gap-1 p-3">
                                        <Row gutter={12}>
                                            {rowFields.map((rowField) => (
                                                <Col key={rowField.column_name} xs={24} md={Number(rowField.col_span) || 24}>
                                                    <RowFieldItem field={rowField} name={group.name} rowPath={[column, group.name]} disabled={disabled} showLabel />
                                                </Col>
                                            ))}
                                        </Row>
                                        <div className="border-l-2 border-[var(--color-accent-light)] pl-3">
                                            <span className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-secondary)]">{children.label ?? 'Items'}</span>
                                            <Rows name={[group.name, childKey]} path={[column, group.name, childKey]} fields={childFields} display={display} disabled={disabled}
                                                rowLabel={childLabel} addLabel={children.addLabel ?? `Add ${childLabel.toLowerCase()}`}
                                                label={`${rowLabel} ${index + 1}, ${children.label ?? 'Items'}`} minRows={children.minRows} maxRows={children.maxRows} />
                                        </div>
                                    </div>
                                </section>
                            ))}
                            {!disabled && <AddButton label={addLabel} disabled={full} onAdd={() => add({ ...newRow(rowFields), [childKey]: [] })} />}
                            <Form.ErrorList errors={errors} />
                        </div>
                    );
                }}
            </Form.List>
        );

    return (
        <Form.Item label={label} required={required} extra={config.helpText}>
            {body}
        </Form.Item>
    );
}

// The list column: a count, with the first rows on hover or focus.
export function ListCell({ value, field }) {
    const config = field.config ?? {};
    const rows = parseRows(value);
    if (!rows.length) return '';
    const rowFields = rowFieldsOf(config.fields).slice(0, 2);
    const describe = (row) => rowFields
        .map((rowField) => ({ rowField, value: row?.[rowField.column_name] }))
        .filter(({ value: cellValue }) => !utils.isBlank(cellValue))
        .map(({ rowField, value: cellValue }) => getFieldType(rowField.type).cell(cellValue, row, rowField));
    const rowLabel = config.rowLabel ?? (field.type === 'groupList' ? 'Group' : 'Row');
    const childKey = config.children?.key || 'list';
    const items = field.type === 'groupList' ? rows.reduce((sum, group) => sum + parseRows(group?.[childKey]).length, 0) : 0;
    const summary = field.type === 'groupList'
        ? `${utils.pluralize(rows.length, rowLabel)} · ${utils.pluralize(items, config.children?.rowLabel ?? 'Item')}`
        : utils.pluralize(rows.length, rowLabel);
    const content = (
        <div className="flex min-w-[220px] flex-col gap-1">
            {rows.slice(0, 4).map((row, index) => (
                <div key={index} className="flex justify-between gap-3 text-[12.5px]">
                    <strong>{describe(row)[0] ?? `${rowLabel} ${index + 1}`}</strong>
                    <span className="text-[var(--color-text-secondary)]">{describe(row).slice(1).join(' · ')}</span>
                </div>
            ))}
            {rows.length > 4 && <span className="text-[12px] text-[var(--color-text-secondary)]">and {rows.length - 4} more</span>}
        </div>
    );
    return (
        <Popover content={content} trigger={['hover', 'focus']}>
            <span tabIndex={0} className="inline-flex cursor-default rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-[12.5px] font-medium text-[var(--color-accent)]">{summary}</span>
        </Popover>
    );
}
