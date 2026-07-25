import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Avatar, Button, Empty, Skeleton, Tag, Typography } from 'antd';
import {
    DownloadOutlined,
    GoogleOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    UserAddOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { useDataProvider } from '../../core/provider/DataProvider';
import useChart from '../../hooks/useChart';
import utils from '../../utils/function_utils';

const { Text, Title } = Typography;

const number = (value) => Number(value) || 0;

const formatCompactDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

const formatFullDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

const initials = (name, email) => {
    const values = String(name || email || 'User').trim().split(/\s+/).filter(Boolean);
    return values.slice(0, 2).map((value) => value[0]).join('').toUpperCase();
};

const metricCards = [
    { key: 'active_users', label: 'Active accounts', icon: <SafetyCertificateOutlined />, tone: 'success' },
    { key: 'google_linked_users', label: 'Google linked', icon: <GoogleOutlined />, tone: 'accent' },
    { key: 'created_last_30_days', label: 'New in 30 days', icon: <UserAddOutlined />, tone: 'info' },
];

export default function UserStatistics() {
    const dataProvider = useDataProvider();
    const { renderChart } = useChart();
    const statistics = useQuery({
        queryKey: ['admin-statistics'],
        queryFn: async () => {
            const response = await dataProvider.custom({
                url: 'api/v1/admin/statistics',
                method: 'get',
                unwrap: true,
            });
            return response.data;
        },
        staleTime: 30_000,
    });

    const data = statistics.data;
    const overview = data?.overview ?? {};
    const totalUsers = number(overview.total_users);
    const activeUsers = number(overview.active_users);
    const googleLinkedUsers = number(overview.google_linked_users);
    const passwordEnabledUsers = number(overview.password_enabled_users);

    const registrations = useMemo(() => {
        const registrationByDate = new Map((data?.registrations ?? []).map((entry) => [entry.date, number(entry.user_count)]));
        return Array.from({ length: 30 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (29 - index));
            const key = date.toISOString().slice(0, 10);
            return {
                date: key,
                label: formatCompactDate(key),
                users: registrationByDate.get(key) ?? 0,
            };
        });
    }, [data?.registrations]);

    const roleDistribution = useMemo(
        () => (data?.roles ?? []).map((role) => ({
            role: role.role_name,
            users: number(role.user_count),
        })),
        [data?.roles],
    );

    const exportCsv = useCallback(() => {
        const rows = [
            ['Metric', 'Value'],
            ['Total users', totalUsers],
            ['Active accounts', activeUsers],
            ['Google linked', googleLinkedUsers],
            ['Password enabled', passwordEnabledUsers],
            [],
            ['Registration date', 'New users'],
            ...registrations.map((entry) => [entry.date, entry.users]),
            [],
            ['Role', 'Users'],
            ...roleDistribution.map((entry) => [entry.role, entry.users]),
        ];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'helpdesk-user-statistics.csv';
        anchor.click();
        URL.revokeObjectURL(url);
    }, [activeUsers, googleLinkedUsers, passwordEnabledUsers, registrations, roleDistribution, totalUsers]);

    const trendChart = renderChart({
        type: 'area',
        data: registrations,
        xKey: 'label',
        height: 280,
        showLegend: false,
        showYAxis: true,
        series: [{ dataKey: 'users', name: 'New users', color: 'var(--ads-accent)', fillOpacity: 0.16 }],
        tooltipFormatter: (value) => [`${value} ${Number(value) === 1 ? 'user' : 'users'}`, 'New accounts'],
    });

    const rolesChart = renderChart({
        type: 'bar',
        layout: 'vertical',
        data: roleDistribution,
        xKey: 'role',
        height: Math.max(214, roleDistribution.length * 46),
        showLegend: false,
        showGrid: false,
        series: [{ dataKey: 'users', name: 'Users', color: 'var(--ads-info)' }],
        tooltipFormatter: (value) => [`${value} ${Number(value) === 1 ? 'user' : 'users'}`, 'Assigned'],
    });

    return (
        <PageHeader
            className="admin-page max-w-[1440px]"
            title="User statistics"
            description="Identity, access, and sign-in adoption across the workspace. The reporting window is the last 30 days."
            icon={<TeamOutlined />}
            items={[{ title: 'Administration' }, { title: 'Identity' }, { title: 'User statistics' }]}
            actions={(
                <>
                    <Button icon={<ReloadOutlined />} loading={statistics.isFetching} onClick={() => statistics.refetch()}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<DownloadOutlined />} disabled={!data} onClick={exportCsv}>
                        Export CSV
                    </Button>
                </>
            )}
        >
            {statistics.isError && (
                <Alert
                    className="mb-4"
                    type="error"
                    showIcon
                    title="User statistics could not be loaded"
                    description={statistics.error?.message || 'Please try again.'}
                />
            )}

            <section className="overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)]" aria-label="User statistics overview">
                <div className="grid grid-cols-1 divide-y divide-[var(--ads-border-subtle)] lg:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))] lg:divide-x lg:divide-y-0">
                    <div className="relative overflow-hidden p-5 sm:p-6">
                        <span className="absolute inset-y-0 left-0 w-1 bg-[var(--ads-accent)]" aria-hidden="true" />
                        {statistics.isLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : <>
                            <Text className="text-xs font-medium uppercase tracking-[0.14em] !text-[var(--ads-text-muted)]">Total users</Text>
                            <div className="mt-2 flex items-end justify-between gap-4">
                                <div>
                                    <strong className="font-mono text-5xl font-semibold tracking-[-0.05em] text-[var(--ads-text-heading)]">{totalUsers}</strong>
                                    <Text className="mt-2 block max-w-[28ch] text-sm !text-[var(--ads-text-muted)]">Administrator identities in this workspace.</Text>
                                </div>
                                <span className="grid size-11 shrink-0 place-items-center rounded-[var(--ads-radius-md)] bg-[var(--ads-accent-soft)] text-xl text-[var(--ads-accent)]"><TeamOutlined /></span>
                            </div>
                        </>}
                    </div>
                    {metricCards.map(({ key, label, icon, tone }) => {
                        const value = number(overview[key]);
                        const ratio = percent(value, totalUsers);
                        const toneClass = tone === 'success'
                            ? 'bg-[var(--ads-success-soft)] text-[var(--ads-success)]'
                            : tone === 'info'
                                ? 'bg-[var(--ads-info-soft)] text-[var(--ads-info)]'
                                : 'bg-[var(--ads-accent-soft)] text-[var(--ads-accent)]';
                        return (
                            <div className="p-5 sm:p-6" key={key}>
                                {statistics.isLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : <>
                                    <div className="flex items-center justify-between gap-3">
                                        <Text className="text-xs font-medium uppercase tracking-[0.12em] !text-[var(--ads-text-muted)]">{label}</Text>
                                        <span className={`grid size-8 place-items-center rounded-[var(--ads-radius-sm)] ${toneClass}`} aria-hidden="true">{icon}</span>
                                    </div>
                                    <strong className="mt-4 block font-mono text-3xl font-semibold tracking-[-0.04em] text-[var(--ads-text-heading)]">{value}</strong>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ads-surface-sunken)]"><span className={`block h-full rounded-full ${tone === 'success' ? 'bg-[var(--ads-success)]' : tone === 'info' ? 'bg-[var(--ads-info)]' : 'bg-[var(--ads-accent)]'}`} style={{ width: `${ratio}%` }} /></span>
                                        <Text className="font-mono text-xs !text-[var(--ads-text-subtle)]">{ratio}%</Text>
                                    </div>
                                </>}
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
                <article className="overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)] xl:col-span-8">
                    <div className="flex flex-col gap-2 border-b border-[var(--ads-border-subtle)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                        <div>
                            <Title level={5} className="!m-0">Registration trend</Title>
                            <Text className="mt-1 block text-sm !text-[var(--ads-text-muted)]">New administrator accounts created each day.</Text>
                        </div>
                        <span className="w-fit rounded-full bg-[var(--ads-accent-soft)] px-2.5 py-1 font-mono text-xs text-[var(--ads-accent)]">LAST 30 DAYS</span>
                    </div>
                    <div className="p-3 pb-2 sm:p-5 sm:pb-2">
                        {statistics.isLoading ? <Skeleton active paragraph={{ rows: 9 }} /> : data?.registrations?.length ? trendChart : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No new users in the last 30 days" />}
                    </div>
                    {!statistics.isLoading && data?.registrations?.length > 0 && <div className="border-t border-[var(--ads-border-subtle)] px-5 py-3 text-xs text-[var(--ads-text-muted)] sm:px-6">{number(overview.created_last_30_days)} new account{number(overview.created_last_30_days) === 1 ? '' : 's'} created during this reporting period.</div>}
                </article>

                <article className="overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)] xl:col-span-4">
                    <div className="border-b border-[var(--ads-border-subtle)] px-5 py-4 sm:px-6">
                        <Title level={5} className="!m-0">Role distribution</Title>
                        <Text className="mt-1 block text-sm !text-[var(--ads-text-muted)]">Access ownership by assigned role.</Text>
                    </div>
                    <div className="p-3 sm:p-5">
                        {statistics.isLoading ? <Skeleton active paragraph={{ rows: 7 }} /> : roleDistribution.length ? rolesChart : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No roles available" />}
                    </div>
                </article>

                <article className="overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)] xl:col-span-4">
                    <div className="border-b border-[var(--ads-border-subtle)] px-5 py-4 sm:px-6">
                        <Title level={5} className="!m-0">Sign-in coverage</Title>
                        <Text className="mt-1 block text-sm !text-[var(--ads-text-muted)]">Authentication methods currently available.</Text>
                    </div>
                    <div className="divide-y divide-[var(--ads-border-subtle)]">
                        {[
                            { label: 'Google linked', value: googleLinkedUsers, icon: <GoogleOutlined />, color: 'var(--ads-accent)', background: 'bg-[var(--ads-accent-soft)] text-[var(--ads-accent)]' },
                            { label: 'Password enabled', value: passwordEnabledUsers, icon: <SafetyCertificateOutlined />, color: 'var(--ads-info)', background: 'bg-[var(--ads-info-soft)] text-[var(--ads-info)]' },
                        ].map((item) => (
                            <div className="p-5 sm:px-6" key={item.label}>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-[var(--ads-radius-sm)] ${item.background}`}>{item.icon}</span><Text>{item.label}</Text></span>
                                    <strong className="font-mono text-lg text-[var(--ads-text-heading)]">{item.value}</strong>
                                </div>
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ads-surface-sunken)]"><span className="block h-full rounded-full" style={{ width: `${percent(item.value, totalUsers)}%`, background: item.color }} /></div>
                                <Text className="mt-2 block font-mono text-xs !text-[var(--ads-text-subtle)]">{percent(item.value, totalUsers)}% of all user accounts</Text>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)] xl:col-span-8">
                    <div className="flex flex-col gap-2 border-b border-[var(--ads-border-subtle)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                        <div>
                            <Title level={5} className="!m-0">Recent account activity</Title>
                            <Text className="mt-1 block text-sm !text-[var(--ads-text-muted)]">Most recently active or provisioned identities.</Text>
                        </div>
                        <Text className="font-mono text-xs uppercase tracking-[0.12em] !text-[var(--ads-text-subtle)]">{(data?.recentUsers ?? []).length} records</Text>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[650px] divide-y divide-[var(--ads-border-subtle)]">
                            <div className="grid grid-cols-[minmax(250px,1.45fr)_120px_135px_minmax(130px,1fr)] gap-4 bg-[var(--ads-surface-sunken)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--ads-text-subtle)] sm:px-6">
                                <span>Identity</span><span>Status</span><span>Sign-in method</span><span>Last activity</span>
                            </div>
                            {statistics.isLoading && Array.from({ length: 4 }, (_, index) => <div className="px-5 py-4 sm:px-6" key={index}><Skeleton active title={false} paragraph={{ rows: 1 }} /></div>)}
                            {(data?.recentUsers ?? []).map((user) => {
                                const isActive = number(user.status) === 1;
                                const provider = String(user.oauth_provider || '').toLowerCase() === 'google' ? 'Google' : 'Password';
                                return (
                                    <div className="grid grid-cols-[minmax(250px,1.45fr)_120px_135px_minmax(130px,1fr)] items-center gap-4 px-5 py-3.5 sm:px-6" key={user.custom_id}>
                                        <div className="flex min-w-0 items-center gap-3"><Avatar className="shrink-0 !bg-[var(--ads-accent-soft)] !text-[var(--ads-accent)]">{initials(user.name, user.email)}</Avatar><div className="min-w-0"><Text strong className="block truncate !text-[var(--ads-text-heading)]">{user.name || 'Unnamed user'}</Text><Text className="block truncate text-xs !text-[var(--ads-text-muted)]">{user.email}</Text></div></div>
                                        <Tag className={isActive ? '!m-0 !border-[var(--ads-success-border)] !bg-[var(--ads-success-soft)] !text-[var(--ads-success)]' : '!m-0 !border-[var(--ads-border-subtle)] !bg-[var(--ads-surface-sunken)] !text-[var(--ads-text-muted)]'}>{isActive ? 'Active' : 'Inactive'}</Tag>
                                        <span className="flex items-center gap-2 text-sm text-[var(--ads-text-muted)]">{provider === 'Google' ? <GoogleOutlined className="text-[var(--ads-accent)]" /> : <SafetyCertificateOutlined className="text-[var(--ads-info)]" />}{provider}</span>
                                        <Text className="text-xs !text-[var(--ads-text-muted)]">{user.last_login ? utils.getDateAndTime(user.last_login) : `Created ${formatFullDate(String(user.createdAt).slice(0, 10))}`}</Text>
                                    </div>
                                );
                            })}
                            {!statistics.isLoading && !(data?.recentUsers ?? []).length && <div className="py-10"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No users available" /></div>}
                        </div>
                    </div>
                </article>
            </section>
        </PageHeader>
    );
}
