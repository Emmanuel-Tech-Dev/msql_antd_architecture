// src/hooks/SiderLayout.jsx

import {
    Layout, Menu, Typography, theme as antTheme,
    Avatar, Badge, Button, Dropdown, Space,
} from 'antd';
import {
    BellOutlined, DownOutlined, LogoutOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';

const { Sider, Header, Content, Footer } = Layout;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SiderMenu({ theme, processedSiderItems, selectedKeys, openKeys }) {
    return (
        <Menu
            theme={theme}
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={openKeys}
            items={processedSiderItems}
            style={{ marginTop: 8, overflowX: 'hidden', width: '100%', border: 'none', backgroundColor: 'transparent' }}
        />
    );
}

function SiderBottomSection({
    collapsed, theme, token,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
}) {
    if (!showSiderProfile && !showSiderLogout) return null;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#fff' : token.colorText;
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : token.colorBorderSecondary;

    return (
        <div style={{
            borderTop: `1px solid ${borderColor}`,
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
        }}>
            {showSiderProfile && (
                <div
                    onClick={() => onProfile ? onProfile() : navigate('/profile')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: token.borderRadius,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) =>
                        e.currentTarget.style.background = isDark
                            ? 'rgba(255,255,255,0.08)'
                            : token.colorBgTextHover
                    }
                    onMouseLeave={(e) =>
                        e.currentTarget.style.background = 'transparent'
                    }
                >
                    <Avatar
                        size={32}
                        style={{ backgroundColor: token.colorPrimary, flexShrink: 0 }}
                    >
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    {!collapsed && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            minWidth: 0,
                        }}>
                            <Typography.Text strong style={{
                                fontSize: 13,
                                color: textColor,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {user?.name}
                            </Typography.Text>
                            <Typography.Text style={{
                                fontSize: 11,
                                color: isDark ? 'rgba(255,255,255,0.45)' : token.colorTextSecondary,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {user?.email}
                            </Typography.Text>
                        </div>
                    )}
                </div>
            )}

            {showSiderLogout && (
                <div
                    onClick={() => onLogout ? onLogout() : navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: token.borderRadius,
                        cursor: 'pointer',
                        color: token.colorError,
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) =>
                        e.currentTarget.style.background = isDark
                            ? 'rgba(255,77,79,0.12)'
                            : token.colorErrorBg
                    }
                    onMouseLeave={(e) =>
                        e.currentTarget.style.background = 'transparent'
                    }
                >
                    <LogoutOutlined style={{ fontSize: 14, flexShrink: 0 }} />
                    {!collapsed && (
                        <Typography.Text style={{ fontSize: 13, color: token.colorError }}>
                            Logout
                        </Typography.Text>
                    )}
                </div>
            )}
        </div>
    );
}

function SiderNode({
    collapsed, collapsedWidth, collapsible, breakpoint,
    reverseArrow, theme, width, headerHeight, siderStyle,
    onCollapse, siderHeader, trigger, token,
    processedSiderItems, selectedKeys, openKeys,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
}) {
    return (
        <Sider
            width={width}
            collapsed={collapsed}
            collapsedWidth={collapsedWidth}
            collapsible={collapsible}
            breakpoint={breakpoint}
            reverseArrow={reverseArrow}
            theme={theme}
            trigger={trigger !== undefined ? trigger : null}
            onCollapse={onCollapse}
            style={{
                position: 'sticky',
                top: 0,
                height: '100vh',
                overflowX: 'hidden',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                ...siderStyle,
            }}
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflowY: 'hidden',
            }}>
                {siderHeader && (
                    <div style={{
                        height: headerHeight,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        padding: '0 4px',
                    }}>
                        {siderHeader}
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    <SiderMenu
                        theme={theme}
                        processedSiderItems={processedSiderItems}
                        selectedKeys={selectedKeys}
                        openKeys={openKeys}
                    />
                </div>

                <SiderBottomSection
                    collapsed={collapsed}
                    theme={theme}
                    token={token}
                    user={user}
                    showSiderProfile={showSiderProfile}
                    showSiderLogout={showSiderLogout}
                    onProfile={onProfile}
                    onLogout={onLogout}
                    navigate={navigate}
                />
            </div>
        </Sider>
    );
}

function DefaultHeader({
    collapsed, toggle, theme, token,
    appName, user, notificationCount,
    onProfile, onLogout, navigate,
}) {
    const profileItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
            onClick: () => onProfile ? onProfile() : navigate('/profile'),
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            danger: true,
            onClick: () => onLogout ? onLogout() : navigate('/'),
        },
    ];

    const iconColor = theme === 'dark' ? '#fff' : token.colorText;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            height: '100%',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button
                    type="text"
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={toggle}
                    style={{ fontSize: 16, color: iconColor }}
                />
                <Typography.Text strong style={{ fontSize: 16, color: iconColor }}>
                    {appName}
                </Typography.Text>
            </div>

            <Space size={8} align="center">
                <Badge count={notificationCount} size="small">
                    <Button
                        type="text"
                        icon={<BellOutlined />}
                        style={{ color: iconColor }}
                    />
                </Badge>

                <Dropdown
                    menu={{ items: profileItems }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: token.borderRadius,
                    }}>
                        <Avatar style={{ backgroundColor: token.colorPrimary }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        {!collapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                <Typography.Text strong style={{ fontSize: 13, color: iconColor }}>
                                    {user?.name}
                                </Typography.Text>
                                <Typography.Text style={{
                                    fontSize: 11,
                                    color: theme === 'dark' ? 'rgba(255,255,255,0.45)' : token.colorTextSecondary,
                                }}>
                                    {user?.email}
                                </Typography.Text>
                            </div>
                        )}
                        <DownOutlined style={{ fontSize: 10, color: iconColor }} />
                    </div>
                </Dropdown>
            </Space>
        </div>
    );
}

// ─── Layout variants ──────────────────────────────────────────────────────────

export default function SiderLayout({
    variant, collapsed, collapsedWidth, collapsible, breakpoint,
    reverseArrow, theme, width, headerHeight,
    siderStyle, headerStyle, contentStyle, layoutStyle, footerStyle,
    footerText, appName, user, notificationCount,
    onLogout, onProfile, showSiderProfile, showSiderLogout,
    defaultHeader, defaultFooter,
    processedSiderItems, processedHeaderItems,
    selectedKeys, openKeys,
    onCollapse, toggle, siderHeader, header, footer, trigger,
}) {
    const { token } = antTheme.useToken();
    const navigate = useNavigate();

    const sharedSiderProps = {
        collapsed, collapsedWidth, collapsible, breakpoint,
        reverseArrow, theme, width, headerHeight, siderStyle,
        onCollapse, siderHeader, trigger, token,
        processedSiderItems, selectedKeys, openKeys,
        user, showSiderProfile, showSiderLogout,
        onProfile, onLogout, navigate,
    };

    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={collapsed}
            toggle={toggle}
            theme={theme}
            token={token}
            appName={appName}
            user={user}
            notificationCount={notificationCount}
            onProfile={onProfile}
            onLogout={onLogout}
            navigate={navigate}
        />
        : null
    );

    const resolvedFooter = footer ?? (defaultFooter
        ? <Footer style={{ textAlign: 'center', ...footerStyle }}>{footerText}</Footer>
        : null
    );

    // ── none: sider only, no top header ───────────────────────────────────
    if (variant === 'none') {
        return (
            <Layout style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'row',
                ...layoutStyle,
            }}>
                <SiderNode {...sharedSiderProps} />
                <Layout style={{ flex: 1, minWidth: 0 }}>
                    <Content style={{
                        margin: '10px',
                        padding: '10px',
                        minHeight: '100vh',
                        ...contentStyle,
                    }}>
                        <Outlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            </Layout>
        );
    }

    // ── sider: sider + sticky top header ──────────────────────────────────
    if (variant === 'sider') {
        return (
            <Layout style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'row',
                ...layoutStyle,
            }}>
                <SiderNode {...sharedSiderProps} />
                <Layout style={{ flex: 1, minWidth: 0 }}>
                    {resolvedHeader && (
                        <Header style={{
                            padding: 0,
                            height: headerHeight,
                            lineHeight: `${headerHeight}px`,
                            position: 'sticky',
                            top: 0,
                            zIndex: 99,
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            backgroundColor: theme === 'dark' ? '#001529' : token.colorBgContainer,
                            ...headerStyle,
                        }}>
                            {resolvedHeader}
                        </Header>
                    )}
                    <Content style={{
                        margin: '10px',
                        padding: '10px',
                        minHeight: 'calc(100vh - 112px)',
                        ...contentStyle,
                    }}>
                        <Outlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            </Layout>
        );
    }

    // ── default: sider + header above content ─────────────────────────────
    if (variant === 'default') {
        return (
            <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                <Layout style={{ display: 'flex', flexDirection: 'row' }}>
                    <SiderNode {...sharedSiderProps} />
                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        <Header style={{
                            padding: 0,
                            height: headerHeight,
                            lineHeight: `${headerHeight}px`,
                            position: 'sticky',
                            top: 0,
                            zIndex: 99,
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            backgroundColor: theme === 'dark' ? '#001529' : token.colorBgContainer,
                            ...headerStyle,
                        }}>
                            {resolvedHeader}
                        </Header>
                        <Content style={{
                            margin: '10px',
                            padding: '10px',
                            minHeight: 'calc(100vh - 112px)',
                            ...contentStyle,
                        }}>
                            <Outlet />
                        </Content>
                        {resolvedFooter}
                    </Layout>
                </Layout>
            </Layout>
        );
    }

    return null;
}