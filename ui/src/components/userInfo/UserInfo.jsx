import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar,
    Badge,
    Button,
    Empty,
    Popconfirm,
    Segmented,
    Skeleton,
    Tabs,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    CloseCircleFilled,
    InfoCircleFilled,
    KeyOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    UserOutlined,
    WarningFilled,
} from '@ant-design/icons';
import useApi from '../../hooks/useApi';
import useGlobalSelect from '../../hooks/useGlobalSelect';
import useNotification from '../../hooks/useNotification';
import utils from '../../utils/function_utils';
import UserAuthorityPanel from '../access/UserAuthorityPanel';

const { Text, Title } = Typography;
const ACTIVITY_FILTERS = ['All', 'Login', 'Security', 'Access'];

const SECTION_HEADING_CLASS = [
    'mb-[13px] flex items-start justify-between gap-4',
    '[&_span]:font-mono [&_span]:text-[9px] [&_span]:font-bold [&_span]:uppercase',
    '[&_span]:tracking-[0.08em] [&_span]:text-[var(--color-accent)]',
    '[&_h4.ant-typography]:!mt-0.5 [&_h4.ant-typography]:!mb-0 [&_h4.ant-typography]:!text-base',
].join(' ');

const ACTIVITY_TONE_CLASS = {
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    info: 'text-[var(--color-info,#2563a8)]',
    danger: 'text-[var(--color-error)]',
};

const DETAIL_ROW_CLASS = [
    'flex items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] py-[11px]',
    '[&>span]:shrink-0 [&>span]:text-[11px] [&>span]:text-[var(--color-text-secondary)]',
    '[&_.ant-typography]:m-0 [&_.ant-typography]:max-w-[65%] [&_.ant-typography]:text-right',
    '[&_.ant-typography]:text-[11px] [&_.ant-typography]:font-semibold [&_.ant-typography]:text-[var(--color-text-primary)]',
    '[&_.ant-typography]:[overflow-wrap:anywhere]',
].join(' ');

function activityCategory(activity) {
    const value = `${activity?.activity_type ?? ''} ${activity?.title ?? ''}`.toLowerCase();
    if (value.includes('login') || value.includes('logout')) return 'Login';
    if (value.includes('password') || value.includes('auth') || value.includes('denied')) return 'Security';
    return 'Access';
}

function activityTone(activity) {
    const value = `${activity?.title ?? ''} ${activity?.description ?? ''}`.toLowerCase();
    if (value.includes('fail') || value.includes('denied') || value.includes('error')) return 'danger';
    if (value.includes('reset') || value.includes('warning') || value.includes('limit')) return 'warning';
    if (value.includes('success') || value.includes('login')) return 'success';
    return 'info';
}

const ACTIVITY_ICONS = {
    success: <CheckCircleFilled />,
    warning: <WarningFilled />,
    info: <InfoCircleFilled />,
    danger: <CloseCircleFilled />,
};

function DetailRow({ label, value, mono = false, copyable = false }) {
    return (
        <div className={DETAIL_ROW_CLASS}>
            <span>{label}</span>
            <Text className={mono ? '!font-mono !text-[9px]' : ''} copyable={copyable && Boolean(value)} title={value}>
                {value || 'Not available'}
            </Text>
        </div>
    );
}

function OverviewTab({ data, user }) {
    const [filter, setFilter] = useState('All');
    const activities = useMemo(() => (data.activities ?? []).filter(
        (activity) => filter === 'All' || activityCategory(activity) === filter,
    ), [data.activities, filter]);

    return (
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(250px,0.85fr)] gap-6 max-[860px]:grid-cols-1 [&>section]:min-w-0">
            <section aria-labelledby="user-account-summary">
                <div className={SECTION_HEADING_CLASS}>
                    <div>
                        <span>Account signals</span>
                        <Title level={4} id="user-account-summary">Security and access summary</Title>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2 max-[600px]:grid-cols-2">
                    {(data.stats ?? []).map((stat) => (
                        <div className="min-w-0 rounded-[var(--app-radius)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3.5 [&>strong]:mb-1.5 [&>strong]:block [&>strong]:font-[var(--font-display)] [&>strong]:text-[22px] [&>strong]:leading-none [&>strong]:text-[var(--color-text-primary)] [&>span]:block [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[10px] [&>span]:text-[var(--color-text-secondary)]" key={stat.label}>
                            <strong>{stat.value}</strong>
                            <span>{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="col-start-1 mt-[3px] max-[860px]:col-start-1" aria-labelledby="recent-user-activity">
                <div className={`${SECTION_HEADING_CLASS} max-[600px]:flex-col max-[600px]:items-stretch`}>
                    <div>
                        <span>Audit trail</span>
                        <Title level={4} id="recent-user-activity">Recent activity</Title>
                    </div>
                    <Segmented
                        aria-label="Filter user activity"
                        options={ACTIVITY_FILTERS}
                        size="small"
                        value={filter}
                        onChange={setFilter}
                    />
                </div>

                {activities.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${filter.toLowerCase()} activity found`} />
                ) : (
                    <div className="border-t border-[var(--color-border-subtle)]">
                        {activities.map((activity) => {
                            const tone = activityTone(activity);
                            return (
                                <article className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-start gap-[11px] border-b border-[var(--color-border-subtle)] py-[13px] max-[600px]:grid-cols-[30px_minmax(0,1fr)] max-[600px]:[&_time]:col-start-2" key={activity.id}>
                                    <span className={`grid size-[30px] place-items-center rounded-full bg-[var(--color-bg-sunken)] ${ACTIVITY_TONE_CLASS[tone]}`} aria-hidden="true">
                                        {ACTIVITY_ICONS[tone]}
                                    </span>
                                    <div className="min-w-0 [&>strong]:block [&>strong]:text-xs [&>strong]:text-[var(--color-text-primary)] [&>p]:my-0.5 [&>p]:mb-[3px] [&>p]:text-[11px] [&>p]:leading-[1.45] [&>p]:text-[var(--color-text-secondary)] [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:font-mono [&_small]:text-[9px] [&_small]:text-[var(--color-text-tertiary)]">
                                        <strong>{activity.activity_type || activity.title || 'Account activity'}</strong>
                                        <p>{activity.description || 'No additional details were recorded.'}</p>
                                        <Tooltip title={activity.user_agent || 'User agent not recorded'}>
                                            <small>{activity.ip_address ? `${activity.ip_address} · ` : ''}{activity.user_agent || 'Unknown device'}</small>
                                        </Tooltip>
                                    </div>
                                    <time className="whitespace-nowrap text-[10px] text-[var(--color-text-tertiary)]" dateTime={activity.created_at}>
                                        {activity.created_at ? utils.fromNow(activity.created_at) : 'Unknown time'}
                                    </time>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="col-start-2 row-span-2 row-start-1 border-l border-[var(--color-border-subtle)] pl-6 max-[860px]:col-start-1 max-[860px]:row-auto max-[860px]:border-l-0 max-[860px]:pl-0" aria-labelledby="account-details">
                <div className={SECTION_HEADING_CLASS}>
                    <div>
                        <span>Identity record</span>
                        <Title level={4} id="account-details">Account details</Title>
                    </div>
                </div>
                <div className="border-t border-[var(--color-border-subtle)]">
                    <DetailRow label="User ID" value={user.custom_id} mono copyable />
                    <DetailRow label="Email" value={user.email} />
                    <DetailRow label="Phone" value={user.phone_no || user.phone} />
                    <DetailRow label="Authentication" value={user.oauth_provider || 'Password'} />
                    <DetailRow label="Last login" value={user.last_login ? utils.getDateAndTime(user.last_login) : 'Never'} />
                    <DetailRow label="Last logout" value={user.last_logout ? utils.getDateAndTime(user.last_logout) : 'Not available'} />
                    <DetailRow label="Created" value={user.created_at || user.createdAt ? utils.formatDateV3(user.created_at || user.createdAt) : 'Not available'} />
                    <DetailRow label="Password change" value={Number(user.forced_password_change) === 1 ? 'Required at next login' : 'Not required'} />
                </div>
            </section>
        </div>
    );
}

function RolesTab({ data, userId, roleSelect, assigning, onAssign }) {
    const roles = data.roles ?? [];
    return (
        <section className="max-w-[760px]" aria-labelledby="user-role-management">
            <div className={SECTION_HEADING_CLASS}>
                <div>
                    <span>Role-based access</span>
                    <Title level={4} id="user-role-management">Primary role assignment</Title>
                </div>
                <Tag icon={<TeamOutlined />}>{roles.length} assigned</Tag>
            </div>

            <div className="flex items-center justify-between gap-[18px] rounded-[var(--app-radius)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-[18px] max-[600px]:flex-col max-[600px]:items-stretch [&_strong]:text-[13px] [&_strong]:font-bold [&_strong]:text-[var(--color-text-primary)] [&_p]:mt-1 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:text-[var(--color-text-secondary)]">
                <div>
                    <strong>Current role</strong>
                    <p>The user inherits permissions and browser routes from this role.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5 max-[600px]:justify-start [&_.ant-tag]:m-0">
                    {roles.length
                        ? roles.map((role) => <Tag color="processing" key={role.role_id}>{role.role_id}</Tag>)
                        : <Tag>No role assigned</Tag>}
                </div>
            </div>

            <div className="mt-3.5 rounded-[var(--app-radius)] border border-[var(--color-border-subtle)] p-[18px] [&>label]:text-[13px] [&>label]:font-bold [&>label]:text-[var(--color-text-primary)] [&>p]:mt-1 [&>p]:mb-0 [&>p]:text-[11px] [&>p]:text-[var(--color-text-secondary)]">
                <label htmlFor={`user-role-${userId}`}>Replace primary role</label>
                <p>This updates only this user. Their effective access refreshes immediately after the change.</p>
                <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 max-[600px]:grid-cols-1 max-[600px]:items-stretch">
                    {roleSelect.SelectJsx({
                        id: `user-role-${userId}`,
                        'aria-label': 'Select a replacement role',
                        placeholder: 'Select a role',
                        style: { width: '100%' },
                    })}
                    <Popconfirm
                        title="Replace this user’s role?"
                        description="Their inherited permissions and navigation access will change immediately."
                        okText="Replace role"
                        cancelText="Cancel"
                        disabled={!roleSelect.selected}
                        onConfirm={() => onAssign(roleSelect.selected)}
                    >
                        <Button type="primary" loading={assigning} disabled={!roleSelect.selected}>
                            Replace role
                        </Button>
                    </Popconfirm>
                </div>
            </div>
        </section>
    );
}

export default function UserInfo({ user }) {
    const { message } = useNotification();
    const hasFetched = useRef(false);
    const roleSelect = useGlobalSelect('role_name', 'admin_roles');
    const { run, loading, data: rawData } = useApi('get', `/access/user_info/${user?.custom_id}`);
    const data = rawData?.data;

    useEffect(() => {
        if (!user?.custom_id || hasFetched.current) return;
        hasFetched.current = true;
        run();
    }, [run, user?.custom_id]);

    const { run: assignRole, loading: assigning } = useApi('post', '/access/assign/roles', {
        onSuccess: () => {
            message.success('Primary role updated');
            roleSelect.reset();
            run();
        },
        onError: () => message.error('The role could not be updated. Please try again.'),
    });

    if (loading || !data) {
        return <div className="p-7"><Skeleton active avatar paragraph={{ rows: 12 }} /></div>;
    }

    const effectivePermissions = (data.permissions ?? []).map((row) => row.permission).filter(Boolean);
    const statusActive = Number(user.status) === 1;

    return (
        <div className="grid min-h-[calc(100vh-138px)] grid-cols-[248px_minmax(0,1fr)] bg-[var(--color-bg-container)] max-[860px]:grid-cols-1">
            <aside className="border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-[22px] py-[30px] text-center max-[860px]:grid max-[860px]:grid-cols-[auto_minmax(0,1fr)] max-[860px]:gap-x-4 max-[860px]:border-r-0 max-[860px]:border-b max-[860px]:p-5 max-[860px]:text-left" aria-label="User identity summary">
                <Avatar
                    className="mb-3.5 !text-[21px] !font-bold !text-white shadow-[0_0_0_5px_var(--color-bg-container),0_0_0_6px_var(--color-border-subtle)] max-[860px]:row-span-4 max-[860px]:m-0"
                    size={76}
                    src={user.avatar || user.profile_picture || undefined}
                    style={{ backgroundColor: utils.avatarColor(user.name) }}
                >
                    {utils.getInitials_v2(user.name)}
                </Avatar>
                <Title level={3} className="!mb-[3px] !mt-0 !text-lg !leading-tight">{user.name}</Title>
                <Text className="block overflow-hidden text-ellipsis whitespace-nowrap !text-xs !text-[var(--color-text-secondary)]" title={user.email}>{user.email}</Text>
                <Badge
                    className="mt-[13px] max-[860px]:mt-1.5"
                    status={statusActive ? 'success' : 'default'}
                    text={statusActive ? 'Active account' : 'Inactive account'}
                />

                <div className="mt-6 border-t border-[var(--color-border-subtle)] max-[860px]:hidden [&>div]:grid [&>div]:grid-cols-[18px_1fr] [&>div]:gap-x-2 [&>div]:gap-y-px [&>div]:border-b [&>div]:border-[var(--color-border-subtle)] [&>div]:py-3 [&>div]:text-left [&_.anticon]:row-span-2 [&_.anticon]:mt-[3px] [&_.anticon]:text-[var(--color-accent)] [&_span]:text-[10px] [&_span]:font-bold [&_span]:uppercase [&_span]:tracking-[0.06em] [&_span]:text-[var(--color-text-tertiary)] [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:font-mono [&_strong]:text-[10px] [&_strong]:font-semibold [&_strong]:text-[var(--color-text-primary)]">
                    <div><UserOutlined /><span>Identity</span><strong>{user.custom_id}</strong></div>
                    <div><KeyOutlined /><span>Sign-in</span><strong>{user.oauth_provider || 'Password'}</strong></div>
                    <div><ClockCircleOutlined /><span>Last seen</span><strong>{user.last_login ? utils.fromNow(user.last_login) : 'Never'}</strong></div>
                </div>

                <div className="mt-[22px] flex items-start gap-[9px] rounded-[var(--app-radius)] border border-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] bg-[var(--color-accent-muted)] p-3 text-left text-[var(--color-text-secondary)] max-[860px]:hidden [&_.anticon]:mt-0.5 [&_.anticon]:text-[var(--color-accent)] [&_p]:m-0 [&_p]:text-[11px] [&_p]:leading-normal [&_strong]:mb-0.5 [&_strong]:block [&_strong]:text-[var(--color-text-primary)]">
                    <SafetyCertificateOutlined aria-hidden="true" />
                    <p><strong>Access model</strong>Role permissions are inherited. Direct authority can add or deny exceptions for this user.</p>
                </div>
            </aside>

            <div className="min-w-0 px-6 pt-2 pb-7 max-[600px]:px-4 max-[600px]:pt-1.5 max-[600px]:pb-[22px] [&>.ant-tabs>.ant-tabs-nav]:mb-6">
                <Tabs
                    defaultActiveKey="overview"
                    items={[
                        {
                            key: 'overview',
                            label: 'Overview',
                            children: <OverviewTab data={data} user={user} />,
                        },
                        {
                            key: 'roles',
                            label: `Roles (${data.roles?.length ?? 0})`,
                            children: (
                                <RolesTab
                                    assigning={assigning}
                                    data={data}
                                    roleSelect={roleSelect}
                                    userId={user.custom_id}
                                    onAssign={(role) => assignRole({ custom_id: user.custom_id, role })}
                                />
                            ),
                        },
                        {
                            key: 'authority',
                            label: 'Direct authority',
                            children: (
                                <UserAuthorityPanel
                                    fallbackPermissions={effectivePermissions}
                                    userId={user.custom_id}
                                />
                            ),
                        },
                    ]}
                />
            </div>
        </div>
    );
}
