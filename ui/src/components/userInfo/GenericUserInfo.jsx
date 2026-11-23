import { useMemo, useState } from "react";
import {
    Alert,
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
} from "antd";
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    CloseCircleFilled,
    DownloadOutlined,
    InfoCircleFilled,
    KeyOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
    WarningFilled,
} from "@ant-design/icons";
import useApi from "../../hooks/useApi";
import useGlobalSelect from "../../hooks/useGlobalSelect";
import utils from "../../utils/function_utils";
import UserAuthorityPanel from "../access/UserAuthorityPanel";

const { Text } = Typography;
const ACTIVITY_FILTERS = ["All", "Login", "Security", "Access"];

const ACTIVITY_ICONS = {
    success: <CheckCircleFilled />,
    warning: <WarningFilled />,
    info: <InfoCircleFilled />,
    danger: <CloseCircleFilled />,
};

const ACTIVITY_TONE_CLASS = {
    success: "text-[var(--ads-success)] bg-[var(--ads-success-soft)]",
    warning: "text-[var(--ads-warning)] bg-[var(--ads-warning-soft)]",
    info: "text-[var(--ads-info)] bg-[var(--ads-info-soft)]",
    danger: "text-[var(--ads-danger)] bg-[var(--ads-danger-soft)]",
};

function activityCategory(activity) {
    const value = `${activity?.activity_type ?? ""} ${activity?.title ?? ""}`.toLowerCase();
    if (value.includes("login") || value.includes("logout")) return "Login";
    if (value.includes("password") || value.includes("auth") || value.includes("denied")) return "Security";
    return "Access";
}

function activityTone(activity) {
    const value = `${activity?.title ?? ""} ${activity?.description ?? ""}`.toLowerCase();
    if (value.includes("fail") || value.includes("denied") || value.includes("error")) return "danger";
    if (value.includes("reset") || value.includes("warning") || value.includes("limit")) return "warning";
    if (value.includes("success") || value.includes("login")) return "success";
    return "info";
}

function SectionHeader({ icon, title, description, action }) {
    return (
        <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[var(--ads-radius-sm)] bg-[var(--ads-accent-soft)] text-[var(--ads-accent)]">{icon}</span>
                <div className="min-w-0">
                    <h3 className="m-0 text-[length:var(--ads-font-size-body)] font-semibold text-[var(--ads-text-heading)]">{title}</h3>
                    {description && <p className="mb-0 mt-0.5 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{description}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

function DetailRow({ label, value, mono = false, copyable = false, last = false }) {
    return (
        <div className={`grid grid-cols-[145px_minmax(0,1fr)] items-start gap-4 py-2.5 ${last ? "" : "border-b border-[var(--ads-border-subtle)]"}`}>
            <span className="text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">{label}</span>
            <Text copyable={copyable && Boolean(value)} className={`!m-0 !text-right !text-[length:var(--ads-font-size-body-sm)] !font-medium !text-[var(--ads-text-heading)] ${mono ? "!font-[var(--font-data,var(--font-caption))]" : ""}`}>{value || "Not available"}</Text>
        </div>
    );
}

function OverviewTab({ data, user }) {
    const authority = data.authority ?? {};
    const inherited = authority.inheritedPermissions?.length ?? 0;
    const additional = authority.directPermissionAllows?.length ?? 0;
    const denied = authority.directPermissionDenies?.length ?? 0;
    const effective = authority.effectivePermissions?.length ?? data.permissions?.length ?? 0;
    const active = Number(user.status) === 1;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--ads-border-subtle)] pb-4">
                <div>
                    <span className="block text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.06em] text-[var(--ads-text-muted)]">Account state</span>
                    <strong className="mt-1 block text-[length:var(--ads-font-size-body)] text-[var(--ads-text-heading)]">{active ? "Active and ready to sign in" : "Account access is suspended"}</strong>
                </div>
                <Badge status={active ? "success" : "default"} text={active ? "Active" : "Inactive"} />
            </div>

            <section aria-label="Identity details">
                <SectionHeader icon={<UserOutlined />} title="Identity" description="Core system identifiers" />
                <div className="border-t border-[var(--ads-border-subtle)]">
                    <DetailRow label="User ID" value={user.custom_id} mono copyable />
                    <DetailRow label="Email" value={user.email} />
                    <DetailRow label="Phone" value={user.phone_no || user.phone} last />
                </div>
            </section>

            <section aria-label="Sign-in methods">
                <SectionHeader icon={<KeyOutlined />} title="Sign-in methods" description="Authentication currently available" />
                <div className="border-t border-[var(--ads-border-subtle)]">
                    <DetailRow label="Password" value={String(user.oauth_provider ?? "Password").toLowerCase() === "google" ? "Not configured" : "Enabled"} />
                    <DetailRow label="Google" value={String(user.oauth_provider ?? "").toLowerCase() === "google" ? "Connected" : "Not connected"} />
                    <DetailRow label="Password change" value={Number(user.forced_password_change) === 1 ? "Required at next login" : "Not required"} />
                    <DetailRow label="Last login" value={user.last_login ? utils.getDateAndTime(user.last_login) : "Never"} last />
                </div>
            </section>

            <section aria-label="Effective permissions">
                <SectionHeader icon={<SafetyCertificateOutlined />} title="Effective permissions" description="Resolved from role and user-specific authority" />
                <div className="grid grid-cols-4 overflow-hidden rounded-[var(--ads-radius-sm)] border border-[var(--ads-border-subtle)] max-sm:grid-cols-2">
                    {[["System role", data.roles?.[0]?.role_id || "Unassigned"], ["Inherited", inherited], ["Additional", additional], ["Effective", effective]].map(([label, value], index) => (
                        <div key={label} className={`px-3 py-3 ${index < 3 ? "border-r border-[var(--ads-border-subtle)]" : ""} max-sm:border-b max-sm:odd:border-r`}>
                            <strong className="block truncate text-[length:var(--ads-font-size-body)] text-[var(--ads-text-heading)]">{value}</strong>
                            <span className="mt-1 block text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{label}</span>
                        </div>
                    ))}
                </div>
                {denied > 0 && <p className="mb-0 mt-2 text-[length:var(--ads-font-size-caption)] text-[var(--ads-danger)]">{denied} inherited permission{denied === 1 ? " is" : "s are"} currently denied by direct authority.</p>}
            </section>
        </div>
    );
}

function RoleTab({ data, userId, roleSelect, assigning, onAssign }) {
    const currentRole = data.roles?.[0]?.role_id;
    const authority = data.authority ?? {};
    const inherited = authority.inheritedPermissions ?? [];
    const additional = authority.directPermissionAllows ?? [];
    const effective = authority.effectivePermissions ?? [];

    return (
        <div className="space-y-5">
            <section aria-label="Assigned system role">
                <SectionHeader icon={<SafetyCertificateOutlined />} title="Assigned system role" description="One role supplies the permission baseline" action={<Tag className="!m-0" color={currentRole ? "processing" : "error"}>{currentRole || "Unassigned"}</Tag>} />
                <div className="rounded-[var(--ads-radius-sm)] border border-[var(--ads-border-subtle)] p-4">
                    <label className="mb-1.5 block text-[length:var(--ads-font-size-body-sm)] font-medium text-[var(--ads-text-heading)]" htmlFor={`user-role-${userId}`}>Replace system role</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 max-sm:grid-cols-1">
                        {roleSelect.SelectJsx({ id: `user-role-${userId}`, "aria-label": "Select replacement role", placeholder: "Select a system role" })}
                        <Popconfirm title="Replace this user’s system role?" description="Inherited permissions and navigation change immediately." okText="Replace role" disabled={!roleSelect.selected} onConfirm={() => onAssign(roleSelect.selected)}>
                            <Button type="primary" loading={assigning} disabled={!roleSelect.selected}>Change role</Button>
                        </Popconfirm>
                    </div>
                </div>
            </section>

            <section aria-label="Default permissions">
                <SectionHeader icon={<LockOutlined />} title="Default permissions" description="Inherited from the assigned system role and locked here" action={<Tag className="!m-0">{inherited.length} inherited</Tag>} />
                <div className="max-h-48 overflow-y-auto border-y border-[var(--ads-border-subtle)] py-2 [scrollbar-width:thin]">
                    {inherited.length ? <div className="flex flex-wrap gap-1.5">{inherited.map((permission) => <Tag className="!m-0" key={permission}>{permission}</Tag>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="This role has no inherited permissions" />}
                </div>
            </section>

            <section aria-label="Additional permissions">
                <SectionHeader icon={<KeyOutlined />} title="Additional permissions" description="User-specific additions managed through authority" action={<Tag className="!m-0" color={additional.length ? "processing" : "default"}>{additional.length} additional</Tag>} />
                <div className="flex items-center justify-between rounded-[var(--ads-radius-sm)] border border-[var(--ads-border-subtle)] px-3 py-3">
                    <span className="text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">{inherited.length} inherited + {additional.length} additional</span>
                    <strong className="tabular-nums text-[var(--ads-text-heading)]">{effective.length} effective</strong>
                </div>
            </section>
        </div>
    );
}

function HistoryTab({ activities = [] }) {
    const [filter, setFilter] = useState("All");
    const filtered = useMemo(() => activities.filter((activity) => filter === "All" || activityCategory(activity) === filter), [activities, filter]);

    return (
        <section aria-label="User history">
            <SectionHeader
                icon={<ClockCircleOutlined />}
                title="User history"
                description="Audited account, sign-in and access events"
                action={<Button icon={<DownloadOutlined />} disabled={!activities.length} onClick={() => utils.handleDownloadCSV(activities, "user-history")}>Export</Button>}
            />
            <Segmented className="mb-4" options={ACTIVITY_FILTERS} value={filter} onChange={setFilter} />
            {filtered.length ? (
                <div className="border-t border-[var(--ads-border-subtle)]">
                    {filtered.map((activity) => {
                        const tone = activityTone(activity);
                        return (
                            <article className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--ads-border-subtle)] py-3.5 max-sm:grid-cols-[30px_minmax(0,1fr)]" key={activity.id}>
                                <span className={`grid size-[30px] place-items-center rounded-full ${ACTIVITY_TONE_CLASS[tone]}`}>{ACTIVITY_ICONS[tone]}</span>
                                <div className="min-w-0">
                                    <strong className="block text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-heading)]">{activity.activity_type || activity.title || "Account activity"}</strong>
                                    <p className="my-0.5 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{activity.description || "No additional details were recorded."}</p>
                                    <Tooltip title={activity.user_agent || "User agent not recorded"}><small className="block truncate font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)]">{activity.ip_address ? `${activity.ip_address} · ` : ""}{activity.user_agent || "Unknown device"}</small></Tooltip>
                                </div>
                                <time className="whitespace-nowrap text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)]">{activity.created_at ? utils.fromNow(activity.created_at) : "Unknown time"}</time>
                            </article>
                        );
                    })}
                </div>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${filter.toLowerCase()} history found`} />}
        </section>
    );
}

export default function GenericUserInfo({ user }) {
    const roleSelect = useGlobalSelect("role_name", "admin_roles");
    const { run, loading, error, data: response } = useApi("get", user?.custom_id ? `/access/user_info/${user.custom_id}` : null);
    const data = response?.data;
    const { run: assignRole, loading: assigning } = useApi("post", "/access/assign/roles", {
        successMessage: "System role updated",
        onSuccess: () => { roleSelect.reset(); run(); },
    });

    if (loading || (!data && !error)) return <div className="p-6"><Skeleton active paragraph={{ rows: 12 }} /></div>;
    if (error) return <div className="p-6"><Alert type="error" showIcon message="User information could not be loaded" description={error.message} action={<Button onClick={() => run()}>Try again</Button>} /></div>;

    const effectivePermissions = data.authority?.effectivePermissions ?? (data.permissions ?? []).map((row) => row.permission).filter(Boolean);
    const items = [
        { key: "overview", label: "Overview", children: <OverviewTab data={data} user={user} /> },
        { key: "role", label: "System role", children: <RoleTab data={data} userId={user.custom_id} roleSelect={roleSelect} assigning={assigning} onAssign={(role) => assignRole({ custom_id: user.custom_id, role })} /> },
        { key: "authority", label: "Temporary authority", children: <UserAuthorityPanel fallbackPermissions={effectivePermissions} userId={user.custom_id} /> },
        { key: "history", label: "History", children: <HistoryTab activities={data.activities ?? []} /> },
    ];

    return (
        <div className="min-h-[calc(100vh-138px)] bg-[var(--ads-surface-raised)] px-5 pb-6">
            <Tabs defaultActiveKey="overview" items={items} className="[&>.ant-tabs-nav]:!mb-5 [&_.ant-tabs-tab]:!py-3.5" />
        </div>
    );
}
