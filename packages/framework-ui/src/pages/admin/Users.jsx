import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Avatar,
    Button,
    Checkbox,
    Dropdown,
    Form,
    Input,
    Modal,
    Select,
    Tag,
    Typography,
} from "antd";
import {
    AppstoreOutlined,
    DownloadOutlined,
    EditOutlined,
    ExportOutlined,
    IdcardOutlined,
    KeyOutlined,
    LockOutlined,
    PlusOutlined,
    SearchOutlined,
    SettingOutlined,
    SafetyCertificateOutlined,
    UserAddOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import CustomTable from "../../components/CustomTable";
import GenericUserInfo from "../../components/userInfo/GenericUserInfo";
import useApi from "../../hooks/useApi";
import useNotification from "../../hooks/useNotification";
import useCan from "../../core/hooks/access/useCan";
import { useCustomMutation } from "../../core/hooks/data/useCustom";
import useDrawer from "../../hooks/useDrawer";
import useGlobalSelect from "../../hooks/useGlobalSelect";
import useRecordForm from "../../hooks/useRecordForm";
import useTableApi from "../../hooks/useTableApi";
import { useStore as useValuesStore } from "../../store/values-store";
import utils from "../../utils/function_utils";

const ACCESS_PRESENTATION = {
    READY: ["Active", "var(--ads-success)"],
    SETUP_REQUIRED: ["Setup required", "var(--ads-warning)"],
    NO_ROLE: ["No system role", "var(--ads-danger)"],
    TEMPORARY_AUTHORITY: ["Active", "var(--ads-success)"],
    SUSPENDED: ["Suspended", "var(--ads-danger)"],
};

const PERMISSION_FILTERS = [
    { value: "DEFAULT_ONLY", label: "Default only" },
    { value: "WITH_ADDITIONAL", label: "Has additional permissions" },
    { value: "WITH_TEMPORARY", label: "Has temporary authority" },
];

function AccessTag({ state }) {
    const [label, color] = ACCESS_PRESENTATION[state] ?? ACCESS_PRESENTATION.NO_ROLE;
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[length:var(--ads-font-size-body-sm)] font-medium text-[var(--ads-text-heading)]">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            {label}
        </span>
    );
}

function PermissionSummary({ record }) {
    const defaults = Number(record.default_permission_count ?? 0);
    const additional = Number(record.additional_permission_count ?? 0);
    const denied = Number(record.denied_permission_count ?? 0);
    const temporary = Number(record.active_temporary_count ?? 0);

    return (
        <div className="flex min-w-[188px] flex-wrap items-center gap-1.5 font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)]">
            <span className="inline-flex items-center gap-1 rounded-[var(--ads-radius-xs,3px)] bg-[var(--ads-surface-sunken)] px-2 py-1 text-[var(--ads-text-muted)]">
                <LockOutlined className="text-[length:var(--ads-font-size-caption)]" /> {defaults} default
            </span>
            {additional > 0 && <span className="rounded-[var(--ads-radius-xs,3px)] bg-[var(--ads-accent-soft)] px-2 py-1 font-semibold text-[var(--ads-accent)]">+{additional} added</span>}
            {temporary > 0 && <span className="rounded-[var(--ads-radius-xs,3px)] bg-[var(--ads-warning-soft)] px-2 py-1 font-semibold text-[var(--ads-warning)]">{temporary} temporary</span>}
            {denied > 0 && <span className="rounded-[var(--ads-radius-xs,3px)] bg-[var(--ads-danger-soft)] px-2 py-1 font-semibold text-[var(--ads-danger)]">-{denied} denied</span>}
        </div>
    );
}

function AttentionMetric({ label, meta, count, tone, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-w-[138px] flex-1 items-center justify-between gap-3 border-l border-[var(--ads-border-subtle)] bg-transparent px-4 text-left transition-colors hover:bg-[var(--ads-surface-sunken)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--ads-accent)]"
        >
            <span>
                <strong className="block font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-h5)] font-semibold leading-none tabular-nums" style={{ color: tone }}>{count}</strong>
                <span className="mt-1.5 block font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.06em] text-[var(--ads-text-heading)]">{label}</span>
                <span className="mt-0.5 block font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] uppercase tracking-[0.04em] text-[var(--ads-text-subtle)]">{meta}</span>
            </span>
            <span className="text-[var(--ads-text-subtle)]" aria-hidden="true">→</span>
        </button>
    );
}

function AddUserForm({
    form,
    roleSelect,
    selectedRole,
    onRoleChange,
    baselinePermissions,
    baselineLoading,
    additionalPermissions,
    onAdditionalPermissionsChange,
    permissionOptions,
    onFinish,
}) {
    const effectiveCount = baselinePermissions.length + additionalPermissions.length;

    return (
        <Form
            form={form}
            id="add-user-form"
            layout="vertical"
            preserve={false}
            requiredMark="optional"
            initialValues={{ status: 1 }}
            onFinish={onFinish}
            className="pb-2"
        >
            <Alert
                className="mb-5"
                type="info"
                showIcon
                message="Create a system identity"
                description="A User ID is generated automatically and can be used to sign in. Email remains optional."
            />

            <section aria-labelledby="new-user-identity-heading">
                <div className="mb-3">
                    <h3 id="new-user-identity-heading" className="m-0 text-[length:var(--ads-font-size-body)] font-semibold text-[var(--ads-text-heading)]">Identity</h3>
                    <p className="mb-0 mt-1 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Contact details may be added later when the user does not have email.</p>
                </div>
                <Form.Item name="name" label="Full name" rules={[{ required: true, whitespace: true, min: 2, max: 100 }]}>
                    <Input autoComplete="name" placeholder="Enter the user’s full name" />
                </Form.Item>
                <div className="grid grid-cols-2 gap-x-3 max-sm:grid-cols-1">
                    <Form.Item name="email" label="Email address" rules={[{ type: "email", message: "Enter a valid email address" }]}>
                        <Input autoComplete="email" placeholder="Optional email address" />
                    </Form.Item>
                    <Form.Item name="phone_no" label="Phone number" rules={[{ max: 15, message: "Phone number cannot exceed 15 characters" }]}>
                        <Input autoComplete="tel" placeholder="Optional phone number" />
                    </Form.Item>
                </div>
                <Form.Item name="status" label="Account status" rules={[{ required: true }]}>
                    <Select options={[{ value: 1, label: "Active" }, { value: 0, label: "Inactive" }]} />
                </Form.Item>
            </section>

            <div className="my-5 border-t border-[var(--ads-border-subtle)]" />

            <section aria-labelledby="new-user-role-heading">
                <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                        <h3 id="new-user-role-heading" className="m-0 text-[length:var(--ads-font-size-body)] font-semibold text-[var(--ads-text-heading)]">System role</h3>
                        <p className="mb-0 mt-1 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">The selected role supplies permissions that cannot be removed here.</p>
                    </div>
                    <Tag className="!m-0" color="processing">Default: User</Tag>
                </div>
                <div className="mb-3">
                    <label className="mb-1.5 block text-[length:var(--ads-font-size-body-sm)] font-medium text-[var(--ads-text-heading)]" htmlFor="new-user-system-role">Assigned role</label>
                    {roleSelect.SelectJsx({
                        id: "new-user-system-role",
                        value: selectedRole,
                        placeholder: "Select a system role",
                        onChange: onRoleChange,
                    })}
                </div>

                <div className="rounded-[var(--ads-radius-sm)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface-sunken)] p-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 font-medium text-[var(--ads-text-heading)]"><LockOutlined className="text-[var(--ads-accent)]" />Default permissions</span>
                        <Tag className="!m-0">{baselineLoading ? "Loading" : `${baselinePermissions.length} inherited`}</Tag>
                    </div>
                    <p className="mb-0 mt-2 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">These permissions come from {selectedRole || "the selected role"} and remain locked to preserve the role baseline.</p>
                </div>

                <div className="mt-4">
                    <label className="mb-1.5 block text-[length:var(--ads-font-size-body-sm)] font-medium text-[var(--ads-text-heading)]" htmlFor="new-user-additional-permissions">Additional permissions</label>
                    <Select
                        id="new-user-additional-permissions"
                        mode="multiple"
                        allowClear
                        showSearch
                        maxTagCount="responsive"
                        value={additionalPermissions}
                        options={permissionOptions}
                        placeholder="Add permissions beyond the role baseline"
                        optionFilterProp="label"
                        onChange={onAdditionalPermissionsChange}
                        className="w-full"
                    />
                    <p className="mb-0 mt-1.5 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Temporary authority is granted later from the user record with a reason and expiry.</p>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-[var(--ads-radius-sm)] border border-[var(--ads-accent-border)] bg-[var(--ads-accent-soft)] px-3 py-2.5">
                    <span className="text-[length:var(--ads-font-size-body-sm)] font-medium text-[var(--ads-accent-text)]">Effective permissions at creation</span>
                    <strong className="tabular-nums text-[var(--ads-accent-text)]">{baselinePermissions.length} + {additionalPermissions.length} = {effectiveCount}</strong>
                </div>
            </section>
        </Form>
    );
}

// A temporary password the administrator hands to the user, shown once: on
// a new account, or after "Reset password" for someone who forgot theirs.
function TemporaryPasswordModal({ issued, onClose }) {
    if (!issued) return null;
    const signInWith = [issued.email, issued.phone, issued.customId].filter(Boolean).join("  ·  ");
    return (
        <Modal
            open
            title={issued.reason === "created" ? `${issued.name} can now sign in` : `New temporary password for ${issued.name}`}
            onCancel={onClose}
            maskClosable={false}
            footer={<Button type="primary" onClick={onClose}>I have given it to them</Button>}
        >
            <div className="flex flex-col gap-4">
                <Alert type="warning" showIcon title="Shown only once" description="Write it down or read it to them now. If it is lost, use Reset password to make a new one." />
                <div className="flex flex-col gap-1">
                    <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Sign in with any of</span>
                    <strong className="break-all">{signInWith}</strong>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Temporary password</span>
                    <Typography.Paragraph copyable={{ text: issued.password }} className="!m-0 font-[family-name:var(--ads-font-data)] text-[length:var(--ads-font-size-h4)] tracking-[2px] text-[var(--ads-text-heading)]">
                        {issued.password}
                    </Typography.Paragraph>
                </div>
                <p className="m-0 text-[var(--ads-text-muted)]">At sign-in they must choose their own password before they can do anything else.</p>
            </div>
        </Modal>
    );
}

export default function Users() {
    const [view, setView] = useState("all");
    const [hiddenColumns, setHiddenColumns] = useState([]);
    const [addUserForm] = Form.useForm();
    const [selectedRole, setSelectedRole] = useState("User");
    const [additionalPermissions, setAdditionalPermissions] = useState([]);
    const navigate = useNavigate();
    const { message } = useNotification();
    const [issuedPassword, setIssuedPassword] = useState(null);
    const resetPassword = useCustomMutation();
    const canResetPasswords = useCan("update:admin");
    const recordForm = useRecordForm("tables_metadata", "table_name");
    const roleSelect = useGlobalSelect("role_name", "admin_roles");
    const registeredPermissions = useValuesStore((state) => state.permissions ?? []);
    const addUserDrawer = useDrawer({ width: "min(640px, 100vw)", destroyOnClose: true, rootClassName: "users-add-drawer", styles: { body: { padding: 20 } } });
    const userDrawer = useDrawer({ width: "min(820px, 100vw)", destroyOnClose: true, rootClassName: "users-info-drawer", styles: { body: { padding: 0 } } });
    const table = useTableApi(
        { pagination: { current: 1, pageSize: 25 } },
        { manual: false },
        "custom_id",
        { endpoint: "/api/v1/users/directory", defaultLimit: 25, maxLimit: 100 },
    );
    const { runRequest, setAllowSelection } = table;
    const { data: rolePermissionResponse, loading: baselineLoading } = useApi("get", selectedRole ? `/access/permissions/${encodeURIComponent(selectedRole)}` : null);
    const baselinePermissions = useMemo(() => (rolePermissionResponse?.data?.assigned ?? []).map((row) => row.permission).filter(Boolean), [rolePermissionResponse]);
    const baselineSet = useMemo(() => new Set(baselinePermissions), [baselinePermissions]);
    const effectiveAdditionalPermissions = useMemo(
        () => additionalPermissions.filter((permission) => !baselineSet.has(permission)),
        [additionalPermissions, baselineSet],
    );
    const permissionOptions = useMemo(
        () => registeredPermissions
            .filter((permission) => permission?.permission_name && !baselineSet.has(permission.permission_name))
            .map((permission) => ({ value: permission.permission_name, label: permission.alias || permission.permission_name, title: permission.description }))
            .sort((left, right) => String(left.label).localeCompare(String(right.label))),
        [baselineSet, registeredPermissions],
    );
    const { run: createUser, loading: creatingUser } = useApi("post", "/auth/create_user", {
        successMessage: "User identity created",
        onSuccess: (result) => {
            const created = result?.data?.data;
            if (created?.temporary_password) {
                setIssuedPassword({ reason: "created", name: created.name, email: created.email, phone: created.phone_no, customId: created.custom_id, password: created.temporary_password });
            }
            addUserForm.resetFields();
            roleSelect.reset();
            setSelectedRole("User");
            setAdditionalPermissions([]);
            addUserDrawer.closeDrawer();
            runRequest();
        },
    });

    useEffect(() => setAllowSelection(true), [setAllowSelection]);

    const roles = table.meta?.roles ?? [];
    const accessStates = table.meta?.accessStates ?? [];
    const filters = table.tableParams.filters ?? {};
    const activeFilterCount = Object.values(filters).filter((value) => Array.isArray(value) ? value.length : value !== undefined && value !== "").length;
    const serverFilter = (field, options) => ({ filters: options.map((option) => ({ text: option.label, value: option.value })), filteredValue: filters[field] ?? null });

    const openAdd = () => {
        addUserForm.resetFields();
        roleSelect.reset();
        roleSelect.setSelected("User");
        setSelectedRole("User");
        setAdditionalPermissions([]);
        addUserDrawer.openDrawer({ title: "Add user" });
    };

    const submitNewUser = (values) => createUser({
        name: values.name.trim(),
        email: values.email?.trim().toLowerCase() || null,
        phone_no: values.phone_no?.trim() || null,
        status: Number(values.status) === 0 ? 0 : 1,
        role: selectedRole || "User",
        additional_permissions: effectiveAdditionalPermissions,
    });

    const openEdit = (record) => {
        userDrawer.closeDrawer();
        recordForm.setChildrenTop(undefined);
        recordForm.setFields(["name", "email", "phone_no", "status"]);
        recordForm.openEdit("admin", record, record.id);
    };

    const confirmResetPassword = (record) => Modal.confirm({
        title: `Give ${record.name} a new temporary password?`,
        content: "Their current password stops working and they are signed out everywhere. They choose a new password when they next sign in.",
        okText: "Reset password",
        okButtonProps: { danger: true },
        onOk: async () => {
            try {
                const result = await resetPassword.mutateAsync({ url: `/auth/users/${encodeURIComponent(record.custom_id)}/temporary_password` });
                const issued = result?.data?.data;
                userDrawer.closeDrawer();
                setIssuedPassword({ reason: "reset", name: issued.name, email: record.email, phone: record.phone_no, customId: issued.custom_id, password: issued.temporary_password });
            } catch (error) {
                message.error(error?.message || "The password could not be reset.");
            }
        },
    });

    const openManage = (record) => userDrawer.openDrawer({
        title: (
            <div className="flex min-w-0 items-center gap-3">
                <Avatar shape="square" size={36} src={record.avatar || record.profile_picture || undefined} className="shrink-0 !rounded-[var(--ads-radius-sm)] !bg-[var(--ads-accent-soft)] !text-[var(--ads-accent)]">{utils.getInitials_v2(record.name)}</Avatar>
                <div className="min-w-0"><strong className="block truncate text-[var(--ads-text-heading)]">{record.name}</strong><span className="block truncate font-[var(--font-caption)] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{record.custom_id}</span></div>
            </div>
        ),
        content: <GenericUserInfo user={record} />,
        footer: (
            <div className="flex items-center justify-between gap-3">
                <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Role, authority and account changes are audited.</span>
                <div className="flex items-center gap-2"><Button onClick={userDrawer.closeDrawer}>Close</Button>{canResetPasswords && <Button icon={<KeyOutlined />} onClick={() => confirmResetPassword(record)}>Reset password</Button>}<Button type="primary" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit user</Button></div>
            </div>
        ),
    });

    const setDirectoryView = (nextView, states) => {
        setView(nextView);
        if (nextView === "attention") table.setFilter("access_state", states ?? ["SETUP_REQUIRED", "NO_ROLE", "TEMPORARY_AUTHORITY"]);
        else if (nextView === "inactive") table.setFilter("access_state", ["SUSPENDED"]);
        else table.clearFilter("access_state");
    };

    const columns = [
        {
            title: "NO.", key: "directory_index", width: 56, responsive: ["lg"],
            render: (_, __, rowIndex) => {
                const page = Number(table.tableParams.pagination?.current ?? 1);
                const pageSize = Number(table.tableParams.pagination?.pageSize ?? 25);
                return <span className="font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)]">{String(((page - 1) * pageSize) + rowIndex + 1).padStart(2, "0")}</span>;
            },
        },
        {
            title: "IDENTITY", key: "name", sorter: true, width: 250,
            render: (_, record) => (
                <div className="flex min-w-[210px] items-center gap-2.5">
                    <Avatar shape="square" size={35} src={record.avatar || record.profile_picture || undefined} className="shrink-0 !rounded-[var(--ads-radius-sm)] !bg-[var(--ads-accent-soft)] !font-[var(--font-data,var(--font-caption))] !text-[var(--ads-accent)]">{utils.getInitials_v2(record.name)}</Avatar>
                    <div className="min-w-0">
                        <button type="button" className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap bg-transparent p-0 text-left text-[length:var(--ads-font-size-body-sm)] font-semibold text-[var(--ads-text-heading)] hover:text-[var(--ads-accent)]" onClick={() => openManage(record)}>{record.name}</button>
                        <span className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{record.email || record.phone_no || "No contact details"}</span>
                    </div>
                </div>
            ),
        },
        { title: "USER ID", dataIndex: "custom_id", key: "custom_id", width: 150, responsive: ["md"], render: (value) => <span className="font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{value || "—"}</span> },
        {
            title: "SYSTEM ROLE", dataIndex: "system_role", key: "role_name", width: 150, ...serverFilter("role_name", roles),
            render: (value, record) => (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-[var(--ads-radius-xs,3px)] px-2 py-1 text-[length:var(--ads-font-size-caption)] font-medium ${value ? "bg-[var(--ads-surface-sunken)] text-[var(--ads-text-muted)]" : "bg-[var(--ads-danger-soft)] text-[var(--ads-danger)]"}`}>{value || "Unassigned"}</span>
                    {Number(record.system_role_count) > 1 && <span className="font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">+{Number(record.system_role_count) - 1}</span>}
                </div>
            ),
        },
        { title: "EFFECTIVE PERMISSIONS", key: "permission_count", sorter: true, width: 240, responsive: ["lg"], render: (_, record) => <PermissionSummary record={record} /> },
        { title: "ACCOUNT", dataIndex: "access_state", key: "access_state", width: 145, ...serverFilter("access_state", accessStates), render: (value) => <AccessTag state={value} /> },
        { title: "LAST ACTIVE", dataIndex: "last_login", key: "last_login", sorter: true, width: 110, responsive: ["md"], render: (value) => <span className="font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">{value ? utils.fromNow(value) : "Never"}</span> },
        {
            title: "ACTIONS", key: "manage", fixed: "right", width: 94,
            render: (_, record) => (
                <div className="flex justify-end">
                    <button type="button" onClick={() => openManage(record)} className="inline-flex items-center gap-1.5 bg-transparent p-0 font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.04em] text-[var(--ads-accent)] hover:text-[var(--ads-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ads-accent)]">
                        Manage <ExportOutlined className="text-[length:var(--ads-font-size-caption)]" />
                    </button>
                </div>
            ),
        },
    ];

    const pageCounts = table.meta?.pageCounts ?? {};
    const setupRequiredCount = Number(pageCounts.SETUP_REQUIRED ?? 0);
    const noRoleCount = Number(pageCounts.NO_ROLE ?? 0);
    const temporaryGrantCount = Number(pageCounts.TEMPORARY_AUTHORITY ?? 0);
    const inactiveCount = Number(pageCounts.SUSPENDED ?? 0);
    const allUsersCount = Number(table.tableProps.pagination?.total ?? 0);
    const attentionCount = setupRequiredCount + noRoleCount + temporaryGrantCount;
    const viewCounts = { all: allUsersCount, attention: attentionCount, inactive: inactiveCount };
    const columnOptions = useMemo(() => [["custom_id", "User ID"], ["role_name", "System role"], ["permission_count", "Effective permissions"], ["access_state", "Account"], ["last_login", "Last activity"]].map(([key, label]) => ({ key, label })), []);
    const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column.key));

    const views = (
        <div className="flex min-h-[50px] items-center justify-between gap-4 overflow-x-auto border-b border-[var(--ads-border-subtle)] px-4">
            <div className="flex shrink-0 items-center gap-4">
                <span className="grid size-[26px] place-items-center rounded-[var(--ads-radius-sm)] bg-[var(--ads-accent-soft)] text-[var(--ads-accent)]" aria-hidden="true"><IdcardOutlined /></span>
                <span className="font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.07em] text-[var(--ads-text-heading)]">System user directory</span>
                <span className="h-[18px] w-px bg-[var(--ads-border)]" aria-hidden="true" />
                <div className="flex items-center gap-5" role="tablist" aria-label="Directory views">
                    {[["all", "All"], ["attention", "Attention"], ["inactive", "Inactive"]].map(([key, label]) => (
                        <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setDirectoryView(key)} className={`whitespace-nowrap bg-transparent p-0 font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.05em] ${view === key ? "text-[var(--ads-accent)]" : "text-[var(--ads-text-muted)] hover:text-[var(--ads-text-heading)]"}`}>{label}<span className="ml-1.5 tabular-nums">{viewCounts[key]}</span></button>
                    ))}
                </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.08em] text-[var(--ads-text-muted)]"><span className="size-1.5 rounded-full bg-[var(--ads-success)]" aria-hidden="true" />Live directory</span>
        </div>
    );

    const toolbar = (
        <div className="flex min-h-[56px] items-center justify-between gap-3 border-b border-[var(--ads-border-subtle)] px-4 py-2.5 max-lg:flex-wrap">
            <Input allowClear className="!w-[350px] max-sm:!w-full" prefix={<SearchOutlined className="text-[var(--ads-text-subtle)]" />} placeholder="Search name, User ID, email or phone" onPressEnter={(event) => table.handleGlobalSearch(event.currentTarget.value)} onChange={(event) => { if (!event.target.value) table.handleGlobalSearch(""); }} />
            <div className="flex flex-wrap items-center justify-end gap-2 max-sm:w-full max-sm:justify-start">
                <Select allowClear className="min-w-32" aria-label="Filter by system role" options={roles} placeholder="System role" value={filters.role_name || undefined} onChange={(value) => table.setFilter("role_name", value)} suffixIcon={<SafetyCertificateOutlined />} />
                <Select allowClear className="min-w-36" aria-label="Filter by permission state" options={PERMISSION_FILTERS} placeholder="Permissions" value={filters.permission_state || undefined} onChange={(value) => table.setFilter("permission_state", value)} suffixIcon={<KeyOutlined />} />
                <Select allowClear className="min-w-36" aria-label="Filter by account state" options={accessStates} placeholder="Account state" value={filters.access_state || undefined} onChange={(value) => { setView("all"); table.setFilter("access_state", value); }} />
                {activeFilterCount > 0 && <Button onClick={() => { setView("all"); table.clearAllFilters(); }}>Clear · {activeFilterCount}</Button>}
                <Dropdown
                    trigger={["click"]}
                    dropdownRender={() => (
                        <div className="min-w-52 rounded-[var(--ads-radius-sm)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface-raised)] p-2 shadow-[var(--ads-shadow-sm)]">
                            <p className="mb-1 px-2 text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.05em] text-[var(--ads-text-muted)]">Visible columns</p>
                            {columnOptions.map((column) => <Checkbox key={column.key} className="flex w-full px-2 py-1.5" checked={!hiddenColumns.includes(column.key)} onChange={(event) => setHiddenColumns((current) => event.target.checked ? current.filter((key) => key !== column.key) : [...current, column.key])}>{column.label}</Checkbox>)}
                        </div>
                    )}
                >
                    <Button icon={<AppstoreOutlined />}>Columns</Button>
                </Dropdown>
                <Button aria-label="Export user directory" title="Export user directory" icon={<DownloadOutlined />} disabled={!table.record?.length} onClick={() => utils.handleDownloadCSV(table.record, "user-directory")} />
            </div>
        </div>
    );

    const notice = (
        <section className="overflow-x-auto rounded-[var(--ads-radius-md)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface-raised)]" aria-label="Identity review queue">
            <div className="flex h-[68px] min-w-[950px]">
                <button type="button" onClick={() => setDirectoryView("attention")} className="flex w-[274px] shrink-0 items-center gap-3 bg-[var(--ads-warning-soft)] px-4 text-left transition-colors hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--ads-warning)]">
                    <span className="grid size-[34px] shrink-0 place-items-center rounded-[var(--ads-radius-sm)] bg-[var(--ads-surface-raised)] text-[var(--ads-warning)]" aria-hidden="true"><WarningOutlined /></span>
                    <span>
                        <strong className="block font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-h5)] font-semibold leading-none tabular-nums text-[var(--ads-warning)]">{attentionCount}</strong>
                        <span className="mt-1.5 block font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.06em] text-[var(--ads-text-heading)]">Identities require review</span>
                    </span>
                </button>
                <AttentionMetric label="Setup" meta="Incomplete setup" count={setupRequiredCount} tone="var(--ads-warning)" onClick={() => setDirectoryView("attention", ["SETUP_REQUIRED"])} />
                <AttentionMetric label="Role gaps" meta="No system role" count={noRoleCount} tone="var(--ads-danger)" onClick={() => setDirectoryView("attention", ["NO_ROLE"])} />
                <AttentionMetric label="Temporary" meta="Time-bound" count={temporaryGrantCount} tone="var(--ads-accent)" onClick={() => setDirectoryView("attention", ["TEMPORARY_AUTHORITY"])} />
                <AttentionMetric label="Inactive" meta="Not active" count={inactiveCount} tone="var(--ads-text-muted)" onClick={() => setDirectoryView("inactive")} />
                <button type="button" onClick={() => setDirectoryView("attention")} className="min-w-[126px] border-l border-[var(--ads-border-subtle)] bg-transparent px-4 font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.07em] text-[var(--ads-accent)] hover:bg-[var(--ads-surface-sunken)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--ads-accent)]">Review queue →</button>
            </div>
        </section>
    );

    const scopeBar = (
        <div className="flex min-h-[34px] items-center justify-between gap-3 border-b border-[var(--ads-border-subtle)] bg-[var(--ads-surface-sunken)] px-4 font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] uppercase tracking-[0.04em] text-[var(--ads-text-muted)]">
            <span className="inline-flex items-center gap-2"><SafetyCertificateOutlined className="text-[var(--ads-accent)]" />Showing system identities you are authorized to manage</span>
            {activeFilterCount > 0 ? <button type="button" className="bg-transparent p-0 font-semibold text-[var(--ads-accent)]" onClick={() => { setView("all"); table.clearAllFilters(); }}>Clear {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"}</button> : <span>No filters applied</span>}
        </div>
    );

    return (
        <main className="admin-page flex min-h-full min-w-0 w-full flex-col gap-4">
            <header className="flex min-h-[100px] items-center justify-between gap-6 border-b border-[var(--ads-border)] pb-4 max-[700px]:h-auto max-[700px]:flex-col max-[700px]:items-stretch">
                <div className="min-w-0">
                    <p className="mb-2 font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.1em] text-[var(--ads-accent)]">Identity operations / User register</p>
                    <h1 className="m-0 text-[clamp(1.375rem,2vw,1.75rem)] font-semibold leading-tight text-[var(--ads-text-heading)]">Users</h1>
                    <p className="mb-0 mt-3 max-w-[680px] text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">Manage system identities, sign-in methods, system roles and temporary authority from one auditable register.</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 max-[700px]:w-full max-[700px]:flex-wrap">
                    <div className="mr-1 min-w-[74px] text-right max-[700px]:mr-auto max-[700px]:text-left">
                        <strong className="block font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-h4)] font-semibold leading-none tabular-nums text-[var(--ads-text-heading)]">{allUsersCount}</strong>
                        <span className="mt-1 block font-[var(--font-data,var(--font-caption))] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.07em] text-[var(--ads-text-subtle)]">System identities</span>
                    </div>
                    <Button icon={<SettingOutlined />} onClick={() => navigate("/admin/settings/appearance")}>Settings</Button>
                    <Button type="primary" icon={<UserAddOutlined />} onClick={openAdd}>Add user</Button>
                </div>
            </header>

            {notice}

            <CustomTable
                label="System user directory"
                tableConfig={{
                    ...table,
                    tableProps: {
                        ...table.tableProps,
                        scroll: { x: 1200 },
                        rowSelection: { ...table.tableProps.rowSelection, columnWidth: 36 },
                        rowClassName: (record) => table.selectedRowKeys.includes(record.custom_id) ? "users-directory-row--selected" : "",
                        pagination: {
                            ...table.tableProps.pagination,
                            showSizeChanger: false,
                            showTotal: (total, range) => `${String(range[0] || 0).padStart(3, "0")}–${String(range[1] || 0).padStart(3, "0")} / ${total} SYSTEM IDENTITIES`,
                            itemRender: (page, type, originalElement) => type === "page" ? <span>{String(page).padStart(2, "0")}</span> : originalElement,
                        },
                    },
                }}
                columns={visibleColumns}
                views={views}
                toolbar={toolbar}
                scopeBar={scopeBar}
                className="min-h-[680px] !rounded-[var(--ads-radius-md)] !border-[var(--ads-border)] !shadow-none [&_.ant-card-body]:flex [&_.ant-card-body]:min-h-[678px] [&_.ant-card-body]:flex-col"
                tableClassName="!flex !flex-1 !flex-col !px-0 !pb-0 [&_.ant-table-wrapper]:!flex [&_.ant-table-wrapper]:!flex-1 [&_.ant-table-wrapper]:!flex-col [&_.ant-table-thead>tr>th]:!h-[42px] [&_.ant-table-thead>tr>th]:!bg-[var(--ads-surface-sunken)] [&_.ant-table-thead>tr>th]:!py-0 [&_.ant-table-thead>tr>th]:!font-[var(--font-data,var(--font-caption))] [&_.ant-table-thead>tr>th]:!text-[length:var(--ads-font-size-caption)] [&_.ant-table-thead>tr>th]:!font-semibold [&_.ant-table-thead>tr>th]:!tracking-[0.06em] [&_.ant-table-tbody>tr>td]:!h-[67px] [&_.ant-table-tbody>tr>td]:!py-0 [&_.users-directory-row--selected>td]:!bg-[var(--ads-accent-soft)] [&_.ant-pagination]:!mt-auto [&_.ant-pagination]:!min-h-[56px] [&_.ant-pagination]:!w-full [&_.ant-pagination]:!items-center [&_.ant-pagination]:!border-t [&_.ant-pagination]:!border-[var(--ads-border-subtle)] [&_.ant-pagination]:!bg-[var(--ads-surface-sunken)] [&_.ant-pagination]:!px-4 [&_.ant-pagination-total-text]:!mr-auto [&_.ant-pagination-total-text]:!font-[var(--font-data,var(--font-caption))] [&_.ant-pagination-total-text]:!text-[length:var(--ads-font-size-caption)] [&_.ant-pagination-total-text]:!tracking-[0.05em]"
            />

            {recordForm.recordModal({ editTitle: "Edit user", onOk: () => recordForm.save(), okText: "Save changes", width: 560 })}
            <TemporaryPasswordModal issued={issuedPassword} onClose={() => setIssuedPassword(null)} />

            {addUserDrawer.drawerJSX({
                footer: (
                    <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]"><LockOutlined />Default role permissions remain enforced</span>
                        <div className="flex gap-2"><Button disabled={creatingUser} onClick={addUserDrawer.closeDrawer}>Cancel</Button><Button type="primary" htmlType="submit" form="add-user-form" loading={creatingUser} icon={<PlusOutlined />}>Create user</Button></div>
                    </div>
                ),
            }, (
                <AddUserForm
                    form={addUserForm}
                    roleSelect={roleSelect}
                    selectedRole={selectedRole}
                    onRoleChange={(role) => { setSelectedRole(role || "User"); roleSelect.setSelected(role || "User"); }}
                    baselinePermissions={baselinePermissions}
                    baselineLoading={baselineLoading}
                    additionalPermissions={effectiveAdditionalPermissions}
                    onAdditionalPermissionsChange={setAdditionalPermissions}
                    permissionOptions={permissionOptions}
                    onFinish={submitNewUser}
                />
            ))}

            {userDrawer.drawerJSX()}
        </main>
    );
}
