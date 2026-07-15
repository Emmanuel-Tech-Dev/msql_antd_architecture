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
import './UserInfo.css';

const { Text, Title } = Typography;
const ACTIVITY_FILTERS = ['All', 'Login', 'Security', 'Access'];

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
        <div className="user-workspace__detail-row">
            <span>{label}</span>
            <Text className={mono ? 'is-mono' : ''} copyable={copyable && Boolean(value)} title={value}>
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
        <div className="user-workspace__overview">
            <section aria-labelledby="user-account-summary">
                <div className="user-workspace__section-heading">
                    <div>
                        <span>Account signals</span>
                        <Title level={4} id="user-account-summary">Security and access summary</Title>
                    </div>
                </div>
                <div className="user-workspace__stats">
                    {(data.stats ?? []).map((stat) => (
                        <div className="user-workspace__stat" key={stat.label}>
                            <strong>{stat.value}</strong>
                            <span>{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="user-workspace__activity" aria-labelledby="recent-user-activity">
                <div className="user-workspace__section-heading user-workspace__section-heading--activity">
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
                    <div className="user-workspace__timeline">
                        {activities.map((activity) => {
                            const tone = activityTone(activity);
                            return (
                                <article className="user-workspace__activity-row" key={activity.id}>
                                    <span className={`user-workspace__activity-icon is-${tone}`} aria-hidden="true">
                                        {ACTIVITY_ICONS[tone]}
                                    </span>
                                    <div className="user-workspace__activity-copy">
                                        <strong>{activity.activity_type || activity.title || 'Account activity'}</strong>
                                        <p>{activity.description || 'No additional details were recorded.'}</p>
                                        <Tooltip title={activity.user_agent || 'User agent not recorded'}>
                                            <small>{activity.ip_address ? `${activity.ip_address} · ` : ''}{activity.user_agent || 'Unknown device'}</small>
                                        </Tooltip>
                                    </div>
                                    <time dateTime={activity.created_at}>
                                        {activity.created_at ? utils.fromNow(activity.created_at) : 'Unknown time'}
                                    </time>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="user-workspace__account-details" aria-labelledby="account-details">
                <div className="user-workspace__section-heading">
                    <div>
                        <span>Identity record</span>
                        <Title level={4} id="account-details">Account details</Title>
                    </div>
                </div>
                <div className="user-workspace__detail-grid">
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
        <section className="user-workspace__roles" aria-labelledby="user-role-management">
            <div className="user-workspace__section-heading">
                <div>
                    <span>Role-based access</span>
                    <Title level={4} id="user-role-management">Primary role assignment</Title>
                </div>
                <Tag icon={<TeamOutlined />}>{roles.length} assigned</Tag>
            </div>

            <div className="user-workspace__role-current">
                <div>
                    <strong>Current role</strong>
                    <p>The user inherits permissions and browser routes from this role.</p>
                </div>
                <div className="user-workspace__role-tags">
                    {roles.length
                        ? roles.map((role) => <Tag color="processing" key={role.role_id}>{role.role_id}</Tag>)
                        : <Tag>No role assigned</Tag>}
                </div>
            </div>

            <div className="user-workspace__role-editor">
                <label htmlFor={`user-role-${userId}`}>Replace primary role</label>
                <p>This updates only this user. Their effective access refreshes immediately after the change.</p>
                <div className="user-workspace__role-controls">
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
        return <div className="user-workspace__loading"><Skeleton active avatar paragraph={{ rows: 12 }} /></div>;
    }

    const effectivePermissions = (data.permissions ?? []).map((row) => row.permission).filter(Boolean);
    const statusActive = Number(user.status) === 1;

    return (
        <div className="user-workspace">
            <aside className="user-workspace__identity" aria-label="User identity summary">
                <Avatar
                    className="user-workspace__avatar"
                    size={76}
                    src={user.avatar || user.profile_picture || undefined}
                    style={{ backgroundColor: utils.avatarColor(user.name) }}
                >
                    {utils.getInitials_v2(user.name)}
                </Avatar>
                <Title level={3}>{user.name}</Title>
                <Text title={user.email}>{user.email}</Text>
                <Badge
                    status={statusActive ? 'success' : 'default'}
                    text={statusActive ? 'Active account' : 'Inactive account'}
                />

                <div className="user-workspace__identity-meta">
                    <div><UserOutlined /><span>Identity</span><strong>{user.custom_id}</strong></div>
                    <div><KeyOutlined /><span>Sign-in</span><strong>{user.oauth_provider || 'Password'}</strong></div>
                    <div><ClockCircleOutlined /><span>Last seen</span><strong>{user.last_login ? utils.fromNow(user.last_login) : 'Never'}</strong></div>
                </div>

                <div className="user-workspace__context-note">
                    <SafetyCertificateOutlined aria-hidden="true" />
                    <p><strong>Access model</strong>Role permissions are inherited. Direct authority can add or deny exceptions for this user.</p>
                </div>
            </aside>

            <div className="user-workspace__main">
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
