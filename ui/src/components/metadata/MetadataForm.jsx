import { useMemo } from 'react';
import { Alert, Button, Form, Skeleton, Space, Typography } from 'antd';
import useCreate from '../../core/hooks/data/useCreate';
import useUpdate from '../../core/hooks/data/useUpdate';
import { getFieldType } from '../../core/metadata/fieldTypes';
import { formFieldsOf, isWritableField } from '../../core/metadata/fieldRules';
import { useTableMetadata } from '../../core/metadata/useTableMetadata';
import useNotification from '../../hooks/useNotification';
import MetadataFields from './MetadataFields';

const { Text, Title } = Typography;

const primaryKeyOf = (metadata) => metadata.fields.find((field) => field.type === 'primaryKey')?.column_name ?? 'id';

function startingValues(fields, mode, record, initialValues) {
    return Object.fromEntries(fields.map((field) => {
        const definition = getFieldType(field.type);
        const stored = mode === 'edit'
            ? record?.[field.column_name]
            : initialValues?.[field.column_name] ?? field.config?.default ?? definition.createDefault?.();
        return [field.column_name, definition.toForm(stored)];
    }));
}

// Sections in the table's order, each with its field names. Fields without
// a known section come first, without a heading.
function sectionsOf(metadata, shownFields) {
    const sections = Array.isArray(metadata.table?.sections) ? metadata.table.sections : [];
    const known = new Set(sections.map((section) => section.key));
    const namesIn = (inSection) => shownFields.filter(inSection).map((field) => field.column_name);
    return [
        { key: null, fieldNames: namesIn((field) => !known.has(field.section_key)) },
        ...sections.map((section) => ({ ...section, fieldNames: namesIn((field) => field.section_key === section.key) })),
    ].filter((section) => section.fieldNames.length);
}

// A create / edit form built from a table's metadata. With `record` it edits
// that record, otherwise it adds one. `fields` limits it to some columns.
// A caller that submits from its own button (a modal's OK) passes `form`
// and `showActions={false}`.
export default function MetadataForm({
    table,
    record,
    initialValues,
    fields,
    readOnly = false,
    slots = {},
    submitText,
    form: externalForm,
    showActions = true,
    notify = true,
    onSaved,
    onSaveError,
    onCancel,
}) {
    const { message } = useNotification();
    const [ownForm] = Form.useForm();
    const form = externalForm ?? ownForm;
    const { data: metadata, isLoading, error } = useTableMetadata(table);
    const mode = record ? 'edit' : 'create';
    const create = useCreate({ resource: table });
    const update = useUpdate({ resource: table });

    const shownFields = useMemo(() => (metadata ? formFieldsOf(metadata, { fields }) : []), [metadata, fields]);
    const formValues = useMemo(
        () => startingValues(shownFields, mode, record, initialValues),
        [shownFields, mode, record, initialValues],
    );

    if (isLoading) return <Skeleton active paragraph={{ rows: 4 }} />;
    if (error || !metadata) {
        return <Alert type="error" showIcon title="This form could not be loaded" description={error?.message ?? `${table} is not described`} />;
    }

    const singular = metadata.table?.singular_label ?? 'Record';

    const submit = async (values) => {
        const payload = Object.fromEntries(shownFields
            .filter((field) => isWritableField(field, mode))
            .map((field) => [field.column_name, getFieldType(field.type).fromForm(values[field.column_name])]));
        try {
            const saved = mode === 'edit'
                ? await update.mutateAsync({ id: record[primaryKeyOf(metadata)], variables: payload })
                : await create.mutateAsync(payload);
            if (notify) message.success(`${singular} ${mode === 'edit' ? 'updated' : 'added'}`);
            onSaved?.(saved, { mode, values: payload });
        } catch (saveError) {
            const fieldErrors = saveError?.details?.errors ?? {};
            form.setFields(Object.entries(fieldErrors)
                .filter(([column]) => shownFields.some((field) => field.column_name === column))
                .map(([column, fieldMessage]) => ({ name: column, errors: [fieldMessage] })));
            message.error(saveError?.technicalMessage ?? saveError?.message ?? `The ${singular.toLowerCase()} could not be saved`);
            onSaveError?.(saveError);
        }
    };

    return (
        <Form
            key={`${table}:${mode}:${record ? record[primaryKeyOf(metadata)] : 'new'}`}
            form={form}
            layout="vertical"
            initialValues={formValues}
            onFinish={submit}
            disabled={readOnly}
            scrollToFirstError
        >
            {sectionsOf(metadata, shownFields).map((section) => (
                <div key={section.key ?? 'main'} className="mb-2">
                    {slots[`before:section:${section.key}`]}
                    {section.title && (
                        <div className="mb-3">
                            <Title level={5} className="!mb-0">{section.title}</Title>
                            {section.description && <Text type="secondary">{section.description}</Text>}
                        </div>
                    )}
                    <MetadataFields metadata={metadata} mode={mode} fields={section.fieldNames} readOnly={readOnly} slots={slots} />
                    {slots[`after:section:${section.key}`]}
                </div>
            ))}
            {showActions && !readOnly && (
                <Space className="flex justify-end">
                    {onCancel && <Button onClick={onCancel}>Cancel</Button>}
                    <Button type="primary" htmlType="submit" loading={create.isPending || update.isPending}>
                        {submitText ?? (mode === 'edit' ? 'Save changes' : `Add ${singular.toLowerCase()}`)}
                    </Button>
                </Space>
            )}
        </Form>
    );
}
