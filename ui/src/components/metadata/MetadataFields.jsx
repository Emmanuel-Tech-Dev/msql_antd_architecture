import { Col, Form, Row } from 'antd';
import { getFieldType } from '../../core/metadata/fieldTypes';
import { conditionMet, fieldLabel, fieldRules, formFieldsOf, isWritableField } from '../../core/metadata/fieldRules';

const CHOICE_TYPES = new Set(['select', 'multiSelect', 'radio', 'checkboxGroup', 'lookup', 'multiLookup']);

function columnSpan(field, formColumns) {
    if (getFieldType(field.type).fullWidth) return 24;
    const span = Number(field.col_span) || 24;
    return span === 24 ? 24 / (formColumns || 1) : span;
}

function FieldItem({ field, mode, readOnly, lookupDependsOn, rules }) {
    const definition = getFieldType(field.type);
    const label = fieldLabel(field);
    const placeholder = field.config?.placeholder ?? `${CHOICE_TYPES.has(field.type) ? 'Select' : 'Enter'} ${label}`;
    const disabled = readOnly || !isWritableField(field, mode);
    return (
        <Form.Item
            name={field.column_name}
            label={label}
            rules={rules}
            extra={field.config?.helpText}
            valuePropName={definition.valuePropName ?? 'value'}
        >
            {definition.input({ field, disabled, placeholder, lookupDependsOn })}
        </Form.Item>
    );
}

// A group of metadata-described fields inside any antd Form: a whole table,
// one section, or a chosen subset (fields). Hand-built forms use it for their
// plain parts. slots: { 'before:<column>': node, 'after:<column>': node }.
export default function MetadataFields({ metadata, mode = 'create', section, fields, readOnly = false, slots = {} }) {
    const formColumns = Number(metadata?.table?.form_columns) || 1;
    const dependsOn = Object.fromEntries((metadata?.lookups ?? []).map((lookup) => [lookup.lookup_key, lookup.depends_on]));

    return (
        <Row gutter={16}>
            {formFieldsOf(metadata, { fields, section }).map((field) => {
                const column = field.column_name;
                const config = field.config ?? {};
                const itemProps = { field, mode, readOnly, lookupDependsOn: dependsOn[config.lookup] ?? undefined };
                const conditional = config.visibleWhen || config.requiredWhen;

                return (
                    <Col key={column} xs={24} md={columnSpan(field, formColumns)}>
                        {slots[`before:${column}`]}
                        {conditional ? (
                            // Re-renders only this field when the form's values change.
                            <Form.Item noStyle shouldUpdate>
                                {({ getFieldsValue }) => {
                                    const values = getFieldsValue(true);
                                    if (!conditionMet(config.visibleWhen, values)) return null;
                                    return <FieldItem {...itemProps} rules={fieldRules(field, values)} />;
                                }}
                            </Form.Item>
                        ) : (
                            <FieldItem {...itemProps} rules={fieldRules(field)} />
                        )}
                        {slots[`after:${column}`]}
                    </Col>
                );
            })}
        </Row>
    );
}
