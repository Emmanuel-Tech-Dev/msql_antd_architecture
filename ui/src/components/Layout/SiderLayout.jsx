// src/components/Layout/SiderLayout.jsx
//
// Variants
//   'default'   — sidebar left + sticky header above content  (original)
//   'sider'     — sidebar left + sticky header beside sidebar  (original)
//   'none'      — sidebar only, no top header                  (original)
//   'icon-rail' — collapsed-only 56px icon rail, tooltip labels, no text
//   'floating'  — sidebar floats inside the page with gap + border-radius
//   'top'       — no sidebar, full-width horizontal top nav bar
//
// Color theming
//   Pass `colors` from SIDER_INIT in AppLayout to override any surface:
//   {
//     siderBg        — sidebar background
//     headerBg       — top header background
//     contentBg      — page content area background
//     accent         — active item highlight + avatar background
//     accentText     — text on accent background
//     textPrimary    — main text
//     textMuted      — secondary / muted text
//     border         — divider / border color
//     itemHover      — nav item hover background
//     itemActive     — nav item active background
//   }

import {
    Layout, Menu, Typography, theme as antTheme,
    Avatar, Badge, Button, Dropdown, Space, Tooltip,
} from 'antd';
import {
    BellOutlined, DownOutlined, LogoutOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';

const { Sider, Header, Content, Footer } = Layout;

// ─── Default color tokens per theme ──────────────────────────────────────────

function resolveColors(theme, token, overrides = {}) {
    const isDark = theme === 'dark';
    const defaults = isDark
        ? {
            siderBg: '#001529',
            headerBg: '#001529',
            contentBg: token.colorBgLayout,
            accent: token.colorPrimary,
            accentText: '#fff',
            textPrimary: 'rgba(255,255,255,0.85)',
            textMuted: 'rgba(255,255,255,0.45)',
            border: 'rgba(255,255,255,0.08)',
            itemHover: 'rgba(255,255,255,0.08)',
            itemActive: token.colorPrimaryBg ?? 'rgba(24,144,255,0.15)',
        }
        : {
            siderBg: token.colorBgContainer,
            headerBg: token.colorBgContainer,
            contentBg: token.colorBgLayout,
            accent: token.colorPrimary,
            accentText: '#fff',
            textPrimary: token.colorText,
            textMuted: token.colorTextSecondary,
            border: token.colorBorderSecondary,
            itemHover: token.colorBgTextHover,
            itemActive: token.colorPrimaryBg,
        };

    return { ...defaults, ...overrides };
}

// ─── SiderMenu ────────────────────────────────────────────────────────────────

function SiderMenu({ theme, processedSiderItems, selectedKeys, openKeys }) {
    return (
        <Menu
            theme={theme}
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={openKeys}
            items={processedSiderItems}
            style={{
                marginTop: 8,
                overflowX: 'hidden',
                width: '100%',
                border: 'none',
                backgroundColor: 'transparent',
            }}
        />
    );
}

// ─── SiderBottomSection ───────────────────────────────────────────────────────

function SiderBottomSection({
    collapsed, colors, token,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
}) {
    if (!showSiderProfile && !showSiderLogout) return null;

    return (
        <div style={{
            borderTop: `1px solid ${colors.border}`,
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
                        transition: 'background 0.18s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.itemHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Avatar
                        size={32}
                        style={{ backgroundColor: colors.accent, color: colors.accentText, flexShrink: 0 }}
                    >
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    {!collapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, overflow: 'hidden', minWidth: 0 }}>
                            <Typography.Text style={{
                                fontSize: 13, fontWeight: 500,
                                color: colors.textPrimary,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {user?.name}
                            </Typography.Text>
                            <Typography.Text style={{
                                fontSize: 11, color: colors.textMuted,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        borderRadius: token.borderRadius,
                        cursor: 'pointer',
                        color: token.colorError,
                        transition: 'background 0.18s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = token.colorErrorBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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

// ─── SiderNode (shared by default / sider / none / floating) ─────────────────

function SiderNode({
    collapsed, collapsedWidth, collapsible, breakpoint,
    reverseArrow, theme, width, headerHeight, siderStyle,
    onCollapse, siderHeader, trigger, token, colors,
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
                backgroundColor: colors.siderBg,
                ...siderStyle,
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'hidden' }}>
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
                    colors={colors}
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

// ─── DefaultHeader ────────────────────────────────────────────────────────────

function DefaultHeader({
    collapsed, toggle, colors, token,
    appName, user, notificationCount,
    onProfile, onLogout, navigate,
}) {
    const profileItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => onProfile ? onProfile() : navigate('/profile') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: () => onLogout ? onLogout() : navigate('/') },
    ];

    return (
        <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px', height: '100%',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button
                    type="text"
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={toggle}
                    style={{ fontSize: 16, color: colors.textPrimary }}
                />
                <Typography.Text style={{ fontSize: 16, fontWeight: 500, color: colors.textPrimary }}>
                    {appName}
                </Typography.Text>
            </div>
            <Space size={8} align="center">
                <Badge count={notificationCount} size="small">
                    <Button type="text" icon={<BellOutlined />} style={{ color: colors.textPrimary }} />
                </Badge>
                <Dropdown menu={{ items: profileItems }} trigger={['click']} placement="bottomRight">
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', padding: '4px 8px',
                        borderRadius: token.borderRadius,
                    }}>
                        <Avatar style={{ backgroundColor: colors.accent, color: colors.accentText }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <Typography.Text style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>
                                {user?.name}
                            </Typography.Text>
                            <Typography.Text style={{ fontSize: 11, color: colors.textMuted }}>
                                {user?.email}
                            </Typography.Text>
                        </div>
                        <DownOutlined style={{ fontSize: 10, color: colors.textMuted }} />
                    </div>
                </Dropdown>
            </Space>
        </div>
    );
}

// ─── V4: Icon Rail ────────────────────────────────────────────────────────────
// 56px icon-only sidebar. All labels shown as Ant Design Tooltips on hover.
// Perfect for dense UIs where screen space matters.

function IconRailLayout({
    colors, token, processedSiderItems, selectedKeys,
    siderHeader, headerHeight, siderStyle, contentStyle, layoutStyle,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
    header, defaultHeader, footer, defaultFooter,
    footerText, footerStyle, appName, notificationCount,
    collapsed, toggle, theme,
}) {
    const railWidth = 56;

    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={true}
            toggle={toggle}
            colors={colors}
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

    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
            {/* Icon rail — always collapsed, no Ant Design Sider, pure div */}
            <div style={{
                width: railWidth,
                flexShrink: 0,
                position: 'sticky',
                top: 0,
                height: '100vh',
                backgroundColor: colors.siderBg,
                borderRight: `1px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden',
                ...siderStyle,
            }}>
                {/* Brand / logo area */}
                {siderHeader && (
                    <div style={{
                        height: headerHeight,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        borderBottom: `1px solid ${colors.border}`,
                    }}>
                        {siderHeader}
                    </div>
                )}

                {/* Rail items */}
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', padding: '6px 0' }}>
                    {processedSiderItems.map((item) => {
                        // Skip group headers in rail mode — flatten them
                        if (item.type === 'group') {
                            return item.children?.map((child) => (
                                <RailIcon
                                    key={child.key}
                                    item={child}
                                    isActive={selectedKeys.includes(child.key)}
                                    colors={colors}
                                    token={token}
                                />
                            ));
                        }
                        // Dropdown group — show group icon with sub-items in tooltip
                        if (item.children?.length) {
                            return item.children.map((child) => (
                                <RailIcon
                                    key={child.key}
                                    item={child}
                                    isActive={selectedKeys.includes(child.key)}
                                    colors={colors}
                                    token={token}
                                />
                            ));
                        }
                        return (
                            <RailIcon
                                key={item.key}
                                item={item}
                                isActive={selectedKeys.includes(item.key)}
                                colors={colors}
                                token={token}
                            />
                        );
                    })}
                </div>

                {/* User avatar at bottom */}
                {showSiderProfile && (
                    <div style={{
                        padding: '10px 0',
                        borderTop: `1px solid ${colors.border}`,
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Tooltip title={user?.name} placement="right">
                            <Avatar
                                size={32}
                                onClick={() => onProfile ? onProfile() : navigate('/profile')}
                                style={{
                                    backgroundColor: colors.accent,
                                    color: colors.accentText,
                                    cursor: 'pointer',
                                }}
                            >
                                {user?.name?.charAt(0)?.toUpperCase()}
                            </Avatar>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Main content */}
            <Layout style={{ flex: 1, minWidth: 0 }}>
                {resolvedHeader && (
                    <Header style={{
                        padding: 0,
                        height: headerHeight,
                        lineHeight: `${headerHeight}px`,
                        position: 'sticky',
                        top: 0,
                        zIndex: 99,
                        backgroundColor: colors.headerBg,
                        borderBottom: `1px solid ${colors.border}`,
                    }}>
                        {resolvedHeader}
                    </Header>
                )}
                <Content style={{
                    margin: '10px',
                    padding: '10px',
                    minHeight: 'calc(100vh - 112px)',
                    backgroundColor: colors.contentBg,
                    ...contentStyle,
                }}>
                    <Outlet />
                </Content>
                {resolvedFooter}
            </Layout>
        </Layout>
    );
}

// Rail icon with tooltip
function RailIcon({ item, isActive, colors, token }) {
    return (
        <Tooltip title={item.label} placement="right">
            <div
                onClick={item.onClick}
                style={{
                    width: 36,
                    height: 36,
                    margin: '2px auto',
                    borderRadius: token.borderRadiusSM,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: isActive ? colors.itemActive : 'transparent',
                    color: isActive ? colors.accent : colors.textMuted,
                    transition: 'all 0.15s',
                    fontSize: 16,
                }}
                onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = colors.itemHover;
                }}
                onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
            >
                {item.icon}
            </div>
        </Tooltip>
    );
}

// ─── V5: Floating sider ───────────────────────────────────────────────────────
// Sidebar is a rounded card floating inside the page with margin on all sides.
// Gives a modern "detached" feel. Background should be slightly different from
// the page to create depth.

function FloatingLayout({
    colors, token, processedSiderItems, selectedKeys, openKeys,
    theme, collapsed, collapsedWidth, width,
    siderHeader, headerHeight, siderStyle, contentStyle, layoutStyle,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
    header, defaultHeader, footer, defaultFooter,
    footerText, footerStyle, appName, notificationCount,
    collapsible, toggle,
}) {
    const GAP = 12; // gap between floating card and edges

    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={collapsed}
            toggle={toggle}
            colors={colors}
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

    const siderWidth = collapsed ? collapsedWidth : width;

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: colors.contentBg, ...layoutStyle }}>
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                {/* Floating sidebar card */}
                <div style={{
                    position: 'sticky',
                    top: GAP,
                    height: `calc(100vh - ${GAP * 2}px)`,
                    width: siderWidth,
                    flexShrink: 0,
                    margin: `${GAP}px 0 ${GAP}px ${GAP}px`,
                    borderRadius: 12,
                    backgroundColor: colors.siderBg,
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    zIndex: 10,
                    ...siderStyle,
                }}>
                    {siderHeader && (
                        <div style={{
                            height: headerHeight,
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                            padding: '0 4px',
                            borderBottom: `1px solid ${colors.border}`,
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
                        colors={colors}
                        token={token}
                        user={user}
                        showSiderProfile={showSiderProfile}
                        showSiderLogout={showSiderLogout}
                        onProfile={onProfile}
                        onLogout={onLogout}
                        navigate={navigate}
                    />
                </div>

                {/* Main content */}
                <Layout style={{ flex: 1, minWidth: 0, backgroundColor: 'transparent' }}>
                    {resolvedHeader && (
                        <Header style={{
                            padding: 0,
                            height: headerHeight,
                            lineHeight: `${headerHeight}px`,
                            position: 'sticky',
                            top: 0,
                            zIndex: 99,
                            backgroundColor: colors.headerBg,
                            borderBottom: `1px solid ${colors.border}`,
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
            </div>
        </Layout>
    );
}

// ─── V6: Top nav ──────────────────────────────────────────────────────────────
// No sidebar at all. Horizontal navigation bar at the top.
// Best for apps with 6 or fewer top-level routes.
// All menu items rendered as horizontal nav links.

function TopNavLayout({
    colors, token, processedSiderItems, selectedKeys,
    contentStyle, layoutStyle, headerHeight, headerStyle,
    user, onProfile, onLogout, navigate,
    notificationCount, appName,
    footer, defaultFooter, footerText, footerStyle,
}) {
    const profileItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => onProfile ? onProfile() : navigate('/profile') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: () => onLogout ? onLogout() : navigate('/') },
    ];

    const resolvedFooter = footer ?? (defaultFooter
        ? <Footer style={{ textAlign: 'center', ...footerStyle }}>{footerText}</Footer>
        : null
    );

    return (
        <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
            <Header style={{
                padding: '0 20px',
                height: headerHeight,
                lineHeight: `${headerHeight}px`,
                position: 'sticky',
                top: 0,
                zIndex: 99,
                backgroundColor: colors.headerBg,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                ...headerStyle,
            }}>
                {/* Brand */}
                <Typography.Text style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginRight: 20,
                    whiteSpace: 'nowrap',
                }}>
                    {appName}
                </Typography.Text>

                {/* Nav items — flatten groups */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
                    {processedSiderItems.flatMap((item) =>
                        item.children?.length
                            ? item.children
                            : [item]
                    ).map((item) => {
                        const isActive = selectedKeys.includes(item.key);
                        return (
                            <div
                                key={item.key}
                                onClick={item.onClick}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '5px 11px',
                                    borderRadius: token.borderRadius,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: isActive ? 500 : 400,
                                    color: isActive ? colors.accent : colors.textMuted,
                                    background: isActive ? colors.itemActive : 'transparent',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = colors.itemHover;
                                        e.currentTarget.style.color = colors.textPrimary;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = colors.textMuted;
                                    }
                                }}
                            >
                                <span style={{ fontSize: 14 }}>{item.icon}</span>
                                {item.label}
                            </div>
                        );
                    })}
                </div>

                {/* Right side */}
                <Space size={8} align="center">
                    <Badge count={notificationCount} size="small">
                        <Button type="text" icon={<BellOutlined />} style={{ color: colors.textPrimary }} />
                    </Badge>
                    <Dropdown menu={{ items: profileItems }} trigger={['click']} placement="bottomRight">
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            cursor: 'pointer', padding: '4px 8px',
                            borderRadius: token.borderRadius,
                        }}>
                            <Avatar style={{ backgroundColor: colors.accent, color: colors.accentText }}>
                                {user?.name?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            <DownOutlined style={{ fontSize: 10, color: colors.textMuted }} />
                        </div>
                    </Dropdown>
                </Space>
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
    );
}

// ─── Main SiderLayout export ──────────────────────────────────────────────────

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
    // New: color overrides passed from SIDER_INIT via AppLayout
    colors: colorOverrides,
}) {
    const { token } = antTheme.useToken();
    const navigate = useNavigate();

    // Resolve final color set — defaults per theme, then SIDER_INIT overrides
    const colors = resolveColors(theme, token, colorOverrides);

    const sharedSiderProps = {
        collapsed, collapsedWidth, collapsible, breakpoint,
        reverseArrow, theme, width, headerHeight, siderStyle,
        onCollapse, siderHeader, trigger, token, colors,
        processedSiderItems, selectedKeys, openKeys,
        user, showSiderProfile, showSiderLogout,
        onProfile, onLogout, navigate,
    };

    const sharedLayoutProps = {
        colors, token, processedSiderItems, selectedKeys, openKeys,
        theme, collapsed, collapsedWidth, width,
        siderHeader, headerHeight, siderStyle, contentStyle, layoutStyle,
        user, showSiderProfile, showSiderLogout,
        onProfile, onLogout, navigate,
        header, defaultHeader, footer, defaultFooter,
        footerText, footerStyle, appName, notificationCount,
        collapsible, toggle,
    };

    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={collapsed}
            toggle={toggle}
            colors={colors}
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

    // ── icon-rail ──────────────────────────────────────────────────────────
    if (variant === 'icon-rail') {
        return <IconRailLayout {...sharedLayoutProps} />;
    }

    // ── floating ───────────────────────────────────────────────────────────
    if (variant === 'floating') {
        return <FloatingLayout {...sharedLayoutProps} />;
    }

    // ── top ────────────────────────────────────────────────────────────────
    if (variant === 'top') {
        return (
            <TopNavLayout
                colors={colors}
                token={token}
                processedSiderItems={processedSiderItems}
                selectedKeys={selectedKeys}
                contentStyle={contentStyle}
                layoutStyle={layoutStyle}
                headerHeight={headerHeight}
                headerStyle={headerStyle}
                user={user}
                onProfile={onProfile}
                onLogout={onLogout}
                navigate={navigate}
                notificationCount={notificationCount}
                appName={appName}
                footer={footer}
                defaultFooter={defaultFooter}
                footerText={footerText}
                footerStyle={footerStyle}
            />
        );
    }

    // ── none ───────────────────────────────────────────────────────────────
    if (variant === 'none') {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
                <SiderNode {...sharedSiderProps} />
                <Layout style={{ flex: 1, minWidth: 0 }}>
                    <Content style={{
                        margin: '10px', padding: '10px',
                        minHeight: '100vh',
                        backgroundColor: colors.contentBg,
                        ...contentStyle,
                    }}>
                        <Outlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            </Layout>
        );
    }

    // ── sider ──────────────────────────────────────────────────────────────
    if (variant === 'sider') {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
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
                            backgroundColor: colors.headerBg,
                            borderBottom: `1px solid ${colors.border}`,
                            ...headerStyle,
                        }}>
                            {resolvedHeader}
                        </Header>
                    )}
                    <Content style={{
                        margin: '10px', padding: '10px',
                        minHeight: 'calc(100vh - 112px)',
                        backgroundColor: colors.contentBg,
                        ...contentStyle,
                    }}>
                        <Outlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            </Layout>
        );
    }

    // ── default ────────────────────────────────────────────────────────────
    if (variant === 'default') {
        return (
            <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                <Layout style={{ display: 'flex', flexDirection: 'row' }}>
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
                                backgroundColor: colors.headerBg,
                                borderBottom: `1px solid ${colors.border}`,
                                ...headerStyle,
                            }}>
                                {resolvedHeader}
                            </Header>
                        )}
                        <Content style={{
                            margin: '10px', padding: '10px',
                            minHeight: 'calc(100vh - 112px)',
                            backgroundColor: colors.contentBg,
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

    // ─────────────────────────────────────────────────────────────
    // NEW VARIANT: "premium"
    // Add this inside SiderLayout BEFORE the default variant check
    // ─────────────────────────────────────────────────────────────

    if (variant === 'premium') {
        return (
            <Layout
                style={{
                    minHeight: '100vh',
                    background: colors.contentBg,
                    ...layoutStyle,
                }}
            >
                <Layout style={{ display: 'flex', flexDirection: 'row' }}>
                    <Sider
                        width={width}
                        collapsed={collapsed}
                        collapsedWidth={collapsedWidth}
                        collapsible={false}
                        theme={theme}
                        style={{
                            position: 'sticky',
                            top: 0,
                            height: '100vh',
                            overflow: 'hidden',
                            background: colors.siderBg,
                            borderRight: `1px solid ${colors.border}`,
                            boxShadow:
                                theme === 'dark'
                                    ? '8px 0 30px rgba(0,0,0,0.35)'
                                    : '8px 0 30px rgba(15,23,42,0.08)',
                            ...siderStyle,
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Brand Header */}
                            <div
                                style={{
                                    height: headerHeight,
                                    padding: collapsed ? '0 12px' : '0 18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: collapsed
                                        ? 'center'
                                        : 'space-between',
                                    borderBottom: `1px solid ${colors.border}`,
                                    flexShrink: 0,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {siderHeader}
                                </div>

                                {!collapsed && (
                                    <Button
                                        type="text"
                                        icon={<MenuFoldOutlined />}
                                        onClick={toggle}
                                        style={{
                                            color: colors.textMuted,
                                            borderRadius: 10,
                                        }}
                                    />
                                )}
                            </div>

                            {/* Menu */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    padding: '12px 8px',
                                }}
                            >
                                <SiderMenu
                                    theme={theme}
                                    processedSiderItems={processedSiderItems}
                                    selectedKeys={selectedKeys}
                                    openKeys={openKeys}
                                />
                            </div>

                            {/* Bottom Profile + Logout */}
                            <div
                                style={{
                                    padding: 12,
                                    borderTop: `1px solid ${colors.border}`,
                                    background:
                                        theme === 'dark'
                                            ? 'rgba(255,255,255,0.02)'
                                            : 'rgba(0,0,0,0.015)',
                                    backdropFilter: 'blur(20px)',
                                }}
                            >
                                {/* User Card */}
                                {showSiderProfile && (
                                    <div
                                        onClick={() =>
                                            onProfile
                                                ? onProfile()
                                                : navigate('/profile')
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: collapsed
                                                ? '10px'
                                                : '12px',
                                            borderRadius: 16,
                                            cursor: 'pointer',
                                            transition: 'all 0.25s ease',
                                            marginBottom: 10,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background =
                                                colors.itemHover;
                                            e.currentTarget.style.transform =
                                                'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                                'transparent';
                                            e.currentTarget.style.transform =
                                                'translateY(0)';
                                        }}
                                    >
                                        <Badge
                                            dot
                                            color="#52c41a"
                                            offset={[-4, 30]}
                                        >
                                            <Avatar
                                                size={collapsed ? 38 : 42}
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.accent}, #722ed1)`,
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    boxShadow:
                                                        '0 8px 20px rgba(0,0,0,0.15)',
                                                }}
                                            >
                                                {user?.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase()}
                                            </Avatar>
                                        </Badge>

                                        {!collapsed && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                }}
                                            >
                                                <Typography.Text
                                                    strong
                                                    style={{
                                                        display: 'block',
                                                        color:
                                                            colors.textPrimary,
                                                        fontSize: 14,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                    }}
                                                >
                                                    {user?.name}
                                                </Typography.Text>

                                                <Typography.Text
                                                    style={{
                                                        display: 'block',
                                                        fontSize: 12,
                                                        color:
                                                            colors.textMuted,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                    }}
                                                >
                                                    {user?.email}
                                                </Typography.Text>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Logout Button */}
                                {showSiderLogout && (
                                    <Button
                                        danger
                                        block
                                        icon={<LogoutOutlined />}
                                        onClick={() =>
                                            onLogout
                                                ? onLogout()
                                                : navigate('/')
                                        }
                                        style={{
                                            height: 42,
                                            borderRadius: 14,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {!collapsed && 'Logout'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Sider>

                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        {resolvedHeader && (
                            <Header
                                style={{
                                    padding: 0,
                                    height: headerHeight,
                                    lineHeight: `${headerHeight}px`,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 99,
                                    backgroundColor: colors.headerBg,
                                    borderBottom: `1px solid ${colors.border}`,
                                    ...headerStyle,
                                }}
                            >
                                {resolvedHeader}
                            </Header>
                        )}

                        <Content
                            style={{
                                margin: '12px',
                                padding: '16px',
                                minHeight: 'calc(100vh - 112px)',
                                backgroundColor: colors.contentBg,
                                borderRadius: 18,
                                ...contentStyle,
                            }}
                        >
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