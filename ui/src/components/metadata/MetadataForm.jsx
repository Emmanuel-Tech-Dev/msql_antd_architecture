import { createElement, useMemo, useState } from 'react';
import { Alert, Button, Form, Skeleton, Space, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import queryKeys from '../../core/queryKeys';
import useCreate from '../../core/hooks/data/useCreate';
import useUpdate from '../../core/hooks/data/useUpdate';
import { getFieldType } from '../../core/metadata/fieldTypes';
import { formFieldsOf, isWritableField } from '../../core/metadata/fieldRules';
import { useTableMetadata } from '../../core/metadata/useTableMetadata';
import { getFormLayout, registerFormLayout } from '../../core/metadata/formLayouts';
import useIcons from '../../hooks/useIcons';
import useNotification from '../../hooks/useNotification';
import MetadataFields from './MetadataFields';
import StepsLayout from './StepsLayout';

// The built-in stepper; a project's own registerFormLayout('steps', ...) wins.
if (!getFormLayout('steps')) registerFormLayout('steps', StepsLayout);

const { Text, Title } = Typography;

const primaryKeyOf = (metadata) => metadata.fields.find((field) => field.type === 'primaryKey')?.column_name ?? 'id';

function startingValues(fields, mode, record, initialValues) {
    return Object.fromEntries(fields.map((field) => {
        const definition = getFieldType(field.type);
        const stored = mode === 'edit'
            ? record?.[field.column_name]
            : initialValues?.[field.column_name] ?? field.config?.default ?? definition.createDefault?.();
        return [field.column_name, definition.toForm(stored, field)];
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
// and `showActions={false}`. A table with a `stepper` setting is shown as
// steps (its own Back / Continue buttons, whatever showActions says).
// `metadata` replaces the loaded metadata (the builder previews a draft
// with it), and `preview` never saves.
// `onSubmit(values, { mode, record })` saves somewhere else (a route of your
// own) instead of POST / PUT /api/:resources: the form still checks every
// field first; what it returns goes to onSaved, and an error carrying
// details.errors ({ column: message }) is shown under those fields.
export default function MetadataForm({
    table,
    record,
    initialValues,
    fields,
    readOnly = false,
    slots = {},
    submitText,
    form: externalForm,
    metadata: draftMetadata,
    preview = false,
    showActions = true,
    notify = true,
    onSubmit,
    onSaved,
    onSaveError,
    onCancel,
}) {
    const { message } = useNotification();
    const [ownForm] = Form.useForm();
    const form = externalForm ?? ownForm;
    const loaded = useTableMetadata(draftMetadata ? null : table);
    const metadata = draftMetadata ?? loaded.data;
    const { isLoading, error } = draftMetadata ? { isLoading: false, error: null } : loaded;
    const mode = record ? 'edit' : 'create';
    const create = useCreate({ resource: table });
    const update = useUpdate({ resource: table });
    const queryClient = useQueryClient();
    const { resolveIcon } = useIcons();
    // Columns the server last refused, so a stepper can open their step.
    const [errorFields, setErrorFields] = useState([]);

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
    const layout = metadata.table?.stepper ? getFormLayout('steps') : null;
    const sections = sectionsOf(metadata, shownFields);

    // Every value in the form, including steps that are not on screen.
    const submit = async () => {
        const values = form.getFieldsValue(true);
        setErrorFields([]);
        if (preview) {
            message.info(`Preview only: this ${singular.toLowerCase()} was not saved`);
            return;
        }
        const payload = Object.fromEntries(shownFields
            .filter((field) => isWritableField(field, mode))
            .map((field) => [field.column_name, getFieldType(field.type).fromForm(values[field.column_name], field)]));
        try {
            let saved;
            if (onSubmit) {
                saved = await onSubmit(payload, { mode, record });
                // The custom route may have changed this table's lists.
                queryClient.invalidateQueries({ queryKey: queryKeys.lists(table) });
            } else {
                saved = mode === 'edit'
                    ? await update.mutateAsync({ id: record[primaryKeyOf(metadata)], variables: payload })
                    : await create.mutateAsync(payload);
            }
            if (notify) message.success(`${singular} ${mode === 'edit' ? 'updated' : 'added'}`);
            onSaved?.(saved, { mode, values: payload });
        } catch (saveError) {
            const fieldErrors = saveError?.details?.errors ?? {};
            const shownErrors = Object.entries(fieldErrors)
                .filter(([column]) => shownFields.some((field) => field.column_name === column));
            setErrorFields(shownErrors.map(([column]) => column));
            // After the stepper has opened the step, so the message is on screen.
            setTimeout(() => form.setFields(shownErrors.map(([column, fieldMessage]) => ({ name: column, errors: [fieldMessage] }))));
            message.error(saveError?.technicalMessage ?? saveError?.message ?? `The ${singular.toLowerCase()} could not be saved`);
            onSaveError?.(saveError);
        }
    };

    const renderSection = (section, { stepLabel } = {}) => (
        <div key={section.key ?? 'main'} className="mb-2">
            {slots[`before:section:${section.key}`]}
            {(section.title || stepLabel) && (
                <div className="mb-4 flex items-start gap-3.5">
                    {section.icon && (
                        <span className="grid size-10 shrink-0 place-items-center rounded-[calc(var(--app-radius,6px)*2)] bg-[var(--color-accent-light)] text-lg text-[var(--color-accent)]">
                            {resolveIcon(section.icon)}
                        </span>
                    )}
                    <div className="flex flex-col gap-0.5">
                        {stepLabel && <span className="font-[var(--font-mono)] text-[11px] tracking-[0.1em] text-[var(--color-text-secondary)]">{stepLabel}</span>}
                        {section.title && <Title level={5} className="!m-0">{section.title}</Title>}
                        {section.description && <Text type="secondary">{section.description}</Text>}
                    </div>
                </div>
            )}
            <MetadataFields metadata={metadata} mode={mode} fields={section.fieldNames} readOnly={readOnly} slots={slots} />
            {slots[`after:section:${section.key}`]}
        </div>
    );

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
            {layout ? createElement(layout, {
                metadata,
                sections,
                renderSection,
                form,
                mode,
                saving: create.isPending || update.isPending,
                submitText,
                singular,
                onCancel,
                errorFields,
            }) : (
                <>
                    {sections.map((section) => renderSection(section))}
                    {showActions && !readOnly && (
                        <Space className="flex justify-end">
                            {onCancel && <Button onClick={onCancel}>Cancel</Button>}
                            <Button type="primary" htmlType="submit" loading={create.isPending || update.isPending}>
                                {submitText ?? (mode === 'edit' ? 'Save changes' : `Add ${singular.toLowerCase()}`)}
                            </Button>
                        </Space>
                    )}
                </>
            )}
        </Form>
    );
}
