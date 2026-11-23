import { useState } from 'react';
import { Alert, Button, Drawer, Modal, Skeleton, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import CustomTable from '../CustomTable';
import useCan from '../../core/hooks/access/useCan';
import { getFieldType } from '../../core/metadata/fieldTypes';
import { fieldLabel } from '../../core/metadata/fieldRules';
import { useTableMetadata } from '../../core/metadata/useTableMetadata';
import useDelete from '../../hooks/useDelete';
import useTableApi from '../../hooks/useTableApi';
import MetadataForm from './MetadataForm';

const listFieldsOf = (metadata) => metadata.fields.filter((field) => Number(field.list_visible) === 1 && field.type !== 'primaryKey');
const primaryKeyOf = (metadata) => metadata.fields.find((field) => field.type === 'primaryKey')?.column_name ?? 'id';

function MetadataTableView({ table, metadata, columns: columnOverrides, addLabel, addTitle, editTitle, header, pageSize, formProps }) {
    const [editing, setEditing] = useState(null);
    const primaryKey = primaryKeyOf(metadata);
    const singular = metadata.table?.singular_label ?? 'record';
    const canCreate = useCan(`create:${table}`);
    const canUpdate = useCan(`update:${table}`);
    const canDelete = useCan(`delete:${table}`);
    const { confirm } = useDelete({ resource: table });
    const tableApi = useTableApi(
        { pagination: { current: 1, pageSize } },
        { manual: false },
        primaryKey,
        { table, defaultLimit: pageSize, maxLimit: 100, searchable: metadata.table?.search_columns ?? [] },
    );

    const searchColumns = metadata.table?.search_columns ?? [];
    const fieldColumns = listFieldsOf(metadata).map((field) => {
        const cell = getFieldType(field.type).cell;
        return {
            title: fieldLabel(field),
            dataIndex: field.column_name,
            key: field.column_name,
            sorter: true,
            render: (value, row) => cell(value, row, field),
            ...(searchColumns.includes(field.column_name) ? tableApi.getColumnSearchProps(field.column_name) : {}),
            ...columnOverrides?.[field.column_name],
        };
    });
    const actionColumn = (canUpdate || canDelete) && {
        title: '',
        key: 'actions',
        width: 112,
        render: (_, row) => (
            <div className="admin-row-actions">
                {canUpdate && (
                    <Tooltip title={`Edit ${singular.toLowerCase()}`}>
                        <Button aria-label={`Edit ${singular.toLowerCase()} ${row[primaryKey]}`} icon={<EditOutlined />} onClick={() => setEditing({ record: row })} />
                    </Tooltip>
                )}
                {canDelete && confirm(
                    row[primaryKey],
                    `Delete this ${singular.toLowerCase()}?`,
                    <Button aria-label={`Delete ${singular.toLowerCase()} ${row[primaryKey]}`} danger icon={<DeleteOutlined />} />,
                )}
            </div>
        ),
    };

    const addButton = canCreate && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ record: null })}>
            {addLabel ?? `Add ${singular.toLowerCase()}`}
        </Button>
    );
    const close = () => setEditing(null);
    const title = editing?.record ? (editTitle ?? `Edit ${singular.toLowerCase()}`) : (addTitle ?? addLabel ?? `Add ${singular.toLowerCase()}`);
    const form = editing && (
        <MetadataForm {...formProps} table={table} record={editing.record} onSaved={close} onCancel={close} />
    );
    const Container = metadata.table?.form_layout === 'drawer' ? Drawer : Modal;
    const containerProps = Container === Drawer
        ? { width: Number(metadata.table?.form_columns) === 2 ? 720 : 480 }
        : { footer: null, width: Number(metadata.table?.form_columns) === 2 ? 760 : 520 };

    return (
        <>
            {header ? header({ addButton }) : addButton && <div className="mb-3 flex justify-end">{addButton}</div>}
            <CustomTable tableConfig={tableApi} columns={[...fieldColumns, ...(actionColumn ? [actionColumn] : [])]} />
            <Container open={Boolean(editing)} title={title} onClose={close} onCancel={close} destroyOnHidden {...containerProps}>
                {form}
            </Container>
        </>
    );
}

// A table's list with search, sort and paging, and its add / edit / delete,
// all from the table's metadata. `columns` adjusts a column by name (title,
// render, ...); `header({ addButton })` places the add button.
export default function MetadataTable({ table, pageSize = 10, ...props }) {
    const { data: metadata, isLoading, error } = useTableMetadata(table);
    if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
    if (error || !metadata) {
        return <Alert type="error" showIcon title="This list could not be loaded" description={error?.message ?? `${table} is not described`} />;
    }
    return <MetadataTableView table={table} metadata={metadata} pageSize={pageSize} {...props} />;
}
