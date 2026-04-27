import React, { useEffect, useState } from 'react';
import { Tag, Button, Tooltip, Divider, Avatar, Badge, Empty } from 'antd';
import {
    UserOutlined,
    PlusOutlined,
    CloseOutlined,
    EditOutlined,
    StopOutlined,
    CheckCircleFilled,
    WarningFilled,
    InfoCircleFilled,
    CloseCircleFilled,
} from '@ant-design/icons';
import { SkeletonWrapper } from 'react-skeletonify';
import useApi from '../../hooks/useApi';
import utils from '../../utils/function_utils';
import { useRef } from 'react';


/* ─── mock data ────────────────────────────────────────────────── */
const user = {
    name: 'Emmanuel Kusi Sarfo',
    email: 'emmanuelkusi345@gmail.com',
    phone: '0554 205 473',
    custom_id: 'REG20260224004',
    authMethod: 'Password',
    lastLogin: '21 Apr 2026, 09:14',
    lastLogout: '20 Apr 2026, 18:42',
    joined: '24 Feb 2026',
    forcePwdChange: false,
    status: 'active',
    initials: 'EK',
    roles: [
        { label: 'SuperAdmin', color: '#185FA5' },
        { label: 'Admin', color: '#BA7517' },
    ],
    stats: [
        { label: 'Logins (30d)', value: 14 },
        { label: 'Pwd resets', value: 2 },
        { label: 'Permissions', value: 8 },
        { label: 'Routes', value: 6 },
    ],
    activity: [
        {
            type: 'success',
            title: 'Logged in successfully',
            sub: 'IP 197.255.42.11 · Chrome / Windows',
            time: 'Today 09:14',
        },
        {
            type: 'warning',
            title: 'Password reset requested',
            sub: 'Reset token sent to email · token used',
            time: '20 Apr 18:03',
        },
        {
            type: 'info',
            title: 'Role assigned — Admin',
            sub: 'Assigned by superadmin@system.com',
            time: '18 Apr 11:30',
        },
        {
            type: 'danger',
            title: 'Access denied — DELETE /api/admin_roles',
            sub: 'Insufficient permissions · ERR_ACCESS_DENIED',
            time: '17 Apr 14:55',
        },
        {
            type: 'success',
            title: 'Logged in successfully',
            sub: 'IP 197.255.42.11 · Chrome / Windows',
            time: '17 Apr 08:50',
        },
        {
            type: 'warning',
            title: 'Password reset — limit reached',
            sub: '3 of 3 reset attempts used · locked 30 min',
            time: '15 Apr 20:11',
        },
    ],
    access: [
        { resource: 'Users', perms: ['read', 'create', 'update', 'delete'] },
        { resource: 'Roles', perms: ['read', 'create', null, null], denied: ['delete'] },
        { resource: 'Settings', perms: ['read', null], denied: ['update'] },
        { resource: 'Logs', perms: ['read', null], denied: ['delete'] },
        { resource: 'Permissions', perms: [null, null], denied: ['read', 'create'] },
    ],
};

const activityIcon = {
    success: <CheckCircleFilled style={{ color: '#22c55e', fontSize: 14 }} />,
    warning: <WarningFilled style={{ color: '#f59e0b', fontSize: 14 }} />,
    info: <InfoCircleFilled style={{ color: '#3b82f6', fontSize: 14 }} />,
    danger: <CloseCircleFilled style={{ color: '#ef4444', fontSize: 14 }} />,
};

const dotColor = {
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
    danger: '#ef4444',
};

const filters = ['All', 'Login', 'Security', 'Access'];

/* ─── helper: access permission pill ───────────────────────────── */
function PermPill({ label, granted }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 9px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 500,
                border: `0.5px solid ${granted ? '#bbf7d0' : '#e5e7eb'}`,
                background: granted ? '#f0fdf4' : '#f9fafb',
                color: granted ? '#15803d' : '#9ca3af',
            }}
        >
            {label}
        </span>
    );
}

/* ─── main component ────────────────────────────────────────────── */
export default function UserInfo({ user: payload }) {
    const [activeFilter, setActiveFilter] = useState('All');
    const [roles, setRoles] = useState(user?.roles);

    const removeRole = (label) => setRoles((r) => r.filter((x) => x.label !== label));

    // AFTER — fires exactly once, even in StrictMode
    const { run, loading, data: rawData } = useApi("get", `/access/user_info/${payload?.custom_id}`,)
    const data = rawData?.data
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;   // guard: skip the StrictMode re-run
        hasFetched.current = true;
        run();
    }, []);


    // console.log(data)


    // "create:admin"        → action=create,  resource=Admin
    // "read:admin_resources"→ action=read,    resource=Admin Resources  
    // "read:roles"          → action=read,    resource=Roles

    const permsByResource = (data?.permissions ?? []).reduce((acc, p) => {
        const [action, ...resourceParts] = (p.permission ?? '').split(':');
        if (!resourceParts.length) return acc;

        // "admin_resources" → "Admin Resources", "admin" → "Admin", "roles" → "Roles"
        const key = resourceParts
            .join(':')                        // rejoin in case resource had colons
            .split('_')                       // split snake_case
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))  // capitalise each word
            .join(' ');

        if (!acc[key]) acc[key] = [];
        acc[key].push(action);
        return acc;
    }, {});

    // Result:
    // {
    //   "Admin":           ["create", "delete"],
    //   "Admin Resources": ["read"],
    //   "Roles":           ["read"],
    // }

    return (
        <SkeletonWrapper loading={loading || !data}>
            <div
                style={{
                    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                    background: '#fff',
                    //  border: '1px solid #e5e7eb',
                    //  borderRadius: 14,
                    // overflow: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: '260px 1fr',
                    //  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    //  maxWidth: 960,
                    // margin: '0 auto',
                }}
            >
                {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
                <div
                    style={{
                        borderRight: '1px solid #f0f0f0',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0,
                        background: '#fafafa',
                    }}
                >
                    {/* Avatar + name */}
                    <div style={{ textAlign: 'center', paddingBottom: 16 }}>
                        <Avatar
                            size={72}
                            src={payload?.avatar || payload.profile_picture || undefined}
                            style={{
                                background: utils.avatarColor(payload?.name),
                                fontSize: 13,
                                fontWeight: 600,
                                flexShrink: 0,
                            }}

                        >
                            {utils.getInitials_v2(payload?.name)}
                        </Avatar>
                        <p className='mt-2' style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>
                            {payload?.name}
                        </p>
                        <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>{payload?.email}</p>
                        <Badge
                            status={payload?.status === 1 ? 'success' : 'default'}
                            text={
                                <span style={{ fontSize: 12, fontWeight: 500, color: payload?.status === 1 ? '#059669' : '#9ca3af' }}>
                                    {payload?.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                            }
                        />
                    </div>

                    <Divider style={{ margin: '0 0 14px' }} />

                    {/* Details */}
                    <div style={{ marginBottom: 14 }}>
                        <SectionTitle>Details</SectionTitle>
                        {[
                            { label: 'User ID', value: payload?.custom_id, mono: true },
                            { label: 'Email', value: payload?.email, small: true },
                            { label: 'Phone', value: payload?.phone || "-" },
                            { label: 'Auth method', value: payload?.authMethod || "-" },
                            { label: 'Last login', value: utils.getDateAndTime(payload?.last_login) || "-" },
                            { label: 'Last logout', value: utils.getDateAndTime(payload?.last_logout) || "-" },
                            { label: 'Joined', value: utils.formatDateV3(payload?.createdAt) },
                        ].map((row) => (
                            <DetailRow key={row.label} label={row.label}>
                                <span
                                    style={{
                                        fontSize: row.mono ? 10 : row.small ? 11 : 12,
                                        fontFamily: row.mono ? 'monospace' : 'inherit',
                                        fontWeight: 500,
                                        color: '#111827',
                                    }}
                                >
                                    {row.value}
                                </span>
                            </DetailRow>
                        ))}
                        <DetailRow label="Force pwd change">
                            <span
                                style={{
                                    display: 'inline-flex',
                                    padding: '2px 8px',
                                    borderRadius: 20,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    background: '#f3f4f6',
                                    color: '#6b7280',
                                    border: '0.5px solid #e5e7eb',
                                }}
                            >
                                No
                            </span>
                        </DetailRow>
                    </div>

                    <Divider style={{ margin: '0 0 14px' }} />

                    {/* Roles */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <SectionTitle style={{ margin: 0 }}>Roles</SectionTitle>
                            <Tooltip title="Add role">
                                <div
                                    style={{
                                        width: 18,
                                        height: 18,
                                        border: '0.5px solid #d1d5db',
                                        borderRadius: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: '#fff',
                                    }}
                                >
                                    <PlusOutlined style={{ fontSize: 10, color: '#6b7280' }} />
                                </div>
                            </Tooltip>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                            {data?.roles.map((r) => (
                                <span
                                    key={r?.role_id}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '3px 9px 3px 7px',
                                        borderRadius: 20,
                                        fontSize: 11,
                                        background: '#fff',
                                        border: '0.5px solid #e5e7eb',
                                        color: '#111827',
                                    }}
                                >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                                    {r.role_id}
                                    <CloseOutlined
                                        style={{ fontSize: 9, color: '#9ca3af', marginLeft: 2, cursor: 'pointer' }}
                                        onClick={() => removeRole(r.role_id)}
                                    />
                                </span>
                            ))}
                        </div>

                        <div
                            style={{
                                border: '0.5px dashed #d1d5db',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 11,
                                color: '#9ca3af',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                cursor: 'pointer',
                                background: '#fff',
                            }}
                        >
                            <PlusOutlined style={{ fontSize: 10 }} />
                            <span>Assign a role...</span>
                            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>select ▾</span>
                        </div>
                    </div>

                    <Divider style={{ margin: '0 0 14px' }} />

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                        <Button icon={<EditOutlined />} block style={{ fontSize: 12 }}>
                            Edit profile
                        </Button>
                        <Button
                            icon={<StopOutlined />}
                            block
                            danger
                            type='primary'
                            style={{ fontSize: 12 }}
                        >
                            Deactivate account
                        </Button>
                    </div>
                </div>

                {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>

                    {/* Header + filter pills */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <SectionTitle style={{ margin: 0 }}>Activity &amp; access</SectionTitle>
                        <div style={{ display: 'flex', gap: 5 }}>
                            {filters.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    style={{
                                        padding: '3px 10px',
                                        borderRadius: 20,
                                        fontSize: 10,
                                        cursor: 'pointer',
                                        border: `0.5px solid ${activeFilter === f ? '#6b7280' : '#e5e7eb'}`,
                                        color: activeFilter === f ? '#111827' : '#6b7280',
                                        background: activeFilter === f ? '#f3f4f6' : 'transparent',
                                        fontWeight: activeFilter === f ? 500 : 400,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {data?.stats.map((s) => (
                            <div
                                key={s.label}
                                style={{
                                    flex: 1,
                                    background: '#f9fafb',
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    border: '0.5px solid #f0f0f0',
                                }}
                            >
                                <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{s.label}</p>
                                <p style={{ fontSize: 20, fontWeight: 600, color: '#111827', lineHeight: 1 }}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <Divider style={{ margin: '0 0 12px' }} />

                    {/* Recent activity */}
                    <SectionTitle style={{ marginBottom: 10 }}>Recent activity</SectionTitle>
                    <div>

                        {data?.activities.length == 0 ? <Empty description="No recent activities for this user" /> :

                            data?.activities?.map((item, i) => (
                                <div
                                    key={item?.id}
                                    style={{
                                        display: 'flex',
                                        gap: 10,
                                        padding: '9px 0',
                                        borderBottom: i < data?.activities.length - 1 ? '0.5px solid #f3f4f6' : 'none',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <span style={{ marginTop: 1, flexShrink: 0 }}>{activityIcon[item.title]}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{item.activity_type}</p>
                                        <p style={{ fontSize: 11, color: '#6b7280' }}>{item.description}</p>
                                        <p style={{ fontSize: 11, color: '#6b7280' }}><span className='font-semibold'>User Agent:</span> : {item?.user_agent}</p>
                                    </div>
                                    <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', paddingLeft: 8 }}>{utils.fromNow(item.createdAt)}</span>
                                </div>
                            ))}
                    </div>

                    <Divider style={{ margin: '14px 0' }} />

                    {/* Effective access */}
                    <SectionTitle style={{ marginBottom: 10 }}>
                        Effective access{' '}
                        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>
                            (read-only · computed from roles)
                        </span>
                    </SectionTitle>

                    {Object.entries(permsByResource).map(([resource, actions], i, arr) => (
                        <div
                            key={resource}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 0',
                                borderBottom: i < arr.length - 1 ? '0.5px solid #f3f4f6' : 'none',
                            }}
                        >
                            <span style={{ fontSize: 11, color: '#6b7280', width: 100, flexShrink: 0 }}>
                                {resource}
                            </span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {actions.map((a) => (
                                    <PermPill key={a} label={a} granted />
                                ))}
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </SkeletonWrapper>

    );
}

/* ─── tiny helpers ──────────────────────────────────────────────── */
function SectionTitle({ children, style }) {
    return (
        <p
            style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: '#9ca3af',
                marginBottom: 8,
                ...style,
            }}
        >
            {children}
        </p>
    );
}

function DetailRow({ label, children }) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 0',
                borderBottom: '0.5px solid #f3f4f6',
            }}
        >
            <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
            {children}
        </div>
    );
}