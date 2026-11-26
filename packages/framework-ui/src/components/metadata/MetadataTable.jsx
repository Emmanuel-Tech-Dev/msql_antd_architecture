import { useEffect, useRef, useState } from 'react';
import { Alert, App as AntdApp, Button, Drawer, Modal, Popconfirm, Skeleton, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useDataProvider } from '../../core/provider/DataProvider';
import queryKeys from '../../core/queryKeys';
import utils from '../../utils/function_utils';
import CustomTable from '../CustomTable';
import useCan from '../../core/hooks/access/useCan';
import { getFieldType } from '../../core/metadata/fieldTypes';
import { fieldLabel, primaryKeyOf } from '../../core/metadata/fieldRules';
import { useTableMetadata } from '../../core/metadata/useTableMetadata';
import useDelete from '../../hooks/useDelete';
import useTableApi from '../../hooks/useTableApi';
import MetadataForm from './MetadataForm';

const listFieldsOf = (metadata) => metadata.fields.filter((field) => Number(field.list_visible) === 1 && field.type !== 'primaryKey');
function MetadataTableView({ table, metadata, columns: columnOverrides, addLabel, addTitle, editTitle, header, pageSize, formProps, tableSelection = false, onSelectionChange, bulkActions }) {
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

    const { message } = AntdApp.useApp();
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const [deleting, setDeleting] = useState(false);
    const { setAllowSelection, selectedRows, selectedRowKeys, setSelectedRowKeys, setSelectedRows, runRequest } = tableApi;

    useEffect(() => {
        setAllowSelection(Boolean(tableSelection));
    }, [setAllowSelection, tableSelection]);

    // The page hears about every change of selection, for its own bulk actions.
    const selectionListener = useRef(onSelectionChange);
    useEffect(() => { selectionListener.current = onSelectionChange; }, [onSelectionChange]);
    useEffect(() => { selectionListener.current?.(selectedRows, selectedRowKeys); }, [selectedRowKeys, selectedRows]);

    const clearSelection = () => {
        setSelectedRowKeys([]);
        setSelectedRows([]);
    };
    const refresh = () => {
        runRequest();
        queryClient.invalidateQueries({ queryKey: queryKeys.lists(table) });
    };
    const deleteSelected = async () => {
        setDeleting(true);
        try {
            const { data } = await dataProvider.custom({ url: `api/${table}`, method: 'delete', payload: { ids: selectedRowKeys }, unwrap: true });
            message.success(`${utils.pluralize(data.deleted, singular)} deleted`);
            clearSelection();
            refresh();
        } catch (error) {
            message.error(error?.message ?? `The selected ${singular.toLowerCase()} records could not be deleted`);
        } finally {
            setDeleting(false);
        }
    };

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
    const wide = Number(metadata.table?.form_columns) === 2;
    const containerProps = metadata.table?.stepper
        ? (Container === Drawer ? { width: 960 } : { footer: null, width: 1000 })
        : Container === Drawer
            ? { width: wide ? 720 : 480 }
            : { footer: null, width: wide ? 760 : 520 };

    return (
        <>
            {header ? header({ addButton }) : addButton && <div className="mb-3 flex justify-end">{addButton}</div>}
            {tableSelection && selectedRowKeys.length > 0 && (
                <div role="region" aria-label="Selected records" className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--app-radius,8px)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layout)] px-3 py-2">
                    <strong className="text-[13px]">{selectedRowKeys.length} selected</strong>
                    <span className="flex-1" />
                    {bulkActions?.({ selectedRows, selectedRowKeys, clearSelection, refresh })}
                    {canDelete && (
                        <Popconfirm
                            title={`Delete ${utils.pluralize(selectedRowKeys.length, singular)}?`}
                            description="They are deleted together: if one cannot be deleted, none are."
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                            onConfirm={deleteSelected}
                        >
                            <Button danger icon={<DeleteOutlined />} loading={deleting}>Delete selected</Button>
                        </Popconfirm>
                    )}
                    <Button onClick={clearSelection}>Clear</Button>
                </div>
            )}
            <CustomTable tableConfig={tableApi} columns={[...fieldColumns, ...(actionColumn ? [actionColumn] : [])]} />
            <Container open={Boolean(editing)} title={title} onClose={close} onCancel={close} destroyOnHidden {...containerProps}>
                {form}
            </Container>
        </>
    );
}

// A table's list with search, sort and paging, and its add / edit / delete,
// all from the table's metadata. `columns` adjusts a column by name (title,
// render, ...); `header({ addButton })` places the add button. With
// `tableSelection`, rows can be ticked: Delete selected (for delete:<table>),
// `onSelectionChange(rows, keys)` and `bulkActions({ selectedRows,
// selectedRowKeys, clearSelection, refresh })` for the page's own actions.
export default function MetadataTable({ table, pageSize = 10, metadata: draftMetadata, ...props }) {
    const loaded = useTableMetadata(draftMetadata ? null : table);
    const metadata = draftMetadata ?? loaded.data;
    const { isLoading, error } = draftMetadata ? { isLoading: false, error: null } : loaded;
    if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
    if (error || !metadata) {
        return <Alert type="error" showIcon title="This list could not be loaded" description={error?.message ?? `${table} is not described`} />;
    }
    return <MetadataTableView table={table} metadata={metadata} pageSize={pageSize} {...props} />;
}
