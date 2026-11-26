import { useDeferredValue, useMemo, useState } from 'react';
import { Alert, Button, Drawer, Empty, Form, Spin, Tag, Typography } from 'antd';
import { CheckCircleFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MetadataForm from '../metadata/MetadataForm';
import { useDataProvider } from '../../core/provider/DataProvider';
import { useLookupOptions } from '../../core/metadata/useTableMetadata';
import queryKeys from '../../core/queryKeys';
import utils from '../../utils/function_utils';

const { Text, Title } = Typography;
const FORM = 'access_table_grants';
const CUSTOM_ACTIONS = /^\s*[a-z][a-z0-9_]*(\s*,\s*[a-z][a-z0-9_]*)*\s*$/;

const STATUS = {
    new: { color: 'cyan', label: () => 'New' },
    repair: { color: 'gold', label: (row) => `Adds ${utils.pluralize(row.missingLinks, 'endpoint')}` },
    unchanged: { label: () => 'Already there' },
};

function detailOf(row) {
    if (row.custom) return 'No endpoints (custom)';
    if (row.status === 'unchanged') return `Exists with all ${utils.pluralize(row.endpointCount, 'endpoint')}`;
    if (row.status === 'repair') return `Exists, ${utils.pluralize(row.missingLinks, 'endpoint')} missing`;
    return utils.pluralize(row.endpointCount, 'endpoint');
}

function createLabel(totals) {
    if (!totals) return 'Create permissions';
    if (totals.newPermissions) return `Create ${utils.pluralize(totals.newPermissions, 'permission')}`;
    if (totals.newLinks) return `Add ${utils.pluralize(totals.newLinks, 'endpoint')}`;
    return 'Nothing to create';
}

// What the grant would create, from the server: the form's metadata cannot
// describe a live preview, so this part is the page's own.
function GrantPreview({ plan, loading, error, labels }) {
    if (error) return <Alert type="error" showIcon title="The preview could not be loaded" description={error.message} />;
    if (!plan) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Choose at least one table and one action to see what will be created." />;
    }
    return (
        <Spin spinning={loading}>
            <div className="flex flex-col gap-2.5">
                {plan.tables.map(({ table, permissions }) => (
                    <section key={table} aria-label={labels[table] ?? table} className="overflow-hidden rounded-[var(--app-radius,8px)] border border-[var(--color-border-subtle)]">
                        <div className="flex items-center justify-between bg-[var(--color-bg-layout)] px-3.5 py-2.5">
                            <strong className="text-[13px]">{labels[table] ?? utils.humanize(table)}</strong>
                            <Text type="secondary" className="admin-code">{table}</Text>
                        </div>
                        {permissions.map((row) => (
                            <div key={row.permission} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--color-border-subtle)] px-3.5 py-2">
                                <Text className="admin-code">{row.permission}</Text>
                                <Text type="secondary" className="text-[12px]">{detailOf(row)}</Text>
                                <Tag color={STATUS[row.status].color} className="!m-0">{STATUS[row.status].label(row)}</Tag>
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </Spin>
    );
}

// Permissions page › Grant table access: the form is the access_table_grants
// metadata; the server creates each permission with the endpoints it needs.
export default function GrantTableAccess({ open, onClose }) {
    const [form] = Form.useForm();
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const { data: tableOptions = [] } = useLookupOptions(open ? 'grantable_tables' : null);
    const labels = useMemo(() => Object.fromEntries(tableOptions.map((option) => [option.value, option.label])), [tableOptions]);

    const tables = Form.useWatch('tables', form);
    const actions = Form.useWatch('actions', form);
    const customActions = Form.useWatch('custom_actions', form);
    const request = useDeferredValue(useMemo(() => {
        const custom = String(customActions ?? '').trim();
        const customOk = !custom || CUSTOM_ACTIONS.test(custom);
        const chosenTables = utils.toList(tables);
        const chosenActions = utils.toList(actions);
        if (!chosenTables.length || !customOk || (!chosenActions.length && !custom)) return null;
        return { tables: chosenTables, actions: chosenActions, custom_actions: custom };
    }, [actions, customActions, tables]));

    const preview = useQuery({
        queryKey: ['table-access-preview', request],
        queryFn: async () => (await dataProvider.custom({ url: 'access/table_access/preview', method: 'post', payload: request, unwrap: true })).data,
        enabled: open && !result && Boolean(request),
        placeholderData: (previous) => previous,
    });
    const plan = request ? preview.data : null;
    const totals = plan?.totals;
    const canCreate = Boolean(totals && (totals.newPermissions || totals.newLinks));

    const grant = async (payload) => {
        setSaving(true);
        try {
            const { data } = await dataProvider.custom({ url: 'access/table_access', method: 'post', payload, unwrap: true });
            queryClient.invalidateQueries({ queryKey: queryKeys.lists('admin_permissions') });
            queryClient.invalidateQueries({ queryKey: ['table-access-preview'] });
            return data;
        } finally {
            setSaving(false);
        }
    };

    const close = () => {
        setResult(null);
        form.resetFields();
        onClose?.();
    };

    const summary = totals
        ? [utils.pluralize(totals.newPermissions, 'new permission'), utils.pluralize(totals.newLinks, 'endpoint'), totals.unchanged ? `${totals.unchanged} already there` : null].filter(Boolean).join(' · ')
        : 'Nothing selected yet';

    return (
        <Drawer
            open={open}
            onClose={close}
            size="large"
            destroyOnHidden
            title={(
                <div className="flex flex-col gap-0.5">
                    <span className="admin-section-header__eyebrow">Table access</span>
                    <span>Grant table access</span>
                </div>
            )}
            footer={result ? null : (
                <div className="flex items-center gap-3">
                    <Text type="secondary" className="flex-1 text-[13px]">{summary}</Text>
                    <Button onClick={close}>Cancel</Button>
                    <Button type="primary" disabled={!canCreate} loading={saving} onClick={() => form.submit()}>{createLabel(totals)}</Button>
                </div>
            )}
        >
            {result ? (
                <div className="flex flex-col gap-4">
                    <CheckCircleFilled className="text-[36px] text-[var(--color-success,#39875d)]" aria-hidden="true" />
                    <div>
                        <Title level={4} className="!mb-1">Access created</Title>
                        <Text type="secondary">
                            Created {utils.pluralize(result.created.permissions, 'permission')} and linked {utils.pluralize(result.created.links, 'endpoint')} for {result.tables.map(({ table }) => labels[table] ?? table).join(', ')}.
                            {result.totals.unchanged ? ` ${result.totals.unchanged} already existed and were left unchanged.` : ''}
                        </Text>
                    </div>
                    <Alert type="info" showIcon icon={<SafetyCertificateOutlined />} title="Next: give these permissions to a role under Roles. Nobody can use them until a role holds them." />
                    <div className="flex gap-2">
                        <Button onClick={() => { setResult(null); form.resetFields(); }}>Grant more</Button>
                        <Button type="primary" onClick={close}>Close</Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    <Text type="secondary">Creates each permission with the API endpoints it needs, in one go. Anything that already exists is left as it is.</Text>
                    <MetadataForm table={FORM} form={form} showActions={false} notify={false} onSubmit={grant} onSaved={setResult} />
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-baseline justify-between">
                            <Title level={5} className="!m-0">Preview</Title>
                            <Text type="secondary" className="text-[12px]">Nothing is saved until you press Create.</Text>
                        </div>
                        <GrantPreview plan={plan} loading={preview.isFetching} error={request ? preview.error : null} labels={labels} />
                    </div>
                </div>
            )}
        </Drawer>
    );
}
