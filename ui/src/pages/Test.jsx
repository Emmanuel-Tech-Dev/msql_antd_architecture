import React, { useState } from "react";
import {
    Card,
    Button,
    Space,
    Drawer,
    Tabs,
    Checkbox,
    Table,
    Tag,
    Empty,
    Row,
    Col,
    Typography,
    Divider,
    Badge,
    Segmented,
    Input,
} from "antd";
import {
    LockOutlined,
    SafetyCertificateOutlined,
    DatabaseOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckOutlined,
    CloseOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

// Mock Data
const MOCK_ROLES = [
    { id: 1, name: "Admin", description: "Full system access", users: 2 },
    { id: 2, name: "Editor", description: "Can edit content", users: 5 },
    { id: 3, name: "Viewer", description: "Read-only access", users: 12 },
    { id: 4, name: "Manager", description: "Manage resources", users: 3 },
];

const MOCK_PERMISSIONS = [
    { id: 1, name: "create:user", description: "Create new users", category: "User Management" },
    { id: 2, name: "read:user", description: "View users", category: "User Management" },
    { id: 3, name: "update:user", description: "Edit users", category: "User Management" },
    { id: 4, name: "delete:user", description: "Delete users", category: "User Management" },
    { id: 5, name: "create:role", description: "Create new roles", category: "Role Management" },
    { id: 6, name: "read:role", description: "View roles", category: "Role Management" },
    { id: 7, name: "update:role", description: "Edit roles", category: "Role Management" },
    { id: 8, name: "delete:role", description: "Delete roles", category: "Role Management" },
    { id: 9, name: "read:report", description: "View reports", category: "Analytics" },
    { id: 10, name: "export:data", description: "Export data", category: "Analytics" },
];

const MOCK_RESOURCES = [
    { id: 1, name: "Users", description: "User management module", type: "Module", status: "active" },
    { id: 2, name: "Roles", description: "Role management module", type: "Module", status: "active" },
    { id: 3, name: "Reports", description: "Analytics and reporting", type: "Module", status: "active" },
    { id: 4, name: "Settings", description: "System configuration", type: "Module", status: "inactive" },
];

const MOCK_ROUTES = [
    { route: "/users", method: "GET", permission: "read:user" },
    { route: "/users", method: "POST", permission: "create:user" },
    { route: "/users/:id", method: "PUT", permission: "update:user" },
    { route: "/users/:id", method: "DELETE", permission: "delete:user" },
    { route: "/roles", method: "GET", permission: "read:role" },
    { route: "/roles", method: "POST", permission: "create:role" },
    { route: "/reports", method: "GET", permission: "read:report" },
    { route: "/export", method: "POST", permission: "export:data" },
];

const PERMISSION_MATRIX = {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Admin all permissions
    2: [2, 3, 6, 7, 9], // Editor
    3: [2, 6, 9], // Viewer
    4: [1, 2, 3, 5, 6, 7], // Manager
};





export default function Test() {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [checkedPermissions, setCheckedPermissions] = useState([]);
    const [activeTab, setActiveTab] = useState("matrix");
    const [activeView, setActiveView] = useState("roles");
    const [searchTerm, setSearchTerm] = useState("");

    const handleManageAccess = (role) => {
        setSelectedRole(role);
        setCheckedPermissions(PERMISSION_MATRIX[role.id] || []);
        setDrawerVisible(true);
    };

    const handlePermissionChange = (permissionId) => {
        setCheckedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    // Permissions Matrix Tab - Premium Design
    const PermissionsMatrixTab = () => {
        const categoryGroups = {};
        MOCK_PERMISSIONS.forEach((perm) => {
            if (!categoryGroups[perm.category]) {
                categoryGroups[perm.category] = [];
            }
            categoryGroups[perm.category].push(perm);
        });

        return (
            <div style={{ paddingTop: 8 }}>
                {selectedRole && (
                    <>
                        <div
                            style={{
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: 16,
                                marginBottom: 24,
                            }}
                        >
                            <Text style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Configuring Access For
                            </Text>
                            <div style={{ marginTop: 8 }}>
                                <Text
                                    strong
                                    style={{
                                        fontSize: 18,
                                        color: "#111827",
                                    }}
                                >
                                    {selectedRole.name}
                                </Text>
                            </div>
                        </div>

                        {Object.entries(categoryGroups).map(([category, perms]) => (
                            <div key={category} style={{ marginBottom: 28 }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        color: "#9ca3af",
                                        display: "block",
                                        marginBottom: 12,
                                    }}
                                >
                                    {category}
                                </Text>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                                        gap: 12,
                                    }}
                                >
                                    {perms.map((permission) => (
                                        <div
                                            key={permission.id}
                                            onClick={() => handlePermissionChange(permission.id)}
                                            style={{
                                                background: checkedPermissions.includes(permission.id)
                                                    ? "#ffffff"
                                                    : "#fafbfc",
                                                border: checkedPermissions.includes(permission.id)
                                                    ? "1.5px solid #111827"
                                                    : "1px solid #e5e7eb",
                                                borderRadius: 10,
                                                padding: 16,
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                                position: "relative",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = "#111827";
                                                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = checkedPermissions.includes(permission.id)
                                                    ? "#111827"
                                                    : "#e5e7eb";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        >
                                            {/* Checkbox Indicator */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: 12,
                                                    right: 12,
                                                    width: 20,
                                                    height: 20,
                                                    border: "2px solid #111827",
                                                    borderRadius: 4,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: checkedPermissions.includes(permission.id)
                                                        ? "#111827"
                                                        : "#fff",
                                                    transition: "all 0.2s ease",
                                                }}
                                            >
                                                {checkedPermissions.includes(permission.id) && (
                                                    <CheckOutlined
                                                        style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}
                                                    />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div style={{ paddingRight: 20 }}>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: 13,
                                                        color: "#111827",
                                                        display: "block",
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    {permission.name}
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#6b7280",
                                                        lineHeight: 1.5,
                                                    }}
                                                >
                                                    {permission.description}
                                                </Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <Divider style={{ margin: "24px 0" }} />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: 8,
                            }}
                        >
                            <Text style={{ color: "#6b7280", fontSize: 13 }}>
                                <strong style={{ color: "#111827" }}>{checkedPermissions.length}</strong> of{" "}
                                <strong style={{ color: "#111827" }}>{MOCK_PERMISSIONS.length}</strong> permissions enabled
                            </Text>
                            <Space>
                                <Button onClick={() => setDrawerVisible(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={() => setDrawerVisible(false)}
                                    style={{
                                        background: "#111827",
                                        borderColor: "#111827",
                                    }}
                                >
                                    Save Changes
                                </Button>
                            </Space>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Browser Routes Tab
    const BrowserRoutesTab = () => {
        const routeColumns = [
            {
                title: "Endpoint",
                dataIndex: "route",
                key: "route",
                render: (text) => (
                    <div>
                        <Text code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>
                            {text}
                        </Text>
                    </div>
                ),
            },
            {
                title: "Method",
                dataIndex: "method",
                key: "method",
                width: 80,
                render: (method) => {
                    const methodStyles = {
                        GET: { bg: "#f0f9ff", color: "#1e40af" },
                        POST: { bg: "#f0fdf4", color: "#15803d" },
                        PUT: { bg: "#fffbeb", color: "#b45309" },
                        DELETE: { bg: "#fef2f2", color: "#991b1b" },
                    };
                    const style = methodStyles[method];
                    return (
                        <Text
                            strong
                            style={{
                                background: style.bg,
                                color: style.color,
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                            }}
                        >
                            {method}
                        </Text>
                    );
                },
            },
            {
                title: "Required Permission",
                dataIndex: "permission",
                key: "permission",
                render: (permission) => {
                    const isGranted = checkedPermissions.some(
                        (id) => MOCK_PERMISSIONS.find((p) => p.id === id)?.name === permission
                    );
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            {isGranted ? (
                                <CheckOutlined style={{ color: "#059669", fontSize: 14 }} />
                            ) : (
                                <CloseOutlined style={{ color: "#dc2626", fontSize: 14 }} />
                            )}
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: isGranted ? "#059669" : "#dc2626",
                                }}
                            >
                                {permission}
                            </Text>
                        </div>
                    );
                },
            },
        ];

        return (
            <div style={{ paddingTop: 8 }}>
                {selectedRole && (
                    <>
                        <div
                            style={{
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: 16,
                                marginBottom: 20,
                            }}
                        >
                            <Text style={{ fontSize: 12, color: "#6b7280" }}>
                                Accessible API endpoints for <strong>{selectedRole.name}</strong> role based on assigned permissions:
                            </Text>
                        </div>
                        <Table
                            columns={routeColumns}
                            dataSource={MOCK_ROUTES}
                            rowKey="route"
                            pagination={false}
                            size="small"
                            style={{ marginTop: 16 }}
                        />
                    </>
                )}
            </div>
        );
    };

    // Role Card - Premium Design
    const RoleCard = ({ role }) => {
        const isSelected = selectedRole?.id === role.id;
        return (
            <div
                style={{
                    background: isSelected ? "#111827" : "#ffffff",
                    border: isSelected ? "1px solid #111827" : "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 24,
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.borderColor = "#111827";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                    }
                }}
            >
                <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 16,
                        }}
                    >
                        <div>
                            <Title
                                level={5}
                                style={{
                                    margin: 0,
                                    color: isSelected ? "#fff" : "#111827",
                                    fontSize: 16,
                                    fontWeight: 600,
                                }}
                            >
                                {role.name}
                            </Title>
                            <Text
                                style={{
                                    color: isSelected ? "#d1d5db" : "#6b7280",
                                    fontSize: 13,
                                    display: "block",
                                    marginTop: 4,
                                }}
                            >
                                {role.description}
                            </Text>
                        </div>
                    </div>

                    <Divider
                        style={{
                            margin: "12px 0",
                            borderColor: isSelected ? "#374151" : "#e5e7eb",
                        }}
                    />

                    <div style={{ marginBottom: 16 }}>
                        <Text
                            style={{
                                fontSize: 12,
                                color: isSelected ? "#9ca3af" : "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                fontWeight: 500,
                            }}
                        >
                            Users Assigned
                        </Text>
                        <div style={{ marginTop: 6 }}>
                            <Text
                                strong
                                style={{
                                    fontSize: 20,
                                    color: isSelected ? "#fff" : "#111827",
                                }}
                            >
                                {role.users}
                            </Text>
                        </div>
                    </div>

                    <Button
                        type="primary"
                        block
                        onClick={() => handleManageAccess(role)}
                        icon={<SafetyCertificateOutlined />}
                        style={{
                            background: isSelected ? "#fff" : "#111827",
                            borderColor: isSelected ? "#fff" : "#111827",
                            color: isSelected ? "#111827" : "#fff",
                            fontWeight: 600,
                            height: 40,
                        }}
                    >
                        Manage Access
                    </Button>
                </div>
            </div>
        );
    };

    // Permission Card
    const PermissionCard = ({ permission }) => (
        <div
            style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
                transition: "all 0.2s ease",
                height: "100%",
                cursor: "default",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#111827";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <Text
                    strong
                    style={{
                        fontSize: 13,
                        color: "#111827",
                        flex: 1,
                    }}
                >
                    {permission.name}
                </Text>
            </div>
            <Text
                style={{
                    fontSize: 12,
                    color: "#6b7280",
                    lineHeight: 1.6,
                    display: "block",
                    marginBottom: 10,
                }}
            >
                {permission.description}
            </Text>
            <Tag
                style={{
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    padding: "2px 8px",
                }}
            >
                {permission.category}
            </Tag>
        </div>
    );

    // Resource Card
    const ResourceCard = ({ resource }) => (
        <div
            style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                transition: "all 0.2s ease",
                height: "100%",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#111827";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            <div style={{ marginBottom: 16 }}>
                <Title
                    level={5}
                    style={{
                        margin: 0,
                        color: "#111827",
                        fontSize: 16,
                    }}
                >
                    {resource.name}
                </Title>
                <Text
                    style={{
                        fontSize: 13,
                        color: "#6b7280",
                        display: "block",
                        marginTop: 4,
                    }}
                >
                    {resource.description}
                </Text>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 12,
                    justifyContent: "space-between",
                }}
            >
                <Tag
                    style={{
                        background: "#f3f4f6",
                        color: "#374151",
                        border: "none",
                        borderRadius: 4,
                    }}
                >
                    {resource.type}
                </Tag>
                <Tag
                    style={{
                        background: resource.status === "active" ? "#dcfce7" : "#fee2e2",
                        color: resource.status === "active" ? "#166534" : "#991b1b",
                        border: "none",
                        borderRadius: 4,
                    }}
                >
                    {resource.status}
                </Tag>
            </div>

            <Space style={{ width: "100%" }}>
                <Button
                    type="text"
                    icon={<EditOutlined />}
                    size="small"
                    style={{ color: "#111827" }}
                />
                <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                />
            </Space>
        </div>
    );

    return (
        <div
            style={{
                background: "#ffffff",
                minHeight: "100vh",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
                
                body, * {
                    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                
                .access-control-layout {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 32px 24px;
                }
                
                .dashboard-header {
                    margin-bottom: 32px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .view-section {
                    animation: fadeIn 0.3s ease-in-out;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            <div className="access-control-layout">
                {/* Header */}
                <div className="dashboard-header">
                    <Title
                        level={2}
                        style={{
                            margin: 0,
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#111827",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        <LockOutlined style={{ fontSize: 32 }} />
                        Access Control
                    </Title>
                    <Text
                        style={{
                            color: "#6b7280",
                            display: "block",
                            marginTop: 8,
                            fontSize: 14,
                        }}
                    >
                        Manage system roles, permissions, and resource access
                    </Text>
                </div>

                {/* View Selector */}
                <div style={{ marginBottom: 32 }}>
                    <Segmented
                        value={activeView}
                        onChange={setActiveView}
                        options={[
                            { label: "Roles", value: "roles" },
                            { label: "Permissions", value: "permissions" },
                            { label: "Resources", value: "resources" },
                        ]}
                        size="large"
                        style={{
                            background: "#f3f4f6",
                            padding: 4,
                            borderRadius: 8,
                        }}
                    />
                </div>

                {/* Roles View */}
                {activeView === "roles" && (
                    <div className="view-section">
                        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        fontWeight: 600,
                                    }}
                                >
                                    System Roles
                                </Text>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                style={{
                                    background: "#111827",
                                    borderColor: "#111827",
                                }}
                            >
                                New Role
                            </Button>
                        </div>
                        <Row gutter={[20, 20]}>
                            {MOCK_ROLES.map((role) => (
                                <Col key={role.id} xs={24} sm={12} lg={6}>
                                    <RoleCard role={role} />
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}

                {/* Permissions View */}
                {activeView === "permissions" && (
                    <div className="view-section">
                        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        fontWeight: 600,
                                    }}
                                >
                                    All Permissions
                                </Text>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                style={{
                                    background: "#111827",
                                    borderColor: "#111827",
                                }}
                            >
                                New Permission
                            </Button>
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                                gap: 16,
                            }}
                        >
                            {MOCK_PERMISSIONS.map((permission) => (
                                <PermissionCard key={permission.id} permission={permission} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Resources View */}
                {activeView === "resources" && (
                    <div className="view-section">
                        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        fontWeight: 600,
                                    }}
                                >
                                    System Resources
                                </Text>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                style={{
                                    background: "#111827",
                                    borderColor: "#111827",
                                }}
                            >
                                New Resource
                            </Button>
                        </div>
                        <Row gutter={[20, 20]}>
                            {MOCK_RESOURCES.map((resource) => (
                                <Col key={resource.id} xs={24} sm={12} lg={6}>
                                    <ResourceCard resource={resource} />
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}
            </div>

            {/* Access Control Drawer */}
            <Drawer
                title={
                    selectedRole ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <SafetyCertificateOutlined />
                            <span>Configure {selectedRole.name} Permissions</span>
                        </div>
                    ) : (
                        "Manage Access"
                    )
                }
                placement="right"
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                width={740}
                bodyStyle={{ paddingBottom: 80, background: "#fafbfc" }}
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: "matrix",
                            label: "Permissions Matrix",
                            children: <PermissionsMatrixTab />,
                        },
                        {
                            key: "routes",
                            label: "API Endpoints",
                            children: <BrowserRoutesTab />,
                        },
                    ]}
                />
            </Drawer>
        </div>
    );
}
